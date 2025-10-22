import { BlurView } from "expo-blur";
import React, { ReactNode } from "react";

type Props = {
  children: ReactNode;
  flexDirection?: "flex-row" | "flex-col";
};
const BookBlurView = ({ children, flexDirection = "flex-row" }: Props) => {
  return (
    <BlurView
      intensity={100}
      // tint="systemMaterial"
      tint="extraLight"
      className={`${flexDirection} rounded-xl overflow-hidden justify-start items-center border-hairline border-accent`}
    >
      {children}
    </BlurView>
  );
};

export default BookBlurView;
