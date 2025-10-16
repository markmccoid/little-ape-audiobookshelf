import type { AudiobookshelfAPI } from "@/src/utils/AudiobookShelf/absAPIClass";
import { getAbsAPI, getAbsAuth } from "@/src/utils/AudiobookShelf/absInit";
import type { AudiobookSession } from "@/src/utils/AudiobookShelf/abstypes";
import AudiobookStreamer from "@/src/utils/rn-trackplayer/AudiobookStreamer";
import { trackPlayerInit } from "@/src/utils/rn-trackplayer/rn-trackplayerInit";
import TrackPlayer, { Event, State, Track } from "react-native-track-player";
import { create } from "zustand";
import { getCurrentChapter, waitForReadyState } from "../utils/rn-trackplayer/trackPlayerUtils";
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

// Throttling for books store updates
let lastBookStoreUpdate = 0;
const BOOK_STORE_UPDATE_INTERVAL = 10000; // 10 seconds

// ---- Store Types
type PlaybackAudioBookSession = AudiobookSession & {
  coverURL: string;
};
interface PlaybackState {
  session: PlaybackAudioBookSession | null;
  queue: ABSQueuedTrack[];
  isPlaying: boolean;
  //! Only will be true once book has been loaded and playing has started
  //! isBookActive function returns as SOON as book session has been loaded
  //! However, it takes Track Player about 1 second to finish init as start playing.
  isLoaded: boolean;
  playbackState: State;
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
  loadBookAndPlay: (itemId: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  getPrevTrackDuration: () => Promise<number>;
  updatePlaybackSpeed: (newSpeed: number) => Promise<void>;
  togglePlayPause: () => Promise<"playing" | "paused">;
  seekTo: (pos: number) => Promise<void>;
  jumpForwardSeconds: (forwardSeconds: number) => Promise<void>;
  jumpBackwardSeconds: (backwardSeconds: number) => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
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
  playbackState: State.None,
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
      // Use singleton pattern with default sync interval
      const syncInterval = 5; // Default value, could be parameterized
      AudiobookStreamer.getInstance(serverUrl, api, syncInterval);
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
        const syncInterval = 5; // Default value, could use settings hook here
        AudiobookStreamer.getInstance(absAuth.absURL, absAPI, syncInterval);
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
        const position = e.position;

        const duration = typeof e.duration === "number" ? e.duration : get().duration;

        set({ position, duration });

        // ❌ REMOVED: Redundant sync to books store
        // AudiobookStreamer now handles syncing to server (every 5s)
        // and updates books store FROM server response (server is source of truth)
        // This eliminates duplicate syncs and ensures server is always the authority
      });

      // Mirror playback state into store for UI
      const l2 = TrackPlayer.addEventListener(Event.PlaybackState, (e) => {
        set({ isPlaying: e.state === State.Playing, playbackState: e.state });
      });

      listeners.push(l1 as any, l2 as any);
    },

    loadBook: async (itemId: string) => {
      const absAuth = getAbsAuth();
      const userId = absAuth.userId;
      //!! Potential ERROR catch
      if (!userId) return;

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
      const savedBook = await bookActions.getOrFetchBook({
        userId: userId,
        libraryItemId: sessionData.libraryItemId,
      });
      const savedPlaybackSpeed = savedBook?.playbackSpeed || 1;
      //~
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);

      // If no previous start time default to zero
      const startTime = sessionData.startTime || 0;
      //!! ---------------------------------------
      const chapterInfo = getCurrentChapter({
        chapters: sessionData.chapters,
        position: startTime,
      });
      console.log("Chapter Info", chapterInfo);
      //!!
      await TrackPlayer.seekTo(startTime);
      await TrackPlayer.setRate(savedPlaybackSpeed);

      set({ position: startTime });

      set({
        session: playbackSessionData,
        queue: tracks,
        duration: sessionData.duration ?? get().duration,
        isOnBookScreen: false,
      });
      // wait for book to be fully loaded
      await waitForReadyState();
      set({ isLoaded: true });

      // move this book to the front of the list (Continue Listening)
      // moveBookToTopOfInProgress(sessionData?.libraryItemId);
      console.log(
        "BOOK LOADED START TIME",
        get().position,
        get().session?.displayTitle,
        get().session?.startTime
      );
    },

    /**
     * Loads a book and starts playback, deferring isLoaded state until playback actually starts.
     * This provides better UX by showing loading state until audio is truly ready.
     *
     * @param itemId - The library item ID to load and play
     */
    loadBookAndPlay: async (itemId: string) => {
      //!! There may be a better way to name the isLoaded and isPlaying
      //!! Need to determine what we are using them for.  DO we really need isPlaying
      //!! or is this gotten through TrackPlayer.
      //!! isLoaded tells us that the book is loaded AND has started playing, but is this accurate
      //!!  I'm using this so that as a book loads the Resume icon stays until playing starts so we don't see the play icon first.
      await get().actions.loadBook(itemId);

      // Start playback
      await TrackPlayer.play();

      // Wait for playback to actually start before setting isLoaded
      // This creates a Promise that resolves when playback state becomes Playing
      // return new Promise<void>((resolve) => {
      //   // Set a timeout as fallback (in case event doesn't fire)
      //   const timeout = setTimeout(() => {
      //     console.log("Playback state timeout - setting isLoaded anyway");
      //     set({ isLoaded: true });
      //     listener?.remove();
      //     resolve();
      //   }, 3000); // 3 second timeout

      //   // Listen for playback state change
      //   const listener = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      //     if (event.state === State.Playing) {
      //       console.log("Playback started - setting isLoaded: true");
      //       set({ isLoaded: true });
      //       clearTimeout(timeout);
      //       listener.remove();
      //       resolve();
      //     }
      //   });
      // });
    },

    play: async () => {
      await TrackPlayer.play();
      // isPlaying flag set in BindEvents listeners
    },

    pause: async () => {
      await TrackPlayer.pause();
      // isPlaying flag set in BindEvents listeners
      // AudiobookStreamer handles immediate sync on pause via its own event listener
    },

    getPrevTrackDuration: async () => {
      // used is calculating progress across all tracks in playlist
      // If we are on the zero(th) track, the 0 will be returned.
      const queue = await TrackPlayer.getQueue();
      const activeTrackIndex = (await TrackPlayer.getActiveTrackIndex()) || 0;
      let final = 0;
      let index = 0;

      for (let el of queue) {
        if (index >= activeTrackIndex) {
          break;
        }
        // console.log("getPrev", index, get().currentTrackIndex, final, el.duration);
        final += el.duration || 0;
        index++;
      }

      return final;
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

    jumpForwardSeconds: async (forwardSeconds: number) => {
      const { position: currPos, duration: currDuration } = await TrackPlayer.getProgress();
      // const currDuration = await TrackPlayer.getDuration();
      const trackIndex = await TrackPlayer.getActiveTrackIndex();
      const qLength = get().queue.length;
      const newPos = currPos + forwardSeconds;
      console.log("[jumpForward]", trackIndex, qLength);
      // console.log("[jumpForward]", currPos, forwardSeconds, currDuration, newPos);
      if (newPos > currDuration) {
        // go to next track.   calculate how much "seekTo" is in
        // currtrack and how much in next track.
        // currPos = 25 currDuration = 30, seekTo = 10
        // We go to next track and start 5 seconds in next track
        await get().actions.next();

        if (trackIndex !== qLength - 1) {
          await TrackPlayer.seekTo(forwardSeconds - (currDuration - currPos));
        }
      } else {
        await TrackPlayer.seekTo(newPos);
      }
    },

    jumpBackwardSeconds: async (backwardSeconds: number) => {
      const { position: currPos, duration: currDuration } = await TrackPlayer.getProgress();
      const newPos = currPos - backwardSeconds;
      if (newPos < 0) {
        // go to prev track.  You could get crazy and calculate how much "seekBack" is in
        // currtrack and how much in prev track.
        // currPos = 25 currDuration = 30, seekTo = 10
        // We go to prev track and start 5 seconds in prev track
        //!  IMPLEMENTED Below

        const trackIndex = await TrackPlayer.getActiveTrackIndex();
        await get().actions.prev();

        console.log("TrackIndex", trackIndex, currDuration, currPos, newPos);
        if (trackIndex !== 0) {
          const { duration } = await TrackPlayer.getActiveTrack();
          const { duration: progDur } = await TrackPlayer.getProgress();
          console.log("TrackIndex>0", trackIndex, progDur, duration, currPos, newPos);
          await TrackPlayer.seekTo(duration + newPos);
        }
      } else {
        await TrackPlayer.seekTo(newPos);
      }
    },

    next: async () => {
      const trackIndex = await TrackPlayer.getActiveTrackIndex();
      const queue = await TrackPlayer.getQueue();
      // const { currentTrack, currentChapterIndex } = get();
      //! NO CHAPTERS YET Need to determine if we are moving to the next track or the next chapter
      //! the Queue has tracks in it and each track may or may NOT have chapters.
      // let moveToAction = "track";
      // let nextChapter = {} as Chapter;

      // if (currentTrack?.chapters?.length > 0) {
      //   if (currentTrack?.chapters?.length - 1 !== currentChapterIndex) {
      //     moveToAction = "chapter";
      //     nextChapter = currentTrack.chapters[currentChapterIndex + 1];
      //   }
      // }
      // // console.log("NEXT Chapt", nextChapter);
      // // console.log("movetoaction", moveToAction, currentTrack?.chapters?.length, currentChapterIndex);
      // if (moveToAction === "chapter") {
      //   await TrackPlayer.seekTo(nextChapter.startSeconds);
      //   return;
      // }
      // Check if we are on the last track of the queue
      // If so, go to first track and pause
      //!! If only one track we should give option to go to next or at least don't do anything.
      if (queue.length - 1 === trackIndex) {
        await TrackPlayer.skip(0);
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.skipToNext();
      }
      // console.log("chapt", chapt, chaptIndex, currTrack?.chapters);
    },
    prev: async () => {
      const trackIndex = await TrackPlayer.getActiveTrackIndex();
      const queue = await TrackPlayer.getQueue();
      // const { currentTrack, currentChapterIndex } = get();
      //!! NO CHAPTERS YET Need to determine if we are moving to the next track or the next chapter
      // the Queue has tracks in it and each track may or may NOT have chapters.
      let moveToAction = "track";
      // let prevChapter = {} as Chapter;

      // if (currentTrack?.chapters?.length > 0) {
      //   if (currentChapterIndex !== 0) {
      //     moveToAction = "chapter";
      //     prevChapter = currentTrack.chapters[currentChapterIndex - 1];
      //   }
      // }
      // console.log("PREV Chapt", prevChapter);

      // if (moveToAction === "chapter") {
      //   await TrackPlayer.seekTo(prevChapter.startSeconds);
      //   return;
      // }

      if (trackIndex === 0) {
        await TrackPlayer.seekTo(0);
      } else {
        await TrackPlayer.skipToPrevious();
      }
    },

    closeSession: async () => {
      try {
        // ❌ REMOVED: Redundant final position sync
        // AudiobookStreamer.closeSession() handles final sync to server
        // and books store will be updated from server response

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
export const usePlaybackIsPlaying = (libraryItemId: string) =>
  usePlaybackStore((s) => {
    if (s.session?.libraryItemId === libraryItemId) {
      return s.isPlaying;
    }
    return false;
  });
export const usePlaybackDuration = (libraryItemId: string) =>
  usePlaybackStore((s) => {
    if (s.session?.libraryItemId === libraryItemId) {
      return s.duration;
    }
    return false;
  });
export const usePlaybackQueue = () => usePlaybackStore((s) => s.queue);
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

// Library Item ID-Aware Hooks
/**
 * Hook to check if a specific book is the currently active book in playback
 * @param libraryItemId - The ID of the book to check
 * @returns Boolean indicating if this book is the current active session
 */
export const useIsBookActive = (libraryItemId: string) =>
  usePlaybackStore((state) => state.session?.libraryItemId === libraryItemId);
