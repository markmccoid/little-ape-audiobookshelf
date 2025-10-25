import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useActiveTrack, useProgress } from "react-native-track-player";
import {
  EnhancedChapter,
  useBook,
  useBookPlaybackSpeed,
  useBooksStore,
} from "../store/store-books";
import {
  ABSQueuedTrack,
  useIsBookActive,
  usePlaybackSession,
  usePlaybackStore,
} from "../store/store-playback";
import { getAbsAuth } from "../utils/AudiobookShelf/absInit";

type ChapterPosInfo = { chapterPosition: number; chapterDuration: number; chapterTitle: string };
/**
 * Hook for frequently updating position data.
 * Optimized for slider and progress displays that update every ~250ms.
 *
 * @param libraryItemId - The book's library item ID
 * @returns Object with position, loading state, and error
 */

export const useSmartPosition = (
  libraryItemId: string
): {
  bookPosition: number | undefined;
  bookDuration: number | undefined;
  chapterPosition: number | undefined;
  chapterDuration: number | undefined;
  chapterTitle: string;
} => {
  const progress = useProgress();
  const activeTrack = useActiveTrack() as ABSQueuedTrack | null;
  // Determine if book is active and loaded
  const isLoaded = usePlaybackStore((state) => state.isLoaded);
  const isBookActive = useIsBookActive(libraryItemId);

  // get stored book data
  const { book, isLoading: bookIsLoading, duration: bookDuration } = useBookData(libraryItemId);
  const chapters = book?.chapters || [];

  const [chapterInfo, setChapterInfo] = useState<ChapterPosInfo>({
    chapterPosition: 0,
    chapterDuration: 0,
    chapterTitle: "",
  });
  // ✅ Select ONLY the libraryItemId to prevent unnecessary re-renders
  const sessionLibraryItemId = usePlaybackStore((s) => s.session?.libraryItemId);

  const [bookPosition, setBookPosition] = useState<number | undefined>();

  //# Fetch position on mount or when libraryItemId changes
  //# This effect is to update the position/chapter information based on the stored book
  //# It returns the data when the book is NOT active/loaded for playback.
  useEffect(() => {
    //~ this is the globalPosition / chapters from the saved book from store-books
    setBookPosition(book?.currentPosition);
    const currChapt = getChapterFromProgress(chapters, book?.currentPosition || 0);
    const chaptStart = currChapt?.startSeconds ? Math.round(currChapt?.startSeconds) : 0;
    //~ we pulled the current chapter based on the current global position
    //~ this means that chaptStart should ALWAYS be greater than the current position
    const newChapterPosition = (book?.currentPosition || 0) - chaptStart;

    setChapterInfo({
      chapterPosition: newChapterPosition || 0,
      chapterDuration: currChapt?.chapterDuration || 0,
      chapterTitle: currChapt?.title || "",
    });

    // console.log("ISActive - Book", isBookActive && isLoaded, book?.currentPosition);
    // console.log("Active Track", activeTrack?.trackOffset);
  }, [libraryItemId, bookIsLoading]);

  //# Update to playback position when available AND it's for THIS book
  useEffect(() => {
    const isThisBookLoaded = isBookActive && isLoaded;

    // ✅ Only use TrackPlayer position if THIS book is loaded
    if (isThisBookLoaded) {
      // Round to 1 decimal place to reduce unnecessary re-renders
      // from floating point precision changes
      //!! Calculation - ONLY when book is active
      // this is the global position in the book
      let newPosition = bookPosition;
      if (progress.position !== 0 && bookPosition && bookPosition > 0) {
        newPosition = Math.round((activeTrack?.trackOffset || 0) + progress.position);
        // console.log("BOOK LOADED - bookPosition", bookPosition);
        const currChapt = getChapterFromProgress(chapters, newPosition);
        const chaptStart = currChapt?.startSeconds ? Math.round(currChapt?.startSeconds) : 0;
        const newChapterPosition = newPosition - chaptStart;
        // console.log("CUrrChapt, Progress Total", currChapt?.title, newPosition, newChapterPosition);
        setChapterInfo({
          chapterPosition: newChapterPosition || 0,
          chapterDuration: currChapt?.chapterDuration || 0,
          chapterTitle: currChapt?.title || "",
        });
      }

      // Only update if position actually changed significantly
      if (newPosition !== undefined && newPosition !== bookPosition) {
        setBookPosition(newPosition);
      }
    }
    // If different book is loaded, keep showing cached position
  }, [progress.position, libraryItemId, sessionLibraryItemId, isLoaded]);
  return {
    bookPosition: bookPosition,
    bookDuration: bookDuration,
    chapterPosition: chapterInfo.chapterPosition,
    chapterDuration: chapterInfo.chapterDuration,
    chapterTitle: chapterInfo?.chapterTitle || "",
  };
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
      return ch;
    }
  }

  // If beyond last chapter end, return last chapter (or null depending on logic)
  return chapters[chapters.length - 1];
}
