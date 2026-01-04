import { Stack, useRouter } from "expo-router";
import React from "react";

const LibraryLayout = () => {
  const router = useRouter();
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerBlurEffect: "light",
        headerShadowVisible: true,
        // headerSearchBarOptions: {
        //   placement: "integratedButton",
        //   placeholder: "Title/Author",
        //   onChangeText: (event) => {
        //     router.setParams({
        //       q: event.nativeEvent.text,
        //     });
        //   },
        // },
        // headerSearchBarOptions: {
        //   placement: "integratedButton",
        //   placeholder: "Search Title/Author",
        // },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Library",
        }}
      />
    </Stack>
  );
};

export default LibraryLayout;
