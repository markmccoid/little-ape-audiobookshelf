import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { cn } from '../../lib/utils';

type SettingsGroupProps = {
  title?: string;
  description?: string;
  children: ReactNode;
};

export const SettingsGroup = ({
  title,
  description,
  children,
}: SettingsGroupProps) => {
  return (
    <View className="mb-6 bg-white rounded-xl overflow-hidden shadow-sm">
      {(title || description) && (
        <View className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          {title && (
            <Text className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {title}
            </Text>
          )}
          {description && (
            <Text className="text-xs text-gray-500 mt-1">
              {description}
            </Text>
          )}
        </View>
      )}
      <View className="divide-y divide-gray-100">
        {children}
      </View>
    </View>
  );
};

