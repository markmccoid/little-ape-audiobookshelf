import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { SettingItem } from './SettingItem';
import { Ionicons } from '@expo/vector-icons';

type SelectOption = {
  label: string;
  value: string;
};

type SelectSettingProps = {
  label: string;
  description?: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
};

export const SelectSetting = ({
  label,
  description,
  value,
  options,
  onValueChange,
  disabled = false,
}: SelectSettingProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <>
      <SettingItem
        label={label}
        description={description}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}>
        <View className="flex-row items-center">
          <Text className="text-base text-gray-500 mr-2">
            {selectedOption?.label}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        </View>
      </SettingItem>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl overflow-hidden max-h-3/4">
            <View className="py-4 border-b border-gray-200 items-center">
              <Text className="text-lg font-semibold text-gray-900">
                {label}
              </Text>
            </View>
            <View className="max-h-[70%] overflow-y-auto">
              {options.map(option => (
                <TouchableOpacity
                  key={option.value}
                  className={`py-4 px-6 border-b border-gray-100 flex-row justify-between items-center ${
                    value === option.value ? 'bg-blue-50' : 'bg-white'
                  }`}
                  onPress={() => {
                    onValueChange(option.value);
                    setModalVisible(false);
                  }}>
                  <Text
                    className={`text-base ${
                      value === option.value ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <Ionicons name="checkmark" size={20} color="#2563eb" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              className="py-4 bg-white border-t border-gray-200 items-center"
              onPress={() => setModalVisible(false)}>
              <Text className="text-base font-semibold text-blue-600">
                Cancel
              </Text>
            </TouchableOpacity>
            <View className="h-1 bg-gray-100" />
          </View>
        </View>
      </Modal>
    </>
  );
};

