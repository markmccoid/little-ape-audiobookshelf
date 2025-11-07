import useSleeperSetup from "@/src/hooks/useSleeperSetup";
import {
  usePlaybackActions,
  usePlaybackSession,
  usePlaybackStore,
} from "@/src/store/store-playback";
import { useSettingsActions, useSettingsStore } from "@/src/store/store-settings";
import { PressableScale } from "pressto";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import SleepTimeEntry from "./SleepTimeEntry";
import SleepTimerCountdown from "./SleepTimerCountdown";

const BookSleepTimer = () => {
  const countdownActive = useSettingsStore((state) => state.sleepCountdownActive);
  const session = usePlaybackSession();
  const sleepTime = useSettingsStore((state) => state.sleepTimeMinutes);
  const sleepChapterIndex = useSettingsStore((state) => state.sleepChapterIndex);
  const { startSleepTimer, stopSleepTimer } = useSettingsActions();
  const { updateSleepChapterIndex } = usePlaybackActions();
  const currentChapterIndex = usePlaybackStore((state) => state.currentChapterIndex);

  const sleepChapterActive = sleepChapterIndex !== undefined;
  const sleepSetup = useSleeperSetup();
  return (
    <View
      className="flex-col bg-white border border-accent mx-5 overflow-hidden"
      style={{ borderRadius: 10 }}
    >
      <View className="flex-col gap-2 py-2">
        {/* EOC Timer */}
        <View className="flex-row border-b-hairline p-2">
          {sleepChapterActive && (
            <View className="flex-row justify-between w-full items-center">
              <Text>End after This Chapter</Text>
              <TouchableOpacity
                className="border border-red-800 py-2 px-3 rounded-xl bg-orange-600"
                onPress={() => {
                  // stopSleepTimer();
                  sleepSetup.handleSleepTimerStop();
                }}
              >
                <Text allowFontScaling={false} className="text-accent-foreground ">
                  Stop
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {!sleepChapterActive && (
            <View className="border-hairline p-1 bg-accent" style={{ borderRadius: 8 }}>
              <PressableScale onPress={() => sleepSetup.setSleepChapterIndex(currentChapterIndex)}>
                {/* <PressableScale onPress={() => updateSleepChapterIndex(currentChapterIndex)}> */}
                <Text className="text-accent-foreground">End of Chapter</Text>
              </PressableScale>
            </View>
          )}
        </View>
        {/* TIME TIMER + START and STOP Buttons */}
        <View className="flex-row justify-between px-2">
          <View className="flex-row gap-1">
            <Text allowFontScaling={false} className="font-bold text-lg">
              Sleep in
            </Text>
            <Text allowFontScaling={false} className="font-bold text-lg font-firacode">
              {sleepTime}
            </Text>
          </View>
          {!sleepSetup.sleepCountdownActive && (
            <TouchableOpacity
              className="border border-red-800 py-2 px-3 bg-accent rounded-xl"
              onPress={() => {
                // startSleepTimer();
                sleepSetup.handleSleepTimerStart();
              }}
            >
              <Text allowFontScaling={false} className="text-accent-foreground ">
                Start
              </Text>
            </TouchableOpacity>
          )}

          {sleepSetup.sleepCountdownActive && (
            <TouchableOpacity
              className="border border-red-800 py-2 px-3 rounded-xl bg-orange-600"
              onPress={() => {
                // stopSleepTimer();
                sleepSetup.handleSleepTimerStop();
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
