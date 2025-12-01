import HeaderButton from "@/src/components/common/LAABSHeaderButton";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import React from "react";

const BookshelfLayout = () => {
  const router = useRouter();
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerBlurEffect: "light",
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="[bookshelfId]"
        options={{
          title: "Bookshelf",
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()}>
              <SymbolView name="chevron.left" />
            </HeaderButton>
          ),
        }}
      />
    </Stack>
  );
};

export default BookshelfLayout;
