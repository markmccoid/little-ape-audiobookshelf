import { useGetItemDetails } from "@/src/hooks/ABSHooks";
import { useAbsAPI } from "@/src/utils/AudiobookShelf/absInit";
import { downloadFileBlob, getCleanFileName } from "@/src/utils/fileSystemAccess";
import { useHeaderHeight } from "@react-navigation/elements";
import React from "react";
import { Pressable, Text, View } from "react-native";

const CollectionsHome = () => {
  const absAPI = useAbsAPI();
  const headerHeight = useHeaderHeight();
  const { data } = useGetItemDetails("c375be0c-e54f-47cd-9c5f-f5401f7b0947");
  //!! Need to take into account that there could be multiple audio files.
  console.log(data?.audioFiles.map((el) => el.ino));
  console.log(data?.audioFiles.map((el) => getCleanFileName(el.metadata.filename)));
  console.log(data?.id);
  const getDLURI = async () => {
    const dlURI = await absAPI.absDownloadItem(data?.id, data?.audioFiles[0].ino);
    downloadFileBlob(dlURI, data?.audioFiles[0].metadata.filename, (received, total) => {
      console.log(received, total);
    });
  };
  return (
    <View style={{ paddingTop: headerHeight }}>
      <Text>Download Test</Text>
      <Pressable onPress={getDLURI}>
        <Text>Download</Text>
      </Pressable>
    </View>
  );
};

export default CollectionsHome;
