import { BookShelfItemType } from "@/src/utils/AudiobookShelf/absUtils";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

type Props = {
  book: BookShelfItemType["books"][number];
  bookshelfId: string;
};

/**
 * Individual book item for grid display
 * Shows book cover and title below
 */
const BookShelfDetailItem = ({ book, bookshelfId }: Props) => {
  const imageSize = 175;
  const itemSize = 190;
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: `/(tabs)/(home)/bookshelf/[bookshelfId]/[libraryItemId]`,
      params: {
        bookshelfId,
        libraryItemId: book.libraryItemId,
        cover: book.coverURI,
        title: book.title,
      },
    });
  };

  return (
    <Animated.View
      className="flex-col py-2 justify-center items-center rounded-lg"
      style={{ width: itemSize }}
    >
      <View className="mx-2">
        <Pressable onPress={handlePress}>
          <Image
            source={book.coverURI}
            style={{
              width: imageSize,
              height: imageSize,
              borderRadius: 10,
              borderWidth: StyleSheet.hairlineWidth,
            }}
            className="border-hairline"
            contentFit="cover"
          />
        </Pressable>
      </View>
      <View className="flex-col mt-2 items-center w-full px-2">
        <Text
          className="font-semibold text-sm text-foreground"
          numberOfLines={1}
          lineBreakMode="tail"
        >
          {book.title}
        </Text>
      </View>
    </Animated.View>
  );
};

export default BookShelfDetailItem;
