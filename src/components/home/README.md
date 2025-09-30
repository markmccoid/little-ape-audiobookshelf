# Home Container Components

This directory contains components for the Home screen that displays books in progress.

## Components

### HomeContainer.tsx
The main container component that:
- Fetches books in progress from the API
- Manages playback state (playing, loaded, position)
- Caches book positions locally to persist between loads/unloads
- Handles optimistic cache updates when starting playback
- Renders the list of books in progress

**Key Features:**
- **Position Caching**: Uses `useRef` to cache book positions, preventing fallback to stale server data
- **Optimistic Updates**: Immediately moves playing book to top of list via `moveBookToTopOfInProgress`
- **Performance**: Uses `useMemo` and `useCallback` for optimized re-renders

### InProgressItem.tsx
Individual book item component that displays:
- Book cover image
- Title, author, progress percentage
- Current time / total duration
- Play/Pause button

**Key Features:**
- **Memoized**: Uses `React.memo` with custom comparison for optimal re-renders
- **Visual Feedback**: Highlights currently loaded book with background color
- **Smart Button**: Shows "Play" or "Pause" based on current playback state

## Data Flow

```
HomeContainer
  ├─ Fetches: useGetBooksInProgress()
  ├─ Enhances: Adds isCurrentlyLoaded, isPlaying, currentTime
  ├─ Caches: Stores positions in positionCacheRef
  └─ Renders: FlashList of InProgressItem components
      └─ Each InProgressItem:
          ├─ Displays book info
          └─ Handles play/pause via callbacks
```

## Type Definitions

### EnhancedBookItem
Extends `ABSGetItemInProgress` with:
- `isCurrentlyLoaded: boolean` - Whether this book is loaded in player
- `isPlaying: boolean` - Whether this book is currently playing
- `currentTime: number` - Current playback position (cached or live)

## Position Caching Strategy

The HomeContainer uses a three-tier strategy for determining `currentTime`:

1. **Live Position** (Priority 1): If book is loaded and playing, use `progress.position`
2. **Cached Position** (Priority 2): If book was loaded before, use cached position
3. **Server Data** (Priority 3): Fall back to `book.currentTime` from API

This prevents the position from reverting to stale server data when:
- User switches between books
- Book is unloaded but still in progress list
- Screen is navigated away and back

## Optimistic Updates

When a user starts playing a book, the component:
1. Loads the book via `handleInitBook(itemId)`
2. Calls `moveBookToTopOfInProgress(itemId, activeLibraryId)`
3. React Query cache is immediately updated
4. UI re-renders with book at top (instant feedback)
5. Server syncs naturally on next refetch

## Performance Optimizations

1. **InProgressItem Memoization**: Only re-renders when:
   - Book ID changes
   - Play/pause state changes
   - Loaded state changes
   - Current time changes (rounded to seconds)

2. **Callback Memoization**: `renderItem` and `keyExtractor` use `useCallback`

3. **Data Enhancement Memoization**: `enhancedBooks` uses `useMemo` with precise dependencies

4. **Position Cache**: `useRef` for position cache (doesn't trigger re-renders)

## Related Files

- `src/hooks/ABSHooks.ts` - Contains `useGetBooksInProgress` and `moveBookToTopOfInProgress`
- `src/store/store-playback.ts` - Playback actions and state
- `OPTIMISTIC_CACHE_UPDATE_GUIDE.md` - Detailed guide on optimistic updates