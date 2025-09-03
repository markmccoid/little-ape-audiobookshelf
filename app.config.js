// app.config.js
export default {
  expo: {
    name: "abs-only",
    slug: "abs-only",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/splash-icon.png",
    scheme: "absonly",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.markmccoid.abs-only",
      infoPlist: {
        RCTAsyncStorageExcludeFromBackup: false,
        NSMicrophoneUsageDescription:
          "While this app does not use the microphone, the APIs used to play audio still have access to the microphone.  The app will not however ever use the microphone on your device.",
        UIBackgroundModes: ["audio"],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: true,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      "expo-secure-store",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
      developmentClient: true, // makes `expo start` default to Dev Build
    },
  },
};
