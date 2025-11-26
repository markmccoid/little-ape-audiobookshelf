import { useGetBookShelves, useGetBooksInProgress } from "@/src/hooks/ABSHooks";
import { useBookShelves } from "@/src/store/store-books";
import { useThemeColors } from "@/src/utils/theme";
import { useFocusEffect } from "expo-router";
import React, { useCallback } from "react";
import { ScrollView, View } from "react-native";
import BookShelfContainer from "./BookShelves/BookShelfContainer";
import NotAuthedHeader from "./NotAuthedHeader";

const HomeContainer = () => {
  const themeColors = useThemeColors();

  const {
    // data: bookShelves,
    isSuccess: bookShelvesLoaded,
    refetch,
  } = useGetBookShelves();
  // this hook will update the position info for us
  useGetBooksInProgress(bookShelvesLoaded);

  const bookShelves = useBookShelves();

  // Merge bookshelf data with inProgress data from ABS
  // const augmentedBookshelves = useMemo(() => {
  //   if (!bookShelves) return bookShelves;
  //   // We have stored the data for progress in a map for quicker access
  //   const progressMap = booksInProgress?.mapped || {};

  //   return bookShelves.map((shelf) => ({
  //     ...shelf,
  //     books: shelf.books.map((bookData) => ({
  //       ...bookData,
  //       currentTime: progressMap[bookData.libraryItemId]?.currentTime ?? 0, // from ABS API
  //     })),
  //   }));
  // }, [bookShelves, booksInProgress]);

  // Refetch books in progress when home tab gains focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <View className="flex-1">
      <NotAuthedHeader />
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
        <View className="mt-2">
          {bookShelves?.map((bookShelf) => {
            return <BookShelfContainer shelfData={bookShelf} key={bookShelf.id} />;
          })}
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeContainer;
