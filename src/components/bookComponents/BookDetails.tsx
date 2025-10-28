import { useBookData } from "@/src/hooks/trackPlayerHooks";
import { BookContainerRoute } from "@/src/screens/BookViewer/BookContainer";
import { useThemeColors } from "@/src/utils/theme";
import { Host, Picker } from "@expo/ui/swift-ui";
import { useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useState } from "react";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";
import BookBlurView from "./BookBlurView";
import BookChapters from "./BookChapters";
import BookDescription from "./BookDescription";

function BookDetails() {
  const themeColors = useThemeColors();
  const { libraryItemId } = useLocalSearchParams<BookContainerRoute>();
  const { book } = useBookData(libraryItemId);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { width } = useWindowDimensions();
  const numChapters = book?.chapters?.length ?? 0;

  // Smoothly animates between 0, 1, 2 when user changes tab
  const animatedIndex = useDerivedValue(
    () => withTiming(selectedIndex, { duration: 300 }),
    [selectedIndex]
  );

  const Bookmarks = () => (
    <View style={{ padding: 20 }}>
      <Text style={{ color: themeColors.foreground }}>Bookmarks Placeholder</Text>
    </View>
  );

  // Each view slides horizontally by -index * width
  const containerStyle = useAnimatedStyle(() => {
    const translateX = -animatedIndex.value * width;
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View className="rounded-2xl">
      <Host matchContents>
        <Picker
          options={["Details", `Chapters (${numChapters})`, "Bookmarks"]}
          selectedIndex={selectedIndex}
          onOptionSelected={({ nativeEvent: { index } }) => setSelectedIndex(index)}
          variant="segmented"
        />
      </Host>

      <View
        style={{
          width,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Animated.View
          style={[
            {
              flexDirection: "row",
              width: width * 3, // 3 segments
            },
            containerStyle,
          ]}
        >
          {/* ===== PAGE 0: Details ===== */}
          <View style={{ width }}>
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
                {/* <Text>{book?.genre}</Text> */}
                {book?.genres?.map((el) => {
                  return (
                    <View key={el} className="border-hairline rounded-full py-1 px-3  bg-accent ">
                      <Text className="text-accent-foreground">{el}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* ===== PAGE 1: Chapters ===== */}
          <View style={{ width }}>
            <BookChapters />
          </View>

          {/* ===== PAGE 2: Bookmarks ===== */}
          <View style={{ width }}>
            <Bookmarks />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

export default BookDetails;
