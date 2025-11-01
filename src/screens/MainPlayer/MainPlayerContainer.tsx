import BookControls from "@/src/components/bookComponents/BookControls";
import BookImage from "@/src/components/bookComponents/BookImage";
import BookSlider from "@/src/components/bookComponents/BookSlider";
import { usePlaybackActions, usePlaybackSession } from "@/src/store/store-playback";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useColorScheme } from "nativewind";
import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaFrame, useSafeAreaInsets } from "react-native-safe-area-context";

const MainPlayerContainer = () => {
  const playbackSession = usePlaybackSession();
  const { setIsOnBookScreen } = usePlaybackActions();
  const { top, bottom } = useSafeAreaInsets();
  const { y, x, height } = useSafeAreaFrame();
  const { colorScheme } = useColorScheme();

  // Detect when modal is focused/unfocused (dismissed)
  useFocusEffect(
    useCallback(() => {
      // This runs when the modal is opened/focused
      setIsOnBookScreen(true);
      console.log("MainPlayer: Modal opened/focused");

      return () => {
        // This runs when the modal is dismissed/unfocused
        setIsOnBookScreen(false);
        console.log("MainPlayer: Modal dismissed!");
        // Add your cleanup logic here
        // Examples:
        // - Sync playback position
        // - Save state
        // - Update analytics
      };
    }, [])
  );

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
        <View className="px-5 mb-2">
          <BookSlider libraryItemId={playbackSession.libraryItemId} forceStaticColors />
        </View>
        <View className="flex-row w-full justify-center">
          <BookControls libraryItemId={playbackSession.libraryItemId} />
        </View>
      </View>
    </View>
  );
};

export default MainPlayerContainer;
