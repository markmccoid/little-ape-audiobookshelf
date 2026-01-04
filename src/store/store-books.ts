import { sortBy } from "es-toolkit";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { AudiobookshelfAuth } from "../utils/AudiobookShelf/absAuthClass";
import { getAbsAPI } from "../utils/AudiobookShelf/absInit";
import { Author, Bookmark } from "../utils/AudiobookShelf/abstypes";
import {
  BookShelfBook,
  BookShelfItemType,
  BookshelvesState,
} from "../utils/AudiobookShelf/bookshelfTypes";
import { deleteFromFileSystem, downloadFileBlob } from "../utils/fileSystemAccess";
import { formatSeconds } from "../utils/formatUtils";
import { syncQueue } from "../utils/syncQueue";
import { mmkvStorage } from "./mmkv-storage";
import { addSyncLogEntry, formatPositionForLog } from "./store-debuglogs";
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
  localPath?: string; // Local file path for downloaded books
  // currentPosition: number;
  lastProgressUpdate: number | undefined; // date that progress was last update.  Use to sort in Continue Listening
  duration?: number;
  lastUpdated?: number;
  chapters?: EnhancedChapter[];
  //continue-listening, discover, etc
  bookShelfTypes?: string[];

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
  isDownloaded: boolean;
  type: "bookshelf" | "downloaded" | "temporary";
  totalFileSizeMB?: number;
  numberOfAudioFiles?: number;
};

// export type SavedBookMark = {
//   time: number;
//   title: string;
//   createdAt: number;
// };
type PositionInformation = {
  currentPosition: number;
  lastProgressUpdate: number | undefined;
};
type BookInfoRecord = {
  bookmarks: Omit<Bookmark, "libraryItemId">[];
  positionInfo: PositionInformation;
};
type LibraryItemId = string;
export type BookInfo = Record<LibraryItemId, BookInfoRecord>;

export type AudioTrackInfo = {
  ino: string;
  filename: string;
  cleanFileName: string;
  startOffset?: number;
  duration?: number;
};
type DownloadInfo = {
  audioTracks: AudioTrackInfo[];
};
// Define the state interface
interface BooksState {
  // Holds the base information about a book needed to display the book
  books: Book[];
  // Holds additional information -- Bookkmarks
  bookInfo: BookInfo;
  // Object mapping bookshelf IDs to arrays of book IDs
  bookshelves: BookshelvesState;
  //# -- Download state --
  // downloadInfo Object
  downloadedBookData: Record<LibraryItemId, DownloadInfo>;
  // Monotonic token for download session identity
  downloadToken: number;
  // Active cancel function for current file download
  activeCancelFn?: () => Promise<void>;
  downloadProgress:
    | {
        libraryItemId: string;
        currentFileProcessing: string;
        progress: number;
        received: number;
        total: number;
        numberOfFiles: number;
        numberOfFilesDownloaded: number;
        downloadCompleted: boolean;
      }
    | undefined;
}

