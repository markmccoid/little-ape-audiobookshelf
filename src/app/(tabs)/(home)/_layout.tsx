import HeaderButton from "@/src/components/common/LAABSHeaderButton";
import { Link, Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import React from "react";

const HomeLayout = () => {
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
        name="index"
        options={{
          title: "Home",

          headerLeft: () => {
            return (
              <Link href={{ pathname: "/settings" }} asChild>
                <HeaderButton>
                  <SymbolView name="gearshape" />
                </HeaderButton>
              </Link>
            );
          },
        }}
      />
      <Stack.Screen name="[bookid]" options={{ title: "Book" }} />
    </Stack>
  );
};

export default HomeLayout;
