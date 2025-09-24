import { debounce, DebouncedFunc } from "lodash";
import TrackPlayer, { Event, State } from "react-native-track-player";
import { AudiobookshelfAPI } from "../ABS/absAPIClass";
import { AudiobookSession } from "../ABS/abstypes";
import { ABSQueuedTrack } from "../store/store-playback";

type SyncData = { timeListened: number; currentTime: number };
type OfflineListenSession = {
  sessionId: string;
  itemId: string;
  startTime: number;
  endTime: number;
  timeListened: number;
  currentTime: number;
  timestamp: number;
};

export default class AudiobookStreamer {
  private static instance: AudiobookStreamer | null = null;
  private session: AudiobookSession | null = null;
  private lastSyncTime: number | null = null;
  private syncCounter: number = 0;
  private readonly SYNC_INTERVAL_COUNT = 10; // Sync every 10 progress updates
  // Store event listener handles
  private progressUpdateListener: any = null;
  private playbackStateListener: any = null;
  // 2. Create a new property specifically for the debounced version.
  //    Its type is DebouncedFunc<...>, which correctly describes it.
  private debouncedProgressHandler: DebouncedFunc<(position?: number) => Promise<void>>;
  private isInitialized: boolean = false;

  // Race condition prevention
  private isSyncing: boolean = false;
  private pendingSessionClose: {
    sessionId: string;
    position: number;
    timeListened: number;
  } | null = null;

  // Offline sync properties (for future implementation)
  private isOfflineMode: boolean = false;
  private offlineListenSessions: OfflineListenSession[] = [];

  private constructor(
    private serverUrl: string,
    private apiClient: AudiobookshelfAPI // Your ABS API class instance
  ) {
    this.debouncedProgressHandler = debounce(this.handleProgressUpdate, 4000, {
      leading: false, // Do NOT run on the leading edge.
      trailing: true, // DO run on the trailing edge after the wait time.
    });
  }

  /**
   * Gets or creates the singleton instance
   */
  public static getInstance(serverUrl?: string, apiClient?: AudiobookshelfAPI): AudiobookStreamer {
    if (!AudiobookStreamer.instance) {
      if (!serverUrl || !apiClient) {
        throw new Error(
          "AudiobookStreamer: serverUrl and apiClient required for first initialization"
        );
      }
      AudiobookStreamer.instance = new AudiobookStreamer(serverUrl, apiClient);
      AudiobookStreamer.instance.initialize();
    }
    return AudiobookStreamer.instance;
  }

  /**
   * Updates the singleton with new connection details (useful for server changes)
   */
  public static updateInstance(serverUrl: string, apiClient: AudiobookshelfAPI): AudiobookStreamer {
    if (AudiobookStreamer.instance) {
      AudiobookStreamer.instance.cleanup();
    }
    AudiobookStreamer.instance = new AudiobookStreamer(serverUrl, apiClient);
    AudiobookStreamer.instance.initialize();
    return AudiobookStreamer.instance;
  }

  /**
   * Destroys the singleton instance
   */
  public static destroyInstance(): void {
    if (AudiobookStreamer.instance) {
      AudiobookStreamer.instance.cleanup();
      AudiobookStreamer.instance = null;
    }
  }

  /**
   * Initialize event listeners (separated from constructor for singleton pattern)
   */
  private initialize(): void {
    if (this.isInitialized) return;
    this.setupTrackPlayerEvents();
    this.isInitialized = true;
  }

