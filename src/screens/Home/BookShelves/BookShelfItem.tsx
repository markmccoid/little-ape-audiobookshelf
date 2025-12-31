import { OfflineBadge } from "@/src/components/OfflineBadge";
import { useSafeAbsAPI } from "@/src/contexts/AuthContext";
import { useNetwork } from "@/src/contexts/NetworkContext";
import { useBookPosition } from "@/src/store/store-books";
import { usePlaybackIsPlaying, usePlaybackStore } from "@/src/store/store-playback";
import { BookShelfBook } from "@/src/utils/AudiobookShelf/absUtils";
import { canPlayBookOffline } from "@/src/utils/bookAvailability";
import { useThemeColors } from "@/src/utils/theme";
import { Image } from "expo-image";
import { Link } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import BookPositionView from "./BookPositionView";

// Enhanced book item type with playback state

// Props interface for BookShelfItem
interface BookShelfItemProps {
  item: BookShelfBook;
  shelfId: string;
  onInitBook: (itemId: string) => Promise<void>;
  togglePlayPause: () => Promise<"paused" | "playing">;
}

/**
 * Individual book item in the "In Progress" list
 * Shows book cover, metadata, progress, and play/pause button
 */
const BookShelfItem = ({ item, shelfId, onInitBook, togglePlayPause }: BookShelfItemProps) => {
  // const isContinueListeningShelf = item.id === "continue-listening";
  const imageSize = 175;
  const itemSize = 190;
  // Check network state and book availability
  const { isOffline } = useNetwork();
  const currentSession = usePlaybackStore((state) => state.session);
  const isPlayable = canPlayBookOffline(
    { libraryItemId: item.libraryItemId, isDownloaded: item.isDownloaded },
    !isOffline,
    currentSession?.libraryItemId
  );
  const isPlaying = usePlaybackIsPlaying(item.libraryItemId);
  const bookPosition = useBookPosition(item.libraryItemId);
  const isCurrentlyLoaded = item.libraryItemId === currentSession?.libraryItemId;

  const percentBookWidth =
    bookPosition?.currentPosition && item?.duration > 0
      ? Math.ceil((bookPosition?.currentPosition / item.duration!) * 175)
      : 0;
  const playPause = async () => {
    // Check if book is playable offline
    if (!isPlayable) {
      Alert.alert(
        "Offline",
        "You're offline. This book requires an internet connection.\n\nDownload feature coming soon!",
        [{ text: "OK" }]
      );
      return;
    }

    if (isCurrentlyLoaded) {
      await togglePlayPause();
    } else {
      //Will automatically start playing
      await onInitBook(item.libraryItemId);
    }
  };

  const absAPI = useSafeAbsAPI();
  const themeColors = useThemeColors();
  return (
    <Animated.View
      className={`flex-col py-2 justify-center items-center rounded-lg`}
      style={{ width: itemSize }}
    >
      <View
        className="mx-2"
        style={{
          borderColor: isCurrentlyLoaded ? themeColors.accent : "transparent",
          borderRadius: isCurrentlyLoaded ? 15 : 10,
          borderWidth: isCurrentlyLoaded ? 0 : 0,
        }}
      >
        {/* {item?.currentTime > 0 && (
          <View className="z-40 justify-center relative ">
            <View
              className="absolute bottom-[-3] left-[-3] h-[6] bg-orange-400 z-40 mx-2 rounded-md border-hairline border-r-0"
              style={{ width: percentBookWidth }}
            />
            <View
              className="absolute bottom-[-3] left-[-3] h-[6] bg-orange-100 border-hairline border-l-0 border-b border-orange-600 z-30 mx-2 rounded-md "
              style={{ width: 165 }}
            />
          </View>
        )} */}
        <Link
          href={{
            pathname: `/(tabs)/(home)/[libraryItemId]`,
            params: {
              libraryItemId: item.libraryItemId,
              cover: item.coverURI,
              title: item.title,
            },
          }}
        >
          <Link.Trigger>
            {/* <SwiftImage systemName="line.3.horizontal.decrease.circle" size={24} /> */}

            <Image
              source={item.coverURI}
              style={{
                width: imageSize,
                height: imageSize,
                borderRadius: 10,
                borderWidth: StyleSheet.hairlineWidth,
                opacity: isPlayable ? 1 : 0.5, // Gray out when not playable
              }}
              className="border-hairline"
              contentFit="cover"
            />
            {/* Show offline badge when book is not playable */}
            <OfflineBadge isVisible={!isPlayable} />
          </Link.Trigger>
          <Link.Preview style={{ width: 250, height: 250 }}>
            <Image source={item.coverURI} style={{ width: "100%", height: "100%" }} />
          </Link.Preview>
          <Link.Menu>
            <Link.MenuAction
              title={isPlaying ? "Pause" : "Play"}
              onPress={playPause}
              disabled={!isPlayable}
              icon={isPlaying ? "pause" : "play"}
            />
            <Link.MenuAction
              title="Mark as Finished"
              onPress={() => absAPI?.setBookFinished(item.libraryItemId, true)}
              disabled={!isPlayable}
              icon="flag"
            />
            <Link.MenuAction
              title="Mark as Unfinished"
              onPress={() => absAPI?.setBookFinished(item.libraryItemId, false)}
              disabled={!isPlayable}
              icon="flag.slash"
            />
          </Link.Menu>
        </Link>
        {item?.currentTime > 0 && (
          <View className="z-40 justify-center relative ">
            <View
              className="absolute bottom-[-1] left-[-3] h-[6] bg-orange-400 z-40 mx-2 rounded-md border-hairline border-r-0"
              style={{ width: percentBookWidth }}
            />
            <View
              className="absolute bottom-[-1] left-[-3] h-[6] bg-orange-100 border-hairline border-l-0 border-b border-orange-600 z-30 mx-2 rounded-md "
              style={{ width: 165 }}
            />
          </View>
        )}
      </View>
      <View className="flex-col mt-2 items-center w-full px-2">
        <Text
          className="font-semibold text-sm text-foreground"
          numberOfLines={1}
          lineBreakMode="tail"
        >
          {item.title}
        </Text>

        <BookPositionView
          currentPosition={bookPosition?.currentPosition ?? 0}
          duration={item.duration ?? 0}
        />
      </View>
    </Animated.View>
  );
};

export default BookShelfItem;
