import React, { useEffect, useReducer } from "react";
import { Pressable, Text, View } from "react-native";
import TrackPlayer, { State } from "react-native-track-player";
const track1 = {
  url: require("../../assets/funk.mp3"),
  title: "Funk",
  artist: "hunter mcCoid",
  album: "hunter",
  genre: "Cool",
  date: "2025-05-20T07:00:00+00:00", // RFC 3339
  artwork: "", // Load artwork from the network
  duration: 30, // Duration in seconds
};
const Player = () => {
  const [isPlaying, toggleIsPlaying] = useReducer((prev) => !prev, false);
  const addTrack = async () => {
    try {
      await TrackPlayer.add([track1]);
    } catch (e) {
      console.log("Error adding Track");
    }
  };

  useEffect(() => {
    const checkTP = async () => {
      try {
        const pb = await TrackPlayer.getPlaybackState();
        console.log("playback state", pb);
      } catch {
        console.log("NO playback state");
      }
    };
    checkTP();
  }, []);
  const togglePlay = async () => {
    const playback = await TrackPlayer.getPlaybackState();
    console.log("Playback", playback.state);
    try {
      if (playback.state === State.Playing) {
        TrackPlayer.pause();
      } else {
        TrackPlayer.play();
      }
    } catch (e) {
      console.log("Error Playing", e);
    } finally {
      toggleIsPlaying();
    }
  };
  return (
    <View className="">
      <Text className="color-blue-600">Player</Text>

      <Pressable onPress={togglePlay} className="p-2 border-hairline rounded bg-slate-400">
        <Text>{isPlaying ? "Pause" : "Play"}</Text>
      </Pressable>
      <Pressable onPress={addTrack}>
        <Text>Add Track</Text>
      </Pressable>
    </View>
  );
};

export default Player;
