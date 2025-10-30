import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useActiveTrack, useProgress } from "react-native-track-player";
import {
  EnhancedChapter,
  useBook,
  useBookPlaybackSpeed,
  useBooksStore,
} from "../store/store-books";
import { usePlaybackSession, usePlaybackStore } from "../store/store-playback";
import { getAbsAuth } from "../utils/AudiobookShelf/absInit";

//###
//# useSmartPositionStore version 2
//###
import { useSmartPositionStore } from "@/src/store/store-smartposition";

export const useSmartPosition = (libraryItemId: string) => {
  const isLoaded = usePlaybackStore((s) => s.isLoaded);
  const sessionId = usePlaybackStore((s) => s.session?.libraryItemId);
  const isBookActive = sessionId === libraryItemId;
  // const isPlaying = usePlaybackIsPlaying(libraryItemId);
  const { book, duration = 0 } = useBookData(libraryItemId);
  const chapters = book?.chapters || [];
  const progress = useProgress();
  const activeTrack = useActiveTrack();
  const update = useSmartPositionStore((s) => s.updateForActiveBook);

  useEffect(() => {
    // console.log("USESMPOS", progress.position, book?.currentPosition, book?.title);
    if (isBookActive && isLoaded && progress.position !== 0) {
      const newPos = Math.round((activeTrack?.trackOffset ?? 0) + progress.position);
      const curr = getChapterFromProgress(chapters, newPos);
      update(libraryItemId, newPos, duration, {
        chapterPosition: newPos - (curr?.startSeconds ?? 0),
        chapterStart: curr?.startSeconds || 0,
        chapterEnd: (curr?.startSeconds || 0) + (curr?.chapterDuration || 0),
        chapterDuration: curr?.chapterDuration ?? 0,
        chapterTitle: curr?.title ?? "",
        numOfChapters: chapters.length,
        chapterNumber: curr?.chapterNumber || 1,
        chapterIndex: curr?.chapterIndex || 0,
      });
    } else if (!isBookActive || progress.position == 0) {
      // console.log("Pulling from stored book", book?.title, book?.currentPosition);
      const pos = book?.currentPosition ?? 0;
      const curr = getChapterFromProgress(chapters, pos);
      update(libraryItemId, pos, duration, {
        chapterPosition: pos - (curr?.startSeconds ?? 0),
        chapterStart: curr?.startSeconds || 0,
        chapterEnd: (curr?.startSeconds || 0) + (curr?.chapterDuration || 0),
        chapterDuration: curr?.chapterDuration ?? 0,
        chapterTitle: curr?.title ?? "",
        numOfChapters: chapters.length,
        chapterNumber: curr?.chapterNumber || 1,
        chapterIndex: curr?.chapterIndex || 0,
      });
    }
  }, [progress.position, isLoaded, sessionId, libraryItemId, book?.currentPosition]);
};

/**
 * Hook for static book data (duration, metadata, playback speed).
 * Optimized to prevent unnecessary re-renders - only updates when book data changes.
 * Uses shared cache with useSmartPosition to prevent duplicate API calls.
 * Also returns isBookActive which lets us know if the book looking up data on is loaded
 * into the playback store.
 *
 * @param libraryItemId - The book's library item ID
 * @returns Object with book data, duration, playback speed, loading state, and error
 */

// export const useBookData = (
//   libraryItemId: string
// ): {
//   book: Book | null;
//   duration: number | undefined;
//   playbackSpeed: number;
//   isLoading: boolean;
//   error: Error | null;
//   isBookActive: boolean;
// } => {
//   const bookActions = useBooksStore((state) => state.actions);
//   // ✅ Subscribe to the SPECIFIC book from Zustand - will re-render when it updates
//   const bookFromStore = useBook(libraryItemId);
//   // useBooksStore((state) =>
//   //   state.books.find((b) => b.libraryItemId === libraryItemId)
//   // );
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<Error | null>(null);
//   // ✅ Select ONLY the libraryItemId to prevent unnecessary re-renders
//   const sessionLibraryItemId = usePlaybackStore((s) => s.session?.libraryItemId);
//   const isBookActive = sessionLibraryItemId === libraryItemId;

