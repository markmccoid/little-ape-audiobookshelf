import { useAuth } from "@/src/contexts/AuthContext";
import { useGetBooks, useInvalidateQueries } from "@/src/hooks/ABSHooks";
import {
  useDebouncedSearch,
  useGenres,
  useSearchValue,
  useSortDirection,
  useSortedBy,
  useTags,
} from "@/src/store/store-filters";
import { ABSGetLibraryItem } from "@/src/utils/AudiobookShelf/absAPIClass";
import { useThemeColors } from "@/src/utils/theme";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import LoadingAnimation from "../../components/common/LoadingAnimation";
import LibraryRenderItem from "./LibraryRenderItem";
import { SearchBottomSheet } from "./SearchBottomSheet";
const LibraryMain = () => {
  const { isAuthenticated, hasStoredCredentials } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const themeColors = useThemeColors();
  const { localSearchValue, handleSearchChange } = useDebouncedSearch();
  const selectedGenres = useGenres();
  const selectedTags = useTags();
  const sortDirection = useSortDirection();
  const sortedBy = useSortedBy();

  // Function to toggle Tab Bar visibility
  const handleSheetExpand = (isExpanded: boolean) => {
    navigation.setOptions({
      tabBarStyle: {
        display: isExpanded ? "none" : "flex",
      },
    });
  };

  const invalidateQuery = useInvalidateQueries();
  //!! Get store values and actions
  //!! Actually only using this to determine if we scroll to top.
  //!! need to create a hook that just emits if ANY Critiera or sort changes happen
  const storeSearchValue = useSearchValue();
  // const sortedBy = useSortedBy();
  // const sortOptions = ["addedAt", "author", "title", "duration", "publishedYear"];
  // Use safe version of useGetBooks that handles unauthenticated state
  const { data, isLoading, isError } = useGetBooks();

  const headerHeight = 80; //useHeaderHeight();
  const flatListRef = useRef<FlashListRef<ABSGetLibraryItem>>(null);
  // const flatListRef = useRef<FlashListRef<ABSGetLibraryItem>>(null);

  const scrollTo = useCallback(() => {
    if (flatListRef.current) {
      // console.log(flatListRef.current);
      // flatListRef.current?.scrollToTop();
      flatListRef.current?.scrollToOffset({ offset: -(headerHeight + 10) });
    }
  }, []);

  // search input in header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      // headerRight: () => {
      //   return (
      //     <SortContextMenu />

      //     // <HeaderButton onPress={() => TrueSheet.present("filter-sheet")}>
      //     //   <SymbolView name="brain.fill" size={25} />
      //     // </HeaderButton>
      //   );
      // },
      // headerSearchBarOptions: {
      //   placement: "integratedButton",
      //   placeholder: "Search",
      //   onFocus: () => {
      //     TrueSheet.present("filter-sheet");
      //   },
      //   onBlur: () => {
      //     TrueSheet.resize("filter-sheet", 0);
      //   },
      //   onChangeText: (event: NativeSyntheticEvent<{ text: string }>) => {
      //     // Use the debounced search hook
      //     handleSearchChange(event.nativeEvent.text);
      //   },
      // },
    });
  }, []);

  useEffect(() => {
    scrollTo();
  }, [storeSearchValue, selectedGenres, selectedTags, sortDirection, sortedBy]);

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
    <View className="h-full ">
      {/* <View>
        <FilterBottomSheet />
      </View> */}
      {/* <LiquidGlassView
        effect="regular"
        tintColor={`${themeColors.accent}66`}
        style={{
          height: headerHeight + 10,
          position: "absolute",
          top: 0,
          width: "100%",
          zIndex: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: themeColors.accent,
        }}
      >
        <View
          className="flex-row justify-center items-center"
          style={{ paddingTop: headerHeight - 20 }}
        >
          <Text className="text-lg font-bold px-2 text-foreground">Found {data?.length} books</Text>
        </View>
      </LiquidGlassView> */}
      <FlashList
        className="flex-1 "
        ref={flatListRef}
        contentContainerStyle={{ paddingBottom: 275 }}
        scrollEnabled
        contentInset={{ top: headerHeight + 10 }}
        contentOffset={{ x: 0, y: -(headerHeight + 10) }}
        contentInsetAdjustmentBehavior="never"
        // automaticallyAdjustContentInsets={false}
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

          // setTimeout(() => flatListRef.current?.scrollToEnd(), 2000);
        }}
      />
      <SearchBottomSheet onExpand={handleSheetExpand} booksFound={data?.length} />
    </View>
  );
};

export default LibraryMain;
