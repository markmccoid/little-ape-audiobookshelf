import { usePlaybackRate } from "@/src/hooks/trackPlayerHooks";
import { BookContainerRoute } from "@/src/screens/BookViewer/BookContainer";
import { updatePlaybackRate } from "@/src/store/store-playback";
import { useThemeColors } from "@/src/utils/theme";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";

const MIN_VALUE = 0.5;
const MAX_VALUE = 4.0;
const STEP = 0.1;
const PIXEL_PER_STEP = 10; // How many pixels to drag for each 0.1 increment
//!!! -- Need to only show when book is active OR do check to pull proper book information.
//!!! -- If book in store-books, then we will have rate, otherwise, 1.0
export default function RateSetter() {
  const { libraryItemId } = useLocalSearchParams<BookContainerRoute>();
  const themeColors = useThemeColors();
  const currentRate = usePlaybackRate(libraryItemId);

  const value = useSharedValue(currentRate);
  const startValue = useSharedValue(currentRate);
  const [displayValue, setDisplayValue] = React.useState(1.0);
  const animatePosition = useSharedValue(0);
  const startY = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const isPressed = useSharedValue(false);
  const lastHapticValue = useSharedValue(currentRate);

  useEffect(() => {
    value.value = currentRate;
  }, [currentRate]);

  const updateDisplay = (val) => {
    setDisplayValue(val);
  };
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const pan = Gesture.Pan()
    .onTouchesDown(() => {
      isPressed.value = true;
    })
    .onTouchesCancelled(() => {
      isPressed.value = false;
    })
    .onTouchesUp(() => {
      isPressed.value = false;
    })
    .onStart((e) => {
      startValue.value = value.value;
      // startY.value = e.absoluteY;
      isPressed.value = true;
      startY.value = e.y;

      animatePosition.value = withSpring(1, {
        duration: 1250,
        dampingRatio: 0.5,
        mass: 20,
        overshootClamping: false,
        energyThreshold: 6e-9,
        reduceMotion: ReduceMotion.System,
      });
    })
    .onUpdate((event) => {
      offsetY.value = event.translationY; //+ startY.value;

      // Calculate velocity multiplier
      // Higher velocity = faster value changes
      const absVelocity = Math.abs(event.velocityY);

      // Negative translationY means sliding up (increase value)
      // Positive translationY means sliding down (decrease value)
      // const delta = (upOrDown * event.translationY) / PIXEL_PER_STEP; // * velocityFactor;
      const delta = -event.translationY / PIXEL_PER_STEP;

      // console.log(
      //   "Start - Trans",
      //   startValue.value,
      //   upOrDown,
      //   event.translationY,
      //   -event.translationY / PIXEL_PER_STEP
      // );
      const newValue = startValue.value + delta * STEP;

      // Clamp between min and max
      const clampedValue = Math.max(MIN_VALUE, Math.min(MAX_VALUE, newValue));

      if (clampedValue === MAX_VALUE) {
      }
      // Round to nearest 0.05
      const roundedValue = Math.round(clampedValue * 20) / 20;

      value.value = roundedValue;
      runOnJS(updateDisplay)(roundedValue);
    })
    .onEnd((event) => {
      isPressed.value = false;
      // offsetY.value = withSpring(startY.value);
      runOnJS(updatePlaybackRate)(libraryItemId, displayValue);
      animatePosition.value = withSpring(0, {
        duration: 1250,
        dampingRatio: 0.5,
        mass: 9,
        overshootClamping: false,
        energyThreshold: 6e-9,
        reduceMotion: ReduceMotion.System,
      });
    })
    .onFinalize(() => {
      isPressed.value = false;
      offsetY.value = withSpring(0, { damping: 10, stiffness: 100, mass: 1 });
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: offsetY.value },
        {
          scale: isPressed.value
            ? withSpring(1.4, { damping: 10, stiffness: 120, mass: 1 })
            : withSpring(1, { damping: 10, stiffness: 120, mass: 1 }),
        },
      ],
    };
  });

  // POP OUT
  const animStyle = useAnimatedStyle(() => {
    const scale = interpolate(animatePosition.value, [0, 1], [0.5, 2]);
    const translateX = interpolate(animatePosition.value, [0, 1], [0, 150]);
    return {
      opacity: interpolate(animatePosition.value, [0, 1], [0, 1]),
      // display: animatePosition.value == 0 ? "none" : "contents",
      transform: [{ translateX }, { scale }],
      zIndex: 10,
    };
  });

  return (
    // <GestureHandlerRootView className="">
    <View>
      <Animated.View
        className="border-hairline rounded-xl px-4 py-2 "
        style={[animStyle, { backgroundColor: themeColors.accent }]}
      >
        <Text
          className="text-2xl font-bold"
          style={{
            color: themeColors.accentForeground,
          }}
        >
          {displayValue.toFixed(2)}
        </Text>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          className="w-[55] h-50 justify-center items-center shadow-lg bg-white rounded-r-full"
          style={animatedStyle}
        >
          <SymbolView
            name="hare.circle.fill"
            size={45}
            type="palette"
            style={{ marginLeft: 10 }}
            colors={[themeColors.accent, "white"]}
          />
        </Animated.View>
      </GestureDetector>

      {/* <View className="mt-15 items-center">
          <Text className="text-sm text-gray-600 my-0.5">
            Range: {MIN_VALUE} - {MAX_VALUE}
          </Text>
          <Text className="text-sm text-gray-600 my-0.5">Step: {STEP}</Text>
        </View>  */}
    </View>
    // </GestureHandlerRootView>
  );
}
