import { usePlaybackRate } from "@/src/hooks/trackPlayerHooks";
import { updatePlaybackRate, usePlaybackSession } from "@/src/store/store-playback";
import { THEME, useThemeColors } from "@/src/utils/theme";
import Slider from "@react-native-community/slider";
import React, { useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const COMPONENT_WIDTH = width - 90;
const COMPONENT_PADDING = 10;

const BookRateCycle = () => {
  const libraryItemId = usePlaybackSession()?.libraryItemId || "";
  const themeColors = useThemeColors();
  const playbackRate = usePlaybackRate(libraryItemId);
  // const playbackActions = usePlaybackStore((state) => state.actions);
  // const playlistRate = usePlaybackStore((state) => state.currentRate);
  // const didUpdate = usePlaybackStore((state) => state.didUpdate);
  const [rate, setRate] = useState<number>(playbackRate);
  const [isSliding, setIsSliding] = useState(false);

  const updateRate = async (newRate: number) => {
    setRate(newRate);
    updatePlaybackRate(libraryItemId, newRate);
  };

  const fixedRates = [1, 1.25, 1.5, 1.75, 2, 2.25];

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withTiming(isSliding ? 1.5 : 1, { duration: 300 }) },
        { translateX: withTiming(isSliding ? 10 : 0, { duration: 300 }) },
        { translateY: withTiming(isSliding ? -30 : 0, { duration: 300 }) },
      ],
      backgroundColor: withTiming(isSliding ? themeColors.accent : themeColors.accent, {
        duration: 300,
      }),
    };
  }, [isSliding]);

  return (
    <View
      className="flex-col justify-center mx-7 flex-1 pt-10"
      // style={{ width: COMPONENT_WIDTH, paddingHorizontal: COMPONENT_PADDING }}
    >
      {/* <Text className="ml-2 text-lg font-bold">Audio Speed:</Text> */}
      <View
        className="flex flex-col p-2 mb-2 bg-['#ffffffaa'] border border-accent rounded-xl z-20"
        // style={{ backgroundColor: playlistColors.bg }}
      >
        {/* RATE COMPONENT */}
        <View className="flex-row justify-center space-x-1 w-full items-center mb-2 gap-[4]">
          {fixedRates.map((el) => (
            <TouchableOpacity
              key={el}
              onPress={() => updateRate(el)}
              className={`px-2 py-1 ${el == rate ? "bg-accent" : "bg-white"}`}
              style={{
                borderRadius: 5,
                // backgroundColor: el == rate ? playlistColors.btnText : playlistColors.btnBg,
                // borderColor: playlistColors.btnBorder,
                borderWidth: StyleSheet.hairlineWidth,
              }}
            >
              <Text
                allowFontScaling={false}
                className={`${
                  el === rate ? "text-accent-foreground" : "text-black"
                } font-firacode text-base`}
                // style={{ color: el === rate ? playlistColors.btnBg : playlistColors.btnText }}
              >
                {el.toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Slider
          style={{
            width: COMPONENT_WIDTH - 40,
            paddingHorizontal: COMPONENT_PADDING,
          }}
          minimumTrackTintColor={THEME.light.accent}
          maximumTrackTintColor={"white"}
          thumbTintColor={THEME.light.accent}
          minimumValue={50}
          maximumValue={400}
          step={5}
          tapToSeek
          value={rate * 100}
          onValueChange={(val) => {
            setRate(val / 100);
          }}
          onSlidingStart={() => setIsSliding(true)}
          onSlidingComplete={(val) => {
            updateRate(val / 100);
            setIsSliding(false);
          }}
        />

        <View className="flex-row justify-end">
          <Animated.View
            style={[
              animatedStyle,
              {
                borderRadius: 8,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: themeColors.accentForeground,
                flexDirection: "row",
                justifyContent: isSliding ? "center" : "flex-end",
                marginRight: 8,
              },
            ]}
          >
            <Text
              className={`text-accent-foreground font-firacode text-xl px-2  ${
                isSliding ? "text-accent-foreground" : "font-semibold"
              }`}
            >
              {rate.toFixed(2)}
            </Text>
          </Animated.View>
        </View>
      </View>
      {/* RATE COMPONENT END */}
      <View className="flex-1">{/* <Text>Sleep Timer</Text> */}</View>
      {/* <TrackPlayerScrollerSleepTime /> */}
    </View>
  );
};

export default BookRateCycle;
