import HeaderButton from "@/src/components/common/LAABSHeaderButton";
import { Link, Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, Text } from "react-native";

export default function SettingsLayout() {
  const router = useRouter();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          // title: "Settings",
          headerTitle: "Settings",
          // headerLargeTitle: true,
          headerTransparent: true,
          headerBlurEffect: "systemUltraThinMaterialLight",
          headerRight: () => {
            return (
              <Link dismissTo href="/(tabs)/(home)" asChild>
                <HeaderButton>
                  <SymbolView name="xmark" />
                </HeaderButton>
              </Link>
            );
          },
        }}
      />
      <Stack.Screen
        name="abs_auth"
        options={{
          // title: "Settings",
          headerTitle: "AudiobookShelf Login",
          // headerLargeTitle: true,
          headerTransparent: true,
          headerBlurEffect: "systemUltraThinMaterialLight",
          headerRight: () => {
            return (
              <Pressable onPress={() => router.dismissTo("/(tabs)/(home)")}>
                <Text className="text-foreground">Home</Text>
              </Pressable>
            );
          },
        }}
      />
    </Stack>
  );
}
