import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { mmkvStorage } from "./mmkv-storage";

// Define the book object type
export type Book = {
  userId: string;
  libraryItemId: string;
  title?: string;
  playbackSpeed: number;
  isDownloaded: boolean;
};

// Define the state interface
interface BooksState {
  books: Book[];
}

// Define the actions interface
interface BooksActions {
  setBooks: (books: Book[]) => void;
  getSavedBook: (bookItem: Partial<Book>) => Book | undefined;
  updateBook: (libraryItemId: string, updates: Partial<Omit<Book, "libraryItemId">>) => void;
  removeBook: (libraryItemId: string) => void;
  clearBooks: () => void;
  getBook: (libraryItemId: string) => Book | undefined;
  updatePlaybackSpeed: (libraryItemId: string, speed: number) => void;
  updateIsDownloaded: (libraryItemId: string, isDownloaded: boolean) => void;
}

// Combined store interface
interface BooksStore extends BooksState {
  actions: BooksActions;
}

// Default values
const DEFAULT_BOOKS: Book[] = [];

// Create the store (not exported directly - following best practices)
export const useBooksStore = create<BooksStore>()(
  persist(
    (set, get) => ({
      // State
      books: DEFAULT_BOOKS,

      // Actions grouped in a separate namespace
      actions: {
        setBooks: (books: Book[]) => set({ books }),

        getSavedBook: (bookItem) => {
          // Validation check

          if (!bookItem?.libraryItemId || !bookItem.userId) return undefined;

          // Check if book already exists
          // If book already exists, spread the new items thus updating the fields
          // We don't pass playbackSpeed or isDownloaded, etc.  Those won't update.
          const foundBook = get().books.find(
            (b) => b.libraryItemId === bookItem.libraryItemId && b.userId === bookItem.userId
          );
          if (foundBook) {
            console.log("Book Found", foundBook.title, foundBook.userId);
            return { ...foundBook };
          }

          // Add the book
          const newBook: Book = {
            userId: bookItem.userId || "",
            libraryItemId: bookItem.libraryItemId,
            title: bookItem?.title || "",
            playbackSpeed: 1,
            isDownloaded: false,
          };
          console.log("Saving Book ", newBook);
          set((state) => {
            return { books: [...state.books, newBook] };
          });

          return newBook;
        },

        updateBook: (libraryItemId: string, updates: Partial<Omit<Book, "libraryItemId">>) =>
          set((state) => ({
            books: state.books.map((book) =>
              book.libraryItemId === libraryItemId ? { ...book, ...updates } : book
            ),
          })),

        removeBook: (libraryItemId: string) =>
          set((state) => ({
            books: state.books.filter((book) => book.libraryItemId !== libraryItemId),
          })),

        clearBooks: () => set({ books: DEFAULT_BOOKS }),

        getBook: (libraryItemId: string) => {
          const state = get();
          return state.books.find((book) => book.libraryItemId === libraryItemId);
        },

        updatePlaybackSpeed: (libraryItemId: string, speed: number) => {
          set((state) => ({
            books: state.books.map((book) =>
              book.libraryItemId === libraryItemId ? { ...book, playbackSpeed: speed } : book
            ),
          }));
        },

        updateIsDownloaded: (libraryItemId: string, isDownloaded: boolean) =>
          set((state) => ({
            books: state.books.map((book) =>
              book.libraryItemId === libraryItemId ? { ...book, isDownloaded } : book
            ),
          })),
      },
    }),
    {
      name: "books-storage", // Storage key
      storage: createJSONStorage(() => mmkvStorage),
      // Persist the entire books array
      partialize: (state) => ({
        books: state.books,
      }),
    }
  )
);

// Exported custom hooks following best practices
// Only export atomic selectors to prevent unnecessary re-renders

/**
 * Hook to get all books
 */
export const useBooks = () => useBooksStore((state) => state.books);

/**
 * Hook to get a specific book by libraryItemId
 */
export const useBook = (libraryItemId: string) =>
  useBooksStore((state) => state.books.find((book) => book.libraryItemId === libraryItemId));

/**
 * Hook to get all book actions
 * Since actions never change, it's safe to return all of them
 */
export const useBooksActions = () => useBooksStore((state) => state.actions);

/**
 * Hook to get the total number of books
 */
export const useBooksCount = () => useBooksStore((state) => state.books.length);

/**
 * Hook to get the number of downloaded books
 */
export const useDownloadedBooksCount = () =>
  useBooksStore((state) => state.books.filter((book) => book.isDownloaded).length);

/**
 * Hook to get all downloaded books
 */
export const useDownloadedBooks = () =>
  useBooksStore((state) => state.books.filter((book) => book.isDownloaded));

/**
 * Hook to check if a specific book is downloaded
 */
export const useIsBookDownloaded = (libraryItemId: string) =>
  useBooksStore((state) => {
    const book = state.books.find((b) => b.libraryItemId === libraryItemId);
    return book?.isDownloaded ?? false;
  });

/**
 * Hook to get playback speed for a specific book
 */
export const useBookPlaybackSpeed = (libraryItemId: string) =>
  useBooksStore((state) => {
    const book = state.books.find((b) => b.libraryItemId === libraryItemId);
    return book?.playbackSpeed ?? 1.0;
  });
