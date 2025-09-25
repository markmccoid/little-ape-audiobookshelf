import { useQuery } from "@tanstack/react-query";
import { sortBy } from "lodash";
import { useEffect, useMemo, useState } from "react";
import { ABSGetLibraries, ABSGetLibraryItem, ABSGetLibraryItems } from "../ABS/absAPIClass";
import { useAbsAPI } from "../ABS/absInit";
import { useSafeAbsAPI } from "../contexts/AuthContext";
import { useSortedBy } from "../store/store-filters";

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
        book.title?.toLowerCase().includes(searchTerm) ||
        book.author?.toLowerCase().includes(searchTerm);

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
  const sortedBy = useSortedBy();

  const {
    data: rawData,
    isPending,
    isError,
    isLoading,
    ...rest
  } = useQuery({
    queryKey: ["books", activeLibraryId],
    queryFn: async () => await absAPI.getLibraryItems({ libraryId: activeLibraryId }),
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
//# useSafeGetBooks - Safe version that handles unauthenticated state
//# ----------------------------------------------
export const useSafeGetBooks = (searchValue?: string) => {
  const absAPI = useSafeAbsAPI();
  const sortedBy = useSortedBy();

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
      if (!absAPI) throw new Error('Not authenticated');
      return await absAPI.getLibraryItems({ libraryId: activeLibraryId });
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
    return sortBy(filteredData, [sortedBy]);
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
//# useGetItemDetails
//# ----------------------------------------------
export const useGetItemDetails = (itemId?: string) => {
  const absAPI = useAbsAPI();

  const { data, isPending, isError, isLoading, error, ...rest } = useQuery({
    queryKey: ["itemDetails", itemId],
    queryFn: async () => await absAPI.getItemDetails(itemId),
    enabled: !!itemId, // Only run query if itemId is provided
    staleTime: 1000,
  });

  return { data, isPending, isError, isLoading, error, ...rest };
};

//# ----------------------------------------------
//# useSafeGetItemDetails - Safe version that handles unauthenticated state
//# ----------------------------------------------
export const useSafeGetItemDetails = (itemId?: string) => {
  const absAPI = useSafeAbsAPI();

  // Always call useQuery, but control when it's enabled
  const { data, isPending, isError, isLoading, error, ...rest } = useQuery({
    queryKey: ["itemDetails", itemId],
    queryFn: async () => {
      if (!absAPI) throw new Error('Not authenticated');
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
