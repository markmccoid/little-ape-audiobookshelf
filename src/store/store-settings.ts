import TrackPlayer from "react-native-track-player";
import uuid from "react-native-uuid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { Bookshelf, defaultBookshelves } from "../utils/AudiobookShelf/bookshelfTypes";
import { formatSeconds, timeBetween } from "../utils/formatUtils";
import { mmkvStorage } from "./mmkv-storage";

// Define the state interface
type TimeVariant = "timeleft" | "timeread";
interface SettingsState {
  seekForwardSeconds: number;
  seekBackwardSeconds: number;
  syncIntervalSeconds: number;
  // Time variant to show on home screen
  homeScreenTimeVariant: TimeVariant;
  // all available bookshelves, this will include the default and any custom shelves
  allBookshelves: Bookshelf[];
  // Bookshelves to display - order of array is order of display
  bookshelvesToDisplay: string[];
  // Sleep Timer ----
  sleepTimeMinutes: number;
  sleepStartDateTime: Date | undefined;
  sleepChapterIndex: number | undefined;
  cancelSleepTimeout: (() => void) | undefined;
  cancelSleepInterval: (() => void) | undefined;
  sleepCountdownActive: boolean;
  sleepIntervalActive: boolean;
  sleepCountDown: {
    secondsLeft: number | undefined;
    formattedOutput: string | undefined;
  };
}

// Define the actions interface
interface SettingsActions {
  setSeekForwardSeconds: (seconds: number) => void;
  setSeekBackwardSeconds: (seconds: number) => void;
  setSyncIntervalSeconds: (seconds: number) => void;
  setHomeScreenTimeVariant: (variant: TimeVariant) => void;
  // bookshelves
  updateBookshelfDisplay: (bookshelfId: string, displayed: boolean) => void;
  addNewBookshelf: (newBookshelf: string) => void;
  updateBookshelves: (newBookshelves: Bookshelf[]) => void;

  deleteBookshelf: (bookshelfId: string) => void;
  resetToDefaults: () => void;
  updateSleepTime: (sleepTime: number) => void;
  updateSleepChapter: (chapterIndex: number | undefined) => void;
  startSleepTimer: (libraryItemid?: string) => void;
  stopSleepTimer: () => void;
  runSleepCountdown: () => void;
}

// Combined store interface
interface SettingsStore extends SettingsState {
  actions: SettingsActions;
}

// Default values
const DEFAULT_SEEK_FORWARD_SECONDS = 15;
const DEFAULT_SEEK_BACKWARD_SECONDS = 15;
const DEFAULT_SYNC_INTERVAL_SECONDS = 5;

