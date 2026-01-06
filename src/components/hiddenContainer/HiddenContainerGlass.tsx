import React, { useCallback, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useThemeColors } from "@/src/utils/theme";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import { useColorScheme } from "nativewind";

interface HiddenContainerProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  title?: string;
  titleInfo?: string;
  leftIconFunction?: () => void;
  startOpen?: boolean;
}

/**
 * Glass-styled collapsible container for iOS 26 glass aesthetic.
 * Features a frosted pill header with smooth height animation
 * and an inset card appearance for children content.
 */
const HiddenContainerGlass: React.FC<HiddenContainerProps> = ({
  children,
  style,
  title,
  titleInfo,
  leftIconFunction,
  startOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(startOpen);
  const [contentHeight, setContentHeight] = useState(0);
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const isLightMode = colorScheme === "light";

  // Animated height value
  const animatedHeight = useSharedValue(startOpen ? 1 : 0);

  // Measure children content height
  const onContentLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setContentHeight(height);
    }
  }, []);

  // Toggle open/close with animation
  const toggleOpen = useCallback(() => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    animatedHeight.value = withTiming(newIsOpen ? 1 : 0, {
      duration: 600,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [isOpen, animatedHeight]);

  // Animated style for content container
  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      height: animatedHeight.value * contentHeight,
      opacity: animatedHeight.value,
      overflow: "hidden" as const,
    };
  });

  return (
    <View className="my-1.5 mx-3">
      {/* Frosted Pill Header */}
      <BlurView
        intensity={80}
        tint="prominent"
        className={`rounded-2xl overflow-hidden ${
          isLightMode ? "border-hairline border-black/15 bg-black/[0.04]" : ""
        }`}
      >
        <View className="flex-row items-center px-3 py-3">
          {/* Left Icon (Eraser for clearing filters) */}
          {leftIconFunction && (
            <Pressable
              onPress={leftIconFunction}
              className="mr-2"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <SymbolView
                name="eraser.fill"
                size={20}
                tintColor={titleInfo ? colors.destructive : colors.foreground}
              />
            </Pressable>
          )}

          {/* Main Pressable Area */}
          <Pressable className="flex-1 flex-row items-center justify-between" onPress={toggleOpen}>
            <View className="flex-1 flex-row items-center gap-2">
              <Text className="text-[17px] font-semibold text-foreground" numberOfLines={1}>
                {title}
              </Text>
              {titleInfo && (
                <Text
                  className="text-sm opacity-70 flex-1"
                  style={{ color: colors.foreground }}
                  numberOfLines={1}
                >
                  {titleInfo}
                </Text>
              )}
            </View>

            {/* Expand/Collapse Arrow */}
            <SymbolView
              name={isOpen ? "chevron.up" : "chevron.down"}
              size={18}
              tintColor={colors.accent}
            />
          </Pressable>
        </View>
      </BlurView>

      {/* Hidden Measurement View */}
      <View style={styles.measureContainer} onLayout={onContentLayout} pointerEvents="none">
        <View className="mt-2 px-3 py-3 rounded-xl bg-black/[0.12]" style={style}>
          {children}
        </View>
      </View>

      {/* Animated Children Container */}
      <Animated.View style={animatedContentStyle}>
        <View className="mt-2 px-3 py-3 rounded-xl bg-black/[0.12]" style={style}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

// Only keeping styles that can't be easily expressed with className
const styles = StyleSheet.create({
  measureContainer: {
    position: "absolute",
    opacity: 0,
    zIndex: -1,
  },
});

export default HiddenContainerGlass;
