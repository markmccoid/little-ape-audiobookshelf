import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { mmkvStorage } from "./mmkv-storage";

// Define sort options type
export type SortBy = "addedAt" | "author" | "title" | "duration" | "publishedYear";
export type SortDirection = "asc" | "desc";

// Define the state interface
interface FiltersState {
  searchValue: string;
  genres: string[];
  tags: string[];
  author: string;
  sortedBy: SortBy;
  sortDirection: SortDirection;
}

// Define the actions interface
interface FiltersActions {
  setSearchValue: (value: string) => void;
  setGenres: (genres: string[]) => void;
  addGenre: (genre: string) => void;
  removeGenre: (genre: string) => void;
  clearGenres: () => void;
  setTags: (tags: string[]) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  clearTags: () => void;
  setAuthor: (author: string) => void;
  setSortedBy: (sortBy: SortBy) => void;
  setSortDirection: (sortDir: SortDirection) => void;
  clearAllFilters: () => void;
  clearSearchAndAuthor: () => void;
}

// Combined store interface
interface FiltersStore extends FiltersState {
  actions: FiltersActions;
}

// Default values
const DEFAULT_SEARCH_VALUE = "";
const DEFAULT_GENRES: string[] = [];
const DEFAULT_TAGS: string[] = [];
const DEFAULT_AUTHOR = "";
const DEFAULT_SORTED_BY: SortBy = "addedAt";

// Create the store (not exported directly - following best practices)
const useFiltersStore = create<FiltersStore>()(
  persist(
    (set, get) => ({
      // State
      searchValue: DEFAULT_SEARCH_VALUE,
      genres: DEFAULT_GENRES,
      tags: DEFAULT_TAGS,
      author: DEFAULT_AUTHOR,
      sortedBy: DEFAULT_SORTED_BY,
      sortDirection: "desc",

      // Actions grouped in a separate namespace
      actions: {
        setSearchValue: (value: string) => set({ searchValue: value }),
        setGenres: (genres: string[]) => set({ genres }),

        addGenre: (genre: string) =>
          set((state) => ({
            genres: state.genres.includes(genre) ? state.genres : [...state.genres, genre],
          })),

        removeGenre: (genre: string) =>
          set((state) => ({
            genres: state.genres.filter((g) => g !== genre),
          })),

        clearGenres: () => set({ genres: [] }),

        setTags: (tags: string[]) => set({ tags }),

        addTag: (tag: string) =>
          set((state) => ({
            tags: state.tags.includes(tag) ? state.tags : [...state.tags, tag],
          })),

        removeTag: (tag: string) =>
          set((state) => ({
            tags: state.tags.filter((t) => t !== tag),
          })),

        clearTags: () => set({ tags: [] }),

        setAuthor: (author: string) => set({ author }),

        setSortedBy: (sortBy: SortBy) => set({ sortedBy: sortBy }),

        setSortDirection: (sortDir) => set({ sortDirection: sortDir }),

        clearAllFilters: () =>
          set({
            searchValue: DEFAULT_SEARCH_VALUE,
            genres: DEFAULT_GENRES,
            tags: DEFAULT_TAGS,
            author: DEFAULT_AUTHOR,
            sortedBy: DEFAULT_SORTED_BY,
          }),
        clearSearchAndAuthor: () =>
          set({
            searchValue: DEFAULT_SEARCH_VALUE,
            author: DEFAULT_AUTHOR,
          }),
      },
    }),
    {
      name: "filters-storage", // Storage key
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist the state, not the actions
      partialize: (state) => ({
        // searchValue: state.searchValue,
        // genres: state.genres,
        // tags: state.tags,
        // author: state.author,
        sortedBy: state.sortedBy,
      }),
    }
  )
);

// Exported custom hooks following best practices
// Only export atomic selectors to prevent unnecessary re-renders

/**
 * Hook to get the search value
 */
export const useSearchValue = () => useFiltersStore((state) => state.searchValue);

/**
 * Hook to get the selected genres array
 */
export const useGenres = () => useFiltersStore((state) => state.genres);

/**
 * Hook to get the selected tags array
 */
export const useTags = () => useFiltersStore((state) => state.tags);

/**
 * Hook to get the author value
 */
export const useAuthor = () => useFiltersStore((state) => state.author);

/**
 * Hook to get the sortedBy value
 */
export const useSortedBy = () => useFiltersStore((state) => state.sortedBy);

export const useSortDirection = () => useFiltersStore((state) => state.sortDirection);
/**
 * Hook to get all filter actions
 * Since actions never change, it's safe to return all of them
 */
export const useFiltersActions = () => useFiltersStore((state) => state.actions);

/**
 * Hook to get all filter values at once
 * Use this when you need multiple values in the same component
 */
export const useAllFilters = () =>
  useFiltersStore((state) => ({
    searchValue: state.searchValue,
    genres: state.genres,
    tags: state.tags,
    author: state.author,
    sortedBy: state.sortedBy,
  }));

/**
 * Hook to check if any filters are active
 * Useful for showing clear filters button or filter indicators
 */
export const useHasActiveFilters = () =>
  useFiltersStore(
    (state) =>
      state.searchValue !== DEFAULT_SEARCH_VALUE ||
      state.genres.length > 0 ||
      state.tags.length > 0 ||
      state.author !== DEFAULT_AUTHOR ||
      state.sortedBy !== DEFAULT_SORTED_BY
  );

/**
 * Hook to get filter counts for UI indicators
 */
export const useFilterCounts = () =>
  useFiltersStore((state) => ({
    genresCount: state.genres.length,
    tagsCount: state.tags.length,
    hasSearch: state.searchValue !== DEFAULT_SEARCH_VALUE,
    hasAuthor: state.author !== DEFAULT_AUTHOR,
    hasCustomSort: state.sortedBy !== DEFAULT_SORTED_BY,
    totalActiveFilters:
      (state.searchValue !== DEFAULT_SEARCH_VALUE ? 1 : 0) +
      state.genres.length +
      state.tags.length +
      (state.author !== DEFAULT_AUTHOR ? 1 : 0) +
      (state.sortedBy !== DEFAULT_SORTED_BY ? 1 : 0),
  }));
