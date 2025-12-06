import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

interface OfflineBadgeProps {
  isVisible: boolean;
  style?: ViewStyle;
}

/**
 * Badge overlay to indicate book requires server connection
 * Displays "Server Only" badge in top-right corner of book cover
 */
export const OfflineBadge: React.FC<OfflineBadgeProps> = ({ isVisible, style }) => {
  if (!isVisible) return null;

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>Server Only</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  badgeText: {
    color: "white",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
