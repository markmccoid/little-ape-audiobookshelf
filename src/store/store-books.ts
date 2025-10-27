import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getAbsAPI } from "../utils/AudiobookShelf/absInit";
import { Author } from "../utils/AudiobookShelf/abstypes";
import { formatSeconds } from "../utils/formatUtils";
import { mmkvStorage } from "./mmkv-storage";

export type EnhancedChapter = {
  id: number;
  title: string;
  startSeconds: number;
  endSeconds: number;
  formattedStart: string;
  formattedEnd: string;
  chapterDuration: number;
  formattedChapterDuration: string;
};
// Define the book object type
export type Book = {
  userId: string;
  libraryItemId: string;
  title?: string;
  author?: string;
  // authors will give you an array of "id", "name", for the authors
  // will make search for authors more exact, since we will have the id.
  authors?: Author[];
  narratedBy?: string;
  genre?: string;
  genres?: string[];
  description?: string;
  coverURI?: string;
  publishedYear?: string;
  playbackRate: number;
  isDownloaded: boolean;
  currentPosition: number;
  duration?: number;
  lastUpdated?: number;
  chapters?: EnhancedChapter[];
  //continue-listening, discover, etc
  bookShelfType?:
    | "continue-listening"
    | "discover"
    | "recently-added"
    | "recent-series"
    | "listen-again"
    | "newest-authors";
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
  updateBookPlaybackRate: (libraryItemId: string, speed: number) => void;
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

        updateBookPlaybackRate: (libraryItemId: string, speed: number) => {
          console.log("BOOK updated", speed);
          set((state) => ({
            books: state.books.map((book) =>
              book.libraryItemId === libraryItemId ? { ...book, playbackRate: speed } : book
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
          // console.log(`[BooksStore] getOrFetchBook called for: ${libraryItemId}--${userId}`);

          const { books } = get();
          const now = Date.now();

          const existingBook = books.find(
            (b) => b.libraryItemId === libraryItemId && b.userId === userId
          );

          const fallback: Book = {
            userId,
            libraryItemId,
            playbackRate: 1,
            isDownloaded: false,
            currentPosition: 0,
            duration: 0,
            lastUpdated: now,
            type: "temporary",
          };

          // const book = fallback;
          const book = existingBook ?? fallback;

          // // Return immediately
          // const STALE_AFTER_MS = 5 * 60 * 1000; // 5 min
          // const isStale = !existingBook || now - (existingBook.lastUpdated ?? 0) > STALE_AFTER_MS;

          try {
            // const { getAbsAPI } = require("@/src/utils/AudiobookShelf/absInit");
            const absAPI = getAbsAPI();
            const itemDetails = await absAPI.getItemDetails(libraryItemId);
            // Create a fallback chapter for books with NO chapters defined.
            // We make it a single chapter, starting at zero and ending at the duration of the book.
            const chapterFallback = [
              {
                id: 1,
                title: itemDetails?.media?.metadata.title,
                startSeconds: 0,
                endSeconds: itemDetails?.media.duration,
                formattedStart: formatSeconds(0, "compact"),
                formattedEnd: formatSeconds(itemDetails?.media.duration, "compact"),
                chapterDuration: itemDetails?.media.duration,
                formattedChapterDuration: formatSeconds(itemDetails?.media.duration, "compact"),
              },
            ] as EnhancedChapter[];
            // Get actual chapters if they exists
            const absLoadedChapters = itemDetails?.media?.chapters?.map((book) => {
              return {
                id: book.id,
                title: book.title,
                startSeconds: Math.round(book.start),
                endSeconds: Math.round(book.end),
                formattedStart: formatSeconds(book.start, "compact"),
                formattedEnd: formatSeconds(book.end, "compact"),
                chapterDuration: Math.round(book.end - book.start),
                formattedChapterDuration: formatSeconds(
                  Math.round(book.end - book.start),
                  "compact"
                ),
              } as EnhancedChapter;
            });
            // Finalize the chapter selection, fallback if none exist
            const enhancedChapters =
              !absLoadedChapters || absLoadedChapters.length === 0
                ? chapterFallback
                : absLoadedChapters;

            // create a new book record or update an existing one
            const updated: Book = {
              ...book, // If new, the fallback has the libraryItemId & userId in it
              title: itemDetails?.media?.metadata?.title || "",
              author: itemDetails?.media?.metadata?.authorName || "",
              description: itemDetails?.media?.metadata?.description || "",
              narratedBy: itemDetails?.media?.metadata?.narratorName || "",
              genre: itemDetails?.media?.metadata?.genres.join(", "),
              genres: itemDetails?.media?.metadata?.genres,
              // currentPosition: itemDetails?.userMediaProgress?.currentTime || 0,
              duration: itemDetails?.media.duration || 0,
              coverURI: itemDetails?.coverURI,
              publishedYear: itemDetails?.media?.metadata.publishedYear,
              chapters: enhancedChapters,
              authors: itemDetails?.media?.metadata?.authors,
              lastUpdated: Date.now(),
            };

            set((s) => ({
              books: [...s.books.filter((b) => b.libraryItemId !== libraryItemId), updated],
            }));

            console.log(`[BooksStore] Background refresh complete: ${libraryItemId}`);
          } catch (err) {
            console.warn(`[BooksStore] Background refresh failed: ${libraryItemId}`, err);
          }

          return book;
        },

        updateCurrentPosition: (libraryItemId, position) => {
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
    return book?.playbackRate ?? 1.0;
  });
