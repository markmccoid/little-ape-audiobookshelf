import { useGetFilterData } from "@/src/hooks/ABSHooks";
import { useDebouncedSearch, useFiltersActions } from "@/src/store/store-filters";
import { DetentChangeEvent, TrueSheet } from "@lodev09/react-native-true-sheet";
import { SymbolView } from "expo-symbols";
import React, { useRef } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const FilterBottomSheet = () => {
  const sheetRef = useRef<TrueSheet>(null);
  // Use the debounced search hook
  const { localSearchValue, handleSearchChange } = useDebouncedSearch();
  const { filterData, isLoading } = useGetFilterData();
  // console.log("Filter Data", filterData?.genres, isLoading);
  // Get filter sheet actions
  const { updateFilterSheetState } = useFiltersActions();
  // useFocusEffect(
  //   React.useCallback(() => {
  //     TrueSheet.present("filter-sheet");
  //     return () => {
  //       TrueSheet.dismiss("filter-sheet");
  //     };
  //   }, [])
  // );

  const fadeExtra = useSharedValue(0);
  const filterSheetStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeExtra.value,
    };
  });
  // Stores to the store-filters store
  // Handle detent changes (snap point change)
  const handleDetentChange = (e: DetentChangeEvent) => {
    const { index, position } = e.nativeEvent;
    updateFilterSheetState(index, true);
    if (index === 0 || !index) {
      fadeExtra.value = withTiming(0);
    } else {
      fadeExtra.value = withTiming(1);
    }
  };
  // Handle sheet state changes (present=true/dismiss=false)
  // When presented, update the detent index as well.
  const handleSheetState = (isShown: boolean, e?: DetentChangeEvent) => {
    updateFilterSheetState(e?.nativeEvent.index, isShown);
    if (e?.nativeEvent.index === 0 || !e?.nativeEvent.index) {
      fadeExtra.value = withTiming(0);
    } else {
      fadeExtra.value = withTiming(1);
    }
  };

  return (
    <TrueSheet
      ref={sheetRef}
      name="filter-sheet"
      detents={[0.1, "auto", 1]}
      // detents={[0.1, 0.5, 0.9]}
      // style={{ borderWidth: 1, borderRadius: 24 }}
      cornerRadius={24}
      dimmed={false}
      scrollable
      dismissible={true}
      onDetentChange={handleDetentChange}
      onDidDismiss={() => handleSheetState(false)}
      onDidPresent={(e) => handleSheetState(true, e)}
    >
      <View className="px-4 pt-4">
        {/* Search Container */}
        <View className=" mb-10">
          <View
            className="flex-row items-center bg-black/5 dark:bg-white/10 rounded-3xl px-4 h-14 border-hairline border-accent"
            style={{ borderCurve: "continuous" }} // Smooth iOS corners
          >
            <SymbolView name="magnifyingglass" size={20} tintColor="#8E8E93" />
            <TextInput
              className="flex-1 ml-2 text-black dark:text-white "
              style={{ fontSize: 18 }}
              placeholder="Books, authors, tags..."
              placeholderTextColor="#8E8E93"
              value={localSearchValue}
              onChangeText={handleSearchChange}
              // Logic to expand sheet when typing starts
              onFocus={() => sheetRef.current?.resize(1)}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* Filter Section (Hidden in snap point 0) */}

        <Animated.ScrollView className="mt-8" nestedScrollEnabled style={filterSheetStyle}>
          <Text className="text-xl font-bold mb-4">Genres</Text>
          <View className="w-[300] flex-row justify-between">
            <View className="flex-row flex-wrap gap-1 ">
              {filterData?.genres?.map((genre) => (
                <Pressable
                  key={genre.b64Encoded}
                  className="bg-white/50 dark:bg-black/20 px-4 py-2 rounded-full border border-black/5"
                >
                  <Text>{genre.name}</Text>
                </Pressable>
              ))}
            </View>
            {/* Tags */}
            <View className="flex-row flex-wrap gap-1 ">
              {filterData?.tags?.map((tag) => (
                <Pressable
                  key={tag.b64Encoded}
                  className="bg-white/50 dark:bg-black/20 px-4 py-2 rounded-full border border-black/5"
                >
                  <Text>{tag.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.ScrollView>
      </View>
    </TrueSheet>
  );
};

export default FilterBottomSheet;
