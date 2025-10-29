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
import { PressableScale } from "pressto";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
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
  const { jumpForwardSeconds, jumpBackwardSeconds, togglePlayPause, loadBookAndPlay, loadBook } =
    usePlaybackActions();
  const themeColors = useThemeColors();
  const seekForward = useSeekForwardSeconds();
  const seekBackward = useSeekBackwardSeconds();

  const isBookActive = useIsBookActive(libraryItemId);
  // needed to make sure UI is responsive as soon as button it pressed
  const [isLocalBookActive, setIsLocalBookActive] = useState(isBookActive);

  const isBookLoaded = usePlaybackStore((state) => state.isLoaded);
  const isPlaying = usePlaybackIsPlaying(libraryItemId);

  const showPlayingState = isBookActive && isPlaying;
  const opacityVal = useSharedValue(0);

  const collapsedHeight = 75;
  const expandedHeight = 135;
  const growVal = useSharedValue(collapsedHeight);

  const localTogglePlayPause = async () => {
    if (!isBookActive) {
      setIsLocalBookActive(true);
      await loadBookAndPlay(libraryItemId);

      // await loadBook(libraryItemId);
    } else {
      await togglePlayPause();
    }
  };
  // console.log("Book Controls Vert", isBookLoaded, isPlaying, isBookActive, Date.now());

  //~~ ===== Size Book Control START
  useEffect(() => {
    setIsLocalBookActive(isBookActive);
    if (isBookActive) {
      growVal.value = withTiming(expandedHeight, { duration: 900 });
      opacityVal.value = withDelay(900, withTiming(1, { duration: 600 }));
    } else {
      opacityVal.value = withTiming(0, { duration: 400 });
      growVal.value = withDelay(200, withTiming(collapsedHeight, { duration: 1500 }));
    }
  }, [isBookActive, collapsedHeight]);
  //~ Animated height style
  const animStyle = useAnimatedStyle(() => {
    return { height: growVal.value };
  }, []);

  //~~ ===== Size Book Control END

  //~ Animated opacity style
  const opacityAnim = useAnimatedStyle(() => {
    return {
      opacity: opacityVal.value,
      pointerEvents: opacityVal.value === 0 ? "none" : "auto",
      zIndex: 10,
    };
  }, []);

  return (
    <Animated.View
      className="border-hairline rounded-2xl ml-2 justify-center items-center"
      style={[animStyle]}
    >
      <BlurView
        intensity={100}
        // tint="systemMaterial"
        tint="extraLight"
        className="h-full w-full rounded-2xl overflow-hidden justify-center items-center"
      >
        {/* ---- BACKWARD ---- */}
        <View className="flex-row justify-between w-full absolute top-1 px-1">
          <Animated.View style={[opacityAnim]} className="mt-1 ">
            <PressableScale
              onPress={() => jumpBackwardSeconds(seekBackward)}
              // className="flex-row justify-center items-center"
              style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}
            >
              <Text
                className="absolute mt-1 text-xl font-semibold"
                style={{ color: THEME.light.muted }}
                allowFontScaling={false}
              >
                {seekBackward}
              </Text>
              <SymbolView
                name="arrow.trianglehead.counterclockwise"
                size={50}
                tintColor={THEME.light.accent}
                // tintColor={themeColors.accent}
              />
            </PressableScale>
          </Animated.View>
          {/* ---- FORWARD ---- */}
          <Animated.View
            style={[opacityAnim]}
            // className="flex-row mb-2 justify-end  "
            className="mt-1 "
          >
            <Pressable
              onPress={() => jumpForwardSeconds(seekForward)}
              className="flex-row justify-center items-center"
            >
              <Text
                className="absolute mt-1 text-xl font-semibold"
                style={{ color: THEME.light.muted }}
                allowFontScaling={false}
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
        </View>

        {/* PLAY-PAUSE  */}
        <Animated.View
          // style={{ height: "100%" }}
          className="pb-3 flex-row w-full justify-center items-center absolute bottom-0"
        >
          <Pressable
            className="w-full justify-center flex-row"
            // style={[heightAnim]}
            onPress={localTogglePlayPause}
          >
            <PlayPauseAnimation
              isPlaying={showPlayingState}
              size={50}
              duration={600}
              isBookActive={isBookActive || isLocalBookActive}
              isBookLoaded={isBookLoaded}
            />
          </Pressable>
        </Animated.View>
      </BlurView>
    </Animated.View>
  );
};

export default BookControls;
