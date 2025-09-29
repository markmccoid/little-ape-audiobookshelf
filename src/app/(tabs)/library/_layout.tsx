import { Stack } from "expo-router";
import React from "react";
const LibraryLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerBlurEffect: "light",
        headerShadowVisible: true,
        // headerSearchBarOptions: {
        //   placement: "integratedButton",
        //   placeholder: "Search Title/Author",
        // },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Library" }} />
      <Stack.Screen name="[bookid]" options={{ title: "Book" }} />
      <Stack.Screen name="filterroute" options={{ title: "Filter", presentation: "formSheet" }} />
    </Stack>
  );
};

export default LibraryLayout;
