import { useSafeAbsAPI } from "@/src/contexts/AuthContext";
import { useInvalidateQueries } from "@/src/hooks/ABSHooks";
import {
  usePlaybackActions,
  usePlaybackSession,
  usePlaybackStore,
} from "@/src/store/store-playback";
import { BookShelfItemType } from "@/src/utils/AudiobookShelf/absUtils";
import { useThemeColors } from "@/src/utils/theme";
import { SymbolView } from "expo-symbols";
import React, { useCallback, useMemo, useReducer } from "react";
import { ListRenderItem, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import BookShelfItem from "./BookShelfItem";

export type EnhancedBookItem = BookShelfItemType["books"][0] & {
  isCurrentlyLoaded: boolean;
  isPlaying: boolean;
  currentTime: number;
  id: string;
  isDownloaded?: boolean; // For future download feature
};
type Props = {
  shelfData: BookShelfItemType;
  isLoading?: boolean;
  isError?: boolean;
};
const BookShelfContainer = ({ shelfData, isLoading, isError }: Props) => {
  const themeColors = useThemeColors();
  const { togglePlayPause: storeTogglePlayPause, loadBookAndPlay: handleInitBook } =
    usePlaybackActions();
  const invalidateQuery = useInvalidateQueries();
  // For this isPlaying, we don't care what book is playing since we are checking that
  // in the render item.
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const session = usePlaybackSession();

  // const { position } = useProgress(5000);
  // const pos = useBookPosition(session?.libraryItemId);

  const absAPI = useSafeAbsAPI();

  //!! Does nothing here --- Take out and use in full list of IN PROGRESS
  const [showHidden, toggleShowHidden] = useReducer((state) => !state, false);
  // Refetch books in progress when home tab gains focus

  //# Wrapper function that loads book and optimistically updates cache
  // This function is passed to each render item (book) and then the render item
  // checks to see if there is an existing session and if so, it it matches the book
  // trying to be played.  If it matches, then we just want to toggle play/pause
  // if not then render item will call this function and then the play/pause toggle function
  const handleInitBookWithOptimisticUpdate = async (itemId: string) => {
    // First, load the book
    await handleInitBook(itemId);
    // Have to wait for first sync operation so that when we requery the book is moved to beginning
    setTimeout(() => invalidateQuery("bookshelves"), 7000);
  };

  //# Enhance data with current progress info

  // Check if this is the continue-listening shelf that needs real-time progress updates
  const isContinueListeningShelf = shelfData.id === "continue-listening";
  //!! How to display time information across all books with it
  //!! RESIZE continue listening to be regular size.
  //!! Maybe top/first shelf is big
  const enhancedBooks = useMemo((): EnhancedBookItem[] => {
    // console.log("SHelf Data", shelfData);
    if (!shelfData?.books) return [];
    return shelfData.books
      .map((book) => {
        const isCurrentlyLoaded = session?.libraryItemId === book.libraryItemId;

        // If book is loaded, pass the isPlaying var pulled from main hook
        const bookIsPlaying = isCurrentlyLoaded ? isPlaying : false;

        return {
          ...book,
          isCurrentlyLoaded,
          isPlaying: bookIsPlaying,
          id: shelfData.id,
        };
      })
      .filter((el: any): el is EnhancedBookItem => el !== undefined);
  }, [
    shelfData,
    session?.libraryItemId,
    // isContinueListeningShelf ? progress?.position : undefined,
    isPlaying,
  ]);

  const renderItem: ListRenderItem<EnhancedBookItem> = useCallback(
    ({ item, index }) => {
      return (
        <BookShelfItem
          item={item}
          onInitBook={handleInitBookWithOptimisticUpdate}
          togglePlayPause={storeTogglePlayPause}
        />
      );
    },
    [handleInitBookWithOptimisticUpdate, storeTogglePlayPause]
  );

  const keyExtractor = useCallback((item: EnhancedBookItem) => `${item.libraryItemId}`, []);

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
        <Text>Error loading books2</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
        <View className="mt-2">
          <View className="flex-row gap-2 px-2">
            <Text className="text-lg font-bold text-accent">{shelfData.label}</Text>
            {/* Does nothing here --- Take out and use in full list of IN PROGRESS */}
            {shelfData.id === "continue-listening" && (
              <Pressable onPress={toggleShowHidden}>
                {showHidden ? (
                  <SymbolView name="eye" tintColor={themeColors.accent} />
                ) : (
                  <SymbolView name="eye.slash" tintColor={themeColors.accent} />
                )}
              </Pressable>
            )}
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
    </View>
  );
};

export default BookShelfContainer;
