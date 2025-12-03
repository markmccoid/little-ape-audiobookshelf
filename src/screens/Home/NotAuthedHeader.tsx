import { useAuth } from "@/src/contexts/AuthContext";
import { useHeaderHeight } from "@react-navigation/elements";
import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const NotAuthedHeader = () => {
  const { isAuthenticated } = useAuth();
  const headerHeight = useHeaderHeight();

  if (isAuthenticated) return null;

  return (
    <View
      className="bg-red-600 p-1 flex-row justify-center items-center "
      style={{ marginTop: headerHeight }}
    >
      <Link href="/settings">
        <Text className="color-white text-lg font-semibold">Not Authenticated. Please login</Text>
      </Link>
    </View>
  );
};

export default NotAuthedHeader;
