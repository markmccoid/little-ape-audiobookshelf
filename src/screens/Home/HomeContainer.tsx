import { useGetBookShelves, useGetBooksInProgress } from "@/src/hooks/ABSHooks";
import { BookShelfItemType } from "@/src/utils/AudiobookShelf/absUtils";
import { useThemeColors } from "@/src/utils/theme";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { ScrollView, View } from "react-native";
import BookShelfContainer from "./BookShelves/BookShelfContainer";
import NotAuthedHeader from "./NotAuthedHeader";

export type EnhancedBookItem = BookShelfItemType & {
  isCurrentlyLoaded: boolean;
  isPlaying: boolean;
  currentTime: number;
};

const HomeContainer = () => {
  const themeColors = useThemeColors();
  const {
    data: bookShelves,
    isLoading,
    isError,
    isSuccess: bookShelvesLoaded,
    refetch,
  } = useGetBookShelves();
  const { data: booksInProgress } = useGetBooksInProgress(bookShelvesLoaded);

  // Augment bookShelves with progress data
  const continueListeningData = useMemo(() => {
    if (!bookShelves?.continueListening) return [];

    if (!bookShelves || !booksInProgress) return bookShelves.continueListening;

    // Your augmentation logic here
    const augmentedBooks = bookShelves.continueListening.books.map((shelf) => ({
      ...shelf,
      currentTime: booksInProgress.find((p) => p.bookId === shelf.libraryItemId)?.currentTime || 0,
    }));
    return {
      ...bookShelves.continueListening,
      books: augmentedBooks,
    };
  }, [bookShelves, booksInProgress]);

  // Refetch books in progress when home tab gains focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <View className="flex-1">
      <NotAuthedHeader />
      <ScrollView className="flex-1 px-2" contentInsetAdjustmentBehavior="automatic">
        <View className="mt-2">
          {bookShelves?.continueListening && (
            <BookShelfContainer shelfData={continueListeningData} />
          )}
          {bookShelves?.recentlyAdded && (
            <BookShelfContainer shelfData={bookShelves.recentlyAdded} />
          )}
          {bookShelves?.discover && <BookShelfContainer shelfData={bookShelves.discover} />}
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeContainer;
