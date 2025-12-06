import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AudiobookshelfAPI } from "../utils/AudiobookShelf/absAPIClass";
import { AudiobookshelfAuth } from "../utils/AudiobookShelf/absAuthClass";
import {
  absInitalize,
  cleanupAbsInstances,
  getAbsAPI,
  getAbsAuth,
} from "../utils/AudiobookShelf/absInit";
import { authEventEmitter } from "../utils/AudiobookShelf/authEventEmitter";
import {
  AuthError,
  AuthEvent,
  AuthEventPayload,
  AuthState,
  requiresUserAction,
} from "../utils/AudiobookShelf/authTypes";

interface AuthInfo {
  serverUrl: string | null;
  username: string | null;
  userEmail: string | null;
  userId: string | null;
}

interface AuthContextType {
  // Basic auth state
  isAuthenticated: boolean;
  isInitialized: boolean;
  hasStoredCredentials: boolean;
  authInfo: AuthInfo;

  // Detailed auth state (new)
  authState: AuthState;
  authError: AuthError | null;
  tokenExpiresAt: number | null;

  // Actions
  checkAuthStatus: () => Promise<void>;
  refreshAuthStatus: () => Promise<void>;
  getSafeAuthInstance: () => AudiobookshelfAuth | null;
  logout: () => Promise<void>;
  initializeAfterLogin: (queryClient?: any) => Promise<void>;

  // New actions
  clearAuthError: () => void;
  retryAuthentication: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Basic state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [authInfo, setAuthInfo] = useState<AuthInfo>({
    serverUrl: null,
    username: null,
    userEmail: null,
    userId: null,
  });

