import { AudiobookshelfAuth } from "../utils/AudiobookShelf/absAuthClass";
import { getAbsAPI } from "../utils/AudiobookShelf/absInit";
import { Bookmark } from "../utils/AudiobookShelf/abstypes";
import { BookInfo, useBooksStore } from "./store-books";

export const storeInit = async () => {
  try {
    console.log("storeInit: Starting store initialization");

    // Check if we have stored credentials before attempting to get API
    const hasCredentials = await AudiobookshelfAuth.hasStoredCredentials();
    if (!hasCredentials) {
      console.log("storeInit: No stored credentials, skipping server sync");
      return; // Exit gracefully without server sync
    }

    const absAPI = getAbsAPI();
    console.log("storeInit: Got absAPI instance");
    const userInfo = await absAPI.getMe();
    console.log("storeInit: Got user info");
    //! Mediaprogress -- NOT SURE WHAT TO USE IT FOR
    //const mediaProgress = userInfo.mediaProgress;

    //~ We are going to sync bookmark state from server to app once
    //~ on startup and then when displaying info, we will use the store only
    //~ updating the server as well, but never requerying the server bookmark info
    //~ only adding, updating and deleting from server.
    //~Get Bookmark info from server and books store
    const absBookmarks = userInfo.bookmarks;
    const storeBookinfo = useBooksStore.getState().bookInfo;

    //~ merge bookmarks from server and store with server being the truth (store will be overwritten if bm the same time on server)
    const newStoreBookInfo = mergeBookmarks(storeBookinfo, absBookmarks);
    // console.log("NEW BOOK", newStoreBookInfo?.["b3204480-9e1d-493f-8d18-2b31d3bca76d"]);
    // update the store
    useBooksStore.setState({ bookInfo: newStoreBookInfo });
    console.log("storeInit: Store initialization completed successfully");
  } catch (error) {
    console.warn("storeInit: Error during store initialization:", error);
    // Don't re-throw - let the app continue without store initialization
    console.log("storeInit: Allowing app to continue without server data sync");
  }
};

//# ---------------------------------------------------------------
//# Merge ABS server bookmarks with store-books bookInfo bookmarks
//# ---------------------------------------------------------------
function mergeBookmarks(bookInfo: BookInfo, absBMs: Bookmark[]) {
  // deep clone store so we don't mutate the original
  const storeBookinfoFinal = JSON.parse(JSON.stringify(bookInfo || {}));
  // Must transform the absBMs from and array of Bookmarks into an object with same shape of the Bookinfo coming from the store.
  const absTransformed = transformABSBMs(absBMs);

  for (const id in absTransformed) {
    const absObj = absTransformed[id] || {};
    const absList = Array.isArray(absObj.bookmarks) ? absObj.bookmarks : [];

    // keep existing object (and its other keys) or start with an empty object
    const existingObj = storeBookinfoFinal[id] ? { ...storeBookinfoFinal[id] } : {};

    const storeList = Array.isArray(existingObj.bookmarks) ? existingObj.bookmarks : [];

    // index by time (store values first, then ABS overwrites when same time)
    const byTime = new Map(storeList.map((b: any) => [b.time, b]));

    for (const b of absList) byTime.set(b.time, b); // ABS takes precedence

    // produce array, sorted consistently by createdAt (fallback 0)
    existingObj.bookmarks = [...byTime.values()].sort(
      (a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0)
    );

    storeBookinfoFinal[id] = existingObj;
  }

  return storeBookinfoFinal;
}
function transformABSBMs(absBookmarks: Bookmark[]): BookInfo {
  return absBookmarks.reduce((acc: BookInfo, item) => {
    const { libraryItemId, time, title, createdAt } = item;

    if (!acc[libraryItemId])
      acc[libraryItemId] = {
        bookmarks: [],
        positionInfo: { currentPosition: 0, lastProgressUpdate: undefined },
      };

    acc[libraryItemId].bookmarks.push({ time, title, createdAt });

    return acc;
  }, {});
}
