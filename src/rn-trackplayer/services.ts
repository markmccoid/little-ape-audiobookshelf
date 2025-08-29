import TrackPlayer, { Event } from "react-native-track-player";
// src/services/PlaybackService.ts

export const PlaybackService = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());

  // ...
};