  // New detailed state
  const [authState, setAuthState] = useState<AuthState>(AuthState.CHECKING);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);

  // Track if we've subscribed to events
  const eventSubscriptionRef = useRef<(() => void) | null>(null);

  // Subscribe to auth events
  useEffect(() => {
    const handleAuthEvent = (payload: AuthEventPayload) => {
      console.log("AuthContext: Received auth event:", payload.event, payload.state);

      // Update auth state
      setAuthState(payload.state);

      // Update token expiry if provided
      if (payload.tokenExpiresAt) {
        setTokenExpiresAt(payload.tokenExpiresAt);
      }

      // Update error state
      if (payload.error) {
        setAuthError(payload.error);
      } else if (
        payload.event === AuthEvent.LOGIN_SUCCESS ||
        payload.event === AuthEvent.TOKEN_REFRESHED
      ) {
        // Clear error on success
        setAuthError(null);
      }

      // Update isAuthenticated based on state
      setIsAuthenticated(payload.state === AuthState.AUTHENTICATED);
    };

    // Subscribe to all auth events
    eventSubscriptionRef.current = authEventEmitter.onAll(handleAuthEvent);

    return () => {
      // Cleanup subscription
      if (eventSubscriptionRef.current) {
        eventSubscriptionRef.current();
        eventSubscriptionRef.current = null;
      }
    };
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      setAuthState(AuthState.CHECKING);

      // Check if we have stored credentials
      const hasCredentials = await AudiobookshelfAuth.hasStoredCredentials();
      const absURL = await AudiobookshelfAuth.getStoredURL();
      setHasStoredCredentials(hasCredentials);
      setAuthInfo((prev) => ({ ...prev, serverUrl: absURL }));

      if (hasCredentials) {
        // Check if currently authenticated (this will be true if auth is initialized and valid)
        const authenticated = AudiobookshelfAuth.isAssumedAuthedGlobal;
        setIsAuthenticated(authenticated);

        // If authenticated, get auth info and update state
        if (authenticated) {
          await updateAuthInfo();
          setAuthState(AuthState.AUTHENTICATED);
        } else {
          // Clear auth info if not authenticated
          setAuthInfo((prev) => ({
            ...prev,
            username: null,
            userEmail: null,
            userId: null,
          }));
          setAuthState(AuthState.UNAUTHENTICATED);
        }
      } else {
        setIsAuthenticated(false);
        setAuthInfo((prev) => ({
          ...prev,
          username: null,
          userEmail: null,
          userId: null,
        }));
        setAuthState(AuthState.UNAUTHENTICATED);
      }

      setIsInitialized(true);
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
      setHasStoredCredentials(false);
      setAuthInfo((prev) => ({
        ...prev,
        username: null,
        userEmail: null,
        userId: null,
      }));
      setAuthState(AuthState.UNAUTHENTICATED);
      setIsInitialized(true);
    }
  }, []); // Empty dependency array since this function doesn't depend on any state

  const updateAuthInfo = useCallback(async () => {
    try {
      const authInstance = getAbsAuth();

      setAuthInfo({
        serverUrl: authInstance.absURL || null,
        username: authInstance.username || null,
        userEmail: authInstance.userEmail || null,
        userId: authInstance.userId || null,
      });

      // Update token expiry
      if (authInstance.tokenExpiresAt) {
        setTokenExpiresAt(authInstance.tokenExpiresAt);
      }
    } catch (error) {
      console.warn("Could not get auth info:", error);
      setAuthInfo((prev) => ({
        ...prev,
        username: null,
        userEmail: null,
        userId: null,
      }));
    }
  }, []);

  useEffect(() => {
    console.log("Checking Auth Context FIRST");
    checkAuthStatus();
  }, []);

  const refreshAuthStatus = useCallback(async () => {
    await checkAuthStatus();
  }, [checkAuthStatus]);

  const getSafeAuthInstance = useCallback((): AudiobookshelfAuth | null => {
    if (!isAuthenticated) {
      return null;
    }

    try {
      return getAbsAuth();
    } catch (error) {
      console.warn("Could not get auth instance:", error);
      return null;
    }
  }, [isAuthenticated]);

  const initializeAfterLogin = useCallback(
    async (queryClient?: any): Promise<void> => {
      try {
        // Re-run the full initialization to create API instance with new auth
        await absInitalize(queryClient);

        // Update auth status after initialization
        await checkAuthStatus();

        console.log("Successfully initialized API after login");
      } catch (error) {
        console.error("Failed to initialize API after login:", error);
        // Update status anyway to reflect current state
        await checkAuthStatus();
      }
    },
    [checkAuthStatus]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      console.log("LOGOUT: Starting logout process");
      const authInstance = getSafeAuthInstance();
      console.log("LOGOUT: Got auth instance:", !!authInstance);

      // Perform server-side logout FIRST while we still have the instance
      if (authInstance) {
        console.log("LOGOUT: Calling authInstance.logout()");
        await authInstance.logout();
        console.log("LOGOUT: authInstance.logout() completed");
      }

      // Then clear state to prevent hooks from trying to access instances
      setIsAuthenticated(false);
      setHasStoredCredentials(false);
      setAuthState(AuthState.UNAUTHENTICATED);
      setAuthError(null);
      setTokenExpiresAt(null);
      setAuthInfo({
        serverUrl: authInstance?.absURL || null,
        username: null,
        userEmail: null,
        userId: null,
      });
      console.log("LOGOUT: State cleared");

      await checkAuthStatus();
      console.log("LOGOUT: checkAuthStatus completed");

      // Finally cleanup ABS instances
      console.log("LOGOUT: Calling cleanupAbsInstances()");
      cleanupAbsInstances();
      console.log("LOGOUT: cleanupAbsInstances completed");
    } catch (error) {
      console.error("LOGOUT: Error during logout:", error);

      // Still clear state and cleanup instances even if logout fails
      setIsAuthenticated(false);
      setHasStoredCredentials(false);
      setAuthState(AuthState.UNAUTHENTICATED);
      setAuthError(null);
      setTokenExpiresAt(null);
      setAuthInfo({
        serverUrl: null,
        username: null,
        userEmail: null,
        userId: null,
      });
      try {
        console.log("LOGOUT: Cleanup in error block");
        cleanupAbsInstances();
      } catch (cleanupError) {
        console.warn("LOGOUT: Failed to cleanup instances:", cleanupError);
      }
    }
  }, [getSafeAuthInstance]);

  // New action: Clear auth error
  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // New action: Retry authentication
  const retryAuthentication = useCallback(async () => {
    try {
      setAuthState(AuthState.CHECKING);
      setAuthError(null);

      // Try to get a valid token (this will trigger refresh if needed)
      const authInstance = await AudiobookshelfAuth.create();
      const token = await authInstance.getValidAccessToken();

      if (token) {
        setAuthState(AuthState.AUTHENTICATED);
        setIsAuthenticated(true);
        await updateAuthInfo();
      } else {
        setAuthState(AuthState.TOKEN_EXPIRED);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Retry authentication failed:", error);
      setAuthState(AuthState.TOKEN_EXPIRED);
      setIsAuthenticated(false);
    }
  }, [updateAuthInfo]);

  const value: AuthContextType = {
    // Basic state
    isAuthenticated,
    isInitialized,
    hasStoredCredentials,
    authInfo,

    // Detailed state
    authState,
    authError,
    tokenExpiresAt,

    // Actions
    checkAuthStatus,
    refreshAuthStatus,
    getSafeAuthInstance,
    logout,
    initializeAfterLogin,
    clearAuthError,
    retryAuthentication,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Hook to get detailed auth state for UI rendering decisions
 */
export const useAuthState = () => {
  const { authState, authError, tokenExpiresAt, isAuthenticated } = useAuth();

  return {
    authState,
    authError,
    tokenExpiresAt,
    isAuthenticated,
    // Helper properties
    isChecking: authState === AuthState.CHECKING,
    isTokenExpired: authState === AuthState.TOKEN_EXPIRED,
    hasNetworkError: authState === AuthState.NETWORK_ERROR,
    requiresUserAction: requiresUserAction(authState),
    // Time until token expires (in ms), null if no token
    timeUntilExpiry: tokenExpiresAt ? tokenExpiresAt - Date.now() : null,
  };
};

// Safe version of useAbsAPI that doesn't throw when not initialized
export const useSafeAbsAPI = () => {
  const { isAuthenticated } = useAuth();

  // Always return null if not authenticated
  // This ensures consistent hook behavior
  if (!isAuthenticated) {
    return null;
  }

  // Even when authenticated, still safely handle the case where instances might be cleared
  try {
    const api = getAbsAPI() as AudiobookshelfAPI;
    return api;
  } catch (error) {
    return null;
  }
};
