import LibraryMain from "@/src/components/absLibrary/LibraryContainer";
import React, { useState } from "react";
import { View } from "react-native";
const Books = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  return (
    <View className="">
      <LibraryMain />
    </View>
  );
};

export default Books;
