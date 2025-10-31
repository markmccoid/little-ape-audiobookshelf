# Audiobook Playback & Syncing Architecture

## 🚀 Quick Reference

### For Component Developers

**Need real-time position (slider, progress bar)?**

```typescript
const { position } = useSmartPosition(libraryItemId);
// Updates ~1/sec while playing, rounds to 1 decimal
```

**Need book metadata (duration, speed, etc.)?**

```typescript
const { book, duration, playbackSpeed, isBookActive } = useBookData(libraryItemId);
// Updates every 30s, low-frequency
```

**Need to check if a book is currently Active?**

```typescript
const isActive = useIsBookActive(libraryItemId);
// Returns true if this book is loaded in TrackPlayer
```

---

### For AudiobookStreamer Maintainers

**Position Update Frequency:**

- Server sync: Every **5 seconds** (silent, no UI impact)
- Books store: Every **30 seconds** (triggers re-renders)
- Force update: On **pause/stop/close** (data safety)

**Critical Methods:**

- `syncProgress()` - Regular syncs (every 60s)
- `closeSession()` - Final sync + cleanup
- `getActiveLibraryItemId()` - Prevents cross-book contamination

**Common Pitfalls:**

- ❌ Don't use `this.session.libraryItemId` for books store updates
- ✅ Use `await this.getActiveLibraryItemId()` instead
- ❌ Don't update books store on every server sync
- ✅ Throttle to 30s, force on pause/stop/close

---

## 📋 Table of Contents

