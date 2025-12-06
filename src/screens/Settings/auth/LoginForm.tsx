// components/LoginForm.tsx
import { useAuth } from "@/src/contexts/AuthContext";
import { useNetwork } from "@/src/contexts/NetworkContext";
import { AlertCircle, CheckCircle, Eye, EyeOff, Wifi, WifiOff } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface LoginFormProps {
  onSubmit: (url: string, username: string, password: string) => void;
  isLoggingIn: boolean;
}

interface ValidationErrors {
  url?: string;
  username?: string;
  password?: string;
}

/**
 * Validates a URL format
 */
function validateUrl(url: string): string | undefined {
  if (!url.trim()) {
    return "Server URL is required";
  }

  const trimmed = url.trim();

  // Check if it starts with http:// or https://
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return "URL must start with http:// or https://";
  }

  // Try to parse as URL
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname) {
      return "Invalid URL format";
    }
  } catch {
    return "Invalid URL format";
  }

  return undefined;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoggingIn }) => {
  const { authInfo } = useAuth();
  const { isOffline, connectionQuality } = useNetwork();

  const [url, setUrl] = useState(authInfo.serverUrl || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Mark field as touched when blurred
  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Validate all fields
  const validationErrors = useMemo((): ValidationErrors => {
    const errors: ValidationErrors = {};

    // URL validation
    const urlError = validateUrl(url);
    if (urlError) {
      errors.url = urlError;
    }

    // Username validation
    if (!username.trim()) {
      errors.username = "Username is required";
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required";
    }

    return errors;
  }, [url, username, password]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0 && url && username && password;
  }, [validationErrors, url, username, password]);

  // Can submit if form is valid and not offline
  const canSubmit = isFormValid && !isOffline && !isLoggingIn;

  // Test connection to server
  const handleTestConnection = async () => {
    const urlError = validateUrl(url);
    if (urlError) {
      setConnectionTestResult({ success: false, message: urlError });
      return;
    }

    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const testUrl = url.trim().replace(/\/$/, ""); // Remove trailing slash
      const response = await fetch(`${testUrl}/ping`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setConnectionTestResult({
          success: true,
          message: "Server is reachable!",
        });
      } else {
        setConnectionTestResult({
          success: false,
          message: `Server returned status ${response.status}`,
        });
      }
    } catch (error) {
      setConnectionTestResult({
        success: false,
        message: "Could not connect to server. Check the URL and try again.",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = () => {
    // Mark all fields as touched
    setTouched({ url: true, username: true, password: true });

    if (canSubmit) {
      onSubmit(url.trim(), username.trim(), password);
    }
  };

  // Render validation error for a field
  const renderFieldError = (field: keyof ValidationErrors) => {
    if (!touched[field] || !validationErrors[field]) return null;

    return (
      <View className="flex-row items-center mt-1 mb-1">
        <AlertCircle size={14} color="#dc2626" />
        <Text className="text-red-600 text-sm ml-1">{validationErrors[field]}</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 pt-4 w-full px-5">
      {/* Network Status Indicator */}
      <View
        className={`flex-row items-center p-3 rounded-lg mb-4 ${
          isOffline ? "bg-amber-100" : "bg-green-100"
        }`}
      >
        {isOffline ? (
          <>
            <WifiOff size={18} color="#b45309" />
            <Text className="text-amber-700 ml-2 flex-1">
              You're offline. Please connect to the internet to log in.
            </Text>
          </>
        ) : (
          <>
            <Wifi size={18} color="#15803d" />
            <Text className="text-green-700 ml-2 flex-1">
              {connectionQuality === "excellent" || connectionQuality === "good"
                ? "Connected"
                : "Poor connection"}
            </Text>
          </>
        )}
      </View>

      {/* Server URL Field */}
      <Text className="text-base font-semibold ml-1">AudiobookShelf Server URL</Text>
      <View className="flex-row items-center mb-1">
        <TextInput
          className={`border px-3 py-2 bg-white rounded-lg flex-1 ${
            touched.url && validationErrors.url ? "border-red-500" : "border-gray-300"
          }`}
          style={{ fontSize: 18 }}
          placeholder="https://your-server.com"
          value={url}
          onChangeText={(text) => {
            setUrl(text);
            setConnectionTestResult(null);
          }}
          onBlur={() => handleBlur("url")}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!isLoggingIn}
        />
        <TouchableOpacity
          onPress={handleTestConnection}
          disabled={isTestingConnection || isOffline || !!validateUrl(url)}
          className={`ml-2 p-2 rounded-lg ${
            isTestingConnection || isOffline || validateUrl(url) ? "bg-gray-300" : "bg-blue-100"
          }`}
        >
          {isTestingConnection ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Text
              className={`text-sm ${
                isOffline || validateUrl(url) ? "text-gray-500" : "text-blue-600"
              }`}
            >
              Test
            </Text>
          )}
        </TouchableOpacity>
      </View>
      {renderFieldError("url")}

      {/* Connection Test Result */}
      {connectionTestResult && (
        <View
          className={`flex-row items-center p-2 rounded-lg mb-2 ${
            connectionTestResult.success ? "bg-green-100" : "bg-red-100"
          }`}
        >
          {connectionTestResult.success ? (
            <CheckCircle size={16} color="#15803d" />
          ) : (
            <AlertCircle size={16} color="#dc2626" />
          )}
          <Text
            className={`ml-2 text-sm ${
              connectionTestResult.success ? "text-green-700" : "text-red-600"
            }`}
          >
            {connectionTestResult.message}
          </Text>
        </View>
      )}

      {/* Username Field */}
      <Text className="text-base font-semibold ml-1 mt-2">Username</Text>
      <TextInput
        className={`border px-3 py-2 bg-white rounded-lg mb-1 ${
          touched.username && validationErrors.username ? "border-red-500" : "border-gray-300"
        }`}
        style={{ fontSize: 18 }}
        placeholder="Enter username"
        value={username}
        onChangeText={setUsername}
        onBlur={() => handleBlur("username")}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoggingIn}
      />
      {renderFieldError("username")}

      {/* Password Field */}
      <Text className="text-base font-semibold ml-1 mt-2">Password</Text>
      <View className="flex-row items-center mb-1">
        <TextInput
          onChangeText={setPassword}
          onBlur={() => handleBlur("password")}
          style={{ fontSize: 18 }}
          placeholder="Password"
          spellCheck={false}
          value={password}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoggingIn}
          secureTextEntry={hidePassword}
          className={`border px-3 py-2 bg-white rounded-lg flex-1 ${
            touched.password && validationErrors.password ? "border-red-500" : "border-gray-300"
          }`}
        />

        <TouchableOpacity
          onPress={() => setHidePassword((prev) => !prev)}
          className="absolute right-2 p-1"
        >
          {!hidePassword ? <Eye size={20} /> : <EyeOff size={20} />}
        </TouchableOpacity>
      </View>
      {renderFieldError("password")}

      {/* Submit Button */}
      <View className="flex-row justify-center items-center mt-4">
        <TouchableOpacity
          disabled={!canSubmit}
          onPress={handleSubmit}
          className={`p-3 px-6 border rounded-lg flex-row items-center ${
            canSubmit ? "bg-blue-500" : "bg-gray-300"
          }`}
        >
          {isLoggingIn && (
            <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
          )}
          <Text className={`text-lg font-semibold ${canSubmit ? "text-white" : "text-gray-500"}`}>
            {isLoggingIn ? "Logging in..." : "Login"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Offline Warning */}
      {isOffline && (
        <Text className="text-amber-600 text-center mt-4">Login is disabled while offline</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
  },
  label: {
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
});