// Define the actions interface
interface BooksActions {
  setBooks: (books: Book[]) => void;
  getOrFetchBook: ({ libraryItemId }: { libraryItemId: string }) => Promise<Book>;
  updateBook: (libraryItemId: string, updates: Partial<Omit<Book, "libraryItemId">>) => void;
  removeBook: (libraryItemId: string) => void;
  // -- START BOOKSHELF ACTIONS --
  addBooksToBookshelf: (
    books: Pick<BookShelfBook, "libraryItemId">[],
    bookshelfId: string
  ) => Promise<void>;
  removeBookFromBookshelf: (libraryItemId: string, bookshelfId: string) => Promise<void>;
  addBookToBookshelf: (libraryItemId: string, bookshelfId: string) => Promise<void>;
  // Delete the bookshelf from the bookshelves variable { 'bookshelfid': [...books], ... }
  deleteBookshelf: (bookshelfId: string) => void;
  // Used for reordering books in a bookshelf.  This updates the full list of books for a bookshelf
  // DO NOT send a partial list of books.  Send the full list of books for the shelf.
  updateBookshelfBooks: (bookshelfId: string, books: string[]) => void;
  // -- END BOOKSHELF ACTIONS --
  clearBooks: () => void;
  getBook: (libraryItemId: string) => Book | undefined;
  addBookmark: (
    libraryItemId: string,
    { time, title }: Pick<Bookmark, "time" | "title">
  ) => Promise<void>;
  deleteBookmark: (LibraryItemId: string, time: number) => Promise<void>;
  updateBookPlaybackRate: (libraryItemId: string, speed: number) => void;
  updateIsDownloaded: (libraryItemId: string, isDownloaded: boolean) => void;
  // updates bookInfo.positionInfo for a specific book
  updateCurrentPosition: (libraryItemId: string, position: number) => void;
  // updates bookInfo.positionInfo for multiple books
  updateMappedProgressPositions: (mappedProgress: Record<string, { currentTime?: number }>) => void;
  downloadBook: (libraryItemId: string | undefined) => Promise<void>;
  cancelDownload: () => Promise<void>;
  updateDownloadProgress: (
    libraryItemId: string,
    fileName: string,
    received: number,
    total: number,
    numberOfFiles: number,
    numberOfFilesDownloaded: number,
    downloadCompleted: boolean
  ) => void;
  getDownloadStatus: (
    libraryItemId: string
  ) => "ready" | "downloading" | "processing" | "completed";
  // delete downloaded book data and update book.isDownloaded to false and book.type to temporary
  deleteDownloadedBookData: (libraryItemId: string) => void;
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
      bookshelves: {},
      downloadedBookData: {},
      downloadToken: 0,
      activeCancelFn: undefined,
      downloadProgress: undefined,
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

        clearBooks: () => set({ books: DEFAULT_BOOKS, bookInfo: {}, bookshelves: {} }),

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

          // Update state immer syntax
          set((state) => {
            state.bookInfo[libraryItemId].bookmarks = updatedBookmarks;
          });
          // Update state immutably
          // set({
          //   bookInfo: { ...currentBookInfo, [libraryItemId]: { bookmarks: updatedBookmarks } },
          // });

