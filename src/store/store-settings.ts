import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { mmkvStorage } from "./mmkv-storage";

// Define the state interface
interface SettingsState {
  seekForwardSeconds: number;
  seekBackwardSeconds: number;
}

// Define the actions interface
interface SettingsActions {
  setSeekForwardSeconds: (seconds: number) => void;
  setSeekBackwardSeconds: (seconds: number) => void;
  resetToDefaults: () => void;
}

// Combined store interface
interface SettingsStore extends SettingsState {
  actions: SettingsActions;
}

// Default values
const DEFAULT_SEEK_FORWARD_SECONDS = 30;
const DEFAULT_SEEK_BACKWARD_SECONDS = 15;

// Create the store (not exported directly - following best practices)
const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // State
      seekForwardSeconds: DEFAULT_SEEK_FORWARD_SECONDS,
      seekBackwardSeconds: DEFAULT_SEEK_BACKWARD_SECONDS,

      // Actions grouped in a separate namespace
      actions: {
        setSeekForwardSeconds: (seconds: number) => set({ seekForwardSeconds: seconds }),

        setSeekBackwardSeconds: (seconds: number) => set({ seekBackwardSeconds: seconds }),

        resetToDefaults: () =>
          set({
            seekForwardSeconds: DEFAULT_SEEK_FORWARD_SECONDS,
            seekBackwardSeconds: DEFAULT_SEEK_BACKWARD_SECONDS,
          }),
      },
    }),
    {
      name: "settings-storage", // Storage key
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist the state, not the actions
      partialize: (state) => ({
        seekForwardSeconds: state.seekForwardSeconds,
        seekBackwardSeconds: state.seekBackwardSeconds,
      }),
    }
  )
);

// Exported custom hooks following best practices
// Only export atomic selectors to prevent unnecessary re-renders
export const useSeekForwardSeconds = () => useSettingsStore((state) => state.seekForwardSeconds);

export const useSeekBackwardSeconds = () => useSettingsStore((state) => state.seekBackwardSeconds);

/**
 * Hook to get all settings actions
 * Since actions never change, it's safe to return all of them
 */
export const useSettingsActions = () => useSettingsStore((state) => state.actions);

/**
 * Hook to get both seek values at once
 * Use this when you need both values in the same component
 */
export const useSeekSettings = () =>
  useSettingsStore((state) => ({
    seekForwardSeconds: state.seekForwardSeconds,
    seekBackwardSeconds: state.seekBackwardSeconds,
  }));
