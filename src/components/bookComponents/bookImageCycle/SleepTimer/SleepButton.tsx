import { useThemeColors } from "@/src/utils/theme";
import { PressableScale } from "pressto";
import React from "react";
import { Text, View, ViewStyle } from "react-native";

type Props = {
  onPress: () => void;
  buttonTime: string;
  style?: ViewStyle;
};
const SleepButton = ({ onPress, buttonTime, style = {} }: Props) => {
  const themeColors = useThemeColors();
  return (
    <PressableScale onPress={onPress}>
      <View
        className="py-1 border border-accent w-[45]"
        style={[style, { borderRadius: 10, backgroundColor: `${themeColors.accent}cc` }]}
      >
        <Text
          allowFontScaling={false}
          className="font-semibold text-center font-firacode text-lg text-accent-foreground"
        >
          {buttonTime}
        </Text>
      </View>
    </PressableScale>
  );
};

export default SleepButton;
