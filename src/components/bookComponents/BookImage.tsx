import { getImageDimensions } from "@/src/utils/formatUtils";
import { Image } from "expo-image";
import React from "react";
import { View } from "react-native";
const fallbackImage = require("../../../assets/images/NoImageFound.png");

type Props = {
  coverURL: string | undefined;
};

const BookImage = ({ coverURL }: Props) => {
  const imageDimensions = getImageDimensions();
  // // Calculate image dimensions based on screen width with 20px margin on each side
  // const imageDimensions = useMemo(() => {
  //   const screenWidth = Dimensions.get("window").width;
  //   const margin = 30 * 2; // 20px on each side
  //   const imageSize = screenWidth - margin;
  //   return {
  //     width: imageSize,
  //     height: imageSize,
  //     borderRadius: 12,
  //   };
  // }, []);

  return (
    <View className="items-center mt-2 mb-6">
      <Image
        source={{ uri: coverURL }}
        style={imageDimensions}
        placeholder={fallbackImage}
        contentFit="cover"
        transition={300}
      />
    </View>
  );
};

export default BookImage;
