import { THEME, useThemeColors } from "@/src/utils/theme";
import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
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
  isBookActive: boolean;
  duration?: number;
};

/**
 * PlayPauseAnimation component
 * Uses Reanimated 4's CSS-like animation properties to create smooth morphing transitions
 * between three states: resume (not active), play (active but paused), and pause (active and playing)
 */
const PlayPauseAnimation = ({
  isPlaying,
  size = 32,
  playIconName = "play.fill",
  pauseIconName = "pause.fill",
  isBookActive,
  duration = 300,
}: PlayPauseAnimationProps) => {
  const resumeIconName = "livephoto.play"; //memories
  const themeColors = useThemeColors();
  // Determine initial state based on props
  const getInitialOpacity = (icon: "resume" | "play" | "pause") => {
    if (!isBookActive) return icon === "resume" ? 1 : 0;
    if (isPlaying) return icon === "pause" ? 1 : 0;
    return icon === "play" ? 1 : 0;
  };

  const getInitialScale = (icon: "resume" | "play" | "pause") => {
    if (!isBookActive) return icon === "resume" ? 1 : 0.5;
    if (isPlaying) return icon === "pause" ? 1 : 0.5;
    return icon === "play" ? 1 : 0.5;
  };

  // Shared values for resume icon animation (when book is not active)
  const resumeOpacity = useSharedValue(getInitialOpacity("resume"));
  const resumeScale = useSharedValue(getInitialScale("resume"));

  // Shared values for play icon animation (when book is active but paused)
  const playOpacity = useSharedValue(getInitialOpacity("play"));
  const playScale = useSharedValue(getInitialScale("play"));

  // Shared values for pause icon animation (when book is active and playing)
  const pauseOpacity = useSharedValue(getInitialOpacity("pause"));
  const pauseScale = useSharedValue(getInitialScale("pause"));

  useEffect(() => {
    // Morphing easing curve - creates smooth in-out transition
    const morphEasing = Easing.bezier(0.4, 0.0, 0.2, 1);
    if (!isBookActive) {
      // State 1: Book is NOT active - show resume icon
      // Hide play and pause icons, show resume icon
      resumeOpacity.value = withTiming(1, {
        duration: duration * 0.8,
        easing: morphEasing,
      });
      resumeScale.value = withTiming(1, {
        duration,
        easing: morphEasing,
      });

      playOpacity.value = withTiming(0, {
        duration: duration * 0.6,
        easing: morphEasing,
      });
      playScale.value = withTiming(0.5, {
        duration,
        easing: morphEasing,
      });

      pauseOpacity.value = withTiming(0, {
        duration: duration * 0.6,
        easing: morphEasing,
      });
      pauseScale.value = withTiming(0.5, {
        duration,
        easing: morphEasing,
      });
    } else if (isPlaying) {
      // State 2: Book is active AND playing - show pause icon
      // Hide resume and play icons, show pause icon
      resumeOpacity.value = withTiming(0, {
        duration: duration * 0.6,
        easing: morphEasing,
      });
      resumeScale.value = withTiming(0.5, {
        duration,
        easing: morphEasing,
      });

      playOpacity.value = withTiming(0, {
        duration: duration * 0.6,
        easing: morphEasing,
      });
      playScale.value = withTiming(0.5, {
        duration,
        easing: morphEasing,
      });

      pauseOpacity.value = withTiming(1, {
        duration: duration * 0.8,
        easing: morphEasing,
      });
      pauseScale.value = withTiming(1, {
        duration,
        easing: morphEasing,
      });
    } else {
      // State 3: Book is active BUT paused - show play icon
      // Hide resume and pause icons, show play icon
      resumeOpacity.value = withTiming(0, {
        duration: duration * 0.6,
        easing: morphEasing,
      });
      resumeScale.value = withTiming(0.5, {
        duration,
        easing: morphEasing,
      });

      playOpacity.value = withTiming(1, {
        duration: duration * 0.8,
        easing: morphEasing,
      });
      playScale.value = withTiming(1, {
        duration,
        easing: morphEasing,
      });

      pauseOpacity.value = withTiming(0, {
        duration: duration * 0.6,
        easing: morphEasing,
      });
      pauseScale.value = withTiming(0.5, {
        duration,
        easing: morphEasing,
      });
    }
  }, [
    isBookActive,
    isPlaying,
    duration,
    resumeOpacity,
    resumeScale,
    playOpacity,
    playScale,
    pauseOpacity,
    pauseScale,
  ]);

  // Animated styles for resume icon (when not active)
  const resumeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: resumeOpacity.value,
    transform: [{ scale: resumeScale.value }],
    position: "absolute",
  }));

  // Animated styles for play icon (when active but paused)
  const playAnimatedStyle = useAnimatedStyle(() => ({
    opacity: playOpacity.value,
    transform: [{ scale: playScale.value }],
    position: "absolute",
  }));

  // Animated styles for pause icon (when active and playing)
  const pauseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pauseOpacity.value,
    transform: [{ scale: pauseScale.value }],
    position: "absolute",
  }));

  return (
    <Animated.View style={{ width: size, height: size, position: "relative" }}>
      {/* Resume icon - shown when book is not active */}
      <Animated.View style={resumeAnimatedStyle}>
        <SymbolView name={resumeIconName} size={size} tintColor={THEME.light.accent} />
      </Animated.View>
      {/* Play icon - shown when book is active but paused */}
      <Animated.View style={playAnimatedStyle}>
        <SymbolView name={playIconName} size={size} tintColor={THEME.light.accent} />
      </Animated.View>
      {/* Pause icon - shown when book is active and playing */}
      <Animated.View style={pauseAnimatedStyle}>
        <SymbolView name={pauseIconName} size={size} tintColor={THEME.light.accent} />
      </Animated.View>
    </Animated.View>
  );
};

export default PlayPauseAnimation;
