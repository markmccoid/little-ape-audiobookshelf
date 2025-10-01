import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { LogBox, Text, useColorScheme, View } from "react-native";
import { absInitalize } from "../ABS/absInit";
import MiniPlayer from "../components/MiniPlayer";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import "../global.css";
import "../lib/polyfills";
import { queryClient } from "../lib/queryClient";
import { trackPlayerInit } from "../rn-trackplayer/rn-trackplayerInit";
SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  "SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead. See https://github.com/th3rdwave/react-native-safe-area-context",
]);
export const unstable_settings = {
  intialRouteName: "(tabs)",
};

function AppContent() {
  let [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const { hasStoredCredentials, checkAuthStatus } = useAuth();
  const initializeOnce = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (initializeOnce.current) return;
    initializeOnce.current = true;

    const initialize = async () => {
      await trackPlayerInit();

      // Always attempt to initialize ABS - it will handle the credential check internally
      const initSuccess = await absInitalize(queryClient);

      // Refresh auth status after initialization attempt
      await checkAuthStatus();
      setIsReady(true);
    };
    initialize();
  }, [checkAuthStatus]); // Now it's safe to include checkAuthStatus since we guard with useRef

  // Hide Splashscreen after initialize is finished
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
      router.push("/(tabs)/library");
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
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="main-player" options={{ presentation: "modal" }} />
      </Stack>
      <MiniPlayer />
    </>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();

  return (
    <View style={{ flex: 1 }}>
      <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppContent />
            <PortalHost />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </View>
  );
}
