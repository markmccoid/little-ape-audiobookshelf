import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { SettingItem } from './SettingItem';
import { cn } from '../../lib/utils';

type ButtonSettingProps = {
  label: string;
  description?: string;
  onPress: () => void;
  buttonText: string;
  buttonVariant?: 'default' | 'danger' | 'primary';
  disabled?: boolean;
};

export const ButtonSetting = ({
  label,
  description,
  onPress,
  buttonText,
  buttonVariant = 'default',
  disabled = false,
}: ButtonSettingProps) => {
  const getButtonClasses = () => {
    const baseClasses = 'py-1.5 px-4 rounded-full items-center justify-center';
    
    switch (buttonVariant) {
      case 'danger':
        return cn(baseClasses, 'bg-red-50 border border-red-100');
      case 'primary':
        return cn(baseClasses, 'bg-blue-500');
      default:
        return cn(baseClasses, 'bg-gray-100 border border-gray-200');
    }
  };

  const getButtonTextClasses = () => {
    switch (buttonVariant) {
      case 'danger':
        return 'text-red-600 font-medium';
      case 'primary':
        return 'text-white font-semibold';
      default:
        return 'text-gray-800 font-medium';
    }
  };

  return (
    <SettingItem label={label} description={description} disabled={disabled}>
      <TouchableOpacity
        className={cn(getButtonClasses(), disabled && 'opacity-50')}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}>
        <Text className={getButtonTextClasses()}>{buttonText}</Text>
      </TouchableOpacity>
    </SettingItem>
  );
};

