import { useIsBookActive, usePlaybackActions } from "@/src/store/store-playback";
import { useSmartPositions } from "@/src/store/store-smartposition";
import { formatSeconds } from "@/src/utils/formatUtils";
import { THEME, useThemeColors } from "@/src/utils/theme";
import Slider from "@react-native-community/slider";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import BookDownloadDelete from "./BookDownloadDelete";
import { CycleFade } from "./CycleFade";
interface BookSliderProps {
  libraryItemId: string;
  forceStaticColors?: boolean;
}

const BookSlider: React.FC<BookSliderProps> = ({ libraryItemId, forceStaticColors = false }) => {
  // const { bookPosition, bookDuration, chapterDuration, chapterPosition, chapterTitle } =
  //   useSmartPosition(libraryItemId);

  const {
    globalPosition,
    globalDuration,
    chapterInfo: {
      chapterDuration,
      chapterPosition,
      chapterTitle,
      chapterNumber,
      chapterStart,
      chapterEnd,
      numOfChapters,
    },
  } = useSmartPositions(libraryItemId);

  // const { duration: globalDuration } = useBookData(libraryItemId);
  const isBookActive = useIsBookActive(libraryItemId);
  const { seekTo } = usePlaybackActions();
  const themeColors = useThemeColors();

  const animatePosition = useSharedValue(0);

  const position = chapterPosition;
  const duration = chapterDuration; //playbackDuration || globalDuration || 0;

  // Track if user is actively sliding
  const [isUserSliding, setIsUserSliding] = useState(false);
  // Local slider value when user is actively sliding
  const [localSliderValue, setLocalSliderValue] = useState(0);

  const sliderValueStart = useRef<number>(0);
  // Ref to track the last seek time to prevent race conditions
  const lastSeekTimeRef = useRef<number>(0);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Update local value when position changes (only if not sliding)
  useEffect(() => {
    if (!isUserSliding && position !== undefined) {
      setLocalSliderValue(position);
    }
  }, [position, isUserSliding]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, []);

  // Calculate the display value for the slider
  const sliderDisplayValue = isUserSliding ? localSliderValue : position || 0;

  const handleSlidingStart = () => {
    // Clear any pending timeout from previous slide
    // This prevents the old timeout from setting isUserSliding to false
    // if user starts sliding again before it completes
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
    animatePosition.value = withSpring(1, {
      duration: 1250,
      dampingRatio: 0.5,
      mass: 20,
      overshootClamping: false,
      energyThreshold: 6e-9,
      reduceMotion: ReduceMotion.System,
    });

    //##
    sliderValueStart.current = position || 0;
    setIsUserSliding(true);
  };

  const handleValueChange = (value: number) => {
    if (isUserSliding) {
      setLocalSliderValue(value);
    }
  };

  const handleSlidingComplete = async (value: number) => {
    animatePosition.value = withSpring(0, {
      duration: 1250,
      dampingRatio: 0.5,
      mass: 9,
      overshootClamping: false,
      reduceMotion: ReduceMotion.System,
    });
    // animatePosition.value = withTiming(0, { duration: 500 });
    // Clear any pending seek timeout (defensive programming)
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }

    // Record the seek time
    lastSeekTimeRef.current = Date.now();

    try {
      // Perform the seek
      // console.log("SEEK TO disabled", value, sliderValueStart.current, globalPosition);
      await seekTo(value - sliderValueStart.current + (globalPosition || 0));

      // Delay before allowing position updates again
      // This prevents the old position from overwriting our seek
      // The timeout will be cleared if user starts sliding again
      seekTimeoutRef.current = setTimeout(() => {
        setIsUserSliding(false);
        seekTimeoutRef.current = null; // Clean up ref
      }, 1000);
    } catch (error) {
      console.error("Seek error:", error);
      setIsUserSliding(false);
      seekTimeoutRef.current = null;
    }
  };

  const animStyle = useAnimatedStyle(() => {
    const scale = interpolate(animatePosition.value, [0, 1], [0.5, 2]);
    const translateY = interpolate(animatePosition.value, [0, 1], [0, -150]);
    return {
      width: 100,
      // borderRadius: 10,
      transform: [{ translateY }, { scale }],
      opacity: interpolate(animatePosition.value, [0, 1], [0, 1]),
      // display: animatePosition.value == 0 ? "none" : "contents",
    };
  });

  // console.log(
  //   "Chapter Start/End",
  //   formatSeconds(chapterStart),
  //   formatSeconds(chapterEnd),
  //   formatSeconds(chapterDuration - sliderDisplayValue)
  // );

  return (
    <View className="flex-col justify-center items-center mx-3 relative">
      {/* POP UP SLIDER VALUE */}
      <Animated.View style={[animStyle]}>
        <View
          style={{
            borderRadius: 10,
            borderWidth: StyleSheet.hairlineWidth,
            zIndex: 10,
            position: "absolute",
            backgroundColor: themeColors.accent,
            paddingHorizontal: 2,
            paddingVertical: 1,
            width: 100,
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          <Text className="text-lg text-accent-foreground font-firacode font-semibold">
            {formatSeconds(sliderDisplayValue)}
          </Text>
        </View>
      </Animated.View>

      <View className="flex-col py-2  items-center w-full">
        {/* Header Row */}
        <View className="w-full items-center justify-center">
          <Text
            className="text-xl font-semibold ml-4"
            numberOfLines={1}
            lineBreakMode="tail"
            lineBreakStrategyIOS="standard"
            style={{ color: forceStaticColors ? THEME.dark.foreground : themeColors.foreground }}
          >
            {chapterNumber} - {chapterTitle}
          </Text>
        </View>
        {!isBookActive && (
          <View className="flex-row items-center justify-center relative w-full">
            {/* DOWNLOAD BUTTON */}
            <BookDownloadDelete libraryItemId={libraryItemId} />

            {/* INITIAL STATS -- BOOK NOT ACTIVE */}
            <View
              className="flex-col items-center justify-center px-3 py-1 border-hairline rounded-xl"
              style={{ backgroundColor: `${themeColors.accent}33` }}
            >
              <Text
                className="text-lg font-firacode"
                style={{
                  color: forceStaticColors ? THEME.dark.foreground : themeColors.foreground,
                }}
              >
                {formatSeconds(globalPosition)} of {formatSeconds(globalDuration)}
              </Text>
              <Text
                className="text-lg font-firacode"
                style={{
                  color: forceStaticColors ? THEME.dark.foreground : themeColors.foreground,
                }}
              >
                {formatSeconds(globalDuration - globalPosition)} Left
              </Text>
            </View>
          </View>
        )}
      </View>
      {isBookActive && (
        <View className="flex-col w-full">
          <Slider
            style={{ height: 35, marginHorizontal: 10 }}
            minimumValue={0}
            maximumValue={duration}
            value={sliderDisplayValue}
            // if chapter is more than an hour switch to 1 minute step
            // found issues with long durations trying to allow seconds
            step={chapterDuration > 3600 ? 60 : 1}
            // tapToSeek
            disabled={!isBookActive}
            minimumTrackTintColor={forceStaticColors ? THEME.dark.accent : themeColors.accent}
            maximumTrackTintColor={
              forceStaticColors ? THEME.dark.foreground : themeColors.foreground
            }
            onSlidingStart={handleSlidingStart}
            onValueChange={handleValueChange}
            onSlidingComplete={handleSlidingComplete}
          />

          <View
            className="flex-row justify-between items-center px-2 py-1 border-hairline"
            style={{ backgroundColor: `${themeColors.accent}33`, borderRadius: 10 }}
          >
            <Text
              className="font-firacode "
              style={{ color: forceStaticColors ? THEME.dark.foreground : themeColors.foreground }}
            >
              {formatSeconds(sliderDisplayValue, "compact")}
            </Text>
            {/* CENTER TEXT CYCLE */}
            <CycleFade transitionDurationMs={500}>
              <Text
                className="text-sm font-firacode font-semibold"
                style={{
                  color: forceStaticColors ? THEME.dark.foreground : themeColors.foreground,
                }}
              >
                {formatSeconds(globalPosition)} of {formatSeconds(globalDuration)}
              </Text>
              <Text
                className="text-sm font-firacode "
                style={{
                  color: forceStaticColors ? THEME.dark.foreground : themeColors.foreground,
                }}
              >
                {Math.round((globalPosition / globalDuration) * 100)}%
              </Text>
              <Text
                className="text-sm font-firacode font-semibold"
                style={{
                  color: forceStaticColors ? THEME.dark.foreground : themeColors.foreground,
                }}
              >
                {formatSeconds(globalDuration - globalPosition)} left
              </Text>
            </CycleFade>
            <Text
              className="font-firacode "
              style={{ color: forceStaticColors ? THEME.dark.foreground : themeColors.foreground }}
            >
              {formatSeconds(chapterDuration - sliderDisplayValue, "compact")}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default BookSlider;
