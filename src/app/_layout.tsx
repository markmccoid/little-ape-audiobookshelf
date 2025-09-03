import { PortalHost } from "@rn-primitives/portal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { LogBox, Text, View } from "react-native";
import { absInitalize } from "../ABS/absInit";
import "../global.css";
import "../lib/polyfills";
import { trackPlayerInit } from "../rn-trackplayer/rn-trackplayerInit";
SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  "SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead. See https://github.com/th3rdwave/react-native-safe-area-context",
]);

const queryClient = new QueryClient();

export default function RootLayout() {
  let [isReady, setIsReady] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const initialize = async () => {
      await trackPlayerInit();
      await absInitalize();
      // await AudiobookshelfAuth.create();
      setIsReady(true);
      // console.log("abs logged in", hasStoredCr);
    };
    initialize();
  }, []);

  // Hide Splashscreen after initialize is finished
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);
  // Can't go to main routes until initializing is done
  if (!isReady) {
    return (
      <View>
        <Text>IsLoading...</Text>
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" options={{ presentation: "fullScreenModal" }} />
        </Stack>
        <PortalHost />
      </QueryClientProvider>
    </View>
  );
}
