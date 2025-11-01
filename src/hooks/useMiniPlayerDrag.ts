import { useMiniPlayerActions, useMiniPlayerPosition } from "@/src/store/store-miniPlayer";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Dimensions } from "react-native";
import { Directions, Gesture } from "react-native-gesture-handler";
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const MINI_PLAYER_WIDTH = screenWidth - 64;
const MINI_PLAYER_HEIGHT = 90; // Approximate height
const LONG_PRESS_DURATION = 500; // ms
export function useMiniPlayerDrag(onCloseSession?: () => void) {
  const savedPosition = useMiniPlayerPosition();
  const { setPosition } = useMiniPlayerActions();
  const insets = useSafeAreaInsets();

  // Shared values for animation
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const scale = useSharedValue(1);

  // Context values for gesture
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Initialize position from saved state or default
  useEffect(() => {
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

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const triggerCloseHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const savePosition = (x: number, y: number) => {
    setPosition({ x, y });
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

  // Swipe down gesture to close session
  const swipeDownGesture = Gesture.Fling()
    .direction(Directions.DOWN)
    .onStart(() => {
      runOnJS(triggerCloseHaptic)();
      runOnJS(handleCloseSession)();
    });
  // Swipe up gesture to reposition to default
  const swipeUpGesture = Gesture.Fling()
    .direction(Directions.UP)
    .onStart(() => {
      runOnJS(triggerCloseHaptic)();
      runOnJS(reposition)();
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
      runOnJS(triggerHaptic)();
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
      runOnJS(savePosition)(translateX.value, translateY.value);
      runOnJS(triggerHaptic)();
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
