import { MMKV } from "react-native-mmkv";

// Create a dedicated MMKV instance for sync queue
const syncQueueStorage = new MMKV({
  id: "sync-queue-storage",
});

// Types for queued operations
export type SyncOperation =
  | "playback-progress"
  | "bookmark-add"
  | "bookmark-update"
  | "bookmark-delete";

export interface QueuedSyncItem {
  id: string; // Unique ID for the sync item
  type: SyncOperation;
  timestamp: number; // When it was queued
  retryCount: number;
  data: {
    // Playback progress data
    sessionId?: string;
    timeListened?: number;
    currentTime?: number;

    // Bookmark data
    bookmarkId?: string;
    libraryItemId?: string;
    time?: number;
    title?: string;

    // Generic data for future operations
    [key: string]: any;
  };
}

const QUEUE_KEY = "pending_syncs";
const MAX_RETRIES = 3;

/**
 * Sync Queue Manager
 * Handles queuing and processing of sync operations when offline
 */
export class SyncQueueManager {
  private static instance: SyncQueueManager | null = null;

  private constructor() {
    // Initialize queue if not exists
    if (!syncQueueStorage.contains(QUEUE_KEY)) {
      this.saveQueue([]);
    }
  }

  static getInstance(): SyncQueueManager {
    if (!SyncQueueManager.instance) {
      SyncQueueManager.instance = new SyncQueueManager();
    }
    return SyncQueueManager.instance;
  }

  /**
   * Get all queued sync items
   */
  getQueue(): QueuedSyncItem[] {
    try {
      const queueJson = syncQueueStorage.getString(QUEUE_KEY);
      if (!queueJson) return [];
      return JSON.parse(queueJson);
    } catch (error) {
      console.error("Error reading sync queue:", error);
      return [];
    }
  }

  /**
   * Save the queue to storage
   */
  private saveQueue(queue: QueuedSyncItem[]): void {
    try {
      syncQueueStorage.set(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error("Error saving sync queue:", error);
    }
  }

  /**
   * Add a sync operation to the queue
   */
  addToQueue(item: Omit<QueuedSyncItem, "id" | "timestamp" | "retryCount">): void {
    let queue = this.getQueue();

    // Deduplication logic for playback-progress
    if (item.type === "playback-progress") {
      const { libraryItemId } = item.data;
      if (libraryItemId) {
        // Remove existing progress syncs for this book
        const initialLength = queue.length;
        queue = queue.filter(
          (qItem) =>
            !(qItem.type === "playback-progress" && qItem.data.libraryItemId === libraryItemId)
        );

        if (queue.length < initialLength) {
          console.log(
            `Removed ${initialLength - queue.length} stale sync(s) for book ${libraryItemId}`
          );
        }
      }
    }

    const newItem: QueuedSyncItem = {
      ...item,
      id: `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    queue.push(newItem);
    this.saveQueue(queue);

    console.log(`Queued sync operation: ${item.type}`, newItem.id);
  }

  /**
   * Get the count of queued items
   */
  getQueueCount(): number {
    return this.getQueue().length;
  }

  /**
   * Remove a specific item from the queue
   */
  removeFromQueue(itemId: string): void {
    const queue = this.getQueue();
    const filteredQueue = queue.filter((item) => item.id !== itemId);
    this.saveQueue(filteredQueue);
  }

  /**
   * Increment retry count for an item
   */
  incrementRetryCount(itemId: string): void {
    const queue = this.getQueue();
    const item = queue.find((i) => i.id === itemId);

    if (item) {
      item.retryCount += 1;

      // Remove if exceeded max retries
      if (item.retryCount >= MAX_RETRIES) {
        console.warn(`Max retries reached for sync item ${itemId}, removing from queue`);
        this.removeFromQueue(itemId);
      } else {
        this.saveQueue(queue);
      }
    }
  }

  /**
   * Clear all items from the queue
   */
  clearQueue(): void {
    this.saveQueue([]);
    console.log("Sync queue cleared");
  }

  /**
   * Process the queue with a callback function
   * Returns true if all items were processed successfully
   */
  async processQueue(
    processFn: (item: QueuedSyncItem) => Promise<boolean>
  ): Promise<{ success: number; failed: number }> {
    const queue = this.getQueue();

    if (queue.length === 0) {
      // console.log("No items in sync queue to process");
      return { success: 0, failed: 0 };
    }

    console.log(`Processing ${queue.length} queued sync operations...`);

    let successCount = 0;
    let failedCount = 0;

    // Process items sequentially to avoid overwhelming the server
    for (const item of queue) {
      try {
        const success = await processFn(item);

        if (success) {
          this.removeFromQueue(item.id);
          successCount++;
          console.log(`Successfully processed sync: ${item.type} (${item.id})`);
        } else {
          this.incrementRetryCount(item.id);
          failedCount++;
          console.warn(`Failed to process sync: ${item.type} (${item.id})`);
        }
      } catch (error) {
        console.error(`Error processing sync item ${item.id}:`, error);
        this.incrementRetryCount(item.id);
        failedCount++;
      }
    }

    console.log(`Queue processing complete: ${successCount} success, ${failedCount} failed`);
    return { success: successCount, failed: failedCount };
  }

  /**
   * Get queued items by type
   */
  getQueuedItemsByType(type: SyncOperation): QueuedSyncItem[] {
    const queue = this.getQueue();
    return queue.filter((item) => item.type === type);
  }

  /**
   * Check if there are any queued items
   */
  hasQueuedItems(): boolean {
    return this.getQueue().length > 0;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    total: number;
    byType: Record<SyncOperation, number>;
    oldestTimestamp: number | null;
  } {
    const queue = this.getQueue();

    const stats = {
      total: queue.length,
      byType: {
        "playback-progress": 0,
        "bookmark-add": 0,
        "bookmark-update": 0,
        "bookmark-delete": 0,
      } as Record<SyncOperation, number>,
      oldestTimestamp: queue.length > 0 ? Math.min(...queue.map((i) => i.timestamp)) : null,
    };

    queue.forEach((item) => {
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
    });

    return stats;
  }
}

// Export singleton instance
export const syncQueue = SyncQueueManager.getInstance();
