import { getAbsAPI, getAbsAuth } from "@/src/utils/AudiobookShelf/absInit";
import { Chapter, NetworkError } from "@/src/utils/AudiobookShelf/abstypes";
import { checkIsOnline } from "@/src/utils/networkHelper";
import AudiobookStreamer, { SessionData } from "@/src/utils/rn-trackplayer/AudiobookStreamer";
import { trackPlayerInit } from "@/src/utils/rn-trackplayer/rn-trackplayerInit";
import { Alert } from "react-native";
import TrackPlayer, { Event, State, Track } from "react-native-track-player";
import { create } from "zustand";
import {
  getCurrentChapter,
  getTrackPlayerTracksDL,
  waitForReadyState,
} from "../utils/rn-trackplayer/trackPlayerUtils";
import { useBooksStore } from "./store-books";
import { useSettingsStore } from "./store-settings";

// Extend Track to reflect extra fields we attach from ABS
export type ABSQueuedTrack = Track & {
  id: string; // session id + track number (1 based)
  trackOffset: number; // how many seconds in previous tracks
  trackIndex: number; // zero based index
  sessionId?: string;
  libraryItemId?: string;
};

// Module-scoped flags to avoid duplicate bindings during Fast Refresh
let eventsBound = false;
let playerInitialized = false;
const listeners: { remove: () => void }[] = [];

// ---- Store Types
type PlaybackAudioBookSession = SessionData & {
  coverURL: string;
};
interface PlaybackState {
  session: PlaybackAudioBookSession | null;
  queue: ABSQueuedTrack[];
  isPlaying: boolean;
  seeking: boolean;
  currentChapterIndex: number | undefined;
  sleepChapterIndex: number | undefined;
  optimisticPosition: number | null;
  //! Only will be true once book has been loaded and playing has started
  //! isBookActive function returns as SOON as book session has been loaded
  //! However, it takes Track Player about 1 second to finish init as start playing.
  isLoaded: boolean;
  playbackState: State;
  position: number;
  duration: number;
  isOnBookScreen: boolean;
  playbackRate: number;
}

interface PlaybackActions {
  // Initialization
  // init: (serverUrl: string, api: AudiobookshelfAPI) => Promise<void>;
  initFromABS: () => Promise<void>;
  bindEvents: () => void;

  // Info
  updateCurrentChapterIndex: (currentChapterIndex: number | undefined) => void;
  updateSleepChapterIndex: (sleepChapterIndex: number | undefined) => void;
  // Controls
  loadBook: (itemId: string) => Promise<void>;
  loadBookAndPlay: (itemId: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  getPrevTrackDuration: () => Promise<number>;
  updateActivePlaybackRate: (newRate: number) => Promise<void>;
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

// Used for debouncing jump actions
let jumpTimer: NodeJS.Timeout | null = null;
// Used for debouncing seek actions (clearing optimistic position)
let seekTimer: NodeJS.Timeout | null = null;

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  // ---- State
  session: null,
  queue: [],
  isPlaying: false,
  isLoaded: false,
  currentChapterIndex: undefined,
  sleepChapterIndex: undefined,
  seeking: false, // Keeping for backward compatibility or other checks if needed, but optimisticPosition is primary
  optimisticPosition: null,
  playbackState: State.None,
  position: 0,
  duration: 0,
  isOnBookScreen: false,
  playbackRate: 1.0,

  // ---- Actions
  actions: {
    // init: async (serverUrl: string, api: AudiobookshelfAPI) => {
    //   if (!playerInitialized) {
    //     await trackPlayerInit().catch(() => {});
    //     playerInitialized = true;
    //   }
    //   // Use singleton pattern with default sync interval
    //   const syncInterval = 5; // Default value, could be parameterized
    //   AudiobookStreamer.getInstance(serverUrl, api, syncInterval);
    // },

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
        const syncInterval = 60 * 5; // Default value, could use settings hook here
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
        const trackIndex = e.track;
        // const duration = typeof e.duration === "number" ? e.duration : get().duration;

        const libraryItemId = get()?.session?.libraryItemId;
        if (libraryItemId) {
          const currentTrack = get().queue[trackIndex];
          const globalPosition = position + (currentTrack?.trackOffset || 0);
          useBooksStore.getState().actions.updateCurrentPosition(libraryItemId, globalPosition);
          set({ position: globalPosition, duration: e.duration });
        }
        // ❌ REMOVED: Redundant sync to books store
        // AudiobookStreamer now handles syncing to server (every 5s)
        // and updates books store FROM server response (server is source of truth)
        // This eliminates duplicate syncs and ensures server is always the authority
      });