  private setupTrackPlayerEvents() {
    // Handle progress updates for syncing
    this.progressUpdateListener = TrackPlayer.addEventListener(
      Event.PlaybackProgressUpdated,
      async (event) => {
        // console.log("PlaybackProgressUpdated**", event.position);
        this.debouncedProgressHandler(event.position);
      }
    );

    // Handle state changes for immediate sync on pause
    this.playbackStateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      async (event) => {
        // console.log("STATE CHANGE**", event.state);
        await this.handlePlaybackStateChange(event);
      }
    );
  }
  /**
   * Periodically syncs progress ONLY while playing.
   */
  private async handleProgressUpdate(position: number | undefined = undefined) {
    // The guard clause in syncProgress will prevent syncing if paused
    if (!this.session) return;

    await this.syncProgress(position);
  }

  /**
   * Manages the sync timer based on playback state.
   */
  private async handlePlaybackStateChange(state: { state: State }) {
    if (state.state === State.Playing) {
      // Start the timer ONLY if it's not already running
      if (this.session && !this.lastSyncTime) {
        console.log("Playback started, starting sync timer.");
        this.lastSyncTime = Date.now();
      }
    } else if (state.state === State.Paused || state.state === State.Stopped) {
      // Stop the timer and perform a final sync for the interval
      if (this.lastSyncTime) {
        console.log("Playback paused/stopped, performing final sync.");
        this.debouncedProgressHandler.cancel();

        // Don't sync if we already have a pending session close (avoids race condition)
        if (!this.pendingSessionClose && !this.isSyncing) {
          await this.syncProgress();
        } else {
          console.log("Skipping sync - already have pending session close or sync in progress");
        }

        this.lastSyncTime = null; // Stop the timer
      }
    }
  }

  async setupAudioPlayback(
    itemId: string
  ): Promise<{ tracks: ABSQueuedTrack[]; sessionData: AudiobookSession }> {
    const currentProgress = await this.apiClient.getBookProgress(itemId);
    // console.log("setupAudioPlaybook**CurrTime", currentProgress?.currentTime);

    // RACE CONDITION FIX: Capture current session state before switching
    await this.captureCurrentSessionForFinalSync();

    const response: AudiobookSession = await this.apiClient.getPlayInfo(itemId);

    const previousSessionId = this.session?.id;
    this.session = response;
    this.syncCounter = 0; // Reset counter for new session

    console.log(
      `AudiobookStreamer: Session changed from ${previousSessionId || "none"} to ${
        response.id
      } for item ${itemId}`
    );
    if (previousSessionId && previousSessionId !== response.id) {
      console.log(
        `⚠️  Session switch detected - TrackPlayer events may still reference old session ${previousSessionId}`
      );
    }

    // Use the real progress, not the session's startTime
    const actualStartTime = currentProgress?.currentTime || response.startTime || 0;

    const tracks = response.audioTracks.map((audioTrack) => ({
      id: `${response.id}-${audioTrack.index}`,
      url: `${this.serverUrl}/audiobookshelf/public/session/${response.id}/track/${audioTrack.index}`,
      title: response.displayTitle,
      artist: response.displayAuthor,
      artwork: `${this.serverUrl}/api/items/${response.libraryItemId}/cover`,
      duration: audioTrack.duration,
      sessionId: response.id,
      libraryItemId: response.libraryItemId,
      chapters: response.chapters,
    }));

    return { tracks, sessionData: { ...response, startTime: actualStartTime } };
  }

  async syncProgress(currentPosition?: number): Promise<void> {
    // Prevent concurrent sync operations
    if (this.isSyncing) {
      console.log("Sync already in progress, skipping...");
      return;
    }

    this.isSyncing = true;
    console.log("BEFORESYNC****");

    try {
      // Handle pending session close first if it exists
      if (this.pendingSessionClose) {
        console.log(`Processing pending session close for ${this.pendingSessionClose.sessionId}`);
        await this.apiClient.syncProgressToServer(this.pendingSessionClose.sessionId, {
          timeListened: this.pendingSessionClose.timeListened,
          currentTime: this.pendingSessionClose.position,
        });
        console.log(
          `Final sync completed for session ${this.pendingSessionClose.sessionId} - position: ${this.pendingSessionClose.position}s`
        );
        this.pendingSessionClose = null;
        return;
      }

      if (!this.session) return;

      // Get sessionId from the currently active track to prevent cross-session contamination
      const activeSessionId = await this.getActiveSessionId();
      if (!activeSessionId) {
        console.warn("No active session ID found, skipping sync");
        return;
      }

      const position = currentPosition ?? (await TrackPlayer.getProgress()).position;
      const now = Date.now();

      console.log(
        `IN SYNC PROGRESS - Session: ${activeSessionId}, Position: ${position}, LastSync: ${this.lastSyncTime}`
      );
      const timeListened = this.lastSyncTime ? Math.floor((now - this.lastSyncTime) / 1000) : 0;

      const syncData: SyncData = {
        timeListened: timeListened,
        currentTime: position,
      };

      await this.apiClient.syncProgressToServer(activeSessionId, syncData);

      this.lastSyncTime = now;

      console.log(
        `Synced to session ${activeSessionId} - listened: ${timeListened}s, position: ${position}s`
      );
    } catch (error) {
      console.error("Failed to sync progress:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  async syncProgressImmediate(): Promise<void> {
    // Force immediate sync (used for pause/stop events)
    await this.syncProgress();
  }

  async closeSession(): Promise<void> {
    if (!this.session) return;
    console.log("Close Session");
    try {
      // Get sessionId from the currently active track to prevent cross-session contamination
      const activeSessionId = await this.getActiveSessionId();
      if (!activeSessionId) {
        console.warn("No active session ID found, cannot close session properly");
        // Still clean up local state even if we can't close on server
        this.session = null;
        this.lastSyncTime = null;
        this.syncCounter = 0;
        return;
      }

      const { position, duration } = await TrackPlayer.getProgress();
      const timeListened = this.lastSyncTime
        ? Math.floor((Date.now() - this.lastSyncTime) / 1000)
        : 0;

      console.log(
        `Closing session ${activeSessionId} at position: ${position}s, listened: ${timeListened}s`
      );

      await this.apiClient.closeSession(activeSessionId, {
        currentTime: position,
        timeListened,
      });

      this.session = null;
      this.lastSyncTime = null;
      this.syncCounter = 0;
    } catch (error) {
      console.error("Failed to close session:", error);
    }
  }

  // Added the missing getSession method
  getSession(): AudiobookSession | null {
    return this.session;
  }

  /**
   * Captures current session state before a session switch to ensure proper final sync
   * This prevents race conditions where TrackPlayer gets reset before we can sync the old session
   */
  private async captureCurrentSessionForFinalSync(): Promise<void> {
    if (!this.session || !this.lastSyncTime) {
      return; // Nothing to capture
    }

    try {
      const { position } = await TrackPlayer.getProgress();
      const timeListened = Math.floor((Date.now() - this.lastSyncTime) / 1000);

      // Store the data for final sync after TrackPlayer events settle
      this.pendingSessionClose = {
        sessionId: this.session.id,
        position: position,
        timeListened: timeListened,
      };

      console.log(`Captured session ${this.session.id} at position ${position}s for final sync`);
    } catch (error) {
      console.error("Failed to capture current session state:", error);
    }
  }

  /**
   * Gets the sessionId from the currently active track to prevent cross-session contamination
   * during book switches. This ensures sync operations target the correct session even if
   * this.session has already been updated to a new book.
   */
  private async getActiveSessionId(): Promise<string | null> {
    try {
      const activeTrack = await TrackPlayer.getActiveTrack();
      if (activeTrack && "sessionId" in activeTrack) {
        const activeSessionId = activeTrack.sessionId as string;
        const currentSessionId = this.session?.id;

        // Log if there's a mismatch to help debug cross-session issues
        if (currentSessionId && activeSessionId !== currentSessionId) {
          console.warn(
            `Session ID mismatch - Active track: ${activeSessionId}, Current session: ${currentSessionId}. ` +
              `Using active track to prevent cross-session contamination.`
          );
        }

        return activeSessionId;
      }

      // Fallback: if no active track or no sessionId, use this.session
      return this.session?.id || null;
    } catch (error) {
      console.warn("Failed to get active track, falling back to this.session.id:", error);
      return this.session?.id || null;
    }
  }

  /**
   * Comprehensive cleanup method
   */
  cleanup(): void {
    console.log("AudiobookStreamer: Cleaning up...");

    // Cancel any pending debounced calls
    this.debouncedProgressHandler.cancel();

    // Remove event listeners using the stored handles
    if (this.progressUpdateListener) {
      this.progressUpdateListener.remove();
      this.progressUpdateListener = null;
    }

    if (this.playbackStateListener) {
      this.playbackStateListener.remove();
      this.playbackStateListener = null;
    }

    // Reset internal state
    this.session = null;
    this.lastSyncTime = null;
    this.syncCounter = 0;
    this.isInitialized = false;

    // Reset race condition prevention flags
    this.isSyncing = false;
    this.pendingSessionClose = null;

    // Note: We intentionally don't clear offline sessions here
    // as they need to persist for sync when coming back online
    // Only clear them after successful sync or explicit reset

    console.log("AudiobookStreamer: Cleanup complete");
  }

  /**
   * Check if the instance is properly initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  // ========================================
  // FUTURE: Offline sync functionality
  // ========================================

  /**
   * Enable offline mode (for downloaded books)
   * Future implementation will handle local file playback and offline session tracking
   */
  public setOfflineMode(enabled: boolean): void {
    this.isOfflineMode = enabled;
    console.log(`AudiobookStreamer: Offline mode ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Get offline mode status
   */
  public getOfflineMode(): boolean {
    return this.isOfflineMode;
  }

  /**
   * Store offline listening session for later sync
   * This will be called when listening offline to downloaded books
   */
  private storeOfflineSession(sessionData: Omit<OfflineListenSession, "timestamp">): void {
    const offlineSession: OfflineListenSession = {
      ...sessionData,
      timestamp: Date.now(),
    };
    this.offlineListenSessions.push(offlineSession);
    console.log("Stored offline session:", offlineSession);
    // TODO: Persist to local storage for app restart resilience
  }

  /**
   * Sync all stored offline sessions when coming back online
   * Future implementation will batch sync offline listening data
   */
  public async syncOfflineSessions(): Promise<void> {
    if (this.offlineListenSessions.length === 0) {
      console.log("No offline sessions to sync");
      return;
    }

    console.log(`Syncing ${this.offlineListenSessions.length} offline sessions...`);

    // TODO: Implement batch sync to server
    // for (const session of this.offlineListenSessions) {
    //   try {
    //     await this.apiClient.syncOfflineSession(session);
    //   } catch (error) {
    //     console.error('Failed to sync offline session:', error);
    //   }
    // }

    // Clear synced sessions
    this.offlineListenSessions = [];
    console.log("Offline sessions sync complete");
  }

  /**
   * Get count of pending offline sessions
   */
  public getPendingOfflineSessionCount(): number {
    return this.offlineListenSessions.length;
  }
}
