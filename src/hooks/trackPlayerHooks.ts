import { useEffect, useState } from "react";
import { useActiveTrack, useProgress } from "react-native-track-player";
import {
  EnhancedChapter,
  useBookPlaybackSpeed,
  useBooksStore,
  type Book,
} from "../store/store-books";
import {
  ABSQueuedTrack,
  useIsBookActive,
  usePlaybackSession,
  usePlaybackStore,
} from "../store/store-playback";
import { getAbsAuth } from "../utils/AudiobookShelf/absInit";

// Shared cache to prevent duplicate fetches between hooks
const bookDataCache = new Map<string, Book>();

type ChapterPosInfo = { chapterPosition: number; chapterDuration: number };
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
  error: Error | null;
} => {
  const progress = useProgress();
  const activeTrack = useActiveTrack() as ABSQueuedTrack | null;
  // Determine if book is active and loaded
  const isLoaded = usePlaybackStore((state) => state.isLoaded);
  const isBookActive = useIsBookActive(libraryItemId);

  // get stored book data
  const theBook = useBookData(libraryItemId);
  const chapters = theBook?.book?.chapters || [];

  const [chapterInfo, setChapterInfo] = useState<ChapterPosInfo>({
    chapterPosition: 0,
    chapterDuration: 0,
  });
  // ✅ Select ONLY the libraryItemId to prevent unnecessary re-renders
  const sessionLibraryItemId = usePlaybackStore((s) => s.session?.libraryItemId);

  const [bookPosition, setBookPosition] = useState<number | undefined>();
  const [currentChapter, setCurrentChapter] = useState<EnhancedChapter | null>();

  const [error, setError] = useState<Error | null>(null);
  // Fetch position on mount or when libraryItemId changes

  useEffect(() => {
    // this is the globalPosition from the saved book from store-books
    console.log("FIRST BOOK", theBook.book?.currentPosition);
    setBookPosition(theBook?.book?.currentPosition);
    const currChapt = getChapterFromProgress(chapters, theBook.book?.currentPosition || 0);
    const chaptStart = currChapt?.startSeconds ? Math.round(currChapt?.startSeconds) : 0;
    const newChapterPosition = (theBook.book?.currentPosition || 0) - chaptStart;

    setCurrentChapter(currChapt);
    setChapterInfo({
      chapterPosition: newChapterPosition || 0,
      chapterDuration: currChapt?.chapterDuration || 0,
    });

    console.log("ISActive - Book", isBookActive && isLoaded, theBook.book?.currentPosition);
    console.log("Active Track", activeTrack?.trackOffset);
  }, [libraryItemId]);

  // Update to playback position when available AND it's for THIS book
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
        console.log("BOOK LOADED - bookPosition", bookPosition);
        const currChapt = getChapterFromProgress(chapters, newPosition);
        const chaptStart = currChapt?.startSeconds ? Math.round(currChapt?.startSeconds) : 0;
        const newChapterPosition = newPosition - chaptStart;
        console.log("CUrrChapt, Progress Total", currChapt?.title, newPosition, newChapterPosition);
        setCurrentChapter(currChapt);
        setChapterInfo({
          chapterPosition: newChapterPosition || 0,
          chapterDuration: currChapt?.chapterDuration || 0,
        });
      }
      // console.log(
      //   "New Chapter Pos",
      //   progressTotal,
      //   chaptStart,
      //   newChapterPosition,
      //   currChapt?.chapterDuration,
      //   currChapt?.endSeconds
      // );
      // const newPosition =
      //   progress.position > 0
      //     ? Math.round(progressTotal * 10) / 10
      //     : // ? Math.round(progress.position * 10) / 10
      //     playbackPos !== undefined
      //     ? Math.round(playbackPos * 10) / 10
      //     : undefined;

      // Only update if position actually changed significantly
      if (newPosition !== undefined && newPosition !== bookPosition) {
        setBookPosition(newPosition);
      }
    }
    // If different book is loaded, keep showing cached position
  }, [progress.position, libraryItemId, sessionLibraryItemId, isLoaded]);
  return {
    bookPosition: bookPosition,
    bookDuration: theBook.duration,
    chapterPosition: chapterInfo.chapterPosition,
    chapterDuration: chapterInfo.chapterDuration,
    chapterTitle: currentChapter?.title || "",
    error,
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
export const useBookData = (
  libraryItemId: string
): {
  book: Book | null;
  duration: number | undefined;
  playbackSpeed: number;
  isLoading: boolean;
  error: Error | null;
  isBookActive: boolean;
} => {
  const bookActions = useBooksStore((state) => state.actions);
  // ✅ Subscribe to the SPECIFIC book from Zustand - will re-render when it updates
  const bookFromStore = useBooksStore((state) =>
    state.books.find((b) => b.libraryItemId === libraryItemId)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // ✅ Select ONLY the libraryItemId to prevent unnecessary re-renders
  const sessionLibraryItemId = usePlaybackStore((s) => s.session?.libraryItemId);
  const isBookActive = sessionLibraryItemId === libraryItemId;

  // Fetch book on mount if not in store
  useEffect(() => {
    let isMounted = true;

    const fetchBook = async () => {
      if (!libraryItemId) return;

      // If already in store, no need to fetch
      if (bookFromStore) {
        return;
      }

      // Check cache first (may have been populated by useSmartPosition)
      const cached = bookDataCache.get(libraryItemId);
      if (cached) {
        // Cache exists but not in store - this shouldn't happen often
        // but we'll handle it by trusting the store will be updated soon
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const absAuth = getAbsAuth();
        const userId = absAuth.userId;

        if (!userId) {
          throw new Error("User not authenticated");
        }

        const fetchedBook = await bookActions.getOrFetchBook({
          userId,
          libraryItemId,
        });

        // Update cache for other hooks
        bookDataCache.set(libraryItemId, fetchedBook);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch book"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBook();

    return () => {
      isMounted = false;
    };
  }, [libraryItemId, bookFromStore, bookActions]); // Run when libraryItemId changes or when book appears in store

  return {
    book: bookFromStore ?? null,
    duration: bookFromStore?.duration,
    playbackSpeed: bookFromStore?.playbackRate ?? 1,
    isLoading,
    error,
    isBookActive,
  };
};

/**
 * Clears the book data cache.
 * Useful when logging out or switching users.
 */
export const clearBookDataCache = () => {
  bookDataCache.clear();
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
