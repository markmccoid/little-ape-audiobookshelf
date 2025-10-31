import { useBookData } from "@/src/hooks/trackPlayerHooks";
import { BookContainerRoute } from "@/src/screens/BookViewer/BookContainer";
import { EnhancedChapter } from "@/src/store/store-books";
import { usePlaybackActions } from "@/src/store/store-playback";
import { useSmartPositions } from "@/src/store/store-smartposition";
import { useThemeColors } from "@/src/utils/theme";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

const BookChapters = () => {
  const { libraryItemId } = useLocalSearchParams<BookContainerRoute>();
  const { book, duration, isBookActive } = useBookData(libraryItemId);
  const {
    chapterInfo: { chapterIndex },
  } = useSmartPositions(libraryItemId);
  const playbackActions = usePlaybackActions();

  const [localChapterIndex, setLocalChapterIndex] = useState(chapterIndex);
  const themeColors = useThemeColors();

  // Add ref for FlashList
  const flashListRef = useRef<FlatList<EnhancedChapter>>(null);

  // Function to scroll to a specific chapter
  const scrollToChapter = useCallback(
    (index: number) => {
      if (flashListRef.current && book?.chapters && index >= 0 && index < book.chapters.length) {
        flashListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0, // Centers the item vertically (0 = top, 1 = bottom)
        });
      }
    },
    [book?.chapters]
  );

  // Update local chapter index and scroll when global chapter changes
  useEffect(() => {
    if (chapterIndex !== localChapterIndex) {
      setLocalChapterIndex(chapterIndex);
      scrollToChapter(chapterIndex);
    }
  }, [chapterIndex, localChapterIndex, scrollToChapter]);

  // Scroll to current chapter on mount
  useEffect(() => {
    if (book?.chapters && localChapterIndex >= 0) {
      // Small delay to ensure FlashList is fully rendered
      const timer = setTimeout(() => {
        scrollToChapter(localChapterIndex);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [book?.chapters]); // Only run when chapters are loaded

  const loadChapter = useCallback(
    async (chapterStart: number) => {
      await playbackActions.loadBook(libraryItemId);
      await playbackActions.seekTo(chapterStart);
      if (!isBookActive) playbackActions.play();
    },
    [libraryItemId, isBookActive, playbackActions]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: EnhancedChapter; index: number }) => {
      const active = index === localChapterIndex;
      const completed = index < localChapterIndex;

      return (
        <View className="h-[75] border-b-hairline bg-background">
          <Pressable
            onPress={() => {
              setLocalChapterIndex(index);
              scrollToChapter(index);
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
                  tintColor={themeColors.muted}
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
                className={`${completed ? "text-base" : "text-lg"} w-4/6 font-semibold pl-2`}
                style={{
                  color: completed ? themeColors.muted : themeColors.foreground,
                }}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <View className="flex-col items-end justify-center flex-1">
                <Text
                  numberOfLines={1}
                  className="font-firacode font-semibold "
                  style={{
                    color: completed ? themeColors.muted : themeColors.foreground,
                  }}
                >
                  {item.formattedChapterDuration}
                </Text>
                <View className="flex-row items-center">
                  <Text
                    numberOfLines={1}
                    className="font-firacode font-semibold"
                    style={{
                      color: completed ? themeColors.muted : themeColors.foreground,
                    }}
                  >
                    {item.remainingPercentage}%
                  </Text>
                  <SymbolView
                    name="arrow.right.circle.dotted"
                    tintColor={completed ? themeColors.muted : themeColors.foreground}
                    size={20}
                  />
                </View>
              </View>
            </View>
          </Pressable>
        </View>
      );
    },
    [localChapterIndex, loadChapter, themeColors, scrollToChapter]
  );

  return (
    <View className="flex-1">
      <FlashList<EnhancedChapter>
        ref={flashListRef}
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
