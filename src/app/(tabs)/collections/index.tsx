import { DonutChart } from "@/src/components/common/DonutProgress";
import { useGetItemDetails } from "@/src/hooks/ABSHooks";
import { useBooksActions, useBooksStore } from "@/src/store/store-books";
import { useAbsAPI } from "@/src/utils/AudiobookShelf/absInit";
import { calculateGlobalProgress } from "@/src/utils/fileSystemAccess";
import { useHeaderHeight } from "@react-navigation/elements";
import React from "react";
import { Pressable, Text, View } from "react-native";

const CollectionsHome = () => {
  const absAPI = useAbsAPI();
  const headerHeight = useHeaderHeight();
  const bookActions = useBooksActions();
  const dlProgress = useBooksStore((state) => state.downloadProgress);
  const downloadInfo = useBooksStore(
    (state) => state.downloadedBookData["39f28236-d0bc-4a7b-878c-0120fd95120b"]
  );
  //mark's test book multiple files
  const { data } = useGetItemDetails("39f28236-d0bc-4a7b-878c-0120fd95120b");
  // Dr. suess 1 file
  // const { data } = useGetItemDetails("6c9ebbb1-ef33-4670-bb26-28f1c9b15e88");
  // //!! Need to take into account that there could be multiple audio files.
  // console.log(data?.audioFiles.map((el) => el.ino));
  // console.log(data?.audioFiles.map((el) => getCleanFileName(el.metadata.filename)));
  // console.log(data?.id);
  // console.log("DL PROGRESS", dlProgress);
  const getDLURI = async () => {
    bookActions.downloadBook(data?.id);
    // const dlURI = await absAPI.absDownloadItem(data?.id, data?.audioFiles[0].ino);
    // downloadFileBlob(dlURI, data?.audioFiles[0].metadata.filename, (received, total) => {
    //   console.log(received, total);
    // });
  };
  const globalProgress = calculateGlobalProgress(
    dlProgress?.numberOfFilesDownloaded || 0,
    dlProgress?.numberOfFiles || 0,
    dlProgress?.received || 0,
    dlProgress?.total || 0,
    dlProgress?.downloadCompleted || false
  );
  return (
    <View style={{ paddingTop: headerHeight }}>
      <Text>Download Test</Text>
      <Pressable onPress={getDLURI}>
        <Text>Download</Text>
      </Pressable>
      <Text>{downloadInfo?.audioTracks[0].cleanFileName}</Text>
      <Pressable
        onPress={() => bookActions.cancelDownload()}
        className="mt-2 border border-red-500 bg-red-200 p-2"
      >
        <Text>Cancel</Text>
      </Pressable>
      <Text className="text-lg font-semibold">
        Processing file {dlProgress?.numberOfFilesDownloaded} of {dlProgress?.numberOfFiles}
      </Text>

      <Text className="text-xl font-semibold">{globalProgress || 0}</Text>
      <DonutChart
        formatter={(v) => {
          "worklet";

          return `${v.value.toFixed(0)}%`;
        }}
        percentage={globalProgress || 0}
        max={100}
        duration={500}
        color="purple"
        radius={40}
      />
      <Text>{dlProgress?.currentFileProcessing}</Text>
      <Text>{dlProgress?.progress}</Text>
      <Text>{dlProgress?.received}</Text>
      <Text>{dlProgress?.total}</Text>
      <Text>{dlProgress?.numberOfFiles}</Text>
      <Text>{dlProgress?.numberOfFilesDownloaded}</Text>
    </View>
  );
};

export default CollectionsHome;

// const calculateGlobalProgress = (
//   numberOfFilesDownloaded: number,
//   numberOfFiles: number,
//   received: number,
//   total: number,
//   downloadCompleted: boolean
// ) => {
//   console.log("TOTS", downloadCompleted, numberOfFiles, numberOfFilesDownloaded, received, total);
//   if ((numberOfFiles === numberOfFilesDownloaded && received === total) || downloadCompleted)
//     return 100;
//   const slotSize = Math.round(100 / numberOfFiles);
//   const fileFillAmount = Math.round(slotSize * (received / total));
//   const finishedUpToAmount = Math.round((numberOfFilesDownloaded - 1) * slotSize);

//   const totalFillAmount = Math.round(finishedUpToAmount + fileFillAmount);
//   console.log(
//     `--${numberOfFilesDownloaded} --`,
//     slotSize,
//     fileFillAmount,
//     finishedUpToAmount,
//     totalFillAmount
//   );
//   return Math.min(totalFillAmount, 100);
// };
