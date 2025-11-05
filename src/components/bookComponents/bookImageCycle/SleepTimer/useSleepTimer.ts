import { useSettingsStore } from "@store/store-settings";
import { useEffect } from "react";
//
const useSleepTimer = () => {
  const sleepStartDateTime = useSettingsStore((state) => state.sleepStartDateTime);
  const cancelCountdown = useSettingsStore((state) => state.cancelSleepInterval);
  const { secondsLeft, formattedOutput } = useSettingsStore((state) => state.sleepCountDown);
  const { runSleepCountdown } = useSettingsStore((state) => state.actions);

  // UseEffect start countdown IF it hasn't been started yet
  // and a sleep timer has been start
  useEffect(() => {
    // ONLY start the countdown IF the cancelCountdown function is undefined
    // and a timer is active.  We use the sleepStartDateTime field being populated
    // to indicate an active sleep timer
    if (sleepStartDateTime && !cancelCountdown) {
      runSleepCountdown();
    }
    // Clear the countdown interval if component unmounts
    return () => {
      if (cancelCountdown) {
        cancelCountdown();
      }
    };
  }, [cancelCountdown, sleepStartDateTime]);
  return {
    formattedOutput,
    secondsLeft,
  };
};

export default useSleepTimer;
