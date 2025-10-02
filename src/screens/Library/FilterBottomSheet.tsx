import { BottomSheet, Host, Text } from "@expo/ui/swift-ui";
import React from "react";
import { useWindowDimensions } from "react-native";

const { width } = useWindowDimensions();

const FilterBottomSheet = ({ isOpened }) => {
  isOpened = isOpened || false;
  return (
    <Host style={{ position: "absolute", width, height: 200 }}>
      <BottomSheet isOpened={isOpened} onIsOpenedChange={(e) => console.log("is opeened", e)}>
        <Text>FilterBottomSheet</Text>
      </BottomSheet>
    </Host>
  );
};

export default FilterBottomSheet;
