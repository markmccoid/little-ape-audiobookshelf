import { useThemeColors } from "@/src/utils/theme";
import { LiquidGlassView } from "@callstack/liquid-glass";
import {
  usePlaybackActions,
  usePlaybackDuration,
  usePlaybackIsPlaying,
  usePlaybackPosition,
  usePlaybackSession,
  usePlaybackStore,
  useShowMiniPlayer,
} from "@store/store-playback";
import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function MiniPlayer() {
  const showMini = useShowMiniPlayer();
  const { bottom } = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const isBookLoaded = usePlaybackStore((state) => state.isLoaded);
  const position = usePlaybackPosition() || 0;
  const session = usePlaybackSession();
  const isPlaying = usePlaybackIsPlaying(session?.libraryItemId || "");
  const duration = usePlaybackDuration(session?.libraryItemId || "");

  const { play, pause, seekTo, closeSession, setIsOnBookScreen } = usePlaybackActions();

  // console.log("MiniPlayer", showMini, isBookLoaded, position);
  const seekBackwardSeconds = 15;
  const seekForwardSeconds = 15;
  const progressPct = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return clamp((position / duration) * 100, 0, 100);
  }, [position, duration]);

  if (!showMini) return null;

  const onToggle = useCallback(async () => {
    if (isPlaying) await pause();
    else await play();
  }, [isPlaying, pause, play]);

  const onBack = useCallback(async () => {
    const newPos = clamp(position - seekBackwardSeconds, 0, duration || 0);
    await seekTo(newPos);
  }, [position, seekBackwardSeconds, duration, seekTo]);

  const onFwd = useCallback(async () => {
    const newPos = clamp(position + seekForwardSeconds, 0, duration || 0);
    await seekTo(newPos);
  }, [position, seekForwardSeconds, duration, seekTo]);

  const onValueChange = (val) => {
    console.log("valChange", val);
  };
  return (
    <Animated.View
      style={{ width: 200, position: "absolute", bottom: bottom + 55 }}
      className="flex-row justify-center border-2 flex-1"
    >
      <Link href="/main-player" asChild>
        <Pressable
          onPress={() => setIsOnBookScreen(true)}
          className="flex-1"

          // className="mx-2 px-3 py-2 bg-slate-400 border-t border-slate-700 absolute rounded-lg"
        >
          <LiquidGlassView
            className="mx-2  "
            tintColor={""}
            // className="flex-row items-center justify-between w-full"
            style={{
              borderRadius: 20,
              padding: 10,
              borderWidth: StyleSheet.hairlineWidth,
            }}
          >
            <View className="flex-1 pr-3">
              <Text numberOfLines={1} className="text-slate-100 font-semibold">
                {session?.displayTitle ?? "Playing"}
              </Text>
              <Text numberOfLines={1} className="text-slate-300 text-xs">
                {session?.displayAuthor ?? ""}
              </Text>
            </View>

            <View className="flex-row items-center gap-3">
              {/* <Pressable onPress={onBack} className="px-2 py-1 rounded bg-slate-700">
              <Text className="text-slate-100">-{seekBackwardSeconds}s</Text>
            </Pressable> */}

              <Pressable onPress={onToggle} className="">
                <SymbolView
                  name={isPlaying ? "pause.circle.fill" : "play.circle.fill"}
                  type="palette"
                  colors={[themeColors.accentForeground, themeColors.accent]}
                  size={40}
                />
              </Pressable>

              {/* <Pressable onPress={onFwd} className="px-2 py-1 rounded bg-slate-700">
              <Text className="text-slate-100">+{seekForwardSeconds}s</Text>
            </Pressable> */}

              <Pressable onPress={closeSession} className="px-2 py-1 rounded bg-rose-600">
                <Text className="text-white">Close</Text>
              </Pressable>
            </View>

            <View className="mt-2 h-1 rounded bg-white overflow-hidden">
              <View style={{ width: `${progressPct}%` }} className="h-full bg-emerald-500" />
            </View>
          </LiquidGlassView>
        </Pressable>
      </Link>
    </Animated.View>
  );
}
