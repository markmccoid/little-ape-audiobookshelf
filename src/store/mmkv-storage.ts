import { MMKV } from 'react-native-mmkv'
import { StateStorage } from 'zustand/middleware'

// Create MMKV instance for settings storage
const settingsMMKV = new MMKV({
  id: 'settings-storage',
  encryptionKey: 'settings-encryption-key', // Optional: Add encryption
})

// Create a storage object that implements StateStorage interface for Zustand persist
export const mmkvStorage: StateStorage = {
  setItem: (name, value) => {
    return settingsMMKV.set(name, value)
  },
  getItem: (name) => {
    const value = settingsMMKV.getString(name)
    return value ?? null
  },
  removeItem: (name) => {
    return settingsMMKV.delete(name)
  },
}

// Export the MMKV instance if you need direct access elsewhere
export { settingsMMKV }