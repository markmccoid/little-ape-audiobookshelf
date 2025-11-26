import { useThemeColors } from "@/src/utils/theme";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useMenu } from "./MenuContext";
import type { MenuItemProps } from "./types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STAGGER_DELAY = 75;

export const MenuItem: React.FC<MenuItemProps> = ({ item, index, totalItems, onPress }) => {
  const { close } = useMenu();
  const { label, icon, iconColor, textColor, disabled = false } = item;
  const themeColors = useThemeColors();

  const handlePress = () => {
    if (disabled) return;
    item.onPress?.();
    onPress?.();
    close();
  };

  const enteringAnimation = SlideInUp.delay(index * STAGGER_DELAY).duration(200);
  // .springify()
  // .damping(20)
  // .stiffness(300);
  // const enteringAnimation = FadeIn.delay(index * STAGGER_DELAY)
  //   .duration(200)
  //   .springify()
  //   .damping(20)
  //   .stiffness(300);

  // const exitingAnimation = FadeOut.delay((totalItems - index - 1) * 50).duration(250);
  const exitingAnimation = SlideOutUp;

  // Default colors when not provided
  const defaultTextColor = disabled ? "#9CA3AF" : themeColors.foreground; // gray-400 : gray-900
  const defaultIconColor = disabled ? "#9CA3AF" : themeColors.foreground; // gray-400 : gray-700

  // Use custom colors if provided, otherwise use defaults
  const finalTextColor = textColor || defaultTextColor;
  const finalIconColor = iconColor || defaultIconColor;

  return (
    <AnimatedPressable
      entering={enteringAnimation}
      exiting={exitingAnimation}
      onPress={handlePress}
      disabled={disabled}
      className={`
        flex-row items-center px-4 py-3 
        ${disabled ? "opacity-50" : "active:bg-gray-100 dark:active:bg-gray-700"}
      `}
    >
      {icon && (
        <View className="mr-3">
          <SymbolView
            name={icon}
            size={20}
            tintColor={finalIconColor}
            resizeMode="scaleAspectFit"
          />
        </View>
      )}
      <Text style={{ color: finalTextColor }} className="text-base font-medium">
        {label}
      </Text>
    </AnimatedPressable>
  );
};
