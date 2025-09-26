import { Stack, useRouter } from "expo-router";
import React from "react";
import { Pressable, Text } from "react-native";

const LibraryLayout = () => {
  const router = useRouter();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Home",
          headerTransparent: true,
          headerBlurEffect: "light",
          headerShadowVisible: true,
          headerLeft: () => {
            return (
              <Pressable onPress={() => router.push("/settings")}>
                <Text className="dark:text-white">Settings</Text>
              </Pressable>
            );
          },
        }}
      />
    </Stack>
  );
};

export default LibraryLayout;
