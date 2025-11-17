import { useBooksActions, useBooksStore } from "@/src/store/store-books";
import React, { useState } from "react";
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

  const bookmarks = useBooksStore((state) => state.bookInfo[libraryItemId]?.bookmarks);
  const bookInfo = useBooksStore((state) => state.bookInfo);
  const [bookmarkName, setBookmarkName] = useState("");
  console.log("bookmark LIB ID", libraryItemId);
  console.log("BOOKMARKS", bookInfo[libraryItemId]);
  // console.log("--BOOKMARK--", position, libraryItemId);
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
              handleDeleteBookmark={() => handleDeleteBookmark(bm.time, bm.title)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

export default BookmarkList;
