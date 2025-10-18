import BookControlsVertical from "@/src/components/bookComponents/BookControlsVertical";
import BookSlider from "@/src/components/bookComponents/BookSlider";
import { useGetItemDetails } from "@/src/hooks/ABSHooks";
import { useIsBookActive, usePlaybackSession, usePlaybackStore } from "@/src/store/store-playback";
import { formatSeconds } from "@/src/utils/formatUtils";
import { BlurView } from "expo-blur";
import { Image, ImageBackground } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { State, usePlaybackState } from "react-native-track-player";

const BookContainer = () => {
  const colorScheme = useColorScheme();
  const playbackSession = usePlaybackSession();

  const { bookid, cover, title } = useLocalSearchParams<{
    bookid: string;
    cover: string;
    title: string;
  }>();
  const { data, isPending } = useGetItemDetails(bookid);

  const isBookActive = useIsBookActive(bookid);
  const isLoaded = usePlaybackStore((state) => state.isLoaded);

  // console.log("BOOK ACTIVe", isBookActive, isLoaded);
  // const { position, isLoading, error } = useSmartPosition(bookid);

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
  //!!! NEED TO GET THE IMAGE EVEN IF BOOK NOT LOADED
  return (
    <View className="flex-1 pt-[100]">
      {cover && (
        <ImageBackground
          source={{ uri: cover }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
      )}
      {/* Native iOS Blur Effect */}
      <BlurView
        intensity={90}
        tint={colorScheme === "dark" ? "dark" : "light"}
        // tint="systemMaterialDark"
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView
        className="flex-1"
        // contentInset={{ top: headerHeight }}
        // contentOffset={{ x: 0, y: -headerHeight }}
      >
        {/* {playbackSession?.coverURL && (
          <Image
            source={{ uri: playbackSession.coverURL }}
            style={StyleSheet.absoluteFillObject}
            // className="mt-[-100]"
            contentFit="cover"
            transition={300}
          />
        )} */}

        <Stack.Screen
          options={{
            headerTitle: title,
          }}
        />

        <View className="flex-row mx-2 justify-between items-center pt-10 ">
          <BookControlsVertical libraryItemId={bookid} />
          <Image
            source={data?.coverURI || cover}
            style={{ width: 200, height: 200, borderRadius: 15 }}
            transition={200}
          />
          <BookControlsVertical libraryItemId={bookid} />
        </View>

        {/* <View className="flex-row w-full justify-center">
        <BookControlsVertical libraryItemId={bookid} />
      </View> */}
        <BookSlider bookId={bookid} />
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
        <Text className="text-foreground ">BookIdRoute -- {bookid}</Text>
        <Text className="text-foreground ">FOREGROUND</Text>
        {data &&
          data.media.chapters.map((el) => {
            return (
              <View key={el.id} className="flex-row gap-2">
                <Text className="text-foreground">{el.title}</Text>
                <Text className="text-foreground">
                  {formatSeconds(el.end - el.start, "compact")}
                </Text>
                <Text className="text-foreground">{el.end}</Text>
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
};

export default BookContainer;
