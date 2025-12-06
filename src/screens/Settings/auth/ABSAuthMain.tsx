import { useAuth, useAuthState, useSafeAbsAPI } from "@/src/contexts/AuthContext";
import { LoginForm } from "@/src/screens/Settings/auth/LoginForm";
import { AudiobookshelfAuth } from "@/src/utils/AudiobookShelf/absAuthClass";
import { AuthErrorType } from "@/src/utils/AudiobookShelf/authTypes";
import { queryClient } from "@/src/utils/queryClient";
import { AlertCircle, RefreshCw } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import ABSLibrarySelect from "./ABSLibrarySelect";

interface LoginError {
  type: AuthErrorType;
  message: string;
}

/**
 * Parse error into a user-friendly message
 */
function parseError(error: unknown): LoginError {
  if (error instanceof Error) {
    // Check for specific error types
    const message = error.message.toLowerCase();

    if (message.includes("invalid username") || message.includes("invalid password")) {
      return {
        type: AuthErrorType.INVALID_CREDENTIALS,
        message: "Invalid username or password. Please check your credentials and try again.",
      };
    }

    if (message.includes("network") || message.includes("connect")) {
      return {
        type: AuthErrorType.NETWORK_UNAVAILABLE,
        message: "Could not connect to the server. Please check your network connection.",
      };
    }

    if (message.includes("server")) {
      return {
        type: AuthErrorType.SERVER_UNREACHABLE,
        message: "Could not reach the server. Please verify the server URL is correct.",
      };
    }

    return {
      type: AuthErrorType.UNKNOWN,
      message: error.message,
    };
  }

  return {
    type: AuthErrorType.UNKNOWN,
    message: "An unexpected error occurred. Please try again.",
  };
}

export default function ABSAuthMain() {
  const { isAuthenticated, authInfo, logout, initializeAfterLogin } = useAuth();
  const { authState, tokenExpiresAt } = useAuthState();
  const [error, setError] = useState<LoginError | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Always call hooks at the top level, regardless of conditional rendering
  const absAPI = useSafeAbsAPI();

  const onSubmit = async (url: string, username: string, password: string) => {
    try {
      setIsLoggingIn(true);
      setError(null);
      console.log("In auth Submit", url, username);

      // Reset any existing auth instance to start fresh
      AudiobookshelfAuth.reset();

      const auth = await AudiobookshelfAuth.create(url);
      await auth.login({ username, password });

      console.log("Initializing after login...");
      // Initialize both auth and API after successful login
      await initializeAfterLogin(queryClient);

      console.log("Login successful, auth and API initialized");
    } catch (err) {
      console.error("Login failed:", err);
      setError(parseError(err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // Format token expiry for display
  const formatTokenExpiry = () => {
    if (!tokenExpiresAt) return null;

    const now = Date.now();
    const timeLeft = tokenExpiresAt - now;

    if (timeLeft <= 0) return "Expired";

    const minutes = Math.floor(timeLeft / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `Expires in ${hours}h ${minutes % 60}m`;
    }
    return `Expires in ${minutes}m`;
  };

  // Always render ABSLibrarySelect to prevent hook order changes
  // It handles its own conditional rendering internally
  const librarySelectComponent = <ABSLibrarySelect />;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {isAuthenticated ? (
        <View className="flex-1 mt-4 w-full px-5">
          {/* Session Status */}
          <View className="bg-green-100 p-3 rounded-lg mb-4 flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            <Text className="text-green-700 font-medium flex-1">Logged in</Text>
            {tokenExpiresAt && (
              <Text className="text-green-600 text-sm">{formatTokenExpiry()}</Text>
            )}
          </View>

          <View className="flex-row items-center mb-2">
            <Text className="text-foreground font-semibold text-lg">ABS URL: </Text>
            <Text className="border-hairline bg-gray-200 text-gray-600 p-2 flex-1 rounded-md text-lg">
              {authInfo.serverUrl || "Not available"}
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <Text className="text-foreground font-semibold">Username: </Text>
            <Text className="border-hairline bg-gray-200 text-gray-600 rounded-md p-2 flex-1">
              {authInfo.username || "Not available"}
            </Text>
          </View>
          {/* Always render this component to maintain hook order */}
          {librarySelectComponent}

          <Pressable
            onPress={handleLogout}
            className="p-3 border rounded-lg bg-yellow-300 my-4 flex-row items-center justify-center"
          >
            <Text className="font-semibold">Log Out</Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-1 w-full">
          <LoginForm onSubmit={onSubmit} isLoggingIn={isLoggingIn} />

          {/* Error Display */}
          {error && (
            <View className="border border-red-300 bg-red-50 rounded-lg p-4 mx-4 mt-4">
              <View className="flex-row items-start">
                <AlertCircle size={20} color="#dc2626" style={{ marginTop: 2 }} />
                <View className="flex-1 ml-3">
                  <Text className="text-red-800 font-semibold text-base">
                    {error.type === AuthErrorType.INVALID_CREDENTIALS
                      ? "Authentication Failed"
                      : error.type === AuthErrorType.NETWORK_UNAVAILABLE
                      ? "Network Error"
                      : error.type === AuthErrorType.SERVER_UNREACHABLE
                      ? "Server Error"
                      : "Error"}
                  </Text>
                  <Text className="text-red-700 mt-1">{error.message}</Text>
                </View>
              </View>

              {/* Retry button for recoverable errors */}
              {error.type !== AuthErrorType.INVALID_CREDENTIALS && (
                <Pressable
                  onPress={() => setError(null)}
                  className="mt-3 flex-row items-center justify-center bg-red-100 p-2 rounded-lg"
                >
                  <RefreshCw size={16} color="#dc2626" />
                  <Text className="text-red-700 ml-2 font-medium">Dismiss</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
