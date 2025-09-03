// components/LoginForm.tsx
import { getAbsAuth } from "@/src/ABS/absInit";
import { Eye, EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import { Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
interface LoginFormProps {
  onSubmit: (url: string, username: string, password: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const [url, setUrl] = useState(getAbsAuth().absURL);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);

  return (
    <View className="flex-1 pt-4 w-full px-5">
      <Text className="text-base font-semibold ml-1">AudiobookShelf Server URL</Text>
      <TextInput
        className="border px-3 py-2 bg-white border-gray-300 rounded-lg mb-2"
        placeholder="https://your-server.com"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text className="text-base font-semibold ml-1">Username</Text>
      <TextInput
        className="border px-3 py-2 bg-white border-gray-300 rounded-lg mb-2"
        placeholder="Enter username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text className="text-base font-semibold ml-1">Password</Text>
      <View className="flex-row items-center mb-3">
        <TextInput
          onChangeText={setPassword}
          placeholder="Password"
          spellCheck={false}
          value={password}
          autoCapitalize="none"
          autoCorrect={false}
          // editable={!isLoading}
          secureTextEntry={hidePassword}
          className="border px-3 py-2 bg-white border-gray-300 rounded-lg flex-1"
        />
        <TouchableOpacity
          onPress={() => setHidePassword(() => !hidePassword)}
          className="absolute right-1"
        >
          {!hidePassword ? <Eye size={20} /> : <EyeOff size={20} />}
        </TouchableOpacity>
      </View>

      <Button title="Login" onPress={() => onSubmit(url.trim(), username.trim(), password)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
  },
  label: {
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
});
