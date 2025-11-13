import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface OfflineBadgeProps {
  isVisible: boolean;
  style?: any;
}

/**
 * Badge overlay to indicate book is unavailable offline
 * Shows "Requires Internet" message with semi-transparent background
 */
export const OfflineBadge: React.FC<OfflineBadgeProps> = ({ isVisible, style }) => {
  if (!isVisible) return null;

  return (
    <View style={[styles.badge, style]}>
      <View style={styles.badgeContent}>
        <Text style={styles.badgeText}>📡</Text>
        <Text style={styles.badgeTextSmall}>Requires Internet</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeContent: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  badgeText: {
    fontSize: 16,
  },
  badgeTextSmall: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
});
