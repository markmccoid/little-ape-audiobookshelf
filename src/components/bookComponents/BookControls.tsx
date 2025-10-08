import { useSmartPosition } from "@/src/hooks/trackPlayerHooks";
import {
  useIsBookActive,
  usePlaybackActions,
  usePlaybackIsPlaying,
} from "@/src/store/store-playback";
import React from "react";
import { Pressable, Text, View } from "react-native";
import PlayPauseAnimation from "./PlayPauseAnimation";

type Props = {
  libraryItemId: string;
};
const BookControls = ({ libraryItemId }: Props) => {
  const { play, pause, updatePlaybackSpeed, togglePlayPause, loadBook } = usePlaybackActions();

  const isBookActive = useIsBookActive(libraryItemId);
  const { position } = useSmartPosition(libraryItemId);
  const isPlaying = usePlaybackIsPlaying();
  console.log("BookControls", isPlaying);
  const localTogglePlayPause = async () => {
    if (!isBookActive) {
      await loadBook(libraryItemId);
    }
    await togglePlayPause();
  };

  // Determine if we should show playing state
  // We don't want to show that the book is playing if it is not the active
  const showPlayingState = isBookActive && isPlaying;
  return (
    <View className="flex-row items-center justify-between px-5">
      <Pressable className="p-3 rounded-lg" onPress={localTogglePlayPause}>
        <PlayPauseAnimation isPlaying={showPlayingState} size={50} duration={600} />
      </Pressable>
      {isBookActive && (
        <View>
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
      )}
    </View>
  );
};

export default BookControls;
