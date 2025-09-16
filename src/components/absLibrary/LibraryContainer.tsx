import { ABSGetLibraryItem } from "@/src/ABS/absAPIClass";
import { useGetBooks } from "@/src/hooks/ABSHooks";
import { useFiltersActions, useSearchValue, useSortedBy } from "@/src/store/store-filters";
import { Host, Picker, VStack } from "@expo/ui/swift-ui";
import { useHeaderHeight } from "@react-navigation/elements";
import { FlashList } from "@shopify/flash-list";
import { debounce } from "lodash";
import React, { useEffect, useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import LibraryRenderItem from "./LibraryRenderItem";

const LibraryMain = () => {
  // Get store values and actions
  const storeSearchValue = useSearchValue();
  const sortedBy = useSortedBy();
  const { setSearchValue: setStoreSearchValue, setSortedBy } = useFiltersActions();
  const sortOptions = ["addedAt", "author", "title", "duration", "publishedYear"];
  // Local state for immediate input feedback
  const [localSearchValue, setLocalSearchValue] = useState(storeSearchValue);

  // Create debounced function to update store
  const debouncedSetStoreSearch = useMemo(
    () =>
      debounce((value: string) => {
        setStoreSearchValue(value);
      }, 300),
    [setStoreSearchValue]
  );

  // Sync local state with store on initial load
  useEffect(() => {
    setLocalSearchValue(storeSearchValue);
  }, [storeSearchValue]);

  // Handle text input changes
  const handleSearchChange = (value: string) => {
    setLocalSearchValue(value); // Update input immediately
    debouncedSetStoreSearch(value); // Update store after 300ms
  };

  // const { data, isLoading } = useGetBooks();
  const { data, isLoading, isError } = useGetBooks(storeSearchValue);
  const headerHeight = useHeaderHeight();
  if (data === undefined) return;

  console.log("Books", data?.length);

  const renderItem = ({ item }: { item: ABSGetLibraryItem }) => {
    return <LibraryRenderItem item={item} />;
  };

  return (
    <View className="h-full ">
      <View className="w-full p-1">
        <TextInput
          className="mx-2 px-4 py-2 bg-white rounded-lg border border-gray-300 h-[35]"
          placeholder="Enter Title or Author..."
          value={localSearchValue}
          onChangeText={handleSearchChange}
        />
      </View>

      <Host style={{ height: 40, borderWidth: 1 }}>
        <VStack alignment="leading">
          <Picker
            options={sortOptions}
            selectedIndex={sortOptions.findIndex((val) => val === sortedBy)}
            onOptionSelected={({ nativeEvent: { index } }) => {
              console.log(index);
              setSortedBy(sortOptions[index]);
            }}
            variant="segmented"
          />
        </VStack>
      </Host>
      <FlashList
        className=""
        // style={{ paddingTop: 42 }}
        contentContainerClassName="mx-2 border"
        // contentInset={{ top: headerHeight }}
        // contentOffset={{ x: 0, y: -headerHeight }}
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

export default LibraryMain;
