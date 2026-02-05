import { QueryClient } from "@tanstack/react-query";

// import { v4 as uuidv4 } from "uuid";
import { triggerNetworkRefresh } from "../../contexts/NetworkContext";
import { AudiobookshelfAPI } from "./absAPIClass";
import { AudiobookshelfAuth } from "./absAuthClass";
import { NetworkError, OfflineError } from "./abstypes";
import { checkIsOnlineStrict } from "../networkHelper";

import "react-native-random-uuid";

let absAuth: AudiobookshelfAuth | undefined;
// Create a real API instance
let apiInstance: AudiobookshelfAPI | undefined;
let absAPIProxy: AudiobookshelfAPI | undefined;
//# ------------------------------------------------------------------------
//# absInitialize - to be called on app startup
//# This will initialize the absAuth class, the abs API class and
//# create a proxy "absAPI" for the API to be used.
//# In react components use hook use useAbsAPI()
//# getAbsAPI() will also return the api class instance
//# getAbsAuht() will return the Auth class instance
//# ------------------------------------------------------------------------

export const absInitalize = async (queryClient?: QueryClient) => {
  // Create the ABS Auth instance
  // If tokens and URL stored in secure storage we are good to go
  //!! TEMP CODE TO GET DL Bookshelf in for testing
  // const allBookshelves = useSettingsStore.getState().allBookshelves;
  // useSettingsStore.setState({
  //   allBookshelves: [
  //     ...allBookshelves,
  //     {
  //       id: "downloaded",
  //       label: "Downloaded",
  //       type: "custom",
  //       position: allBookshelves.length,
  //       displayed: false,
  //     },
  //   ],
  // });
  const hasStoredCredentials = await AudiobookshelfAuth.hasStoredCredentials();
  if (!hasStoredCredentials) {
    console.log("No stored credentials found, skipping ABS initialization");
    return false;
  }

  try {
    // Clear existing instances to avoid stale references
    absAuth = undefined;
    apiInstance = undefined;
    absAPIProxy = undefined;

    // Create fresh instances
    absAuth = await AudiobookshelfAuth.create();
    // Creates the instance with absAuth
    apiInstance = await AudiobookshelfAPI.create();
  } catch (error) {
    console.error("Failed to initialize ABS:", error);
    return false;
  }

  //~ ------------------------------------------------------------------------
  //~ Create the absAPIProxy Proxy object
  //~ This will be used to call all of the abs API end points
  //~ ------------------------------------------------------------------------
  // Wrap it in a Proxy
  absAPIProxy = new Proxy(apiInstance, {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver);

      // If it's a function, wrap it
      if (typeof orig === "function") {
        return async (...args: any[]) => {
          // Ensure auth is initialized before any API call
          const isAuthed = AudiobookshelfAuth.isAssumedAuthedGlobal;
          // console.log(`PROXY: Checking auth for method ${String(prop)}, isAuthed: ${isAuthed}`);
          if (!isAuthed) {
            // Log warning but don't throw - return graceful response
            // console.warn(`PROXY: API call attempted while not authenticated: ${String(prop)}`);

            // Return appropriate empty response based on method
            const methodName = String(prop);
            if (methodName.includes("get") && methodName.includes("Library")) {
              return []; // Return empty array for library items
            } else if (methodName.includes("get") && methodName.includes("Progress")) {
              return null; // Return null for progress
            } else if (methodName.includes("get") && methodName.includes("Me")) {
              return null; // Return null for user info
            } else {
              // For other methods, return a resolved promise with null
              return Promise.resolve(null);
            }
          }

          // Call the original method
          // console.log(`PROXY: Executing method ${String(prop)}`);
          try {
            return await orig.apply(target, args);
          } catch (error) {
            const methodName = String(prop);
            const isNetworkError = error instanceof NetworkError || error instanceof OfflineError;

            // Use console.warn for network errors (expected when offline)
            // Use console.error only for unexpected errors
            if (isNetworkError) {
              console.log(`PROXY: Network error in ${methodName} (offline mode)`);
              // Trigger immediate network state refresh to update the banner
              triggerNetworkRefresh();
            } else {
              console.error(`PROXY: Unexpected error in ${methodName}:`, error);
            }

            // Handle specific method types gracefully
            // For library-related methods, return empty arrays
            if (methodName.includes("get") && methodName.includes("Library")) {
              return [];
            }
            // For getLibraryItems specifically
            else if (methodName === "getLibraryItems") {
              return [];
            }
            // For progress-related methods
            else if (methodName.includes("get") && methodName.includes("Progress")) {
              return [];
            }
            // For items-related methods
            else if (methodName.includes("get") && methodName.includes("Items")) {
              return [];
            }
            // For book shelves
            else if (methodName.includes("get") && methodName.includes("Shelves")) {
              return [];
            }
            // For other get methods, return null
            else if (methodName.startsWith("get")) {
              return null;
            }
            // For other methods, return a resolved promise with null
            else {
              return Promise.resolve(null);
            }
          }
        };
      }

      // Otherwise just return the property
      return orig;
    },
  });
  if (AudiobookshelfAuth.isAssumedAuthedGlobal && queryClient) {
    try {
      console.log("PREWARMING BOOKS CACHE");
      prewarmBooksCache(queryClient);
    } catch (e) {
      console.log("PREWARM Book Cache Error", e);
    }
  }
  return true;
};

