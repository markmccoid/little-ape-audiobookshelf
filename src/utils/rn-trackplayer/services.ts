import { useSeekSettings } from "@/src/store/store-settings";
import TrackPlayer, { Event } from "react-native-track-player";
// src/services/PlaybackService.ts

//! =================================
//! REMOTE FUNCTIONS
//! =================================
export const handleRemoteNext = async () => {
  const trackIndex = await TrackPlayer.getActiveTrackIndex();
  const queue = await TrackPlayer.getQueue();
  const rate = await TrackPlayer.getRate();

  if (queue.length - 1 === trackIndex) {
    await TrackPlayer.skip(0);
    await TrackPlayer.pause();
  } else {
    await TrackPlayer.skipToNext();
  }
  TrackPlayer.setRate(rate);
};

export const handleRemotePrev = async () => {
  const trackIndex = await TrackPlayer.getActiveTrackIndex();
  const rate = await TrackPlayer.getRate();

  if (trackIndex === 0) {
    await TrackPlayer.seekTo(0);
  } else {
    await TrackPlayer.skipToPrevious();
  }
  TrackPlayer.setRate(rate);
};

export const handleRemoteJumpForward = async () => {
  const { position: currPos, duration: currDuration } = await TrackPlayer.getProgress();
  const { seekBackwardSeconds, seekForwardSeconds } = useSeekSettings();
  // const currDuration = await TrackPlayer.getDuration();
  const newPos = currPos + seekForwardSeconds;
  if (newPos > currDuration) {
    await handleRemoteNext();
  } else {
    await TrackPlayer.seekTo(newPos);
  }
};
export const handleRemoteJumpBackward = async () => {
  const { position: currPos } = await TrackPlayer.getProgress();
  const { seekBackwardSeconds } = useSeekSettings();

  const newPos = currPos - seekBackwardSeconds;
  if (newPos < 0) {
    await handleRemotePrev();
    const { duration } = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(duration + newPos);
  } else {
    await TrackPlayer.seekTo(newPos);
  }
};

export const PlaybackService = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, handleRemoteNext);
  TrackPlayer.addEventListener(Event.RemoteJumpForward, handleRemoteJumpForward);
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, handleRemoteJumpBackward);
  TrackPlayer.addEventListener(Event.RemotePrevious, handleRemotePrev);
  TrackPlayer.addEventListener(Event.RemoteSeek, (seek) => TrackPlayer.seekTo(seek.position));
  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    const { paused, permanent } = event;

    if (paused) {
      TrackPlayer.pause();
    } else {
      TrackPlayer.play();
    }
  });

  // ...
};
