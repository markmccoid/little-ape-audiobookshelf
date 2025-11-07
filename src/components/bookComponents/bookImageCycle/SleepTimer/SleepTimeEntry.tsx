import { useSettingsActions, useSettingsStore } from "@/src/store/store-settings";
import React, { useState } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import SleepButton from "./SleepButton";

const SleepTimeEntry = () => {
  const sleepTime = useSettingsStore((state) => state.sleepTimeMinutes);
  const [viewWidth, setViewWidth] = useState(0);

  const countdownActive = useSettingsStore((state) => state.sleepCountdownActive);
  const { updateSleepTime } = useSettingsActions();

  const { formattedOutput, secondsLeft } = useSettingsStore((state) => state.sleepCountDown);
  const handleSetSleepTime = (value: number) => {
    const newTime = sleepTime + value;
    if (newTime < 0) {
      // setSleepTime(0);
      updateSleepTime(0);
      return;
    }
    // setSleepTime(newTime);
    updateSleepTime(newTime);
  };

  return (
    <View>
      {countdownActive && (
        <View>
          <Text className="text-foreground">{formattedOutput}</Text>
          <Text>{secondsLeft}</Text>
        </View>
      )}
      {!countdownActive && (
        <Animated.View
          key="a"
          className="flex-row justify-between p-2 gap-2"
          onLayout={(event) => {
            if (!viewWidth) {
              setViewWidth(event.nativeEvent.layout.width);
            }
          }}
        >
          <SleepButton onPress={() => handleSetSleepTime(-5)} buttonTime="-5" />
          <SleepButton onPress={() => handleSetSleepTime(-10)} buttonTime="-10" />
          <SleepButton onPress={() => handleSetSleepTime(-15)} buttonTime="-15" />
          <View className="w-[20]" />
          <SleepButton onPress={() => handleSetSleepTime(5)} buttonTime="+5" />
          <SleepButton onPress={() => handleSetSleepTime(10)} buttonTime="+10" />
          <SleepButton onPress={() => handleSetSleepTime(15)} buttonTime="+15" />
        </Animated.View>
      )}
    </View>
  );
};

export default SleepTimeEntry;

{
  /* <TextInput
keyboardType="number-pad"
onChangeText={handleSleepTimeUpdate}
className="text-base h-[30] bg-white border p-1 pb-[15] text-center"
// className="p-1 text-center"
value={sleepTime.toString()}
editable={!Boolean(sleepStartDateTime)}
/> */
}
