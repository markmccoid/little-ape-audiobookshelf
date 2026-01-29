import AddEditBookmark from "@/src/components/bookComponents/AddEditBookmark";
import BookControls from "@/src/components/bookComponents/BookControls";
import BookImageCycleContainer from "@/src/components/bookComponents/bookImageCycle/BookImageCycleContainer";
import BookQuickButtons from "@/src/components/bookComponents/bookImageCycle/BookQuickButtons";
import BookSlider from "@/src/components/bookComponents/BookSlider";
import { usePlaybackActions, usePlaybackSession } from "@/src/store/store-playback";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import React, { useCallback, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import PagerView from "react-native-pager-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MainPlayerContainer = () => {
  const playbackSession = usePlaybackSession();
  const { setIsOnBookScreen } = usePlaybackActions();
  const { top, bottom } = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);

  // Detect when modal is focused/unfocused (dismissed)
  useFocusEffect(
    useCallback(() => {
      // This runs when the modal is opened/focused
      setIsOnBookScreen(true);
      pagerRef.current?.setPage(0);
      // console.log("MainPlayer: Modal opened/focused");

      return () => {
        // This runs when the modal is dismissed/unfocused
        setIsOnBookScreen(false);
        // console.log("MainPlayer: Modal dismissed!");
      };
    }, []),
  );

  if (!playbackSession) {
    return (
      <View style={{ paddingTop: top }} className="flex-1 bg-red-500 justify-center items-center ">
        <Text className="text-2xl text-white font-semibold">No active playback session</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 pb-[50]">
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
        {/* BOOK IMAGE "Cycle" component */}
        <BookImageCycleContainer pagerRef={pagerRef} />

        {/* BOOK SLIDER */}
        <View className="px-5 mb-2">
          <BookSlider libraryItemId={playbackSession.libraryItemId} forceStaticColors />
        </View>

        {/* BOOK CONTROLS */}
        <View className="flex-row w-full justify-center flex-1">
          <BookControls libraryItemId={playbackSession.libraryItemId} />
        </View>

        {/* BOOK QUICK BUTTONS */}
        <BookQuickButtons pagerRef={pagerRef} />
      </View>
      <AddEditBookmark />
    </View>
  );
};

export default MainPlayerContainer;
