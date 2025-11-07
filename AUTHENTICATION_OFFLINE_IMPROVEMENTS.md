# Authentication & Offline Support Implementation

## Overview
This document describes the comprehensive improvements made to the authentication system and offline network support across three phases of development.

---

## Phase 1: Authentication Improvements

### Goals
- Enable automatic re-authentication when tokens expire
- Eliminate multiple alert popups on authentication errors
- Implement retry logic for network failures
- Store credentials securely for seamless user experience

### Changes Made

#### 1.1 Encrypted Credential Storage

**File: `src/utils/AudiobookShelf/absAuthClass.ts`**

**Added:**
- New constant `CREDENTIALS_KEY` for SecureStore
- Private property `credentials: AuthCredentials | null` to cache credentials in memory
- `hasStoredPassword()` - Static method to check if password is stored
- `getStoredCredentials()` - Static method to retrieve stored credentials
- `storeCredentials()` - Private method to persist credentials to SecureStore
- Retry logic properties: `retryCount`, `maxRetries`, `baseRetryDelayMs`

**Modified:**
- `create()` - Now loads stored credentials on initialization
- `login()` - Now stores credentials after successful login
- `clearTokens()` - Added `clearCredentials` parameter (default: false) to preserve credentials on token expiry
- `logout()` - Calls `clearTokens(true)` to clear credentials on explicit logout

#### 1.2 Automatic Re-authentication

**File: `src/utils/AudiobookShelf/absAuthClass.ts`**

**Modified:**
- `refreshAccessToken()` - When token refresh fails:
  1. Attempts automatic re-login with stored credentials
  2. Only clears credentials on auth errors (not network errors)
  3. Preserves credentials for manual retry if auto re-auth fails

**Added:**
- `refreshTokenWithRetry()` - New private method implementing exponential backoff
  - Retries up to 3 times with delays: 1s, 2s, 4s
  - Differentiates between `AuthenticationError` (no retry) and `NetworkError` (retry)
  - Resets retry count on success

#### 1.3 Fixed Multiple Alert Issue

**File: `src/utils/AudiobookShelf/absInit.ts`**

**Removed:**
- Import of `Alert` from React Native
- `Alert.alert()` calls in `absAPIProxy`

**Modified:**
- `absAPIProxy` now throws catchable errors instead of showing alerts
- Changed from: `Alert.alert("Not Authenticated. Please login")`
- Changed to: `throw new Error("Not authenticated. Please login first.")`
- Added warning log: `console.warn(\`API call attempted while not authenticated: ${String(prop)}\`)`

**Benefits:**
- UI layer can handle errors appropriately
- Single point of error handling
- No more alert spam when multiple API calls fail

---

## Phase 2: Network Awareness

### Goals
- Detect network connectivity in real-time
- Show user-friendly visual feedback for offline/online state
- Prevent API calls when offline
- Serve cached data when network unavailable
- Configure React Query for offline-first behavior

### Changes Made

#### 2.1 Network State Management

**File Created: `src/contexts/NetworkContext.tsx`**

**Exports:**
- `NetworkProvider` - Context provider component
- `useNetwork()` - Hook to access network state (throws if not in provider)
- `useSafeNetwork()` - Hook that returns null if not in provider

**Features:**
- Real-time network monitoring using `@react-native-community/netinfo`
- Tracks connection state: `isConnected`, `isInternetReachable`, `networkType`
- Computes `isOffline` (combines connection and reachability)
- Determines `connectionQuality`: excellent, good, poor, offline
- Quality assessment based on WiFi, cellular generation (4G, 5G, 3G)

#### 2.2 Network Status Banner

**File Created: `src/components/NetworkStatusBanner.tsx`**

**Features:**
- Persistent banner when offline: "No internet connection - Using cached data"
- Brief "Connected" banner (3 seconds) when reconnecting
- Smooth animations using React Native Reanimated
  - Slide-in/out animations
  - Opacity transitions
