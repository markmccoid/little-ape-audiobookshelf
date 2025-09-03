import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { ButtonSetting } from "../../components/settings/ButtonSetting";
import { SelectSetting } from "../../components/settings/SelectSetting";
import { SettingItem } from "../../components/settings/SettingItem";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { TextInputSetting } from "../../components/settings/TextInputSetting";
import { ToggleSetting } from "../../components/settings/ToggleSetting";

type Theme = "light" | "dark" | "system";
type PlaybackSpeed = "0.75" | "1.0" | "1.25" | "1.5" | "2.0";

const SettingsIndex = () => {
  const router = useRouter();
  // App Settings
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<Theme>("light");

  // Playback Settings
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>("1.0");
  const [autoPlay, setAutoPlay] = useState(true);
  const [streamOverWifi, setStreamOverWifi] = useState(true);

  // Account Settings
  const [username, setUsername] = useState("user123");
  const [email, setEmail] = useState("user@example.com");

  const themeOptions = [
    { label: "Light", value: "light" },
    { label: "Dark", value: "dark" },
    { label: "System", value: "system" },
  ];

  const speedOptions = [
    { label: "0.75x", value: "0.75" },
    { label: "1.0x", value: "1.0" },
    { label: "1.25x", value: "1.25" },
    { label: "1.5x", value: "1.5" },
    { label: "2.0x", value: "2.0" },
  ];

  const handleLogout = () => {
    // Handle logout logic
    console.log("User logged out");
  };

  const handleClearCache = () => {
    // Handle clear cache logic
    console.log("Cache cleared");
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header */}
        <View className="py-4 px-5 bg-white mb-1">
          <Text className="text-2xl font-bold text-gray-900">Settings</Text>
        </View>

        {/* User Profile */}
        <SettingsGroup title="AudiobookShelf User">
          <SettingItem
            label={username}
            description="Apple ID, iCloud, Media & Purchases"
            onPress={() => {
              router.push("/settings/abs_auth");
            }}
          >
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </SettingItem>
        </SettingsGroup>

        {/* Account Settings */}
        <SettingsGroup title="ACCOUNT SETTINGS">
          <TextInputSetting
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Your username"
          />
          <TextInputSetting
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
          />
          <ButtonSetting
            label="Change Password"
            buttonText="Change"
            buttonVariant="default"
            onPress={() => console.log("Change password pressed")}
          />
        </SettingsGroup>

        {/* Appearance */}
        <SettingsGroup title="APPEARANCE">
          <ToggleSetting label="Dark Mode" value={darkMode} onValueChange={setDarkMode} />
          <SelectSetting
            label="Theme"
            value={theme}
            options={themeOptions}
            onValueChange={(value: string) => setTheme(value as Theme)}
          />
        </SettingsGroup>

        {/* Playback */}
        <SettingsGroup title="PLAYBACK">
          <SelectSetting
            label="Playback Speed"
            value={playbackSpeed}
            options={speedOptions}
            onValueChange={(value: string) => setPlaybackSpeed(value as PlaybackSpeed)}
          />
          <ToggleSetting
            label="Auto-play Next"
            description="Automatically play the next item in the queue"
            value={autoPlay}
            onValueChange={setAutoPlay}
          />
          <ToggleSetting
            label="Stream over Wi-Fi Only"
            value={streamOverWifi}
            onValueChange={setStreamOverWifi}
          />
        </SettingsGroup>

        {/* Storage */}
        <SettingsGroup title="STORAGE">
          <ButtonSetting
            label="Clear Cache"
            description="Free up storage space"
            buttonText="Clear"
            onPress={handleClearCache}
          />
        </SettingsGroup>

        {/* Support */}
        <SettingsGroup title="SUPPORT">
          <ButtonSetting
            label="Help & Support"
            buttonText="Contact"
            buttonVariant="default"
            onPress={() => console.log("Contact support")}
          />
          <ButtonSetting
            label="About"
            buttonText="Version 1.0.0"
            buttonVariant="default"
            onPress={() => console.log("Show about")}
          />
        </SettingsGroup>

        {/* Sign Out */}
        <SettingsGroup>
          <ButtonSetting
            label="Sign Out"
            buttonText="Sign Out"
            buttonVariant="danger"
            onPress={handleLogout}
          />
        </SettingsGroup>
      </ScrollView>
    </View>
  );
};

export default SettingsIndex;
