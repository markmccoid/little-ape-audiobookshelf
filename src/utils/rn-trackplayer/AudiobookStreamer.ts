import TrackPlayer, { Event, State } from "react-native-track-player";
import { ABSQueuedTrack } from "../../store/store-playback";
import { AudiobookshelfAPI } from "../AudiobookShelf/absAPIClass";
import { AudiobookSession } from "../AudiobookShelf/abstypes";
import { SessionManager } from "./SessionManager";
import { SyncManager } from "./SyncManager";

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
  
  // Managers
  private sessionManager: SessionManager;
  private syncManager: SyncManager;
  
  // Event listeners
  private playbackStateListener: any = null;
  private isInitialized: boolean = false;

  // Race condition prevention
  private sessionClosed: boolean = false;
  private pendingSessionClose: {
    sessionId: string;
    position: number;
    timeListened: number;
  } | null = null;
  
  private lastPauseTime: number = 0;
  private pauseDebounceMs: number = 500;

  // Offline sync properties
  private isOfflineMode: boolean = false;
  private offlineListenSessions: OfflineListenSession[] = [];

  private constructor(
    private serverUrl: string,
    private apiClient: AudiobookshelfAPI,
    syncIntervalSeconds: number = 60
  ) {
    this.sessionManager = new SessionManager(serverUrl, apiClient);
    this.syncManager = new SyncManager(apiClient, syncIntervalSeconds);
  }

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

  public static destroyInstance(): void {
    if (AudiobookStreamer.instance) {
      AudiobookStreamer.instance.cleanup();
      AudiobookStreamer.instance = null;
    }
  }

  private initialize(): void {
    if (this.isInitialized) return;
    this.setupTrackPlayerEvents();
    this.isInitialized = true;
  }

  private setupTrackPlayerEvents() {
    this.playbackStateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      async (event) => {
        await this.handlePlaybackStateChange(event);
      }
    );
  }

  private async handlePlaybackStateChange(state: { state: State }) {
    if (state.state === State.Playing) {
      this.syncManager.setForceBooksStoreUpdate(false);

      if (this.sessionManager.hasSession() && !this.syncManager.getLastSyncTime()) {
        this.syncManager.setLastSyncTime(Date.now());
        this.syncManager.startRealTimeSyncTimer(() => this.syncProgress());
      }
    } else if (state.state === State.Paused || state.state === State.Stopped) {
      const now = Date.now();
      if (now - this.lastPauseTime < this.pauseDebounceMs) {
        console.log("Pause event debounced, ignoring");
        return;
      }
      this.lastPauseTime = now;

      this.syncManager.setForceBooksStoreUpdate(true);

      if (this.syncManager.getLastSyncTime()) {
        this.syncManager.stopRealTimeSyncTimer();

        await new Promise((resolve) => setTimeout(resolve, 100));

        if (!this.pendingSessionClose) {
          await this.syncProgress();
        } else {
          console.log("Skipping sync - already have pending session close");
        }

        this.syncManager.setLastSyncTime(null);
      }
    }
  }

  async setupAudioPlayback(itemId: string): Promise<{
    tracks: ABSQueuedTrack[];
    sessionData: AudiobookSession & { absServerURL: string; coverURL: string };
  }> {
    this.syncManager.setLastSyncTime(null);
    this.syncManager.stopRealTimeSyncTimer();

    await this.captureCurrentSessionForFinalSync();

    const result = await this.sessionManager.setupSession(itemId);
    this.sessionClosed = false;

    return result;
  }

  async syncProgress(currentPosition?: number): Promise<void> {
    if (this.sessionClosed) return;

    if (this.pendingSessionClose) {
      await this.apiClient.syncProgressToServer(this.pendingSessionClose.sessionId, {
        timeListened: this.pendingSessionClose.timeListened,
        currentTime: this.pendingSessionClose.position,
      });
      this.pendingSessionClose = null;
      return;
    }

    const activeSessionId = await this.sessionManager.getActiveSessionId();
    const activeLibraryItemId = await this.sessionManager.getActiveLibraryItemId();
    
    if (!activeSessionId || !activeLibraryItemId) {
      console.warn("No active session/library ID found, skipping sync");
      return;
    }

    const globalPosition = await this.sessionManager.getGlobalPosition(currentPosition);

    try {
      await this.syncManager.syncProgress(
        activeSessionId,
        activeLibraryItemId,
        globalPosition,
        this.sessionClosed
      );
    } catch (error: any) {
      if (error?.status === 404 || error?.statusCode === 404) {
        this.sessionClosed = true;
      }
      throw error;
    }
  }

  async syncProgressImmediate(): Promise<void> {
    await this.syncProgress();
  }

  async syncPosition(globalPosIn?: number): Promise<void> {
    if (!this.sessionManager.hasSession() || this.sessionClosed) return;

    const activeSessionId = await this.sessionManager.getActiveSessionId();
    const activeLibraryItemId = await this.sessionManager.getActiveLibraryItemId();
    
    if (!activeSessionId || !activeLibraryItemId) return;

    const globalPosition = globalPosIn !== undefined 
      ? globalPosIn 
      : await this.sessionManager.getGlobalPosition();

    await this.syncManager.syncPosition(
      activeSessionId,
      activeLibraryItemId,
      globalPosition,
      this.sessionClosed
    );
  }

  async closeSession(): Promise<void> {
    if (!this.sessionManager.hasSession() && !this.pendingSessionClose) return;
    console.log("Close Session");

    this.syncManager.stopRealTimeSyncTimer();
    this.syncManager.setForceBooksStoreUpdate(true);

    try {
      const activeSessionId = await this.sessionManager.getActiveSessionId();
      const sessionId = activeSessionId || this.pendingSessionClose?.sessionId || null;

      if (!sessionId) {
        this.sessionManager.clearSession();
        this.syncManager.setLastSyncTime(null);
        this.sessionClosed = true;
        return;
      }

      let finalPosition: number;
      let finalTimeListened: number;

      if (this.pendingSessionClose && this.pendingSessionClose.sessionId === sessionId) {
        finalPosition = this.pendingSessionClose.position;
        finalTimeListened = this.pendingSessionClose.timeListened;
        this.pendingSessionClose = null;
      } else {
        finalPosition = await this.sessionManager.getGlobalPosition();
        const lastSyncTime = this.syncManager.getLastSyncTime();
        finalTimeListened = lastSyncTime
          ? Math.floor((Date.now() - lastSyncTime) / 1000)
          : 0;
      }

      await this.apiClient.closeSession(sessionId, {
        currentTime: finalPosition,
        timeListened: finalTimeListened,
      });

      // Update books store one last time
      const session = this.sessionManager.getSession();
      if (session) {
        const { useBooksStore } = require("../../store/store-books");
        const bookActions = useBooksStore.getState().actions;
        bookActions.updateCurrentPosition(session.libraryItemId, finalPosition);
      }

      this.sessionClosed = true;
      this.sessionManager.clearSession();
      this.syncManager.setLastSyncTime(null);
      this.syncManager.setForceBooksStoreUpdate(false);
    } catch (error) {
      console.error("Failed to close session:", error);
      this.sessionClosed = true;
      this.sessionManager.clearSession();
      this.syncManager.setLastSyncTime(null);
      this.syncManager.setForceBooksStoreUpdate(false);
    }
  }

  getSession(): AudiobookSession | null {
    return this.sessionManager.getSession();
  }

  private async captureCurrentSessionForFinalSync(): Promise<void> {
    const session = this.sessionManager.getSession();
    const lastSyncTime = this.syncManager.getLastSyncTime();

    if (!session || !lastSyncTime) {
      return;
    }

    try {
      const globalPosition = await this.sessionManager.getGlobalPosition();
      const timeListened = Math.floor((Date.now() - lastSyncTime) / 1000);

      this.pendingSessionClose = {
        sessionId: session.id,
        position: globalPosition,
        timeListened: timeListened,
      };

      console.log(
        `Captured session ${session.id} at position ${globalPosition}s for final sync`
      );
    } catch (error) {
      console.error("Failed to capture current session state:", error);
    }
  }

  public getQueuedSyncCount(): number {
    return this.syncManager.getQueuedSyncCount();
  }

  public getSyncQueueStats() {
    return this.syncManager.getSyncQueueStats();
  }

  public updateSyncInterval(newIntervalSeconds: number): void {
    this.syncManager.updateSyncInterval(newIntervalSeconds);
  }

  cleanup(): void {
    console.log("AudiobookStreamer: Cleaning up...");
    this.syncManager.stopRealTimeSyncTimer();

    if (this.playbackStateListener) {
      this.playbackStateListener.remove();
      this.playbackStateListener = null;
    }

    this.sessionManager.clearSession();
    this.syncManager.setLastSyncTime(null);
    this.isInitialized = false;
    this.sessionClosed = false;
    this.pendingSessionClose = null;
    this.lastPauseTime = 0;

    console.log("AudiobookStreamer: Cleanup complete");
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public setOfflineMode(enabled: boolean): void {
    this.isOfflineMode = enabled;
    console.log(`AudiobookStreamer: Offline mode ${enabled ? "enabled" : "disabled"}`);
  }

  public getOfflineMode(): boolean {
    return this.isOfflineMode;
  }

  public storeOfflineSession(sessionData: Omit<OfflineListenSession, "timestamp">): void {
    const offlineSession: OfflineListenSession = {
      ...sessionData,
      timestamp: Date.now(),
    };
    this.offlineListenSessions.push(offlineSession);
    console.log("Stored offline session:", offlineSession);
  }

  public async syncOfflineSessions(): Promise<void> {
    if (this.offlineListenSessions.length === 0) {
      console.log("No offline sessions to sync");
      return;
    }
    console.log(`Syncing ${this.offlineListenSessions.length} offline sessions...`);
    this.offlineListenSessions = [];
    console.log("Offline sessions sync complete");
  }

  public getPendingOfflineSessionCount(): number {
    return this.offlineListenSessions.length;
  }

  async processQueueOnReconnection(): Promise<void> {
    await this.syncManager.processQueueOnReconnection();
  }
}

