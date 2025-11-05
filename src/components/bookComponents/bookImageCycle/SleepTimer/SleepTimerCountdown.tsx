import React, { useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import useSleepTimer from "./useSleepTimer";

import { useSettingsStore } from "@store/store-settings";
import { MotiText, MotiView } from "moti";

const SleepTimerCountdown = () => {
  const { secondsLeft, formattedOutput } = useSleepTimer();

  const countdownActive = useSettingsStore((state) => state.countdownActive);
  const [viewWidth, setViewWidth] = useState(undefined);
  const viewRef = useRef<View>(null);
  const textRef = useRef<Text>(null);
  // Reset the viewWidth to undefined whenever countdownActive is NOT active
  const hold = useMemo(() => !countdownActive && setViewWidth(undefined), [countdownActive]);

  return (
    <View>
      {!countdownActive && null}
      {countdownActive && (
        <MotiView
          key="b"
          ref={viewRef}
          onLayout={(event) => {
            if (!viewWidth && formattedOutput) {
              setViewWidth(event.nativeEvent.layout.width + 20);
            }
          }}
          from={{ opacity: 0.2, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0.2, scale: 0.5 }}
          className={`bg-amber-200 px-1 border border-amber-400 rounded-md`}
          style={{
            width: viewWidth,
          }}
        >
          <MotiText
            ref={textRef}
            from={{ opacity: 0.2 }}
            animate={{ opacity: 1 }}
            transition={{
              type: "timing",
              duration: 500,
              delay: 1000,
            }}
            className="text-center text-base font-semibold"
          >
            {formattedOutput || "??:??"}
          </MotiText>
        </MotiView>
      )}
    </View>
  );
};

export default SleepTimerCountdown;
