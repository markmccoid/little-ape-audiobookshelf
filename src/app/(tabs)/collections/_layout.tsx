import { Stack } from "expo-router";
import React from "react";

const CollectionLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Collections" }} />
    </Stack>
  );
};

export default CollectionLayout;
