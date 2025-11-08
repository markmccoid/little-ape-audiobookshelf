import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetwork } from "../contexts/NetworkContext";

const BANNER_HEIGHT = 36;
const RECONNECTED_DURATION = 3000; // Show "Reconnected" for 3 seconds

export const NetworkStatusBanner: React.FC = () => {
  const { isOffline } = useNetwork();
  const [wasOffline, setWasOffline] = useState(false);
  const { top } = useSafeAreaInsets();
  const translateY = useSharedValue(-BANNER_HEIGHT);
  const opacity = useSharedValue(0);
  console.log("IS OFFLINE?", isOffline);
  useEffect(() => {
    if (isOffline) {
      // Going offline - show banner immediately
      setWasOffline(true);
      translateY.value = withSpring(BANNER_HEIGHT + top, {
        damping: 20,
        stiffness: 300,
      });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      // Coming back online
      if (wasOffline) {
        // Show "Reconnected" message briefly
        translateY.value = withSpring(BANNER_HEIGHT + top);
        opacity.value = withTiming(1);

        // Hide after delay
        const timer = setTimeout(() => {
          translateY.value = withSpring(-(BANNER_HEIGHT + top));
          opacity.value = withTiming(0, { duration: 300 });
          setTimeout(() => {
            setWasOffline(false);
          }, 300);
        }, RECONNECTED_DURATION);

        return () => clearTimeout(timer);
      } else {
        // Never was offline, keep hidden
        translateY.value = -(BANNER_HEIGHT + top);
        opacity.value = 0;
      }
    }
  }, [isOffline, wasOffline, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  const bannerConfig = isOffline
    ? {
        backgroundColor: "#f59e0b", // amber-500
        text: "No internet connection - Using cached data",
        icon: "📡",
      }
    : {
        backgroundColor: "#10b981", // green-500
        text: "Connected",
        icon: "✓",
      };

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: BANNER_HEIGHT,
          backgroundColor: bannerConfig.backgroundColor,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          zIndex: 9999,
          elevation: 10,
        },
        animatedStyle,
      ]}
    >
      <Text style={{ fontSize: 18, marginRight: 8 }}>{bannerConfig.icon}</Text>
      <Text
        style={{
          color: "white",
          fontSize: 14,
          fontWeight: "600",
        }}
      >
        {bannerConfig.text}
      </Text>
    </Animated.View>
  );
};
