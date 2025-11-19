import { useBooksActions, useBooksStore } from "@/src/store/store-books";
import { useIsBookActive, usePlaybackActions } from "@/src/store/store-playback";
import React from "react";
import { ScrollView, View } from "react-native";
import showConfirmationPrompt from "../../common/showConfirmationPrompt";
import BookmarkItem from "./BookmarkItem";

//! Make these components accept a libraryItemId this way it can be used
//! in both an active book and inactive book since the useLocalSearchParams will grab the correct
//! libraryItemId based on the context
type Props = {
  libraryItemId: string;
};
const BookmarkList = ({ libraryItemId }: Props) => {
  const bookActions = useBooksActions();
  const playbackActions = usePlaybackActions();
  const isBookActive = useIsBookActive(libraryItemId);

  const bookmarks = useBooksStore((state) => state.bookInfo[libraryItemId]?.bookmarks);

  // const bookInfo = useBooksStore((state) => state.bookInfo);
  // const [bookmarkName, setBookmarkName] = useState("");
  // console.log("bookmark LIB ID", libraryItemId);
  // console.log("BOOKMARKS", bookInfo[libraryItemId]);

  const handleGoToBookmark = async (time: number) => {
    //!! NEED TO INCLUDE
    //!! check to see if book is active.  If not then before seeking, ACTIVATE/PLAY BOOK
    if (!isBookActive) {
      await playbackActions.loadBookAndPlay(libraryItemId);
    }
    await playbackActions.seekTo(time);
  };

  const handleDeleteBookmark = async (time: number, title: string) => {
    const shouldDelete = await showConfirmationPrompt(
      "Delete Bookmark?",
      `Are you sure you want to delete the ${title} bookmark`
    );
    if (shouldDelete) {
      await bookActions.deleteBookmark(libraryItemId, time);
    }
  };

  if (!bookmarks) return null;

  return (
    <View className="flex-1 ">
      <ScrollView className="flex-1" contentContainerClassName="border-t-hairline">
        {bookmarks.map((bm) => {
          return (
            <BookmarkItem
              key={bm.time}
              bookmark={bm}
              isBookActive={isBookActive}
              handleDeleteBookmark={() => handleDeleteBookmark(bm.time, bm.title)}
              handleGoToBookmark={() => handleGoToBookmark(bm.time)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

export default BookmarkList;