//   // Fetch book on mount if not in store
//   useEffect(() => {
//     let isMounted = true;

//     const fetchBook = async () => {
//       if (!libraryItemId) return;

//       setIsLoading(true);
//       setError(null);

//       try {
//         const absAuth = getAbsAuth();
//         const userId = absAuth.userId;

//         if (!userId) {
//           throw new Error("User not authenticated");
//         }

//         // Call getOrFetchBook
//         // We don't need the returned value as our bookFromStore variable
//         // will be run when store is updated.
//         console.log("Fetching Book");
//         await bookActions.getOrFetchBook({
//           userId,
//           libraryItemId,
//         });

//         // Update cache for other hooks
//         // bookDataCache.set(libraryItemId, fetchedBook);
//       } catch (err) {
//         if (isMounted) {
//           setError(err instanceof Error ? err : new Error("Failed to fetch book"));
//         }
//       } finally {
//         if (isMounted) {
//           setIsLoading(false);
//         }
//       }
//     };

//     fetchBook();

//     return () => {
//       isMounted = false;
//     };
//   }, [libraryItemId, bookActions]); // Run when libraryItemId changes or when book appears in store

//   return {
//     book: bookFromStore ?? null,
//     duration: bookFromStore?.duration,
//     playbackSpeed: bookFromStore?.playbackRate ?? 1,
//     isLoading,
//     error,
//     isBookActive,
//   };
// };

//## ------------------------------------------------
export const useBookData = (libraryItemId: string) => {
  const bookFromStore = useBook(libraryItemId);
  const getOrFetchBook = useBooksStore((state) => state.actions.getOrFetchBook);
  const absAuth = getAbsAuth();
  const userId = absAuth.userId;

  const sessionLibraryItemId = usePlaybackStore((s) => s.session?.libraryItemId);
  const isBookActive = sessionLibraryItemId === libraryItemId;

  //~ We are using react query to handle the stale time. Since Zustand is the store that is caching the book data
  //~ So we don't use the returned book but instead let the subscription to the book store (useBook) return to us
  //~ the updated book after the async operation has finished.
  const {
    data: fetchedBook,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["book", libraryItemId, userId],
    queryFn: async () => {
      if (!userId) throw new Error("User not authenticated");
      console.log("In useBookDataHook queryFN");
      return await getOrFetchBook({ userId, libraryItemId });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!libraryItemId && !!userId,
  });

  const book = bookFromStore;

  return {
    book,
    duration: book?.duration,
    playbackSpeed: book?.playbackRate ?? 1,
    isLoading: isLoading && !bookFromStore, // Not loading if we have cached data
    error: error as Error | null,
    isBookActive,
  };
};

//## ------------------------------------------------
//## Checks to see if the book is active (being listened to)
//## if so returns the active sessionPlayback Rate otherwise
//## returns the stored book playback rate
//## ------------------------------------------------
export const usePlaybackRate = (libraryItemId: string) => {
  const session = usePlaybackSession();
  const sessionPlaybackRate = usePlaybackStore((state) => state.playbackRate);
  const bookPlaybackRate = useBookPlaybackSpeed(libraryItemId);

  if (session?.libraryItemId && session?.libraryItemId === libraryItemId) {
    return sessionPlaybackRate || 1;
  }
  return bookPlaybackRate || 1;
};

//## ------------------------------------------------
//## Gets passed an array Chapters with current total progress
//## NOTE: progress is total progress in book NOT just the progress in a given track
//## ------------------------------------------------
function getChapterFromProgress(chapters: EnhancedChapter[] | undefined, progressSeconds: number) {
  // Optional: handle values outside range
  if (!chapters || chapters.length === 0 || progressSeconds < chapters[0].startSeconds) return null;

  // Find chapter where startSeconds ≤ progressSeconds < endSeconds
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (progressSeconds >= ch.startSeconds && progressSeconds < ch.endSeconds) {
      return { ...ch, chapterNumber: i + 1, chapterIndex: i };
    }
  }

  // If beyond last chapter end, return last chapter (or null depending on logic)
  return {
    ...chapters[chapters.length - 1],
    chapterNumber: chapters.length,
    chapterIndex: chapters.length - 1,
  };
}
