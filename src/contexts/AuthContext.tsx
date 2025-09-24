import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { AudiobookshelfAuth } from '../ABS/absAuthClass';

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
      setHasStoredCredentials(hasCredentials);
      
      if (hasCredentials) {
        // Check if currently authenticated (this will be true if auth is initialized and valid)
        const authenticated = AudiobookshelfAuth.isAssumedAuthedGlobal;
        setIsAuthenticated(authenticated);
        
        // If authenticated, get auth info
        if (authenticated) {
          await updateAuthInfo();
        } else {
          // Clear auth info if not authenticated
          setAuthInfo({
            serverUrl: null,
            username: null,
            userEmail: null,
            userId: null,
          });
        }
      } else {
        setIsAuthenticated(false);
        setAuthInfo({
          serverUrl: null,
          username: null,
          userEmail: null,
          userId: null,
        });
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setHasStoredCredentials(false);
      setAuthInfo({
        serverUrl: null,
        username: null,
        userEmail: null,
        userId: null,
      });
      setIsInitialized(true);
    }
  }, []); // Empty dependency array since this function doesn't depend on any state
  
  const updateAuthInfo = useCallback(async () => {
    try {
      const { getAbsAuth } = require('../ABS/absInit');
      const authInstance = getAbsAuth();
      
      setAuthInfo({
        serverUrl: authInstance.absURL || null,
        username: authInstance.username || null,
        userEmail: authInstance.userEmail || null,
        userId: authInstance.userId || null,
      });
    } catch (error) {
      console.warn('Could not get auth info:', error);
      setAuthInfo({
        serverUrl: null,
        username: null,
        userEmail: null,
        userId: null,
      });
    }
  }, []);

  useEffect(() => {
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
      const { getAbsAuth } = require('../ABS/absInit');
      return getAbsAuth();
    } catch (error) {
      console.warn('Could not get auth instance:', error);
      return null;
    }
  }, [isAuthenticated]);
  
  const initializeAfterLogin = useCallback(async (queryClient?: any): Promise<void> => {
    try {
      // Re-run the full initialization to create API instance with new auth
      const { absInitalize } = require('../ABS/absInit');
      
      await absInitalize(queryClient);
      
      // Update auth status after initialization
      await checkAuthStatus();
      
      console.log('Successfully initialized API after login');
    } catch (error) {
      console.error('Failed to initialize API after login:', error);
      // Update status anyway to reflect current state
      await checkAuthStatus();
    }
  }, [checkAuthStatus]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      const authInstance = getSafeAuthInstance();
      if (authInstance) {
        await authInstance.logout();
      }
      
      // Cleanup ABS instances
      const { cleanupAbsInstances } = require('../ABS/absInit');
      cleanupAbsInstances();
      
      // Clear all state
      setIsAuthenticated(false);
      setHasStoredCredentials(false);
      setAuthInfo({
        serverUrl: null,
        username: null,
        userEmail: null,
        userId: null,
      });
      
      // Don't call checkAuthStatus here to avoid potential loops
      // The state is already cleared above
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Still cleanup instances and clear local state even if logout fails
      try {
        const { cleanupAbsInstances } = require('../ABS/absInit');
        cleanupAbsInstances();
      } catch (cleanupError) {
        console.warn('Failed to cleanup instances:', cleanupError);
      }
      
      setIsAuthenticated(false);
      setHasStoredCredentials(false);
      setAuthInfo({
        serverUrl: null,
        username: null,
        userEmail: null,
        userId: null,
      });
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Safe version of useAbsAPI that doesn't throw when not initialized
export const useSafeAbsAPI = () => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return null;
  }
  
  try {
    // Import here to avoid circular dependencies
    const { getAbsAPI } = require('../ABS/absInit');
    return getAbsAPI();
  } catch (error) {
    console.warn('AbsAPI not initialized:', error);
    return null;
  }
};