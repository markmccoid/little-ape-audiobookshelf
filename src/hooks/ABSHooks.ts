import { useQuery } from "@tanstack/react-query";
import { sortBy } from "es-toolkit";

import { useEffect, useMemo, useState } from "react";
import { useSafeAbsAPI } from "../contexts/AuthContext";
import { Book, useBooksActions } from "../store/store-books";
import { useSortDirection, useSortedBy } from "../store/store-filters";
import {
  ABSGetItemsInProgress,
  ABSGetLibraries,
  ABSGetLibraryItem,
  ABSGetLibraryItems,
} from "../utils/AudiobookShelf/absAPIClass";
import { getAbsAPI, useAbsAPI } from "../utils/AudiobookShelf/absInit";
import { defaultBookshelves } from "../utils/AudiobookShelf/bookshelfTypes";
import { queryClient } from "../utils/queryClient";

//# ----------------------------------------------
//# useLibraries - return user's libraries
//# ----------------------------------------------
export const useLibraries = () => {
  const absAPI = useSafeAbsAPI();
  const [libraries, setLibraries] = useState<ABSGetLibraries>([]);
  const [activeLibrary, setActiveLibrary] = useState("");

  const handleSetActiveLibrary = async (activeLibraryId: string) => {
    if (absAPI) {
      absAPI.setActiveLibraryId(activeLibraryId);
      setActiveLibrary(activeLibraryId);
    }
  };

  useEffect(() => {
    const getLibs = async () => {
      if (absAPI) {
        const libs = await absAPI.getLibraries();
        setLibraries(libs);
      } else {
        setLibraries([]);
      }
    };
    getLibs();
  }, [activeLibrary, absAPI]);

  return { libraries, activeLibrary, setActiveLibrary: handleSetActiveLibrary };
};

//# ----------------------------------------------
//# useGetBooks Filter Helpers
//# ----------------------------------------------
//~ Create a filter configuration object for easy management
//~ - ----------------------------------------------------
type Filters = {
  searchValue?: string;
  genres?: string[];
  tags?: string[];
};
const createFilterConfig = (filters: Filters) => ({
  search: {
    enabled: filters.searchValue && filters.searchValue.trim() !== "",
    term: filters.searchValue?.toLowerCase().trim(),
  },
  hasAudio: {
    enabled: true, // Always filter for books with audio
    condition: (book: ABSGetLibraryItem) => (book.numAudioFiles || 0) > 0,
  },
  // Example additional filters you might add:
  // genre: {
  //   enabled: additionalFilters.genre?.length > 0,
  //   values: additionalFilters.genre,
  //   condition: (book) => additionalFilters.genre.includes(book.genre),
  // },
  // rating: {
  //   enabled: additionalFilters.minRating != null,
  //   minValue: additionalFilters.minRating,
  //   condition: (book) => (book.rating || 0) >= additionalFilters.minRating,
  // },
});
//~ - ----------------------------------------------------
//~ Single pass filter function that applies all filters at once
//~ - ----------------------------------------------------
const applyFilters = (
  books: ABSGetLibraryItems,
  filterConfig: ReturnType<typeof createFilterConfig>
) => {
  if (!books?.length) return books;
  return books.filter((book) => {
    // Search filter
    if (filterConfig.search.enabled) {
      const searchTerm = filterConfig.search.term;
      const matchesSearch =
        (book.title && book.title.toLowerCase().includes(searchTerm || "")) ||
        (book.author && book.author.toLowerCase().includes(searchTerm || ""));

      if (!matchesSearch) return false;
    }

    // Audio files filter
    if (filterConfig.hasAudio.enabled) {
      if (!filterConfig.hasAudio.condition(book)) return false;
    }

    // Add other filters here as needed
    // Each filter should return false if the book doesn't match
    // console.log("Returning", book.title);
    return true; // Book passes all filters
  });
};
//# ----------------------------------------------
//# useGetBooks Filter Setup
//# ----------------------------------------------
export const useGetBooks = (searchValue?: string) => {
  const absAPI = useAbsAPI();
  const activeLibraryId = absAPI.getActiveLibraryId();
  const sortedBy = "addedAt";

  const {
    data: rawData,
    isPending,
    isError,
    isLoading,
    ...rest
  } = useQuery({
    queryKey: ["books", activeLibraryId],
    queryFn: async () => await absAPI.getLibraryItems(),
    staleTime: 1000 * 60 * 5, // Stale Minutes
  });

  const filteredData = useMemo(() => {
    if (!rawData?.length) return rawData;

    const filterConfig = createFilterConfig({ searchValue });

    // Early return if no filters are active
    const hasActiveFilters = Object.values(filterConfig).some((filter) => filter.enabled);
    if (!hasActiveFilters) return rawData;

    return applyFilters(rawData, filterConfig);
  }, [rawData, searchValue]);

  const sortedData = useMemo(() => {
    if (!filteredData?.length) return filteredData;
    return sortBy(filteredData, [sortedBy]);
  }, [filteredData, sortedBy]);
  // Filter data based on searchValue (case insensitive)
  // const filteredData = useMemo(() => {
  //   if (!rawData || !searchValue || searchValue.trim() === "") {
  //     return rawData;
  //   }

  //   const searchTerm = searchValue.toLowerCase().trim();
  //   return rawData.filter(
  //     (book) =>
  //       (book.title?.toLowerCase().includes(searchTerm) ||
  //         book.author?.toLowerCase().includes(searchTerm)) &&
  //       (book.numAudioFiles || 0) > 0
  //   );
  // }, [rawData, searchValue]);
  // const sortedData = sortBy(filteredData, [sortedBy]);
  return { data: sortedData, isPending, isError, isLoading, ...rest };
};

