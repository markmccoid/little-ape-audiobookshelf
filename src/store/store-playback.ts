import { create } from "zustand";
import TrackPlayer, { Event, State, Track } from "react-native-track-player";
import AudiobookStreamer from "@/src/rn-trackplayer/AudiobookStreamer";
import { trackPlayerInit } from "@/src/rn-trackplayer/rn-trackplayerInit";
import type { AudiobookshelfAPI } from "@/src/ABS/absAPIClass";
import type { AudiobookSession } from "@/src/ABS/abstypes";
import { getAbsAuth, useAbsAPI } from "@/src/ABS/absInit";

// Extend Track to reflect extra fields we attach from ABS
export type ABSQueuedTrack = Track & {
  sessionId?: string;
  libraryItemId?: string;
  chapters?: any[];
};

// Module-scoped singletons/flags to avoid duplicate bindings during Fast Refresh
let streamer: AudiobookStreamer | null = null;
let eventsBound = false;
let playerInitialized = false;
const listeners: { remove: () => void }[] = [];

// ---- Store Types
interface PlaybackState {
  session: AudiobookSession | null;
  queue: ABSQueuedTrack[];
  isPlaying: boolean;
  position: number;
  duration: number;
  isOnBookScreen: boolean;
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
  seekTo: (pos: number) => Promise<void>;
  closeSession: () => Promise<void>;

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
  position: 0,
  duration: 0,
  isOnBookScreen: false,

  // ---- Actions
  actions: {
    init: async (serverUrl: string, api: AudiobookshelfAPI) => {
      if (!playerInitialized) {
        await trackPlayerInit().catch(() => {});
        playerInitialized = true;
      }
      if (!streamer) {
        streamer = new AudiobookStreamer(serverUrl, api);
      }
    },

    initFromABS: async () => {
      if (!playerInitialized) {
        await trackPlayerInit().catch(() => {});
        playerInitialized = true;
      }
      if (!streamer) {
        const absAuth = getAbsAuth();
        const absAPI = useAbsAPI();
        streamer = new AudiobookStreamer(absAuth.absURL, absAPI);
      }
    },

    bindEvents: () => {
      if (eventsBound) return;
      eventsBound = true;

      // Mirror progress into store for UI
      const l1 = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
        set({ position: e.position, duration: typeof e.duration === "number" ? e.duration : get().duration });
      });

      // Mirror playback state into store for UI
      const l2 = TrackPlayer.addEventListener(Event.PlaybackState, (e) => {
        set({ isPlaying: e.state === State.Playing });
      });

      listeners.push(l1 as any, l2 as any);
    },

    loadBook: async (itemId: string) => {
      if (!streamer) {
        // Best-effort initialization using ABS singletons
        await get().actions.initFromABS();
      }
      if (!streamer) throw new Error("Playback not initialized. Call actions.init/initFromABS first.");

      const { tracks, sessionData } = await streamer.setupAudioPlayback(itemId);

      await TrackPlayer.reset();
      await TrackPlayer.add(tracks as unknown as Track[]);

      if (sessionData.startTime && sessionData.startTime > 0) {
        await TrackPlayer.seekTo(sessionData.startTime);
        set({ position: sessionData.startTime });
      }

      set({ session: sessionData, queue: tracks as ABSQueuedTrack[], duration: sessionData.duration ?? get().duration });
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

    seekTo: async (pos: number) => {
      await TrackPlayer.seekTo(pos);
      set({ position: pos });
    },

    closeSession: async () => {
      await streamer?.closeSession();
      set({ session: null, queue: [], isPlaying: false, position: 0, duration: 0 });
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
      });
    },
  },
}));

// ---- Selectors (atomic)
export const usePlaybackSession = () => usePlaybackStore((s) => s.session);
export const usePlaybackIsPlaying = () => usePlaybackStore((s) => s.isPlaying);
export const usePlaybackPosition = () => usePlaybackStore((s) => s.position);
export const usePlaybackDuration = () => usePlaybackStore((s) => s.duration);
export const usePlaybackQueue = () => usePlaybackStore((s) => s.queue);
export const useIsOnBookScreen = () => usePlaybackStore((s) => s.isOnBookScreen);
export const usePlaybackActions = () => usePlaybackStore((s) => s.actions);

// Derived helpers as hooks
export const useHasActiveSession = () => usePlaybackStore((s) => Boolean(s.session));
export const useShowMiniPlayer = () => usePlaybackStore((s) => Boolean(s.session) && !s.isOnBookScreen);
