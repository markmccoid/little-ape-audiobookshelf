import NetInfo from "@react-native-community/netinfo";
import PQueue from "p-queue";
import { AudiobookshelfAPI } from "../AudiobookShelf/absAPIClass";
import { syncQueue } from "../syncQueue";

type SyncData = { timeListened: number; currentTime: number };

export class SyncManager {
  private apiClient: AudiobookshelfAPI;
  private syncTimer: NodeJS.Timeout | null = null;
  private syncIntervalSeconds: number = 60;
  private lastSyncTime: number | null = null;
  private requestQueue = new PQueue({ concurrency: 1 });
  private lastSyncAttempt: number = 0;
  private syncDebounceMs: number = 1000;
  
  // Books store update throttling
  private lastBookStoreUpdate: number = 0;
  private bookStoreUpdateIntervalMs: number = 30000;
  private forceBooksStoreUpdate: boolean = false;

  constructor(apiClient: AudiobookshelfAPI, syncIntervalSeconds: number = 60) {
    this.apiClient = apiClient;
    this.syncIntervalSeconds = syncIntervalSeconds;
  }

  public updateSyncInterval(newIntervalSeconds: number): void {
    if (newIntervalSeconds <= 0) {
      console.warn("Sync interval must be positive, using default of 60 seconds");
      newIntervalSeconds = 60;
    }
    this.syncIntervalSeconds = newIntervalSeconds;
    
    // Restart timer if running
    if (this.syncTimer) {
      this.stopRealTimeSyncTimer();
      this.startRealTimeSyncTimer(() => {}); // Callback needs to be re-provided or stored
    }
  }

  public startRealTimeSyncTimer(callback: () => void): void {
    this.stopRealTimeSyncTimer();
    const syncIntervalMs = this.syncIntervalSeconds * 1000;

    this.syncTimer = setInterval(() => {
      if (this.lastSyncTime) {
        callback();
      }
    }, syncIntervalMs) as unknown as NodeJS.Timeout;
  }

  public stopRealTimeSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  public setLastSyncTime(time: number | null) {
    this.lastSyncTime = time;
  }

  public getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }

  public setForceBooksStoreUpdate(force: boolean) {
    this.forceBooksStoreUpdate = force;
  }

  public async syncProgress(
    sessionId: string,
    libraryItemId: string,
    globalPosition: number,
    isSessionClosed: boolean
  ): Promise<void> {
    if (isSessionClosed) return;

    await this.requestQueue.add(async () => {
      try {
        const now = Date.now();
        const timeListened = this.lastSyncTime ? Math.floor((now - this.lastSyncTime) / 1000) : 0;

        const syncData: SyncData = {
          timeListened: timeListened,
          currentTime: globalPosition,
        };

        try {
          const syncResult = await this.apiClient.syncProgressToServer(sessionId, syncData);
          this.lastSyncTime = now;

          if (syncResult.success) {
            this.updateBooksStore(libraryItemId, syncResult.currentTime);
          }

          await this.processQueuedSyncs();
        } catch (serverError) {
          this.handleSyncError(serverError, sessionId, syncData);
        }
      } catch (error) {
        console.error("Error in syncProgress queue task:", error);
      }
    });
  }

  public async syncPosition(
    sessionId: string,
    libraryItemId: string,
    globalPosition: number,
    isSessionClosed: boolean
  ): Promise<void> {
    if (isSessionClosed) return;

    const now = Date.now();
    if (now - this.lastSyncAttempt < this.syncDebounceMs) {
      return;
    }
    this.lastSyncAttempt = now;

    await this.requestQueue.add(async () => {
      try {
        const syncData: SyncData = {
          timeListened: 0,
          currentTime: globalPosition,
        };

        const syncResult = await this.apiClient.syncProgressToServer(sessionId, syncData);

        if (syncResult.success) {
          const { useBooksStore } = require("../../store/store-books");
          const bookActions = useBooksStore.getState().actions;
          bookActions.updateCurrentPosition(libraryItemId, syncResult.currentTime);
        }
      } catch (error) {
        console.error("Failed to sync position:", error);
      }
    });
  }

  public async waitForAllSyncs(): Promise<void> {
    await this.requestQueue.onIdle();
  }

  private updateBooksStore(libraryItemId: string, currentTime: number) {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastBookStoreUpdate;
    const shouldUpdate =
      this.forceBooksStoreUpdate ||
      this.lastBookStoreUpdate === 0 ||
      timeSinceLastUpdate >= this.bookStoreUpdateIntervalMs;

    if (shouldUpdate) {
      const { useBooksStore } = require("../../store/store-books");
      const bookActions = useBooksStore.getState().actions;
      bookActions.updateCurrentPosition(libraryItemId, currentTime);
      this.lastBookStoreUpdate = now;
      
      if (this.forceBooksStoreUpdate) {
        this.forceBooksStoreUpdate = false;
      }
    }
  }

  private async handleSyncError(error: any, sessionId: string, syncData: SyncData) {
    // Check for 404
    if (
      error &&
      typeof error === "object" &&
      (("status" in error && error.status === 404) ||
        ("statusCode" in error && error.statusCode === 404))
    ) {
      throw error; // Let caller handle session closed
    }

    // Handle network errors
    const networkError = error as any;
    if (
      error &&
      typeof error === "object" &&
      (networkError.status === 0 ||
        networkError.status >= 500 ||
        networkError.statusCode === 0 ||
        networkError.statusCode >= 500 ||
        (typeof networkError.message === "string" &&
          (networkError.message.includes("Network") ||
            networkError.message.includes("timeout"))))
    ) {
      console.warn("Network error detected, queuing sync for later:", error);
      await this.queueSyncForLater(sessionId, syncData);
    } else {
      throw error;
    }
  }

  private async queueSyncForLater(sessionId: string, syncData: SyncData): Promise<void> {
    syncQueue.addToQueue({
      type: "playback-progress",
      data: {
        sessionId,
        timeListened: syncData.timeListened,
        currentTime: syncData.currentTime,
      },
    });
  }

  public async executeOnQueue(task: () => Promise<void>): Promise<void> {
    await this.requestQueue.add(task);
  }

  public async processQueuedSyncs(): Promise<void> {
    const stats = await syncQueue.processQueue(async (item) => {
      if (item.type !== "playback-progress") return false;

      const { sessionId, timeListened, currentTime } = item.data;

      try {
        await this.apiClient.syncProgressToServer(sessionId!, {
          timeListened: timeListened!,
          currentTime: currentTime!,
        });
        return true;
      } catch (error) {
        return false;
      }
    });

    if (stats.success > 0) console.log(`Processed ${stats.success} queued syncs`);
  }

  public async processQueueOnReconnection(): Promise<void> {
    const networkState = await NetInfo.fetch();
    if (networkState.isConnected && networkState.isInternetReachable !== false) {
      await this.processQueuedSyncs();
    }
  }
  
  public getQueuedSyncCount(): number {
    return syncQueue.getQueueCount();
  }

  public getSyncQueueStats() {
    return syncQueue.getQueueStats();
  }
}
