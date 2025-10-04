import TrackPlayer, { Event, State } from "react-native-track-player";
import { ABSQueuedTrack } from "../../store/store-playback";
import { AudiobookshelfAPI } from "../AudiobookShelf/absAPIClass";
import { AudiobookSession } from "../AudiobookShelf/abstypes";
import { useSyncIntervalSeconds } from "../../store/store-settings";

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

type QueuedSync = {
  sessionId: string;
  timeListened: number;
  currentTime: number;
  timestamp: number;
  retryCount: number;
};

export default class AudiobookStreamer {
  private static instance: AudiobookStreamer | null = null;
  private session: AudiobookSession | null = null;
  private lastSyncTime: number | null = null;
  // Store event listener handles
  private progressUpdateListener: any = null;
  private playbackStateListener: any = null;
  private isInitialized: boolean = false;

  // Race condition prevention
  private isSyncing: boolean = false;
  private sessionClosed: boolean = false;
  private pendingSessionClose: {
    sessionId: string;
    position: number;
    timeListened: number;
  } | null = null;
  private lastSyncAttempt: number = 0;
  private syncDebounceMs: number = 1000; // Minimum time between sync attempts

  // Offline sync properties
  private isOfflineMode: boolean = false;
  private offlineListenSessions: OfflineListenSession[] = [];
  private queuedSyncs: QueuedSync[] = [];
  private maxRetries: number = 3;

  // Real-time sync timer properties
  private syncTimer: NodeJS.Timeout | null = null;
  private syncIntervalSeconds: number = 5; // Default, will be updated from settings

  private constructor(
    private serverUrl: string,
    private apiClient: AudiobookshelfAPI, // Your ABS API class instance
    syncIntervalSeconds: number = 5
  ) {
    this.syncIntervalSeconds = syncIntervalSeconds;
  }

  /**
   * Gets or creates the singleton instance
   */
  public static getInstance(
    serverUrl?: string,
    apiClient?: AudiobookshelfAPI,
    syncIntervalSeconds?: number
  ): AudiobookStreamer {
    if (!AudiobookStreamer.instance) {
      if (!serverUrl || !apiClient) {
        throw new Error(
          "AudiobookStreamer: serverUrl and apiClient required for first initialization"
        );
      }
      AudiobookStreamer.instance = new AudiobookStreamer(serverUrl, apiClient, syncIntervalSeconds);
      AudiobookStreamer.instance.initialize();
    }
    return AudiobookStreamer.instance;
  }

