import AudiobookStreamer from "@/src/rn-trackplayer/AudiobookStreamer";
import { useEffect, useState } from "react";
import TrackPlayer from "react-native-track-player";
import { getAbsAuth, useAbsAPI } from "../ABS/absInit";

const useAudiobookStreaming = (itemId: string) => {
  const absAPI = useAbsAPI();
  const absAuth = getAbsAuth();
  const [streamer] = useState(() => new AudiobookStreamer(absAuth.absURL, absAPI));

  const setupForPlayback = async () => {
    console.log("SetupForPlayback", itemId);
    const { tracks, sessionData } = await streamer.setupAudioPlayback(itemId);
    await TrackPlayer.reset();
    await TrackPlayer.add(tracks);
    console.log("SESSIONID", sessionData.id, sessionData.startTime, sessionData.bookId);
    if (sessionData.startTime > 0) {
      await TrackPlayer.seekTo(sessionData.startTime);
    }

    return sessionData;
  };

  // Cleanup on unmount
  useEffect(() => {
    setupForPlayback();
    return () => {
      streamer.cleanup();
      const session = streamer.getSession();
      if (session) {
        streamer.closeSession();
      }
    };
  }, [itemId]);

  return {
    setupForPlayback,
    closeSession: () => streamer.closeSession(),
    getSession: () => streamer.getSession(),
  };
};

export default useAudiobookStreaming;
