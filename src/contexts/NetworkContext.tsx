import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  networkType: string | null;
  isOffline: boolean;
  connectionQuality: "excellent" | "good" | "poor" | "offline";
}

const NetworkContext = createContext<NetworkContextType | null>(null);

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [networkState, setNetworkState] = useState<NetInfoState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);

  useEffect(() => {
    // Get initial network state
    NetInfo.fetch().then((state) => {
      setNetworkState(state);
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? null);
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkState(state);
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? null);

      // Log network changes for debugging
      console.log("Network state changed:", {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Determine if we're truly offline
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
