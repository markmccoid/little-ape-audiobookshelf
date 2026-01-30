// app.config.js
export default {
  expo: {
    name: "laabs",
    slug: "laabs",
    version: "1.3.4",
    orientation: "portrait",
    icon: "./assets/LAABABS-Icon.icon",
    scheme: "laabs",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.markmccoid.laabs",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
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
      package: "com.markmccoid.littleapeaudiobookshelf",
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
          resizeMode: "cover",
          backgroundColor: "#ffffff",
        },
      ],
      "expo-secure-store",
      [
        "expo-font",
        {
          fonts: [
            "./assets/fonts/FiraCode-Bold.ttf",
            "./assets/fonts/FiraCode-Light.ttf",
            "./assets/fonts/FiraCode-Medium.ttf",
            "./assets/fonts/FiraCode-Regular.ttf",
            "./assets/fonts/FiraCode-SemiBold.ttf",
          ],
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
      developmentClient: true, // makes `expo start` default to Dev Build
    },
    extra: {
      eas: {
        projectId: "265633ba-112d-4985-866f-9462c6dc879d",
      },
    },
  },
};
