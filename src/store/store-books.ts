import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { getAbsAPI } from "../utils/AudiobookShelf/absInit";
import { Author, Bookmark } from "../utils/AudiobookShelf/abstypes";
import { BookShelfBook, BookShelfItemType } from "../utils/AudiobookShelf/absUtils";
import {
  BookShelfKeyById,
  BookShelves,
  DefaultShelfId,
} from "../utils/AudiobookShelf/bookshelfTypes";
import { formatSeconds } from "../utils/formatUtils";
import { mmkvStorage } from "./mmkv-storage";
import { useSettingsStore } from "./store-settings";

export type EnhancedChapter = {
  id: number;
  title: string;
  startSeconds: number;
  endSeconds: number;
  formattedStart: string;
  formattedEnd: string;
  chapterDuration: number;
  formattedChapterDuration: string;
  completedPercentage: number;
  remainingPercentage: number;
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
  tags?: string[];
  description?: string;
  coverURI?: string;
  publishedYear?: string;
  playbackRate: number;
  isDownloaded: boolean;
  downloadProgress?: number; // 0-100, for future download UI
  localPath?: string; // Local file path for downloaded books
  currentPosition: number;
  lastProgressUpdate: number | undefined; // date that progress was last update.  Use to sort in Continue Listening
  duration?: number;
  lastUpdated?: number;
  chapters?: EnhancedChapter[];
  //continue-listening, discover, etc
  bookShelfTypes?: DefaultShelfId[];

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

// export type SavedBookMark = {
//   time: number;
//   title: string;
//   createdAt: number;
// };
type BookInfoRecord = {
  bookmarks: Omit<Bookmark, "libraryItemId">[];
};
type LibraryItemId = string;
export type BookInfo = Record<LibraryItemId, BookInfoRecord>;

// Define the state interface
interface BooksState {
  // Holds the base information about a book needed to display the book
  books: Book[];
  // Holds additional information -- Bookkmarks
  bookInfo: BookInfo;
  bookshelves: BookShelves;
}

// Define the actions interface
interface BooksActions {
  setBooks: (books: Book[]) => void;
  getOrFetchBook: (params: { userId: string; libraryItemId: string }) => Promise<Book>;
  updateBook: (libraryItemId: string, updates: Partial<Omit<Book, "libraryItemId">>) => void;
  removeBook: (libraryItemId: string) => void;
  addBooks: (userId: string, books: BookShelfBook[], bookshelfId: DefaultShelfId) => Promise<void>;
  clearBooks: () => void;
  getBook: (libraryItemId: string) => Book | undefined;
  addBookmark: (
    libraryItemId: string,
    { time, title }: Pick<Bookmark, "time" | "title">
  ) => Promise<void>;
  deleteBookmark: (LibraryItemId: string, time: number) => Promise<void>;
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
    immer((set, get) => ({
      // State
      books: DEFAULT_BOOKS,
      bookInfo: {},
      bookshelves: undefined,
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

        addBookmark: async (libraryItemId, { time, title }) => {
          const absAPI = getAbsAPI();
          const currentBookInfo = get().bookInfo;
          // Ensure the libraryItemId entry exists
          const existingRecord = currentBookInfo?.[libraryItemId]?.bookmarks
            ? currentBookInfo?.[libraryItemId]
            : { bookmarks: [] };
          const existingBookmarks = existingRecord.bookmarks;

          // Check if a bookmark with the same time already exists
          const bookmarkExists = existingBookmarks.some((b) => b.time === time);

          let updatedBookmarks: typeof existingBookmarks;

          const newBookmark = { time, title, createdAt: Date.now() };
          if (bookmarkExists) {
            // Overwrite: replace the bookmark with the same time
            updatedBookmarks = existingBookmarks.map((b) => (b.time === time ? newBookmark : b));
          } else {
            // Add new bookmark
            updatedBookmarks = [...existingBookmarks, newBookmark];
          }

          // Update state immutably
          set({
            bookInfo: {
              ...currentBookInfo,
              [libraryItemId]: {
                bookmarks: updatedBookmarks,
              },
            },
          });

          //~ Post to ABS database
          try {
            absAPI.saveBookmark(libraryItemId, newBookmark);
          } catch (e) {
            console.log("Error saving Bookmark", e);
          }
        },

        deleteBookmark: async (libraryItemId, time) => {
          const absAPI = getAbsAPI();

          // Update state optimistically FIRST
          set((state) => {
            const bookmarks = state.bookInfo?.[libraryItemId]?.bookmarks;
            if (bookmarks) {
              state.bookInfo[libraryItemId].bookmarks = bookmarks.filter(
                (bookmark: Omit<Bookmark, "libraryItemId">) => bookmark.time !== time
              );
            }
          });

          // Then make the API call
          try {
            await absAPI.deleteBookmark(libraryItemId, time);
          } catch (error) {
            // Optionally: rollback or handle error
            console.error("Failed to delete bookmark:", error);
          }
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

        //! -- ADD BOOKS for BookShelves
        addBooks: async (userId, books, bookshelfId) => {
          const storeBooks = get().books;
          const storeBookIdsForType = new Set(
            storeBooks
              .filter((el) => el.bookShelfTypes?.includes(bookshelfId))
              .map((item) => item.libraryItemId)
          );

          let libItemIdsToFetch = [];
          // Loop through user's personalized feed that is sent
          for (let liveBook of books) {
            //~ Remove any books from bookshelf that no longer exist in live shelf
            if (!storeBookIdsForType.has(liveBook.libraryItemId)) {
              const bookToRemove = storeBooks.find(
                (el) => el.libraryItemId === liveBook.libraryItemId
              );
              // update book and remove the type
              if (bookToRemove) {
                bookToRemove.bookShelfTypes = [
                  ...(bookToRemove.bookShelfTypes || []).filter((el) => el === bookshelfId),
                ];
              }
            }
            let foundBook = storeBooks.find((el) => el.libraryItemId === liveBook.libraryItemId);
            if (foundBook) {
              //! Add the bookshelf type (merge with existing types)
              // Using Set so that we don't get dups.
              const currTypes = new Set(foundBook.bookShelfTypes);
              currTypes.add(bookshelfId);
              foundBook.bookShelfTypes = [...currTypes];
            } else {
              libItemIdsToFetch.push(liveBook.libraryItemId);
            }
          }

          await Promise.all(
            libItemIdsToFetch.map((libraryItemId) =>
              get().actions.getOrFetchBook({ userId, libraryItemId })
            )
          );

          //!! Update the bookshelves key
          const bookshelves = get().bookshelves || {};
          const booksForShelf = books.map((el) => el.libraryItemId);
          const updatedBookshelves = {
            ...bookshelves,
            [BookShelfKeyById[bookshelfId]]: booksForShelf,
          } as BookShelves;
          set({ bookshelves: updatedBookshelves });
        },

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
            lastProgressUpdate: undefined,
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
                completedPercentage: 0,
                remainingPercentage: 100,
              },
            ] as EnhancedChapter[];
            // Get actual chapters if they exists
            const absLoadedChapters = itemDetails?.media?.chapters?.map((chapter) => {
              return {
                id: chapter.id,
                title: chapter.title,
                startSeconds: Math.round(chapter.start),
                endSeconds: Math.round(chapter.end),
                formattedStart: formatSeconds(chapter.start, "compact"),
                formattedEnd: formatSeconds(chapter.end, "compact"),
                chapterDuration: Math.round(chapter.end - chapter.start),
                formattedChapterDuration: formatSeconds(
                  Math.round(chapter.end - chapter.start),
                  "compact"
                ),
                completedPercentage: Math.round(
                  (chapter.start / itemDetails?.media.duration) * 100
                ),
                remainingPercentage: Math.round(
                  ((itemDetails?.media.duration - chapter.start) / itemDetails?.media.duration) *
                    100
                ),
              } as EnhancedChapter;
            });
            // Finalize the chapter selection, fallback if none exist
            const enhancedChapters =
              !absLoadedChapters || absLoadedChapters.length === 0
                ? chapterFallback
                : absLoadedChapters;
            // create a new book record or update an existing one
            console.log(
              "--getOrFetchBook--",
              itemDetails?.media.metadata.title,
              itemDetails.userMediaProgress?.lastUpdate
            );
            const updated: Book = {
              ...book, // If new, the fallback has the libraryItemId & userId in it
              title: itemDetails?.media?.metadata?.title || "",
              author: itemDetails?.media?.metadata?.authorName || "",
              description: itemDetails?.media?.metadata?.description || "",
              narratedBy: itemDetails?.media?.metadata?.narratorName || "",
              genre: itemDetails?.media?.metadata?.genres.join(", "),
              genres: itemDetails?.media?.metadata?.genres,
              tags: itemDetails?.media?.tags,
              currentPosition: itemDetails?.userMediaProgress?.currentTime || 0,
              lastProgressUpdate: itemDetails?.userMediaProgress?.lastUpdate || undefined,
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

            // console.log(
            //   `[BooksStore] Background refresh complete: ${libraryItemId}`,
            //   itemDetails?.media?.tags
            // );
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
    })),
    {
      name: "books-storage", // Storage key
      storage: createJSONStorage(() => mmkvStorage),
      // Persist the entire books array
      partialize: (state) => ({
        books: state.books,
        bookInfo: state.bookInfo,
        bookshelves: state.bookshelves,
      }),
    }
  )
);

