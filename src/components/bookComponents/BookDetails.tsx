import { useBookData } from "@/src/hooks/trackPlayerHooks";
import { BookContainerRoute } from "@/src/screens/BookViewer/BookContainer";
import { useSmartPositions } from "@/src/store/store-smartposition";
import { useThemeColors } from "@/src/utils/theme";
import { Host, Picker } from "@expo/ui/swift-ui";
import { useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import PagerView from "react-native-pager-view";
import BookBlurView from "./BookBlurView";
import BookChapters from "./BookChapters";
import BookDescription from "./BookDescription";
import BookmarkList from "./bookImageCycle/BookmarkList";

function BookDetails() {
  const themeColors = useThemeColors();
  const { libraryItemId } = useLocalSearchParams<BookContainerRoute>();
  const { book } = useBookData(libraryItemId);
  const { width } = useWindowDimensions();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const x = useSmartPositions(libraryItemId);
  const numChapters = book?.chapters?.length ?? 0;

  const handleSegmentChange = (index: number) => {
    setSelectedIndex(index);
    pagerRef.current?.setPage(index);
  };

  const handlePageSelected = (e: any) => {
    const index = e.nativeEvent.position;
    setSelectedIndex(index);
  };

  return (
    <View className="">
      <View className="flex-row justify-center ">
        <Host
          matchContents
          style={{ width: width - 15, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20 }}
        >
          <Picker
            options={[
              "Details",
              `Chapters (${x.chapterInfo.chapterNumber}/${numChapters})`,
              "Bookmarks",
            ]}
            selectedIndex={selectedIndex}
            onOptionSelected={({ nativeEvent: { index } }) => handleSegmentChange(index)}
            variant="segmented"
            // modifiers={[frame({ maxWidth: width - 15 })]}
          />
        </Host>
      </View>

      <PagerView
        ref={pagerRef}
        style={{ flex: 1, height: 500 }} // adjust height if needed
        initialPage={0}
        onPageSelected={handlePageSelected}
        overdrag={false}
      >
        {/* ===== PAGE 0: Details ===== */}
        <View key="details" style={{ width }}>
          <BookBlurView style={{ margin: 8, padding: 8 }}>
            <BookDescription bookDescription={book?.description || ""} />
          </BookBlurView>

          {/* GENRES */}
          <View className="flex-row items-center my-2 px-2">
            <View
              className="flex-col items-center justify-center border-hairline p-1 rounded-xl"
              style={{ backgroundColor: `${themeColors.accentForeground}99` }}
            >
              <SymbolView name="theatermasks.fill" tintColor={themeColors.accent} />
              <Text className="text-xs text-foreground">Genres</Text>
            </View>
            <ScrollView
              contentContainerClassName="flex-row items-center gap-2 px-2"
              horizontal
              showsHorizontalScrollIndicator={false}
              className="my-2"
            >
              {book?.genres?.map((el) => (
                <View key={el} className="border-hairline rounded-full py-1 px-3 bg-accent">
                  <Text className="text-accent-foreground">{el}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* ===== PAGE 1: Chapters ===== */}
        <View key="chapters" style={{ width }}>
          <BookChapters />
        </View>

        {/* ===== PAGE 2: Bookmarks ===== */}
        <View key="bookmarks" style={{ width }}>
          <BookmarkList libraryItemId={libraryItemId} />
        </View>
      </PagerView>
    </View>
  );
}

export default BookDetails;
