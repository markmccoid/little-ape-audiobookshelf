import { usePlaybackActions, usePlaybackSession } from "@/src/store/store-playback";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { State, usePlaybackState } from "react-native-track-player";

type Props = {
  libraryItemId: string;
};
const BookControls = ({ libraryItemId }: Props) => {
  const { play, pause, updatePlaybackSpeed, togglePlayPause, setIsOnBookScreen, loadBook } =
    usePlaybackActions();
  const playbackState = usePlaybackState();
  const playbackSession = usePlaybackSession();

  // Check if player is currently playing
  const isPlaying = playbackState.state === State.Playing;
  const initBook = async () => {
    await loadBook(libraryItemId);
  };

  const localTogglePlayPause = async () => {
    if (playbackSession?.libraryItemId !== libraryItemId) {
      await loadBook(libraryItemId);
    }
    await togglePlayPause();
  };
  return (
    <View className="flex-row items-center justify-between px-5">
      <Pressable className="p-3 bg-blue-500 rounded-lg" onPress={localTogglePlayPause}>
        <Text className="text-white font-semibold">{isPlaying ? "Pause" : "Play"}</Text>
      </Pressable>
      <Pressable onPress={() => updatePlaybackSpeed(1)} className="p-2 border bg-slate-300">
        <Text>1</Text>
      </Pressable>
      <Pressable onPress={() => updatePlaybackSpeed(1.5)} className="p-2 border bg-slate-300">
        <Text>1.5</Text>
      </Pressable>
      <Pressable onPress={() => updatePlaybackSpeed(2)} className="p-2 border bg-slate-300">
        <Text>2</Text>
      </Pressable>
    </View>
  );
};

export default BookControls;
