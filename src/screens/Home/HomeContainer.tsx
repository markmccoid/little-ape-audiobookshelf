import { useGetBookShelves, useGetBooksInProgress } from "@/src/hooks/ABSHooks";
import { useBookShelves } from "@/src/store/store-books";
import { BookShelfItemType } from "@/src/utils/AudiobookShelf/bookshelfTypes";
import { useThemeColors } from "@/src/utils/theme";
import { useFocusEffect } from "expo-router";
import React from "react";
import { ScrollView, View } from "react-native";
import BookShelfContainer from "./BookShelves/BookShelfContainer";
import NotAuthedHeader from "./NotAuthedHeader";

const HomeContainer = () => {
  const themeColors = useThemeColors();
  // const [isInitialized, setIsInitialized] = React.useState(false);

  // ALWAYS call all hooks at the top to ensure consistent order
  const {
    // data: bookShelves,
    isSuccess: bookShelvesLoaded,
    refetch,
  } = useGetBookShelves();

  // this hook will update the position info for us
  useGetBooksInProgress(bookShelvesLoaded);

  const bookShelves = useBookShelves();

  // Add a delay to ensure authentication state is properly initialized
  // React.useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setIsInitialized(true);
  //   }, 100);
  //   return () => clearTimeout(timer);
  // }, []);

  // Refetch books in progress when home tab gains focus
  useFocusEffect(() => {
    refetch();
  });

  return (
    <View className="flex-1">
      <NotAuthedHeader />
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
        <View className="mt-2">
          {Array.isArray(bookShelves)
            ? bookShelves?.map((bookShelf: BookShelfItemType) => {
                return <BookShelfContainer shelfData={bookShelf} key={bookShelf.id} />;
              })
            : null}
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeContainer;
