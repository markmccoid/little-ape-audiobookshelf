import { useGetBooks } from "@/src/hooks/ABSHooks";
import React from "react";
import { Text, View } from "react-native";

const LibraryMain = () => {
  const items = useGetBooks();
  return (
    <View>
      <Text>LibraryMain</Text>
    </View>
  );
};

export default LibraryMain;