//# ----------------------------------------------
//# useGetBookShelves
//# ----------------------------------------------
// Module-level variable - persists across component mount/unmount but resets on app restart
const DISCOVER_UPDATE_INTERVAL = 3 * 60 * 60 * 1000; // 3 hours in ms
let lastDiscoverUpdate = 0; // Initialized to 0 (epoch) means it will update on first run

export const useGetBookShelves = () => {
  const absAPI = useSafeAbsAPI();
  // const activeLibraryId = absAPI?.getActiveLibraryId() || null;
  const activeLibraryId = useMemo(() => {
    return absAPI?.getActiveLibraryId() ?? null;
  }, []);
  const bookStoreActions = useBooksActions();
  // const { authInfo } = useAuth();

  const query = useQuery({
    queryKey: ["bookShelves", activeLibraryId],
    queryFn: async () => {
      //# ------------------------------------------------------------------
      // console.log("[useGetBookShelves] Query function called");
      if (!absAPI) {
        throw new Error("Not authenticated");
      }
      // Fetch new data
      const result = await absAPI.getBookShelves();
      return result;
      //# ------------------------------------------------------------------
    },
    enabled: !!absAPI && !!activeLibraryId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // Keep cache longer when unmounted
  });

  // derive the default shelf IDs from the source-of-truth array
  const shelvesToProcess = useMemo(() => defaultBookshelves.map((s) => s.id), []);
  // small helper to safely add books for a default shelf ID
  const safeAddBooksForDefaultKey = (shelfId: string, books?: Pick<Book, "libraryItemId">[]) => {
    if (!books || books.length === 0) return;
    bookStoreActions.addBooksToBookshelf(books, shelfId);
  };
  useEffect(() => {
    // Return if no data
    if (!query.isSuccess || !query.data) {
      return;
    }

    const now = Date.now();
    const shouldUpdateDiscover = now - lastDiscoverUpdate >= DISCOVER_UPDATE_INTERVAL;

    // Process the known default shelves
    for (const shelfId of shelvesToProcess) {
      if (!shelfId) continue;

      // Skip discover if not enough time has passed
      if (shelfId === "discover" && !shouldUpdateDiscover) {
        continue;
      }

      const shelfBooks = query.data[shelfId]?.books;

      // The API returns data keyed by IDs, so use the ID directly
      safeAddBooksForDefaultKey(shelfId, shelfBooks);
    }

    // Update timestamp if discover was processed
    if (shouldUpdateDiscover) {
      lastDiscoverUpdate = now;
      console.log("[useGetBookShelves] Discover updated at:", new Date(now).toISOString());
    }
  }, [query.isSuccess, query.data, shelvesToProcess]);

  return query;
};

