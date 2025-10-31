import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { mmkvStorage } from "./mmkv-storage";

interface Position {
  x: number;
  y: number;
}

interface MiniPlayerState {
  position: Position | null;
}

interface MiniPlayerActions {
  setPosition: (position: Position) => void;
  resetPosition: () => void;
}

interface MiniPlayerStore extends MiniPlayerState {
  actions: MiniPlayerActions;
}

export const useMiniPlayerStore = create<MiniPlayerStore>()(
  persist(
    (set) => ({
      // State
      position: null, // null means use default positioning

      // Actions
      actions: {
        setPosition: (position: Position) => {
          set({ position });
        },
        resetPosition: () => {
          set({ position: null });
        },
      },
    }),
    {
      name: "mini-player-storage",
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist the position, not actions
      partialize: (state) => ({ position: state.position }),
    }
  )
);

// Hooks for easier access
export const useMiniPlayerPosition = () => useMiniPlayerStore((state) => state.position);
export const useMiniPlayerActions = () => useMiniPlayerStore((state) => state.actions);
