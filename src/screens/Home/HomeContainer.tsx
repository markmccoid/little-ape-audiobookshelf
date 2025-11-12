import { useGetBookShelves, useGetBooksInProgress } from "@/src/hooks/ABSHooks";
import { useBookShelves } from "@/src/store/store-books";
import { useThemeColors } from "@/src/utils/theme";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo } from "react";
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
  const { data: booksInProgress } = useGetBooksInProgress(bookShelvesLoaded);

  const bookShelves = useBookShelves();

  const otherShelves = bookShelves?.filter((el) => el.id !== "continue-listening");

  // Augment bookShelves with progress data
  const continueListeningData = useMemo(() => {
    const continueListeningBookshelf = bookShelves?.find((el) => el.id === "continue-listening");
    if (!continueListeningBookshelf) return [];

    if (!bookShelves || !booksInProgress) return continueListeningBookshelf;

    // Your augmentation logic here
    const augmentedBooks = continueListeningBookshelf.books.map((shelf) => ({
      ...shelf,
      currentTime: booksInProgress.find((p) => p.bookId === shelf.libraryItemId)?.currentTime || 0,
    }));

    return {
      ...continueListeningBookshelf,
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
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
        <View className="mt-2">
          {continueListeningData && <BookShelfContainer shelfData={continueListeningData} />}
          {otherShelves?.map((bookShelf) => {
            return <BookShelfContainer shelfData={bookShelf} key={bookShelf.id} />;
          })}
          {/* {bookShelves?.recentlyAdded && (
            <BookShelfContainer shelfData={bookShelves.recentlyAdded} />
          )}
          {bookShelves?.discover && <BookShelfContainer shelfData={bookShelves.discover} />}
          {bookShelves?.listenAgain && <BookShelfContainer shelfData={bookShelves.listenAgain} />} */}
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeContainer;
