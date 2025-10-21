import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getAbsAPI } from "../utils/AudiobookShelf/absInit";
import { PersonalizedView } from "../utils/AudiobookShelf/abstypes";
import { mmkvStorage } from "./mmkv-storage";

// Define the book object type
export type Book = {
  userId: string;
  libraryItemId: string;
  title?: string;
  author?: string;
  narratedBy?: string;
  genre?: string;
  description?: string;
  pictureURI?: string;
  year?: number;
  playbackSpeed: number;
  isDownloaded: boolean;
  currentPosition: number;
  duration?: number;
  lastUpdated?: number;
  //continue-listening, discover, etc
  bookShelfType?: PersonalizedView["type"] | undefined;
  // bookshelf - see bookShelfType for specific type
  // downloaded - downloaded book
  // temporary - a book accessed
  //!! a book in a bookshelf, can be downloaded.
  //!! What causes the type to be set?? If added from a bookshelf
  //!! always set, if downloaded always set
  //!! if temporary only set if book doesn't exist.  This means that
  //!! a temporary book with have its type overwritten if it is downloaded or part of a bookshelf

  //!! But what happens when a temporary book is listened to and has its playbackrate changed?
  //!! I think we still cleanup a temporary book after a month of inactivity
  type: "bookshelf" | "downloaded" | "temporary";
};

// Define the state interface
interface BooksState {
  books: Book[];
}

// Define the actions interface
interface BooksActions {
  setBooks: (books: Book[]) => void;
  getOrFetchBook: (params: { userId: string; libraryItemId: string }) => Promise<Book>;
  updateBook: (libraryItemId: string, updates: Partial<Omit<Book, "libraryItemId">>) => void;
  removeBook: (libraryItemId: string) => void;
  clearBooks: () => void;
  getBook: (libraryItemId: string) => Book | undefined;
  updatePlaybackSpeed: (libraryItemId: string, speed: number) => void;
  updateIsDownloaded: (libraryItemId: string, isDownloaded: boolean) => void;
  updateCurrentPosition: (libraryItemId: string, position: number, duration?: number) => void;
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

        getOrFetchBook: async ({ userId, libraryItemId }) => {
          console.log(`[BooksStore] getOrFetchBook called for: ${libraryItemId}--${userId}`);

          const { books } = get();
          const now = Date.now();

          const existingBook = books.find(
            (b) => b.libraryItemId === libraryItemId && b.userId === userId
          );

          const fallback: Book = {
            userId,
            libraryItemId,
            playbackSpeed: 1,
            isDownloaded: false,
            currentPosition: 0,
            duration: 0,
            lastUpdated: now,
          };

          const book = existingBook ?? fallback;

          // Return immediately
          const STALE_AFTER_MS = 5 * 60 * 1000; // 5 min
          const isStale = !existingBook || now - (existingBook.lastUpdated ?? 0) > STALE_AFTER_MS;
          // console.log("IS STALE OR NOT EXISTING BOOK", isStale, !existingBook);

          if (isStale) {
            (async () => {
              try {
                // const { getAbsAPI } = require("@/src/utils/AudiobookShelf/absInit");
                const absAPI = getAbsAPI();
                // const progress = await absAPI.getBookProgress(libraryItemId);
                const itemDetails = await absAPI.getItemDetails(libraryItemId);

                const updated: Book = {
                  ...book,
                  title: itemDetails?.media?.metadata?.title || "",
                  author: itemDetails?.media?.metadata?.authorName || "",
                  description: itemDetails?.media?.metadata?.description || "",
                  narratedBy: itemDetails?.media?.metadata?.narratorName || "",
                  genre: itemDetails?.media?.metadata?.genres.join(", "),
                  currentPosition: itemDetails?.userMediaProgress?.currentTime || 0,
                  duration: itemDetails?.userMediaProgress?.duration || 0,
                  lastUpdated: Date.now(),
                };

                set((s) => ({
                  books: [...s.books.filter((b) => b.libraryItemId !== libraryItemId), updated],
                }));

                console.log(`[BooksStore] Background refresh complete: ${libraryItemId}`);
              } catch (err) {
                console.warn(`[BooksStore] Background refresh failed: ${libraryItemId}`, err);
              }
            })();
          }

          return book;
        },

        updateCurrentPosition: (libraryItemId, position, duration) => {
          // console.log(`[BooksStore] updateCurrentPosition called:`, {
          //   libraryItemId,
          //   position,
          //   duration,
          // });

          set((state) => ({
            books: state.books.map((book) =>
              book.libraryItemId === libraryItemId
                ? {
                    ...book,
                    currentPosition: position,
                    duration: duration ?? book.duration,
                    lastUpdated: Date.now(),
                  }
                : book
            ),
          }));

          // Log the updated book
          const updatedBook = get().books.find((b) => b.libraryItemId === libraryItemId);
        },
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
