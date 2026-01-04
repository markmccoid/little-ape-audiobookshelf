import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { mmkvStorage } from "./mmkv-storage";

// Sync types for labeling
export type SyncType =
  | "sync-progress" // Periodic timer-based syncs
  | "sync-position" // Seek/jump syncs
  | "session-close" // Session close syncs
  | "queued-sync" // Queued offline syncs
  | "queued-position-applied"; // When a queued position is used on reconnection

// Log entry type
export type SyncLogEntry = {
  id: string; // Unique ID for React keys
  timestamp: string; // Full timestamp: "2025-12-25 23:04:17"
  libraryItemId: string;
  title: string;
  position: string; // hh:mm:ss format
  timeListened?: number; // seconds of listening time sent
  syncType: SyncType;
  apiRoute: string; // e.g., "/api/session/{id}/sync" or "/api/me/progress/{itemId}"
  functionName: string;
  fileName: string;
  success: boolean;
  errorMessage?: string;
};

const MAX_LOG_ENTRIES = 2500;

// Helper to format seconds to hh:mm:ss
export function formatPositionForLog(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

// Helper to get current timestamp
function getCurrentTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// State interface
interface DebugLogsState {
  logs: SyncLogEntry[];
  loggingEnabled: boolean;
}

// Actions interface
interface DebugLogsActions {
  addSyncLog: (entry: Omit<SyncLogEntry, "id" | "timestamp">) => void;
  clearLogs: () => void;
  setLoggingEnabled: (enabled: boolean) => void;
}

// Combined store interface
interface DebugLogsStore extends DebugLogsState {
  actions: DebugLogsActions;
}

// Create the store
export const useDebugLogsStore = create<DebugLogsStore>()(
  persist(
    immer((set, get) => ({
      // State
      logs: [],
      loggingEnabled: true,

      // Actions
      actions: {
        addSyncLog: (entry) => {
          // Skip if logging is disabled
          if (!get().loggingEnabled) return;

          set((state) => {
            const newEntry: SyncLogEntry = {
              ...entry,
              id: generateId(),
              timestamp: getCurrentTimestamp(),
            };
            // Add to beginning (newest first), trim to max
            state.logs = [newEntry, ...state.logs].slice(0, MAX_LOG_ENTRIES);
          });
        },

        clearLogs: () => set({ logs: [] }),

        setLoggingEnabled: (enabled) => set({ loggingEnabled: enabled }),
      },
    })),
    {
      name: "debug-logs-storage",
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist logs and loggingEnabled, not actions
      partialize: (state) => ({
        logs: state.logs,
        loggingEnabled: state.loggingEnabled,
      }),
    }
  )
);

// Exported hooks
export const useSyncLogs = () => useDebugLogsStore((state) => state.logs);
export const useLoggingEnabled = () => useDebugLogsStore((state) => state.loggingEnabled);
export const useDebugLogsActions = () => useDebugLogsStore((state) => state.actions);

// Non-hook access for use in non-React contexts (like SyncManager)
export const addSyncLogEntry = (entry: Omit<SyncLogEntry, "id" | "timestamp">) => {
  useDebugLogsStore.getState().actions.addSyncLog(entry);
};
