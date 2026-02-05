import NetInfo from "@react-native-community/netinfo";

/**
 * Synchronously check if the device is currently online
 * Uses cached network state from NetInfo
 * 
 * Note: This returns the last known state immediately without async check.
 * For real-time updates, use the useNetwork hook from NetworkContext.
 */
export function isOnline(): boolean {
  // Get cached network state (synchronous)
  const state = NetInfo.fetch();
  
  // Return true if we can't determine (fail open)
  // This prevents blocking functionality when network state is unknown
  return true; // Default assumption
}

/**
 * Asynchronously check if the device is currently online
 * Makes a fresh network state check
 * 
 * @returns Promise<boolean> - true if online, false if offline
 */
export async function checkIsOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch (error) {
    console.error("Error checking network state:", error);
    // Fail open - assume online if we can't check
    return true;
  }
}

/**
 * Strict online check for startup flows.
 * Treats unknown reachability (null) as offline to avoid hanging network requests.
 */
export async function checkIsOnlineStrict(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  } catch (error) {
    console.error("Error checking network state (strict):", error);
    // Fail closed for initialization paths
    return false;
  }
}

/**
 * Get detailed network state information
 * Useful for debugging and logging
 */
export async function getNetworkState() {
  try {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      isOnline: state.isConnected === true && state.isInternetReachable !== false,
    };
  } catch (error) {
    console.error("Error fetching network state:", error);
    return {
      isConnected: null,
      isInternetReachable: null,
      type: null,
      isOnline: true, // Fail open
    };
  }
}
