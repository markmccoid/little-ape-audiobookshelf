import { useSettingsStore } from "@/src/store/store-settings";
import TrackPlayer, { Capability, IOSCategoryMode } from "react-native-track-player";

export const trackPlayerInit = async () => {
  const seekBackwardSeconds = useSettingsStore.getState().seekBackwardSeconds;
  const seekForwardSeconds = useSettingsStore.getState().seekForwardSeconds;

  try {
    await TrackPlayer.setupPlayer({
      iosCategoryMode: IOSCategoryMode.SpokenAudio,
      autoHandleInterruptions: true,
    });
    await TrackPlayer.updateOptions({
      progressUpdateEventInterval: 5,
      forwardJumpInterval: seekForwardSeconds,
      backwardJumpInterval: seekBackwardSeconds,
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.JumpBackward,
        Capability.JumpForward,
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
