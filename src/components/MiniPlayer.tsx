import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import {
  usePlaybackActions,
  usePlaybackIsPlaying,
  usePlaybackPosition,
  usePlaybackDuration,
  usePlaybackSession,
  useShowMiniPlayer,
} from "@store/store-playback";
import { useSeekSettings } from "@store/store-settings";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function MiniPlayer() {
  const showMini = useShowMiniPlayer();
  const isPlaying = usePlaybackIsPlaying();
  const position = usePlaybackPosition();
  const duration = usePlaybackDuration();
  const session = usePlaybackSession();
  const { play, pause, seekTo, closeSession } = usePlaybackActions();
  const { seekForwardSeconds, seekBackwardSeconds } = useSeekSettings();

  const progressPct = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return clamp((position / duration) * 100, 0, 100);
  }, [position, duration]);

  if (!showMini) return null;

  const onToggle = async () => {
    if (isPlaying) await pause();
    else await play();
  };

  const onBack = async () => {
    const newPos = clamp(position - seekBackwardSeconds, 0, duration || 0);
    await seekTo(newPos);
  };

  const onFwd = async () => {
    const newPos = clamp(position + seekForwardSeconds, 0, duration || 0);
    await seekTo(newPos);
  };

  return (
    <View className="px-3 py-2 bg-slate-800 border-t border-slate-700">
      <View className="flex-row items-center justify-between">
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
    </View>
  );
}
