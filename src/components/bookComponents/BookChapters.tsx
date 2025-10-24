import { useBookData } from "@/src/hooks/trackPlayerHooks";
import { BookContainerRoute } from "@/src/screens/BookViewer/BookContainer";
import { EnhancedChapter } from "@/src/store/store-books";
import { usePlaybackActions } from "@/src/store/store-playback";
import { FlashList } from "@shopify/flash-list";
import { BlurView } from "expo-blur";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
// type EnhancedChapter = {
//   id: number;
//   title: string;
//   startSeconds: number;
//   endSeconds: number;
//   formattedStart: string;
//   formattedEnd: string;
//   chapterDuration: number;
//   formattedChapterDuration: string;
// };

const BookChapters = () => {
  const { libraryItemId } = useLocalSearchParams<BookContainerRoute>();
  const { book, duration, isBookActive } = useBookData(libraryItemId);
  const playbackActions = usePlaybackActions();

  //!! NEED TO make it so that if the book is NOT playing, the chapters are "disabled"
  //!! OR They can start the playback???
  const renderItem = ({ item }: { item: EnhancedChapter }) => {
    return (
      <BlurView className="border-b-hairline py-2 px-3" intensity={100} tint="extraLight">
        <Pressable
          onPress={() => {
            console.log("PRESSED Chapter", item.startSeconds);
            playbackActions.seekTo(item.startSeconds);
          }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-lg w-2/3" numberOfLines={2}>
              {item.title}
            </Text>
            <View className="flex-row justify-end flex-1">
              <Text className=" " numberOfLines={1} lineBreakMode="tail">
                {item.formattedStart} - {item.formattedEnd}
              </Text>
            </View>
            {/* <Text>{item.formattedChapterDuration}</Text> */}
          </View>
        </Pressable>
      </BlurView>
    );
  };
  return (
    <FlashList<EnhancedChapter>
      // className="h-[300]"
      data={book?.chapters}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
    />
  );
};

export default BookChapters;
