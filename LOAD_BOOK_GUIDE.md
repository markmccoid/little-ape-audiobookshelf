# Load Book Actions Guide

## Overview

The playback store now provides two methods for loading books, each designed for different use cases:

1. **`loadBook(itemId)`** - Loads a book without starting playback
2. **`loadBookAndPlay(itemId)`** - Loads a book AND starts playback with deferred `isLoaded` state

---

## When to Use Each Method

### ✅ Use `loadBookAndPlay(itemId)`

**Best for: User-initiated playback**

Use this when the user expects the book to start playing immediately:

- ✅ Clicking "Resume" on a book card
- ✅ Clicking play button on book details page
- ✅ Selecting a book from Continue Listening
- ✅ Starting a book from search results

**Benefits:**
- `isLoaded` only becomes `true` when playback actually starts
- Better UX - loading indicators stay visible until audio is ready
- Smooth transition from loading → playing state
- Automatic fallback if playback doesn't start within 3 seconds

---

### 🔧 Use `loadBook(itemId)`

**Best for: Preloading or manual control**

Use this when you want to prepare a book without starting playback:

- 🔧 Preloading a book while another is playing
- 🔧 Loading a book for preview/info display
- 🔧 Manual control flow (load, then play separately)
- 🔧 Background operations

**Behavior:**
- Sets `isLoaded: true` immediately after loading
- Does NOT start playback
- You must call `play()` separately to start playback

---

## State Flow Comparison

### `loadBook(itemId)` Flow:

```
User Action
    ↓
set({ isLoaded: false })
    ↓
[Load tracks, setup audio]
    ↓
set({ isLoaded: true }) ← Happens immediately
    ↓
TrackPlayer ready but paused
    ↓
[User must call play() separately]
```

### `loadBookAndPlay(itemId)` Flow:

```
User Action
    ↓
set({ isLoaded: false })
    ↓
[Load tracks, setup audio]
    ↓
await TrackPlayer.play()
    ↓
[Wait for PlaybackState event] ← Key difference!
    ↓
Event: State.Playing received
    ↓
set({ isLoaded: true })
    ↓
Audio is playing!
```

---

## Code Examples

### Example 1: Home Screen "Continue Listening" (Use `loadBookAndPlay`)

```typescript
// src/screens/Home/InProgressItem.tsx
import { usePlaybackActions } from "@/src/store/store-playback";

const InProgressItem = ({ item }) => {
  const { loadBookAndPlay } = usePlaybackActions();

  const handlePress = async () => {
    // Shows loading state until playback starts
    await loadBookAndPlay(item.bookId);
    // Audio is now playing!
  };

  return (
    <Pressable onPress={handlePress}>
      <Text>{item.title}</Text>
    </Pressable>
  );
};
```

### Example 2: Book Details "Play" Button (Use `loadBookAndPlay`)

```typescript
// src/screens/BookDetails.tsx
const BookDetails = ({ bookId }) => {
  const { loadBookAndPlay } = usePlaybackActions();
  const isLoaded = usePlaybackStore((s) => s.isLoaded);

  const handlePlay = async () => {
    await loadBookAndPlay(bookId);
  };

  return (
    <View>
      <Button onPress={handlePlay}>
        {isLoaded ? "Playing..." : "Resume"}
      </Button>
    </View>
  );
};
```

### Example 3: Manual Control Flow (Use `loadBook`)

```typescript
// Advanced use case - load but don't play yet
const ManualControl = ({ bookId }) => {
  const { loadBook, play } = usePlaybackActions();

  const handlePrepare = async () => {
    // Load the book (isLoaded becomes true)
    await loadBook(bookId);
    
    // Do something else...
    await showConfirmation();
    
    // Then start playing manually
    await play();
  };

  return <Button onPress={handlePrepare}>Prepare Book</Button>;
};
```

---

## Special Case: Book Already Loaded

