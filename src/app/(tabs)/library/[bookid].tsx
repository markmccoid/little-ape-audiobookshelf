import { getAbsAuth, useAbsAPI } from "@/src/ABS/absInit";
import { useGetItemDetails } from "@/src/hooks/ABSHooks";
import { formatSeconds } from "@/src/lib/formatUtils";
import useAudiobookStreaming from "@/src/rn-trackplayer/exampleStreamUsage";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { Stack, useGlobalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import TrackPlayer, { State, usePlaybackState, useProgress } from "react-native-track-player";

const BookIdRoute = () => {
  const headerHeight = useHeaderHeight();
  const progress = useProgress();

  const { bookid, cover, title } = useGlobalSearchParams<{
    bookid: string;
    cover: string;
    title: string;
  }>();
  const { setupForPlayback } = useAudiobookStreaming(bookid);

  const { data, isPending } = useGetItemDetails(bookid);
  const absAPI = useAbsAPI();
  const absAuth = getAbsAuth();
  const playbackState = usePlaybackState();
  const [sessionId, setSessionId] = useState("");

  // console.log("playbackstate", playbackState.state);
  // console.log("Item Data", data?.bookDuration, progress.duration);

  // async function playDirectUrl() {
  //   const track = {
  //     id: "03e49975-b6dc-4af6-bfeb-d9b1fef9ad20", // unique ID
  //     url: "http://192.168.1.141:13378/audiobookshelf/public/session/30d808fa-8084-4be5-814a-7bf230bb3eba/track/1",
  //     // url: "https://abs.mccoidco.xyz/api/items/03e49975-b6dc-4af6-bfeb-d9b1fef9ad20/file/331154271?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3OGQ2N2JhYy05MGVhLTRjZWUtYWQ2Ni0xYWM0ZmU3MzM3MjkiLCJ1c2VybmFtZSI6InJvb3QiLCJpYXQiOjE3MTMxMzU3NjR9.J1q6MjoblW-pcweIwAAY0Mozr6Rrdg57bbaNLdMCNy4",

  //     title: "My Audiobook",
  //     artist: "Unknown", // optional, good for UI
  //     artwork: "https://example.com/cover.jpg", // optional
  //   };

  //   await TrackPlayer.reset(); // clear existing queue
  //   await TrackPlayer.add([track]); // add direct URL track
  //   await TrackPlayer.play(); // start playback
  // }

  const sync = async () => {
    try {
      absAPI.syncProgressToSever(sessionId);
    } catch (e) {
      console.log("sync error", e);
    }
  };
  const loadFirstTrack = async () => {
    const { addObj, response } = await absAPI.getPlayInfo(bookid);

    const fileId = data?.media.audioFiles[0].ino;
    // const authToken = await absAuth.getValidAccessToken();
    // const streamUrl = `${absAuth.absURL}/audiobookshelf/api/items/${bookid}/play?token=${authToken}`;
    // const streamUrl = `${absAuth.absURL}/api/items/03e49975-b6dc-4af6-bfeb-d9b1fef9ad20/file/331154271?token=${authToken}`;
    // const streamUrl = `https://abs.mccoidco.xyz${playInfo.audioTracks[0].contentUrl}?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3OGQ2N2JhYy05MGVhLTRjZWUtYWQ2Ni0xYWM0ZmU3MzM3MjkiLCJ1c2VybmFtZSI6InJvb3QiLCJpYXQiOjE3MTMxMzU3NjR9.J1q6MjoblW-pcweIwAAY0Mozr6Rrdg57bbaNLdMCNy4`;

    // udiobookshelf/api/items/de6ce58f-efc8-4686-ba79-4f13d2f966da/play
    await TrackPlayer.reset();
    await TrackPlayer.seekTo(response.currentTime);
    await TrackPlayer.add(addObj);
    setSessionId(response.id);
    console.log("Track Loaded");
  };

  const togglePlayPause = async () => {
    const state = await TrackPlayer.getPlaybackState();
    console.log("State", state);
    if (state.state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  // Check if player is currently playing
  const isPlaying = playbackState.state === State.Playing;

  return (
    <ScrollView
      className="flex-1"
      contentInset={{ top: headerHeight }}
      contentOffset={{ x: 0, y: -headerHeight }}
    >
      <Stack.Screen
        options={{
          headerTitle: title,
        }}
      />
      <View className="flex-row justify-center border">
        <Image
          source={cover}
          style={{ width: 200, height: 200, borderRadius: 15 }}
          transition={200}
        />
      </View>

      <Pressable className="p-2 bg-slate-400" onPress={loadFirstTrack}>
        <Text>Load First Track</Text>
      </Pressable>
      <View className="flex-row items-center justify-between px-5">
        <Pressable className="p-3 bg-blue-500 rounded-lg" onPress={togglePlayPause}>
          <Text className="text-white font-semibold">{isPlaying ? "Pause" : "Play"}</Text>
        </Pressable>
      </View>
      {/* <View className="flex-row items-center justify-between px-5">
        <Pressable className="p-3 bg-blue-500 rounded-lg" onPress={sync}>
          <Text className="text-white font-semibold">sync</Text>
        </Pressable>
      </View>
      <View className="flex-row items-center justify-between px-5">
        <Pressable className="p-3 bg-blue-500 rounded-lg" onPress={() => setupForPlayback(bookid)}>
          <Text className="text-white font-semibold">START PLAYBACK</Text>
        </Pressable>
      </View> */}
      <Text>BookIdRoute -- {bookid}</Text>
      {data &&
        data.media.chapters.map((el) => {
          return (
            <View key={el.id} className="flex-row gap-2">
              <Text>{el.title}</Text>
              <Text>{formatSeconds(el.end - el.start, "compact")}</Text>
              <Text>{el.end}</Text>
            </View>
          );
        })}
    </ScrollView>
  );
};

export default BookIdRoute;
