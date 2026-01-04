import { useGetFilterData } from "@/src/hooks/ABSHooks";
import { useFiltersActions, useGenres, useToggleGenre } from "@/src/store/store-filters";
import { useThemeColors } from "@/src/utils/theme";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const GenrePicker = () => {
  const { filterData, isLoading } = useGetFilterData();
  const actions = useFiltersActions();
  const themeColors = useThemeColors();
  const toggleGenre = useToggleGenre();
  const genres = useGenres();

  return (
    <ScrollView className="w-full h-[200] mx-1">
      <View className="flex-row flex-wrap w-full">
        {filterData?.genres?.map((genre) => (
          <Pressable
            onPress={() => toggleGenre(genre.name)}
            style={{
              padding: 8,
              margin: 2,
              borderRadius: 12,
              backgroundColor: genres.includes(genre.name) ? themeColors.accent : "#f0f0f0",
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: themeColors.accent,
            }}
          >
            <Text key={genre.b64Encoded}>{genre.name}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

export default GenrePicker;