// Create the store (not exported directly - following best practices)
export const useSettingsStore = create<SettingsStore>()(
  persist(
    immer((set, get) => ({
      // State
      seekForwardSeconds: DEFAULT_SEEK_FORWARD_SECONDS,
      seekBackwardSeconds: DEFAULT_SEEK_BACKWARD_SECONDS,
      syncIntervalSeconds: DEFAULT_SYNC_INTERVAL_SECONDS,
      homeScreenTimeVariant: "timeleft",
      //Bookshelves
      allBookshelves: [...defaultBookshelves],
      bookshelvesToDisplay: [
        "continue-listening",
        "recently-added",
        "discover",
        "listen-again",
        "downloaded",
      ],
      // Sleep Timer START
      sleepTimeMinutes: 0,
      sleepStartDateTime: undefined,
      sleepChapterIndex: undefined,
      sleepCountdownActive: false,
      sleepIntervalActive: false,
      sleepCountDown: {
        secondsLeft: undefined,
        formattedOutput: "",
      },
      cancelSleepTimeout: undefined,
      cancelSleepInterval: undefined,
      // Sleep Timer END

      // Actions grouped in a separate namespace
      actions: {
        setSeekForwardSeconds: (seconds: number) => set({ seekForwardSeconds: seconds }),

        setSeekBackwardSeconds: (seconds: number) => set({ seekBackwardSeconds: seconds }),

        setSyncIntervalSeconds: (seconds: number) => set({ syncIntervalSeconds: seconds }),

        setHomeScreenTimeVariant: (timeVariant) => set({ homeScreenTimeVariant: timeVariant }),

        resetToDefaults: () =>
          set({
            seekForwardSeconds: DEFAULT_SEEK_FORWARD_SECONDS,
            seekBackwardSeconds: DEFAULT_SEEK_BACKWARD_SECONDS,
            syncIntervalSeconds: DEFAULT_SYNC_INTERVAL_SECONDS,
          }),

        updateBookshelfDisplay: (bookshelfId: string, displayed: boolean) => {
          set((state) => {
            state.allBookshelves = state.allBookshelves.map((el) => {
              if (el.id === bookshelfId) {
                return { ...el, displayed };
              }
              return el;
            });
          });
          // set({ bookshelvesToDisplay: newBookshelves });
        },
        updateBookshelves: (newBookshelves: Bookshelf[]) => set({ allBookshelves: newBookshelves }),
        addNewBookshelf: (newBookshelf) => {
          console.log("ADDING BOOKSHELF");
          const id = uuid.v4();
          const allBS = get().allBookshelves;
          const found = allBS.findIndex((el) => el.label === newBookshelf);

          if (found !== -1) throw new Error("duplicate");

          set({
            allBookshelves: [
              ...allBS,
              { id, label: newBookshelf, type: "custom", position: allBS.length, displayed: true },
            ],
          });
        },
        deleteBookshelf: (bookshelfId) => {
          set((state) => {
            state.allBookshelves = state.allBookshelves.filter((item) => item.id !== bookshelfId);
            state.bookshelvesToDisplay = state.bookshelvesToDisplay.filter(
              (item) => item !== bookshelfId
            );
          });
        },
        updateSleepTime: (sleepTime) => {
          if (sleepTime < 0) {
            sleepTime = 0;
          }
          sleepTime = Math.floor(sleepTime);
          set({ sleepTimeMinutes: sleepTime });
          // const newSettingsData = { ...get() };
          // delete newSettingsData.actions;
          // Save to settings store
        },
        updateSleepChapter: (chapterIndex) => {
          // If the cancelSleepTimeout is set then run it to clear
          // the old timeout
          const cancelSleepTimeout = get().cancelSleepTimeout;
          if (cancelSleepTimeout) {
            cancelSleepTimeout();
          }
          // stop the countdown if active
          const cancelSleepInterval = get().cancelSleepInterval;
          if (cancelSleepInterval) {
            cancelSleepInterval();
          }

          // Set the sleep chapter and reset the other sleep state vars
          set({
            sleepChapterIndex: chapterIndex,
            sleepCountdownActive: false,
            sleepIntervalActive: false,
            sleepStartDateTime: undefined,
            cancelSleepTimeout: undefined,
            cancelSleepInterval: undefined,
          });
        },
        startSleepTimer: () => {
          // If the cancelSleepTimeout is set then run it to clear
          // the old timeout
          const cancelSleepTimeout = get().cancelSleepTimeout;
          if (cancelSleepTimeout) {
            cancelSleepTimeout();
          }
          // stop the countdown if active
          const cancelSleepInterval = get().cancelSleepInterval;
          if (cancelSleepInterval) {
            cancelSleepInterval();
          }

          set({
            sleepCountdownActive: true,
            sleepStartDateTime: new Date(),
            cancelSleepTimeout: undefined,
          });
          const sleepTime = get().sleepTimeMinutes * 60 * 1000;
          console.log("SleepTime", sleepTime);
          const cancelSleepTimeoutId = setTimeout(() => {
            TrackPlayer.pause();
            set({
              sleepCountdownActive: false,
              sleepStartDateTime: undefined,
              cancelSleepTimeout: undefined,
            });

            console.log("Sleep Timer Done");
          }, sleepTime);
          // Set function to cancel timeout if needed
          set({ cancelSleepTimeout: () => clearTimeout(cancelSleepTimeoutId) });
        },
        stopSleepTimer: () => {
          // If the cancelSleepTimeout is set then run it to clear
          7; // the old timeout
          const cancelSleepTimeout = get().cancelSleepTimeout;
          if (cancelSleepTimeout) {
            cancelSleepTimeout();
          }
          // stop the countdown if active
          const cancelSleepInterval = get().cancelSleepInterval;
          if (cancelSleepInterval) {
            cancelSleepInterval();
          }
          // clear the sleep timer fields that indicate a sleep timer is active
          set({
            sleepCountdownActive: false,
            sleepStartDateTime: undefined,
            cancelSleepTimeout: undefined,
            sleepChapterIndex: undefined,
          });
        },
        runSleepCountdown: () => {
          //! Testing if we can just not do anything if this is called multiple times
          //! If the the interval is active and we are trying to start it, just return
          const sleepIntervalActive = get().sleepIntervalActive;
          if (sleepIntervalActive) return;

          // // Clear interval if it exists
          // const cancelSleepInterval = get().cancelSleepInterval;
          // if (cancelSleepInterval) {
          //   cancelSleepInterval();
          // }

          const sleepInterval = setInterval(() => {
            const { secondsBetween, minutesInt, secondsInt } = timeBetween(
              new Date(),
              get().sleepStartDateTime || new Date()
            );
            // We want to show the seconds left (i.e. countdown)
            const secondsLeft = get().sleepTimeMinutes * 60 - secondsBetween;
            const sleepCountDown = formatSeconds(
              secondsLeft,
              "minimal",
              get().sleepTimeMinutes > 59
            );
            set({
              sleepCountDown: {
                secondsLeft,
                formattedOutput: sleepCountDown,
              },
            });
          }, 1000);

          set({
            sleepIntervalActive: true,
            cancelSleepInterval: () => {
              clearInterval(sleepInterval);
              set({
                sleepIntervalActive: false,
                sleepCountDown: {
                  secondsLeft: undefined,
                  formattedOutput: undefined,
                },
                cancelSleepInterval: undefined,
              });
            },
          });
        },
      },
    })),
    {
      name: "settings-storage", // Storage key
      storage: createJSONStorage(() => mmkvStorage),
      // merge: (persisted, current) => {
      //   if (persisted.allBookshelves.find((el) => el.label === "Downloaded")) {
      //     return {
      //       ...current,
      //       ...persisted,
      //     };
      //   }

      //   return {
      //     ...current,
      //     ...persisted,

      //     allBookshelves: [
      //       ...defaultBookshelves,
      //       ...persisted.allBookshelves.filter((el) => el.type === "custom"),
      //     ],
      //   };
      // },
      // Only persist the state, not the actions
      partialize: (state) => ({
        seekForwardSeconds: state.seekForwardSeconds,
        seekBackwardSeconds: state.seekBackwardSeconds,
        syncIntervalSeconds: state.syncIntervalSeconds,
        homeScreenTimeVariant: state.homeScreenTimeVariant,
        allBookshelves: state.allBookshelves,
        bookshelvesToDisplay: state.bookshelvesToDisplay,
      }),
    }
  )
);

// Exported custom hooks following best practices
// Only export atomic selectors to prevent unnecessary re-renders
export const useSeekForwardSeconds = () => useSettingsStore((state) => state.seekForwardSeconds);

export const useSeekBackwardSeconds = () => useSettingsStore((state) => state.seekBackwardSeconds);

export const useSyncIntervalSeconds = () => useSettingsStore((state) => state.syncIntervalSeconds);

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
