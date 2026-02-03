# Debug Logs: Playback Sync Events

This document explains the log entries created by `src/store/store-debuglogs.ts` and when each log type is emitted. These logs are intended to help diagnose playback position drift, sync failures, and explicit user actions (like resetting progress).

## Where Logs Are Generated

- The store lives in `src/store/store-debuglogs.ts` and provides:
  - `addSyncLogEntry(...)` for non-React usage (SyncManager, playback logic)
  - `useDebugLogsStore` for UI consumption

Most log entries are created in:
- `src/utils/rn-trackplayer/SyncManager.ts`
- `src/store/store-playback.ts`
- `src/utils/rn-trackplayer/AudiobookStreamer.ts`

Each log entry contains:
- `timestamp` (YYYY-MM-DD HH:mm:ss)
- `libraryItemId` and `title`
- `position` (HH:MM:SS)
- `syncType`
- `syncSource` (origin of the sync)
- `apiRoute` (or logical source)
- `functionName` and `fileName`
- `success` and optional `errorMessage`

## Log Types

### `sync-progress`

**What it means**: A periodic, timer-based sync of playback position.

**Where it happens**:
- `SyncManager.syncProgress(...)`

**What causes it**:
- TrackPlayer is playing
- Sync timer fires (every N seconds)
- App sends `currentTime` and `timeListened` to the server

**Sync source values**:
- `auto`: system/timer-driven syncs
- `user`: explicit user-initiated position changes (seek/jump)
- `system`: system-initiated actions (session close, playback error recovery)
- `queued`: replayed from offline queue

**Why it matters**:
- Shows routine background position syncing
- Helps confirm the server is receiving periodic updates

---

### `sync-position`

**What it means**: A seek/jump sync of position (manual user navigation).

**Where it happens**:
- Historically in `SyncManager.syncPosition(...)` (deprecated)

**What causes it**:
- User taps jump forward/back or drags the seek bar
- Immediate sync request after seek

**Why it matters**:
- Helps identify whether a seek action correctly updated the server

**Note**:
- This log type is legacy and currently not emitted.

---

### `session-close`

**What it means**: A final sync when a playback session is closed.

**Where it happens**:
- `AudiobookStreamer.closeSession(...)`

**What causes it**:
- User exits or stops playback
- App closes session during error handling
- Session is ended manually or during logout

**Why it matters**:
- Confirms the final position was captured and sent
- A failed `session-close` may indicate lost progress

---

### `queued-sync`

**What it means**: A sync executed from the offline queue.

**Where it happens**:
- `SyncManager.processQueuedSyncs()`

**What causes it**:
- App was offline when sync was requested
- Sync was queued, then processed on reconnection

**Why it matters**:
- Verifies offline progress recovery
- Helps diagnose stale or dropped queued updates

---

### `queued-position-applied`

**What it means**: A queued position was applied locally on reconnection.

**Where it happens**:
- Only when queued position is explicitly used to update the local store

**What causes it**:
- Offline progress exists and is applied to the books store

**Why it matters**:
- Indicates local state is updated from queued progress

---

### `zero-reset`

**What it means**: An explicit user action reset playback to zero.

**Where it happens**:
- `store-playback.seekTo(...)`
- `store-playback.prev(...)` when at track 0

**What causes it**:
- User dragged seek bar to the start
- User pressed "previous" at the beginning
- User explicitly reset progress (if/when UI supports it)

**Why it matters**:
- Distinguishes intentional resets from accidental TrackPlayer glitches
- Helps avoid false "position reset" bugs

---

### `zero-allowed-sync`

**What it means**: A sync that explicitly allowed `currentTime = 0`.

**Where it happens**:
- `SyncManager.syncProgress(...)`
- `SyncManager.processQueuedSyncs()`

**What causes it**:
- An explicit user reset or first-time play
- Allowed zero sync was sent immediately or queued offline

**Why it matters**:
- Helps trace *intentional* zero syncs to the server
- Useful for auditing issues where position appears to reset

## Interpretation Tips

- If you see `zero-reset` without a corresponding `zero-allowed-sync`, the reset likely came from TrackPlayer state drift or UI transitions.
- If you see `queued-sync` followed by `zero-allowed-sync`, the user likely reset while offline and it synced on reconnection.
- If `session-close` logs show position `00:00:00`, confirm whether it was triggered by explicit user action or by an error path.

## Common Debug Scenarios

- **Position unexpectedly resets to 0**
  - Look for `zero-reset` and `zero-allowed-sync`
  - If missing, the zero probably came from TrackPlayer state during transitions

- **No progress saved after playback error**
  - Check `session-close` log and whether it succeeded

- **Offline position never updates**
  - Look for `queued-sync` entries and whether they were later processed
