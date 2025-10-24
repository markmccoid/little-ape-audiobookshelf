import {
  useIsBookActive,
  usePlaybackActions,
  usePlaybackIsPlaying,
  usePlaybackStore,
} from "@/src/store/store-playback";
import { useSeekBackwardSeconds, useSeekForwardSeconds } from "@/src/store/store-settings";
import { THEME, useThemeColors } from "@/src/utils/theme";
import { SymbolView } from "expo-symbols";
import React, { useRef } from "react";
import { Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
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

  const showPlayingState = isBookActive && isPlaying;
  const opacityVal = useSharedValue(0);
  const [collapsedWidth, setCollapsedWidth] = React.useState(100);
  const [expandedWidth, setExpandedWidth] = React.useState(250);
  const growVal = useSharedValue(collapsedWidth);
  const widthCollCalculated = useRef(false);
  const widthExpCalculated = useRef(false);

  const localTogglePlayPause = async () => {
    if (!isBookActive) {
      await loadBookAndPlay(libraryItemId);
    } else {
      await togglePlayPause();
    }
  };
  console.log("Book Controls", isBookLoaded, isPlaying, isBookActive, Date.now());

  //~~ ===== Size Book Control
  const handleCollapsedLayout = (event) => {
    if (widthCollCalculated?.current) return;
    widthCollCalculated.current = true;
    const { width } = event.nativeEvent.layout;
    setCollapsedWidth(width);
  };

  const handleExpandedLayout = (event) => {
    if (widthExpCalculated?.current) return;
    widthExpCalculated.current = true;
    const { width } = event.nativeEvent.layout;
    console.log("Expanded Width", width);
    setExpandedWidth(width);
    // Update animation if currently expanded
    if (isBookActive && isBookLoaded) {
      growVal.value = width;
    }
  };

  const animStyle = useAnimatedStyle(() => {
    const targetWidth = isBookActive && isBookLoaded ? expandedWidth : collapsedWidth;

    growVal.value = withTiming(targetWidth, {
      duration: isBookActive && isBookLoaded ? 500 : 600,
    });
    return { width: growVal.value };
  }, [isBookActive, isBookLoaded, collapsedWidth, expandedWidth]);
  //~~ ===== Size Book Control END
  // // determines if this book is the current book and if it is playing (or paused)
  // const animStyle = useAnimatedStyle(() => {
  //   if (isBookActive && isBookLoaded) {
  //     growVal.value = withTiming(250, { duration: 500 });
  //   } else {
  //     growVal.value = withTiming(100, { duration: 600 });
  //   }
  //   return { width: growVal.value };
  // }, [isBookActive, isBookLoaded]);
  const opacityAnim = useAnimatedStyle(() => {
    if (isBookActive && isBookLoaded) {
      opacityVal.value = withTiming(1, { duration: 1000 });
    } else {
      opacityVal.value = withTiming(0, { duration: 200 });
    }
    const display = opacityVal.value === 0 ? "none" : "flex";
    return {
      opacity: opacityVal.value,
      display,
    };
  }, [isBookActive, isBookLoaded]);

  return (
    <Animated.View
      className="flex-row items-center justify-center px-5 border-hairline rounded-2xl  bg-slate-300"
      style={[animStyle]}
    >
      {/* <AnimatedBlurView
        intensity={100}
        tint="extraLight"
        className="flex-row rounded-2xl overflow-hidden justify-center"
        // style={{ width: 200 }}
      > */}

      {/* ------------- HIDDEN MEASURE START ------------------ */}
      <Animated.View style={{ position: "absolute", opacity: 0 }} onLayout={handleCollapsedLayout}>
        <Pressable className="py-3 px-8 rounded-lg">
          <PlayPauseAnimation
            isPlaying={false}
            size={50}
            duration={600}
            isBookActiveAndLoaded={false}
          />
        </Pressable>
      </Animated.View>

      <Animated.View
        style={{ position: "absolute", opacity: 0 }}
        onLayout={handleExpandedLayout}
        className="flex-row items-center"
      >
        {/* Full expanded content for measurement */}
        <Pressable className="flex-row justify-center items-center pl-2">
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
        <Pressable className="py-3 px-10 rounded-lg">
          <PlayPauseAnimation
            isPlaying={false}
            size={50}
            duration={600}
            isBookActiveAndLoaded={true}
          />
        </Pressable>
        <Pressable className="flex-row justify-center items-center pr-2">
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
      {/* ------------- HIDDEN MEASURE END ------------------ */}
      <Animated.View style={[opacityAnim]}>
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
          isPlaying={showPlayingState}
          size={50}
          duration={600}
          isBookActiveAndLoaded={isBookActive && isBookLoaded}
        />
      </Pressable>

      <Animated.View style={[opacityAnim]}>
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