      // Mirror playback state into store for UI
      const l2 = TrackPlayer.addEventListener(Event.PlaybackState, (e) => {
        set({ isPlaying: e.state === State.Playing, playbackState: e.state });
        // This is just a safety if for some reason
        if (e.state === State.Playing) {
          set({ isLoaded: true });
        }
      });

      listeners.push(l1 as any, l2 as any);
    },

    updateCurrentChapterIndex: (currentChapterIndex) => {
      set({ currentChapterIndex });
      const sleepChapterIndex = get().sleepChapterIndex;

      if (sleepChapterIndex === undefined || !currentChapterIndex) return;
      if (sleepChapterIndex < currentChapterIndex) {
        get().actions.pause();
        // Clear sleepChapterIndex
        set({ sleepChapterIndex: undefined });
        useSettingsStore.getState().actions.updateSleepChapter(undefined);
        // Reset whatever we need to in settings so that app knows that sleep timer is off
      }
    },
    updateSleepChapterIndex: (sleepChapterIndex) => {
      set({ sleepChapterIndex });
      // Set whatever we need to in settings so that app knows that sleep timer is either ON or OFF
      // useSettingsStore.getState().actions.updateSleepChapter(sleepChapterIndex)
    },

    loadBook: async (itemId: string) => {
      // const userId = getAbsAuth()?.userId;
      // //!! Potential ERROR catch
      // if (!userId) return;
      const absAuth = getAbsAuth();
      // Ensure events are bound before loading (idempotent - safe to call multiple times)
      get().actions.bindEvents();
      // Store-level guard: if the same book is already loaded, do nothing
      const currentSession = get().session;

      if (currentSession?.libraryItemId === itemId) {
        // No-op: preserve current playback state (playing or paused)
        // console.log(`PlaybackStore: Book ${itemId} already loaded. Skipping reload.`);
        return;
      }

      // Check if book is downloaded (future feature)
      const bookActions = useBooksStore.getState().actions;
      const book = useBooksStore.getState().books.find((book) => book.libraryItemId === itemId);
      const bookInfo = useBooksStore.getState().bookInfo[itemId];
      const bookDownloadInfo = useBooksStore.getState().downloadedBookData[itemId];

      set({ isLoaded: false });
      let tracks;
      let sessionData: SessionData | undefined = undefined;
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

      // TODO: Load from local path when download feature is implemented
      console.log("BOOK IS DOWNLOADED", book?.isDownloaded);
      if (book?.isDownloaded === true) {
        const dlTracks = bookDownloadInfo?.audioTracks;

        console.log("Loading downloaded book:", itemId);
        const regularChapters: Chapter[] =
          book?.chapters?.map((chapter) => {
            return {
              id: chapter.id,
              title: chapter.title,
              start: chapter.startSeconds,
              end: chapter.endSeconds,
            };
          }) || [];
        sessionData = {
          libraryItemId: itemId,
          startTime: bookInfo.positionInfo.currentPosition,
          displayTitle: book.title || "",
          chapters: regularChapters,
          coverURL: book.coverURI || "",
          duration: book.duration || 0,
          absServerURL: absAuth.absURL,
        };
        tracks = getTrackPlayerTracksDL(
          itemId,
          bookInfo.positionInfo.currentPosition,
          { title: book.title || "", author: book.author || "" },
          dlTracks,
          regularChapters
        );

        // return await loadDownloadedBook(itemId);
        // Register local playback with AudiobookStreamer (for sync)
        let currentOffset = 0;
        const mappedAudioTracks =
          bookDownloadInfo?.audioTracks?.map((t, index) => {
            const trackOffset = typeof t.startOffset === "number" ? t.startOffset : currentOffset;
            const duration = t.duration || 0;
            // Update offset for next track if we are calculating manually
            if (typeof t.startOffset !== "number") {
              currentOffset += duration;
            }

            return {
              index: index + 1,
              startOffset: trackOffset,
              duration: duration,
              title: t.cleanFileName,
              contentUrl: t.filename,
              mimeType: "audio/mpeg",
              codec: null,
              metadata: null,
            };
          }) || [];

        // Construct a partial session object sufficient for SessionManager
        const localSession: any = {
          id: null, // Explicitly null to indicate local session
          libraryItemId: itemId,
          audioTracks: mappedAudioTracks,
          startTime: bookInfo.positionInfo.currentPosition,
          chapters: regularChapters,
        };

        // Initialize local playback session
        await streamer.setupLocalPlayback(localSession);
      } else {
        //# PHASE - STREAMING:
        // Check network connectivity before attempting to stream
        const isOnline = await checkIsOnline();
        if (!isOnline) {
          Alert.alert(
            "Offline",
            "You're offline. This book requires an internet connection.\n\nDownload feature coming soon!",
            [{ text: "OK" }]
          );
          throw new Error("Cannot load book while offline - not downloaded");
        }

        // Wrap setupAudioPlayback in try-catch for better error handling

        try {
          const result = await streamer.setupAudioPlayback(itemId);
          tracks = result.tracks;
          sessionData = result.sessionData;
        } catch (error) {
          console.error("Error loading book:", error);

          // Check if this is a network-related error
          const isNetworkRelated =
            error instanceof NetworkError ||
            (error instanceof Error &&
              (error.message.toLowerCase().includes("network") ||
                error.message.toLowerCase().includes("internet") ||
                error.message.toLowerCase().includes("connection") ||
                error.message.toLowerCase().includes("offline") ||
                error.message.toLowerCase().includes("playback session")));

          if (isNetworkRelated) {
            // Use the actual error message if it's user-friendly, otherwise use a generic one
            const errorMessage =
              error instanceof Error && error.message.includes("playback session")
                ? error.message
                : "Unable to load book. Please check your internet connection and try again.";

            Alert.alert("Connection Error", errorMessage, [{ text: "OK" }]);
          } else {
            // Handle other unexpected errors
            Alert.alert(
              "Error Loading Book",
              "An unexpected error occurred while loading the book. Please try again.",
              [{ text: "OK" }]
            );
          }
          throw error;
        }
      }

      // Guard: sessionData should always be set by either the download or streaming branch
      if (!sessionData) {
        throw new Error("Failed to load book: no session data available");
      }

      const playbackSessionData: PlaybackAudioBookSession = {
        ...sessionData,
      };

      //~'
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);

      //!!
      //~ Look into books store to find out if we have this book saved
      const savedBook = await bookActions.getOrFetchBook({
        libraryItemId: sessionData.libraryItemId,
      });

      const savedPlaybackRate = savedBook?.playbackRate || 1;
      //!!

      // Re-read bookInfo AFTER getOrFetchBook() to get the updated position
      // (fixes stale closure bug where bookInfo captured at line 216 misses updates)
      const updatedBookInfo = useBooksStore.getState().bookInfo[sessionData.libraryItemId];

      // Priority: local position > session position > fallback to 0
      const startTime =
        updatedBookInfo?.positionInfo?.currentPosition || sessionData.startTime || 0;
      //!! ---------------------------------------
      const chapterInfo = getCurrentChapter({
        chapters: sessionData.chapters,
        position: startTime,
      });
      // console.log("Chapter Info", chapterInfo);
      //!! When seeking to the initial startTime in
      //!! a book with chapters, we need to do our seetTo function
      await get().actions.seekTo(startTime);
      await TrackPlayer.setRate(savedPlaybackRate);

      set({ position: startTime });
      //!! Not sure what this did so commented out 12/10/2025
      // bookActions.getBook(sessionData.libraryItemId);

      set({
        session: playbackSessionData,
        queue: tracks,
        duration: sessionData.duration ?? get().duration,
        isOnBookScreen: false,
        playbackRate: savedPlaybackRate,
      });
      console.log("Book loaded");
      // wait for book to be fully loaded
      await waitForReadyState();
      // Initial sync  so that we can invalidate queries and update continue listening queue.
      // await streamer.syncPosition(startTime);
      set({ isLoaded: true });
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
    updateActivePlaybackRate: async (newRate) => {
      await TrackPlayer.setRate(newRate);
      //!! Not sure if this is ever going to be needed.
      set({ playbackRate: newRate });
    },

    togglePlayPause: async () => {
      const state = await TrackPlayer.getPlaybackState();
      // const x = await TrackPlayer.getProgress();
      // const y = await TrackPlayer.getQueue();
      // console.log("togglePlayPause", state, x, y);

      if (state.state === State.Playing) {
        await get().actions.pause();
        return "paused";
      } else {
        await get().actions.play();
        return "playing";
      }
    },

    seekTo: async (pos: number) => {
      set({ seeking: true });
      const activeTrack = (await TrackPlayer.getActiveTrack()) as ABSQueuedTrack;
      const queue = (await TrackPlayer.getQueue()) as ABSQueuedTrack[];
      // const pbstate = await TrackPlayer.getPlaybackState();

      //-- Find the next track based on the pos (position) passed in

      let newTrackOffset = { offset: 0, nextTrack: 0 };
      queue.forEach((el) => {
        if (el.trackOffset < pos) {
          newTrackOffset = { offset: el.trackOffset, nextTrack: el.trackIndex };
        }
      });

      // console.log("NEW TRACK", newTrackOffset, activeTrack?.trackIndex);
      // const newTrackPos = pos - (activeTrack?.duration || 0) + activeTrack?.trackOffset;
      // console.log("post / newPos", pos, pos - newTrackOffset.offset);
      // If the next track is the same as our current don't waste time skipping
      if (activeTrack.trackIndex !== newTrackOffset.nextTrack) {
        await TrackPlayer.skip(newTrackOffset.nextTrack);
      }
      // global pos - the skip to tracks offset
      // 6000 - track 3 where sum of duration of 1 & 2 = 5800
      // This means we are 200 seconds into track 3
      set({ position: pos, optimisticPosition: pos });
      await TrackPlayer.seekTo(pos - newTrackOffset.offset);

      // Delay unsetting seeking to allow TrackPlayer state to settle
      // This prevents UI flickers/resets when skipping tracks
      if (seekTimer) clearTimeout(seekTimer);

      // Capture the position THIS seek was targeting
      const thisSeekPos = pos;

      seekTimer = setTimeout(() => {
        // STALE CHECK AT CLEANUP TIME:
        // If the user has jumped *again* since we scheduled this timer,
        // optimisticPosition will have advanced (e.g., from 60 to 120).
        // We must NOT wipe out the new optimistic position.
        if (get().optimisticPosition !== thisSeekPos) {
          // console.log(
          //   "Stale cleanup detected, aborting",
          //   thisSeekPos,
          //   "current:",
          //   get().optimisticPosition
          // );
          seekTimer = null;
          return;
        }

        set({ seeking: false, optimisticPosition: null });
        seekTimer = null;
      }, 1000) as unknown as NodeJS.Timeout;

      // Immediately sync the new position to the server
      try {
        const streamer = AudiobookStreamer.getInstance();
        // Only sync if we have an active session
        const currentSession = streamer.getSession();
        if (currentSession) {
          //!! This is the culprit.  it is supposed to save our position on sync,
          //!! may need a syncGlobalPosition function in AudioBookStreamer that accepts a position
          //!! That way this won't reset it.
          console.log("Syncing position", pos);
          await streamer.syncPosition(pos);
        } else {
          console.log("Skipping position sync - no active session");
        }
      } catch (error) {
        // Log but don't throw on sync errors to avoid disrupting playback
        console.warn("Could not sync position after seek:", error);
      }
    },

    jumpForwardSeconds: async (forwardSeconds: number) => {
      // 1. Clear existing timers immediately (Standard Debounce)
      if (jumpTimer) clearTimeout(jumpTimer);
      if (seekTimer) clearTimeout(seekTimer);

      const trackIndex = await TrackPlayer.getActiveTrackIndex();
      const queue = get().queue;
      if (trackIndex === undefined || !queue[trackIndex]) return;

      const currentTrack = queue[trackIndex];

      // 2. Determine base position
      // We explicitly check `optimisticPosition` again AFTER the first await?
      // No, we should check it before AND after if needed, but get() is stable.

      let currentGlobalPos = get().optimisticPosition;

      if (currentGlobalPos === null) {
        // Slow Path: Need to fetch from player
        const { position: currPos } = await TrackPlayer.getProgress();

        // CRITICAL RE-CHECK:
        // While we were awaiting `getProgress`, another jump might have finished
        // and set the optimisticPosition. If so, we MUST use that new value
        // to preserve the "chain" of jumps (e.g. +30 then +30 = 60).
        const freshOptimistic = get().optimisticPosition;
        if (freshOptimistic !== null) {
          currentGlobalPos = freshOptimistic;
        } else {
          currentGlobalPos = (currentTrack.trackOffset || 0) + currPos;
        }
      }

      // 3. Double Clear Protection
      // If another jump was triggered *while* we were awaiting above,
      // `jumpTimer` might have been set by that parallel execution.
      // We must clear it again to ensure ONLY this latest intention survives.
      if (jumpTimer) clearTimeout(jumpTimer);
      if (seekTimer) clearTimeout(seekTimer);

      const targetGlobalPos = currentGlobalPos + forwardSeconds;

      // console.log("JUMP FORWARD Optimistic:", targetGlobalPos);
      set({ optimisticPosition: targetGlobalPos, seeking: true });

      jumpTimer = setTimeout(async () => {
        // console.log("Executing Debounced JUMP FORWARD to:", targetGlobalPos);
        await get().actions.seekTo(targetGlobalPos);
        jumpTimer = null;
      }, 600) as unknown as NodeJS.Timeout;
    },

    jumpBackwardSeconds: async (backwardSeconds: number) => {
      // 1. Clear existing timers immediately
      if (jumpTimer) clearTimeout(jumpTimer);
      if (seekTimer) clearTimeout(seekTimer);

      const trackIndex = await TrackPlayer.getActiveTrackIndex();
      const queue = get().queue;
      if (trackIndex === undefined || !queue[trackIndex]) return;

      const currentTrack = queue[trackIndex];

      let currentGlobalPos = get().optimisticPosition;

      if (currentGlobalPos === null) {
        const { position: currPos } = await TrackPlayer.getProgress();

        // CRITICAL RE-CHECK (See jumpForwardSeconds for logic)
        const freshOptimistic = get().optimisticPosition;
        if (freshOptimistic !== null) {
          currentGlobalPos = freshOptimistic;
        } else {
          currentGlobalPos = (currentTrack.trackOffset || 0) + currPos;
        }
      }

      // 3. Double Clear Protection
      if (jumpTimer) clearTimeout(jumpTimer);
      if (seekTimer) clearTimeout(seekTimer);

      const targetGlobalPos = Math.max(0, currentGlobalPos - backwardSeconds);

      // console.log("JUMP BACKWARD Optimistic:", targetGlobalPos);
      set({ optimisticPosition: targetGlobalPos, seeking: true });

      jumpTimer = setTimeout(async () => {
        // console.log("Executing Debounced JUMP BACKWARD to:", targetGlobalPos);
        await get().actions.seekTo(targetGlobalPos);
        jumpTimer = null;
      }, 600) as unknown as NodeJS.Timeout;
    },

    next: async () => {
      const trackIndex = await TrackPlayer.getActiveTrackIndex();
      const queue = await TrackPlayer.getQueue();
      const session = get().session;

      if (trackIndex === undefined) return;

      const chapters = session?.chapters || [];
      if (queue.length === 1 && chapters.length === 0) return;

      const { currentChapterIndex = 0 } = get();

      let moveToAction = "track";
      let nextChapter = {} as Chapter;

      if (chapters.length > 0) {
        if (chapters.length - 1 !== currentChapterIndex) {
          moveToAction = "chapter";
          nextChapter = chapters[currentChapterIndex + 1];
        }
      }

      if (moveToAction === "chapter") {
        await get().actions.seekTo(nextChapter.start);
        return;
      }
      // Check if we are on the last track of the queue
      // If so, go to first track and pause
      //!! If only one track we should give option to go to next or at least don't do anything.

      if (queue.length - 1 === trackIndex) {
        await TrackPlayer.skip(0);
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.skipToNext();
      }
    },
    prev: async () => {
      const trackIndex = await TrackPlayer.getActiveTrackIndex();
      const session = get().session;

      if (trackIndex === undefined) return;

      const { currentChapterIndex = 0 } = get();
      const chapters = session?.chapters || [];

      // the Queue has tracks in it and each track may or may NOT have chapters.
      let moveToAction = "track";
      let prevChapter = {} as Chapter;

      if (chapters.length > 0) {
        if (currentChapterIndex !== 0) {
          moveToAction = "chapter";
          prevChapter = chapters[currentChapterIndex - 1];
        }
      }

      if (moveToAction === "chapter") {
        await get().actions.seekTo(prevChapter.start);
        return;
      }

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

//## ---------------------------------------------------------------
//## updatePlaybackRate
//## Checks is book is active and if so runs the playback store's update rate
//## function which will update TrackPlayer's rate and set the stores rate
//## Always updates the book stores playback rate for the given book.
//## ---------------------------------------------------------------
export const updatePlaybackRate = (libraryItemId: string, newRate: number) => {
  const activeSession = usePlaybackStore.getState().session;
  // If this book is the active book update the Trackplayer Rate and current playback store
  if (activeSession?.libraryItemId && activeSession?.libraryItemId === libraryItemId) {
    usePlaybackStore.getState().actions.updateActivePlaybackRate(newRate);
  }
  useBooksStore.getState().actions.updateBookPlaybackRate(libraryItemId, newRate);
};
