import LibraryMain from "@/src/components/absLibrary/LibraryContainer";
import MiniPlayer from "@/src/components/MiniPlayer";
import React, { useState } from "react";
import { View } from "react-native";
const Books = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  return (
    <View className="">
      <LibraryMain />
      <MiniPlayer />
    </View>
  );
};

export default Books;
