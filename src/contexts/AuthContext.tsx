import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
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

interface AuthInfo {
  serverUrl: string | null;
  username: string | null;
  userEmail: string | null;
  userId: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isInitialized: boolean;
  hasStoredCredentials: boolean;
  authInfo: AuthInfo;
  checkAuthStatus: () => Promise<void>;
  refreshAuthStatus: () => Promise<void>;
  getSafeAuthInstance: () => AudiobookshelfAuth | null;
  logout: () => Promise<void>;
  initializeAfterLogin: (queryClient?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [authInfo, setAuthInfo] = useState<AuthInfo>({
    serverUrl: null,
    username: null,
    userEmail: null,
    userId: null,
  });

  const checkAuthStatus = useCallback(async () => {
    try {
      // Check if we have stored credentials
      const hasCredentials = await AudiobookshelfAuth.hasStoredCredentials();
      const absURL = await AudiobookshelfAuth.getStoredURL();
      setHasStoredCredentials(hasCredentials);
      setAuthInfo((prev) => ({ ...prev, serverUrl: absURL }));

      if (hasCredentials) {
        // Check if currently authenticated (this will be true if auth is initialized and valid)
        const authenticated = AudiobookshelfAuth.isAssumedAuthedGlobal;
        setIsAuthenticated(authenticated);

        // If authenticated, get auth info
        if (authenticated) {
          await updateAuthInfo();
        } else {
          // Clear auth info if not authenticated
          setAuthInfo((prev) => ({
            ...prev,
            username: null,
            userEmail: null,
            userId: null,
          }));
        }
      } else {
        setIsAuthenticated(false);
        setAuthInfo((prev) => ({
          ...prev,
          username: null,
          userEmail: null,
          userId: null,
        }));
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

  const value: AuthContextType = {
    isAuthenticated,
    isInitialized,
    hasStoredCredentials,
    authInfo,
    checkAuthStatus,
    refreshAuthStatus,
    getSafeAuthInstance,
    logout,
    initializeAfterLogin,
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
