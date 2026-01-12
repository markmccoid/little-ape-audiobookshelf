import HiddenContainerGlass from "@/src/components/hiddenContainer/HiddenContainerGlass";
import {
  useDebouncedSearch,
  useFiltersActions,
  useFiltersStore,
  useToggleGenre,
  useToggleTag,
} from "@/src/store/store-filters";
import { useThemeColors } from "@/src/utils/theme";
import { LiquidGlassView } from "@callstack/liquid-glass";
import { Ionicons } from "@expo/vector-icons"; // Or your preferred icon set
import { useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useCallback, useRef } from "react";
import {
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import GenrePicker from "./GenrePicker";
import SortContextMenu from "./SortContextMenu";
import TagPicker from "./TagPicker";
const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;
// How tall is the search bar area?
// How tall is the search bar area?
const HEADER_HEIGHT = 140;
// Tab bar height (approximate)
const TAB_BAR_HEIGHT = 90;
// Top margin when sheet is fully expanded
const TOP_MARGIN = 100;

// FLOAT ADJUSTMENT: We want it to float a bit above the tab bar
const FLOAT_BOTTOM_MARGIN = 10;
const INITIAL_TOP = SCREEN_HEIGHT - HEADER_HEIGHT - TAB_BAR_HEIGHT - FLOAT_BOTTOM_MARGIN;

// MAX_TRANSLATE_Y: When applied, positions the sheet's top edge at TOP_MARGIN from screen top
// Final position = INITIAL_TOP + translateY, so translateY = TOP_MARGIN - INITIAL_TOP
const MAX_TRANSLATE_Y = TOP_MARGIN - INITIAL_TOP; // Fully Open (near top) -- Negative Value
const HALF_TRANSLATE_Y = SCREEN_HEIGHT * 0.4 - INITIAL_TOP; // Half Open (approx 60% height visible) -- Negative Value
const MIN_TRANSLATE_Y = 0; // Fully Closed (sitting at bottom)

type Props = {
  onExpand: (isExpanded: boolean) => void;
  booksFound: number;
};

export const SearchBottomSheet = ({ onExpand, booksFound }: Props) => {
  const searchInputRef = useRef<TextInput>(null);
  const { colorScheme } = useColorScheme();
  const { handleSearchChange, clearSearch, storeSearchValue, localSearchValue } =
    useDebouncedSearch();
  const themeColors = useThemeColors();
  const selectedGenres = useFiltersStore((state) => state.genres);
  const selectedTags = useFiltersStore((state) => state.tags);
  const selectedSearchTitleAuthor = useFiltersStore((state) => state.searchTitleAuthor);
  const selectedSearchDescription = useFiltersStore((state) => state.searchDescription);
  const toggleTag = useToggleTag();
  const toggleGenre = useToggleGenre();
  // Get filter sheet actions
  const {
    updateFilterSheetState,
    clearGenres,
    clearTags,
    toggleSearchDescription,
    toggleSearchTitleAuthor,
  } = useFiltersActions();
  const fadeExtra = useSharedValue(1);
  const filterSheetStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeExtra.value,
      marginTop: 8,
    };
  });

  const translateY = useSharedValue(MIN_TRANSLATE_Y);
  const isKeyboardVisible = useSharedValue(false);
  const context = useSharedValue({ y: 0 });

  useFocusEffect(() => {
    updateFilterSheetState(0, true);
    return () => {
      updateFilterSheetState(0, false);
    };
  });
  React.useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      isKeyboardVisible.value = true;
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      isKeyboardVisible.value = false;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const scrollTo = useCallback((destination: number) => {
    "worklet";
    translateY.value = withSpring(destination, { damping: 35, stiffness: 120, mass: 1.4 });
  }, []);

  const gesture = Gesture.Pan()
    .onStart(() => {
      // scheduleOnRN(Keyboard.dismiss)();
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      let newY = event.translationY + context.value.y;
      // Prevent dragging lower than the minimized state
      // If keyboard is open, prevent dragging lower than HALF
      const limitBottom = isKeyboardVisible.value ? HALF_TRANSLATE_Y : MIN_TRANSLATE_Y; // e.g. -400 vs 0

      // Clamp: Standard Check (MAX is e.g. -700, limitBottom is 0 or -400)
      // We want newY to be <= limitBottom AND >= MAX_TRANSLATE_Y
      // But standard logic for "bottom" is usually Math.min(val, bottom) ?
      // No, translateY is negative. 0 is highest value (screen bottom). -700 is lowest value (screen top).
      // Wait.
      // MIN_TRANSLATE_Y = 0.
      // MAX_TRANSLATE_Y = -600 (Top of screen).
      // HALF_TRANSLATE_Y = -300.
      // "Don't go under" = Don't go closer to 0 than -300.
      // So newY must be <= -300. (e.g. -400 is fine, -200 is bad).
      // So newY = Math.min(newY, limitBottom).

      newY = Math.max(newY, MAX_TRANSLATE_Y); // Don't go above top
      newY = Math.min(newY, limitBottom); // Don't go below bottom limit

      translateY.value = newY;
    })
    .onEnd(() => {
      // Snap Point Logic
      const currentY = translateY.value;

      const distToTop = Math.abs(currentY - MAX_TRANSLATE_Y);
      const distToHalf = Math.abs(currentY - HALF_TRANSLATE_Y);
      const distToBottom = Math.abs(currentY - MIN_TRANSLATE_Y);

      if (distToTop < distToHalf && distToTop < distToBottom) {
        // Snap to TOP
        scrollTo(MAX_TRANSLATE_Y);
        // scheduleOnRN(onExpand, true);
      } else if (distToHalf < distToTop && distToHalf < distToBottom) {
        // Snap to HALF
        scrollTo(HALF_TRANSLATE_Y);
        // scheduleOnRN(onExpand, true);
      } else {
        // Snap to BOTTOM
        // If keyboard is visible, force HALF instead of BOTTOM?
        // Logic handled by clamp in onUpdate technically, but good to ensure snap target is valid.
        if (isKeyboardVisible.value) {
          scrollTo(HALF_TRANSLATE_Y);
          // scheduleOnRN(onExpand, true);
        } else {
          scrollTo(MIN_TRANSLATE_Y);
          // scheduleOnRN(onExpand, false);
        }
      }
    });

  const rBottomSheetStyle = useAnimatedStyle(() => {
    // Interpolate Width and Margins to create "Floating Card" effect
    // At MIN (0): Width ~92%, Margin ~4%, Radius significant
    // At MAX: Width 100%, Margin 0%, Radius top only (or less rounded)

    // REVERSED INPUT RANGE: [MAX (neg), HALF (neg), MIN (0)] for Monotonic Increase
    const widthPercent = interpolate(
      translateY.value,
      [MAX_TRANSLATE_Y, HALF_TRANSLATE_Y, MIN_TRANSLATE_Y],
      [100, 100, 92],
      Extrapolation.CLAMP
    );

    const marginLeftPercent = interpolate(
      translateY.value,
      [MAX_TRANSLATE_Y, HALF_TRANSLATE_Y, MIN_TRANSLATE_Y],
      [0, 0, 4],
      Extrapolation.CLAMP
    );

    const borderRadius = interpolate(
      translateY.value,
      [MAX_TRANSLATE_Y, HALF_TRANSLATE_Y, MIN_TRANSLATE_Y],
      [32, 32, 24], // Morph from tighter card radius to standard sheet radius
      Extrapolation.CLAMP
    );

    // Animate Height: From just the header (Pill) to full screen
    const height = interpolate(
      translateY.value,
      [MAX_TRANSLATE_Y, HALF_TRANSLATE_Y, MIN_TRANSLATE_Y],
      [SCREEN_HEIGHT, SCREEN_HEIGHT * 0.6, HEADER_HEIGHT],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY: translateY.value }],
      width: `${widthPercent}%`,
      marginLeft: `${marginLeftPercent}%`,
      borderRadius: borderRadius,
      height: height,
    };
  });

  const rContentStyle = useAnimatedStyle(() => {
    // Fade in content as we expand
    const opacity = interpolate(
      translateY.value,
      [HALF_TRANSLATE_Y, MIN_TRANSLATE_Y], // Fade in by the time we hit half-way
      [1, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity,
    };
  });

  return (
    <Animated.View
      className="absolute z-50 overflow-hidden"
      style={[
        rBottomSheetStyle,
        {
          // height: SCREEN_HEIGHT, // Moved to animated style
          top: INITIAL_TOP,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 12,
        },
      ]}
    >
      <LiquidGlassView
        effect="regular"
        tintColor={`${themeColors.accent}55`}
        colorScheme={colorScheme === "dark" ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      {/* --- THE HEADER (SEARCH BAR) ---
         This is the "Handle". We wrap it in GestureDetector so dragging this pulls the sheet.
      */}
      <GestureDetector gesture={gesture}>
        <View className="rounded-t-[32px] flex-col px-4 pt-2" style={{ height: HEADER_HEIGHT }}>
          <View className="w-12 h-1.5 bg-gray-300/80 rounded-full absolute top-2.5 left-1/2 -ml-6" />

          {/* Checkbox Row */}
          <View className="flex-row gap-4 mt-6 ml-1 mb-2">
            <Pressable onPress={toggleSearchTitleAuthor} className="flex-row items-center gap-2">
              <Ionicons
                name={selectedSearchTitleAuthor ? "checkbox" : "square-outline"}
                size={20}
                color={selectedSearchTitleAuthor ? themeColors.accent : "#8E8E93"}
              />
              <Text className="text-foreground font-medium">Title/Author</Text>
            </Pressable>
            <Pressable onPress={toggleSearchDescription} className="flex-row items-center gap-2">
              <Ionicons
                name={selectedSearchDescription ? "checkbox" : "square-outline"}
                size={20}
                color={selectedSearchDescription ? themeColors.accent : "#8E8E93"}
              />
              <Text className="text-foreground font-medium">Description</Text>
            </Pressable>
            <View className="flex-row items-center ml-3">
              <Text className="text-foreground font-medium">Books: {booksFound}</Text>
            </View>
          </View>

          {/* Search Row */}
          <View className="flex-row items-center w-full mb-2">
            <View className="flex-1 flex-row items-center bg-white/80 dark:bg-neutral-900/80 h-10 rounded-xl px-3">
              <Ionicons name="search" size={20} color="#8E8E93" />
              <TextInput
                placeholder="Search Library..."
                className="flex-1 ml-2 text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-neutral-900/80"
                style={{
                  fontSize: 16,
                }}
                ref={searchInputRef}
                placeholderTextColor="#8E8E93"
                value={localSearchValue}
                onChangeText={handleSearchChange}
                clearButtonMode="while-editing"
                onFocus={() => {
                  scrollTo(HALF_TRANSLATE_Y);
                  // scheduleOnRN(onExpand, true);
                }}
                onBlur={() => {
                  scrollTo(MIN_TRANSLATE_Y);
                  // scheduleOnRN(onExpand, false);
                }}
              />
            </View>
            <View className="ml-2 justify-center">
              <LiquidGlassView
                className="p-1 rounded-full"
                style={{ padding: 6, borderRadius: 30 }}
              >
                <SortContextMenu />
              </LiquidGlassView>
            </View>
          </View>
        </View>
      </GestureDetector>

      {/* --- THE GENRE/TAG Info Section ---
       */}
      <Animated.View className="flex-1 flex-col" style={{}}>
        <View className="flex-1 mt-2">
          <View className="flex-row items-center justify-start mx-2">
            <Text className="text-foreground text-lg font-semibold">Genres: </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-1"
            >
              {(selectedGenres.length ?? 0) === 0 && (
                <Pressable onPress={() => console.log("C")}>
                  <Text className="text-base text-foreground">No genres selected</Text>
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
          {/* --- THE TAGS INFO Section --- */}
          <View className="flex-row items-center justify-start mx-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-1 mt-2"
            >
              <Text className="text-foreground text-lg font-semibold">Tags: </Text>
              {(selectedTags.length ?? 0) === 0 && (
                <Pressable onPress={() => console.log("C")}>
                  <Text className="text-foreground text-base">No tags selected</Text>
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
          {/* The GENRE/TAG Pickers Section */}
          <View className="flex-1">
            <Animated.ScrollView
              // nestedScrollEnabled
              style={[filterSheetStyle, { flex: 1, height: "100%" }]}
              contentContainerStyle={{ paddingBottom: 200 }}
            >
              <View className="mt-1 flex-1">
                <View className="">
                  <HiddenContainerGlass
                    title="Genres"
                    key={"genres"}
                    leftIconFunction={clearGenres}
                  >
                    <GenrePicker />
                  </HiddenContainerGlass>
                </View>
                {/* Tags */}
                <View className="mb-2">
                  <HiddenContainerGlass title="Tags" key={"tags"} leftIconFunction={clearTags}>
                    <TagPicker />
                  </HiddenContainerGlass>
                </View>
              </View>
            </Animated.ScrollView>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};
