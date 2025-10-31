import BookControls from "@/src/components/bookComponents/BookControls";
import {
  usePlaybackActions,
  usePlaybackIsPlaying,
  usePlaybackSession,
} from "@/src/store/store-playback";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaFrame, useSafeAreaInsets } from "react-native-safe-area-context";
import { useProgress } from "react-native-track-player";
import { useColorScheme } from "nativewind";

/**
 * MainPlayerContainerBlur2 - Uses image-based blur instead of BlurView
 *
 * This version applies blur directly to the background image using the
 * blurRadius prop, rather than using expo-blur's BlurView component.
 */
const MainPlayerContainerBlur2 = () => {
  const playbackActions = usePlaybackActions();
  const isPlaying = usePlaybackIsPlaying();
  const headerHeight = useHeaderHeight();
  const playbackSession = usePlaybackSession();
  const progress = useProgress();
  const { top, bottom } = useSafeAreaInsets();
  const { y, x, height } = useSafeAreaFrame();
  const { colorScheme } = useColorScheme();

  if (!playbackSession) {
    return (
      <View style={{ paddingTop: top }} className="flex-1 bg-red-500 justify-center items-center ">
        <Text className="text-2xl text-white font-semibold">No active playback session</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Blurred Background Image */}
      {playbackSession?.coverURL && (
        <>
          <Image
            source={{ uri: playbackSession.coverURL }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            blurRadius={60}
            transition={300}
          />
          {/* Semi-transparent overlay for better text readability */}
          <View
            style={StyleSheet.absoluteFillObject}
            className={colorScheme === "dark" ? "bg-black/50" : "bg-black/40"}
          />
        </>
      )}

      {/* Content Layer */}
      <View className="flex-1" style={{ paddingTop: top * 0.7 }}>
        <View className="flex-row justify-center">
          <SymbolView name="minus" size={50} tintColor="white" />
        </View>

        {/* Cover Image - Sharp version */}
        <View className="items-center mt-8 mb-6">
          <Image
            source={{ uri: playbackSession.coverURL }}
            style={{ width: 240, height: 240, borderRadius: 12 }}
            contentFit="cover"
            transition={300}
          />
        </View>

        {/* Book Title and Author */}
        <View className="px-6 mb-6">
          <Text className="text-white text-2xl font-bold text-center mb-2">
            {playbackSession.displayTitle}
          </Text>
          <Text className="text-white/80 text-lg text-center">{playbackSession.displayAuthor}</Text>
        </View>

        <BookControls libraryItemId={playbackSession.libraryItemId} />
      </View>
    </View>
  );
};

export default MainPlayerContainerBlur2;
