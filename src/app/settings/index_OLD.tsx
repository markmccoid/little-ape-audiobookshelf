import { getAbsAuth } from "@/src/ABS/absInit";
import { SettingItem } from "@/src/components/settings/SettingItem";
import { SettingsGroup } from "@/src/components/settings/SettingsGroup";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView } from "react-native";

const Books = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const absAuth = getAbsAuth();

  const router = useRouter();
  return (
    <ScrollView className="flex-1 bg-slate-200" contentInsetAdjustmentBehavior="automatic">
      {/* User Profile */}
      <SettingsGroup title="AudiobookShelf User">
        <SettingItem
          label={`Logged in as "${absAuth.username}"`}
          description={`-> ${absAuth.absURL}`}
          onPress={() => {
            router.push("/settings/abs_auth");
          }}
        >
          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        </SettingItem>
      </SettingsGroup>
    </ScrollView>
  );
};

export default Books;
