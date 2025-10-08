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
import React, { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function MiniPlayer() {
  const showMini = useShowMiniPlayer();
  const isPlaying = usePlaybackIsPlaying();
  const isBookLoaded = usePlaybackStore((state) => state.isLoaded);
  const position = usePlaybackPosition() || 0;
  const duration = usePlaybackDuration();
  const session = usePlaybackSession();
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
    <Link href="/main-player" asChild>
      <Pressable
        onPress={() => setIsOnBookScreen(true)}
        className="mx-2 px-3 py-2 bg-slate-400 border-t border-slate-700 absolute rounded-lg"
        style={{ bottom: 100 }}
      >
        <View className="flex-row items-center justify-between w-full">
          <View className="flex-1 pr-3">
            <Text numberOfLines={1} className="text-slate-100 font-semibold">
              {session?.displayTitle ?? "Playing"}
            </Text>
            <Text numberOfLines={1} className="text-slate-300 text-xs">
              {session?.displayAuthor ?? ""}
            </Text>
          </View>

          <View className="flex-row items-center gap-3">
            <Pressable onPress={onBack} className="px-2 py-1 rounded bg-slate-700">
              <Text className="text-slate-100">-{seekBackwardSeconds}s</Text>
            </Pressable>

            <Pressable onPress={onToggle} className="px-3 py-2 rounded bg-emerald-600">
              <Text className="text-white font-semibold">{isPlaying ? "Pause" : "Play"}</Text>
            </Pressable>

            <Pressable onPress={onFwd} className="px-2 py-1 rounded bg-slate-700">
              <Text className="text-slate-100">+{seekForwardSeconds}s</Text>
            </Pressable>

            <Pressable onPress={closeSession} className="px-2 py-1 rounded bg-rose-600">
              <Text className="text-white">Close</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-2 h-1 rounded bg-slate-600 overflow-hidden">
          <View style={{ width: `${progressPct}%` }} className="h-full bg-emerald-500" />
        </View>
      </Pressable>
    </Link>
  );
}
