import { useBookData } from "@/src/hooks/trackPlayerHooks";
import { BookContainerRoute } from "@/src/screens/BookViewer/BookContainer";
import { EnhancedChapter } from "@/src/store/store-books";
import { usePlaybackActions } from "@/src/store/store-playback";
import { useSmartPositions } from "@/src/store/store-smartposition";
import { useThemeColors } from "@/src/utils/theme";
import { FlashList } from "@shopify/flash-list";
import { BlurView } from "expo-blur";
import { useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  const {
    chapterInfo: { chapterIndex },
  } = useSmartPositions(libraryItemId);
  const playbackActions = usePlaybackActions();

  const [localChapterIndex, setLocalChapterIndex] = useState(chapterIndex);
  const themeColors = useThemeColors();

  useEffect(() => {
    if (chapterIndex !== localChapterIndex) {
      setLocalChapterIndex(chapterIndex);
    }
  }, [chapterIndex]);

  const loadChapter = useCallback(
    async (chapterStart: number) => {
      await playbackActions.loadBook(libraryItemId);
      await playbackActions.seekTo(chapterStart);
      if (!isBookActive) playbackActions.play();
    },
    [libraryItemId, isBookActive, playbackActions]
  );

  // console.log("Book Chapters", isBookActive);
  //!! NEED TO make it so that if the book is NOT playing, the chapters are "disabled"
  //!! OR They can start the playback???
  const renderItem = useCallback(
    ({ item, index }: { item: EnhancedChapter; index: number }) => {
      const active = index === localChapterIndex;
      const completed = index < localChapterIndex;

      return (
        <BlurView className="h-[75] border-b-hairline" intensity={80} tint="extraLight">
          <Pressable
            onPress={() => {
              setLocalChapterIndex(index);
              loadChapter(item.startSeconds);
            }}
          >
            <View
              className="flex-row items-center justify-between h-full px-2"
              style={{ backgroundColor: active ? `${themeColors.accent}55` : "" }}
            >
              {completed && (
                <SymbolView
                  name="checkmark.seal.fill"
                  tintColor="gray"
                  size={20}
                  style={{ marginRight: 4 }}
                />
              )}
              {active && (
                <SymbolView
                  name="play.circle.fill"
                  type="palette"
                  colors={["white", themeColors.accent]}
                  size={20}
                  style={{
                    marginRight: 4,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderRadius: 20,
                  }}
                />
              )}
              <Text
                className={`${
                  completed ? "text-base text-gray-600" : "text-lg"
                } w-4/6 font-semibold pl-2`}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <View className="flex-col items-end justify-center flex-1">
                <Text numberOfLines={1} className="font-firacode font-semibold">
                  {item.formattedChapterDuration}
                </Text>
                <View className="flex-row items-center">
                  <Text numberOfLines={1} className="font-firacode font-semibold">
                    {item.remainingPercentage}%
                  </Text>
                  <SymbolView
                    name="arrow.right.circle.dotted"
                    tintColor={themeColors.accent}
                    size={20}
                  />
                </View>
              </View>
            </View>
          </Pressable>
        </BlurView>
      );
    },
    [localChapterIndex, loadChapter, themeColors]
  );
  return (
    <View className="flex-1">
      <FlashList<EnhancedChapter>
        // className="h-[300]"
        className="mt-1"
        contentContainerClassName="px-1"
        data={book?.chapters}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        extraData={localChapterIndex}
      />
    </View>
  );
};

export default BookChapters;
