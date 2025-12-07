import HeaderButton from "@/src/components/common/LAABSHeaderButton";
import { useBooksActions, useBookShelves } from "@/src/store/store-books";
import { BookShelfBook, BookShelfItemType } from "@/src/utils/AudiobookShelf/absUtils";
import { Bookshelf } from "@/src/utils/AudiobookShelf/bookshelfTypes";
import { useHeaderHeight } from "@react-navigation/elements";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import React from "react";
import { View } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable, { SortableGridDragEndParams } from "react-native-sortables";
import BookShelfDetailItem from "./BookShelfDetailItem";

type Props = {
  shelfData: Bookshelf;
};

const BookShelfDetailContainer = ({ shelfData }: Props) => {
  // console.log("SHELF", shelfData);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();
  const headerHeight = useHeaderHeight();
  const router = useRouter();
  const bookActions = useBooksActions();
  const shelf = useBookShelves(shelfData.id) as BookShelfItemType;
  const renderItem = ({ item }: { item: BookShelfBook }) => {
    return <BookShelfDetailItem book={item} bookshelfId={shelfData.id} />;
  };

  const handleDragEnd = (data: SortableGridDragEndParams<BookShelfBook>) => {
    // bookActions.addBooksToBookshelf(
    //   data.indexToKey.map((key) => ({ libraryItemId: key })),
    //   shelfData.id
    // );
    bookActions.updateBookshelfBooks(shelfData.id, data.indexToKey);
    // console.log("Drag end indexToKey", data.indexToKey);
    // console.log("Drag end keyToIndex", data.keyToIndex);
  };

  // Extract unique key for each book
  const keyExtractor = (item: BookShelfBook) => item.libraryItemId;

  return (
    <View style={{ paddingTop: headerHeight }} className="flex-1">
      <Stack.Screen
        options={{
          title: shelfData.label,
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()}>
              <SymbolView name="chevron.left" />
            </HeaderButton>
          ),
        }}
      />
      <Animated.ScrollView
        ref={scrollableRef}
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
      >
        <Sortable.Grid
          columns={2}
          data={shelf?.books || []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          rowGap={10}
          columnGap={10}
          scrollableRef={scrollableRef}
          onDragEnd={handleDragEnd}
        />
      </Animated.ScrollView>
    </View>
  );
};

export default BookShelfDetailContainer;
