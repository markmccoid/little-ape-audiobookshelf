import { useBookChapters } from "@/src/hooks/useBookChapters";
import { BookContainerRoute } from "@/src/screens/BookViewer/BookContainer";
import { EnhancedChapter } from "@/src/store/store-books";
import { useThemeColors } from "@/src/utils/theme";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useCallback, useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

//!!!
const BookCycleChapters = () => {
  const { libraryItemId } = useLocalSearchParams<BookContainerRoute>();
  const flashListRef = useRef<FlatList<EnhancedChapter>>(null);
  const { chapters, handleChapterPressed, chapterIndex, isBookActive } = useBookChapters(
    libraryItemId,
    flashListRef
  );
  const themeColors = useThemeColors();

  // Add ref for FlashList

  const renderItem = useCallback(
    ({ item, index }: { item: EnhancedChapter; index: number }) => {
      const active = index === chapterIndex;
      const completed = index < chapterIndex;

      return (
        <View className="h-[55] border-b-hairline bg-background">
          <Pressable
            onPress={() => {
              // setLocalChapterIndex(index);
              // scrollToChapter(index);
              // loadChapter(item.startSeconds);
              handleChapterPressed(index, item.startSeconds);
            }}
          >
            <View
              className="flex-row items-center h-full px-2"
              style={{ backgroundColor: active ? `${themeColors.accent}55` : "" }}
            >
              {/* Icons - only take space when present */}
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

              {/* Title - grows to fill available space */}
              <Text
                className={`${completed ? "text-sm" : "text-base"} font-semibold flex-1 pl-2`}
                style={{
                  color: completed ? themeColors.muted : themeColors.foreground,
                }}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              {/* Time section - shrinks to content */}
              <View className="flex-col items-end justify-center ml-2" style={{ minWidth: 60 }}>
                <Text
                  numberOfLines={1}
                  className="text-xs font-semibold font-firacode"
                  style={{
                    color: completed ? themeColors.muted : themeColors.foreground,
                    fontSize: 12,
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
                      fontSize: 12,
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
    [chapterIndex, themeColors, isBookActive]
  );

  return (
    <View className="flex-1">
      <FlashList<EnhancedChapter>
        ref={flashListRef}
        className="mt-1"
        contentContainerClassName="px-1"
        data={chapters}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        extraData={chapterIndex}
      />
    </View>
  );
};

export default BookCycleChapters;
