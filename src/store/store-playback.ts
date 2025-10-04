import type { AudiobookshelfAPI } from "@/src/utils/AudiobookShelf/absAPIClass";
import { getAbsAPI, getAbsAuth } from "@/src/utils/AudiobookShelf/absInit";
import type { AudiobookSession } from "@/src/utils/AudiobookShelf/abstypes";
import AudiobookStreamer from "@/src/utils/rn-trackplayer/AudiobookStreamer";
import { trackPlayerInit } from "@/src/utils/rn-trackplayer/rn-trackplayerInit";
import TrackPlayer, { Event, State, Track } from "react-native-track-player";
import { create } from "zustand";
import { useBooksStore } from "./store-books";

// Extend Track to reflect extra fields we attach from ABS
export type ABSQueuedTrack = Track & {
  sessionId?: string;
  libraryItemId?: string;
  chapters?: any[];
};

// Module-scoped flags to avoid duplicate bindings during Fast Refresh
let eventsBound = false;
let playerInitialized = false;
const listeners: { remove: () => void }[] = [];

// ---- Store Types
type PlaybackAudioBookSession = AudiobookSession & {
  coverURL: string;
};
interface PlaybackState {
  session: PlaybackAudioBookSession | null;
  queue: ABSQueuedTrack[];
  isPlaying: boolean;
  isLoaded: boolean;
  position: number;
  duration: number;
  isOnBookScreen: boolean;
  playbackSpeed: number;
}

interface PlaybackActions {
  // Initialization
  init: (serverUrl: string, api: AudiobookshelfAPI) => Promise<void>;
  initFromABS: () => Promise<void>;
  bindEvents: () => void;

  // Controls
  loadBook: (itemId: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  updatePlaybackSpeed: (newSpeed: number) => Promise<void>;
  togglePlayPause: () => Promise<"playing" | "paused">;
  seekTo: (pos: number) => Promise<void>;
  closeSession: () => Promise<void>;
  destroy: () => Promise<void>;

  // UI helpers
  setIsOnBookScreen: (val: boolean) => void;

  // Sync helpers
  refreshFromPlayer: () => Promise<void>;
}

interface PlaybackStore extends PlaybackState {
  actions: PlaybackActions;
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  // ---- State
  session: null,
  queue: [],
  isPlaying: false,
  isLoaded: false,
  position: 0,
  duration: 0,
  isOnBookScreen: false,
  playbackSpeed: 1.0,

  // ---- Actions
  actions: {
    init: async (serverUrl: string, api: AudiobookshelfAPI) => {
      if (!playerInitialized) {
        await trackPlayerInit().catch(() => {});
        playerInitialized = true;
      }
      // Use singleton pattern
      AudiobookStreamer.getInstance(serverUrl, api);
    },

    initFromABS: async () => {
      if (!playerInitialized) {
        await trackPlayerInit().catch(() => {});
        playerInitialized = true;
      }

      // Safe auth access for Zustand store
      try {
        // const { getAbsAuth, getAbsAPI } = require("@/src/ABS/absInit");
        const absAuth = getAbsAuth();
        const absAPI = getAbsAPI();
        AudiobookStreamer.getInstance(absAuth.absURL, absAPI);
      } catch (error) {
        console.error("Failed to initialize from ABS - auth not available:", error);
        throw new Error("Authentication required for playback initialization");
      }
    },

    bindEvents: () => {
      if (eventsBound) return;
      eventsBound = true;

      // Mirror progress into store for UI, this is at 5 second intervals
      // set in setup track player.
      const l1 = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
        set({
          position: e.position,
          duration: typeof e.duration === "number" ? e.duration : get().duration,
        });
      });

      // Mirror playback state into store for UI
      const l2 = TrackPlayer.addEventListener(Event.PlaybackState, (e) => {
        set({ isPlaying: e.state === State.Playing });
      });

      listeners.push(l1 as any, l2 as any);
    },

    loadBook: async (itemId: string) => {
      const absAuth = getAbsAuth();
      const userId = absAuth.userId;
      console.log("USER", userId);
      // Ensure events are bound before loading (idempotent - safe to call multiple times)
      get().actions.bindEvents();
      // Store-level guard: if the same book is already loaded, do nothing
      const currentSession = get().session;

      if (currentSession?.libraryItemId === itemId) {
        // No-op: preserve current playback state (playing or paused)
        console.log(`PlaybackStore: Book ${itemId} already loaded. Skipping reload.`);
        return;
      }
      set({ isLoaded: false });
      let streamer: AudiobookStreamer;
      try {
        streamer = AudiobookStreamer.getInstance();
      } catch {
        // Best-effort initialization using ABS singletons
        await get().actions.initFromABS();
        streamer = AudiobookStreamer.getInstance();
      }

      if (!streamer.isReady()) {
        throw new Error("Playback not initialized. Call actions.init/initFromABS first.");
      }
      const { tracks, sessionData } = await streamer.setupAudioPlayback(itemId);
      // set({ position: sessionData.startTime });
      // setTimeout(() => {}, 0);

      const playbackSessionData: PlaybackAudioBookSession = {
        ...sessionData,
      };

      //~ Look into books store to find out if we have this book saved
      const bookActions = useBooksStore.getState().actions;
      const savedBook = bookActions.getSavedBook({
        userId,
        libraryItemId: sessionData.libraryItemId,
        title: sessionData.displayTitle,
      });
      console.log("playback-savedbook", savedBook);
      const savedPlaybackSpeed = savedBook?.playbackSpeed || 1;
      //~
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);

