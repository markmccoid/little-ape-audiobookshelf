import BookShelfDetailContainer from "@/src/screens/Home/BookshelfDetail/BookShelfDetailContainer";
import { useSettingsStore } from "@/src/store/store-settings";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const BookShelfIdRoute = () => {
  const { bookshelfId } = useLocalSearchParams<{ bookshelfId: string }>();
  const allBookShelves = useSettingsStore((state) => state.allBookshelves);

  const shelf = allBookShelves.find((shelf) => shelf.id === bookshelfId);

  if (!shelf) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-bold text-accent">Bookshelf not found!</Text>
      </View>
    );
  }
  return <BookShelfDetailContainer shelfData={shelf} />;
};

export default BookShelfIdRoute;
