import { useBooksActions } from "@/src/store/store-books";
import { useThemeColors } from "@/src/utils/theme";
import { useFocusEffect } from "expo-router";
import { PressableScale } from "pressto";
import React, { useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import TrackPlayer from "react-native-track-player";

//! Make these components accept a libraryItemId this way it can be used
//! in both an active book and inactive book since the useLocalSearchParams will grab the correct
//! libraryItemId based on the context
type Props = {
  libraryItemId: string;
};
const BookmarkAdd = ({ libraryItemId }: Props) => {
  const themeColors = useThemeColors();
  const bookActions = useBooksActions();
  const inputRef = useRef<TextInput>(null);
  const [bookmarkName, setBookmarkName] = useState("");

  const handleAddBookmark = async () => {
    const progress = await TrackPlayer.getProgress();
    const activeTrack = await TrackPlayer.getActiveTrack();

    const globalPosition = progress.position + (activeTrack?.trackOffset ?? 0);
    if (!bookmarkName.trim()) return; // Optional: prevent empty names

    bookActions.addBookmark(libraryItemId, { time: globalPosition, title: bookmarkName });

    // Clear the input after saving
    setBookmarkName("");
  };

  // console.log("--BOOKMARK--", position, libraryItemId);
  useFocusEffect(() => {
    console.log("Focused");
    if (inputRef.current) {
      inputRef.current.focus();
    }
    return () => console.log("UNFocused");
  });
  return (
    <View className="flex-row items-center">
      <View className="mx-2 flex-1">
        <TextInput
          ref={inputRef}
          className="border-hairline p-2 bg-white rounded-lg "
          style={{ fontSize: 16 }}
          placeholder="Enter bookmark name"
          value={bookmarkName}
          onChangeText={setBookmarkName}
        />
      </View>
      <View className="flex-row justify-end ml-2 mr-4">
        <PressableScale
          onPress={handleAddBookmark}
          style={{
            paddingVertical: 4,
            paddingHorizontal: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 10,
            backgroundColor: `${themeColors.accent}77`,
          }}
        >
          <Text className="text-accent-foreground text-xl font-semibold">Add</Text>
        </PressableScale>
      </View>
    </View>
  );
};

export default BookmarkAdd;
