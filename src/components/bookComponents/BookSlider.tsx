import { useBookData, useSmartPosition } from "@/src/hooks/trackPlayerHooks";
import {
  useIsBookActive,
  usePlaybackActions,
  usePlaybackDuration,
} from "@/src/store/store-playback";
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
interface BookSliderProps {
  libraryItemId: string;
  useStaticColors?: boolean;
}

const BookSlider: React.FC<BookSliderProps> = ({ libraryItemId, useStaticColors = false }) => {
  const { position } = useSmartPosition(libraryItemId);
  const { duration: bookDuration } = useBookData(libraryItemId);
  const isBookActive = useIsBookActive(libraryItemId);
  const playbackDuration = usePlaybackDuration(libraryItemId);
  const { seekTo } = usePlaybackActions();
  const themeColors = useThemeColors();

  const animatePosition = useSharedValue(0);

  const duration = playbackDuration || bookDuration || 0;

  // Track if user is actively sliding
  const [isUserSliding, setIsUserSliding] = useState(false);
  // Local slider value when user is actively sliding
  const [localSliderValue, setLocalSliderValue] = useState(0);

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

    // animatePosition.value = withTiming(1, { duration: 1000 });
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
      energyThreshold: 6e-9,
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
      await seekTo(value);

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
      transform: [{ translateY }, { scale }],

      opacity: interpolate(animatePosition.value, [0, 1], [0, 1]),
      // display: animatePosition.value == 0 ? "none" : "contents",
    };
  });
  return (
    <View className="flex-col justify-center items-center mx-3 relative">
      <Animated.View
        style={[
          animStyle,
          {
            // transform: [{ translateY: -150 }],
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
          },
        ]}
        // className="px-2 py-1 w-[100] justify-center flex-row h-auto"
      >
        <Text className="text-lg text-accent-foreground">{formatSeconds(sliderDisplayValue)}</Text>
      </Animated.View>
      <Text
        className="text-lg"
        style={{ color: useStaticColors ? THEME.dark.foreground : themeColors.foreground }}
      >
        {formatSeconds(sliderDisplayValue)} of {formatSeconds(duration)}
      </Text>

      <Slider
        style={{ width: "100%", height: 40 }}
        minimumValue={0}
        maximumValue={duration}
        value={sliderDisplayValue}
        step={60}
        tapToSeek
        disabled={!isBookActive}
        minimumTrackTintColor={useStaticColors ? THEME.dark.accent : themeColors.accent}
        maximumTrackTintColor={useStaticColors ? THEME.dark.foreground : themeColors.foreground}
        onSlidingStart={handleSlidingStart}
        onValueChange={handleValueChange}
        onSlidingComplete={handleSlidingComplete}
      />
    </View>
  );
};

export default BookSlider;
