import { useEffect } from "react";
import { usePlaybackActions, usePlaybackSession } from "@store/store-playback";

// Example hook showing how to use the playback store rather than the raw AudiobookStreamer
const useAudiobookStreaming = (itemId: string) => {
  const { initFromABS, bindEvents, loadBook, closeSession, setIsOnBookScreen } = usePlaybackActions();
  const session = usePlaybackSession();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initFromABS();
      bindEvents();
      if (!cancelled) {
        await loadBook(itemId);
      }
      // Mark that we're on the book screen so the mini player can hide
      setIsOnBookScreen(true);
    })();

    return () => {
      cancelled = true;
      // Leaving the book screen should NOT close the session; keep playback for mini player
      setIsOnBookScreen(false);
    };
  }, [itemId]);

  return {
    session,
    setupForPlayback: () => loadBook(itemId),
    closeSession,
  };
};

export default useAudiobookStreaming;
