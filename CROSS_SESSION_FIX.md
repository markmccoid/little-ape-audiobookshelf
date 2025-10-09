# Cross-Session Contamination Fix

## Problem Description

When switching books, there was a race condition where progress updates from the OLD book's session would be incorrectly attributed to the NEW book's libraryItemId in the books store.

### Symptom

```
LOG  Synced to session 06daf009... - position: 11564.34s
LOG  [AudiobookStreamer] Updating books store with: {
  "libraryItemId": "0bc1257d-99c9-4a79-a70e-dd10821ea273",  // NEW book ID ❌
  "currentTime": 11564.34,                                   // OLD book position ❌
  "duration": 12141.675                                      // NEW book duration ❌
}
```

### Root Cause

The issue occurred because:

1. User switches from Book A (session 123) to Book B (session 456)
2. `AudiobookStreamer.this.session` is immediately updated to Book B
3. TrackPlayer still has Book A loaded and continues emitting progress events for session 123
4. When `syncProgress()` runs:
   - It correctly syncs to the OLD session (123) on the server ✅
   - BUT it updates the books store using `this.session.libraryItemId` (Book B) ❌
5. Result: Book A's position (11564s) gets written to Book B's record

---

## Solution

### New Helper Method: `getActiveLibraryItemId()`

Created a new method that mirrors `getActiveSessionId()` behavior:

```typescript
private async getActiveLibraryItemId(): Promise<string | null> {
  try {
    const activeTrack = await TrackPlayer.getActiveTrack();
    if (activeTrack && "libraryItemId" in activeTrack) {
      const activeLibraryItemId = activeTrack.libraryItemId as string;
      const currentLibraryItemId = this.session?.libraryItemId;

      // Detect and log mismatches
      if (currentLibraryItemId && activeLibraryItemId !== currentLibraryItemId) {
        console.warn(
          `Library Item ID mismatch - Active track: ${activeLibraryItemId}, Current session: ${currentLibraryItemId}. ` +
            `Using active track to prevent cross-book contamination.`
        );
      }

      return activeLibraryItemId;
    }

    // Fallback to this.session if no active track
    return this.session?.libraryItemId || null;
  } catch (error) {
    console.warn("Failed to get active track, falling back to this.session.libraryItemId:", error);
    return this.session?.libraryItemId || null;
  }
}
```

### Updated Methods

#### 1. `syncProgress()` (lines 316-360)

**Before:**
```typescript
if (syncResult.success && this.session) {
  bookActions.updateCurrentPosition(
    this.session.libraryItemId,  // ❌ Could be wrong during book switch
    syncResult.currentTime,
    this.session.duration
  );
}
```

**After:**
```typescript
if (syncResult.success) {
  const activeLibraryItemId = await this.getActiveLibraryItemId();  // ✅ From active track
  if (activeLibraryItemId) {
    const activeTrack = await TrackPlayer.getActiveTrack();
    const activeDuration = activeTrack?.duration || this.session?.duration;
    
    bookActions.updateCurrentPosition(
      activeLibraryItemId,  // ✅ Correct book
      syncResult.currentTime,
      activeDuration        // ✅ Correct duration
    );
  }
}
```

#### 2. `syncPosition()` (lines 448-461)

Same fix applied - now uses active track's libraryItemId instead of `this.session.libraryItemId`.

---

## How It Works

### Track Metadata in AudiobookStreamer

When setting up playback (line 238-248), each track includes:

```typescript
tracks = response.audioTracks.map((audioTrack) => ({
  id: `${response.id}-${audioTrack.index}`,
  url: `...`,
  title: response.displayTitle,
  sessionId: response.id,           // ✅ Session ID embedded in track
  libraryItemId: response.libraryItemId,  // ✅ Library Item ID embedded in track
  chapters: response.chapters,
}));
```

### Data Flow During Book Switch

```
User switches from Book A → Book B
    │
    ├─→ this.session updated to Book B (immediate)
    │
    ├─→ TrackPlayer.reset() called
    │
    ├─→ TrackPlayer.add(Book B tracks)
    │
    └─→ BUT: Progress events for Book A may still be in flight!
```

### Protection Against Cross-Contamination

```
syncProgress() called with old Book A position
    │
    ├─→ getActiveSessionId() → Returns Book A session from active track ✅
    │
    ├─→ Sync to server with Book A session ✅
    │
    ├─→ getActiveLibraryItemId() → Returns Book A libraryItemId ✅
    │
    └─→ Update books store for Book A (not Book B!) ✅
```

---

## Testing

### Test Case 1: Normal Playback
- Play Book A for 10 minutes
- Books store should update with Book A's position ✅

### Test Case 2: Book Switch While Playing
- Play Book A to position 1000s
- Switch to Book B (different book)
- Observe logs:
  - Should see "Library Item ID mismatch" warning if timing is right
  - Final sync should update Book A's position (not Book B's) ✅

### Test Case 3: Rapid Book Switching
- Switch between Book A → Book B → Book C quickly
- Each book's position should be preserved correctly ✅

---

## Related Methods

All methods that update the books store now use active track data:

1. ✅ `syncProgress()` - Regular progress syncs (every 5s)
2. ✅ `syncPosition()` - Seek operations
3. ✅ `closeSession()` - Session close (already uses active track via pending)

---

## Edge Cases Handled

### 1. No Active Track
- Fallback to `this.session.libraryItemId`
- Safe for initial load before TrackPlayer is ready

### 2. Active Track Missing Metadata
- Check for `"libraryItemId" in activeTrack` before accessing
- Fallback to `this.session.libraryItemId`

### 3. TrackPlayer.getActiveTrack() Fails
- Catch error and fallback to `this.session.libraryItemId`
- Log warning for debugging

---

## Benefits

1. ✅ **Prevents data corruption** - Book A's position never overwrites Book B's record
2. ✅ **No API changes needed** - TrackPlayer already has the data we need
3. ✅ **Consistent pattern** - Mirrors existing `getActiveSessionId()` approach
4. ✅ **Graceful fallback** - Uses `this.session` if active track unavailable
5. ✅ **Detectable** - Logs warnings when mismatch detected for debugging

---

## Changelog

### 2025-01-08 - Cross-Session Contamination Fix
- Added `getActiveLibraryItemId()` helper method
- Updated `syncProgress()` to use active track's libraryItemId
- Updated `syncPosition()` to use active track's libraryItemId  
- Added duration from active track to prevent duration mismatches
- Added warning logs when libraryItemId mismatch detected

---

*Last Updated: 2025-01-08*  
*Related Issue: Book switching causing position cross-contamination*
