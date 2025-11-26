import { useSettingsStore } from "@/src/store/store-settings";
import { formatSeconds } from "@/src/utils/formatUtils";
import { useThemeColors } from "@/src/utils/theme";
import React from "react";
import { Text, View } from "react-native";

type Props = {
  currentPosition: number;
  duration: number;
};
const BookPositionView = ({ currentPosition, duration }: Props) => {
  const themeColors = useThemeColors();
  // will be a setting that allows users to show either
  // time left in book or time read in book
  const timeVariant = useSettingsStore((state) => state.homeScreenTimeVariant);
  const showTimeLeft = timeVariant === "timeleft";

  if (currentPosition === 0) {
    return null;
  }
  if (showTimeLeft) {
    return (
      <View className="flex-row">
        <Text
          className="text-sm  mt-1 font-firacode font-semibold"
          style={{ color: themeColors.destructive }}
        >
          {formatSeconds((duration || 0) - currentPosition, "minimal-no-seconds")}
        </Text>

        <Text className="text-sm text-muted mt-1 font-firacode font-semibold">
          {` l/of ${formatSeconds(duration || 0, "minimal-no-seconds")}`}
          {/* {formatSeconds(item.currentTime)} / {formatSeconds(item.duration || 0)} */}
        </Text>
      </View>
    );
  }
  return (
    <View className="flex-row">
      <Text
        className="text-sm  mt-1 font-firacode font-semibold"
        style={{ color: themeColors.accent }}
      >
        {formatSeconds(
          currentPosition,
          // (item.duration || 0) - bookPosition.currentPosition,
          "minimal-no-seconds"
        )}
      </Text>
      <Text className="text-sm text-muted mt-1 font-firacode font-semibold">
        {` r/of ${formatSeconds(duration || 0, "minimal-no-seconds")}`}
        {/* {formatSeconds(item.currentTime)} / {formatSeconds(item.duration || 0)} */}
      </Text>
    </View>
  );
};

export default BookPositionView;
