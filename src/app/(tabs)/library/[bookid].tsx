import { useAuth, useSafeAbsAPI } from "@/src/contexts/AuthContext";
import BookSlider from "@/src/components/bookView/BookSlider";
import TestPosition from "@/src/components/bookView/TestPosition";
import { useSafeGetItemDetails } from "@/src/hooks/ABSHooks";
import { useSmartPosition } from "@/src/hooks/trackPlayerHooks";
import useAudiobookStreaming from "@/src/hooks/useAudiobookStreaming";
import { formatSeconds } from "@/src/lib/formatUtils";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { Stack, useGlobalSearchParams } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import TrackPlayer, { State, usePlaybackState } from "react-native-track-player";

const BookIdRoute = () => {
  const headerHeight = useHeaderHeight();
  const progress = useSmartPosition();

  // const [pos, setPos] = useState(playbackPos);

  // useEffect(() => {
  //   if (progress.position != 0 && progress.position != undefined) {
  //     console.log("POS&*&*", pos);
  //     setPos(progress.position);
  //   } else {
  //     console.log("IN ELSE", pos, playbackPos);
  //   }
  // }, [progress.position, playbackPos]);

  const { bookid, cover, title } = useGlobalSearchParams<{
    bookid: string;
    cover: string;
    title: string;
  }>();
  const { session, closeSession } = useAudiobookStreaming(bookid);

  const { data, isPending } = useSafeGetItemDetails(bookid);
  const absAPI = useSafeAbsAPI();
  const { authInfo } = useAuth();
  const playbackState = usePlaybackState();

  // console.log("deferred Progress", pos, playbackPos, progress.position);

  const togglePlayPause = async () => {
    const state = await TrackPlayer.getPlaybackState();
    console.log("State", state);
    if (state.state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  // Check if player is currently playing
  const isPlaying = playbackState.state === State.Playing;

  return (
    <ScrollView
      className="flex-1"
      contentInset={{ top: headerHeight }}
      contentOffset={{ x: 0, y: -headerHeight }}
    >
      <Stack.Screen
        options={{
          headerTitle: title,
        }}
      />
      <BookSlider />
      <View className="flex-row justify-center border">
        <Image
          source={cover}
          style={{ width: 200, height: 200, borderRadius: 15 }}
          transition={200}
        />
      </View>
      <View>
        <Text>{formatSeconds(progress || 0)}</Text>
        <TestPosition />
      </View>
      <View className="flex-row items-center justify-between px-5">
        <Pressable className="p-3 bg-blue-500 rounded-lg" onPress={togglePlayPause}>
          <Text className="text-white font-semibold">{isPlaying ? "Pause" : "Play"}</Text>
        </Pressable>
      </View>
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

export default BookIdRoute;
