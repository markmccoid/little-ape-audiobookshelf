import { Bookmark } from "@/src/utils/AudiobookShelf/abstypes";
import { formatSeconds } from "@/src/utils/formatUtils";
import { useThemeColors } from "@/src/utils/theme";
import { SymbolView } from "expo-symbols";
import { PressableScale } from "pressto";
import React from "react";
import { Text, View } from "react-native";

type Props = {
  bookmark: Omit<Bookmark, "libraryItemId">;
  isBookActive: boolean;
  handleDeleteBookmark: () => Promise<void>;
  handleGoToBookmark: () => Promise<void>;
};

const BookmarkItem = ({
  bookmark,
  isBookActive,
  handleDeleteBookmark,
  handleGoToBookmark,
}: Props) => {
  const themeColors = useThemeColors();

  // const handleDeleteBookmark = async (time: number, title: string) => {
  //   const shouldDelete = await showConfirmationPrompt(
  //     "Delete Bookmark?",
  //     `Are you sure you want to delete the ${title} bookmark`
  //   );
  //   if (shouldDelete) {

  //   }
  // };
  return (
    <View className="h-[40] border-b-hairline bg-white flex-row items-center justify-between">
      <View className="h-full items-center flex-row pl-2">
        <Text className="w-[220]" numberOfLines={2} lineBreakMode="tail">
          {bookmark.title}
        </Text>
      </View>
      <View className="h-full items-center flex-row flex-1">
        <Text>{formatSeconds(bookmark.time)}</Text>
      </View>
      <View className="flex-row h-full">
        <PressableScale
          style={{
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 12,
            // opacity: isBookActive ? 1 : 0,
          }}
          onPress={handleGoToBookmark}
        >
          <SymbolView name="checkmark.rectangle.fill" tintColor={themeColors.accent} size={30} />
        </PressableScale>

        <PressableScale
          style={{
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 12,
          }}
          onPress={handleDeleteBookmark}
        >
          <SymbolView name="delete.backward.fill" tintColor={themeColors.destructive} size={25} />
        </PressableScale>
      </View>
    </View>
  );
};

export default BookmarkItem;
