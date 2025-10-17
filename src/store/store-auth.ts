import { AuthenticationError, AuthTokens } from "@/src/utils/AudiobookShelf/abstypes";
import { create } from "zustand";

export type AuthState = "idle" | "authenticating" | "authenticated" | "error" | "expired" | "logged_out";

export interface AuthError {
  message: string;
  userFriendlyMessage: string;
  recoverySteps: string[];
  timestamp: number;
  context: string; // Where the error occurred (login, refresh, etc.)
  code?: string;
  retryable: boolean;
}

export interface AuthDebugInfo {
  lastTokenRefresh: number | null;
  tokenExpiry: number | null;
  serverUrl: string | null;
  username: string | null;
  failedAttempts: number;
  lastErrorContext: string | null;
}

interface AuthStore {
  // State
  authState: AuthState;
  lastError: AuthError | null;
  errorHistory: AuthError[];
  debugInfo: AuthDebugInfo;

  // Actions
  setAuthState: (state: AuthState) => void;
  setLastError: (error: AuthError | null) => void;
  addErrorToHistory: (error: AuthError) => void;
  clearErrors: () => void;
  updateDebugInfo: (info: Partial<AuthDebugInfo>) => void;

  // Error handling helpers
  handleAuthError: (error: Error, context: string) => void;
  incrementFailedAttempts: () => void;
  resetFailedAttempts: () => void;

  // User-friendly messages
  getUserFriendlyMessage: () => string | null;
  getRecoverySteps: () => string[];

  // Debug helpers
  clearErrorHistory: () => void;
  exportDebugInfo: () => string;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  authState: "idle",
  lastError: null,
  errorHistory: [],
  debugInfo: {
    lastTokenRefresh: null,
    tokenExpiry: null,
    serverUrl: null,
    username: null,
    failedAttempts: 0,
    lastErrorContext: null,
  },

  // State setters
  setAuthState: (state) => {
    console.log("🏪 AuthStore: setAuthState called with:", state);
    console.log("   Previous state:", useAuthStore.getState().authState);
    set({ authState: state });
    console.log("   New state:", useAuthStore.getState().authState);
  },

  setLastError: (error) => set({ lastError: error }),

  addErrorToHistory: (error) => set((state) => ({
    errorHistory: [...state.errorHistory.slice(-9), error] // Keep last 10 errors
  })),

  clearErrors: () => set({ lastError: null, errorHistory: [] }),

  updateDebugInfo: (info) => set((state) => ({
    debugInfo: { ...state.debugInfo, ...info }
  })),

  // Error handling
  handleAuthError: (error: Error, context: string) => {
    console.log("🏪 AuthStore: handleAuthError called");
    console.log("   Error:", error.message);
    console.log("   Context:", context);

    const timestamp = Date.now();

    // Determine if this is a retryable error
    const retryable = !error.message.includes("Invalid username or password") &&
                     !error.message.includes("Session expired");

    // Create user-friendly message based on error type and context
    let userFriendlyMessage = "";
    let recoverySteps: string[] = [];

    if (error instanceof AuthenticationError) {
      switch (context) {
        case "login":
          userFriendlyMessage = "Login failed";
          recoverySteps = [
            "Check your username and password",
            "Verify the server URL is correct",
            "Ensure you have an internet connection"
          ];
          break;
        case "refresh":
          userFriendlyMessage = "Session refresh failed";
          recoverySteps = [
            "Try logging out and back in",
            "Check your internet connection",
            "Contact support if the problem persists"
          ];
          break;
        case "token_validation":
          userFriendlyMessage = "Authentication expired";
          recoverySteps = [
            "Please log in again",
            "Your session may have expired due to inactivity"
          ];
          break;
        default:
          userFriendlyMessage = "Authentication error";
          recoverySteps = [
            "Try logging out and back in",
            "Check your internet connection",
            "Restart the app if the problem persists"
          ];
      }
    } else {
      userFriendlyMessage = "Connection error";
      recoverySteps = [
        "Check your internet connection",
        "Verify the server is accessible",
        "Try again in a moment"
      ];
    }

    const authError: AuthError = {
      message: error.message,
      userFriendlyMessage,
      recoverySteps,
      timestamp,
      context,
      code: (error as any).code,
      retryable
    };

    const newAuthState = retryable ? "error" : "expired";
    console.log("   🔄 Setting authState to:", newAuthState);

    // Update store
    set((state) => {
      console.log("   📝 Updating store state, previous authState:", state.authState);
      const newState = {
        authState: newAuthState,
        lastError: authError,
        errorHistory: [...state.errorHistory.slice(-9), authError],
        debugInfo: {
          ...state.debugInfo,
          failedAttempts: state.debugInfo.failedAttempts + 1,
          lastErrorContext: context
        }
      };
      console.log("   ✅ New store state authState:", newState.authState);
      return newState;
    });
  },

  incrementFailedAttempts: () => set((state) => ({
    debugInfo: {
      ...state.debugInfo,
      failedAttempts: state.debugInfo.failedAttempts + 1
    }
  })),

  resetFailedAttempts: () => set((state) => ({
    debugInfo: {
      ...state.debugInfo,
      failedAttempts: 0
    }
  })),

  // User-friendly getters
  getUserFriendlyMessage: () => {
    const { lastError } = get();
    return lastError?.userFriendlyMessage || null;
  },

  getRecoverySteps: () => {
    const { lastError } = get();
    return lastError?.recoverySteps || [];
  },

  // Debug helpers
  clearErrorHistory: () => set({ errorHistory: [] }),

  exportDebugInfo: () => {
    const { authState, lastError, errorHistory, debugInfo } = get();
    return JSON.stringify({
      authState,
      lastError,
      errorHistory,
      debugInfo,
      timestamp: Date.now()
    }, null, 2);
  }
}));

// Selectors for common combinations
export const useAuthState = () => useAuthStore((state) => state.authState);
export const useAuthError = () => useAuthStore((state) => state.lastError);
export const useAuthDebugInfo = () => useAuthStore((state) => state.debugInfo);
export const useErrorHistory = () => useAuthStore((state) => state.errorHistory);