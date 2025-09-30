import { ABSGetItemInProgress } from "@/src/ABS/absAPIClass";
import { formatSeconds } from "@/src/lib/formatUtils";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

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
    return (
      <View
        key={item.id}
        className="flex-col w-[200] p-2 mr-3"
        style={{ backgroundColor: item.isCurrentlyLoaded ? "#ecce67aa" : "transparent" }}
      >
        <Image 
          source={item.cover} 
          style={{ width: "100%", height: 200, borderRadius: 8 }} 
          contentFit="cover" 
        />
        <View className="flex-col mt-2">
          <Text 
            className="font-semibold text-sm" 
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text className="text-xs text-gray-600 mt-1">
            {formatSeconds(item.currentTime)} / {formatSeconds(item.duration || 0)}
          </Text>
          <Pressable
            onPress={async () => {
              if (item.isCurrentlyLoaded) {
                await togglePlayPause();
              } else {
                await onInitBook(item.id);
                await togglePlayPause();
              }
            }}
            className="mt-2 p-2 rounded-md"
            style={{
              backgroundColor: item.isPlaying ? "#f87171" : "#3b82f6",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600", textAlign: "center" }}>
              {item.isPlaying ? "Pause" : "Play"}
            </Text>
          </Pressable>
        </View>
      </View>
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
