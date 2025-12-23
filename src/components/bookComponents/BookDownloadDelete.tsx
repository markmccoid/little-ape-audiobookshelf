import { useBooksActions, useBooksStore } from "@/src/store/store-books";
import { useThemeColors } from "@/src/utils/theme";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { SymbolView } from "expo-symbols";
import { PressableScale } from "pressto";
import React from "react";
import { ActivityIndicator, Text } from "react-native";
import showConfirmationPrompt from "../common/showConfirmationPrompt";

type Props = {
  libraryItemId: string;
};
const BookDownloadDelete: React.FC<Props> = ({ libraryItemId }) => {
  const themeColors = useThemeColors();
  const bookActions = useBooksActions();
  // const book = useBooksStore((state) =>
  //   state.books.find((book) => book.libraryItemId === libraryItemId)
  // );
  // const isDownloaded = book?.isDownloaded;
  const progress = useBooksStore((state) => state.downloadProgress);
  const downloadStatus = useBooksStore((state) => state.actions.getDownloadStatus(libraryItemId));

  const deleteDownload = async () => {
    const shouldDelete = await showConfirmationPrompt(
      "Delete Book from Device?",
      "This will delete the book from your device."
    );

    if (shouldDelete) {
      bookActions.deleteDownloadedBookData(libraryItemId);
    }
  };
  if (downloadStatus === "downloading") {
    return (
      <PressableScale
        style={{
          position: "absolute",
          left: 0,
          top: -5,
          padding: 4,
          alignItems: "center",
        }}
        onPress={() => TrueSheet.present("download-sheet")}
      >
        <ActivityIndicator size="large" />
        <Text className="text-foreground">Downloading</Text>
      </PressableScale>
    );
  }
  return (
    <>
      {downloadStatus === "completed" ? (
        <PressableScale
          style={{
            position: "absolute",
            left: 0,
            top: -5,
            padding: 4,
            alignItems: "center",
          }}
          onPress={deleteDownload}
        >
          <SymbolView name="trash.fill" tintColor={themeColors.destructive} size={30} />
          <Text className="text-foreground">Delete</Text>
          <Text className="text-foreground">Download</Text>
        </PressableScale>
      ) : (
        <PressableScale
          style={{
            position: "absolute",
            left: 0,
            top: -5,
            padding: 4,
            alignItems: "center",
          }}
          onPress={() => TrueSheet.present("download-sheet")}
        >
          <SymbolView name="square.and.arrow.down.fill" tintColor={themeColors.accent} size={40} />
          <Text className="text-foreground">Download</Text>
        </PressableScale>
      )}
    </>
  );
};

export default BookDownloadDelete;
