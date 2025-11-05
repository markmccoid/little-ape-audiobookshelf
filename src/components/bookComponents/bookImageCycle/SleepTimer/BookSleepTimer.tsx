import { useSettingsActions, useSettingsStore } from "@/src/store/store-settings";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import SleepTimeEntry from "./SleepTimeEntry";
import SleepTimerCountdown from "./SleepTimerCountdown";

const BookSleepTimer = () => {
  const countdownActive = useSettingsStore((state) => state.countdownActive);
  const sleepTime = useSettingsStore((state) => state.sleepTimeMinutes);
  const { startSleepTimer, stopSleepTimer } = useSettingsActions();

  return (
    <View
      className="flex-col bg-white border border-accent mx-5 overflow-hidden"
      style={{ borderRadius: 10 }}
    >
      <View className="flex-row justify-center p-2 relative items-center">
        <Text allowFontScaling={false} className="font-bold text-lg">
          Sleep in {sleepTime} min
        </Text>
        {/* START and STOP Buttons */}
        <View className="absolute right-1">
          {!countdownActive && sleepTime > 0 && (
            <TouchableOpacity
              className="border border-red-800 py-2 px-3 bg-accent rounded-xl"
              onPress={() => {
                startSleepTimer();
              }}
            >
              <Text allowFontScaling={false} className="text-accent-foreground ">
                Start
              </Text>
            </TouchableOpacity>
          )}
          {countdownActive && (
            <TouchableOpacity
              className="border border-red-800 py-2 px-3 rounded-xl bg-orange-600"
              onPress={() => {
                stopSleepTimer();
              }}
            >
              <Text allowFontScaling={false} className="text-accent-foreground ">
                Stop
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View
        className={`border-t border-t-amber-900 p-2 items-center rounded-lg ${
          countdownActive ? "bg-red-200" : "bg-white"
        }`}
      >
        <SleepTimeEntry />
        <SleepTimerCountdown />
      </View>
    </View>
  );
};

export default BookSleepTimer;
