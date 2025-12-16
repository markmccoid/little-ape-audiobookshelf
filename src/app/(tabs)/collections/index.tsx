import { useGetItemDetails } from "@/src/hooks/ABSHooks";
import { useBooksActions, useBooksStore } from "@/src/store/store-books";
import { useAbsAPI } from "@/src/utils/AudiobookShelf/absInit";
import { useHeaderHeight } from "@react-navigation/elements";
import React from "react";
import { Pressable, Text, View } from "react-native";

const CollectionsHome = () => {
  const absAPI = useAbsAPI();
  const headerHeight = useHeaderHeight();
  const bookActions = useBooksActions();
  const dlProgress = useBooksStore((state) => state.downloadProgress);
  const downloadInfo = useBooksStore(
    (state) => state.downloadInfo["a92fc3fb-5f10-4e78-b054-75de1095a44f"]
  );
  //mark's test book multiple files
  const { data } = useGetItemDetails("a92fc3fb-5f10-4e78-b054-75de1095a44f");
  // Dr. suess 1 file
  // const { data } = useGetItemDetails("6c9ebbb1-ef33-4670-bb26-28f1c9b15e88");
  // //!! Need to take into account that there could be multiple audio files.
  // console.log(data?.audioFiles.map((el) => el.ino));
  // console.log(data?.audioFiles.map((el) => getCleanFileName(el.metadata.filename)));
  // console.log(data?.id);

  const getDLURI = async () => {
    bookActions.downloadBook(data?.id);
    // const dlURI = await absAPI.absDownloadItem(data?.id, data?.audioFiles[0].ino);
    // downloadFileBlob(dlURI, data?.audioFiles[0].metadata.filename, (received, total) => {
    //   console.log(received, total);
    // });
  };
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
