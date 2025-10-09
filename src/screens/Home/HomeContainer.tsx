import { useSafeAbsAPI } from "@/src/contexts/AuthContext";
import { moveBookToTopOfInProgress, useGetBooksInProgress } from "@/src/hooks/ABSHooks";
import {
  usePlaybackActions,
  usePlaybackSession,
  usePlaybackStore,
} from "@/src/store/store-playback";
import { useThemeColors } from "@/src/utils/theme";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useCallback, useMemo, useReducer, useRef } from "react";
import { ListRenderItem, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { usePlaybackState, useProgress } from "react-native-track-player";
import InProgressItem, { EnhancedBookItem } from "./InProgressItem";

const HomeContainer = () => {
  const themeColors = useThemeColors();
  const { data: booksInProgress, isLoading, isError, refetch } = useGetBooksInProgress();
  const { togglePlayPause: storeTogglePlayPause, loadBook: handleInitBook } = usePlaybackActions();

  // For this isPlaying, we don't care what book is playing since we are checking that
  // in the render item.
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const session = usePlaybackSession();
  const progress = useProgress();
  const headerHeight = useHeaderHeight();
  const absAPI = useSafeAbsAPI();
  const activeLibraryId = absAPI?.getActiveLibraryId() || null;
  const [showHidden, toggleShowHidden] = useReducer((state) => !state, false);
  const pbState = usePlaybackState();
  // Refetch books in progress when home tab gains focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Cache to store the last known position for each book
  // This persists between loads/unloads without needing React Query invalidation
  const positionCacheRef = useRef<Record<string, number>>({});

  //# Wrapper function that loads book and optimistically updates cache
  // This function is passed to each render item (book) and then the render item
  // checks to see if there is an existing session and if so, it it matches the book
  // trying to be played.  If it matches, then we just want to toggle play/pause
  // if not then render item will call this function and then the play/pause toggle function
  const handleInitBookWithOptimisticUpdate = useCallback(
    async (itemId: string) => {
      // First, load the book
      await handleInitBook(itemId);
      // Then, optimistically move it to the top of the in-progress list
      moveBookToTopOfInProgress(itemId, activeLibraryId);
    },
    [handleInitBook, activeLibraryId]
  );

  //# Enhance data with current progress info
  const enhancedBooks = useMemo((): EnhancedBookItem[] => {
    if (!booksInProgress) return [];

    return booksInProgress
      .map((book) => {
        if (!showHidden) {
          if (book?.hideFromContinueListening || book?.isFinished) return undefined;
        }
        const isCurrentlyLoaded = session?.libraryItemId === book.bookId;
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
          positionCacheRef.current[book.bookId] = currentTime;
        } else if (positionCacheRef.current[book.bookId] != null) {
          // Book is unloaded but we have cached position: use cache
          currentTime = positionCacheRef.current[book.bookId];
        } else {
          // No cache yet: use server data
          currentTime = book.currentTime || 0;
          // Initialize cache with server data
          positionCacheRef.current[book.bookId] = currentTime;
        }

        const bookIsPlaying = isCurrentlyLoaded ? isPlaying : false;

        return {
          ...book,
          isCurrentlyLoaded,
          currentTime,
          isPlaying: bookIsPlaying,
        };
      })
      .filter((el): el is EnhancedBookItem => el !== undefined);
  }, [booksInProgress, session?.libraryItemId, progress?.position, isPlaying, showHidden]);

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

  const keyExtractor = useCallback((item: EnhancedBookItem) => item.bookId, []);

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
    <ScrollView className="flex-1 px-2">
      <View className="mt-2">
        <View className="flex-row gap-2">
          <Text className="text-lg font-bold text-accent">Continue Listening</Text>
          <Pressable onPress={toggleShowHidden}>
            {showHidden ? (
              <SymbolView name="eye" tintColor={themeColors.accent} />
            ) : (
              <SymbolView name="eye.slash" tintColor={themeColors.accent} />
            )}
          </Pressable>
        </View>
        <Animated.FlatList<EnhancedBookItem>
          data={enhancedBooks}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          extraData={{ isPlaying, sessionId: session?.libraryItemId }}
          itemLayoutAnimation={LinearTransition}
        />
      </View>
    </ScrollView>
  );
};

export default HomeContainer;
