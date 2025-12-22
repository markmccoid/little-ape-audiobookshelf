import { DonutChart } from "@/src/components/common/DonutProgress";
import { useBooksActions, useBooksStore } from "@/src/store/store-books";
import { calculateGlobalProgress } from "@/src/utils/fileSystemAccess";
import { THEME, useThemeColors } from "@/src/utils/theme";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { PressableScale } from "pressto";
import React, { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

const DownloadSheet = ({ libraryItemId }: { libraryItemId: string }) => {
  const themeColors = useThemeColors();
  const trueSheetRef = useRef<TrueSheet>(null);
  const bookActions = useBooksActions();
  const dlProgress = useBooksStore((state) => state.downloadProgress);
  const downloadInfo = useBooksStore((state) => state.downloadedBookData[libraryItemId]);
  const book = useBooksStore((state) =>
    state.books.find((book) => book.libraryItemId === libraryItemId)
  );

  const globalProgress = book?.isDownloaded
    ? 100
    : calculateGlobalProgress(
        dlProgress?.numberOfFilesDownloaded || 0,
        dlProgress?.numberOfFiles || 0,
        dlProgress?.received || 0,
        dlProgress?.total || 0,
        dlProgress?.downloadCompleted || false
      );
  const receivedMB = (dlProgress?.received || 0) / 1000000;
  const totalMB = (dlProgress?.total || 0) / 1000000;
  const status = getDownloadStatus(book, dlProgress);

  // Header Text Logic
  const renderHeaderText = () => {
    switch (status) {
      case "ready":
        return (
          <>
            <Text className="text-lg font-semibold text-foreground">Ready to Download</Text>
            <Text className="text-lg font-semibold text-foreground">
              {`${book?.numberOfAudioFiles} file${book?.numberOfAudioFiles === 1 ? "" : "s"} - `}
              {book?.totalFileSizeMB} MB
            </Text>
          </>
        );
      case "downloading":
      case "processing":
        return (
          <>
            <Text className="text-lg font-semibold text-foreground">
              Processing file {dlProgress?.numberOfFilesDownloaded} of {dlProgress?.numberOfFiles}
            </Text>
            <Text className="text-lg font-semibold text-foreground">
              {receivedMB.toFixed(2)} MB of {totalMB.toFixed(2)} MB
            </Text>
          </>
        );
      case "completed":
        return (
          <Text className="text-lg font-semibold text-foreground">
            Downloaded {book?.totalFileSizeMB} MB
          </Text>
        );
    }
  };
  // Centralized Button Logic
  const renderActions = () => {
    switch (status) {
      case "ready":
        return (
          <PressableScale
            onPress={() => bookActions.downloadBook(libraryItemId)}
            style={styles.accentBtn}
          >
            <Text style={styles.btnText}>Download</Text>
          </PressableScale>
        );
      case "downloading":
      case "processing":
        return (
          <PressableScale onPress={() => bookActions.cancelDownload()} style={styles.dangerBtn}>
            <Text style={styles.btnText}>Cancel</Text>
          </PressableScale>
        );
      case "completed":
        return (
          <PressableScale onPress={() => trueSheetRef.current?.dismiss()} style={styles.accentBtn}>
            <Text style={styles.btnText}>Done</Text>
          </PressableScale>
        );
    }
  };

  return (
    <TrueSheet
      ref={trueSheetRef}
      detents={[0.5, 1]}
      cornerRadius={24}
      name="download-sheet"
      header={
        <View className="p-4 border-b border-gray-400 flex-row justify-center items-center">
          <Text className="text-xl font-semibold text-foreground" numberOfLines={1}>
            Download {book?.title}
          </Text>
        </View>
      }
    >
      <View className="flex-col items-center p-4">
        {/* Header Text Logic */}
        {renderHeaderText()}

        <View className="flex-row items-center w-full justify-around">{renderActions()}</View>
        {status !== "ready" && (
          <DonutChart
            formatter={(v) => {
              "worklet";

              return `${v.value.toFixed(0)}%`;
            }}
            percentage={globalProgress || 0}
            max={100}
            duration={500}
            color={themeColors.accent}
            radius={100}
          />
        )}
        {/* <View className="flex-row items-center w-full justify-around">
          {!dlProgress?.downloadCompleted && !book?.isDownloaded && (
            <PressableScale
              onPress={() => bookActions.downloadBook(libraryItemId)}
              style={{
                padding: 12,
                backgroundColor: themeColors.accent,
                borderRadius: 12,
                marginVertical: 10,
              }}
            >
              <Text className="text-accent-foreground font-semibold text-lg">Download</Text>
            </PressableScale>
          )}
          {dlProgress?.currentFileProcessing &&
            !dlProgress?.downloadCompleted &&
            !book?.isDownloaded && (
              <PressableScale
                onPress={() => bookActions.cancelDownload()}
                style={{ padding: 12, backgroundColor: themeColors.destructive, borderRadius: 12 }}
              >
                <Text className="text-white font-semibold text-lg">Cancel</Text>
              </PressableScale>
            )}
          {book?.isDownloaded && (
            <PressableScale
              onPress={() => TrueSheet.dismiss("download-sheet")}
              style={{ padding: 12, backgroundColor: themeColors.accent, borderRadius: 12 }}
            >
              <Text className="text-accent-foreground font-semibold text-lg">Done</Text>
            </PressableScale>
          )}
        </View> */}
      </View>
    </TrueSheet>
  );
};

export default DownloadSheet;

const styles = StyleSheet.create({
  accentBtn: {
    padding: 12,
    backgroundColor: THEME.light.accent,
    borderRadius: 12,
    marginVertical: 10,
  },
  dangerBtn: {
    padding: 12,
    backgroundColor: THEME.light.destructive,
    borderRadius: 12,
  },
  btnText: {
    color: THEME.light.background,
    fontSize: 16,
    fontWeight: "bold",
  },
});
type DownloadStatus = "ready" | "downloading" | "processing" | "completed";

const getDownloadStatus = (book: any, dlProgress: any): DownloadStatus => {
  if (book?.isDownloaded) return "completed";

  if (dlProgress?.currentFileProcessing) {
    // If the file is done but book isn't marked "isDownloaded" yet, it's processing
    return dlProgress.downloadCompleted ? "processing" : "downloading";
  }

  return "ready";
};
