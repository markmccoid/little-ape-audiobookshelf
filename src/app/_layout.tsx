import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { absInitalize } from "../ABS/absInit";
import "../global.css";
import "../lib/polyfills";
import { trackPlayerInit } from "../rn-trackplayer/rn-trackplayerInit";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  let [isReady, setIsReady] = useState(false);
  console.log("IS READY", isReady);
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
      <Stack />
      <PortalHost />
    </View>
  );
}
