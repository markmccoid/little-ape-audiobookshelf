import React, { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { cn } from "../../lib/utils";

type SettingItemProps = {
  label: string;
  description?: string;
  children?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
};

export const SettingItem = ({
  label,
  description,
  children,
  onPress,
  disabled = false,
}: SettingItemProps) => {
  const content = (
    <View
      className={cn(
        "flex-row justify-between items-center py-2 px-4 border-b border-gray-200",
        disabled && "opacity-50"
      )}
    >
      <View className="flex-1 mr-3">
        <Text className="text-base text-gray-900 font-medium">{label}</Text>
        {description && (
          <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>
      {children && <View className="items-end">{children}</View>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        className="active:bg-gray-50"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};
