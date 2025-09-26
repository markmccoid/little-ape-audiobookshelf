import { ABSGetLibraryItem } from "@/src/ABS/absAPIClass";
import { useAuth } from "@/src/contexts/AuthContext";
import { useSafeGetBooks } from "@/src/hooks/ABSHooks";
import { useFiltersActions, useSearchValue, useSortedBy } from "@/src/store/store-filters";
import { useHeaderHeight } from "@react-navigation/elements";
import { FlashList } from "@shopify/flash-list";
import { useNavigation, useRouter } from "expo-router";
import { debounce } from "lodash";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import LibraryRenderItem from "./LibraryRenderItem";

const LibraryMain = () => {
  const { isAuthenticated, hasStoredCredentials } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  // Get store values and actions
  const storeSearchValue = useSearchValue();
  const sortedBy = useSortedBy();
  const { setSearchValue: setStoreSearchValue, setSortedBy } = useFiltersActions();
  const sortOptions = ["addedAt", "author", "title", "duration", "publishedYear"];
  // Local state for immediate input feedback
  const [localSearchValue, setLocalSearchValue] = useState(storeSearchValue);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        autoCapitalize: "none",
        placement: "integratedButton",
        placeholder: "Search Title/Author",
        onChangeText: (event) => debouncedSetStoreSearch(event.nativeEvent.text),
      },
    });
  }, [navigation]);
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

  // Use safe version of useGetBooks that handles unauthenticated state
  const { data, isLoading, isError } = useSafeGetBooks(storeSearchValue);
  const headerHeight = useHeaderHeight();

  // Show login prompt if not authenticated
  if (!isAuthenticated && !hasStoredCredentials) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-lg font-semibold mb-4 text-center dark:text-white">
          Please log in to access your audiobook library
        </Text>
        <Pressable
          className="bg-blue-500 px-6 py-3 rounded-lg"
          onPress={() => router.push("/settings/abs_auth")}
        >
          <Text className="text-white font-semibold">Go to Settings</Text>
        </Pressable>
      </View>
    );
  }

  // Show authentication setup prompt if has credentials but not authenticated
  if (hasStoredCredentials && !isAuthenticated) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-lg font-semibold mb-4 text-center">
          Authentication failed. Please check your settings.
        </Text>
        <Pressable
          className="bg-blue-500 px-6 py-3 rounded-lg"
          onPress={() => router.push("/settings/abs_auth")}
        >
          <Text className="text-white font-semibold">Go to Settings</Text>
        </Pressable>
      </View>
    );
  }

  if (data === undefined) return null;

  console.log("Books", data?.length);

  const renderItem = ({ item }: { item: ABSGetLibraryItem }) => {
    return <LibraryRenderItem item={item} />;
  };

  return (
    <View className="h-full">
      {/* <View className="w-full p-1">
        <TextInput
          className="mx-2 px-4 py-2 bg-white rounded-lg border border-gray-300 h-[35] text-black"
          placeholder="Enter Title or Author..."
          value={localSearchValue}
          onChangeText={handleSearchChange}
        />
      </View>
*/}
      {/* 
      <View
        style={{ zIndex: 10, backgroundColor: "gray" }}
        className="absolute bottom-[100] w-full h-full justify-center "
      >
        <Host>
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
      </View> */}
      <FlashList
        className="flex-1"
        // style={{ paddingTop: 42 }}
        contentContainerClassName=""
        contentInset={{ top: headerHeight }}
        contentOffset={{ x: 0, y: -headerHeight }}
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

export default LibraryMain;
