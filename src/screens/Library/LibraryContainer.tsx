import { useAuth } from "@/src/contexts/AuthContext";
import { useFiltersActions, useSearchValue, useSortedBy } from "@/src/store/store-filters";
import { ABSGetLibraryItem } from "@/src/utils/AudiobookShelf/absAPIClass";
import { useHeaderHeight } from "@react-navigation/elements";
import { debounce } from "es-toolkit";
import { useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NativeSyntheticEvent, Pressable, Text, View } from "react-native";
import LibraryRenderItem from "./LibraryRenderItem";
// import { LegendList } from "@legendapp/list";
import { useInvalidateQueries, useSafeGetBooks } from "@/src/hooks/ABSHooks";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import LoadingAnimation from "../../components/common/LoadingAnimation";
// import { FlashList, FlashListRef } from "@shopify/flash-list";

const LibraryMain = () => {
  const { isAuthenticated, hasStoredCredentials } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  // I
  const invalidateQuery = useInvalidateQueries();
  // Get store values and actions
  const storeSearchValue = useSearchValue();
  const sortedBy = useSortedBy();
  const { setSearchValue: setStoreSearchValue, setSortedBy } = useFiltersActions();
  const sortOptions = ["addedAt", "author", "title", "duration", "publishedYear"];
  // Local state for immediate input feedback
  const [localSearchValue, setLocalSearchValue] = useState(storeSearchValue);
  // Use safe version of useGetBooks that handles unauthenticated state
  const { data, isLoading, isError } = useSafeGetBooks(storeSearchValue);

  const headerHeight = useHeaderHeight();
  const flatListRef = useRef<FlashListRef<ABSGetLibraryItem>>(null);
  // const flatListRef = useRef<FlashListRef<ABSGetLibraryItem>>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        autoCapitalize: "none",
        placement: "integratedButton",
        placeholder: "Search Title/Author",
        onChangeText: (event: NativeSyntheticEvent<{ text: string }>) => {
          debouncedSetStoreSearchRef.current(event.nativeEvent.text);
        },
        onFocus: () => console.log("Focused"),
        onCancelButtonPress: () => {
          console.log("Cancel button pressed");
          if (flatListRef.current) {
            console.log("Scrolling");
            scrollToRef.current();
            // setTimeout(
            //   () => flatListRef.current?.scrollToIndex({ index: 0, animated: true }),
            //   1000
            // );
          }
        },
      },
    });
  }, []);
  // Create stable reference to the setStoreSearchValue function
  const setStoreSearchValueRef = useRef(setStoreSearchValue);
  setStoreSearchValueRef.current = setStoreSearchValue;

  // Create debounced function to update store
  const debouncedSetStoreSearch = useMemo(
    () =>
      debounce((value: string) => {
        setStoreSearchValueRef.current(value);
      }, 300),
    []
  );
  const scrollTo = useCallback(() => {
    if (flatListRef.current) {
      // console.log(flatListRef.current);
      flatListRef.current?.scrollToTop();
    }
    console.log("Scroll in ScrollTo");
  }, []);

  // Create stable refs for functions used in useLayoutEffect
  const debouncedSetStoreSearchRef = useRef(debouncedSetStoreSearch);
  const scrollToRef = useRef(scrollTo);
  debouncedSetStoreSearchRef.current = debouncedSetStoreSearch;
  scrollToRef.current = scrollTo;

  // Sync local state with store on initial load
  useEffect(() => {
    setLocalSearchValue(storeSearchValue);
  }, [storeSearchValue]);

  // Handle text input changes
  const handleSearchChange = (value: string) => {
    setLocalSearchValue(value); // Update input immediately
    debouncedSetStoreSearch(value); // Update store after 300ms
  };

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

  if (data === undefined) return <LoadingAnimation />;

  console.log("Books", data?.length);

  const renderItem = ({ item }: { item: ABSGetLibraryItem }) => {
    return <LibraryRenderItem item={item} />;
  };

  return (
    <View className="h-full">
      {/* <LegendList
        className="flex-1"
        ref={flatListRef}
        contentContainerClassName=""
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      /> */}
      <FlashList
        className="flex-1"
        ref={flatListRef}
        // style={{ paddingTop: 42 }}
        scrollEnabled
        // contentInset={{ top: headerHeight }}
        // contentOffset={{ x: 0, y: -headerHeight }}
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={true}
        onRefresh={() => invalidateQuery("books")}
        // when set to true, the spinning activity rings stays up until done
        // not sure how we could use this.
        refreshing={false}
        // Add onLayout to ensure list is ready
        onLayout={() => {
          console.log("FlashList laid out");

          // setTimeout(() => flatListRef.current?.scrollToEnd(), 3000);
        }}
      />
    </View>
  );
};

export default LibraryMain;
