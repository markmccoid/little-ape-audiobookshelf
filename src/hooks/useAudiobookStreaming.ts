import { usePlaybackActions, usePlaybackSession } from "@/src/store/store-playback";
import { useEffect } from "react";

/**
 * Smart audiobook streaming hook that relies on the store-level guard
 * to avoid reloading the same book. This keeps TrackPlayer from resetting
 * when a user opens the currently loaded book (paused or playing).
 */
const useAudiobookStreaming = (itemId: string) => {
  const { initFromABS, bindEvents, loadBook, closeSession, setIsOnBookScreen } =
    usePlaybackActions();
  const session = usePlaybackSession();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // await closeSession();
      // await initFromABS();
      bindEvents();
      if (cancelled) return;
      // Always call loadBook; the store will no-op if the same book is already loaded
      await loadBook(itemId);
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
    closeSession,
  };
};

export default useAudiobookStreaming;
