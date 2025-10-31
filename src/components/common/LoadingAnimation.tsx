/*
    Inspiration: https://dribbble.com/shots/3317668-Preloader-V010100
*/
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { View as MView } from "moti";
import * as React from "react";
import { Dimensions, View } from "react-native";
import { useColorScheme } from "nativewind";
const { width, height } = Dimensions.get("screen");

const _size = 80;
const _border = Math.round(_size / 10);

type Props = {
  backgroundColor?: string;
  ringColor?: string;
};

export default function LoadingAnimation({ backgroundColor, ringColor }: Props) {
  const { colorScheme } = useColorScheme();
  const defaultBG =
    colorScheme === "dark" ? DarkTheme.colors.background : DefaultTheme.colors.background;
  const defaultRing = colorScheme === "dark" ? DarkTheme.colors.text : DefaultTheme.colors.text;
  console.log("COLOR", colorScheme, defaultBG, defaultRing);
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: backgroundColor || defaultBG,
      }}
    >
      <MView
        from={{
          borderWidth: 0,
          width: _size,
          height: _size,
          opacity: 0,
          shadowOpacity: 0.5,
        }}
        animate={{
          borderWidth: _border,
          width: _size + 12,
          height: _size + 12,
          opacity: 1,
          shadowOpacity: 1,
        }}
        transition={{
          type: "timing",
          duration: 1000,
          loop: true,
        }}
        style={{
          width: _size,
          height: _size,
          borderRadius: _size,
          borderWidth: _border,
          borderColor: ringColor || defaultRing,
          shadowColor: ringColor || defaultRing,
          shadowRadius: 10,
          shadowOpacity: 1,
          shadowOffset: {
            width: 0,
            height: 0,
          },
        }}
      />
    </View>
  );
}
