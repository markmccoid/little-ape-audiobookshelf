import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, useAuthState } from "../contexts/AuthContext";
import { AuthErrorType, AuthState } from "../utils/AudiobookShelf/authTypes";

const OVERLAY_HEIGHT = 80;

interface AuthErrorBannerProps {
  /** Whether to show even when downloaded books could be played */
  forceShow?: boolean;
}

/**
 * Auth Error Banner - shows when authentication fails
 * Provides retry option and option to continue with downloaded books
 */
export const AuthErrorBanner: React.FC<AuthErrorBannerProps> = ({ forceShow = false }) => {
  const { authState, authError, requiresUserAction, isChecking } = useAuthState();
  const { retryAuthentication, clearAuthError } = useAuth();
  const { top } = useSafeAreaInsets();
  const [isRetrying, setIsRetrying] = React.useState(false);

  // Animation values
  const translateY = useSharedValue(-OVERLAY_HEIGHT);
  const opacity = useSharedValue(0);

  // Show/hide based on auth state
  React.useEffect(() => {
    const shouldShow = requiresUserAction && !isChecking;

    if (shouldShow) {
      translateY.value = withSpring(top + OVERLAY_HEIGHT, {
        damping: 20,
        stiffness: 300,
      });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withSpring(-(OVERLAY_HEIGHT + top));
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [requiresUserAction, isChecking, translateY, opacity, top]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryAuthentication();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismiss = () => {
    clearAuthError();
    // Slide out
    translateY.value = withSpring(-(OVERLAY_HEIGHT + top));
    opacity.value = withTiming(0, { duration: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Get appropriate message based on error type
  const getMessage = (): { title: string; subtitle: string } => {
    if (authState === AuthState.TOKEN_EXPIRED) {
      return {
        title: "Session Expired",
        subtitle: authError?.message || "Please retry or continue with downloaded books",
      };
    }

    if (authState === AuthState.NETWORK_ERROR) {
      return {
        title: "Connection Error",
        subtitle: "Check your internet connection and try again",
      };
    }

    switch (authError?.type) {
      case AuthErrorType.INVALID_CREDENTIALS:
        return {
          title: "Authentication Failed",
          subtitle: "Invalid credentials. Please log in again.",
        };
      case AuthErrorType.SERVER_UNREACHABLE:
        return {
          title: "Server Unreachable",
          subtitle: "Could not connect to the server",
        };
      case AuthErrorType.NETWORK_UNAVAILABLE:
        return {
          title: "Network Unavailable",
          subtitle: "Check your internet connection",
        };
      default:
        return {
          title: "Authentication Error",
          subtitle: authError?.message || "An error occurred",
        };
    }
  };

  const { title, subtitle } = getMessage();

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: OVERLAY_HEIGHT,
          backgroundColor: "#dc2626", // red-600
          flexDirection: "column",
          paddingHorizontal: 16,
          paddingVertical: 8,
          zIndex: 9998,
          elevation: 9,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        },
        animatedStyle,
      ]}
    >
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>{title}</Text>
        <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 2 }}>
          {subtitle}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
        <TouchableOpacity
          onPress={handleRetry}
          disabled={isRetrying}
          style={{
            backgroundColor: "white",
            paddingVertical: 6,
            paddingHorizontal: 16,
            borderRadius: 6,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          {isRetrying && <ActivityIndicator size="small" color="#dc2626" />}
          <Text style={{ color: "#dc2626", fontWeight: "600" }}>
            {isRetrying ? "Retrying..." : "Retry"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDismiss}
          style={{
            backgroundColor: "rgba(255,255,255,0.2)",
            paddingVertical: 6,
            paddingHorizontal: 16,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Continue Offline</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default AuthErrorBanner;
