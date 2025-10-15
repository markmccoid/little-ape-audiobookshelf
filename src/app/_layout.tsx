import { NAV_THEME } from "@/src/utils/theme";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import * as ExpoDevice from "expo-device";
import * as SecureStore from "expo-secure-store";
import { useColorScheme } from "nativewind";
import { useEffect, useRef, useState } from "react";
import { LogBox, Platform, Text, View } from "react-native";
import { useSyncQueriesExternal } from "react-query-external-sync";
import MiniPlayer from "../components/MiniPlayer";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import "../global.css";
import "../lib/polyfills";
import { absInitalize } from "../utils/AudiobookShelf/absInit";
import { queryClient } from "../utils/queryClient";
import { trackPlayerInit } from "../utils/rn-trackplayer/rn-trackplayerInit";

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
  //!! DEBUGGER
  // Set up the sync hook - automatically disabled in production!
  useSyncQueriesExternal({
    queryClient,
    socketURL: "http://localhost:42831", // Default port for React Native DevTools
    deviceName: Platform?.OS || "web", // Platform detection
    platform: Platform?.OS || "web", // Use appropriate platform identifier
    deviceId: Platform?.OS || "web", // Use a PERSISTENT identifier (see note below)
    isDevice: ExpoDevice.isDevice, // Automatically detects real devices vs emulators
    extraDeviceInfo: {
      // Optional additional info about your device
      appVersion: "1.0.0",
      // Add any relevant platform info
    },
    enableLogs: true,
    envVariables: {
      NODE_ENV: process.env.NODE_ENV,
      // Add any private environment variables you want to monitor
      // Public environment variables are automatically loaded
    },
    // Storage monitoring with CRUD operations
    // mmkvStorage: storage, // MMKV storage for ['#storage', 'mmkv', 'key'] queries + monitoring
    secureStorage: SecureStore, // SecureStore for ['#storage', 'secure', 'key'] queries + monitoring
    secureStorageKeys: [
      "audiobookshelf_tokens",
      "audiobookshelf_server_url",
      "audiobookshelf_user_info",
    ], // SecureStore keys to monitor
  });

  useEffect(() => {
    // Only initialize once
    if (initializeOnce.current) return;
    initializeOnce.current = true;

    const initialize = async () => {
      await trackPlayerInit();

      // Always attempt to initialize ABS - it will handle the credential check internally
      const initSuccess = await absInitalize(queryClient);
      if (!initSuccess) {
        console.log("NO SUCCESS FOR YOU");
      }
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
      // router.push("/(tabs)/library");
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
        <Stack.Screen
          name="main-player"
          options={{
            presentation: "card",
            headerShown: false,
            gestureDirection: "vertical",
            gestureEnabled: true,
            contentStyle: {
              borderTopLeftRadius: 25,
              borderTopRightRadius: 25,
              overflow: "hidden",
            },
          }}
        />
      </Stack>
      <MiniPlayer />
    </>
  );
}

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme();

  // const colorScheme = useColorScheme();

  // useEffect(() => {
  //   Appearance.setColorScheme("light");
  // }, [colorScheme]);

  return (
    <View style={{ flex: 1 }} className={colorScheme === "dark" ? "dark" : ""}>
      <ThemeProvider value={colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light}>
        {/* <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}> */}
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
