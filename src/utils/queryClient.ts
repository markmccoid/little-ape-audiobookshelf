import NetInfo from "@react-native-community/netinfo";
import { QueryClient } from "@tanstack/react-query";

// Online manager for React Query
const onlineManager = {
  setEventListener: (setOnline: (online: boolean) => void) => {
    return NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected && state.isInternetReachable !== false);
    });
  },
};

// Create a single instance of the query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error && typeof error === "object" && "message" in error) {
          if (error.message.includes("Not authenticated")) {
            return false;
          }
        }
        // Retry network errors up to 3 times
        return failureCount < 3;
      },
      // Serve stale data when offline
      networkMode: "offlineFirst",
      // // Don't refetch on window focus when offline
      // refetchOnWindowFocus: (query) => {
      //   // You can customize this per query if needed
      //   return query.state.data !== undefined;
      // },
    },
    mutations: {
      retry: 1,
      // Only retry mutations on network errors, not auth errors
      networkMode: "online",
    },
  },
});

// Set up the online manager
if (typeof onlineManager.setEventListener === "function") {
  // This is for React Query v5+
  // If you're using v4, you might need a different approach
  import("@tanstack/react-query").then(({ onlineManager: qcOnlineManager }) => {
    if (qcOnlineManager?.setEventListener) {
      qcOnlineManager.setEventListener(onlineManager.setEventListener);
    }
  });
}

// Helper function to get the query client instance
export const getQueryClient = () => queryClient;
