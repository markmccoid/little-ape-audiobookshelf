import {
  useIsBookActive,
  usePlaybackActions,
  usePlaybackIsPlaying,
  usePlaybackStore,
} from "@/src/store/store-playback";
import { useSeekBackwardSeconds, useSeekForwardSeconds } from "@/src/store/store-settings";
import { THEME, useThemeColors } from "@/src/utils/theme";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Pressable, Text, View } from "react-native";
import PlayPauseAnimation from "./PlayPauseAnimation";

type Props = {
  libraryItemId: string;
};
const BookControls = ({ libraryItemId }: Props) => {
  const {
    jumpForwardSeconds,
    jumpBackwardSeconds,
    updatePlaybackSpeed,
    togglePlayPause,
    loadBook,
    loadBookAndPlay,
  } = usePlaybackActions();
  const themeColors = useThemeColors();
  const seekForward = useSeekForwardSeconds();
  const seekBackward = useSeekBackwardSeconds();

  const isBookActive = useIsBookActive(libraryItemId);
  const isBookLoaded = usePlaybackStore((state) => state.isLoaded);
  const isPlaying = usePlaybackIsPlaying(libraryItemId);

  const localTogglePlayPause = async () => {
    if (!isBookActive) {
      await loadBookAndPlay(libraryItemId);
    } else {
      await togglePlayPause();
    }
  };
  // console.log("Book Controls", isBookActive, libraryItemId);
  const showPlayingState = isBookLoaded && isPlaying;

  return (
    <View className="flex-row items-center justify-center px-5">
      <BlurView intensity={100} tint="extraLight" className="flex-row rounded-2xl overflow-hidden">
        <Pressable
          onPress={() => jumpBackwardSeconds(seekBackward)}
          className="flex-row justify-center items-center"
        >
          <Text
            className="absolute mt-1 text-xl font-semibold"
            style={{ color: THEME.light.muted }}
          >
            {seekBackward}
          </Text>
          <SymbolView
            name="arrow.trianglehead.counterclockwise"
            size={50}
            tintColor={THEME.light.accent}
            // tintColor={themeColors.accent}
          />
        </Pressable>
        <Pressable className="py-3 px-10 rounded-lg" onPress={localTogglePlayPause}>
          <PlayPauseAnimation
            isPlaying={showPlayingState}
            size={50}
            duration={600}
            isBookActive={isBookActive && isBookLoaded}
          />
        </Pressable>
        <Pressable
          onPress={() => jumpForwardSeconds(seekForward)}
          className="flex-row justify-center items-center"
        >
          <Text
            className="absolute mt-1 text-xl font-semibold "
            style={{ color: THEME.light.muted }}
          >
            {seekForward}
          </Text>
          <SymbolView
            name="arrow.trianglehead.clockwise"
            size={50}
            tintColor={THEME.light.accent}
          />
        </Pressable>
      </BlurView>
    </View>
  );
};

export default BookControls;
