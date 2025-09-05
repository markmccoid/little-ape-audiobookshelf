import LibraryMain from "@/src/components/absLibrary/LibraryMain";
import React, { useState } from "react";
import { View } from "react-native";
const Books = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  return (
    <View className="flex-1">
      <LibraryMain />
    </View>
  );
};

export default Books;
