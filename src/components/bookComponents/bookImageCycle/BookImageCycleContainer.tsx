import useSleeperSetup from "@/src/hooks/useSleeperSetup";
import { usePlaybackSession } from "@/src/store/store-playback";
import { getImageDimensions } from "@/src/utils/formatUtils";
import React from "react";
import { Text, View } from "react-native";
import PagerView from "react-native-pager-view";
import BookImage from "../BookImage";
import BookCycleChapters from "./BookCycleChapters";
import BookRateCycle from "./BookRateCycle";
import BookSleepTimer from "./SleepTimer/BookSleepTimer";
import useSleepTimer from "./SleepTimer/useSleepTimer";

type BookImageCycleContainerProps = {
  pagerRef: React.RefObject<PagerView>;
};

const BookImageCycleContainer = ({ pagerRef }: BookImageCycleContainerProps) => {
  const playbackSession = usePlaybackSession();
  const imageDimensions = getImageDimensions();
  const { sleepCountdownActive, sleepEndOfChapterActive } = useSleeperSetup();
  const { formattedOutput } = useSleepTimer();

  return (
    <PagerView
      ref={pagerRef}
      style={{ height: imageDimensions.height + 50 }} // adjust height if needed
      initialPage={0}
      orientation="horizontal"
    >
      <View key={1} className="flex-1">
        {(sleepCountdownActive || sleepEndOfChapterActive) && (
          <View className="absolute z-10 left-[35] top-[10] bg-[#9f170dcc] px-3 py-2 border-hairline rounded-xl">
            {sleepCountdownActive && (
              <View className="flex-row gap-1">
                <Text className="text-lg text-white font-semibold">Sleep in </Text>
                <Text className="text-lg text-white font-semibold font-firacode">
                  {formattedOutput}
                </Text>
              </View>
            )}
            {sleepEndOfChapterActive && (
              <Text className="text-lg text-white font-semibold">End of Chapter</Text>
            )}
          </View>
        )}
        <BookImage coverURL={playbackSession?.coverURL} />
      </View>
      <View key={2} className="mx-[15] flex-1 " style={{ borderRadius: 25, overflow: "hidden" }}>
        <BookCycleChapters />
      </View>
      <View key={3}>
        <View className="flex-1">
          <BookRateCycle />
        </View>
        <View className="flex-1 flex-col justify-center">
          <BookSleepTimer />
        </View>
      </View>
      <View key={4}>
        <View>
          <Text>BookMarks Placeholder</Text>
        </View>
      </View>
    </PagerView>
  );
};

export default BookImageCycleContainer;
