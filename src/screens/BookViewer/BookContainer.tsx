import BookControls from "@/src/components/bookComponents/BookControls";
import BookSlider from "@/src/components/bookComponents/BookSlider";
import TestPosition from "@/src/components/bookComponents/TestPosition";
import { useGetItemDetails } from "@/src/hooks/ABSHooks";
import { useSmartPosition } from "@/src/hooks/trackPlayerHooks";
import { formatSeconds } from "@/src/utils/formatUtils";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { Stack, useGlobalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { State, usePlaybackState } from "react-native-track-player";

const BookContainer = () => {
  const headerHeight = useHeaderHeight();

  const { bookid, cover, title } = useGlobalSearchParams<{
    bookid: string;
    cover: string;
    title: string;
  }>();
  const { data, isPending } = useGetItemDetails(bookid);
  console.log("data", data?.userMediaProgress?.currentTime);
  const progress = useSmartPosition(data?.userMediaProgress?.currentTime);

  const playbackState = usePlaybackState();
  // Check if player is currently playing
  const isPlaying = playbackState.state === State.Playing;

  // Use useFocusEffect to handle route focus/unfocus
  // useFocusEffect(
  //   useCallback(() => {
  //     console.log("BookIdRoute: Route focused - setting isOnBookScreen(true)");
  //     setIsOnBookScreen(true);
  //     initBook();

  //     return () => {
  //       console.log("BookIdRoute: Route unfocused - setting isOnBookScreen(false)");
  //       setIsOnBookScreen(false);
  //     };
  //   }, [bookid]) // Re-run if bookid changes
  // );
  return (
    <ScrollView
      className="flex-1"
      // contentInset={{ top: headerHeight }}
      // contentOffset={{ x: 0, y: -headerHeight }}
    >
      <Stack.Screen
        options={{
          headerTitle: title,
        }}
      />
      <BookSlider />
      <View className="flex-row justify-center border">
        <Image
          source={data?.coverURI || cover}
          style={{ width: 200, height: 200, borderRadius: 15 }}
          transition={200}
        />
      </View>
      <View>
        <Text>{formatSeconds(progress || 0)}</Text>
        <TestPosition />
      </View>
      <BookControls libraryItemId={bookid} />
      {/* <View className="flex-row items-center justify-between px-5">
        <Pressable className="p-3 bg-blue-500 rounded-lg" onPress={sync}>
          <Text className="text-white font-semibold">sync</Text>
        </Pressable>
      </View>
      <View className="flex-row items-center justify-between px-5">
        <Pressable className="p-3 bg-blue-500 rounded-lg" onPress={() => setupForPlayback(bookid)}>
          <Text className="text-white font-semibold">START PLAYBACK</Text>
        </Pressable>
      </View> */}
      <Text>BookIdRoute -- {bookid}</Text>
      {data &&
        data.media.chapters.map((el) => {
          return (
            <View key={el.id} className="flex-row gap-2">
              <Text>{el.title}</Text>
              <Text>{formatSeconds(el.end - el.start, "compact")}</Text>
              <Text>{el.end}</Text>
            </View>
          );
        })}
    </ScrollView>
  );
};

export default BookContainer;
