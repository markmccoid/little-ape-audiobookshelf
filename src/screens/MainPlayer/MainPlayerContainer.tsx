import BookControls from "@/src/components/bookComponents/BookControls";
import BookImage from "@/src/components/bookComponents/BookImage";
import BookSlider from "@/src/components/bookComponents/BookSlider";
import {
  usePlaybackActions,
  usePlaybackIsPlaying,
  usePlaybackSession,
} from "@/src/store/store-playback";
import { useHeaderHeight } from "@react-navigation/elements";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaFrame, useSafeAreaInsets } from "react-native-safe-area-context";
import { useProgress } from "react-native-track-player";

const MainPlayerContainer = () => {
  const playbackActions = usePlaybackActions();
  const isPlaying = usePlaybackIsPlaying();
  const headerHeight = useHeaderHeight();
  const playbackSession = usePlaybackSession();
  const progress = useProgress();
  const { top, bottom } = useSafeAreaInsets();
  const { y, x, height } = useSafeAreaFrame();
  const colorScheme = useColorScheme();

  console.log("Safe Area", playbackSession?.coverURL);

  if (!playbackSession) {
    return (
      <View style={{ paddingTop: top }} className="flex-1 bg-red-500 justify-center items-center ">
        <Text className="text-2xl text-white font-semibold">No active playback session</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Background Image (unblurred) */}
      {playbackSession?.coverURL && (
        <Image
          source={{ uri: playbackSession.coverURL }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={300}
        />
      )}

      {/* Native iOS Blur Effect */}
      <BlurView
        intensity={90}
        // tint={colorScheme === "dark" ? "dark" : "light"}
        tint="systemMaterialDark"
        style={StyleSheet.absoluteFillObject}
      />

      {/* Content Layer */}
      <View className="flex-1" style={{ paddingTop: top * 0.7 }}>
        {/* Handle */}
        <View className="flex-row justify-center">
          <SymbolView name="minus" size={50} tintColor="white" />
        </View>

        {/* Book Title and Author */}
        {/* <View className="px-6">
          <Text className="text-white text-xl font-bold text-center mb-2" numberOfLines={1}>
            {playbackSession.displayTitle}
          </Text>
        </View> */}

        <BookImage coverURL={playbackSession.coverURL} />
        <View className="px-5">
          <BookSlider bookId={playbackSession.libraryItemId} useStaticColors />
        </View>
        <BookControls libraryItemId={playbackSession.libraryItemId} />
      </View>
    </View>
  );
};

export default MainPlayerContainer;