//# ----------------------------------------------
//# useGetBooksInProgress
//# Returns data as { libraryItemId: {bookinfo}, ...}
//# to facilitate quick lookup
//# ----------------------------------------------
export const useGetBooksInProgress = (enabled = true) => {
  const absAPI = useSafeAbsAPI();
  const bookActions = useBooksActions();
  // Always get the library ID, even if null
  const activeLibraryId = absAPI?.getActiveLibraryId() || null;

  const { data, isError, ...rest } = useQuery({
    queryKey: ["booksInProgress", activeLibraryId],
    queryFn: async () => {
      if (!absAPI) throw new Error("Not authenticated");
      // const r = await absAPI?.getBookShelves();
      return absAPI?.getItemsInProgress();
    },
    enabled: enabled && !!absAPI && !!activeLibraryId,
    staleTime: 0,
    select: (data) => {
      // Build lookup map once
      const progressById = data.reduce<Record<string, ABSGetItemsInProgress[0]>>((acc, p) => {
        acc[p.bookId] = p;
        return acc;
      }, {});
      return { list: data, mapped: progressById };
    },
  });

  //~ update the book store with this new progress information
  //~ this way we do not need to augment data in the HomeContainer.
  useEffect(() => {
    if (!data) return;
    // update the store-books.bookInfo[].positionInfo
    bookActions.updateMappedProgressPositions(data.mapped);
  }, [data, bookActions]);
  return { data, isError, ...rest };
};

//# ----------------------------------------------
//# moveBookToTopOfInProgress - Optimistic Update Helper
//# ----------------------------------------------
/**
 * Optimistically updates the booksInProgress cache to move a book to the top
 * when playback starts. This provides immediate UI feedback without waiting
 * for server synchronization.
 *
 * @param bookId - The ID of the book that started playing
 * @param activeLibraryId - The active library ID (for cache key)
 */
export const moveBookToTopOfInProgress = (bookId: string, activeLibraryId?: string | null) => {
  const absAPI = getAbsAPI();
  // Always get the library ID, even if null
  if (!activeLibraryId) {
    activeLibraryId = absAPI?.getActiveLibraryId() || null;
  }

  const queryKey = ["booksInProgress", activeLibraryId];

  // Get current cache data
  const currentData = queryClient.getQueryData<ABSGetItemsInProgress>(queryKey);

  if (!currentData || currentData.length === 0) {
    console.log("moveBookToTopOfInProgress: No data in cache to update");
    return;
  }

  // Find the book that's starting to play
  const bookIndex = currentData.findIndex((book) => book.bookId === bookId);

  if (bookIndex === -1) {
    console.log(`moveBookToTopOfInProgress: Book ${bookId} not found in cache`);
    return;
  }

  if (bookIndex === 0) {
    console.log(`moveBookToTopOfInProgress: Book ${bookId} already at top`);
    return;
  }

  // Create new array with the book moved to the top
  const updatedData = [
    currentData[bookIndex], // Move playing book to position 0
    ...currentData.slice(0, bookIndex), // Everything before it
    ...currentData.slice(bookIndex + 1), // Everything after it
  ];

  // Optimistically update the cache
  queryClient.setQueryData<ABSGetItemsInProgress>(queryKey, updatedData);

  // console.log(`moveBookToTopOfInProgress: Moved "${currentData[bookIndex].title}" to top`);
};