Both methods handle the case where the requested book is already loaded:

```typescript
// If book is already loaded, loadBookAndPlay just starts playback
await loadBookAndPlay(currentlyLoadedBookId);
// → Skips loading, calls play() directly

// loadBook does nothing if book already loaded
await loadBook(currentlyLoadedBookId);
// → Returns immediately, no-op
```

---

## Animation Integration

The `loadBookAndPlay` method works perfectly with the `PlayPauseAnimation` component's three-state system:

```typescript
const BookCard = ({ bookId }) => {
  const { loadBookAndPlay } = usePlaybackActions();
  const session = usePlaybackSession();
  const isPlaying = usePlaybackIsPlaying();
  
  // Three states:
  const isBookActive = session?.libraryItemId === bookId;
  
  return (
    <Pressable onPress={() => loadBookAndPlay(bookId)}>
      <PlayPauseAnimation 
        isBookActive={isBookActive}  // false → true when loaded
        isPlaying={isPlaying}         // false → true when playing starts
      />
    </Pressable>
  );
};
```

**Animation Flow:**
1. User clicks: `isBookActive: false` → Shows **resume icon**
2. Loading starts: `isBookActive` still `false`, `isLoaded: false`
3. Playback starts: `isLoaded: true`, `isBookActive: true` → Morphs to **pause icon**

---

## Error Handling

Both methods throw errors if something goes wrong. Always wrap in try-catch:

```typescript
const handlePlay = async () => {
  try {
    await loadBookAndPlay(bookId);
  } catch (error) {
    console.error("Failed to load book:", error);
    Alert.alert("Error", "Could not load the audiobook");
  }
};
```

---

## Timeout Mechanism

`loadBookAndPlay` includes a 3-second timeout as a safety net:

```typescript
// If TrackPlayer doesn't emit Playing state within 3 seconds:
setTimeout(() => {
  console.log("Playback state timeout - setting isLoaded anyway");
  set({ isLoaded: true });
}, 3000);
```

This prevents the app from being stuck in loading state if something goes wrong.

---

## Performance Considerations

### `loadBookAndPlay` is slightly slower than `loadBook`

- **`loadBook`**: Sets `isLoaded` immediately (~1-2 seconds total)
- **`loadBookAndPlay`**: Waits for playback to start (~2-3 seconds total)

**However**, the perceived UX is better because:
- User sees loading state during actual loading
- No "flash" of play button before audio starts
- Smoother transition to playing state

---

## Migration Guide

If you're currently using `loadBook` for user-initiated playback:

### Before:
```typescript
const handlePlay = async () => {
  await loadBook(bookId);
  await play(); // Separate play call
};
```

### After:
```typescript
const handlePlay = async () => {
  await loadBookAndPlay(bookId); // Combined operation
};
```

**Benefits:**
- One function call instead of two
- Better loading state management
- `isLoaded` reflects actual playback state

---

## Troubleshooting

### Issue: `isLoaded` stays false

**Possible causes:**
1. TrackPlayer isn't emitting `PlaybackState` events
2. Audio file is invalid or can't be loaded
3. Network issues (for streaming)

**Solution:**
- Check console logs for "Playback state timeout" message
- Verify audio URLs are accessible
- Check TrackPlayer event bindings

### Issue: Brief flash of play icon before pause

**Cause:** Using `loadBook` + `play()` separately

**Solution:** Use `loadBookAndPlay` instead for atomic operation

---

## Summary

| Feature | `loadBook` | `loadBookAndPlay` |
|---------|-----------|------------------|
| Sets `isLoaded` | Immediately | When playback starts |
| Starts playback | No | Yes |
| Best for | Preloading | User-initiated play |
| Returns | When loaded | When playing |
| Timeout | None | 3 seconds |
| Use with animation | ⚠️ May flash | ✅ Smooth |

---

*Last Updated: 2025-01-08*  
*Version: 1.0*
