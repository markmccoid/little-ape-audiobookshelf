import { ABSGetLibraryItem } from "@/src/ABS/absAPIClass";
import { useGetBooks } from "@/src/hooks/ABSHooks";
import { useHeaderHeight } from "@react-navigation/elements";
import { FlashList } from "@shopify/flash-list";
import React from "react";
import LibraryRenderItem from "./LibraryRenderItem";

const LibraryMain = () => {
  const { data, isLoading } = useGetBooks();
  const headerHeight = useHeaderHeight();
  if (data === undefined) return;

  console.log("Books", data?.length);

  const renderItem = ({ item }: { item: ABSGetLibraryItem }) => {
    return <LibraryRenderItem item={item} />;
  };
  return (
    // <View className="h-full">

    <FlashList
      className="h-full "
      // style={{ paddingTop: 50 }}
      contentContainerClassName="mx-2"
      contentInset={{ top: headerHeight }}
      contentOffset={{ x: 0, y: -headerHeight }}
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
    />
    // </View>
  );
};

export default LibraryMain;