/**
 * Check if the ABS API has been initialized
 * This can be used to avoid calling getAbsAPI when it would return a mock
 */
export const isAbsAPIInitialized = (): boolean => {
  return absAPIProxy !== undefined;
};

//!! Tanstack Query Version
export async function prewarmBooksCache(queryClient: QueryClient) {
  const absAPI = useAbsAPI();
  const activeLibraryId = absAPI.getActiveLibraryId();

  const isOnline = await checkIsOnlineStrict();
  if (!isOnline) {
    console.warn("prewarmBooksCache: Offline, skipping cache prewarming");
    return;
  }

  // Only prewarm cache if we have a valid library ID
  if (!activeLibraryId) {
    console.warn("prewarmBooksCache: No active library ID, skipping cache prewarming");
    return;
  }

  try {
    await queryClient.prefetchQuery({
      queryKey: ["books", activeLibraryId],
      queryFn: async () => await absAPI.getLibraryItems(),
      staleTime: 1000 * 60 * 5,
    });
  } catch (error) {
    console.warn("prewarmBooksCache: Failed to prewarm cache, but continuing:", error);
    // Don't throw - let the app continue even if cache prewarming fails
  }
}

// This is so we don't need to await when getting the absAuth instance
// We expect that when called the absInitialize will have already initialized the absAuth instance
export const getAbsAuth = (): AudiobookshelfAuth => {
  if (!absAuth) {
    throw new Error("ABS Auth not initialized. Call absInitialize() first.");
  }
  return absAuth;
};

export const getAbsAPI = (): AudiobookshelfAPI => {
  if (!absAPIProxy) {
    // This is an expected state during logout/login transitions, not an error
    console.log("getAbsAPI: absAPI not initialized, returning mock API");
    // Instead of throwing, create a mock API that returns empty responses
    // This allows the app to continue running even when not authenticated
    return createMockAPI();
  }
  return absAPIProxy;
};

// Create a mock API that returns appropriate empty responses
function createMockAPI(): AudiobookshelfAPI {
  const mockAPI = {} as AudiobookshelfAPI;

  // Add mock implementations for common methods
  const mockMethods = [
    "getLibraries",
    "getLibraryItems",
    "getItemsInProgress",
    "getBookShelves",
    "getMe",
    "getUserInfo",
    "getBookProgress",
    "getItemDetails",
  ];

  mockMethods.forEach((method) => {
    (mockAPI as any)[method] = async () => {
      console.log(`MOCK API: ${method} called, returning empty response`);
      if (method.includes("get") && method.includes("Library")) {
        return [];
      } else {
        return null;
      }
    };
  });

  // Add mock for setActiveLibraryId
  mockAPI.setActiveLibraryId = () => {
    console.log("MOCK API: setActiveLibraryId called, doing nothing");
  };

  mockAPI.getActiveLibraryId = () => {
    console.log("MOCK API: getActiveLibraryId called, returning undefined");
    return undefined;
  };

  return mockAPI;
}

export function useAbsAPI(): AudiobookshelfAPI {
  // This will throw if not initialized, same as your getter
  return getAbsAPI();
}

// Cleanup function for logout
export const cleanupAbsInstances = () => {
  console.log("cleanupAbsInstances: Starting cleanup");
  console.log("cleanupAbsInstances: absAuth exists before cleanup:", !!absAuth);
  console.log("cleanupAbsInstances: apiInstance exists before cleanup:", !!apiInstance);
  console.log("cleanupAbsInstances: absAPIProxy exists before cleanup:", !!absAPIProxy);

  absAuth = undefined;
  apiInstance = undefined;
  absAPIProxy = undefined;

  console.log("cleanupAbsInstances: ABS instances cleaned up");
};

// Reusable function to check authentication status safely
export const isUserAuthenticated = (): boolean => {
  try {
    const auth = getAbsAuth();
    return !!(auth?.userId && auth?.absURL);
  } catch (error) {
    console.log("isUserAuthenticated: Not authenticated -", (error as Error).message);
    return false;
  }
};

// Reusable function to get user info safely
export const getAuthenticatedUser = (): { userId?: string; serverUrl?: string } | null => {
  try {
    const auth = getAbsAuth();
    if (!auth?.userId || !auth?.absURL) {
      return null;
    }
    return {
      userId: auth.userId,
      serverUrl: auth.absURL,
    };
  } catch (error) {
    console.log("getAuthenticatedUser: Not authenticated -", (error as Error).message);
    return null;
  }
};
