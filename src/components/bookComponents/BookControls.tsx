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
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
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
  console.log("Book Controls", isBookLoaded, isPlaying, isBookActive, Date.now());

  // determines if this book is the current book and if it is playing (or paused)
  const showPlayingState = isBookActive && isPlaying;
  const growVal = useSharedValue(100);
  const opacityVal = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => {
    if (isBookActive && isBookLoaded) {
      growVal.value = withTiming(250, { duration: 500 });
    } else {
      growVal.value = withTiming(100, { duration: 600 });
    }
    return { width: growVal.value };
  }, [isBookActive, isBookLoaded]);
  const opacityAnim = useAnimatedStyle(() => {
    if (isBookActive && isBookLoaded) {
      opacityVal.value = withTiming(1, { duration: 1000 });
    } else {
      opacityVal.value = withTiming(0, { duration: 500 });
    }
    const display = opacityVal.value === 0 ? "none" : "flex";
    return {
      opacity: opacityVal.value,
      display,
    };
  }, [isBookActive, isBookLoaded]);
  return (
    <Animated.View
      className="flex-row items-center justify-center px-5 border border-red-600 rounded-2xl  bg-slate-300"
      style={[animStyle]}
    >
      {/* <AnimatedBlurView
        intensity={100}
        tint="extraLight"
        className="flex-row rounded-2xl overflow-hidden justify-center"
        // style={{ width: 200 }}
      > */}

      <Animated.View style={[opacityAnim]}>
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
      </Animated.View>

      <Pressable className="py-3 px-10 rounded-lg" onPress={localTogglePlayPause}>
        <PlayPauseAnimation
          isPlaying={showPlayingState}
          size={50}
          duration={600}
          isBookActive={isBookActive && isBookLoaded}
        />
      </Pressable>

      <Animated.View style={[opacityAnim]}>
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
      </Animated.View>

      {/* </AnimatedBlurView> */}
    </Animated.View>
  );
};

export default BookControls;
