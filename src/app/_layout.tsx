import { NAV_THEME } from "@/src/utils/theme";
import { PortalProvider } from "@gorhom/portal";
import { ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { useColorScheme } from "nativewind";
import { useEffect, useRef, useState } from "react";
import { LogBox, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthErrorBanner } from "../components/AuthErrorBanner";
import MiniPlayer from "../components/miniPlayer/MiniPlayer";
import { NetworkStatusBanner } from "../components/NetworkStatusBanner";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { NetworkProvider } from "../contexts/NetworkContext";
import "../global.css";
import "../lib/polyfills";
import { useBooksActions } from "../store/store-books";
import { storeInit } from "../store/storeInit";
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
  // const { colorScheme, setColorScheme } = useColorScheme();
  let [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const { hasStoredCredentials, checkAuthStatus } = useAuth();
  const initializeOnce = useRef(false);
  const bookActions = useBooksActions();
  useEffect(() => {
    // Only initialize once
    if (initializeOnce.current) return;
    initializeOnce.current = true;

    const initialize = async () => {
      console.log("INIT: Starting app initialization");
      await trackPlayerInit();
      console.log("INIT: Track player initialized");

      // Always attempt to initialize ABS - it will handle the credential check internally
      console.log("INIT: Attempting ABS initialization");
      const initSuccess = await absInitalize(queryClient);
      console.log("INIT: ABS initialization result:", initSuccess);
      if (!initSuccess) {
        console.log("INIT: ABS initialization failed, skipping storeInit");
      } else {
        console.log("INIT: ABS initialization successful, proceeding with storeInit");
        try {
          await storeInit();
          console.log("INIT: storeInit completed successfully");
        } catch (error) {
          console.error("INIT: storeInit failed:", error);
        }
      }
      // Refresh auth status after initialization attempt
      console.log("INIT: Checking auth status");
      await checkAuthStatus();
      console.log("INIT: App initialization completed");
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
      {/* Network and Auth status banners */}
      <NetworkStatusBanner />
      <AuthErrorBanner />
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
  // const cs = useRNColorScheme();

  // useEffect(() => {
  //   console.log("colorShceme", colorScheme, cs);
  //   // setColorScheme(colorScheme || "light");
  // }, [colorScheme, cs]);

  return (
    <GestureHandlerRootView
      style={[{ flex: 1 }]}
      // className={colorScheme === "dark" ? "dark" : "light"}
    >
      {/* <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}> */}
      <QueryClientProvider client={queryClient}>
        {/* <View style={{ flex: 1 }} className={colorScheme === "dark" ? "dark" : ""}> */}
        <NetworkProvider>
          <AuthProvider>
            <PortalProvider>
              <ThemeProvider value={colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light}>
                <AppContent />
              </ThemeProvider>
            </PortalProvider>
          </AuthProvider>
        </NetworkProvider>
        {/* </View> */}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
