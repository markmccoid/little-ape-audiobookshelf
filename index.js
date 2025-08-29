// app/entry.js
import "expo-router/entry"; // This line is crucial for Expo Router to function correctly
import TrackPlayer from "react-native-track-player";

import { PlaybackService } from "./src/rn-trackplayer/services";
// Your code to run before _layout.tsx goes here

//Register Track Player
TrackPlayer.registerPlaybackService(() => PlaybackService);

// Example: Initializing a global service
// import Analytics from './services/analytics';
// Analytics.init();

// Example: Setting up a polyfill
// import 'core-js/es/array/flat';
