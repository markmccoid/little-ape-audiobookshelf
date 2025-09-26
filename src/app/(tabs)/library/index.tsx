import LibraryMain from "@/src/components/absLibrary/LibraryContainer";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import { Text, View } from "react-native";

const Books = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => {
        return (
          <View>
            <Text className="dark:text-white">Filter</Text>
          </View>
        );
      },
    });
  }, []);
  return (
    <View className="flex-1">
      <LibraryMain />
    </View>
  );
};

export default Books;
