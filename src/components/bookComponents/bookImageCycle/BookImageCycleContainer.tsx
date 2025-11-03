import { usePlaybackSession } from "@/src/store/store-playback";
import { getImageDimensions } from "@/src/utils/formatUtils";
import React from "react";
import { Text, View } from "react-native";
import PagerView from "react-native-pager-view";
import BookImage from "../BookImage";
import BookCycleChapters from "./BookCycleChapters";

type BookImageCycleContainerProps = {
  pagerRef: React.RefObject<PagerView>;
};

const BookImageCycleContainer = ({ pagerRef }: BookImageCycleContainerProps) => {
  const playbackSession = usePlaybackSession();
  const imageDimensions = getImageDimensions();

  return (
    <PagerView
      ref={pagerRef}
      style={{ height: imageDimensions.height + 50 }} // adjust height if needed
      initialPage={0}
      orientation="horizontal"
    >
      <View key={1} className="flex-1">
        <BookImage coverURL={playbackSession?.coverURL} />
      </View>
      <View key={2} className="mx-[15] flex-1 " style={{ borderRadius: 25, overflow: "hidden" }}>
        <BookCycleChapters />
      </View>
      <View key={3}>
        <Text>BookImageContainer 2</Text>
      </View>
    </PagerView>
  );
};

export default BookImageCycleContainer;