// Exported custom hooks following best practices
// Only export atomic selectors to prevent unnecessary re-renders

/**
 * Hook to get bookshelf books
 */
//# -------------------------------------------
//# Selector to get all the bookshelves to display as defined in Settings
//# -------------------------------------------
export const useBookShelves = () => {
  const books = useBooksStore((state) => state.books);
  const bookshelves = useBooksStore((state) => state.bookshelves);
  // Settings has a list of all bookshelves available
  const allBookshelves = useSettingsStore((state) => state.allBookshelves);
  // Settings has a list of chosen bookshelves to display (in order to be displayed)
  const bookshelvesToRender = useSettingsStore((state) => state.bookshelvesToDisplay);

  if (!bookshelves) return;

  // list of bookshelves in format UI is expecting
  let finalBookshelves: BookShelfItemType[] = [];
  for (let bookshelfId of bookshelvesToRender) {
    const currBookshelf = allBookshelves.find((el) => el.id === bookshelfId);

    if (!currBookshelf) continue;
    const currBookshelfKey = currBookshelf?.key;

    const currObj = {
      id: currBookshelf.id,
      label: currBookshelf.label,
      key: currBookshelf.key,
      books: (bookshelves[currBookshelfKey] || [])
        .map((bookId) => {
          return books.find((el) => el.libraryItemId === bookId);
        })
        .filter((book): book is Book => !!book),
    };
    finalBookshelves.push(currObj);
  }
  return finalBookshelves;
};

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
