import {
  useIsBookActive,
  usePlaybackActions,
  usePlaybackIsPlaying,
  usePlaybackStore,
} from "@/src/store/store-playback";
import { useSeekBackwardSeconds, useSeekForwardSeconds } from "@/src/store/store-settings";
import { THEME, useThemeColors } from "@/src/utils/theme";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Pressable, Text } from "react-native";
import Animated from "react-native-reanimated";
import PlayPauseAnimation from "./PlayPauseAnimation";

type Props = {
  libraryItemId: string;
};
const BookControls = ({ libraryItemId }: Props) => {
  const { jumpForwardSeconds, jumpBackwardSeconds, togglePlayPause, loadBookAndPlay } =
    usePlaybackActions();
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
  console.log("Book Controls", isBookLoaded, isPlaying, isBookActive, Date.now());

  return (
    <Animated.View className="flex-row items-center justify-center px-5 border-hairline rounded-2xl  bg-slate-300">
      {/* <AnimatedBlurView
        intensity={100}
        tint="extraLight"
        className="flex-row rounded-2xl overflow-hidden justify-center"
        // style={{ width: 200 }}
      > */}

      <Animated.View style={[]}>
        <Pressable
          onPress={() => jumpBackwardSeconds(seekBackward)}
          className="flex-row justify-center items-center pl-2"
        >
          <Text
            className="absolute mt-1 text-xl font-semibold pl-2"
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
      </Animated.View>

      <Pressable className="py-3 px-10 rounded-lg" onPress={localTogglePlayPause}>
        <PlayPauseAnimation
          isPlaying={isPlaying}
          size={50}
          duration={600}
          isBookActive={isBookActive}
          isBookLoaded={isBookLoaded}
        />
      </Pressable>

      <Animated.View style={[]}>
        <Pressable
          onPress={() => jumpForwardSeconds(seekForward)}
          className="flex-row justify-center items-center pr-2"
        >
          <Text
            className="absolute mt-1 text-xl font-semibold pr-2"
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
      </Animated.View>

      {/* </AnimatedBlurView> */}
    </Animated.View>
  );
};

export default BookControls;
