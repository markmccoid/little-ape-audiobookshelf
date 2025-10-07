import { useSmartPosition } from "@/src/hooks/trackPlayerHooks";
import { formatSeconds } from "@/src/utils/formatUtils";
import React from "react";
import { Text, View } from "react-native";

const TestPosition = () => {
  // Note: useSmartPosition requires libraryItemId parameter
  // This component needs to be updated to receive and pass the libraryItemId
  // const pos = useSmartPosition(libraryItemId);
  return (
    <View>
      <Text>TestPosition: needs libraryItemId prop</Text>
    </View>
  );
};

export default TestPosition;
