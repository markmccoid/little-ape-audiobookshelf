/**
 * useOfflineAwareAPI Hook
 *
 * Combines network and auth state with cached data access.
 * Provides a unified interface for components to handle offline scenarios.
 */

import { useAuth, useAuthState } from "@/src/contexts/AuthContext";
import { useNetwork } from "@/src/contexts/NetworkContext";
import { Book, useBooksStore } from "@/src/store/store-books";
import { usePlaybackStore } from "@/src/store/store-playback";
import { canPlayBookOffline } from "@/src/utils/bookAvailability";
import { useCallback, useEffect, useState } from "react";

export interface OfflineAwareAPIState {
  // Network state
  isOffline: boolean;
  connectionQuality: "excellent" | "good" | "poor" | "offline";

  // Auth state
  isAuthenticated: boolean;
  authState: ReturnType<typeof useAuthState>["authState"];

  // Combined state
  canMakeRequests: boolean;

  // Cached data access
  getCachedBook: (id: string) => Book | undefined;
  getCachedBooks: () => Book[];
  getCachedBookIds: () => string[];

  // Playback helpers
  canPlayBook: (libraryItemId: string, isDownloaded?: boolean) => boolean;
}

export function useOfflineAwareAPI(): OfflineAwareAPIState {
  const { isOffline, connectionQuality } = useNetwork();
  const { isAuthenticated } = useAuth();
  const { authState } = useAuthState();

  // Access book store for cached data
  const books = useBooksStore((s) => s.books);

  // Get currently playing book for offline playback check
  const currentSession = usePlaybackStore((s) => s.session);

  /**
   * Get a single cached book by ID
   */
  const getCachedBook = useCallback(
    (id: string): Book | undefined => {
      return books.find((book) => book.libraryItemId === id);
    },
    [books]
  );

  /**
   * Get all cached books
   */
  const getCachedBooks = useCallback((): Book[] => {
    return books;
  }, [books]);

  /**
   * Get IDs of all cached books
   */
  const getCachedBookIds = useCallback((): string[] => {
    return books.map((book) => book.libraryItemId);
  }, [books]);

  /**
   * Check if a book can be played given current network state
   * Takes into account: downloaded status, currently loaded book, online status
   */
  const canPlayBook = useCallback(
    (libraryItemId: string, isDownloaded: boolean = false): boolean => {
      return canPlayBookOffline(
        { libraryItemId, isDownloaded },
        !isOffline,
        currentSession?.libraryItemId
      );
    },
    [isOffline, currentSession?.libraryItemId]
  );

  return {
    // Network state
    isOffline,
    connectionQuality,

    // Auth state
    isAuthenticated,
    authState,

    // Combined state - can only make requests if online AND authenticated
    canMakeRequests: !isOffline && isAuthenticated,

    // Cached data access
    getCachedBook,
    getCachedBooks,
    getCachedBookIds,

    // Playback helpers
    canPlayBook,
  };
}

/**
 * Hook to get offline-aware data with automatic cache fallback
 *
 * Usage:
 * const { data, isFromCache, error } = useOfflineData(
 *   () => api.getBookDetails(bookId),
 *   bookId,
 *   (id) => getCachedBook(id)
 * );
 */
export function useOfflineData<T>(
  fetchFn: () => Promise<T>,
  cacheKey: string,
  getCacheData: (key: string) => T | null
): {
  data: T | null;
  isFromCache: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { isOffline } = useNetwork();
  const [data, setData] = useState<T | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // If offline, try cache first
    if (isOffline) {
      const cachedData = getCacheData(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setIsFromCache(true);
        setIsLoading(false);
        return;
      }
    }

    // Try to fetch fresh data
    try {
      const freshData = await fetchFn();
      setData(freshData);
      setIsFromCache(false);
    } catch (err) {
      // On error, fall back to cache
      const cachedData = getCacheData(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setIsFromCache(true);
      } else {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOffline, cacheKey, fetchFn, getCacheData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isFromCache,
    isLoading,
    error,
    refetch: fetchData,
  };
}
