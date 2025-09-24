// services/AudiobookshelfAPI.ts
import axios, { AxiosRequestConfig } from "axios";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert, Image } from "react-native";
// import { btoa } from "react-native-quick-base64";

import { kv } from "@store/mmkv/mmkv";
import { Keys } from "@store/mmkv/storageKeys";

import { PitchAlgorithm } from "react-native-track-player";
import { AudiobookshelfAuth } from "./absAuthClass";
import {
  ABSLoginResponse,
  AudiobookSession,
  AuthenticationError,
  Bookmark,
  FilterData,
  GetLibraryItemsResponse,
  Library,
  LibraryItem,
  MediaProgress,
  NetworkError,
  User,
} from "./abstypes";

// Types
export type FilterType = "genres" | "tags" | "authors" | "series" | "progress";

type GetLibraryItemsParams = {
  libraryId?: string;
  filterType?: FilterType;
  filterValue?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
};

export type ABSGetLibraryItems = {
  id: string;
  title: string;
  subtitle?: string | undefined | null;
  author?: string | undefined | null;
  series?: string | undefined | null;
  publishedDate?: string | undefined | null;
  publishedYear?: string | undefined | null;
  narratedBy?: string | undefined | null;
  description?: string | undefined | null;
  duration: number;
  addedAt: number;
  updatedAt: number;
  cover: string;
  coverFull: string;
  numAudioFiles: number | undefined | null;
  ebookFormat: string | undefined | null;
  genres: string[];
  tags: string[];
  asin?: string | null;
  isFinished: boolean;
  isFavorite: boolean;
}[];
export type ABSGetLibraryItem = ABSGetLibraryItems[number];
export type ABSGetLibraries = Awaited<ReturnType<AudiobookshelfAPI["getLibraries"]>>;
//# -----==================================================
//! LOOK INTO using the api/me endpoints for pulling and updating
//! user info like bookmarks, progress, listening sessions, etc
//# -----==================================================
export class AudiobookshelfAPI {
  private activeLibraryId: string | undefined;
  private auth!: AudiobookshelfAuth;
  constructor() {}

