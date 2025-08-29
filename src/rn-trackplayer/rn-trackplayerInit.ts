import TrackPlayer, { Capability } from "react-native-track-player";

export const trackPlayerInit = async () => {
  try {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
    });
  } catch (error) {
    console.log("TrackPlayer Already Setup");
  }
};
