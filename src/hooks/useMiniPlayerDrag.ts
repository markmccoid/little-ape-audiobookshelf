import { useMiniPlayerActions, useMiniPlayerPosition } from "@/src/store/store-miniPlayer";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Dimensions } from "react-native";
import { Directions, Gesture } from "react-native-gesture-handler";
import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useFiltersStore } from "../store/store-filters";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
// const MINI_PLAYER_WIDTH = screenWidth - 64;
const MINI_PLAYER_HEIGHT = 90; // Approximate height
const LONG_PRESS_DURATION = 500; // ms
export function useMiniPlayerDrag(onCloseSession?: () => void) {
  // If filter sheet is shown, use 75 width, otherwise use screenWidth - 64
  const filterSheetShown = useFiltersStore((state) => state.filterSheetShown);
  const regularMini = !filterSheetShown;
  const MINI_PLAYER_WIDTH = regularMini ? screenWidth - 64 : 75;
  const savedPosition = useMiniPlayerPosition();
  const { setPosition, resetPosition } = useMiniPlayerActions();
  const insets = useSafeAreaInsets();

  // Shared values for animation
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const scale = useSharedValue(1);

  // Store previous position to revert to
  const previousPositionX = useSharedValue(0);
  const previousPositionY = useSharedValue(0);

  // Context values for gesture
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Boundary clamping
  const clampX = (x: number) => {
    "worklet";
    const minX = insets.left;
    const maxX = screenWidth - MINI_PLAYER_WIDTH - insets.right;
    return Math.max(minX, Math.min(maxX, x));
  };

  const clampY = (y: number) => {
    "worklet";
    const minY = insets.top;
    const maxY = screenHeight - MINI_PLAYER_HEIGHT - insets.bottom;
    return Math.max(minY, Math.min(maxY, y));
  };

  // Initialize position from saved state or default
  useEffect(() => {
    if (filterSheetShown) return;
    if (savedPosition) {
      translateX.value = savedPosition.x;
      translateY.value = savedPosition.y;
    } else {
      // Default position: centered horizontally, near bottom
      const defaultX = (screenWidth - MINI_PLAYER_WIDTH) / 2;
      const defaultY = screenHeight - MINI_PLAYER_HEIGHT - insets.bottom - 55;
      translateX.value = defaultX;
      translateY.value = defaultY;
    }
  }, [savedPosition, screenWidth, screenHeight, insets.bottom, translateX, translateY]);

  // Handle Filter Sheet Toggle
  // Ref to track if we have already entered filtered mode to prevent re-saving position on layout updates
  const isFilteredRef = useRef(false);

  useEffect(() => {
    if (filterSheetShown) {
      // 1. Save current position ONLY if we weren't already filtered
      if (!isFilteredRef.current) {
        previousPositionX.value = translateX.value;
        previousPositionY.value = translateY.value;
        isFilteredRef.current = true;
      }

      // 2. Move to bottom right
      // Target: Bottom Right.
      // Width is 75.
      const targetX = screenWidth - 75 - insets.right - 10; // 10px padding from right
      const targetY = screenHeight - MINI_PLAYER_HEIGHT - insets.bottom - 10; // 10px padding from bottom

      translateX.value = withSpring(targetX, { damping: 35, stiffness: 120 });
      translateY.value = withSpring(targetY, { damping: 35, stiffness: 120 });
    } else {
      // Revert to previous position if we have one and we were previously filtered
      if (isFilteredRef.current) {
        if (previousPositionX.value !== 0 || previousPositionY.value !== 0) {
          const clampedX = clampX(previousPositionX.value);
          const clampedY = clampY(previousPositionY.value);
          translateX.value = withSpring(clampedX, { damping: 35, stiffness: 120 });
          translateY.value = withSpring(clampedY, { damping: 35, stiffness: 120 });
        }
        isFilteredRef.current = false;
      }
    }
  }, [filterSheetShown, screenWidth, screenHeight, insets]);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const triggerCloseHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const savePosition = (x: number, y: number) => {
    // ONLY save if NOT in filter mode
    if (!filterSheetShown) {
      setPosition({ x, y });
    }
  };

  const reposition = () => {
    // Default position: centered horizontally, near bottom
    const defaultX = (screenWidth - MINI_PLAYER_WIDTH) / 2;
    const defaultY = screenHeight - MINI_PLAYER_HEIGHT - insets.bottom - 55;
    translateX.value = defaultX;
    translateY.value = defaultY;
  };
  const handleCloseSession = () => {
    if (onCloseSession) {
      onCloseSession();
    }
  };

  // Swipe down gesture to close session
  const swipeDownGesture = Gesture.Fling()
    .direction(Directions.DOWN)
    .onStart(() => {
      scheduleOnRN(triggerCloseHaptic);
      scheduleOnRN(handleCloseSession);
    });
  // Swipe up gesture to reposition to default
  const swipeUpGesture = Gesture.Fling()
    .direction(Directions.UP)
    .onStart(() => {
      scheduleOnRN(triggerCloseHaptic);
      // runOnJS(resetPosition)();
      scheduleOnRN(resetPosition);
    });

  // Combined long press + drag gesture
  const dragGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      // Store starting position
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onStart(() => {
      // Activate drag mode and visual feedback
      isDragging.value = true;
      scale.value = withSpring(1.05, { damping: 15, stiffness: 150 });
      scheduleOnRN(triggerHaptic);
    })
    .onUpdate((event) => {
      const newX = startX.value + event.translationX;
      const newY = startY.value + event.translationY;

      translateX.value = clampX(newX);
      translateY.value = clampY(newY);
    })
    .onEnd(() => {
      isDragging.value = false;
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });

      // Save final position
      // runOnJS(savePosition)(translateX.value, translateY.value);
      scheduleOnRN(savePosition, translateX.value, translateY.value);
      scheduleOnRN(triggerHaptic);
    })
    .onFinalize(() => {
      if (isDragging.value) {
        isDragging.value = false;
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      }
    })
    .minPointers(1)
    .maxPointers(1)
    .activateAfterLongPress(LONG_PRESS_DURATION);

  // Race between swipe down and drag - whichever recognizes first wins
  const composedGesture = Gesture.Race(swipeDownGesture, swipeUpGesture, dragGesture);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute" as const,
      left: translateX.value,
      top: translateY.value,
      transform: [{ scale: scale.value }],
      // Visual feedback during drag
      opacity: isDragging.value
        ? withTiming(0.9, { duration: 150 })
        : withTiming(1, { duration: 150 }),
    };
  });

  return {
    gesture: composedGesture,
    animatedStyle,
    isDragging,
  };
}
