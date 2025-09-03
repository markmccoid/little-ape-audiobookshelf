import { Stack } from "expo-router";
import React from "react";

const LibraryLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Library" }} />
    </Stack>
  );
};

export default LibraryLayout;
