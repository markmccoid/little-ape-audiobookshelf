import { useBookData } from "@/src/hooks/trackPlayerHooks";
import { BookContainerRoute } from "@/src/screens/BookViewer/BookContainer";
import { formatSeconds } from "@/src/utils/formatUtils";
import { useThemeColors } from "@/src/utils/theme";
import { useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import BookBlurView from "./BookBlurView";

const BookCornerDetails = () => {
  const { libraryItemId } = useLocalSearchParams<BookContainerRoute>();
  const { book, duration = 0, isBookActive } = useBookData(libraryItemId);
  const themeColors = useThemeColors();
  return (
    <ScrollView className="" contentContainerClassName="flex-col gap-2">
      <BookBlurView flexDirection="flex-col">
        <View className="flex-row items-center gap-1 justify-start w-full p-2">
          <SymbolView name="person" size={15} tintColor={themeColors.accent} />
          <Text className="text-foreground" lineBreakMode="tail" numberOfLines={1}>
            {book?.author}
          </Text>
        </View>
        {book?.narratedBy && (
          <View className="flex-row justify-start items-center gap-1 w-full p-1">
            <SymbolView
              name="waveform.and.person.filled"
              size={15}
              tintColor={themeColors.accent}
            />
            <Text className="text-foreground" lineBreakMode="tail" numberOfLines={1}>
              {book?.narratedBy}
            </Text>
          </View>
        )}
      </BookBlurView>
      <BookBlurView>
        <View className="p-2 flex-row justify-center items-center gap-2">
          <SymbolView name="hourglass" size={15} tintColor={themeColors.accent} />
          <Text className="text-base text-foreground" lineBreakMode="tail" numberOfLines={1}>
            {formatSeconds(duration, "minimal")}
          </Text>
        </View>
      </BookBlurView>
    </ScrollView>
  );
};

export default BookCornerDetails;
