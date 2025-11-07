import { useBookData } from "@/src/hooks/trackPlayerHooks";
import { EnhancedChapter } from "@/src/store/store-books";
import { usePlaybackActions } from "@/src/store/store-playback";
import { useSmartPositions } from "@/src/store/store-smartposition";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList } from "react-native";
import useSleeperSetup from "./useSleeperSetup";

export const useBookChapters = (
  libraryItemId: string,
  flashListRef: React.RefObject<FlatList<EnhancedChapter> | null>
) => {
  const { book, duration, isBookActive } = useBookData(libraryItemId);
  const {
    chapterInfo: { chapterIndex },
  } = useSmartPositions(libraryItemId);
  const playbackActions = usePlaybackActions();
  const sleeperSetup = useSleeperSetup();
  const [localChapterIndex, setLocalChapterIndex] = useState(() => chapterIndex);

  const wasActiveRef = useRef(isBookActive);
  // Add ref for FlashList
  // Function to scroll to a specific chapter
  const scrollToChapter = useCallback(
    (index: number) => {
      if (!flashListRef?.current) return;

      if (flashListRef.current && book?.chapters && index >= 0 && index < book.chapters.length) {
        flashListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0, // Centers the item vertically (0 = top, 1 = bottom)
        });
      }
    },
    [book?.chapters]
  );

  // Update local chapter index and scroll when global chapter changes
  useEffect(() => {
    if (chapterIndex !== localChapterIndex && isBookActive) {
      setLocalChapterIndex(chapterIndex);
      // scrollToChapter(chapterIndex);
      scrollToChapter(chapterIndex);
    }
  }, [chapterIndex, scrollToChapter]);

  // Scroll to current chapter on mount
  useEffect(() => {
    if (book?.chapters && localChapterIndex >= 0) {
      // Small delay to ensure FlashList is fully rendered
      const timer = setTimeout(() => {
        scrollToChapter(localChapterIndex);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [book?.chapters]); // Only run when chapters are loaded

  const loadChapter = useCallback(
    async (chapterStart: number) => {
      console.log("isBookAct (useBookChapters", isBookActive);
      if (!isBookActive) {
        await playbackActions.loadBook(libraryItemId);
      }
      await playbackActions.seekTo(chapterStart);
      console.log("SleeperSetup useBookChap", sleeperSetup.sleepCountdownActive);
      if (!sleeperSetup.sleepCountdownActive && sleeperSetup.sleepEndOfChapterActive) {
        // Turn off sleep after chapter
        sleeperSetup.setSleepChapterIndex(undefined);
      }
      if (!isBookActive) playbackActions.play();
    },
    [libraryItemId, isBookActive, playbackActions]
  );

  const handleChapterPressed = useCallback(
    async (chapterIndex: number, startSeconds: number) => {
      setLocalChapterIndex(chapterIndex);
      scrollToChapter(chapterIndex);
      await loadChapter(startSeconds);
    },
    [loadChapter, scrollToChapter]
  );
  return {
    chapters: book?.chapters,
    isBookActive,
    chapterIndex: localChapterIndex,
    handleChapterPressed,
  };
};
