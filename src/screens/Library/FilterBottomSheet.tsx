import HiddenContainerGlass from "@/src/components/hiddenContainer/HiddenContainerGlass";
import {
  useFiltersActions,
  useFiltersStore,
  useToggleGenre,
  useToggleTag,
} from "@/src/store/store-filters";
import { useThemeColors } from "@/src/utils/theme";
import { DetentChangeEvent, TrueSheet } from "@lodev09/react-native-true-sheet";
import { useFocusEffect } from "expo-router";
import React, { useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import GenrePicker from "./GenrePicker";
import TagPicker from "./TagPicker";

const FilterBottomSheet = () => {
  const sheetRef = useRef<TrueSheet>(null);
  const themeColors = useThemeColors();
  // Use the debounced search hook
  // const { filterData, isLoading } = useGetFilterData();
  const detentIndex = useFiltersStore((state) => state.detentIndex);
  const selectedGenres = useFiltersStore((state) => state.genres);
  const selectedTags = useFiltersStore((state) => state.tags);
  const toggleTag = useToggleTag();
  const toggleGenre = useToggleGenre();

  // console.log("Filter Data", filterData?.genres, isLoading);
  // Get filter sheet actions
  const { updateFilterSheetState, clearGenres, clearTags } = useFiltersActions();

  useFocusEffect(
    React.useCallback(() => {
      // TrueSheet.present("filter-sheet");
      return () => {
        TrueSheet.dismiss("filter-sheet");
      };
    }, [])
  );

  const fadeExtra = useSharedValue(0);
  const filterSheetStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeExtra.value,
      marginTop: 8,
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

  const changeDetent = () => {
    if ((detentIndex ?? 0) < 1) {
      TrueSheet.resize("filter-sheet", 1);
    } else {
      TrueSheet.resize("filter-sheet", 0);
    }
  };
  return (
    <TrueSheet
      ref={sheetRef}
      name="filter-sheet"
      detents={[0.1, "auto", 1]}
      backgroundColor={`${themeColors.accent}dd`}
      // style={{ backgroundColor: "#123583aa", flex: 1 }}
      // detents={[0.1, 0.5, 0.9]}
      // style={{
      //   flex: 1,
      //   borderWidth: StyleSheet.hairlineWidth,
      //   borderColor: "black",
      //   borderRadius: 24,
      //   height: "100%",
      // }}
      cornerRadius={24}
      dimmed={false}
      scrollable={false}
      dismissible={true}
      onDetentChange={handleDetentChange}
      onDidDismiss={() => handleSheetState(false)}
      onDidPresent={(e) => handleSheetState(true, e)}
      // header={() => (
      //   <View className="flex-row items-center justify-center">
      //     <Text className="text-lg font-semibold">Advanced Filtering</Text>
      //   </View>
      // )}
    >
      <View className="mt-[16] flex-1 ">
        <View className="mx-2 ">
          <View className="flex-row items-center justify-start">
            <Text className="text-lg font-semibold">Genres: </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-1"
            >
              {(selectedGenres.length ?? 0) === 0 && (
                <Pressable onPress={changeDetent}>
                  <Text className="text-base">No genres selected</Text>
                </Pressable>
              )}
              {(selectedGenres.length ?? 0) > 0 &&
                selectedGenres.map((genre) => {
                  return (
                    <Pressable
                      onPress={() => toggleGenre(genre)}
                      key={genre}
                      className="py-1 px-2 bg-accent rounded-full"
                    >
                      <Text className="text-sm  text-accent-foreground">{genre}</Text>
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-1 mt-2"
          >
            <Text className="text-lg font-semibold">Tags: </Text>
            {(selectedTags.length ?? 0) === 0 && (
              <Pressable onPress={changeDetent}>
                <Text className="text-base">No tags selected</Text>
              </Pressable>
            )}
            {(selectedTags.length ?? 0) > 0 &&
              selectedTags.map((tag) => {
                return (
                  <Pressable
                    onPress={() => toggleTag(tag)}
                    key={tag}
                    className="py-1 px-2 bg-accent rounded-full"
                  >
                    <Text className="text-sm  text-accent-foreground">{tag}</Text>
                  </Pressable>
                );
              })}
          </ScrollView>
        </View>
        {/* Search Container */}
        {/* <View className="mx-4" style={{ marginBottom: 16 }}>
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
        </View> */}

        {/* Filter Section (Hidden in snap point 0) */}

        <Animated.ScrollView
          // nestedScrollEnabled
          style={[filterSheetStyle]}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View className="mt-1 ">
            <View className="flex-1 mb-2">
              <HiddenContainerGlass title="Genres" key={"genres"} leftIconFunction={clearGenres}>
                <GenrePicker />
              </HiddenContainerGlass>
            </View>
            {/* Tags */}
            <View className="flex-1 mb-2">
              <HiddenContainerGlass title="Tags" key={"tags"} leftIconFunction={clearTags}>
                <TagPicker />
              </HiddenContainerGlass>
            </View>
          </View>
        </Animated.ScrollView>
      </View>
    </TrueSheet>
  );
};

export default FilterBottomSheet;
