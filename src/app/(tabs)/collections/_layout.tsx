import { Stack } from "expo-router";
import React from "react";

const CollectionLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerBlurEffect: "light",
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Collections" }} />
    </Stack>
  );
};

export default CollectionLayout;
