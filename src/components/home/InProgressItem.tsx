import { useSafeAbsAPI } from "@/src/contexts/AuthContext";
import { ABSGetItemInProgress } from "@/src/utils/AudiobookShelf/absAPIClass";
import { formatSeconds } from "@/src/utils/formatUtils";
import { Image } from "expo-image";
import { Link } from "expo-router";
import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

// Enhanced book item type with playback state
export type EnhancedBookItem = ABSGetItemInProgress & {
  isCurrentlyLoaded: boolean;
  isPlaying: boolean;
  currentTime: number;
};

// Props interface for InProgressItem
interface InProgressItemProps {
  item: EnhancedBookItem;
  onInitBook: (itemId: string) => Promise<void>;
  togglePlayPause: () => Promise<"paused" | "playing">;
}

/**
 * Individual book item in the "In Progress" list
 * Shows book cover, metadata, progress, and play/pause button
 */
const InProgressItem = React.memo<InProgressItemProps>(
  ({ item, onInitBook, togglePlayPause }) => {
    const playPause = useCallback(async () => {
      if (item.isCurrentlyLoaded) {
        await togglePlayPause();
      } else {
        await onInitBook(item.bookId);
        await togglePlayPause();
      }
    }, [item.isCurrentlyLoaded]);
    // console.log(
    //   "ProgressItem",
    //   item.title,
    //   item.bookId,
    //   item.hideFromContinueListening,
    //   item.isFinished
    // );
    // console.log("ProgressItem", item.title, item.progressId, item.hideFromContinueListening);
    const absAPI = useSafeAbsAPI();

    return (
      <Animated.View
        className="flex-col w-[200] p-2 justify-center items-center rounded-lg"
        style={{ backgroundColor: item.isCurrentlyLoaded ? "#ecce67aa" : "transparent" }}
      >
        <Link href="">
          <Link.Trigger>
            {/* <SwiftImage systemName="line.3.horizontal.decrease.circle" size={24} /> */}
            <Image
              source={item.cover}
              style={{
                width: 175,
                height: 175,
                borderRadius: 10,
                borderWidth: StyleSheet.hairlineWidth,
              }}
              className="border-hairline"
              contentFit="cover"
            />
          </Link.Trigger>
          <Link.Menu>
            <Link.MenuAction
              title={item.isPlaying ? "Pause" : "Play"}
              onPress={playPause}
              icon={item.isPlaying ? "pause" : "play"}
            />
            <Link.MenuAction
              title="Hide"
              onPress={() => absAPI?.hideFromContinueListening(item.progressId || "")}
              icon="eye.slash"
            />

            <Link.MenuAction
              title="Mark as Finished"
              onPress={() => absAPI?.setBookFinished(item.bookId, true)}
              icon="flag"
            />
            <Link.MenuAction
              title="Mark as Unfinished"
              onPress={() => absAPI?.setBookFinished(item.bookId, false)}
              icon="flag.slash"
            />
          </Link.Menu>
        </Link>

        <View className="flex-col mt-2 items-center w-full">
          <Text className="font-semibold text-sm" numberOfLines={1} lineBreakMode="tail">
            {item.title}
          </Text>

          <Text className="text-xs text-gray-600 mt-1">
            {formatSeconds(item.currentTime)} / {formatSeconds(item.duration || 0)}
          </Text>

          {/* <View className="flex-row w-full justify-center">
            <Pressable
              onPress={async () => {
                if (item.isCurrentlyLoaded) {
                  await togglePlayPause();
                } else {
                  await onInitBook(item.id);
                  await togglePlayPause();
                }
              }}
              className="mt-2 py-2 px-8 rounded-md"
              style={{
                backgroundColor: item.isPlaying ? "#f87171" : "#3b82f6",
              }}
            >
              <Text style={{ color: "white", fontWeight: "600", textAlign: "center" }}>
                {item.isPlaying ? "Pause" : "Play"}
              </Text>
            </Pressable>
          </View> */}
        </View>
      </Animated.View>
    );
  },
  // Optimized comparison - only re-render when critical props change
  (prevProps, nextProps) => {
    const same =
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.isPlaying === nextProps.item.isPlaying &&
      prevProps.item.isCurrentlyLoaded === nextProps.item.isCurrentlyLoaded &&
      Math.floor(prevProps.item.currentTime) === Math.floor(nextProps.item.currentTime);

    return same;
  }
);

InProgressItem.displayName = "InProgressItem";

export default InProgressItem;
