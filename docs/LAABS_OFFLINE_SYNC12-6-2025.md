# Little Ape Audiobookshelf - Offline Sync Documentation

> Last updated: December 6, 2025

## Overview

The application implements a comprehensive offline-aware architecture that allows users to continue using the app when internet connectivity is unavailable or unreliable. The system gracefully degrades functionality, caches data locally, queues sync operations, and provides clear UI feedback.

---

## Network State Detection

### Core Implementation

**File:** [`src/contexts/NetworkContext.tsx`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/contexts/NetworkContext.tsx)

The `NetworkProvider` component manages network state using `@react-native-community/netinfo`:

```typescript
NetInfo.configure({
  reachabilityUrl: "https://clients3.google.com/generate_204",
  reachabilityTest: async (response) => response.status === 204,
  reachabilityLongTimeout: 30 * 1000, // 30 seconds between checks
  useNativeReachability: false, // HTTP check for reliability
});
```

**Key exports:**

- `useNetwork()` - Hook returning `{ isConnected, isInternetReachable, isOffline, connectionQuality }`
- `triggerNetworkRefresh()` - Imperative function to force network state check (called when API errors occur)

### Proactive Offline Detection

When API calls fail with `NetworkError`, the proxy triggers an immediate network state refresh:

**File:** [`src/utils/AudiobookShelf/absInit.ts`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/utils/AudiobookShelf/absInit.ts#L91-L94)

```typescript
if (isNetworkError) {
  console.log(`PROXY: Network error in ${methodName} (offline mode)`);
  triggerNetworkRefresh(); // Update banner immediately
}
```

### Aggressive Reconnection Polling

When offline, the app polls every 30 seconds to detect reconnection faster:

**File:** [`src/contexts/NetworkContext.tsx`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/contexts/NetworkContext.tsx#L136-L160)

---

## UI Indicators

### Offline Banner

**File:** [`src/components/NetworkStatusBanner.tsx`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/components/NetworkStatusBanner.tsx)

Animated banner at top of screen:

- **Offline**: Amber background - "No internet connection - Using cached data"
- **Reconnected**: Green background - "Connected" (shown for 3 seconds)

### Book Availability Badge

**File:** [`src/components/OfflineBadge.tsx`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/components/OfflineBadge.tsx)

A compact "SERVER ONLY" badge appears in the top-right corner of book covers when:

- User is offline AND
- Book is not downloaded AND
- Book is not currently loaded in the player

**Playability check:** [`src/utils/bookAvailability.ts`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/utils/bookAvailability.ts)

---

## Cached Data Strategy

### Book Data Store

**File:** [`src/store/store-books.ts`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/store/store-books.ts)

Uses Zustand with MMKV persistence. The `getOrFetchBook()` function (lines 311-458) implements the caching strategy:

1. **Check local cache first** - Returns cached book if available
2. **Attempt server fetch** - If online, fetches fresh data
3. **Fallback to cache on error** - If API returns null (offline), returns cached data
4. **Preserve local position** - Checks sync queue before overwriting position with server data

```typescript
// If API returned null (offline/error), return cached book without updating
if (!itemDetails || !itemDetails.media) {
  console.log("[BooksStore] No item details received, returning cached book");
  return book;
}
```

### Position Sync Race Condition Fix

**File:** [`src/store/store-books.ts`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/store/store-books.ts#L420-L451)

When fetching book data, the code checks for queued local syncs before overwriting position:

```typescript
const queuedProgressItems = syncQueue.getQueuedItemsByType("playback-progress");
const useQueuedPosition =
  queuedPosition !== undefined && (serverPosition === undefined || queuedPosition > serverPosition);
```

**Priority:** Queued local position > Existing local position > Server position

---

## API Proxy Behavior

**File:** [`src/utils/AudiobookShelf/absInit.ts`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/utils/AudiobookShelf/absInit.ts#L83-L115)

The `absAPIProxy` wraps all API calls and handles network errors gracefully:

| Method Type     | Offline Behavior |
| --------------- | ---------------- |
| `get*` methods  | Returns `null`   |
| Library methods | Returns `[]`     |
| Other methods   | Returns `null`   |

This allows calling code to check for null and fall back to cached data.

---

## Sync Queue System

### Queue Manager

**File:** [`src/utils/syncQueue.ts`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/utils/syncQueue.ts)

Persists pending sync operations in MMKV storage. Supports:

- `playback-progress` - Position/time listened updates
- `bookmark-add` / `bookmark-update` / `bookmark-delete`

**Key methods:**

- `addToQueue(item)` - Add operation to queue
- `processQueue(processFn)` - Process all queued items
- `getQueuedItemsByType(type)` - Get items by operation type
- `getQueueStats()` - Get queue statistics

### Sync Manager

**File:** [`src/utils/rn-trackplayer/SyncManager.ts`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/utils/rn-trackplayer/SyncManager.ts)

Orchestrates sync operations with the server:

**When syncing offline (line 107-113):**

```typescript
if (!syncResult) {
  console.log("Sync returned null (likely offline) - queuing for later");
  await this.queueSyncForLater(sessionId, syncData);
  return;
}
```

**Processing queue on reconnection (line 293-298):**

```typescript
public async processQueueOnReconnection(): Promise<void> {
  const networkState = await NetInfo.fetch();
  if (networkState.isConnected && networkState.isInternetReachable !== false) {
    await this.processQueuedSyncs();
  }
}
```

### Reconnection Trigger

**File:** [`src/contexts/NetworkContext.tsx`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/contexts/NetworkContext.tsx#L107-L122)

When network reconnects, the context triggers queue processing:

```typescript
if (prevOffline && nowConnected) {
  console.log("Network reconnected - triggering sync queue processing...");
  setTimeout(() => {
    streamer.processQueueOnReconnection();
  }, 1000); // 1 second delay for stability
}
```

---

## Error Handling

### Playback Errors When Offline

**File:** [`src/utils/rn-trackplayer/SessionManager.ts`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/utils/rn-trackplayer/SessionManager.ts#L32-L39)

If `getPlayInfo` returns null (offline), throws a user-friendly error:

```typescript
if (!response || !response.audioTracks) {
  throw new Error(
    "Unable to start playback session. Please check your internet connection and try again."
  );
}
```

**File:** [`src/store/store-playback.ts`](file:///Users/markmccoid/Documents/myProgramming/ReactNative/little-ape-audiobookshelf/src/store/store-playback.ts#L246-L271)

The `loadBook` function catches these errors and shows appropriate alerts.

---

## Summary Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP STARTUP                               │
│  NetworkContext subscribes to NetInfo                            │
│  Loads cached books from MMKV                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ONLINE OPERATION                            │
│  API calls → Server → Update local cache                         │
│  Syncs position every 60 seconds                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                   Network Error Detected
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OFFLINE OPERATION                            │
│  • triggerNetworkRefresh() → Banner shows "Offline"             │
│  • API calls return null → Use cached data                       │
│  • Position syncs queued in syncQueue                            │
│  • "Server Only" badge on unavailable books                      │
│  • Aggressive polling every 30s for reconnection                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                   Reconnection Detected
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RECONNECTION                                │
│  • Banner shows "Connected" (3s)                                 │
│  • processQueueOnReconnection() called                           │
│  • Queued syncs sent to server                                   │
│  • Position preserved (queue > server)                           │
└─────────────────────────────────────────────────────────────────┘
```