          //~ Post to ABS database
          try {
            absAPI.saveBookmark(libraryItemId, { ...newBookmark, libraryItemId });
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

        //#
        removeBookFromBookshelf: async (libraryItemId, bookshelfId) => {
          set((state) => {
            state.bookshelves[bookshelfId] = state.bookshelves[bookshelfId].filter(
              (bookId) => bookId !== libraryItemId
            );
          });
        },

        addBookToBookshelf: async (libraryItemId, bookshelfId) => {
          const storeBooks = get().books;
          // If we don't have the book in our local store-books, then queue it up to load.
          const foundBook = storeBooks.find((el) => el.libraryItemId === libraryItemId);
          if (!foundBook) {
            await get().actions.getOrFetchBook({ libraryItemId });
          }

          set((state) => {
            // add book as first item in set then store as array in bookshelves
            let currBookshelfSet = new Set(state.bookshelves[bookshelfId]);
            const currSet = new Set([libraryItemId, ...currBookshelfSet]);
            state.bookshelves[bookshelfId] = [...currSet];
          });
        },
        deleteBookshelf: (bookshelfId: string) => {
          set((state) => {
            delete state.bookshelves[bookshelfId];
          });
        },
        updateBookshelfBooks: (bookshelfId: string, books: string[]) => {
          set((state) => {
            state.bookshelves[bookshelfId] = books;
          });
        },
        //! -- ADD BOOKS for BookShelves
        addBooksToBookshelf: async (books, bookshelfId) => {
          // console.log(
          //   "addBooksToBookshelf",
          //   books.map((el) => el)
          // );
          if (!books || books.length === 0 || books[0].libraryItemId === null) return;

          const storeBooks = get().books;

          let libItemIdsToFetch = [];
          // Loop through user's personalized feed that is sent (Continue Listening, Recently Added, etc)
          for (let liveBook of books) {
            // If we don't have the book in our local store-books, then queue it up to load.
            let foundBook = storeBooks.find((el) => el.libraryItemId === liveBook.libraryItemId);
            if (!foundBook) {
              libItemIdsToFetch.push(liveBook.libraryItemId);
            }
          }

          await Promise.all(
            libItemIdsToFetch.map((libraryItemId) =>
              get().actions.getOrFetchBook({ libraryItemId })
            )
          );

          //!! Update the bookshelves key
          // NOTE: This function receives and array of books for a specific shelf
          // This is adding those books (libraryItemId(s)) to the shelf
          const bookshelves = get().bookshelves || {};
          const booksForShelf = books
            .map((el) => el.libraryItemId)
            .filter((id): id is string => Boolean(id));
          const updatedBookshelves = {
            ...bookshelves,
            // Use bookshelf ID directly
            [bookshelfId]: booksForShelf,
          } as BookshelvesState;
          set({ bookshelves: updatedBookshelves });
        },

        getOrFetchBook: async ({ libraryItemId }) => {
          const { books } = get();
          const now = Date.now();

          const existingBook = books.find((b) => b.libraryItemId === libraryItemId);

          // If we have an existing book with full data, use it as the base
          const fallback: Book = {
            userId: "", // Empty string for temporary books
            libraryItemId,
            playbackRate: 1,
            isDownloaded: false,
            duration: 0,
            lastUpdated: now,
            lastProgressUpdate: undefined,
            type: "temporary",
          };

          // Use existing book if available, otherwise use fallback
          const book = existingBook ?? fallback;

          try {
            const absAPI = getAbsAPI();

            // Check if we have a real API or mock API
            if (!absAPI || typeof absAPI.getItemDetails !== "function") {
              console.log("[BooksStore] API not available, returning existing book");
              return book;
            }

            const itemDetails = await absAPI.getItemDetails(libraryItemId);
            //Get total size of all audio files
            const totalSize =
              itemDetails?.audioFiles?.reduce((acc, file) => acc + file.metadata.size, 0) / 1000000;

            // If API returned null (offline/error), return cached book without updating
            if (!itemDetails || !itemDetails.media) {
              console.log("[BooksStore] No item details received, returning cached book");
              return book;
            }

            // Create a fallback chapter for books with NO chapters defined.
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

            // Get actual chapters if they exist
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

            // Finalize the chapter selection
            const enhancedChapters =
              !absLoadedChapters || absLoadedChapters.length === 0
                ? chapterFallback
                : absLoadedChapters;

            // Create updated book with fresh data
            const updated: Book = {
              ...book, // Preserve existing data like playbackRate, isDownloaded
              title: itemDetails?.media?.metadata?.title || book.title || "",
              author: itemDetails?.media?.metadata?.authorName || book.author || "",
              description: itemDetails?.media?.metadata?.description || book.description || "",
              narratedBy: itemDetails?.media?.metadata?.narratorName || book.narratedBy || "",
              genre: itemDetails?.media?.metadata?.genres?.join(", ") || book.genre,
              genres: itemDetails?.media?.metadata?.genres || book.genres,
              tags: itemDetails?.media?.tags || book.tags,
              lastProgressUpdate:
                itemDetails?.userMediaProgress?.lastUpdate || book.lastProgressUpdate,
              duration: itemDetails?.media.duration || book.duration || 0,
              coverURI: itemDetails?.coverURI || book.coverURI,
              publishedYear: itemDetails?.media?.metadata.publishedYear || book.publishedYear,
              chapters: enhancedChapters.length > 0 ? enhancedChapters : book.chapters,
              authors: itemDetails?.media?.metadata?.authors || book.authors,
              totalFileSizeMB: Math.round((totalSize + Number.EPSILON) * 100) / 100,
              numberOfAudioFiles: itemDetails?.audioFiles?.length || 0,
              lastUpdated: Date.now(),
            };

            set((s) => ({
              books: [...s.books.filter((b) => b.libraryItemId !== libraryItemId), updated],
            }));

            // Update position info
            // Check if there's a queued playback-progress sync for THIS specific book
            // If so, prefer the local queued position over stale server data
            // This prevents race conditions when reconnecting after offline listening
            const queuedProgressItems = syncQueue.getQueuedItemsByType("playback-progress");
            // Filter to only get queued items for THIS book
            const queuedItemsForThisBook = queuedProgressItems.filter(
              (item) => item.data?.libraryItemId === libraryItemId
            );
            const queuedPosition =
              queuedItemsForThisBook.length > 0
                ? queuedItemsForThisBook[queuedItemsForThisBook.length - 1].data?.currentTime
                : undefined;

            set((state) => {
              const existingPosition = state.bookInfo[libraryItemId]?.positionInfo?.currentPosition;
              const serverPosition = itemDetails?.userMediaProgress?.currentTime;

              // Priority: queued local position > existing local position > server position
              // Use queued position if it exists and is greater than server position
              const useQueuedPosition =
                queuedPosition !== undefined &&
                queuedPosition > existingPosition &&
                (serverPosition === undefined || queuedPosition > serverPosition);

              // Log when a queued position is applied
              if (useQueuedPosition && queuedPosition !== undefined) {
                addSyncLogEntry({
                  libraryItemId,
                  title: updated.title || "Unknown",
                  position: formatPositionForLog(queuedPosition),
                  syncType: "queued-position-applied",
                  apiRoute: "N/A - Local queue applied",
                  functionName: "getOrFetchBook",
                  fileName: "store-books.ts",
                  success: true,
                });
              }

              // console.log("getOrFetchBook Position", state.bookInfo[libraryItemId]?.positionInfo);
              state.bookInfo[libraryItemId] = {
                ...state.bookInfo[libraryItemId],
                positionInfo: {
                  currentPosition: useQueuedPosition
                    ? queuedPosition
                    : existingPosition ?? serverPosition ?? 0,
                  lastProgressUpdate:
                    itemDetails?.userMediaProgress?.lastUpdate ||
                    state.bookInfo[libraryItemId]?.positionInfo?.lastProgressUpdate,
                },
              };
            });

            return updated;
          } catch (err) {
            console.log(`[BooksStore] Fetch failed for ${libraryItemId}, returning cached book`);
            return book;
          }
        },

        updateMappedProgressPositions: (mappedProgress) =>
          set((state) => {
            const now = Date.now();
            // Get queued playback-progress items to check for pending syncs
            const queuedItems = syncQueue.getQueuedItemsByType("playback-progress");

            Object.entries(mappedProgress).forEach(([bookId, p]) => {
              const existing = state.bookInfo[bookId] ?? {};
              const serverPosition = p?.currentTime ?? 0;

              // Check if this book has queued syncs waiting to be processed
              const hasQueuedSync = queuedItems.some((item) => item.data?.libraryItemId === bookId);

              // If we have queued syncs for this book, don't overwrite with stale server data
              if (hasQueuedSync) {
                console.log(`[updateMappedProgressPositions] Skipping ${bookId} - has queued sync`);
                return;
              }

              // Also skip if local position is ahead of server position
              // This preserves offline progress until it's synced
              const localPosition = existing.positionInfo?.currentPosition ?? 0;
              if (localPosition > serverPosition) {
                console.log(
                  `[updateMappedProgressPositions] Skipping ${bookId} - local (${localPosition}) ahead of server (${serverPosition})`
                );
                return;
              }

              // Safe to update - server position is newer or equal
              state.bookInfo[bookId] = {
                ...existing,
                positionInfo: {
                  currentPosition: serverPosition,
                  lastProgressUpdate: now,
                },
              };
            });
          }),
        // updateMappedProgressPositions: (mappedProgress: Record<string, { currentTime: number }>) =>
        //   set((state) => {
        //     const newBookInfo = { ...state.bookInfo };
        //     const now = Date.now();
        //     Object.keys(mappedProgress).forEach((bookId) => {
        //       const cur = newBookInfo[bookId] ?? {};
        //       newBookInfo[bookId] = {
        //         ...cur,
        //         positionInfo: {
        //           currentPosition: mappedProgress[bookId].currentTime || 0,
        //           lastProgressUpdate: now,
        //         },
        //       };
        //     });
        //     return { bookInfo: newBookInfo };
        //   }),

        updateCurrentPosition: (libraryItemId, position) => {
          // Update the bookInfo Object
          set((state) => {
            state.bookInfo[libraryItemId] = {
              ...state.bookInfo[libraryItemId],
              positionInfo: { currentPosition: position, lastProgressUpdate: Date.now() },
            };
          });
        },

        //# ---- DOWNLOAD BOOK -----
        downloadBook: async (libraryItemId) => {
          // Increment token to start a new download session (invalidates any previous)
          set((state) => ({ downloadToken: state.downloadToken + 1 }));
          const myToken = get().downloadToken;

          if (!libraryItemId) {
            console.log("No libraryItemId provided");
            return;
          }
          const absAPI = getAbsAPI();
          // Get item details
          const data = await absAPI.getItemDetails(libraryItemId);
          if (!data) {
            console.log("No data found for libraryItemId: " + libraryItemId);
            return;
          }
          // const totalSize = data.audioFiles[0].metadata.size / 1000000;
          // create the variable that will feed into the downloadInfo Object for this book
          let audioTracks = [];

          // Cleanup file holder
          let filesToCleanUp = [];
          // Download each audio file
          for (let i = 0; i < data.audioFiles.length; i++) {
            const audioFile = data.audioFiles[i];
            // Check if this download session is still valid
            if (get().downloadToken !== myToken) return;

            console.log("AudioFile Info", audioFile.ino, audioFile.metadata.filename);
            // Get download URI
            const dlURI = await absAPI.absDownloadItem(libraryItemId, audioFile.ino);
            // Check if this download session is still valid
            if (get().downloadToken !== myToken) return;

            // Setup the download of the file
            const { task, cancelDownload, cleanFileName, fileUri, nativePath } = downloadFileBlob(
              dlURI,
              audioFile.metadata.filename,
              (received, total) => {
                // Check if this download session is still valid before updating progress
                if (get().downloadToken !== myToken) return;
                get().actions.updateDownloadProgress(
                  libraryItemId,
                  audioFile.metadata.filename,
                  received,
                  total,
                  data.audioFiles.length,
                  i + 1,
                  false
                );
              }
            );

            // Store the cancel function for the current file
            // The cancelDownload will cancel the current file download, but we also
            // need to clean up the file it was downloading as it won't exist in the downloadInfo object yet.
            // !!I'm thinking the function should be augmented to clean up the file it was downloading as it won't exist in the downloadInfo object yet.
            // () => {
            //   deleteFile(cleanFileName)
            //   cancelDownload();
            //
            // }
            set({
              activeCancelFn: async () => {
                await cancelDownload();
                for (const file of filesToCleanUp) {
                  deleteFromFileSystem(file);
                }
              },
            });
            //! TODO
            //! Update the books array for this book noting that this book is a downloaded book
            //! Update the downloadInfo Object for this book with the new track/file that was just downloaded
            // Start the download task and await its completion
            try {
              // Add the file to the cleanup list
              filesToCleanUp.push(cleanFileName);
              await task;
              audioTracks.push({
                ino: audioFile.ino,
                filename: audioFile.metadata.filename,
                cleanFileName,
                duration: audioFile.duration,
                startOffset: audioFile.startOffset,
              });
              // Update the downloadInfo Object for each track as it is downloaded.
              // we need this update so that if cancelled we can clean up the files that were downloaded
              // set((state) => {
              //   state.downloadedBookData[libraryItemId] = { audioTracks };
              // });
            } catch (e) {
              // If cancelled, exit silently; otherwise rethrow
              if (get().downloadToken !== myToken) return;
              throw e;
            }

            console.log("DONE Awaiting", cleanFileName);
            // Check if this download session is still valid
            if (get().downloadToken !== myToken) return;
          }

          // Download completed successfully - clean up
          // Update the downloadInfo Object for this book
          set((state) => {
            state.downloadedBookData[libraryItemId] = { audioTracks };
            // update book
            const book = state.books.find((b) => b.libraryItemId === libraryItemId);
            if (book) {
              book.isDownloaded = true;
              book.type = "downloaded";
            }
          });
          set({ activeCancelFn: undefined, downloadProgress: undefined });
          get().actions.addBookToBookshelf(libraryItemId, "downloaded");
        },

        cancelDownload: async () => {
          // Increment token to invalidate the current download session
          set((state) => ({ downloadToken: state.downloadToken + 1 }));
          const cancelledLibraryItemId = get().downloadProgress?.libraryItemId;

          // Cancel the active file download
          try {
            await get().activeCancelFn?.();
          } catch (e) {
            console.log("cancelDownload: activeCancelFn threw error:", e);
          }

          console.log("Download Cancelled", get().downloadProgress);
          set({ activeCancelFn: undefined, downloadProgress: undefined });
          // Clean up the downloadInfo Object for this book if we have a libraryItemId
          if (!cancelledLibraryItemId) return;
          get().actions.deleteDownloadedBookData(cancelledLibraryItemId);
        },
        updateDownloadProgress: (
          libraryItemId,
          fileName,
          received,
          total,
          numberOfFiles,
          numberOfFilesDownloaded,
          downloadCompleted
        ) => {
          set({
            downloadProgress: {
              libraryItemId,
              currentFileProcessing: fileName,
              progress: isNaN(Math.round((received / total) * 100))
                ? 0
                : Math.round((received / total) * 100),
              received,
              total,
              numberOfFiles,
              numberOfFilesDownloaded,
              downloadCompleted,
            },
          });
        },
        getDownloadStatus: (libraryItemId: string) => {
          const book = get().actions.getBook(libraryItemId);
          const dlProgress = get().downloadProgress;

          if (book?.isDownloaded) return "completed";

          if (dlProgress?.currentFileProcessing) {
            // If the file is done but book isn't marked "isDownloaded" yet, it's processing
            return dlProgress.downloadCompleted ? "processing" : "downloading";
          }

          return "ready";
        },
        deleteDownloadedBookData: (libraryItemId) => {
          // Delete from filesystem
          const audioTracks = get().downloadedBookData?.[libraryItemId]?.audioTracks;
          if (!audioTracks) return;
          audioTracks.forEach((track) => {
            deleteFromFileSystem(track.cleanFileName);
          });
          // Reset state (remove from downloadedBookData)
          set((state) => {
            delete state.downloadedBookData[libraryItemId];
            // update book
            const book = state.books.find((b) => b.libraryItemId === libraryItemId);
            if (book) {
              book.isDownloaded = false;
              book.type = "temporary";
            }
          });
          // Remove from bookshelf
          get().actions.removeBookFromBookshelf(libraryItemId, "downloaded");
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
        downloadedBookData: state.downloadedBookData,
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
export const useBookShelves = (bookshelfId?: string) => {
  const books = useBooksStore((state) => state.books);
  const bookInfo = useBooksStore((state) => state.bookInfo);

  const bookActions = useBooksActions();
  const bookshelves = useBooksStore((state) => state.bookshelves);
  // Settings has a list of all bookshelves available
  const allBookshelves = useSettingsStore((state) => state.allBookshelves);

  if (!bookshelves) {
    return;
  }
  // list of bookshelves in format UI is expecting
  // sorting by position field and only showing those with displayed = true
  // lastly adding books for the shelf from the store-books -> bookshelves state variable
  const displayedBookshelves = allBookshelves.filter((el) => el.displayed === true);

  const finalBookshelves = sortBy(displayedBookshelves, ["position"]).map((bookshelf) => {
    const shelfBookIds = bookshelves[bookshelf.id] || [];

    const shelfBooks = shelfBookIds.map((bookId: string) => {
      const foundBook = books.find((el) => el.libraryItemId === bookId);
      if (!foundBook) {
        // console.log(`[useBookShelves] Book ${bookId} not found in store, triggering fetch`);
        // Only trigger fetch if we're authenticated to avoid loops
        if (AudiobookshelfAuth.isAssumedAuthedGlobal) {
          bookActions.addBooksToBookshelf([{ libraryItemId: bookId }], bookshelf.id);
        }
      }
      return { ...foundBook, currentTime: bookInfo[bookId]?.positionInfo?.currentPosition || 0 };
    });

    return {
      ...bookshelf,
      books: shelfBooks,
    };
  }) as BookShelfItemType[] | [];

  // If the user only wants a single shelf, return that shelf
  if (bookshelfId) {
    return finalBookshelves.find((el) => el.id === bookshelfId);
  }
  return finalBookshelves;
};

/**
 * Hook to get a specific book by libraryItemId
 */
export const useBook = (libraryItemId: string) =>
  useBooksStore((state) => state.books.find((book) => book.libraryItemId === libraryItemId));

export const useBookInfo = (libraryItemId: string) =>
  useBooksStore((state) => state.bookInfo[libraryItemId]);
export const useBookPosition = (libraryItemId: string) =>
  useBooksStore((state) => state.bookInfo[libraryItemId]?.positionInfo);
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