- Positioned at top with high z-index (9999)
- Color-coded:
  - Amber (#f59e0b) for offline
  - Green (#10b981) for reconnected

**Animation Logic:**
- Tracks `wasOffline` state to detect transitions
- Shows immediately when going offline
- Shows temporarily when reconnecting
- Auto-hides after `RECONNECTED_DURATION` (3 seconds)

#### 2.3 Smart API Calls with Network Checks

**File Modified: `src/utils/AudiobookShelf/absAuthClass.ts`**

**Added:**
- Import of `NetInfo` from `@react-native-community/netinfo`
- `checkNetworkConnection()` - Private method to verify connectivity

**Modified Methods:**
- `login()` - Checks network before attempting login
- `refreshAccessToken()` - Checks network before token refresh
- `logout()` - Checks network but allows logout even when offline

**Error Messages:**
- Login: "No internet connection. Please check your network and try again."
- Refresh: "No internet connection. Unable to refresh session."

#### 2.4 React Query Offline Configuration

**File Modified: `src/utils/queryClient.ts`**

**Added:**
- Import of `NetInfo`
- `onlineManager` configuration object
- Integration with React Query's online manager

**Query Options:**
- `networkMode: "offlineFirst"` - Serves stale data when offline
- Smart retry logic:
  - No retry for authentication errors
  - Up to 3 retries for network errors
- Custom `refetchOnWindowFocus` - Only refetch if data exists

**Mutation Options:**
- `networkMode: "online"` - Only run mutations when online
- Single retry attempt

#### 2.5 Integration

**File Modified: `src/app/_layout.tsx`**

**Added:**
- Import of `NetworkProvider` from `../contexts/NetworkContext`
- Import of `NetworkStatusBanner` from `../components/NetworkStatusBanner`

**Component Hierarchy:**
```
GestureHandlerRootView
  └─ QueryClientProvider
      └─ NetworkProvider (NEW)
          └─ AuthProvider
              └─ ThemeProvider
                  └─ AppContent
                      ├─ NetworkStatusBanner (NEW)
                      ├─ Stack (routes)
                      └─ MiniPlayer
```

---

## Phase 3: Offline Queue System

### Goals
- Persist sync operations when offline
- Automatically process queue when connection restored
- Support different operation types (playback progress, bookmarks)
- Implement retry logic with maximum attempts
- Provide queue statistics and management

### Changes Made

#### 3.1 Persistent Sync Queue Manager

**File Created: `src/utils/syncQueue.ts`**

**Features:**
- Uses MMKV for persistent storage (survives app restarts)
- Dedicated storage instance: `sync-queue-storage`
- Supports multiple operation types via `SyncOperation` enum:
  - `"playback-progress"` - Audio playback position syncs
  - `"bookmark-add"` - Adding new bookmarks
  - `"bookmark-update"` - Updating existing bookmarks

**Types:**
```typescript
interface QueuedSyncItem {
  id: string;                    // Unique identifier
  type: SyncOperation;           // Operation type
  timestamp: number;             // When queued
  retryCount: number;            // Retry attempts
  data: { ... };                // Operation-specific data
}
```

**Class: `SyncQueueManager`**

**Singleton Pattern:**
- `getInstance()` - Get or create singleton instance
- Private constructor ensures single instance

**Core Methods:**
- `addToQueue(item)` - Add sync operation to persistent queue
- `getQueue()` - Retrieve all queued items
- `processQueue(processFn)` - Process queue with callback function
  - Returns: `{ success: number, failed: number }`
  - Removes successful items
  - Increments retry count on failures
  - Removes items after max retries (3)
- `removeFromQueue(itemId)` - Remove specific item
- `clearQueue()` - Remove all items

**Utility Methods:**
- `getQueueCount()` - Number of queued items
- `hasQueuedItems()` - Boolean check for pending items
- `getQueuedItemsByType(type)` - Filter by operation type
- `getQueueStats()` - Comprehensive statistics:
  - Total count
  - Breakdown by type
  - Oldest timestamp

**Exported:**
- `syncQueue` - Singleton instance ready to use

#### 3.2 AudiobookStreamer Integration

**File Modified: `src/utils/rn-trackplayer/AudiobookStreamer.ts`**

**Added:**
- Import of `NetInfo` from `@react-native-community/netinfo`
- Import of `syncQueue` from `../syncQueue`

**Removed (Replaced with Persistent Queue):**
- `offlineListenSessions: OfflineListenSession[]` - In-memory array
- `queuedSyncs: QueuedSync[]` - In-memory array
- `maxRetries: number` - Now handled by syncQueue

**Modified Methods:**

**`queueSyncForLater()`:**
- Before: Pushed to in-memory `this.queuedSyncs` array
- After: Uses `syncQueue.addToQueue()` with persistent storage
- Data structure:
  ```typescript
  {
    type: "playback-progress",
    data: {
      sessionId,
      timeListened,
      currentTime
    }
  }
  ```

**`processQueuedSyncs()`:**
- Before: Manually looped through in-memory array with retry logic
- After: Uses `syncQueue.processQueue()` with callback
- Callback:
  1. Validates operation type
  2. Calls `apiClient.syncProgressToServer()`
  3. Returns true/false for success/failure
- Logs statistics after processing

**New Methods:**

**`processQueueOnReconnection()`:**
- Public method to manually trigger queue processing
- Checks network connectivity with NetInfo
- Prevents processing if still offline
- Called automatically by NetworkContext on reconnection

**`getSyncQueueStats()`:**
- Public method to get queue statistics
- Delegates to `syncQueue.getQueueStats()`

**`getQueuedSyncCount()`:**
- Modified to use `syncQueue.getQueueCount()`
- Previously returned `this.queuedSyncs.length`

#### 3.3 Automatic Queue Processing on Reconnection

**File Modified: `src/contexts/NetworkContext.tsx`**

**Added:**
- Import of `useRef` hook
- Import of `AudiobookStreamer` from `../utils/rn-trackplayer/AudiobookStreamer`
- `wasOfflineRef` - Ref to track previous offline state

**Modified `NetInfo.addEventListener`:**
- Tracks connection transitions
- Detects "offline → online" transition
- When reconnected:
  1. Logs reconnection event
  2. Waits 1 second for connection stability
  3. Gets AudiobookStreamer instance
  4. Calls `processQueueOnReconnection()`
  5. Handles errors gracefully (e.g., streamer not initialized)

**Benefits:**
- Automatic sync queue processing
- No user intervention required
- Graceful handling of edge cases
- Stability delay prevents premature sync attempts

---

## Benefits Summary

### User Experience
1. **Seamless Authentication:** Users stay logged in even when tokens expire
2. **Clear Feedback:** Visual banner shows connection status
3. **Offline Functionality:** App continues working with cached data
4. **Automatic Sync:** Progress syncs automatically when reconnected
5. **No Interruptions:** No more alert spam interrupting workflow

### Technical Improvements
1. **Persistent Queuing:** Sync operations survive app restarts
2. **Smart Retry Logic:** Exponential backoff for transient failures
3. **Offline-First:** React Query configured to serve stale data
4. **Network Awareness:** Real-time connectivity monitoring
5. **Error Handling:** Differentiated auth vs network errors

### Reliability
1. **Credential Security:** Encrypted storage in SecureStore
2. **Data Integrity:** Queued syncs preserve playback progress
3. **Automatic Recovery:** Re-authentication and sync on reconnection
4. **Retry Limits:** Prevents infinite retry loops
5. **Graceful Degradation:** App works even when server unavailable

---

## Files Summary

### Created (3 files)
1. `src/contexts/NetworkContext.tsx` - Network state management
2. `src/components/NetworkStatusBanner.tsx` - Visual status indicator
3. `src/utils/syncQueue.ts` - Persistent sync queue manager

### Modified (5 files)
1. `src/utils/AudiobookShelf/absAuthClass.ts` - Credential storage, auto re-auth, network checks
2. `src/utils/AudiobookShelf/absInit.ts` - Removed alert spam
3. `src/utils/queryClient.ts` - Offline-first configuration
4. `src/app/_layout.tsx` - Added providers and banner
5. `src/utils/rn-trackplayer/AudiobookStreamer.ts` - Persistent queue integration

---

## Testing Recommendations

### Phase 1 - Authentication
- [ ] Test token expiry → automatic re-login flow
- [ ] Test logout → verify credentials cleared
- [ ] Test failed refresh → verify retry with exponential backoff
- [ ] Test network error during login → verify appropriate error message

### Phase 2 - Network Awareness
- [ ] Test going offline → banner appears
- [ ] Test reconnecting → banner shows "Connected" briefly
- [ ] Test API calls when offline → verify errors (not alerts)
- [ ] Test React Query serving stale data when offline

### Phase 3 - Offline Queue
- [ ] Test playback sync when offline → verify queued
- [ ] Test app restart → verify queue persists
- [ ] Test reconnection → verify queue processes automatically
- [ ] Test queue retry logic → verify max retries respected
- [ ] Test queue statistics → verify accurate counts

### Integration Tests
- [ ] Test complete offline → online flow with active playback
- [ ] Test token expiry while offline → verify re-auth on reconnection
- [ ] Test multiple syncs queued → verify processing order
- [ ] Test network fluctuations → verify stability
- [ ] Test long offline period → verify data integrity

---

## Future Enhancements

### Potential Improvements
1. **Queue UI:** Show queue status in settings (pending syncs count)
2. **Manual Retry:** Button to manually trigger queue processing
3. **Conflict Resolution:** Handle server conflicts for queued operations
4. **Bookmark Queuing:** Extend queue to support bookmark operations
5. **Queue Priorities:** Process critical syncs first (e.g., bookmarks before progress)
6. **Compression:** Compress queue data to save storage
7. **Telemetry:** Track queue performance metrics
8. **User Settings:** Allow users to configure retry limits, sync intervals

### Architecture Considerations
1. **Service Workers:** Consider using background tasks for sync
2. **WebSocket:** Real-time sync when online (reduce polling)
3. **Differential Sync:** Only sync changed data, not full state
4. **Optimistic Updates:** Update UI before server confirms
5. **Sync Deduplication:** Merge similar queued operations

---

## Dependencies

### Added
- `@react-native-community/netinfo` (already in package.json)
- `react-native-mmkv` (already in package.json)

### Used
- `expo-secure-store` - Encrypted credential storage
- `@tanstack/react-query` - Offline-first data fetching
- `react-native-reanimated` - Banner animations

---

## Maintenance Notes

### Configuration
- **Max Retries:** Set in `syncQueue.ts` (default: 3)
- **Retry Delays:** Exponential backoff in `absAuthClass.ts` (1s, 2s, 4s)
- **Banner Duration:** `RECONNECTED_DURATION` in `NetworkStatusBanner.tsx` (3s)
- **Reconnection Delay:** `setTimeout` in `NetworkContext.tsx` (1s)

### Storage Keys
- **Credentials:** `audiobookshelf_credentials` (SecureStore)
- **Tokens:** `audiobookshelf_tokens` (SecureStore)
- **Server URL:** `audiobookshelf_server_url` (SecureStore)
- **User Info:** `audiobookshelf_user_info` (SecureStore)
- **Sync Queue:** Stored in MMKV instance `sync-queue-storage`

### Logging
All components include comprehensive console logging:
- Authentication events (login, logout, refresh)
- Network state changes
- Queue operations (add, process, clear)
- Sync attempts and results

---

## Migration Notes

### Breaking Changes
None. All changes are backward compatible.

### Data Migration
- Existing tokens and credentials remain valid
- New credential storage is added on next login
- Sync queue starts empty (no data to migrate)

### Rollback Plan
If issues arise:
1. Revert to previous authentication (remove credential storage)
2. Disable NetworkProvider (app works without it)
3. Revert AudiobookStreamer changes (falls back to in-memory queue)

---

## Contributors
- factory-droid[bot]
- Implemented across 3 phases
- Total changes: 3 new files, 5 modified files, ~800 lines added

---

*Last Updated: $(date)*
*Version: 1.0.0*
