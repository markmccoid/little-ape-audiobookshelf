import { useSmartPosition } from "@/src/hooks/trackPlayerHooks";
import { formatSeconds } from "@/src/utils/formatUtils";
import React from "react";
import { Text, View } from "react-native";

const TestPosition = () => {
  const pos = useSmartPosition();
  return (
    <View>
      <Text>{formatSeconds(pos)}</Text>
    </View>
  );
};

export default TestPosition;
