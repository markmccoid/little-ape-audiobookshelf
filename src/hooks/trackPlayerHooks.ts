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
  // ✅ Select ONLY the libraryItemId to prevent unnecessary re-renders
  const sessionLibraryItemId = usePlaybackStore((s) => s.session?.libraryItemId);

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
    const isThisBookLoaded = sessionLibraryItemId === libraryItemId;

    // ✅ Only use TrackPlayer position if THIS book is loaded
    if (isThisBookLoaded) {
      // Round to 1 decimal place to reduce unnecessary re-renders
      // from floating point precision changes
      const newPosition =
        progress.position > 0
          ? Math.round(progress.position * 10) / 10
          : playbackPos !== undefined
          ? Math.round(playbackPos * 10) / 10
          : undefined;

      // Only update if position actually changed significantly
      if (newPosition !== undefined && newPosition !== position) {
        setPosition(newPosition);
      }
    }
    // If different book is loaded, keep showing cached position
  }, [progress.position, playbackPos, libraryItemId, sessionLibraryItemId, position]);
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
    playbackSpeed: bookFromStore?.playbackSpeed ?? 1,
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
