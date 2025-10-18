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
import React, { useEffect, useRef } from "react";
import { Pressable, Text } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
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

  const showPlayingState = isBookActive && isPlaying;
  const opacityVal = useSharedValue(0);
  const [collapsedHeight, setCollapsedHeight] = React.useState(71);
  const [expandedHeight, setExpandedHeight] = React.useState(250);
  const growVal = useSharedValue(collapsedHeight);
  const heightCollCalculated = useRef(false);
  const heightExpCalculated = useRef(false);

  const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
  const localTogglePlayPause = async () => {
    if (!isBookActive) {
      await loadBookAndPlay(libraryItemId);
    } else {
      await togglePlayPause();
    }
  };
  // console.log("Book Controls Vert", isBookLoaded, isPlaying, isBookActive, Date.now());

  //~~ ===== Size Book Control
  const handleCollapsedLayout = (event) => {
    if (heightCollCalculated?.current) return;
    heightCollCalculated.current = true;
    const { width, height } = event.nativeEvent.layout;
    setCollapsedHeight(height);
  };

  const handleExpandedLayout = (event) => {
    if (heightExpCalculated?.current) return;
    heightExpCalculated.current = true;
    const { width, height } = event.nativeEvent.layout;
    setExpandedHeight(height);
    // Update animation if currently expanded
    if (isBookActive && isBookLoaded) {
      growVal.value = height;
    }
  };

  //~~ ===== Size Book Control START
  useEffect(() => {
    if (isBookActive) {
      growVal.value = withTiming(expandedHeight, { duration: 900 });
      opacityVal.value = withDelay(900, withTiming(1, { duration: 600 }));
    } else {
      opacityVal.value = withTiming(0, { duration: 400 });
      growVal.value = withDelay(200, withTiming(collapsedHeight, { duration: 1500 }));
    }
  }, [isBookActive, collapsedHeight]);
  //
  const animStyle = useAnimatedStyle(() => {
    return { height: growVal.value, width: 85 };
  }, []);
  const animProps = useAnimatedProps(() => {
    return { height: growVal.value, width: 85 };
  });
  //~~ ===== Size Book Control END

  const opacityAnim = useAnimatedStyle(() => {
    return {
      opacity: opacityVal.value,
      pointerEvents: opacityVal.value === 0 ? "none" : "auto",
      zIndex: 10,
    };
  }, []);

  return (
    <Animated.View
      className="flex-col  border-hairline rounded-2xl  justify-center items-center"
      style={[animStyle]}
    >
      <BlurView
        intensity={100}
        // tint="systemMaterial"
        tint="extraLight"
        className="h-full w-full rounded-2xl overflow-hidden justify-center items-center"
      >
        {/* ------------- HIDDEN MEASURE START ------------------ */}
        <Animated.View
          style={{ position: "absolute", opacity: 0 }}
          onLayout={handleCollapsedLayout}
        >
          <Pressable className="py-3 px-4 rounded-lg">
            <PlayPauseAnimation isPlaying={false} size={50} duration={600} isBookActive={false} />
          </Pressable>
        </Animated.View>

        <Animated.View
          style={{ position: "absolute", opacity: 0 }}
          onLayout={handleExpandedLayout}
          className="flex-col  border-hairline rounded-2xl  bg-slate-300 items-center"
        >
          {/* Full expanded content for measurement */}
          <Pressable className="flex-row justify-center items-center pl-2 py-2">
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
          <Pressable className="py-3 px-5 rounded-lg">
            <PlayPauseAnimation isPlaying={false} size={50} duration={600} isBookActive={true} />
          </Pressable>
          <Pressable className="flex-row justify-center items-center pr-2 pb-2">
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
        <Animated.View style={[opacityAnim]} className="absolute top-1 mt-1">
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

        <Animated.View
          style={{ height: "100%" }}
          className="py-3 px-10 justify-center items-center"
        >
          <Pressable
            // className="py-3 px-10 justify-center items-center"
            // style={[heightAnim]}
            onPress={localTogglePlayPause}
          >
            <PlayPauseAnimation
              isPlaying={showPlayingState}
              size={50}
              duration={600}
              isBookActive={isBookActive && isBookLoaded}
            />
          </Pressable>
        </Animated.View>

        <Animated.View
          style={[opacityAnim]}
          className="flex-row mb-2 justify-end absolute bottom-0"
        >
          <Pressable
            onPress={() => jumpForwardSeconds(seekForward)}
            className="flex-row justify-center items-center"
          >
            <Text
              className="absolute mt-1 text-xl font-semibold"
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
      </BlurView>
    </Animated.View>
  );
};

export default BookControls;
