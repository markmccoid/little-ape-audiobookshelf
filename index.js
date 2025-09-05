// app/entry.js
import "expo-router/entry"; // This line is crucial for Expo Router to function correctly
import { Text, TextInput } from "react-native";
import TrackPlayer from "react-native-track-player";

import { PlaybackService } from "./src/rn-trackplayer/services";
// Your code to run before _layout.tsx goes here

//Register Track Player
TrackPlayer.registerPlaybackService(() => PlaybackService);

//# ----------------------------------
//# lock out font scaling globally
//# ----------------------------------
if (Text.defaultProps == null) Text.defaultProps = {};
Text.defaultProps.allowFontScaling = false;

if (TextInput.defaultProps == null) TextInput.defaultProps = {};
TextInput.defaultProps.allowFontScaling = false;
//# ----------------------------------

// Example: Initializing a global service
// import Analytics from './services/analytics';
// Analytics.init();

// Example: Setting up a polyfill
// import 'core-js/es/array/flat';
