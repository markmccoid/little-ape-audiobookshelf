import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { queryClient } from "../utils/queryClient";
import AudiobookStreamer from "../utils/rn-trackplayer/AudiobookStreamer";

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  networkType: string | null;
  isOffline: boolean;
  connectionQuality: "excellent" | "good" | "poor" | "offline";
  /** Trigger an immediate network state refresh - useful when API errors indicate offline */
  refreshNetworkState: () => void;
}

// Module-level callback for triggering refresh from outside React components
let networkRefreshCallback: (() => void) | null = null;

/**
 * Trigger a network state refresh from outside React components.
 * Useful when API calls fail with NetworkError to immediately update the banner.
 * Safe to call even if NetworkProvider isn't mounted yet.
 */
export const triggerNetworkRefresh = (): void => {
  if (networkRefreshCallback) {
    networkRefreshCallback();
  } else {
    // Fallback: if provider not mounted yet, do a direct NetInfo check
    // This won't update React state but will at least log
    console.log("triggerNetworkRefresh called but provider not mounted");
  }
};

const NetworkContext = createContext<NetworkContextType | null>(null);

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [networkState, setNetworkState] = useState<NetInfoState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const wasOfflineRef = useRef<boolean>(false);

  // Function to force an immediate network state refresh
  const refreshNetworkState = React.useCallback(() => {
    console.log("🔄 Network state refresh triggered (API error detected)");
    NetInfo.fetch().then((state) => {
      console.log("🔄 Immediate network check result:", {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
      setNetworkState(state);
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? null);
      wasOfflineRef.current = !(state.isConnected && state.isInternetReachable !== false);
    });
  }, []);

  // Register the refresh callback for external use
  useEffect(() => {
    networkRefreshCallback = refreshNetworkState;
    return () => {
      networkRefreshCallback = null;
    };
  }, [refreshNetworkState]);

  useEffect(() => {
    // Configure NetInfo to actively check internet reachability
    // This enables detection of internet connectivity issues (firewall blocks, captive portals, etc.)
    // Without this, NetInfo only detects network interface changes (WiFi on/off)
    NetInfo.configure({
      reachabilityUrl: "https://clients3.google.com/generate_204",
      reachabilityTest: async (response) => response.status === 204,
      reachabilityShortTimeout: 5 * 1000, // 5 seconds for initial check
      reachabilityLongTimeout: 30 * 1000, // 30 seconds between checks
      reachabilityRequestTimeout: 10 * 1000, // 10 seconds timeout per request
      useNativeReachability: false, // Use HTTP check instead of native for more reliable detection
    });

    // Get initial network state
    NetInfo.fetch().then((state) => {
      setNetworkState(state);
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? null);
      wasOfflineRef.current = !(state.isConnected && state.isInternetReachable !== false);
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nowConnected = state.isConnected && state.isInternetReachable !== false;
      const prevOffline = wasOfflineRef.current;

      setNetworkState(state);
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? null);

      // Log network changes for debugging
      console.log("🌐 Network state changed:", {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        calculatedOffline: !(state.isConnected ?? false),
      });

      // If we just reconnected after being offline, process sync queue and refresh data
      if (prevOffline && nowConnected) {
        console.log("Network reconnected - triggering sync queue processing and data refresh...");

        // Process sync queue after a short delay to ensure connection is stable
        setTimeout(() => {
          try {
            const streamer = AudiobookStreamer.getInstance();
            streamer.processQueueOnReconnection().catch((error) => {
              console.error("Error processing sync queue on reconnection:", error);
            });
          } catch (error) {
            // AudiobookStreamer may not be initialized yet
            console.log("AudiobookStreamer not initialized, skipping queue processing");
          }

          // Invalidate books query to refresh Library tab data
          // This is especially important if the app was started while offline
          console.log("🔄 Invalidating books queries to refresh Library tab data...");
          queryClient.invalidateQueries({ queryKey: ["books"] });
          queryClient.invalidateQueries({ queryKey: ["bookShelves"] });
          queryClient.invalidateQueries({ queryKey: ["booksInProgress"] });
        }, 1000); // 1 second delay
      }

      wasOfflineRef.current = !nowConnected;
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Aggressive reconnection detection when offline
  // When we're offline, NetInfo's normal polling may be slow (especially with proxy tools like LuLu)
  // This adds a more frequent check to detect reconnection faster
  // Note: We compute offline state directly here instead of using the derived value below
  const computedIsOffline = !isConnected || isInternetReachable === false;

  useEffect(() => {
    if (!computedIsOffline) return;

    console.log("🔄 Starting aggressive reconnection polling (every 10s)");

    const intervalId = setInterval(() => {
      console.log("🔄 Polling for reconnection...");
      NetInfo.fetch().then((state) => {
        if (state.isConnected && state.isInternetReachable !== false) {
          console.log("🔄 Reconnection detected via polling!");
          setNetworkState(state);
          setIsConnected(state.isConnected ?? false);
          setIsInternetReachable(state.isInternetReachable ?? null);
        }
      });
    }, 30000); // Check every 30 seconds

    return () => {
      console.log("🔄 Stopping aggressive reconnection polling");
      clearInterval(intervalId);
    };
  }, [computedIsOffline]);

  // Determine if we're truly offline
  // Now that we have reachability configured, we can trust both signals:
  // - isConnected: tells us if device has network connection (WiFi/cellular)
  // - isInternetReachable: tells us if internet is actually accessible (checks Google's 204 endpoint)
  // We're offline if: no network connection OR internet is definitely unreachable
  // Note: null means reachability check hasn't completed yet, we assume online in that case
  const isOffline = !isConnected || isInternetReachable === false;

  // Determine connection quality based on network type and state
  const getConnectionQuality = (): "excellent" | "good" | "poor" | "offline" => {
    if (isOffline) return "offline";

    if (!networkState) return "good"; // Default until we know

    const { type, details } = networkState;

    // WiFi is generally excellent
    if (type === "wifi") return "excellent";

    // Cellular - check generation if available
    if (type === "cellular" && details && "cellularGeneration" in details) {
      const generation = details.cellularGeneration;
      if (generation === "4g" || generation === "5g") return "excellent";
      if (generation === "3g") return "good";
      return "poor";
    }

    // Default to good if connected but unknown type
    return "good";
  };

  const value: NetworkContextType = {
    isConnected,
    isInternetReachable,
    networkType: networkState?.type ?? null,
    isOffline,
    connectionQuality: getConnectionQuality(),
    refreshNetworkState,
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
};

// Safe version that doesn't throw
export const useSafeNetwork = (): NetworkContextType | null => {
  return useContext(NetworkContext);
};
