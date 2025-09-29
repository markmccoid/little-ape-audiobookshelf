import LibraryMain from "@/src/components/absLibrary/LibraryContainer";
import HeaderButton from "@/src/components/common/LAABSHeaderButton";
import { useHeaderHeight } from "@react-navigation/elements";
import { Link, useNavigation } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useLayoutEffect, useState } from "react";
import { View } from "react-native";

const Books = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => {
        return (
          <Link href={{ pathname: "/(tabs)/library/filterroute" }} asChild>
            <HeaderButton>
              <SymbolView name="brain.fill" size={20} />
            </HeaderButton>
          </Link>
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
