import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useProgress } from "react-native-track-player";
import { useSafeGetItemDetails } from "../hooks/ABSHooks";
import { formatSeconds } from "../lib/formatUtils";
import {
  usePlaybackActions,
  usePlaybackIsPlaying,
  usePlaybackSession,
} from "../store/store-playback";

/**
 * Main audiobook player screen
 * Displays cover art, playback controls, and book metadata
 */
const MainPlayerRouter = () => {
  const playbackActions = usePlaybackActions();
  const isPlaying = usePlaybackIsPlaying();

  const headerHeight = useHeaderHeight();
  const session = usePlaybackSession();
  const progress = useProgress();
  const { data: bookDetails, isPending } = useSafeGetItemDetails(session?.libraryItemId);

  // Loading state
  if (isPending) {
    return (
      <View style={[styles.container, { paddingTop: headerHeight }]}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading audiobook...</Text>
      </View>
    );
  }

  // No session state
  if (!session) {
    return (
      <View style={[styles.container, { paddingTop: headerHeight }]}>
        <Text style={styles.errorText}>No active playback session</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: headerHeight }]}
    >
      {/* Cover Art */}
      <View style={styles.coverContainer}>
        <Image
          source={bookDetails?.coverURI}
          style={styles.coverImage}
          contentFit="cover"
          placeholder={require("../../assets/images/icon.png")}
        />
      </View>

      {/* Book Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {session.displayTitle}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {session.displayAuthor}
        </Text>
      </View>

      {/* Progress Info */}
      <View style={styles.progressContainer}>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatSeconds(progress.position, "compact")}</Text>
          <Text style={styles.timeText}>{formatSeconds(session.duration, "compact")}</Text>
        </View>
      </View>

      {/* TODO: Add playback controls */}
      <View>
        <Pressable onPress={playbackActions.togglePlayPause}>
          {isPlaying ? (
            <SymbolView name="pause.circle" size={80} />
          ) : (
            <SymbolView name="play.circle" size={80} />
          )}
        </Pressable>
      </View>
      {/* TODO: Add progress bar */}
      {/* TODO: Add chapter navigation */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  contentContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  coverContainer: {
    marginTop: 20,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  coverImage: {
    width: 280,
    height: 280,
    borderRadius: 8,
  },
  infoContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
  },
  author: {
    fontSize: 18,
    color: "#b3b3b3",
    textAlign: "center",
  },
  progressContainer: {
    width: "100%",
    marginBottom: 20,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  timeText: {
    fontSize: 14,
    color: "#b3b3b3",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#b3b3b3",
  },
  errorText: {
    fontSize: 16,
    color: "#ff6b6b",
    textAlign: "center",
  },
});

export default MainPlayerRouter;
