import { useSafeAbsAPI } from "@/src/contexts/AuthContext";
import { moveBookToTopOfInProgress, useGetBooksInProgress } from "@/src/hooks/ABSHooks";
import {
  usePlaybackActions,
  usePlaybackIsPlaying,
  usePlaybackSession,
} from "@/src/store/store-playback";
import { useHeaderHeight } from "@react-navigation/elements";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import React, { useCallback, useMemo, useRef } from "react";
import { Text, View } from "react-native";
import { useProgress } from "react-native-track-player";
import InProgressItem, { EnhancedBookItem } from "./InProgressItem";

const HomeContainer = () => {
  const { data: booksInProgress, isLoading, isError } = useGetBooksInProgress();
  const { togglePlayPause: storeTogglePlayPause, loadBook: handleInitBook } = usePlaybackActions();
  const isPlaying = usePlaybackIsPlaying();
  const session = usePlaybackSession();
  const progress = useProgress();
  const headerHeight = useHeaderHeight();
  const absAPI = useSafeAbsAPI();
  const activeLibraryId = absAPI?.getActiveLibraryId() || null;

  // Cache to store the last known position for each book
  // This persists between loads/unloads without needing React Query invalidation
  const positionCacheRef = useRef<Record<string, number>>({});

  // Wrapper function that loads book and optimistically updates cache
  const handleInitBookWithOptimisticUpdate = useCallback(
    async (itemId: string) => {
      // First, load the book
      await handleInitBook(itemId);
      // Then, optimistically move it to the top of the in-progress list
      moveBookToTopOfInProgress(itemId, activeLibraryId);
    },
    [handleInitBook, activeLibraryId]
  );

  // console.log("HomeContainer render - isPlaying:", isPlaying, "session:", session?.libraryItemId);

  // Enhance data with current progress info
  const enhancedBooks = useMemo((): EnhancedBookItem[] => {
    if (!booksInProgress) return [];

    return booksInProgress.map((book) => {
      const isCurrentlyLoaded = session?.libraryItemId === book.id;

      // Determine current time with priority:
      // 1. If loaded and playing: use live progress.position
      // 2. If unloaded but we have cached position: use cached position
      // 3. Otherwise: fall back to server data (book.currentTime)
      let currentTime: number;

      if (isCurrentlyLoaded && progress?.position != null && progress.position !== 0) {
        // Book is loaded: use live position and update cache
        // Need to fallback to book.currentTime if progress.position is zero
        // it isn't
        currentTime = progress.position;
        positionCacheRef.current[book.id] = currentTime;
      } else if (positionCacheRef.current[book.id] != null) {
        // Book is unloaded but we have cached position: use cache
        currentTime = positionCacheRef.current[book.id];
      } else {
        // No cache yet: use server data
        currentTime = book.currentTime || 0;
        // Initialize cache with server data
        positionCacheRef.current[book.id] = currentTime;
      }

      const bookIsPlaying = isCurrentlyLoaded ? isPlaying : false;

      return {
        ...book,
        isCurrentlyLoaded,
        currentTime,
        isPlaying: bookIsPlaying,
      };
    });
  }, [booksInProgress, session?.libraryItemId, progress?.position, isPlaying]);

  const renderItem: ListRenderItem<EnhancedBookItem> = useCallback(
    ({ item }) => (
      <InProgressItem
        item={item}
        onInitBook={handleInitBookWithOptimisticUpdate}
        togglePlayPause={storeTogglePlayPause}
      />
    ),
    [handleInitBookWithOptimisticUpdate, storeTogglePlayPause]
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
    <View className="flex-1" style={{ paddingTop: headerHeight }}>
      <FlashList<EnhancedBookItem>
        data={enhancedBooks}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        extraData={{ isPlaying, sessionId: session?.libraryItemId }}
      />
    </View>
  );
};

export default HomeContainer;
