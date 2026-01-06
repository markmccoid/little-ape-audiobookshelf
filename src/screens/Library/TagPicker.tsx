import { useGetFilterData } from "@/src/hooks/ABSHooks";
import { useFiltersActions, useTags, useToggleTag } from "@/src/store/store-filters";
import { useThemeColors } from "@/src/utils/theme";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const TagPicker = () => {
  const { filterData, isLoading } = useGetFilterData();
  const actions = useFiltersActions();
  const themeColors = useThemeColors();
  const toggleTag = useToggleTag();
  const tags = useTags();

  return (
    <ScrollView className="w-full h-[200] mx-1">
      <View className="flex-row flex-wrap w-full">
        {filterData?.tags?.map((tag) => (
          <Pressable
            onPress={() => toggleTag(tag.name)}
            key={tag.b64Encoded}
            style={{
              padding: 8,
              margin: 2,
              borderRadius: 12,
              backgroundColor: tags.includes(tag.name) ? themeColors.accent : "#f0f0f0",
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: themeColors.accent,
            }}
          >
            <Text>{tag.name}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

export default TagPicker;
