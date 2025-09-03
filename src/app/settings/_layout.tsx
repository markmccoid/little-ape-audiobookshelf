import { Stack, useRouter } from "expo-router";
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
          headerLargeTitle: true,
          headerTransparent: true,
          headerBlurEffect: "systemUltraThinMaterialLight",
          headerRight: () => {
            return (
              <Pressable onPress={() => router.dismiss()}>
                <Text>Close</Text>
              </Pressable>
            );
          },
        }}
      />
      <Stack.Screen name="abs_auth" />
    </Stack>
  );
}
