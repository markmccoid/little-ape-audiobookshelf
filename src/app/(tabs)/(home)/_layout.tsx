import HeaderButton from "@/src/components/common/LAABSHeaderButton";
import { Link, Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import React from "react";

const HomeLayout = () => {
  // const router = useRouter();
  // const pathname = usePathname();
  // Get the current stack's navigation state
  // const navigationState = useNavigationState((state: any) => state);

  // console.log("pathname", pathname);
  // console.log("navigationState full:", navigationState);

  // // Log all routes in the current stack
  // if (navigationState?.routes) {
  //   console.log(
  //     "All routes in stack:",
  //     navigationState.routes.map((route: any) => ({
  //       name: route.name,
  //       key: route.key,
  //       params: route.params,
  //     }))
  //   );
  // }
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
      <Stack.Screen name="[libraryItemId]" options={{}} />
      <Stack.Screen name="bookshelf" options={{ headerShown: false }} />
    </Stack>
  );
};

export default HomeLayout;
