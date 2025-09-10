import { debounce, DebouncedFunc } from "lodash";
import TrackPlayer, { Event, State } from "react-native-track-player";
import { AudiobookshelfAPI } from "../ABS/absAPIClass";
import { AudiobookSession } from "../ABS/abstypes";

type SyncData = { timeListened: number; currentTime: number };

export default class AudiobookStreamer {
  private session: AudiobookSession | null = null;
  private lastSyncTime: number | null = null;
  private syncCounter: number = 0;
  private readonly SYNC_INTERVAL_COUNT = 10; // Sync every 10 progress updates
  // Store event listener handles
  private progressUpdateListener: any = null;
  private playbackStateListener: any = null;
  // 2. Create a new property specifically for the debounced version.
  //    Its type is DebouncedFunc<...>, which correctly describes it.
  private debouncedProgressHandler: DebouncedFunc<(position?: number) => Promise<void>>;

  constructor(
    private serverUrl: string,
    private apiClient: AudiobookshelfAPI // Your ABS API class instance
  ) {
    this.setupTrackPlayerEvents();
    this.debouncedProgressHandler = debounce(this.handleProgressUpdate, 4000, {
      leading: false, // Do NOT run on the leading edge.
      trailing: true, // DO run on the trailing edge after the wait time.
    });
  }

  private setupTrackPlayerEvents() {
    // Handle progress updates for syncing
    this.progressUpdateListener = TrackPlayer.addEventListener(
      Event.PlaybackProgressUpdated,
      async (event) => {
        console.log("PlaybackProgressUpdated**", event.position);
        this.debouncedProgressHandler(event.position);
      }
    );

    // Handle state changes for immediate sync on pause
    this.playbackStateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      async (event) => {
        console.log("STATE CHANGE**", event.state);
        await this.handlePlaybackStateChange(event);
      }
    );
  }
  /**
   * Periodically syncs progress ONLY while playing.
   */
  private async handleProgressUpdate(position: number | undefined = undefined) {
    // The guard clause in syncProgress will prevent syncing if paused
    if (!this.session) return;

    await this.syncProgress(position);
  }

  /**
   * Manages the sync timer based on playback state.
   */
  private async handlePlaybackStateChange(state: { state: State }) {
    if (state.state === State.Playing) {
      // Start the timer ONLY if it's not already running
      if (this.session && !this.lastSyncTime) {
        console.log("Playback started, starting sync timer.");
        this.lastSyncTime = Date.now();
      }
    } else if (state.state === State.Paused || state.state === State.Stopped) {
      // Stop the timer and perform a final sync for the interval
      if (this.session && this.lastSyncTime) {
        console.log("Playback paused/stopped, performing final sync.");
        this.debouncedProgressHandler.cancel();
        await this.syncProgress();
        this.lastSyncTime = null; // Stop the timer
      }
    }
  }

  async setupAudioPlayback(
    itemId: string
  ): Promise<{ tracks: any[]; sessionData: AudiobookSession }> {
    const currentProgress = await this.apiClient.getBookProgress(itemId);
    console.log("CurrentTIme", currentProgress?.currentTime);
    const response: AudiobookSession = await this.apiClient.getPlayInfo(itemId);
    // const response: AudiobookSession = await this.apiClient.makeAuthenticatedRequest(
    //   `/api/items/${itemId}/play`,
    //   {
    //     method: "POST",
    //     data: {
    //       deviceInfo: {
    //         clientVersion: "1.0.0",
    //       },
    //       supportedMimeTypes: ["audio/flac", "audio/mpeg", "audio/mp4"],
    //       forceDirectPlay: false,
    //       forceTranscode: false,
    //     },
    //   }
    // );

    this.session = response;
    this.syncCounter = 0; // Reset counter for new session
    // Use the real progress, not the session's startTime
    const actualStartTime = currentProgress?.currentTime || response.startTime || 0;

    const tracks = response.audioTracks.map((audioTrack) => ({
      id: `${response.id}-${audioTrack.index}`,
      url: `${this.serverUrl}/audiobookshelf/public/session/${response.id}/track/${audioTrack.index}`,
      title: response.displayTitle,
      artist: response.displayAuthor,
      artwork: `${this.serverUrl}/api/items/${response.libraryItemId}/cover`,
      duration: audioTrack.duration,
      sessionId: response.id,
      libraryItemId: response.libraryItemId,
      chapters: response.chapters,
    }));

    return { tracks, sessionData: { ...response, startTime: actualStartTime } };
  }

  async syncProgress(currentPosition?: number): Promise<void> {
    if (!this.session) return;

    try {
      const position = currentPosition ?? (await TrackPlayer.getProgress()).position;
      const now = Date.now();

      console.log("IN SYNC PROGRESS", currentPosition, this.lastSyncTime);
      const timeListened = this.lastSyncTime ? Math.floor((now - this.lastSyncTime) / 1000) : 0;

      const syncData: SyncData = {
        timeListened: timeListened,
        currentTime: position,
      };

      await this.apiClient.syncProgressToSever(this.session.id, syncData);

      this.lastSyncTime = now;

      console.log(`Synced - listened: ${timeListened}s, position: ${position}s`);
    } catch (error) {
      console.error("Failed to sync progress:", error);
    }
  }

  async syncProgressImmediate(): Promise<void> {
    // Force immediate sync (used for pause/stop events)
    await this.syncProgress();
  }

  async closeSession(): Promise<void> {
    if (!this.session) return;
    console.log("Close Session");
    try {
      // await this.syncProgressImmediate();
      const { position, duration } = await TrackPlayer.getProgress();
      const timeListened = this.lastSyncTime
        ? Math.floor((Date.now() - this.lastSyncTime) / 1000)
        : 0;
      console.log("POS-DUR", position, duration, timeListened);
      await this.apiClient.closeSession(this.session.id, {
        currentTime: position,
        timeListened,
      });

      this.session = null;
      this.lastSyncTime = null;
      this.syncCounter = 0;
    } catch (error) {
      console.error("Failed to close session:", error);
    }
  }

  // Added the missing getSession method
  getSession(): AudiobookSession | null {
    return this.session;
  }

  cleanup() {
    // Remove event listeners using the stored handles
    if (this.progressUpdateListener) {
      this.progressUpdateListener.remove();
      this.progressUpdateListener = null;
    }

    if (this.playbackStateListener) {
      this.playbackStateListener.remove();
      this.playbackStateListener = null;
    }

    // this.debouncedProgressHandler.flush();
  }
}
