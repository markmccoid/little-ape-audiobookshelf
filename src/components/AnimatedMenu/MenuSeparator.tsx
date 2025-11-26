import React from "react";
import { View } from "react-native";
import type { MenuSeparatorProps } from "./types";

export const MenuSeparator: React.FC<MenuSeparatorProps> = ({ className }) => {
  return <View className={`h-[2] bg-gray-300 dark:bg-gray-600 my-1 ${className ?? ""}`} />;
};
