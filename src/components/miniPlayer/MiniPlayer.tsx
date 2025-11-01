import { useMiniPlayerDrag } from "@/src/hooks/useMiniPlayerDrag";
import { useSmartPositions } from "@/src/store/store-smartposition";
import { formatSeconds } from "@/src/utils/formatUtils";
import { useThemeColors } from "@/src/utils/theme";
import { LiquidGlassView } from "@callstack/liquid-glass";
import { Host, LinearProgress } from "@expo/ui/swift-ui";
import { background } from "@expo/ui/swift-ui/modifiers";
import {
  usePlaybackActions,
  usePlaybackDuration,
  usePlaybackIsPlaying,
  usePlaybackPosition,
  usePlaybackSession,
  useShowMiniPlayer,
} from "@store/store-playback";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useCallback, useMemo, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  SlideInDown,
  SlideOutDown,
  useAnimatedReaction,
} from "react-native-reanimated";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function MiniPlayer() {
  const { width, height } = Dimensions.get("window");
  const showMini = useShowMiniPlayer();
  const themeColors = useThemeColors();
  const position = usePlaybackPosition() || 0;
  const session = usePlaybackSession();
  const { globalPosition } = useSmartPositions(session?.libraryItemId || "");
  const isPlaying = usePlaybackIsPlaying(session?.libraryItemId || "");
  const duration = usePlaybackDuration(session?.libraryItemId || "");

  const { play, pause, closeSession, setIsOnBookScreen } = usePlaybackActions();

  // Drag functionality with swipe down to close
  const { gesture, animatedStyle, isDragging } = useMiniPlayerDrag(closeSession);

  // Sync isDragging shared value to React state to avoid reading .value during render
  const [isDraggingState, setIsDraggingState] = useState(false);

  useAnimatedReaction(
    () => isDragging.value,
    (current) => {
      runOnJS(setIsDraggingState)(current);
    },
    [isDragging]
  );

  const progressPct = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return clamp((position / duration) * 100, 0, 100);
  }, [position, duration]);

  const onToggle = useCallback(async () => {
    if (isPlaying) await pause();
    else await play();
  }, [isPlaying, pause, play]);

  // Disable link navigation while dragging
  const handlePress = useCallback(() => {
    if (!isDraggingState) {
      setIsOnBookScreen(true);
    }
  }, [isDraggingState, setIsOnBookScreen]);

  if (!showMini) return null;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[animatedStyle, { width: width - 64 }]}
        entering={SlideInDown.springify()}
        exiting={SlideOutDown.springify()}
      >
        <Link href="/main-player" asChild disabled={isDraggingState}>
          <Pressable onPress={handlePress} disabled={isDraggingState}>
            <LiquidGlassView
              className="mx-2 "
              style={{
                // maxWidth: width * (2 / 3),
                borderRadius: 20,
                padding: 12,
                borderWidth: isDraggingState ? 2 : StyleSheet.hairlineWidth,
                borderColor: themeColors.accent,
              }}
            >
              {/* Main content row */}
              <View className="flex-row items-center gap-3 justify-between">
                {/* Play/Pause Button */}
                <Pressable onPress={onToggle} disabled={isDraggingState}>
                  <SymbolView
                    name={isPlaying ? "pause.circle.fill" : "play.circle.fill"}
                    type="palette"
                    colors={[themeColors.accentForeground, themeColors.accent]}
                    size={50}
                  />
                </Pressable>

                {/* Book info - flexible container */}
                <View className="shrink">
                  {/* Title */}
                  <Text
                    numberOfLines={1}
                    className="text-foreground font-semibold text-base mb-0.5"
                  >
                    {session?.displayTitle ?? "Playing"}
                  </Text>

                  {/* Author */}
                  <Text numberOfLines={1} className="text-foreground text-xs mb-1">
                    {session?.displayAuthor ?? "Unknown Author"}
                  </Text>

                  {/* Time info */}
                  <View className="flex-row items-center justify-between">
                    <Text className="text-foreground text-xs font-firacode">
                      {formatSeconds(globalPosition || 0, "compact") ?? "0:00"}
                    </Text>
                    <Text className="text-foreground text-xs font-firacode">
                      {formatSeconds(session?.duration || 0, "compact") ?? "0:00"}
                    </Text>
                  </View>
                </View>

                {/* Cover image */}
                <Image
                  source={session?.coverURL}
                  style={{ width: 55, height: 55, borderRadius: 8 }}
                />
              </View>

              {/* Progress bar */}
              <Host style={{ marginTop: 12 }}>
                <LinearProgress
                  progress={progressPct / 100}
                  color={themeColors.accent}
                  modifiers={[background("white")]}
                />
              </Host>

              {/* <View className="mt-3 h-1 rounded-full bg-white/80 overflow-hidden">
                <View
                  style={{ width: `${progressPct}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </View> */}
            </LiquidGlassView>
          </Pressable>
        </Link>
      </Animated.View>
    </GestureDetector>
  );
}
