import { ABSGetItemInProgress } from "@/src/ABS/absAPIClass";
import { useGetBooksInProgress } from "@/src/hooks/ABSHooks";
import { formatSeconds } from "@/src/lib/formatUtils";
import { configureBooksSession } from "@/src/rn-trackplayer/configureBookSession";
import {
  usePlaybackActions,
  usePlaybackIsPlaying,
  usePlaybackSession,
} from "@/src/store/store-playback";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { Image } from "expo-image";
import React, { useCallback, useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useProgress } from "react-native-track-player";

// Define the enhanced book type with additional properties
type EnhancedBookItem = ABSGetItemInProgress & {
  isCurrentlyLoaded: boolean;
  isPlaying: boolean;
  currentTime: number;
};

// Props interface for ItemComponent
interface ItemComponentProps {
  item: EnhancedBookItem;
  isCurrentlyLoaded: boolean;
  isPlaying: boolean;
  currentTime: number;
  onInitBook: (itemId: string) => Promise<void>;
  togglePlayPause: () => Promise<"paused" | "playing">;
}

// Memoized ItemComponent to prevent unnecessary re-renders
const ItemComponent = React.memo<ItemComponentProps>(
  ({ item, isCurrentlyLoaded, isPlaying, currentTime, onInitBook, togglePlayPause }) => {
    // console.log("ITEM RENDER", item.title, isPlaying, isCurrentlyLoaded);
    return (
      <View key={item.id} className="flex-row ">
        <Image source={item.cover} style={{ width: 150, height: 150 }} contentFit="contain" />
        <View className="flex-col">
          <Text>{item.title}</Text>
          <Text>{item.author}</Text>
          <Text>{item.progressPercent}</Text>
          <Text>
            {formatSeconds(currentTime)} of {formatSeconds(item.duration || 0)}
          </Text>
          <View className="flex-row z-10">
            <TouchableOpacity
              onPress={async () => {
                if (isCurrentlyLoaded) {
                  await togglePlayPause();
                } else {
                  await onInitBook(item.id);
                  await togglePlayPause();
                }
              }}
              className={`border p-2 ${isPlaying ? "bg-red-400" : "bg-blue-500"} z-10`}
            >
              {isPlaying ? <Text>Pause</Text> : <Text>Play</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  },
  (prevProps: ItemComponentProps, nextProps: ItemComponentProps) => {
    // Custom comparison function - only re-render if specific props change
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.isCurrentlyLoaded === nextProps.isCurrentlyLoaded &&
      prevProps.isPlaying === nextProps.isPlaying && // ✅ Added missing isPlaying check
      Math.floor(prevProps.currentTime) === Math.floor(nextProps.currentTime) && // Only update when seconds change
      prevProps.item.title === nextProps.item.title &&
      prevProps.item.author === nextProps.item.author &&
      prevProps.item.cover === nextProps.item.cover
    );
  }
);

const HomeContainer = () => {
  const { data: books, isLoading, isError } = useGetBooksInProgress();
  const { togglePlayPause: storeTogglePlayPause } = usePlaybackActions();
  const isPlaying = usePlaybackIsPlaying();
  const session = usePlaybackSession();
  const progress = useProgress();

  console.log("ISPLAYING", isPlaying);

  const handleInitBook = useCallback(async (itemId: string) => {
    await configureBooksSession(itemId);
  }, []);

  // Enhance data with current progress info
  const enhancedBooks = useMemo((): EnhancedBookItem[] => {
    if (!books) return [];

    return books.map((book) => {
      const isCurrentlyLoaded = session?.libraryItemId === book.id;
      const currentTime =
        isCurrentlyLoaded && progress?.position ? progress.position : book.currentTime || 0;

      return {
        ...book,
        isCurrentlyLoaded,
        currentTime,
        isPlaying: session?.libraryItemId === book.id ? isPlaying : false,
      };
    });
  }, [books, session?.libraryItemId, progress?.position, isPlaying]);

  const renderItem: ListRenderItem<EnhancedBookItem> = useCallback(
    ({ item }) => (
      <ItemComponent
        item={item}
        isCurrentlyLoaded={item.isCurrentlyLoaded}
        isPlaying={item.isPlaying}
        currentTime={item.currentTime}
        onInitBook={handleInitBook}
        togglePlayPause={storeTogglePlayPause}
      />
    ),
    [handleInitBook, storeTogglePlayPause] // ✅ Fixed dependencies
  );

  const keyExtractor = useCallback((item: EnhancedBookItem) => item.id, []);

  return (
    <View className="flex-1">
      <FlashList<EnhancedBookItem>
        data={enhancedBooks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        // ✅ Add these props to help with updates
        extraData={isPlaying} // Force re-render when isPlaying changes
      />
    </View>
  );
};

export default HomeContainer;
