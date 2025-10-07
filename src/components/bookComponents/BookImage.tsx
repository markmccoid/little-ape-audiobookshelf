import { Image } from "expo-image";
import React, { useMemo } from "react";
import { Dimensions, View } from "react-native";

type Props = {
  coverURL: string;
};

const BookImage = ({ coverURL }: Props) => {
  // Calculate image dimensions based on screen width with 20px margin on each side
  const imageDimensions = useMemo(() => {
    const screenWidth = Dimensions.get("window").width;
    const margin = 30 * 2; // 20px on each side
    const imageSize = screenWidth - margin;
    return {
      width: imageSize,
      height: imageSize,
      borderRadius: 12,
    };
  }, []);

  return (
    <View className="items-center mt-2 mb-6">
      <Image
        source={{ uri: coverURL }}
        style={imageDimensions}
        contentFit="cover"
        transition={300}
      />
    </View>
  );
};

export default BookImage;
