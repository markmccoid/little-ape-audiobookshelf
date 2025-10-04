import {
  usePlaybackActions,
  usePlaybackIsPlaying,
  usePlaybackSession,
} from "@/src/store/store-playback";
import { useHeaderHeight } from "@react-navigation/elements";
import React from "react";
import { Text, View } from "react-native";
import { useProgress } from "react-native-track-player";

const MainPlayerContainer = () => {
  const playbackActions = usePlaybackActions();
  const isPlaying = usePlaybackIsPlaying();
  const headerHeight = useHeaderHeight();
  const playbackSession = usePlaybackSession();
  const progress = useProgress();

  if (!playbackSession) {
    return (
      <View
        style={{ paddingTop: headerHeight }}
        className="flex-1 bg-red-500 justify-center items-center "
      >
        <Text className="text-2xl text-white font-semibold">No active playback session</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ paddingTop: headerHeight }}>
      <Text>MainPlayerContainer</Text>
    </View>
  );
};

export default MainPlayerContainer;
