import TrackPlayer, { Capability } from "react-native-track-player";

export const trackPlayerInit = async () => {
  try {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      progressUpdateEventInterval: 5,
      forwardJumpInterval: 10,
      backwardJumpInterval: 10,
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

// ------------------------------
// -- PlaybackState
// -- ALSO in store.ts mountListeneres
// ------------------------------
// TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
//   console.log("STATE CHANGE", event.state);
//   // usePlaybackStore.setState({ playerState: event.state });
// });

// TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async (event) => {
//   console.log("PROGRESS CHANGE", event.position, event.track);
//   // usePlaybackStore.setState({ playerState: event.state });
// });