  // ----------------------------------
  // Must be Called to create the API Instance
  // ----------------------------------
  static async create() {
    const api = new AudiobookshelfAPI();
    api.auth = await AudiobookshelfAuth.create();
    // Try to restore from storage
    const defaultLibId = kv.getString(Keys.absDefaultLibraryId) || undefined;
    if (defaultLibId && defaultLibId.trim() !== "") {
      api.setActiveLibraryId(defaultLibId);
      return api;
    }

    // Fallback: fetch libraries and set the first as active
    const libs = await api.getLibraries(); // note: this calls setActiveLibraryId internally
    // If no libraries, then we are not logged in and just return the api.
    return api;
  }
  // 🔹 Generic authenticated request method
  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: AxiosRequestConfig = {}
  ): Promise<T> {
    const auth = await AudiobookshelfAuth.create();
    const accessToken = await auth.getValidAccessToken();
    const serverUrl = await auth.getStoredServerUrl();

    if (!accessToken || !serverUrl) {
      throw new AuthenticationError("Please login to continue");
    }

    const url = `${serverUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    // console.log("ENDPOINT", url);
    try {
      const response = await axios({ url, headers, ...options });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        try {
          const newToken = await auth.refreshAccessToken();
          if (!newToken) {
            throw new AuthenticationError("Session expired. Please login again.");
          }

          const retryResponse = await axios({
            url,
            headers: { ...headers, Authorization: `Bearer ${newToken}` },
            ...options,
          });

          return retryResponse.data;
        } catch {
          throw new AuthenticationError("Session expired. Please login again.");
        }
      }

      const statusText = error.response?.statusText || "Unknown error";
      const statusCode = error.response?.status || "Unknown status";
      throw new NetworkError(`Request failed: ${statusText} (${statusCode})`);
    }
  }
  // ## ===============================================================
  // ## Session and Streaming
  // ## ===============================================================
  async getPlayInfo(itemId: string) {
    const response: AudiobookSession = await this.makeAuthenticatedRequest(
      `/api/items/${itemId}/play`,
      {
        method: "POST",
        data: {
          deviceInfo: {
            clientVersion: "1.0.0",
          },
          supportedMimeTypes: ["audio/flac", "audio/mpeg", "audio/mp4"],
          forceDirectPlay: false,
          forceTranscode: false,
        },
      }
    );
    return response;
    // console.log("PLAY RESP", Object.keys(response.audioTracks[0]));
    // console.log(
    //   "TRACKS",
    //   response.audioTracks.map((el) => `${el.index}-duration->${el.duration}`)
    // );
    // console.log("sessionID", response.id);
    // const token = await this.auth.getValidAccessToken();
    // const addObj = this.buildTrackPlayerTracks(response, token);
    // // console.log("ADDOBJ", addObj);
    // return { addObj, response };
  }

  async closeSession(
    sessionId: string,
    data: { timeListened: number; currentTime: number; duration?: number }
  ) {
    await this.makeAuthenticatedRequest(`/api/session/${sessionId}/close`, {
      method: "POST",
      data,
    });
  }

  // # ------------------------------
  // # syncProgressToServer
  async syncProgressToServer(
    sessionId: string,
    syncData: { timeListened: number; currentTime: number }
  ) {
    try {
      await this.makeAuthenticatedRequest(`/api/session/${sessionId}/sync`, {
        method: "POST",
        data: syncData,
      });
    } catch (error) {
      console.error("Failed to sync progress:", error);
    }
  }
  // ## ===============================================================
  // ## Session and Streaming ----- END
  // ## ===============================================================

  // Get libraries for user
  async getLibraries() {
    const response = await this.makeAuthenticatedRequest<any>("/api/libraries");
    // Check if an active library set, if not, set the first one as active
    const activeLibId = !this.getActiveLibraryId()
      ? response.libraries[0].id
      : this.getActiveLibraryId();
    // Also set the class variable for the activeLibrary.
    this.setActiveLibraryId(activeLibId);

    return (response.libraries as Library[]).map((lib) => ({
      id: lib.id,
      name: lib.name,
      displayOrder: lib.displayOrder,
      active: activeLibId === lib.id,
    }));
  }

  public setActiveLibraryId(libraryId: string): void {
    if (libraryId && libraryId.trim() === "") {
      throw new Error("Library ID cannot be an empty string");
    }
    this.activeLibraryId = libraryId;
    kv.setString(Keys.absDefaultLibraryId, libraryId || "");
  }

  public getActiveLibraryId(): string | undefined {
    return this.activeLibraryId;
  }

  async saveBookmark(bookmark: Bookmark) {
    const { absBookId: itemId, positionSeconds, name } = bookmark;
    const data = { time: positionSeconds, title: name };
    return this.makeAuthenticatedRequest(`/api/me/item/${itemId}/bookmark`, {
      method: "POST",
      data: JSON.stringify(data),
    });
  }

  async deleteBookmark(itemId: string, positionSeconds: number) {
    return this.makeAuthenticatedRequest(`/api/me/item/${itemId}/bookmark/${positionSeconds}`, {
      method: "DELETE",
    });
  }

  async updateBookProgress(itemId: string, currentTime: number) {
    return this.makeAuthenticatedRequest(`/api/me/progress/${itemId}`, {
      method: "PATCH",
      data: JSON.stringify({ currentTime }),
    });
  }

  async getBookProgress(itemId: string) {
    let resp;
    try {
      resp = await this.makeAuthenticatedRequest(`/api/me/progress/${itemId}`);
    } catch (e) {
      // console.log(e.error);
    }

    return resp as MediaProgress;
  }

  async setBookFinished(itemId: string, isFinished: boolean) {
    return this.makeAuthenticatedRequest(`/api/me/progress/${itemId}`, {
      method: "PATCH",
      data: JSON.stringify({ isFinished }),
    });
  }

  async setFavoriteTag(itemId: string, tags: string[]) {
    return this.makeAuthenticatedRequest(`/api/items/${itemId}/media`, {
      method: "PATCH",
      data: JSON.stringify({ tags }),
    });
  }

  // Returns same thing as getUserInfo
  // Users bookmarks, books in progress etc
  // https://api.audiobookshelf.org/#me
  async getMe() {
    return this.makeAuthenticatedRequest("/api/me") as Promise<User>;
  }

  async getUserInfo(): Promise<ABSLoginResponse["user"]> {
    const resp: ABSLoginResponse = await this.makeAuthenticatedRequest("/api/authorize", {
      method: "POST",
    });
    return resp.user;
  }

  async buildCoverURL(itemId: string, format: "webp" | "jpeg" = "webp") {
    // const auth = await AudiobookshelfAuth.create();
    const token = await this.auth.getValidAccessToken();
    const serverUrl = this.auth.absURL;
    const coverThumb = `${serverUrl}/api/items/${itemId}/cover?format=${format}&width=240&token=${token}`;
    const coverFull = `${serverUrl}/api/items/${itemId}/cover?format=${format}&token=${token}`;
    return { coverThumb, coverFull };
  }

  //-- Synchronous version of builCoverURL, MUST pass token
  buildCoverURLSync(itemId: string, token: string, format: "webp" | "jpeg" = "webp") {
    // const auth = await AudiobookshelfAuth.create();
    const serverUrl = this.auth.absURL;
    const coverThumb = `${serverUrl}/api/items/${itemId}/cover?format=${format}&width=240&token=${token}`;
    const coverFull = `${serverUrl}/api/items/${itemId}/cover?format=${format}&token=${token}`;
    return { coverThumb, coverFull };
  }

  // 🔹 Favorited + Finished Items
  async getFavoritedAndFinishedItems() {
    const userFavoriteInfo = await this.getUserFavoriteInfo();
    const progressurl = `/api/libraries/${this.getActiveLibraryId()}/items?filter=progress.ZmluaXNoZWQ=`;
    const favoriteurl = `/api/libraries/${this.getActiveLibraryId()}/items?filter=tags.${
      userFavoriteInfo.favoriteSearchString
    }`;

    let progressData, favData;
    try {
      progressData = (await this.makeAuthenticatedRequest(progressurl)) as {
        results: LibraryItem[];
      };
      favData = (await this.makeAuthenticatedRequest(favoriteurl)) as { results: LibraryItem[] };
    } catch (error) {
      console.log("GETFAVITEMS", error);
    }

    interface ItemInfo {
      itemId: string;
      type: "isFavorite" | "isRead";
      title: string;
      author: string;
      imageURL: string;
    }
    type ItemInfoMerged = Pick<ItemInfo, "itemId" | "title" | "author" | "imageURL"> & {
      type: ("isFavorite" | "isRead")[];
    };
    const token = await this.auth.getValidAccessToken();
    if (!token) throw new Error("No ABS Token found");

    const readResults: ItemInfo[] =
      (await Promise.all(
        progressData?.results?.map((el: LibraryItem) => {
          const coverURL = this.buildCoverURLSync(el.id, token);
          // this is the base64 Image
          // const coverURI = (await getCoverURI(coverURL)).coverURL;
          return {
            itemId: el.id,
            type: "isRead",
            title: el.media.metadata.title,
            author: el.media.metadata.authorName,
            imageURL: coverURL.coverThumb,
          };
        }) ?? []
      )) || [];

    const favResults: ItemInfo[] =
      (await Promise.all(
        favData?.results?.map(async (el: LibraryItem) => {
          const coverURL = this.buildCoverURLSync(el.id, token);
          // const coverURI = (await getCoverURI(coverURL)).coverURL;
          return {
            itemId: el.id,
            type: "isFavorite",
            title: el.media.metadata.title,
            author: el.media.metadata.authorName,
            imageURL: coverURL.coverThumb,
          };
        }) ?? []
      )) || [];

    // Create a function that you can pass an "ItemInfo" object into and it will
    // add to the result map so that we get a new ItemInfo object, but with the type being an array
    // with one or both of the "isFavorite" or "isRead"

    const resultMap = new Map();
    const mergeItems = (item: ItemInfo) => {
      if (resultMap.has(item.itemId)) {
        const existingItem = resultMap.get(item.itemId);
        existingItem.type = [...new Set([...existingItem.type, item.type])];
      } else {
        resultMap.set(item.itemId, { ...item, type: [item.type] });
      }
    };

    favResults.forEach(mergeItems);
    readResults.forEach(mergeItems);

    return Array.from(resultMap.values()).filter((el) => el.itemId) as ItemInfoMerged[];
  }

  async getItemDetails(itemId?: string) {
    let libraryItem: LibraryItem;
    try {
      const response = await this.makeAuthenticatedRequest(
        `/api/items/${itemId}?expanded=1&include=progress`
      );
      libraryItem = response as LibraryItem;
    } catch (error) {
      console.log("error", error);
      throw error;
    }

    const coverURL = await this.buildCoverURL(libraryItem.id);
    // The coverURI used to be used so that I could hash a cover so
    // it always showed the same placeholder cover. Now I use expo-image and
    // its placeholder property and it is always the same image.
    // const coverURI = (await getCoverURI(coverURL)).coverURL;

    const authorId = libraryItem.media.metadata?.authors[0].id;
    let authorBookCount = 0;
    try {
      const authorBookCountResp = await this.makeAuthenticatedRequest(
        `/api/authors/${authorId}?include=items`
      );
      authorBookCount = authorBookCountResp.libraryItems.length;
    } catch (error) {
      console.log("error", error);
      throw error;
    }

    if (!libraryItem?.media?.audioFiles) {
      throw new Error("No Media or Audiofiles");
    }

    let bookDuration = 0;
    for (const audio of libraryItem.media.audioFiles) {
      bookDuration += audio.duration;
    }

    return {
      id: libraryItem.id,
      audioFiles: libraryItem.media.audioFiles,
      media: libraryItem.media,
      bookDuration,
      userMediaProgress: libraryItem?.userMediaProgress,
      coverURI: coverURL.coverFull,
      authorBookCount,
      libraryFiles: libraryItem.libraryFiles,
    };
  }

  async absDownloadItem(itemId: string, fileIno: string) {
    const auth = await AudiobookshelfAuth.create();
    const token = await auth.getValidAccessToken();
    const serverUrl = await auth.getStoredServerUrl();

    const authHeader = { Authorization: `Bearer ${token}` };
    const url = `${serverUrl}/api/items/${itemId}/file/${fileIno}/download`;
    const urlWithToken = `${url}?token=${token}`;

    return { url, urlWithToken, authHeader };
  }

  async downloadEbook(itemId: string, fileIno: string, filenameWExt: string) {
    let tempFileUri: string | null = null;
    const { url, authHeader } = await this.absDownloadItem(itemId, fileIno);

    try {
      if (!FileSystem.cacheDirectory) {
        throw new Error("Cache directory not available on this platform");
      }
      const tempDir = `${FileSystem.cacheDirectory}temp_downloads/`;
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
      tempFileUri = `${tempDir}${filenameWExt}`;

      const downloadResult = await FileSystem.downloadAsync(url, tempFileUri, {
        headers: authHeader,
      });

      if (downloadResult.status === 200) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          Alert.alert("Download Complete", `File downloaded successfully`);
        }
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Download Failed", "Unable to download the file. Please try again.");
    } finally {
      if (tempFileUri) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(tempFileUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(tempFileUri);
            console.log("Temporary file cleaned up:", tempFileUri);
          }
        } catch (cleanupError) {
          console.warn("Failed to clean up temporary file:", cleanupError);
        }
      }
    }
  }

  async getLibraryFilterData(libraryId?: string) {
    let response;
    try {
      response = await this.makeAuthenticatedRequest(`/api/libraries/${libraryId}/filterdata`);
    } catch (error) {
      throw new Error(`absGetLibraryFilterData - ${error}`);
    }

    const libararyData = response as FilterData;
    const genres = libararyData.genres.map((genre) => ({
      name: genre,
      b64Encoded: btoa(genre),
    }));
    const tags = libararyData.tags.map((tag) => ({
      name: tag,
      b64Encoded: btoa(tag),
    }));
    const authors = libararyData.authors.map((author) => ({
      ...author,
      base64encoded: btoa(author.id),
    }));
    const series = libararyData.series.map((series) => ({
      ...series,
      base64encoded: btoa(series.id),
    }));

    return { id: libraryId, genres, tags, authors, series };
  }
  //--=================================
  //-- getLibraryItems
  //--=================================
  async getLibraryItems({
    libraryId,
    filterType,
    filterValue,
    sortBy,
  }: GetLibraryItemsParams): Promise<ABSGetLibraryItems> {
    const userFavoriteInfo = await this.getUserFavoriteInfo();
    const libraryIdToUse = libraryId;
    let queryParams = "";

    if (filterType) {
      queryParams = `?filter=${filterType}.${filterValue}`;
    }
    if (sortBy) {
      queryParams = `${queryParams}${queryParams ? "&" : "?"}sort=${sortBy}`;
    }

    const url = `/api/libraries/${libraryIdToUse}/items${queryParams}`;
    const progressurl = `/api/libraries/${libraryIdToUse}/items?filter=progress.ZmluaXNoZWQ=`;
    const favoriteurl = `/api/libraries/${libraryIdToUse}/items?filter=tags.${userFavoriteInfo.favoriteSearchString}`;
    console.log("URL", url);
    let responseData, progressresponseData, favresponseData;
    try {
      responseData = (await this.makeAuthenticatedRequest(url)) as GetLibraryItemsResponse;
    } catch (error) {
      console.log("absAPI-absGetLibraryItems-Main", error);
      throw error;
    }

    try {
      progressresponseData = (await this.makeAuthenticatedRequest(progressurl)) as {
        results: LibraryItem[];
      };
      favresponseData = (await this.makeAuthenticatedRequest(favoriteurl)) as {
        results: LibraryItem[];
      };
    } catch (error) {
      console.log("absAPI-absGetLibraryItems-Progress", error);
    }

    const libraryItems = responseData?.results as GetLibraryItemsResponse["results"];
    const finishedItemIds = progressresponseData?.results?.map((el) => el.id);
    const favoritedItemIds = favresponseData?.results?.map((el) => el.id);

    const finishedItemIdSet = new Set(finishedItemIds);
    const favoritedItemIdSet = new Set(favoritedItemIds);

    const token = await this.auth.getValidAccessToken();
    // If not token, should probably throw error.
    if (!token) return [];

    const booksMin = libraryItems.map((item) => {
      const coverURL = this.buildCoverURLSync(item.id, token);
      return {
        id: item.id,
        title: item.media.metadata.title,
        subtitle: item.media.metadata.subtitle,
        author: item.media.metadata.authorName,
        series: item.media.metadata.seriesName,
        publishedDate: item.media.metadata.publishedDate,
        publishedYear: item.media.metadata.publishedYear,
        narratedBy: item.media.metadata.narratorName,
        description: item.media.metadata.description,
        duration: item.media.duration,
        addedAt: item.addedAt,
        updatedAt: item.updatedAt,
        cover: coverURL.coverThumb,
        coverFull: coverURL.coverFull,
        numAudioFiles: item.media.numAudioFiles,
        ebookFormat: item.media?.ebookFormat,
        genres: item.media.metadata.genres,
        tags: item.media.tags,
        asin: item.media.metadata.asin,
        isFinished: finishedItemIdSet.has(item.id),
        isFavorite: favoritedItemIdSet.has(item.id),
      };
    });

    return booksMin;
  }
  async getUserFavoriteInfo() {
    const auth = await AudiobookshelfAuth.create();
    const favoriteSearchString = btoa(`${auth.username}-laab-favorite`);
    const favoriteUserTagValue = `${auth.username}-laab-favorite`;
    return {
      favoriteSearchString,
      favoriteUserTagValue,
    };
  }

  //!!! TESTING
  buildTrackPlayerTracks(playbackData: AudiobookSession, token) {
    const { audioTracks, libraryItem, chapters } = playbackData;

    return audioTracks.map((track, index) => {
      // Choose streaming method based on what's available
      let streamUrl;

      if (track.contentUrl && track.mimeType === "application/vnd.apple.mpegurl") {
        // HLS streaming (preferred for larger files)
        streamUrl = `${this.auth.absURL}${track.contentUrl}`;
      } else {
        // Fallback to direct file streaming
        const directTrack = libraryItem.media.tracks[index];
        // streamUrl = `${this.auth.absURL}${directTrack.contentUrl}?token=${token}`;
        streamUrl = `${this.auth.absURL}/public/session/${playbackData.id}/track/1`;
      }

      console.log(
        "StreamURL",
        streamUrl,
        playbackData.timeListening,
        playbackData.currentTime,
        playbackData.audioTracks.map((el) => el.startOffset)
      );
      return {
        id: `${libraryItem.id}-${index}`,
        url: streamUrl,
        title: track.title || libraryItem.media.metadata.title,
        artist: libraryItem.media.metadata.authors?.map((a) => a.name).join(", ") || "Unknown",
        artwork: `${this.auth.absURL}/api/items/${libraryItem.id}/cover?token=${token}`,
        duration: track.duration,
        // AudioBookshelf specific metadata
        libraryItemId: libraryItem.id,
        sessionId: playbackData.id, // Important for session tracking
        trackIndex: index,
        startOffset: track.startOffset,
        chapters: chapters || [],
        pitchAlgorithm: PitchAlgorithm.Voice,
        // Headers for authentication (for direct streams)
        headers:
          track.mimeType === "application/vnd.apple.mpegurl"
            ? {}
            : {
                Authorization: `Bearer ${token}`,
              },
      };
    })[0];
  }
}

// 🔹 Helpers
export const getImageSize = (uri: string) => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
};

export const getCoverURI = async (
  coverURL: string
): Promise<{ coverURL: string; type: "passthrough" | "localasset" }> => {
  try {
    await getImageSize(coverURL);
    return { coverURL, type: "passthrough" };
  } catch {
    console.log("getCoverURI ERROR-No Cover Found");
  }
  return { coverURL: "", type: "passthrough" };
};
