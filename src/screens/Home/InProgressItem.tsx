import { useSafeAbsAPI } from "@/src/contexts/AuthContext";
import { EnhancedBookItem } from "@/src/screens/Home/BookShelves/BookShelfContainer";
import { OfflineBadge } from "@/src/components/OfflineBadge";
import { useNetwork } from "@/src/contexts/NetworkContext";
import { usePlaybackStore } from "@/src/store/store-playback";
import { canPlayBookOffline } from "@/src/utils/bookAvailability";
import { formatSeconds } from "@/src/utils/formatUtils";
import { useThemeColors } from "@/src/utils/theme";
import { Image } from "expo-image";
import { Link } from "expo-router";
import React, { useCallback } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

// Enhanced book item type with playback state

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
    item.isPlaying && console.log("ITEM IS PLAYING", `${item.title} -- ${item.isPlaying}`);

    // Check network state and book availability
    const { isOffline } = useNetwork();
    const currentSession = usePlaybackStore((state) => state.session);
    const isPlayable = canPlayBookOffline(
      { libraryItemId: item.libraryItemId, isDownloaded: item.isDownloaded },
      !isOffline,
      currentSession?.libraryItemId
    );

    const playPause = useCallback(async () => {
      // Check if book is playable offline
      if (!isPlayable) {
        Alert.alert(
          "Offline",
          "You're offline. This book isn't downloaded. Connect to the internet or download it to listen offline.",
          [{ text: "OK" }]
        );
        return;
      }

      if (item.isCurrentlyLoaded) {
        await togglePlayPause();
      } else {
        await onInitBook(item.libraryItemId);
        await togglePlayPause();
      }
    }, [item.isCurrentlyLoaded, isPlayable, onInitBook, togglePlayPause, item.libraryItemId]);
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
      <Animated.View
        className="flex-col w-[200] p-2 justify-center items-center rounded-lg"
        // style={{
        //   backgroundColor: item.isCurrentlyLoaded ? themeColors.accentMuted : "transparent",
        // }}
      >
        {/* {(item.isFinished || item.hideFromContinueListening) && (
          <View className="absolute top-0 border-hairline rounded-full z-10 left-0 bg-gray-300">
            {item.hideFromContinueListening && (
              <SymbolView name="eye.slash.circle.fill" tintColor={themeColors.warning} />
            )}
            {item.isFinished && <SymbolView name="checkmark" tintColor={themeColors.warning} />}
          </View>
        )} */}
        <View
          className="p-2"
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
                  opacity: isPlayable ? 1 : 0.5, // Gray out when not playable
                }}
                className="border-hairline"
                contentFit="cover"
              />
              {/* Show offline badge when book is not playable */}
              <OfflineBadge isVisible={!isPlayable} />
            </Link.Trigger>

            <Link.Menu>
              {/* Only show play/pause and server actions when online or book is playable */}
              {isPlayable && (
                <>
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
                </>
              )}
              {/* Show offline message when not playable */}
              {!isPlayable && (
                <Link.MenuAction
                  title="Offline - Book Unavailable"
                  onPress={() => {
                    Alert.alert(
                      "Offline",
                      "You're offline. This book isn't downloaded. Connect to the internet or download it to listen offline.",
                      [{ text: "OK" }]
                    );
                  }}
                  icon="wifi.slash"
                />
              )}
            </Link.Menu>
          </Link>
        </View>
        <View className="flex-col mt-2 items-center w-full">
          <Text
            className="font-semibold text-sm text-foreground"
            numberOfLines={1}
            lineBreakMode="tail"
          >
            {item.title}
          </Text>

          <Text className="text-xs text-muted mt-1">
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
  }
  // Note: Removed custom comparison function to allow re-rendering when NetworkContext updates.
  // React.memo will still optimize re-renders using default shallow comparison of props.
  // This is necessary because useNetwork() hook inside the component needs to re-evaluate
  // when network state changes, which won't happen if React.memo blocks the re-render.
);

InProgressItem.displayName = "InProgressItem";

export default InProgressItem;
