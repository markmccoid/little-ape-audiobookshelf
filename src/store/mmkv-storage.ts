import { MMKV } from "react-native-mmkv";
import { StateStorage } from "zustand/middleware";

/**
 * Shared MMKV storage instance for all Zustand stores.
 * Each store uses a unique key (e.g., "books-storage", "filters-storage")
 * to maintain complete data isolation within this single database.
 */
const appMMKV = new MMKV({
  id: "app-storage",
  encryptionKey: "app-encryption-key", // Optional: Add encryption
});

// Create a storage object that implements StateStorage interface for Zustand persist
export const mmkvStorage: StateStorage = {
  setItem: (name, value) => {
    return appMMKV.set(name, value);
  },
  getItem: (name) => {
    const value = appMMKV.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    return appMMKV.delete(name);
  },
};

// Export the MMKV instance if you need direct access elsewhere
export { appMMKV };
