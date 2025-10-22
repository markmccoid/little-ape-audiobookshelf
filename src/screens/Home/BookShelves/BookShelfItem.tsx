import { useSafeAbsAPI } from "@/src/contexts/AuthContext";
import { formatSeconds } from "@/src/utils/formatUtils";
import { useThemeColors } from "@/src/utils/theme";
import { Image } from "expo-image";
import { Link } from "expo-router";
import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { EnhancedBookItem } from "./BookShelfContainer";

// Enhanced book item type with playback state

// Props interface for BookShelfItem
interface BookShelfItemProps {
  item: EnhancedBookItem;
  onInitBook: (itemId: string) => Promise<void>;
  togglePlayPause: () => Promise<"paused" | "playing">;
}

/**
 * Individual book item in the "In Progress" list
 * Shows book cover, metadata, progress, and play/pause button
 */
const BookShelfItem = React.memo<BookShelfItemProps>(
  ({ item, onInitBook, togglePlayPause }) => {
    const playPause = useCallback(async () => {
      if (item.isCurrentlyLoaded) {
        await togglePlayPause();
      } else {
        //Will automatically start playing
        await onInitBook(item.libraryItemId);
      }
    }, [item.isCurrentlyLoaded]);
    // console.log(
    //   "ProgressItem",
    //   item.title,
    //   item.libraryItemId,
    //   item.hideFromContinueListening,
    //   item.isFinished
    // );
    // console.log("ProgressItem", item.title, item.progressId, item.hideFromContinueListening);
    const absAPI = useSafeAbsAPI();
    const themeColors = useThemeColors();
    return (
      <Animated.View className="flex-col py-2 w-[190] justify-center items-center rounded-lg">
        <View
          className="mx-2"
          style={{
            backgroundColor: item.isCurrentlyLoaded ? themeColors.accent : "transparent",
            borderRadius: 10,
          }}
        >
          <Link
            href={{
              pathname: `/(tabs)/(home)/[libraryItemId]`,
              params: {
                libraryItemId: item.libraryItemId,
                cover: item.coverURL,
                title: item.title,
              },
            }}
          >
            <Link.Trigger>
              {/* <SwiftImage systemName="line.3.horizontal.decrease.circle" size={24} /> */}

              <Image
                source={item.coverURL}
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
            <Link.Preview style={{ width: 250, height: 250 }}>
              <Image source={item.coverURL} style={{ width: "100%", height: "100%" }} />
            </Link.Preview>
            <Link.Menu>
              <Link.MenuAction
                title={item.isPlaying ? "Pause" : "Play"}
                onPress={playPause}
                icon={item.isPlaying ? "pause" : "play"}
              />
              {/* <Link.MenuAction
                title="Hide"
                onPress={() => absAPI?.hideFromContinueListening(item.progressId || "")}
                icon="eye.slash"
              /> */}
              <Link.MenuAction
                title="Mark as Finished"
                onPress={() => absAPI?.setBookFinished(item.libraryItemId, true)}
                icon="flag"
              />
              <Link.MenuAction
                title="Mark as Unfinished"
                onPress={() => absAPI?.setBookFinished(item.libraryItemId, false)}
                icon="flag.slash"
              />
            </Link.Menu>
          </Link>
        </View>
        <View className="flex-col mt-2 items-center w-full px-2">
          <Text
            className="font-semibold text-sm text-foreground"
            numberOfLines={1}
            lineBreakMode="tail"
          >
            {item.title}
          </Text>

          {item.shelfId === "continue-listening" && (
            <Text className="text-xs text-muted mt-1">
              {formatSeconds(item.currentTime)} / {formatSeconds(item.duration || 0)}
            </Text>
          )}

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
      prevProps.item.libraryItemId === nextProps.item.libraryItemId &&
      prevProps.item.isPlaying === nextProps.item.isPlaying &&
      prevProps.item.isCurrentlyLoaded === nextProps.item.isCurrentlyLoaded &&
      Math.floor(prevProps.item.currentTime) === Math.floor(nextProps.item.currentTime);

    return same;
  }
);

BookShelfItem.displayName = "BookShelfItem";

export default BookShelfItem;
