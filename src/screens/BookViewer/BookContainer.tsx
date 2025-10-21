import BookControlsVertical from "@/src/components/bookComponents/BookControlsVertical";
import BookSlider from "@/src/components/bookComponents/BookSlider";
import RateSetter from "@/src/components/bookComponents/RateSetter";
import RateViewer from "@/src/components/bookComponents/RateViewer";
import { useGetItemDetails } from "@/src/hooks/ABSHooks";
import { useBookData } from "@/src/hooks/trackPlayerHooks";
import { useIsBookActive, usePlaybackSession, usePlaybackStore } from "@/src/store/store-playback";
import { formatSeconds } from "@/src/utils/formatUtils";
import { BlurView } from "expo-blur";
import { Image, ImageBackground } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { State, usePlaybackState } from "react-native-track-player";

const BookContainer = () => {
  const { bookid, cover, title } = useLocalSearchParams<{
    bookid: string;
    cover: string;
    title: string;
  }>();
  const colorScheme = useColorScheme();
  const isBookActive = useIsBookActive(bookid);
  const isLoaded = usePlaybackStore((state) => state.isLoaded);

  const playbackSession = usePlaybackSession();
  const { book, isLoading } = useBookData(bookid);
  console.log("BOOK DATA", isBookActive, book?.title, book?.genre);
  const { data, isPending } = useGetItemDetails(bookid);
  console.log("GET DATA", data?.media?.metadata.authorName);
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
      <Stack.Screen
        options={{
          headerTitle: title,
        }}
      />
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

        <View className="flex-row mx-2 justify-between items-center pt-10 ">
          <View className="absolute z-10 left-[-20]">
            <RateSetter />
          </View>
          <Image
            source={data?.coverURI || cover}
            style={{ width: 250, height: 250, borderRadius: 15 }}
            transition={200}
          />
          {/* Book Controls */}
          <View className="flex-1 flex-col h-[250] justify-between gap-2">
            <View className="flex-1 justify-end">
              <RateViewer />
            </View>
            <BookControlsVertical libraryItemId={bookid} />
          </View>
        </View>

        <View className="flex-1">
          <BookSlider bookId={bookid} />
        </View>

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