  /**
   * Updates the singleton with new connection details (useful for server changes)
   */
  public static updateInstance(
    serverUrl: string,
    apiClient: AudiobookshelfAPI,
    syncIntervalSeconds?: number
  ): AudiobookStreamer {
    if (AudiobookStreamer.instance) {
      AudiobookStreamer.instance.cleanup();
    }
    AudiobookStreamer.instance = new AudiobookStreamer(serverUrl, apiClient, syncIntervalSeconds);
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
    // Handle state changes for immediate sync on pause
    this.playbackStateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      async (event) => {
        await this.handlePlaybackStateChange(event);
      }
    );
  }

  /**
   * Starts the real-time sync timer for consistent server syncs
   */
  private startRealTimeSyncTimer(): void {
    // Clear any existing timer first
    this.stopRealTimeSyncTimer();

    const syncIntervalMs = this.syncIntervalSeconds * 1000; // Convert to milliseconds

    this.syncTimer = setInterval(() => {
      // Only sync if we have an active session and have started timing
      if (this.session && this.lastSyncTime) {
        this.syncProgress();
      }
    }, syncIntervalMs);

    console.log(`Started real-time sync timer with ${this.syncIntervalSeconds}s interval`);
  }

  /**
   * Stops the real-time sync timer
   */
  private stopRealTimeSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log("Stopped real-time sync timer");
    }
  }
  
  /**
   * Manages the sync timer based on playback state.
   */
  private async handlePlaybackStateChange(state: { state: State }) {
    if (state.state === State.Playing) {
      // Start the timer ONLY if it's not already running
      if (this.session && !this.lastSyncTime) {
        // console.log("Playback started, starting sync timer.");
        this.lastSyncTime = Date.now();
        // Start the real-time sync timer
        this.startRealTimeSyncTimer();
      }
    } else if (state.state === State.Paused || state.state === State.Stopped) {
      // Always perform final sync when playback stops
      if (this.lastSyncTime) {
        // console.log("Playback paused/stopped, performing final sync.");

        // Stop the real-time sync timer
        this.stopRealTimeSyncTimer();

        // Don't sync if we already have a pending session close (avoids race condition)
        if (!this.pendingSessionClose && !this.isSyncing) {
          await this.syncProgress();
        } else {
          console.log("Skipping sync - already have pending session close or sync in progress");
        }

        this.lastSyncTime = null; // Stop timing
      }
    }
  }

  async setupAudioPlayback(itemId: string): Promise<{
    tracks: ABSQueuedTrack[];
    sessionData: AudiobookSession & { absServerURL: string; coverURL: string };
  }> {
    const currentProgress = await this.apiClient.getBookProgress(itemId);
    // console.log("setupAudioPlaybook**CurrTime", currentProgress?.currentTime);

    // Reset sync timer when switching sessions - only start timing when playback actually starts
    this.lastSyncTime = null;

    // Stop any existing real-time timer when switching sessions
    this.stopRealTimeSyncTimer();

    // RACE CONDITION FIX: Capture current session state before switching
    await this.captureCurrentSessionForFinalSync();

    const response: AudiobookSession = await this.apiClient.getPlayInfo(itemId);

    const previousSessionId = this.session?.id;
    this.session = response;
    // ✅ Reset session closed flag for new session
    this.sessionClosed = false;

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
    const coverURL = await this.apiClient.buildCoverURL(itemId);
    const tracks = response.audioTracks.map((audioTrack) => ({
      id: `${response.id}-${audioTrack.index}`,
      url: `${this.serverUrl}/audiobookshelf/public/session/${response.id}/track/${audioTrack.index}`,
      title: response.displayTitle,
      artist: response.displayAuthor,
      artwork: coverURL.coverFull, //`${this.serverUrl}/api/items/${response.libraryItemId}/cover`,
      duration: audioTrack.duration,
      sessionId: response.id,
      libraryItemId: response.libraryItemId,
      chapters: response.chapters,
    }));

    return {
      tracks,
      sessionData: {
        ...response,
        startTime: actualStartTime,
        absServerURL: this.serverUrl,
        coverURL: coverURL.coverFull,
      },
    };
  }

  async syncProgress(currentPosition?: number): Promise<void> {
    // Prevent concurrent sync operations or syncing to closed sessions
    if (this.isSyncing || this.sessionClosed) {
      // console.log("Sync already in progress or session closed, skipping...");
      return;
    }

    this.isSyncing = true;

    try {
      // Handle pending session close first if it exists
      if (this.pendingSessionClose) {
        // console.log(`Processing pending session close for ${this.pendingSessionClose.sessionId}`);
        await this.apiClient.syncProgressToServer(this.pendingSessionClose.sessionId, {
          timeListened: this.pendingSessionClose.timeListened,
          currentTime: this.pendingSessionClose.position,
        });
        console.log(
          `Final sync completed for session ${this.pendingSessionClose.sessionId} - position: ${this.pendingSessionClose.position}s - listened: ${this.pendingSessionClose.timeListened}`
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

      // console.log(
      //   `IN SYNC PROGRESS - Session: ${activeSessionId}, Position: ${position}, LastSync: ${this.lastSyncTime}`
      // );
      const timeListened = this.lastSyncTime ? Math.floor((now - this.lastSyncTime) / 1000) : 0;

      const syncData: SyncData = {
        timeListened: timeListened,
        currentTime: position,
      };

      try {
        await this.apiClient.syncProgressToServer(activeSessionId, syncData);

        this.lastSyncTime = now;

        console.log(
          `Synced to session ${activeSessionId} - listened: ${timeListened}s, position: ${position}s`
        );

        // Process any queued syncs after successful sync
        await this.processQueuedSyncs();
      } catch (serverError) {
        // Check if it's a 404 error (session not found) - match API error format
        if (
          serverError &&
          typeof serverError === "object" &&
          (("status" in serverError && serverError.status === 404) ||
            ("statusCode" in serverError && serverError.statusCode === 404))
        ) {
          this.sessionClosed = true;
          return;
        }

        // Handle network errors by queuing the sync for later
        const networkError = serverError as any;
        if (
          serverError &&
          typeof serverError === "object" &&
          ((networkError.status === 0 || networkError.status >= 500) ||
            (networkError.statusCode === 0 || networkError.statusCode >= 500) ||
            (typeof networkError.message === "string" &&
             (networkError.message.includes("Network") || networkError.message.includes("timeout"))))
        ) {
          console.warn("Network error detected, queuing sync for later:", serverError);
          await this.queueSyncForLater(activeSessionId, syncData);
          return;
        } else {
          // Re-throw other errors to be caught by the outer catch block
          throw serverError;
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async syncProgressImmediate(): Promise<void> {
    // Force immediate sync (used for pause/stop events)
    await this.syncProgress();
  }

  /**
   * Sync current position immediately (used for seek operations)
   * This ensures server knows the new position right away
   */
  async syncPosition(): Promise<void> {
    if (!this.session) {
      console.log("Skipping position sync - no active session or playback not started");
      return;
    }

    // Don't sync if session is already closed
    if (this.sessionClosed) {
      console.log("Skipping position sync - session already closed");
      return;
    }

    // Debounce rapid sync attempts to prevent API spam during navigation
    const now = Date.now();
    if (now - this.lastSyncAttempt < this.syncDebounceMs) {
      console.log("Skipping position sync - debounced (too recent)");
      return;
    }
    this.lastSyncAttempt = now;

    try {
      const { position } = await TrackPlayer.getProgress();
      const activeSessionId = await this.getActiveSessionId();
      if (!activeSessionId) {
        console.warn("No active session ID found, skipping position sync");
        return;
      }

      // For seek operations, we don't accumulate timeListened - just sync the new position
      const syncData: SyncData = {
        timeListened: 0,
        currentTime: position,
      };

      await this.apiClient.syncProgressToServer(activeSessionId, syncData);
      // console.log(`Position synced to session ${activeSessionId} - position: ${position}s`);
    } catch (error) {
      // Check if it's a 404 error (session not found) - match API error format
      if (
        error &&
        typeof error === "object" &&
        (("status" in error && error.status === 404) ||
          ("statusCode" in error && error.statusCode === 404))
      ) {
        console.warn(`Session ${this.session?.id} not found on server - marking as closed`);
        this.sessionClosed = true;
        return;
      }
      console.error("Failed to sync position:", error);
    }
  }

  async closeSession(): Promise<void> {
    // Allow closing even if only pending exists
    if (!this.session && !this.pendingSessionClose) return;
    console.log("Close Session");

    // ✅ Prevent any further sync attempts
    this.sessionClosed = true;
    try {
      // Get sessionId from the currently active track to prevent cross-session contamination
      const activeSessionId = await this.getActiveSessionId();
      const sessionId = activeSessionId || this.pendingSessionClose?.sessionId || null;
      if (!sessionId) {
        console.warn("No active session ID found, cannot close session properly");
        // Still clean up local state even if we can't close on server
        this.session = null;
        this.lastSyncTime = null;
        return;
      }

      if (this.pendingSessionClose && this.pendingSessionClose.sessionId === sessionId) {
        console.log(
          `Closing session ${sessionId} with pending data at position: ${this.pendingSessionClose.position}s, listened: ${this.pendingSessionClose.timeListened}s`
        );
        await this.apiClient.closeSession(sessionId, {
          currentTime: this.pendingSessionClose.position,
          timeListened: this.pendingSessionClose.timeListened,
        });
        this.pendingSessionClose = null;
      } else {
        const { position } = await TrackPlayer.getProgress();
        const timeListened = this.lastSyncTime
          ? Math.floor((Date.now() - this.lastSyncTime) / 1000)
          : 0;

        console.log(
          `Closing session ${sessionId} at position: ${position}s, listened: ${timeListened}s`
        );

        await this.apiClient.closeSession(sessionId, {
          currentTime: position,
          timeListened,
        });
      }

      this.session = null;
      this.lastSyncTime = null;
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
      // Flush pending immediately to avoid waiting for next progress event
      await this.syncProgress();
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
   * Queue a sync for later when network is available
   */
  private async queueSyncForLater(sessionId: string, syncData: SyncData): Promise<void> {
    const queuedSync: QueuedSync = {
      sessionId,
      timeListened: syncData.timeListened,
      currentTime: syncData.currentTime,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queuedSyncs.push(queuedSync);
    console.log(`Queued sync for session ${sessionId} - ${syncData.timeListened}s listened`);
  }

  /**
   * Process any queued syncs after successful network connection
   */
  private async processQueuedSyncs(): Promise<void> {
    if (this.queuedSyncs.length === 0) return;

    console.log(`Processing ${this.queuedSyncs.length} queued syncs...`);

    const failedSyncs: QueuedSync[] = [];

    for (const queuedSync of this.queuedSyncs) {
      if (queuedSync.retryCount >= this.maxRetries) {
        console.warn(`Skipping sync for session ${queuedSync.sessionId} - max retries exceeded`);
        continue;
      }

      try {
        await this.apiClient.syncProgressToServer(queuedSync.sessionId, {
          timeListened: queuedSync.timeListened,
          currentTime: queuedSync.currentTime,
        });
        console.log(
          `Successfully synced queued data for session ${queuedSync.sessionId} - ${queuedSync.timeListened}s listened`
        );
      } catch (error) {
        queuedSync.retryCount++;
        console.warn(
          `Failed to sync queued data for session ${queuedSync.sessionId} (attempt ${queuedSync.retryCount}/${this.maxRetries}):`,
          error
        );

        if (queuedSync.retryCount < this.maxRetries) {
          failedSyncs.push(queuedSync);
        }
      }
    }

    this.queuedSyncs = failedSyncs;
  }

  /**
   * Get count of pending queued syncs
   */
  public getQueuedSyncCount(): number {
    return this.queuedSyncs.length;
  }

  /**
   * Update the sync interval dynamically
   */
  public updateSyncInterval(newIntervalSeconds: number): void {
    if (newIntervalSeconds <= 0) {
      console.warn("Sync interval must be positive, using default of 5 seconds");
      newIntervalSeconds = 5;
    }

    this.syncIntervalSeconds = newIntervalSeconds;

    // If timer is currently running, restart it with new interval
    if (this.syncTimer) {
      this.stopRealTimeSyncTimer();
      this.startRealTimeSyncTimer();
    }

    console.log(`Updated sync interval to ${newIntervalSeconds} seconds`);
  }

  /**
   * Comprehensive cleanup method
   */
  cleanup(): void {
    console.log("AudiobookStreamer: Cleaning up...");

    // Stop the real-time sync timer
    this.stopRealTimeSyncTimer();

    // Remove event listeners using the stored handles
    if (this.playbackStateListener) {
      this.playbackStateListener.remove();
      this.playbackStateListener = null;
    }

    // Reset internal state
    this.session = null;
    this.lastSyncTime = null;
    this.isInitialized = false;

    // Reset race condition prevention flags
    this.isSyncing = false;
    this.sessionClosed = false;
    this.pendingSessionClose = null;
    this.lastSyncAttempt = 0; // Reset debounce timer

    // Clear queued syncs on cleanup
    this.queuedSyncs = [];

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
  public storeOfflineSession(sessionData: Omit<OfflineListenSession, "timestamp">): void {
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
