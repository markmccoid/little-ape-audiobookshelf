import { useEffect, useState } from "react";
import { useProgress } from "react-native-track-player";
import { useBooksStore, type Book } from "../store/store-books";
import { usePlaybackPosition, usePlaybackStore } from "../store/store-playback";
import { getAbsAuth } from "../utils/AudiobookShelf/absInit";

// Shared cache to prevent duplicate fetches between hooks
const bookDataCache = new Map<string, Book>();

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
  position: number | undefined;
  isLoading: boolean;
  error: Error | null;
} => {
  const progress = useProgress();
  const playbackPos = usePlaybackPosition();
  const bookActions = useBooksStore((state) => state.actions);
  const session = usePlaybackStore((s) => s.session); // ✅ Use selector directly

  const [position, setPosition] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch position on mount or when libraryItemId changes
  useEffect(() => {
    let isMounted = true;

    const fetchPosition = async () => {
      if (!libraryItemId) return;

      setIsLoading(true);
      setError(null);

      try {
        const absAuth = getAbsAuth();
        const userId = absAuth.userId;

        if (!userId) {
          throw new Error("User not authenticated");
        }

        // This handles both cache lookup AND server fetch
        const book = await bookActions.getOrFetchBook({
          userId,
          libraryItemId,
        });

        // Cache for useBookData hook to prevent duplicate fetches
        bookDataCache.set(libraryItemId, book);

        if (isMounted) {
          setPosition(book.currentPosition);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch position"));
          setPosition(0); // Fallback to 0
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPosition();

    return () => {
      isMounted = false;
    };
  }, [libraryItemId]); // ✅ FIXED: Removed bookActions from dependencies

  // Update to playback position when available AND it's for THIS book
  useEffect(() => {
    const loadedBookId = session?.libraryItemId;
    const isThisBookLoaded = loadedBookId === libraryItemId;

    // ✅ Only use TrackPlayer position if THIS book is loaded
    if (isThisBookLoaded) {
      if (progress.position > 0) {
        setPosition(progress.position);
      } else if (playbackPos !== undefined) {
        setPosition(playbackPos);
      }
    }
    // If different book is loaded, keep showing cached position
  }, [progress.position, playbackPos, libraryItemId, session?.libraryItemId]);
  return { position, isLoading, error };
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
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBookActive, setIsBookActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const session = usePlaybackStore((s) => s.session); // ✅ Use selector directly
  console.log("Session Changed in useBookData", session?.libraryItemId);
  useEffect(() => {
    let isMounted = true;

    const fetchBook = async () => {
      if (!libraryItemId) return;

      // Check cache first (may have been populated by useSmartPosition)
      const cached = bookDataCache.get(libraryItemId);
      if (cached) {
        setBook(cached);
        const loadedBookId = session?.libraryItemId;
        setIsBookActive(loadedBookId === libraryItemId);
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

        if (isMounted) {
          setBook(fetchedBook);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch book"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
        const loadedBookId = session?.libraryItemId;
        setIsBookActive(loadedBookId === libraryItemId);
      }
    };

    fetchBook();

    return () => {
      isMounted = false;
    };
  }, [libraryItemId, session?.libraryItemId]); // ✅ FIXED: Removed bookActions from dependencies

  return {
    book,
    duration: book?.duration,
    playbackSpeed: book?.playbackSpeed ?? 1,
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
