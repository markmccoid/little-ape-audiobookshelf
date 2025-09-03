import React from 'react';
import { Switch, View } from 'react-native';
import { SettingItem } from './SettingItem';

type ToggleSettingProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export const ToggleSetting = ({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: ToggleSettingProps) => {
  return (
    <SettingItem label={label} description={description} disabled={disabled}>
      <View className="scale-75 origin-right">
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: '#e5e7eb', true: '#34c759' }}
          thumbColor="white"
          ios_backgroundColor="#e5e7eb"
        />
      </View>
    </SettingItem>
  );
};
