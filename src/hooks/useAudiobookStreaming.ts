import { usePlaybackActions, usePlaybackSession } from "@/src/store/store-playback";
import { useEffect, useRef } from "react";

/**
 * Smart audiobook streaming hook that relies on the store-level guard
 * to avoid reloading the same book. This keeps TrackPlayer from resetting
 * when a user opens the currently loaded book (paused or playing).
 */
const useAudiobookStreaming = (itemId: string) => {
  const { initFromABS, bindEvents, loadBook, closeSession } = usePlaybackActions();
  const session = usePlaybackSession();
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    isUnmountedRef.current = false;

    (async () => {
      // await closeSession();
      // await initFromABS();
      bindEvents();
      if (cancelled || isUnmountedRef.current) return;
      // Always call loadBook; the store will no-op if the same book is already loaded
      await loadBook(itemId);
    })();

    return () => {
      console.log("useAudiobookStreaming UNLOAD", session?.id);
      cancelled = true;
      isUnmountedRef.current = true;
      // Note: setIsOnBookScreen is now handled by the route component using useFocusEffect
    };
  }, [itemId]);

  return {
    session,
    closeSession,
  };
};

export default useAudiobookStreaming;
