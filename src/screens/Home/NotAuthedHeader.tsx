import { useAuth } from "@/src/contexts/AuthContext";
import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const NotAuthedHeader = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return null;

  return (
    <View className="bg-red-600 p-2 rounded-xl flex-row justify-center items-center mt-[200]">
      <Link href="/settings">
        <Text className="color-white text-lg font-semibold">Not Authenticated. Please login</Text>
      </Link>
    </View>
  );
};

export default NotAuthedHeader;
