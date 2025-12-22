import NetInfo from "@react-native-community/netinfo";
import PQueue from "p-queue";
import { AudiobookshelfAPI } from "../AudiobookShelf/absAPIClass";
import { SyncOperation, syncQueue } from "../syncQueue";

type SyncData = { timeListened: number; currentTime: number };

// Request types that should be queued when offline vs fail immediately
const QUEUEABLE_OPERATIONS: SyncOperation[] = [
  "playback-progress",
  "bookmark-add",
  "bookmark-update",
  "bookmark-delete",
];

/**
 * Check if an operation type should be queued when offline
 */
export function shouldQueueRequest(type: string): boolean {
  return QUEUEABLE_OPERATIONS.includes(type as SyncOperation);
}

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
    sessionId: string | null,
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
          console.log("SyncManager syncProgress:", { sessionId, libraryItemId });
          let syncResult;

          if (sessionId) {
            syncResult = await this.apiClient.syncProgressToServer(sessionId, syncData);
          } else {
            // Local fallback for downloaded books (no session)
            await this.apiClient.updateBookProgress(libraryItemId, syncData.currentTime);
            syncResult = { success: true, currentTime: syncData.currentTime };
          }

          // When offline, API returns null - queue the sync for later
          if (!syncResult) {
            console.log("Sync returned null (likely offline) - queuing for later");
            await this.queueSyncForLater(sessionId, libraryItemId, syncData);
            return;
          }

          this.lastSyncTime = now;

          if (syncResult.success) {
            this.updateBooksStore(libraryItemId, syncResult.currentTime);
          }

          await this.processQueuedSyncs();
        } catch (serverError) {
          this.handleSyncError(serverError, sessionId, libraryItemId, syncData);
        }
      } catch (error) {
        console.error("Error in syncProgress queue task:", error);
      }
    });
  }

  public async syncPosition(
    sessionId: string | null,
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

        let syncResult;
        if (sessionId) {
          syncResult = await this.apiClient.syncProgressToServer(sessionId, syncData);
        } else {
          await this.apiClient.updateBookProgress(libraryItemId, syncData.currentTime);
          syncResult = { success: true, currentTime: syncData.currentTime };
        }

        if (syncResult && syncResult.success) {
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

  private async handleSyncError(
    error: any,
    sessionId: string | null,
    libraryItemId: string,
    syncData: SyncData
  ) {
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
          (networkError.message.includes("Network") || networkError.message.includes("timeout"))))
    ) {
      console.warn("Network error detected, queuing sync for later:", error);
      await this.queueSyncForLater(sessionId, libraryItemId, syncData);
    } else {
      throw error;
    }
  }

  private async queueSyncForLater(
    sessionId: string | null,
    libraryItemId: string,
    syncData: SyncData
  ): Promise<void> {
    console.log("QUEUE Sync for libraryItemId:", libraryItemId);
    syncQueue.addToQueue({
      type: "playback-progress",
      data: {
        sessionId: sessionId || undefined,
        libraryItemId,
        timeListened: syncData.timeListened,
        currentTime: syncData.currentTime,
      },
    });
  }

  public async executeOnQueue(task: () => Promise<void>): Promise<void> {
    await this.requestQueue.add(task);
  }

  /**
   * Check if network is available before making a request
   * Returns true if network is available, false otherwise
   */
  public async checkNetworkBeforeRequest(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  }

  /**
   * Queue a generic request for later processing when offline
   */
  public queueRequest(type: SyncOperation, data: Record<string, unknown>): void {
    syncQueue.addToQueue({ type, data });
  }

  public async processQueuedSyncs(): Promise<void> {
    const stats = await syncQueue.processQueue(async (item) => {
      // Handle playback progress
      if (item.type === "playback-progress") {
        const { sessionId, libraryItemId, timeListened, currentTime } = item.data;

        if (!libraryItemId || currentTime === undefined) return false;

        // Path A: Session Sync (if we have a session ID)
        if (sessionId) {
          try {
            await this.apiClient.syncProgressToServer(sessionId, {
              timeListened: timeListened || 0,
              currentTime: currentTime,
            });
            this.updateBooksStore(libraryItemId, currentTime);
            return true;
          } catch (error: any) {
            // If session expired (404), fall back to direct progress update
            const is404 =
              error?.status === 404 || error?.statusCode === 404 || error?.response?.status === 404;
            if (!is404) return false; // Actual network error, keep in queue
          }
        }

        // Path B: Direct Progress Sync (Fallback or Default for local sessions)
        try {
          // ensure we have a valid time listened if possible, or 0
          await this.apiClient.updateBookProgress(libraryItemId, currentTime);
          this.updateBooksStore(libraryItemId, currentTime);
          return true;
        } catch (fallbackError) {
          console.error("Progress sync failed:", fallbackError);
          return false;
        }
      }

      // Handle bookmark add/update
      if (item.type === "bookmark-add" || item.type === "bookmark-update") {
        const { libraryItemId, time, title } = item.data;
        try {
          await this.apiClient.saveBookmark(libraryItemId as string, {
            libraryItemId: libraryItemId as string,
            time: time as number,
            title: title as string,
            createdAt: Date.now(),
          });
          return true;
        } catch (error) {
          return false;
        }
      }

      // Handle bookmark delete
      if (item.type === "bookmark-delete") {
        const { libraryItemId, time } = item.data;
        try {
          await this.apiClient.deleteBookmark(libraryItemId as string, time as number);
          return true;
        } catch (error) {
          return false;
        }
      }

      return false;
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