      // If no previous start time default to zero
      const startTime = sessionData.startTime || 0;
      await TrackPlayer.seekTo(startTime);
      await TrackPlayer.setRate(savedPlaybackSpeed);
      set({ position: startTime });

      set({
        session: playbackSessionData,
        queue: tracks,
        duration: sessionData.duration ?? get().duration,
        isLoaded: true,
      });

      console.log(
        "BOOK LOADED START TIME",
        get().position,
        get().session?.displayTitle,
        get().session?.startTime
      );
    },

    play: async () => {
      await TrackPlayer.play();
      set({ isPlaying: true });
    },

    pause: async () => {
      await TrackPlayer.pause();
      set({ isPlaying: false });
      // AudiobookStreamer handles immediate sync on pause via its own event listener
    },

    updatePlaybackSpeed: async (newSpeed) => {
      const bookActions = useBooksStore.getState().actions;
      await TrackPlayer.setRate(newSpeed);
      const libraryItemId = get().session?.libraryItemId;
      if (!libraryItemId) return;
      bookActions.updatePlaybackSpeed(libraryItemId, newSpeed);
    },

    togglePlayPause: async () => {
      const state = await TrackPlayer.getPlaybackState();

      if (state.state === State.Playing) {
        await get().actions.pause();
        return "paused";
      } else {
        await get().actions.play();
        return "playing";
      }
    },

    seekTo: async (pos: number) => {
      await TrackPlayer.seekTo(pos);
      set({ position: pos });

      // Immediately sync the new position to the server
      try {
        const streamer = AudiobookStreamer.getInstance();
        // Only sync if we have an active session
        const currentSession = streamer.getSession();
        if (currentSession) {
          await streamer.syncPosition();
        } else {
          console.log("Skipping position sync - no active session");
        }
      } catch (error) {
        // Log but don't throw on sync errors to avoid disrupting playback
        console.warn("Could not sync position after seek:", error);
      }
    },

    closeSession: async () => {
      try {
        const streamer = AudiobookStreamer.getInstance();
        await streamer.closeSession();
      } catch {
        // Instance doesn't exist, nothing to close
      }

      // Stop TrackPlayer and clear the queue to actually stop playback
      await TrackPlayer.stop();
      await TrackPlayer.reset();

      // Reset the store state
      set({
        session: null,
        queue: [],
        isPlaying: false,
        position: 0,
        duration: 0,
        isLoaded: false,
      });
    },

    /**
     * Completely destroys the AudiobookStreamer singleton and resets all state
     * Use this when logging out or switching servers
     */
    destroy: async () => {
      await get().actions.closeSession();
      AudiobookStreamer.destroyInstance();

      // Clean up TrackPlayer
      await TrackPlayer.reset();

      // Remove our event listeners
      listeners.forEach((listener) => listener.remove());
      listeners.length = 0;
      eventsBound = false;
      playerInitialized = false;

      console.log("Playback store: Complete cleanup finished");
    },

    setIsOnBookScreen: (val: boolean) => set({ isOnBookScreen: val }),

    refreshFromPlayer: async () => {
      const [progress, state] = await Promise.all([
        TrackPlayer.getProgress(),
        TrackPlayer.getPlaybackState(),
      ]);
      set({
        position: progress.position,
        duration: typeof progress.duration === "number" ? progress.duration : get().duration,
        isPlaying: state.state === State.Playing,
        isLoaded: true,
      });
    },
  },
}));

// ---- Selectors (atomic)
export const usePlaybackSession = () => usePlaybackStore((s) => s.session);
export const usePlaybackIsPlaying = () => usePlaybackStore((s) => s.isPlaying);
export const usePlaybackDuration = () => usePlaybackStore((s) => s.duration);
export const usePlaybackQueue = () => usePlaybackStore((s) => s.queue);
export const useIsOnBookScreen = () => usePlaybackStore((s) => s.isOnBookScreen);
export const usePlaybackActions = () => usePlaybackStore((s) => s.actions);

export const usePlaybackPosition = () =>
  usePlaybackStore((s) => {
    if (s.isLoaded) return s.position;
    return undefined;
  });

// Derived helpers as hooks
export const useHasActiveSession = () => usePlaybackStore((s) => Boolean(s.session));
export const useShowMiniPlayer = () =>
  usePlaybackStore((s) => Boolean(s.session) && !s.isOnBookScreen);
