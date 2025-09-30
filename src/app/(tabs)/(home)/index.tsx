import HomeContainer from "@/src/components/home/HomeContainer";
import { useHeaderHeight } from "@react-navigation/elements";
import React, { useState } from "react";
import { View } from "react-native";

const HomeTab = () => {
  const [color, setColor] = useState("");
  const headerHeight = useHeaderHeight();

  return (
    <View style={{ backgroundColor: color, flex: 1 }}>
      <HomeContainer />
    </View>
  );
};

export default HomeTab;
