import { useEffect } from "react";
import { useSyncIntervalSeconds } from "../store/store-settings";
import { usePlaybackActions } from "../store/store-playback";
import AudiobookStreamer from "../utils/rn-trackplayer/AudiobookStreamer";

/**
 * Hook to keep AudiobookStreamer sync interval in sync with settings
 * Call this in your app root or wherever you initialize the playback system
 */
export const useAudiobookStreamerSync = () => {
  const syncIntervalSeconds = useSyncIntervalSeconds();
  const playbackActions = usePlaybackActions();

  useEffect(() => {
    // Update the sync interval whenever it changes in settings
    try {
      const streamer = AudiobookStreamer.getInstance();
      streamer.updateSyncInterval(syncIntervalSeconds);
    } catch (error) {
      // AudiobookStreamer not initialized yet, which is fine
      console.log("AudiobookStreamer not initialized yet, will update sync interval when ready");
    }
  }, [syncIntervalSeconds]);
};