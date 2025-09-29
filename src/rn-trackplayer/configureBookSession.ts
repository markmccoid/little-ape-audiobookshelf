import { usePlaybackStore } from "../store/store-playback";

export const configureBooksSession = async (itemId: string) => {
  const { bindEvents, loadBook, play } = usePlaybackStore.getState().actions;
  bindEvents();
  await loadBook(itemId);
};
