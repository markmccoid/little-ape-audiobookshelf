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
import { Pressable, Text, View } from "react-native";
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
  onInitBook: (itemId: string) => Promise<void>;
  togglePlayPause: () => Promise<"paused" | "playing">;
}

// Simplified ItemComponent with less aggressive memoization
const ItemComponent = React.memo<ItemComponentProps>(
  ({ item, onInitBook, togglePlayPause }) => {
    // console.log(
    //   `ITEM RENDER: ${item.title} - Playing: ${item.isPlaying} - Loaded: ${item.isCurrentlyLoaded}`
    // );

    return (
      <View
        key={item.id}
        className="flex-row"
        style={{ backgroundColor: item.isCurrentlyLoaded ? "#ecce67aa" : "" }}
      >
        <Image source={item.cover} style={{ width: 150, height: 150 }} contentFit="contain" />
        <View className="flex-col ">
          <Text className="font-semibold">{item.title}</Text>
          <Text>{item.author}</Text>
          <Text>{item.progressPercent}%</Text>
          <Text>
            {formatSeconds(item.currentTime)} of {formatSeconds(item.duration || 0)}
          </Text>
          <View className="flex-row">
            <Pressable
              onPress={async () => {
                if (item.isCurrentlyLoaded) {
                  await togglePlayPause();
                } else {
                  await onInitBook(item.id);
                  await togglePlayPause();
                }
              }}
              className="border p-2 z-10"
              style={{
                backgroundColor: item.isPlaying ? "#f87171" : "#3b82f6", // red-400 : blue-500
              }}
            >
              <Text style={{ color: "white", fontWeight: "600", textAlign: "center" }}>
                {item.isPlaying ? "Pause" : "Play"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  },
  // More lenient comparison - only check ID and the critical state
  (prevProps, nextProps) => {
    const same =
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.isPlaying === nextProps.item.isPlaying &&
      prevProps.item.isCurrentlyLoaded === nextProps.item.isCurrentlyLoaded &&
      Math.floor(prevProps.item.currentTime) === Math.floor(nextProps.item.currentTime);

    if (!same) {
      // console.log(`Item ${prevProps.item.title} will re-render:`, {
      //   idSame: prevProps.item.id === nextProps.item.id,
      //   playingSame: prevProps.item.isPlaying === nextProps.item.isPlaying,
      //   loadedSame: prevProps.item.isCurrentlyLoaded === nextProps.item.isCurrentlyLoaded,
      //   timeSame: Math.floor(prevProps.item.currentTime) === Math.floor(nextProps.item.currentTime),
      // });
    }

    return same;
  }
);

const HomeContainer = () => {
  const { data: books, isLoading, isError } = useGetBooksInProgress();
  const { togglePlayPause: storeTogglePlayPause } = usePlaybackActions();
  const isPlaying = usePlaybackIsPlaying();
  const session = usePlaybackSession();
  const progress = useProgress();

  // console.log("HomeContainer render - isPlaying:", isPlaying, "session:", session?.libraryItemId);

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

      const bookIsPlaying = isCurrentlyLoaded ? isPlaying : false;

      return {
        ...book,
        isCurrentlyLoaded,
        currentTime,
        isPlaying: bookIsPlaying,
      };
    });
  }, [books, session?.libraryItemId, progress?.position, isPlaying]);

  const renderItem: ListRenderItem<EnhancedBookItem> = useCallback(
    ({ item }) => (
      <ItemComponent
        item={item}
        onInitBook={handleInitBook}
        togglePlayPause={storeTogglePlayPause}
      />
    ),
    [handleInitBook, storeTogglePlayPause]
  );

  const keyExtractor = useCallback((item: EnhancedBookItem) => item.id, []);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading books in progress...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Error loading books</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlashList<EnhancedBookItem>
        data={enhancedBooks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        // Debug props to help identify issues
        onLoad={() => console.log("FlashList loaded")}
        // Force update when critical state changes
        extraData={{ isPlaying, sessionId: session?.libraryItemId }}
      />
    </View>
  );
};

export default HomeContainer;
