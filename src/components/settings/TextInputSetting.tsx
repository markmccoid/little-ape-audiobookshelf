import React, { useState } from 'react';
import { TextInput, Keyboard } from 'react-native';
import { SettingItem } from './SettingItem';
import { cn } from '../../lib/utils';

type TextInputSettingProps = {
  label: string;
  description?: string;
  value: string;
  placeholder?: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad';
  disabled?: boolean;
};

export const TextInputSetting = ({
  label,
  description,
  value,
  placeholder = '',
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  disabled = false,
}: TextInputSettingProps) => {
  return (
    <SettingItem label={label} description={description} disabled={disabled}>
      <TextInput
        className={cn(
          'text-right text-base text-gray-900 py-1 px-2 rounded',
          !disabled && 'bg-gray-50',
          disabled && 'opacity-50'
        )}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        editable={!disabled}
        onBlur={() => Keyboard.dismiss()}
        textAlign="right"
        selectionColor="#3b82f6"
      />
    </SettingItem>
  );
};

