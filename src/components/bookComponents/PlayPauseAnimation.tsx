import { SymbolView } from "expo-symbols";
import React, { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type PlayPauseAnimationProps = {
  isPlaying: boolean;
  size?: number;
  playIconName?: string;
  pauseIconName?: string;
  duration?: number;
};

/**
 * PlayPauseAnimation component
 * Uses Reanimated 4's CSS-like animation properties to create smooth morphing transitions
 * between play and pause states
 */
const PlayPauseAnimation = ({
  isPlaying,
  size = 32,
  playIconName = "play.fill",
  pauseIconName = "pause.fill",
  duration = 300,
}: PlayPauseAnimationProps) => {
  // Shared values for play icon animation (morphing effect)
  const playOpacity = useSharedValue(isPlaying ? 0 : 1);
  const playScale = useSharedValue(isPlaying ? 0.5 : 1);

  // Shared values for pause icon animation (morphing effect)
  const pauseOpacity = useSharedValue(isPlaying ? 1 : 0);
  const pauseScale = useSharedValue(isPlaying ? 1 : 0.5);

  useEffect(() => {
    // Morphing easing curve - creates smooth in-out transition
    const morphEasing = Easing.bezier(0.4, 0.0, 0.2, 1);

    if (isPlaying) {
      // Morphing to pause icon: play icon shrinks and fades while pause grows and appears
      playOpacity.value = withTiming(0, {
        duration: duration * 0.6, // Fade out faster
        easing: morphEasing,
      });
      playScale.value = withTiming(0.5, {
        duration,
        easing: morphEasing,
      });

      pauseOpacity.value = withTiming(1, {
        duration: duration * 0.8, // Fade in slightly slower for overlap
        easing: morphEasing,
      });
      pauseScale.value = withTiming(1, {
        duration,
        easing: morphEasing,
      });
    } else {
      // Morphing to play icon: pause icon shrinks and fades while play grows and appears
      pauseOpacity.value = withTiming(0, {
        duration: duration * 0.6, // Fade out faster
        easing: morphEasing,
      });
      pauseScale.value = withTiming(0.5, {
        duration,
        easing: morphEasing,
      });

      playOpacity.value = withTiming(1, {
        duration: duration * 0.8, // Fade in slightly slower for overlap
        easing: morphEasing,
      });
      playScale.value = withTiming(1, {
        duration,
        easing: morphEasing,
      });
    }
  }, [isPlaying, duration, playOpacity, playScale, pauseOpacity, pauseScale]);

  // Animated styles for play icon (morphing effect)
  const playAnimatedStyle = useAnimatedStyle(() => ({
    opacity: playOpacity.value,
    transform: [{ scale: playScale.value }],
    position: "absolute",
  }));

  // Animated styles for pause icon (morphing effect)
  const pauseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pauseOpacity.value,
    transform: [{ scale: pauseScale.value }],
    position: "absolute",
  }));

  return (
    <Animated.View style={{ width: size, height: size, position: "relative" }}>
      <Animated.View style={playAnimatedStyle}>
        <SymbolView name={playIconName} size={size} />
      </Animated.View>
      <Animated.View style={pauseAnimatedStyle}>
        <SymbolView name={pauseIconName} size={size} />
      </Animated.View>
    </Animated.View>
  );
};

export default PlayPauseAnimation;
