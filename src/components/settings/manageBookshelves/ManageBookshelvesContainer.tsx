import { useSettingsActions, useSettingsStore } from "@/src/store/store-settings";
import { Bookshelf } from "@/src/utils/AudiobookShelf/bookshelfTypes";
import { useHeaderHeight } from "@react-navigation/elements";
import { sortBy } from "es-toolkit";
import { cssInterop } from "nativewind";
import { PressableScale } from "pressto";
import React, { useCallback } from "react";
import { ScrollView, View } from "react-native";
import type { SortableGridDragEndParams, SortableGridRenderItem } from "react-native-sortables";
import Sortable from "react-native-sortables";
import AddNewBookshelf from "./AddNewBookshelf";
import BookShelfContainer from "./SettingsBookShelfContainer";
cssInterop(PressableScale, { className: "style" });

const ManageBookshelvesContainer = () => {
  const headerHeight = useHeaderHeight();
  const allBS = useSettingsStore((state) => state.allBookshelves);
  const actions = useSettingsActions();
  const displayed = useSettingsStore((state) => state.bookshelvesToDisplay);
  // console.log("ALL BS", allBS);
  const mergedBS = sortBy(allBS, ["position"]);

  const renderItem = useCallback<SortableGridRenderItem<(typeof mergedBS)[0]>>(
    ({ item }) => (
      <BookShelfContainer key={item.id} bookshelf={item} />
      // <View className="justify-center items-center border-hairline rounded-md h-[50]">
      //   <Text className="font-semibold">{item.label}</Text>
      // </View>
    ),
    []
  );
  const reSortBookshelves = (params: SortableGridDragEndParams<Bookshelf>) => {
    // data is our allBS data
    // keyToIndex is { key (our bookshelf ID): index (new position)}
    const newShelfOrder = params.data.map((shelf) => ({
      ...shelf,
      position: params.keyToIndex[shelf.id],
    }));
    actions.updateBookshelves(newShelfOrder);
  };
  return (
    <View className="flex-1" style={{ paddingTop: headerHeight }}>
      <AddNewBookshelf />
      <ScrollView className="flex-1 mb-[50] " contentContainerClassName="flex-grow ">
        <Sortable.Grid
          columns={1}
          data={mergedBS}
          renderItem={renderItem}
          rowGap={10}
          onDragEnd={reSortBookshelves}
        />
      </ScrollView>
      {/* {mergedBS.map((el) => {
        return <BookShelfContainer key={el.id} bookshelf={el} />;
      })} */}
    </View>
  );
};

export default ManageBookshelvesContainer;