//# ----------------------------------------------
//# useSafeGetBooks - Safe version that handles unauthenticated state
//# ----------------------------------------------
export const useSafeGetBooks = (searchValue?: string) => {
  const absAPI = useSafeAbsAPI();
  const sortedBy = useSortedBy();
  const sortDirection = useSortDirection();

  // Always get the library ID, even if null
  const activeLibraryId = absAPI?.getActiveLibraryId() || null;

  // Always call useQuery, but disable it when not authenticated
  const {
    data: rawData,
    isPending,
    isError,
    isLoading,
    ...rest
  } = useQuery({
    queryKey: ["books", activeLibraryId],
    queryFn: async () => {
      if (!absAPI) throw new Error("Not authenticated");
      return await absAPI.getLibraryItems();
    },
    enabled: !!absAPI && !!activeLibraryId, // Only run when authenticated and have library ID
    staleTime: 1000 * 60 * 5, // Stale Minutes
  });

  // Always call useMemo hooks
  const filteredData = useMemo(() => {
    if (!rawData?.length) return rawData;

    const filterConfig = createFilterConfig({ searchValue });

    // Early return if no filters are active
    const hasActiveFilters = Object.values(filterConfig).some((filter) => filter.enabled);
    if (!hasActiveFilters) return rawData;

    return applyFilters(rawData, filterConfig);
  }, [rawData, searchValue]);

  const sortedData = useMemo(() => {
    if (!filteredData?.length) return filteredData;
    const sorted = sortBy(filteredData, [sortedBy]);
    // reverse if desc
    if (sortDirection === "desc") return sorted.reverse();
    // if (sortDirection === "desc") return reverse(sorted);

    return sorted;
  }, [filteredData, sortedBy]);

  // Return appropriate data based on authentication state
  if (!absAPI) {
    return {
      data: undefined,
      isPending: false,
      isError: false,
      isLoading: false,
      error: null,
    };
  }

  return { data: sortedData, isPending, isError, isLoading, ...rest };
};

//# ----------------------------------------------
//# useGetItemDetails - Safe version that handles unauthenticated state
//# ----------------------------------------------
export const useGetItemDetails = (itemId?: string) => {
  const absAPI = useSafeAbsAPI();

  // Always call useQuery, but control when it's enabled
  const { data, isPending, isError, isLoading, error, ...rest } = useQuery({
    queryKey: ["itemDetails", itemId],
    queryFn: async () => {
      if (!absAPI) throw new Error("Not authenticated");
      return await absAPI.getItemDetails(itemId);
    },
    enabled: !!absAPI && !!itemId, // Only run when authenticated AND itemId is provided
    staleTime: 1000,
  });

  // Return appropriate data based on authentication state
  if (!absAPI) {
    return {
      data: undefined,
      isPending: false,
      isError: false,
      isLoading: false,
      error: null,
    };
  }

  return { data, isPending, isError, isLoading, error, ...rest };
};

export const useInvalidateQueries = () => {
  const absAPI = useSafeAbsAPI();
  // Always get the library ID, even if null
  const activeLibraryId = absAPI?.getActiveLibraryId();
  return (queryIdentifier: "booksInProgress" | "books" | "bookshelves") => {
    switch (queryIdentifier) {
      case "booksInProgress":
        console.log("Invalidating booksInProgress");
        queryClient.invalidateQueries({ queryKey: ["booksInProgress", activeLibraryId] });

        break;
      case "books":
        console.log("Invalidating books");
        queryClient.invalidateQueries({ queryKey: ["books", activeLibraryId] });

        break;
      case "bookshelves":
        console.log("Invalidating books");
        queryClient.invalidateQueries({ queryKey: ["bookShelves", activeLibraryId] });

        break;

      default:
        break;
    }
  };
};