- [Overview](#overview)
- [Core Architecture](#core-architecture)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Storage Layers](#storage-layers)
- [Syncing Strategy](#syncing-strategy)
- [Component Interactions](#component-interactions)
- [Edge Cases & Handling](#edge-cases--handling)
- [Performance Optimizations](#performance-optimizations)
- [Troubleshooting](#troubleshooting)
- [Key Architectural Decisions](#key-architectural-decisions)
- [Changelog](#changelog)

---

## Overview

This document describes the architecture for audiobook playback, position tracking, and data synchronization in Little Ape Audiobookshelf (LAABS).

### Key Principles

1. **Server as Source of Truth**: The ABS server holds authoritative data
2. **Optimistic Updates**: Local cache provides instant UI, background validates with server
3. **Efficient Syncing**: Server gets frequent updates (5s), local store gets throttled updates (30s)
4. **Real-Time Playback**: Live position from TrackPlayer, persisted position from Zustand

---

## Core Architecture

### Three Data Sources

```
┌────────────────────────────────────────────────────────────────┐
│                    DATA SOURCE HIERARCHY                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. TrackPlayer (Real-Time)                                    │
│     └─ Live playback position (updates ~1/second)              │
│     └─ Used for: Slider, current time display                  │
│     └─ Ephemeral (lost on app restart)                         │
│                                                                 │
│  2. Zustand + MMKV (Local Persistence)                         │
│     └─ Last known position (for resume)                        │
│     └─ User preferences (playback speed)                       │
│     └─ Download status (local-only)                            │
│     └─ Persists across app restarts                            │
│                                                                 │
│  3. ABS Server (Source of Truth)                               │
│     └─ Authoritative position data                             │
│     └─ Synchronized across devices                             │
│     └─ Book metadata (title, author, duration)                 │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. While Playing (Every 5 Seconds)

```
┌──────────────┐
│ TrackPlayer  │ Real-time position
│              │ (useProgress hook)
└──────┬───────┘
       │
       ├─────────────────────────────────────┐
       │                                      │
       v                                      v
┌──────────────┐                      ┌─────────────┐
│  Slider UI   │                      │AudiobookStm │
│  (re-renders │                      │             │
│   every 1s)  │                      └──────┬──────┘
└──────────────┘                             │
                                              │ Sync every 5s
                                              v
                                       ┌─────────────┐
                                       │ ABS Server  │
                                       │  (synced)   │
                                       └──────┬──────┘
                                              │
                                              │ Throttled: every 30s
                                              v
                                       ┌─────────────┐
                                       │  Zustand    │
                                       │  + MMKV     │
                                       │ (persisted) │
                                       └─────────────┘
```

**Key Points:**

- ✅ TrackPlayer position updates UI in real-time
- ✅ Server gets synced every 5 seconds (backup, multi-device)
- ✅ Local store only updated every 30 seconds (reduces re-renders by 83%)

---

### 2. On Pause/Stop (Immediate)

```
┌──────────────┐
│     User     │
│ Pauses Book  │
└──────┬───────┘
       │
       v
┌──────────────┐
│AudiobookStm  │ forceBooksStoreUpdate = true
│              │
└──────┬───────┘
       │
       ├─────────────────────────────────────┐
       │ Immediate                            │
       v                                      v
┌──────────────┐                      ┌─────────────┐
│ ABS Server   │ ← syncProgress()     │  Zustand    │
│  (synced)    │                      │  + MMKV     │
└──────────────┘                      │ (FORCED     │
                                       │  update)    │
                                       └─────────────┘
```

**Key Points:**

- ✅ Immediate sync to server AND local store
- ✅ Ensures accurate resume position
- ✅ Force flag bypasses throttling

---

### 3. On Book Load/Resume

```
┌──────────────┐
│     User     │
│ Opens Book   │
└──────┬───────┘
       │
       v
┌──────────────┐
│ useBookData  │ 1. Get from Zustand (instant)
│              │
└──────┬───────┘
       │
       v
┌──────────────┐
│  Component   │ Shows cached position immediately
│  Renders     │
└──────┬───────┘
       │
       │ (Optional: validateFromServer=true)
       v
┌──────────────┐
│TanStack Query│ 2. Fetch from server (background)
│              │
└──────┬───────┘
       │
       v
┌──────────────┐
│ ABS Server   │ Returns latest position
│              │
└──────┬───────┘
       │
       v
┌──────────────┐
│  Zustand     │ 3. Update local store with server data
│  Updated     │
└──────┬───────┘
       │
       v
┌──────────────┐
│  Component   │ 4. Re-renders with server position
│  Re-renders  │
└──────────────┘
```

**Key Points:**

- ✅ Fast: Shows cached data immediately (<1ms)
- ✅ Fresh: Updates with server data when available (~500ms)
- ✅ Handles multi-device: Server has latest position
- ✅ Graceful: Falls back to cache if network fails

---

### 4. Session Close Flow

```
┌──────────────┐
│     User     │
│ Closes Book  │
└──────┴───────┘
       │
       v
┌──────────────┐
│  closeSession│ 1. Stop sync timer
│              │ 2. Get final position from TrackPlayer
└──────┴───────┘
       │
       ├─────────────────────────────────────┐
       │                                      │
       v                                      v
┌──────────────┐                      ┌─────────────┐
│ ABS Server   │ ← Close session      │  Zustand    │
│              │   with final time    │  + MMKV     │
└──────────────┘                      │ (IMMEDIATE  │
       │                                │  update)    │
       │                                └─────────────┘
       │                                      ↑
       └──────────────────────────────────────┘
         3. Update Zustand with final position
```

**Key Points:**

- ✅ Stops sync timer to prevent concurrent updates
- ✅ Closes session on server with final position
- ✅ Immediately updates Zustand store with final position
- ✅ Guarantees resume position is accurate

---

## Storage Layers

### Zustand Store (store-books.ts)

**Purpose:** Local persistence + user preferences

```typescript
type Book = {
  userId: string;
  libraryItemId: string;
  title?: string; // Cached from server
  currentPosition: number; // Last known position (for resume)
  duration?: number; // Cached from server
  playbackSpeed: number; // User preference (local-only)
  isDownloaded: boolean; // Local-only data
  lastUpdated?: number; // Timestamp of last update
};
```

**Storage Mechanism:** MMKV (fast key-value storage)

**Update Frequency:**

- While playing: Every 30 seconds (throttled)
- On pause/stop: Immediately (forced)
- On session close: Immediately (forced)
- On first sync: Immediately

**Persists:** ✅ Yes - survives app restart

---

### TanStack Query Cache

**Purpose:** Server validation & background refetch

**Query Keys:**

```typescript
["bookProgress", libraryItemId][("booksInProgress", libraryItemId)][("books", libraryItemId)]; // Individual book progress // In-progress books list // Library books
```

**Configuration:**

```typescript
{
  staleTime: 30 * 1000,           // Consider fresh for 30s
  gcTime: 10 * 60 * 1000,         // Keep in cache for 10min
  refetchOnMount: 'always',       // Always validate with server
  refetchOnWindowFocus: true,     // Refetch when app focused
}
```

**Persists:** ❌ No - in-memory only

---

### TrackPlayer

**Purpose:** Real-time playback position

**Update Frequency:** ~1 second (configurable in setup)

**Accessed Via:**

```typescript
const progress = useProgress(); // From react-native-track-player
const position = progress.position; // Live position in seconds
```

**Persists:** ❌ No - ephemeral, resets on app restart

---

## Syncing Strategy

### AudiobookStreamer Sync Logic

#### Property Tracking

```typescript
class AudiobookStreamer {
  // Sync to server every 5s
  private syncTimer: NodeJS.Timeout | null = null;
  private syncIntervalSeconds: number = 5;

  // Update local store every 30s (throttled)
  private lastBookStoreUpdate: number = 0;
  private bookStoreUpdateIntervalMs: number = 30000;

  // Force update on pause/stop/close
  private forceBooksStoreUpdate: boolean = false;
}
```

#### Decision Logic

```typescript
// In syncProgress()
const shouldUpdateBooksStore =
  this.forceBooksStoreUpdate ||                    // Force on pause/stop/close
  this.lastBookStoreUpdate === 0 ||                // First sync
  (now - this.lastBookStoreUpdate) >= 30000;       // Every 30 seconds

if (shouldUpdateBooksStore) {
  bookActions.updateCurrentPosition(...);
  this.lastBookStoreUpdate = now;
}
```

#### State Changes

```typescript
// Playing
state === State.Playing
  → forceBooksStoreUpdate = false
  → Start 5s sync timer

// Paused/Stopped
state === State.Paused || State.Stopped
  → forceBooksStoreUpdate = true
  → syncProgress() // Will force update to store
  → Stop sync timer

// Session Close
closeSession()
  → forceBooksStoreUpdate = true
  → Final sync to server & store
```

---

## Component Interactions

### useSmartPosition Hook

**Purpose:** Provides real-time position for active book, cached position for others

```typescript
const { position, isLoading, error } = useSmartPosition(bookId);
```

**Logic:**

1. Fetch initial position from Zustand store (via `getOrFetchBook`)
2. If book is currently playing: Use TrackPlayer position (real-time)
3. If book is NOT playing: Use Zustand cached position
4. Rounds to 1 decimal to reduce floating-point re-renders

**Used In:** BookSlider, BookControls, position displays

---

### useBookData Hook

**Purpose:** Provides book metadata (duration, playback speed, etc.)

```typescript
const { book, duration, playbackSpeed, isBookActive } = useBookData(bookId, {
  validateFromServer: true, // Optional server validation
});
```

**Logic:**

1. Get book from Zustand store (instant)
2. Optionally validate with server (background)
3. Auto-fetch if not in store
4. Return reactive data that updates when store updates

**Used In:** BookSlider, BookControls, Book detail screens

---

### BookSlider Component

**Usage:**

```typescript
const BookSlider = ({ bookId }) => {
  const { position } = useSmartPosition(bookId); // Real-time position
  const { duration } = useBookData(bookId); // From Zustand

  // Slider updates every ~1 second with new position
  return <Slider value={position} max={duration} />;
};
```

**Re-render Frequency:**

- While playing: ~1 per second (from TrackPlayer)
- While paused: 0 per second
- Duration changes: Rarely (only when book metadata updates)

---

## Edge Cases & Handling

### 1. App Crash During Playback

**Scenario:** User is listening, app crashes

**Behavior:**

- ❌ Lost: Up to 30 seconds of position (since last Zustand update)
- ✅ Recovered: Server has position from last 5s sync
- ✅ On restart: TanStack Query fetches server position, updates Zustand

**Trade-off:** Acceptable - 30s max loss vs constant re-renders

---

### 2. Multi-Device Usage

**Scenario:** User listens on phone, then switches to tablet

**Behavior:**

- ✅ Phone: Syncs to server every 5s
- ✅ Tablet: Opens book, shows cached position (fast)
- ✅ Tablet: Fetches from server (background), updates to phone's position
- ✅ Smooth transition within 1-2 seconds

---

### 3. Network Failure

**Scenario:** No internet connection

**Behavior:**

- ✅ Playback: Continues normally (local files)
- ✅ Position: Updates in Zustand every 30s (local only)
- ✅ Server: Syncs are queued for later (offline mode)
- ✅ Resume: Uses last known Zustand position

---

### 4. Force Quit While Playing

**Scenario:** User swipes app away

**Behavior:**

- ❌ Lost: Position since last Zustand update (up to 30s)
- ✅ Server: Has last 5s sync
- ✅ On reopen: Fetches from server, gets most recent position

---

### 5. Rapid Book Switching

**Scenario:** User quickly switches between books

**Behavior:**

- ✅ Previous book: Gets final sync before switching
- ✅ Pending syncs: Captured and processed
- ✅ No cross-contamination: Uses active track's libraryItemId (not `this.session`)
- ✅ Race conditions: Prevented via `isSyncing` flags and `getActiveLibraryItemId()`

**See:** [CROSS_SESSION_FIX.md](./CROSS_SESSION_FIX.md) for detailed explanation

---

## Performance Optimizations

### 1. Throttled Store Updates

**Before:**

- Books store updated every 5 seconds
- All components using `useBook()` re-render
- 12 updates per minute while playing

**After:**

- Books store updated every 30 seconds
- Forced update on pause/stop/close
- 2 updates per minute while playing + immediate on pause

**Impact:** 83% reduction in store updates

---

### 2. Selective Re-renders

**Optimization:** Select only what you need from stores

```typescript
// ❌ BAD - Entire session object
const session = usePlaybackStore((s) => s.session);

// ✅ GOOD - Only the ID
const sessionLibraryItemId = usePlaybackStore((s) => s.session?.libraryItemId);
```

**Impact:** Hooks only re-run when libraryItemId actually changes

---

### 3. Real-Time Position from TrackPlayer

**Optimization:** Don't store live position in Zustand

```typescript
// While playing: Use TrackPlayer directly
const livePosition = useProgress().position;

// While paused/stopped: Use Zustand cache
const cachedPosition = book.currentPosition;
```

**Impact:** Zustand doesn't update during playback = no unnecessary re-renders

---

### 4. Memoization

**useSmartPosition:** Rounds position to 1 decimal place

```typescript
const newPosition = Math.round(progress.position * 10) / 10;
// 11.5451234 → 11.5 (reduces floating-point re-renders)
```

**Impact:** Reduces micro re-renders from floating-point precision

---

## Key Files Reference

### Core Files

| File                                            | Purpose                               |
| ----------------------------------------------- | ------------------------------------- |
| `src/utils/rn-trackplayer/AudiobookStreamer.ts` | Manages playback, syncing, throttling |
| `src/store/store-books.ts`                      | Zustand store for book data           |
| `src/store/store-playback.ts`                   | Zustand store for playback state      |
| `src/hooks/trackPlayerHooks.ts`                 | Position & book data hooks            |
| `src/hooks/ABSHooks.ts`                         | TanStack Query hooks                  |

### Component Files

| File                                             | Purpose            |
| ------------------------------------------------ | ------------------ |
| `src/components/bookComponents/BookSlider.tsx`   | Position slider    |
| `src/components/bookComponents/BookControls.tsx` | Playback controls  |
| `src/screens/MainPlayer/MainPlayerContainer.tsx` | Full player screen |

---

## Summary

### Data Flow: The Full Picture

```
USER PLAYS BOOK
    ↓
TrackPlayer (real-time position, updates UI)
    │
    ├─→ Slider UI (re-renders every ~1s) ✅
    │
    └─→ AudiobookStreamer
          │
          ├─→ Server (sync every 5s) ✅
          │     └─→ Backup, multi-device support
          │
          └─→ Zustand Store
                │
                ├─→ While playing: every 30s ✅
                ├─→ On pause/stop: immediately ✅
                └─→ On close: immediately ✅
                      │
                      └─→ MMKV (persists to disk)
                            └─→ Survives app restart
```

### Benefits of This Architecture

1. ✅ **Fast UI**: Real-time slider updates from TrackPlayer
2. ✅ **Efficient**: 83% fewer store updates (30s vs 5s)
3. ✅ **Reliable**: Server synced every 5s (backup, multi-device)
4. ✅ **Persistent**: Zustand + MMKV survives restarts
5. ✅ **Accurate**: Forced updates on pause/stop ensure resume works
6. ✅ **Scalable**: Minimal re-renders, good for complex UIs
7. ✅ **Flexible**: Can add server validation via TanStack Query when needed

---

## Changelog

### 2025-01-08 - Major Fixes: Throttling, Reactivity & Cross-Session Contamination

This update includes three critical fixes to the audiobook position tracking system:

#### 1. Throttled Books Store Updates ⚡

- Added 30-second throttling for books store updates during playback
- Server still synced every 5 seconds (unchanged)
- Force updates on pause/stop/close for accurate resume
- Reduces component re-renders by 83%
- Improves battery life and performance

#### 2. Fixed `useBookData` Reactivity 🔄

**Problem:** `useBookData` hook wasn't re-rendering when books store updated.

**Root Cause:**

- Hook was subscribing to Zustand but storing data in local `useState`
- Local state only updated in `useEffect` with circular dependencies
- Result: Books store updates every 30s didn't trigger component re-renders

**Solution:**

```typescript
// ❌ BEFORE: Local state with broken reactivity
const [book, setBook] = useState<Book | null>(null);
useEffect(() => {
  // Only runs when dependencies change (circular logic)
  setBook(fetchedBook);
}, [libraryItemId, book?.currentPosition]); // ❌ Circular dependency

// ✅ AFTER: Direct Zustand subscription
const bookFromStore = useBooksStore((state) =>
  state.books.find((b) => b.libraryItemId === libraryItemId)
);
// Automatically re-renders when store updates! ✅
```

**Impact:** Components using `useBookData` now properly update when books store changes.

#### 3. Fixed MiniPlayer Close Button 🛑

**Problem:** Clicking "Close" in MiniPlayer didn't save the current position.

**Solution:** Updated `AudiobookStreamer.closeSession()` to:

1. Stop sync timer
2. Get final position from TrackPlayer
3. Close session on server
4. **Update books store with final position** (NEW!)
5. Clean up and mark session as closed

**Impact:** Resume position is now accurate when closing from MiniPlayer.

#### 4. Fixed Cross-Session Contamination 🔒

**Problem:** When switching books, Book A's position was being saved to Book B's record.

**Example:**

```
// User switches Book A (at 11564s) → Book B
LOG  Synced to session 06daf009... (Book A session)
LOG  Updating books store: {
  "libraryItemId": "0bc1257d..." // ❌ Book B ID (WRONG!)
  "currentTime": 11564.34s      // ❌ Book A position
}
```

**Root Cause:**

- `this.session` updates immediately to Book B when switching
- TrackPlayer still has Book A loaded and emits progress events
- `syncProgress()` used `this.session.libraryItemId` (Book B) instead of active track (Book A)

**Solution:** Created `getActiveLibraryItemId()` helper:

```typescript
private async getActiveLibraryItemId(): Promise<string | null> {
  const activeTrack = await TrackPlayer.getActiveTrack();
  if (activeTrack && "libraryItemId" in activeTrack) {
    return activeTrack.libraryItemId; // ✅ From what's actually playing
  }
  return this.session?.libraryItemId || null; // Fallback
}
```

Updated methods:

- ✅ `syncProgress()` - Uses active track libraryItemId + duration
- ✅ `syncPosition()` - Uses active track libraryItemId + duration

**Impact:** Each book's position is now correctly saved to its own record, even during rapid switching.

**See:** [CROSS_SESSION_FIX.md](./CROSS_SESSION_FIX.md) for detailed technical explanation.

---

### Testing the Fixes

#### Test 1: Throttled Updates

1. Play a book for 2 minutes
2. Watch console logs
3. Should see "Updating books store" only every 30s (not every 5s)
4. Pause - should see immediate "forced" update

#### Test 2: `useBookData` Reactivity

1. Open a book screen that uses `useBookData`
2. Let book play for 30+ seconds
3. Component should re-render with new position every 30s
4. UI should reflect updated position without manual refresh

#### Test 3: MiniPlayer Close

1. Play a book to position ~60s
2. Click "Close" button in MiniPlayer
3. Check console: Should see "Updating books store on session close"
4. Reopen book - should resume from ~60s ✅

#### Test 4: Cross-Session Protection

1. Play Book A to position ~1000s
2. While playing, quickly switch to Book B
3. Check console logs:
   - May see "Library Item ID mismatch" warning (race condition detected)
   - "Updating books store" should show Book A's libraryItemId (not B's)
4. Go back to Book A - should resume from ~1000s ✅
5. Go to Book B - should start from beginning (not 1000s) ✅

---

## Troubleshooting

### Issue: Position Not Saving

**Symptoms:**

- Book doesn't resume from last position
- Position resets to 0 or wrong time

**Check:**

1. Console logs for "Updating books store" messages
2. Verify books store has the book: `useBooksStore.getState().books`
3. Check if `forceBooksStoreUpdate` is working on pause
4. Verify `closeSession()` is being called

**Common Causes:**

- App force-quit before 30s update window
- Network issues preventing server sync
- Books store not persisting to MMKV

---

### Issue: Wrong Book Position After Switch

**Symptoms:**

- Switch from Book A to Book B
- Book B shows Book A's position
- Or Book A's position is lost

**Check:**

1. Look for "Library Item ID mismatch" warnings in console
2. Verify `getActiveLibraryItemId()` is returning correct book ID
3. Check TrackPlayer active track has `libraryItemId` metadata

**Common Causes:**

- Race condition during book switch (should be fixed)
- TrackPlayer active track missing metadata
- Books store not updating with active track ID

---

### Issue: Component Not Re-rendering

**Symptoms:**

- UI shows stale position
- Position doesn't update even though books store is updating

**Check:**

1. Verify component uses `useBookData` or subscribes to Zustand properly
2. Check if component is selecting entire object vs specific fields
3. Look for memo/useMemo blocking re-renders

**Common Causes:**

- Component using old pattern with local state
- Over-memoization preventing updates
- Selecting wrong data from store

---

### Issue: Too Many Re-renders

**Symptoms:**

- UI feels sluggish
- Battery draining fast
- Console flooded with render logs

**Check:**

1. Verify throttling is enabled (30s interval)
2. Check if multiple components subscribing to full store
3. Look for components re-rendering on every position update

**Solutions:**

- Use atomic selectors: `useBooksStore((s) => s.books.find(...))`
- Don't subscribe to `useProgress()` unless needed for real-time updates
- Use `useSmartPosition` for position display (optimized)

---

### Debug Console Logs to Watch

**Normal Operation:**

```
// Every 5s - Server sync
Synced to session abc123 - listened: 5s, position: 125.5s

// Every 30s - Books store update
[AudiobookStreamer] Updating books store with: {
  libraryItemId: "...",
  currentTime: 125.5,
  reason: "throttled interval"
}

// On pause - Forced update
[AudiobookStreamer] Updating books store with: {
  reason: "forced (pause/stop)"
}
```

**Warning Signs:**

```
// Race condition detected (handled gracefully)
Library Item ID mismatch - Active track: abc, Current session: xyz

// Sync skipped (could indicate issue)
Skipping books store update (throttled) - 15s since last update

// Session not found (session expired or closed)
Session abc123 not found on server - marking as closed
```

---

## Future Enhancements

### Potential Improvements

1. **Configurable Throttle Interval**

   - Allow users to set update frequency (10s, 30s, 60s)
   - Trade-off: crash recovery vs performance

2. **Smart Throttling**

   - Increase frequency near chapter boundaries
   - Reduce frequency during long listening sessions

3. **Offline Sync Queue**

   - Better handling of offline listening
   - Batch sync when network returns

4. **Background Sync**

   - iOS/Android background tasks
   - Keep syncing even when app backgrounded

5. **Conflict Resolution**

   - Handle conflicting positions from multiple devices
   - Use timestamps to determine "most recent"

6. **Position Validation**
   - Detect impossible jumps (e.g., 1000s forward in 1 second)
   - Prompt user to choose correct position on conflict

---

## Key Architectural Decisions

### Why Throttle Books Store Updates?

**Decision:** Update books store every 30s, not every 5s like server sync.

**Rationale:**

- Books store updates trigger Zustand subscribers (component re-renders)
- Server syncs are silent (no UI impact)
- 30s is frequent enough for resume accuracy
- Trade-off: Max 30s position loss on crash vs 83% fewer re-renders

**Force Updates:** On pause/stop/close ensure no data loss for resume scenarios.

---

### Why Use Active Track Instead of `this.session`?

**Decision:** Read `libraryItemId` and `duration` from `TrackPlayer.getActiveTrack()` instead of `this.session`.

**Rationale:**

- `this.session` updates immediately when switching books
- TrackPlayer updates asynchronously (after reset/add/load)
- Progress events may reference old session during transition
- Active track is the **source of truth** for what's actually playing

**Fallback:** Use `this.session` if active track unavailable (safe for edge cases).

---

### Why Direct Zustand Subscription in `useBookData`?

**Decision:** Subscribe directly to Zustand instead of storing in local `useState`.

**Rationale:**

- React hooks should derive state, not duplicate it
- Local state creates sync issues and stale data
- Zustand handles reactivity efficiently
- Follows React best practices (single source of truth)

**Pattern:**

```typescript
// ✅ GOOD: Direct subscription
const book = useBooksStore((s) => s.books.find(...))

// ❌ BAD: Duplicate state
const [book, setBook] = useState(null)
useEffect(() => { setBook(...) }, [...])
```

---

### Why Separate `useSmartPosition` and `useBookData`?

**Decision:** Two hooks instead of one combined hook.

**Rationale:**

- `useSmartPosition`: High-frequency updates (~1/sec from TrackPlayer)
  - Used for sliders, real-time position displays
  - Optimized with rounding to reduce micro re-renders
- `useBookData`: Low-frequency updates (30s from books store)
  - Used for metadata, duration, playback speed
  - Prevents unnecessary re-renders for static data

**Benefit:** Components can choose granularity of updates they need.

---

### Why Multiple Data Sources?

**Decision:** TrackPlayer (real-time) + Zustand (cache) + Server (authority).

**Rationale:**

1. **TrackPlayer**: Real-time position for smooth UI (but ephemeral)
2. **Zustand + MMKV**: Persistent cache for instant resume (survives restart)
3. **Server**: Source of truth for multi-device sync (authoritative)

Each serves a distinct purpose - removing any would break functionality.

---

### Why Not Update Books Store on Every Server Sync?

**Decision:** Don't update books store when server sync succeeds (every 5s).

**Rationale:**

- Server sync result doesn't add new information we don't already have
- TrackPlayer position is already the source of truth locally
- Would trigger unnecessary re-renders every 5s
- 30s throttle is sufficient for persistence needs

**Exception:** Forced updates on pause/stop/close for data safety.

---

_Last Updated: 2025-01-08_  
_Version: 1.1_  
_Author: LAABS Development Team_
