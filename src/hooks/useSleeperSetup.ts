import { usePlaybackActions, usePlaybackStore } from "../store/store-playback";
import { useSettingsActions, useSettingsStore } from "../store/store-settings";

const useSleeperSetup = () => {
  const playbackActions = usePlaybackActions();
  const settingsActions = useSettingsActions();
  // Indicates if a sleep timer is running/active
  const sleepCountdownActive = useSettingsStore((state) => state.sleepCountdownActive);
  const sleepTimeMinutes = useSettingsStore((state) => state.sleepTimeMinutes);
  const ss = useSettingsStore((state) => state);
  const sleepChapterIndex = usePlaybackStore((state) => state.sleepChapterIndex);
  const sc = usePlaybackStore((state) => state);
  // Indicates if a sleep after chapter is active
  const sleepEndOfChapterActive = sleepChapterIndex !== undefined;

  // console.log(
  //   "useSleepSetup SS",
  //   ss.sleepStartDateTime,
  //   ss.sleepCountdownActive,
  //   ss.sleepTimeMinutes
  // );
  // console.log("useSleepSetup SC", sc.sleepChapterIndex, sc.currentChapterIndex);

  //# SLEEP CHAPTER SET
  //# Be carefule when you call as this will cancel the sleep timer also
  const setSleepChapterIndex = (sleepChapterIndex: number | undefined) => {
    //update playback store
    playbackActions.updateSleepChapterIndex(sleepChapterIndex);

    //update settings store
    settingsActions.updateSleepChapter(sleepChapterIndex);
  };

  //# SLEEP TIMER SET
  const setSleepTimer = (val: number) => {
    settingsActions.updateSleepTime(val);
    //~ When updating the Sleep Timer, we cancel any EOC check in process
    //update playback store
    playbackActions.updateSleepChapterIndex(sleepChapterIndex);

    //update settings store
    settingsActions.updateSleepChapter(sleepChapterIndex);
  };

  //# HANDLE SLEEP TIMER START
  const handleSleepTimerStart = () => {
    if (sleepTimeMinutes > 0) {
      setSleepChapterIndex(undefined);
      settingsActions.startSleepTimer();
      // Clear EOC if active
    }
  };
  //# HANDLE SLEEP TIMER STOP
  const handleSleepTimerStop = () => {
    setSleepChapterIndex(undefined);
    settingsActions.stopSleepTimer();
  };

  return {
    setSleepChapterIndex,
    setSleepTimer,
    handleSleepTimerStart,
    handleSleepTimerStop,
    sleepEndOfChapterActive,
    sleepCountdownActive,
  };
};

export default useSleeperSetup;
