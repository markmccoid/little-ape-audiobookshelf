import { useEffect, useState } from "react";
import { useProgress } from "react-native-track-player";
import { usePlaybackPosition, usePlaybackStore } from "../store/store-playback";

export const useSmartPosition = () => {
  const progress = useProgress();
  const isLoaded = usePlaybackStore((state) => state.isLoaded);
  const playbackPos = usePlaybackPosition();
  const [position, setPosition] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Consider progress "loaded" when it's not undefined AND not 0 (unless playbackPos is also 0)
    if (progress.position === 0) {
      setPosition(playbackPos);
    } else {
      setPosition(progress.position);
    }
  }, [progress.position, playbackPos]);

  return !isLoaded ? 0 : position;
};
