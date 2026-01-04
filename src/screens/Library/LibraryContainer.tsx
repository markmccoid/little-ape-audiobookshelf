import { useAuth } from "@/src/contexts/AuthContext";
import { useSearchValue } from "@/src/store/store-filters";
import { ABSGetLibraryItem } from "@/src/utils/AudiobookShelf/absAPIClass";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { NativeSyntheticEvent, Pressable, Text, View } from "react-native";
import LibraryRenderItem from "./LibraryRenderItem";
// import { LegendList } from "@legendapp/list";
import HeaderButton from "@/src/components/common/LAABSHeaderButton";
import { useInvalidateQueries, useSafeGetBooks } from "@/src/hooks/ABSHooks";
import { useDebouncedSearch } from "@/src/store/store-filters";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { SymbolView } from "expo-symbols";
import LoadingAnimation from "../../components/common/LoadingAnimation";
import FilterBottomSheet from "./FilterBottomSheet";

const LibraryMain = () => {
  const { isAuthenticated, hasStoredCredentials } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const { localSearchValue, handleSearchChange } = useDebouncedSearch();

  const invalidateQuery = useInvalidateQueries();
  // Get store values and actions
  const storeSearchValue = useSearchValue();
  console.log("Store Search Value", storeSearchValue);
  // const sortedBy = useSortedBy();
  // const sortOptions = ["addedAt", "author", "title", "duration", "publishedYear"];
  // Use safe version of useGetBooks that handles unauthenticated state
  const { data, isLoading, isError } = useSafeGetBooks(storeSearchValue);

  const headerHeight = useHeaderHeight();
  const flatListRef = useRef<FlashListRef<ABSGetLibraryItem>>(null);
  // const flatListRef = useRef<FlashListRef<ABSGetLibraryItem>>(null);

  const scrollTo = useCallback(() => {
    if (flatListRef.current) {
      // console.log(flatListRef.current);
      // flatListRef.current?.scrollToTop();
      flatListRef.current?.scrollToOffset({ offset: -headerHeight });
    }
    console.log("ScrollToTop");
  }, []);

  // search input in header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        return (
          <HeaderButton onPress={() => TrueSheet.present("filter-sheet")}>
            <SymbolView name="brain.fill" size={25} />
          </HeaderButton>
        );
      },
      headerSearchBarOptions: {
        placement: "integratedButton",
        placeholder: "Search",
        onChangeText: (event: NativeSyntheticEvent<{ text: string }>) => {
          // Use the debounced search hook
          handleSearchChange(event.nativeEvent.text);
        },
      },
    });
  }, []);

  useEffect(() => {
    scrollTo();
  }, [storeSearchValue, flatListRef.current]);
  // Create stable refs for functions used in useLayoutEffect
  const scrollToRef = useRef(scrollTo);
  scrollToRef.current = scrollTo;

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
      <FilterBottomSheet />
      <FlashList
        className="flex-1"
        ref={flatListRef}
        // style={{ paddingTop: headerHeight }}
        scrollEnabled
        contentInset={{ top: headerHeight }}
        contentOffset={{ x: 0, y: headerHeight }}
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
