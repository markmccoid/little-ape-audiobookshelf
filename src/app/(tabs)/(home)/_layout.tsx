import HeaderButton from "@/src/components/common/LAABSHeaderButton";
import { Link, Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import React from "react";

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
              <Link href={{ pathname: "/settings" }} asChild>
                <HeaderButton>
                  <SymbolView name="gearshape" />
                </HeaderButton>
              </Link>
            );
          },
        }}
      />
    </Stack>
  );
};

export default LibraryLayout;
