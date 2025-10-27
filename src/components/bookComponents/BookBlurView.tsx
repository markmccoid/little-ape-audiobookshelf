import { BlurView } from "expo-blur";
import React, { ReactNode } from "react";
import { ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  flexDirection?: "flex-row" | "flex-col";
  style?: ViewStyle;
};
const BookBlurView = ({ children, flexDirection = "flex-row", style }: Props) => {
  return (
    <BlurView
      intensity={100}
      // tint="systemMaterial"
      // tint="extraLight"
      tint="prominent"
      className={`${flexDirection} rounded-xl overflow-hidden justify-start items-center border-hairline border-accent`}
      style={{ ...style }}
    >
      {children}
    </BlurView>
  );
};

export default BookBlurView;
