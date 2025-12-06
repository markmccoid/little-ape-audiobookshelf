import TrackPlayer, { PitchAlgorithm } from "react-native-track-player";
import { ABSQueuedTrack } from "../../store/store-playback";
import { AudiobookshelfAPI } from "../AudiobookShelf/absAPIClass";
import { AudiobookSession } from "../AudiobookShelf/abstypes";

export class SessionManager {
  private session: AudiobookSession | null = null;
  private trackOffsets: number[] = [];
  private serverUrl: string;
  private apiClient: AudiobookshelfAPI;

  constructor(serverUrl: string, apiClient: AudiobookshelfAPI) {
    this.serverUrl = serverUrl;
    this.apiClient = apiClient;
  }

  public getSession(): AudiobookSession | null {
    return this.session;
  }

  public hasSession(): boolean {
    return this.session !== null;
  }

  public async setupSession(itemId: string): Promise<{
    tracks: ABSQueuedTrack[];
    sessionData: AudiobookSession & { absServerURL: string; coverURL: string };
  }> {
    const currentProgress = await this.apiClient.getBookProgress(itemId);
    const response: AudiobookSession = await this.apiClient.getPlayInfo(itemId);

    // Guard against null response - this typically happens when offline but network state
    // hasn't been detected yet (isInternetReachable is null). The proxy returns null
    // on network errors for "get" methods.
    if (!response || !response.audioTracks) {
      throw new Error(
        "Unable to start playback session. Please check your internet connection and try again."
      );
    }

    const previousSessionId = this.session?.id;
    this.session = response;

    if (previousSessionId && previousSessionId !== response.id) {
      console.log(
        `Session switch detected - TrackPlayer events may still reference old session ${previousSessionId}`
      );
    }

    // Setup Track and Chapter offsets
    this.trackOffsets = response.audioTracks.map((el) => el.startOffset) || [];

    // Use the real progress, not the session's startTime
    const actualStartTime = currentProgress?.currentTime || response.startTime || 0;
    const coverURL = await this.apiClient.buildCoverURL(itemId);

    const tracks = response.audioTracks.map((audioTrack) => ({
      id: `${response.id}-${audioTrack.index}`,
      trackIndex: audioTrack.index - 1, // convert to zero based index
      url: `${this.serverUrl}/audiobookshelf/public/session/${response.id}/track/${audioTrack.index}`,
      title: response.displayTitle,
      artist: response.displayAuthor,
      artwork: coverURL.coverFull,
      duration: audioTrack.duration,
      sessionId: response.id,
      trackOffset: this.trackOffsets[audioTrack.index - 1],
      libraryItemId: response.libraryItemId,
      chapters: response.chapters || [],
      pitchAlgorithm: PitchAlgorithm.Voice,
    }));

    return {
      tracks,
      sessionData: {
        ...response,
        startTime: actualStartTime,
        absServerURL: this.serverUrl,
        coverURL: coverURL.coverFull,
      },
    };
  }

  public clearSession() {
    this.session = null;
    this.trackOffsets = [];
  }

  public async getGlobalPosition(cachedPosition?: number): Promise<number> {
    const activeTrackIndex = (await TrackPlayer.getActiveTrackIndex()) || 0;
    const currentProgress = await TrackPlayer.getProgress();
    const finalPos = cachedPosition || currentProgress.position;

    // Ensure we have valid track offsets
    if (!this.trackOffsets || this.trackOffsets.length === 0) {
      // console.warn("No track offsets available, returning raw position");
      return finalPos;
    }

    // Ensure the active track index is within bounds
    if (activeTrackIndex >= this.trackOffsets.length) {
      console.warn(
        `Active track index ${activeTrackIndex} exceeds track offsets length ${this.trackOffsets.length}, using last offset`
      );
      return (this.trackOffsets[this.trackOffsets.length - 1] || 0) + finalPos;
    }

    return this.trackOffsets[activeTrackIndex] + finalPos;
  }

  /**
   * Gets the sessionId from the currently active track to prevent cross-session contamination
   */
  public async getActiveSessionId(): Promise<string | null> {
    try {
      const activeTrack = await TrackPlayer.getActiveTrack();
      if (activeTrack && "sessionId" in activeTrack) {
        return activeTrack.sessionId as string;
      }
      return this.session?.id || null;
    } catch (error) {
      return this.session?.id || null;
    }
  }

  /**
   * Gets the libraryItemId from the currently active track
   */
  public async getActiveLibraryItemId(): Promise<string | null> {
    try {
      const activeTrack = await TrackPlayer.getActiveTrack();
      if (activeTrack && "libraryItemId" in activeTrack) {
        return activeTrack.libraryItemId as string;
      }
      return this.session?.libraryItemId || null;
    } catch (error) {
      return this.session?.libraryItemId || null;
    }
  }
}
