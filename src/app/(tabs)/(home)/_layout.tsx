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
          headerLeft: () => {
            return (
              <Pressable onPress={() => router.push("/settings")}>
                <Text>Settings</Text>
              </Pressable>
            );
          },
        }}
      />
    </Stack>
  );
};

export default LibraryLayout;
