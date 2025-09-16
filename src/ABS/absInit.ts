import { QueryClient } from "@tanstack/react-query";

import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { Collection, createCollection } from "@tanstack/react-db";

// import { v4 as uuidv4 } from "uuid";
import { ABSGetLibraryItem, AudiobookshelfAPI } from "./absAPIClass";
import { AudiobookshelfAuth } from "./absAuthClass";

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
  absAuth = await AudiobookshelfAuth.create();
  // Creates the instance with absAuth
  apiInstance = await AudiobookshelfAPI.create();

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
        return (...args: any[]) => {
          // Ensure auth is initialized before any API call
          // const auth = await AudiobookshelfAuth.create();
          // const isAuthed = await auth.isAuthenticated();
          const isAuthed = AudiobookshelfAuth.isAssumedAuthedGlobal;
          if (!isAuthed) {
            console.log("Not authenticated. Please login first.");
          }

          // Call the original method
          return orig.apply(target, args);
        };
      }

      // Otherwise just return the property
      return orig;
    },
  });
  if (AudiobookshelfAuth.isAssumedAuthedGlobal && queryClient) {
    try {
      prewarmBooksCache(queryClient);

      Collections.createBookCollection(queryClient);
    } catch (e) {
      console.log("PREWARM Book Cache Error", e);
    }
  }
};

//!! Tanstack DB Version
// import { QueryClient } from "@tanstack/react-query";
// import { createCollection, queryCollectionOptions } from "your-collection-lib";
// import { useAbsAPI } from "@/hooks/useAbsAPI"; // adjust import

export class Collections {
  private static bookCollection: Collection<ABSGetLibraryItem> | null = null;

  static createBookCollection(queryClient: QueryClient) {
    if (this.bookCollection) return this.bookCollection;

    const absAPI = getAbsAPI();
    const activeLibraryId = absAPI.getActiveLibraryId();

    this.bookCollection = createCollection<ABSGetLibraryItem>(
      queryCollectionOptions({
        queryKey: ["books_c", activeLibraryId],
        queryFn: () => absAPI.getLibraryItems({ libraryId: activeLibraryId }),
        queryClient,
        getKey: (item) => item.id,
      })
    );

    return this.bookCollection;
  }

  static getBookCollection() {
    if (!this.bookCollection) {
      throw new Error("Book collection has not been created yet.");
    }
    return this.bookCollection;
  }
}

//!! Tanstack Query Version
export async function prewarmBooksCache(queryClient: QueryClient) {
  const absAPI = useAbsAPI();
  const activeLibraryId = absAPI.getActiveLibraryId();

  await queryClient.prefetchQuery({
    queryKey: ["books", activeLibraryId],
    queryFn: () => absAPI.getLibraryItems({ libraryId: activeLibraryId }),
    staleTime: 1000 * 60 * 5,
  });
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
  if (!absAPIProxy) throw new Error("absAPI not initialized. Call absInitialize() first.");
  return absAPIProxy;
};

export function useAbsAPI(): AudiobookshelfAPI {
  // This will throw if not initialized, same as your getter
  return getAbsAPI();
}
