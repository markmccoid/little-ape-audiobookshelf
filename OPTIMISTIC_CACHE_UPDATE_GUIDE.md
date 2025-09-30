# Optimistic React Query Cache Updates Guide

## Problem
When a user starts playing a book, the server takes time to recognize the book as "in progress" and update the books list order. This creates a poor UX where the book doesn't immediately move to the top of the list.

## Solution
We implemented **optimistic cache updates** using React Query's `setQueryData` to immediately move the playing book to the top of the list, providing instant feedback without waiting for server synchronization.

## Implementation

### 1. Helper Function (`src/hooks/ABSHooks.ts`)

```typescript
export const moveBookToTopOfInProgress = (bookId: string, activeLibraryId: string | null) => {
  if (!activeLibraryId) return;

  const queryKey = ["booksInProgress", activeLibraryId];
  
  // Get current cache data
  const currentData = queryClient.getQueryData<ABSGetItemsInProgress>(queryKey);
  
  if (!currentData || currentData.length === 0) return;

  // Find the book that's starting to play
  const bookIndex = currentData.findIndex((book) => book.id === bookId);
  
  if (bookIndex === -1 || bookIndex === 0) return;

  // Create new array with the book moved to the top
  const updatedData = [
    currentData[bookIndex], // Move playing book to position 0
    ...currentData.slice(0, bookIndex), // Everything before it
    ...currentData.slice(bookIndex + 1), // Everything after it
  ];

  // Optimistically update the cache
  queryClient.setQueryData<ABSGetItemsInProgress>(queryKey, updatedData);
};
```

### 2. Usage in HomeContainer (`src/components/home/HomeContainer.tsx`)

```typescript
const HomeContainer = () => {
  const absAPI = useSafeAbsAPI();
  const activeLibraryId = absAPI?.getActiveLibraryId() || null;
  const { loadBook: handleInitBook } = usePlaybackActions();

  // Wrapper function that loads book and optimistically updates cache
  const handleInitBookWithOptimisticUpdate = useCallback(
    async (itemId: string) => {
      // First, load the book
      await handleInitBook(itemId);
      // Then, optimistically move it to the top of the in-progress list
      moveBookToTopOfInProgress(itemId, activeLibraryId);
    },
    [handleInitBook, activeLibraryId]
  );

  // Use the wrapper in your UI
  return <ItemComponent onInitBook={handleInitBookWithOptimisticUpdate} />;
};
```

## Benefits

1. **Instant Feedback**: The book immediately moves to the top when playback starts
2. **No Server Wait**: Don't need to wait for server to process and return updated order
3. **No Invalidation Needed**: Doesn't trigger a full query refetch, preserving other state
4. **Self-Correcting**: When the query naturally refetches later, it will sync with server state

## How It Works

1. User clicks play on a book
2. `handleInitBook` loads the book into the player
3. `moveBookToTopOfInProgress` immediately updates the React Query cache
4. UI re-renders with the book at the top (instant)
5. Later, when the query refetches naturally, it syncs with server state

## Key Points

- Uses `queryClient.setQueryData()` for direct cache manipulation
- Preserves all book data, just reorders the array
- Safe - includes checks for edge cases (book not found, already at top, etc.)
- Works with existing React Query caching and refetching strategies
- No risk of data loss - the cache will sync with server on next refetch

## Alternative Approaches Considered

### 1. Query Invalidation
```typescript
// ❌ Not ideal - causes full refetch and loading states
queryClient.invalidateQueries({ queryKey: ["booksInProgress", activeLibraryId] });
```
**Why not**: Takes time for server to update, causes loading states, wastes network

### 2. Mutation with onMutate
```typescript
// ⚠️ More complex - overkill for simple reordering
const mutation = useMutation({
  onMutate: async (newBook) => {
    // Optimistic update here
  }
});
```
**Why not**: Adds unnecessary complexity for a simple array reorder

### 3. Local State Management
```typescript
// ⚠️ Possible but diverges from React Query
const [localBooks, setLocalBooks] = useState(books);
```
**Why not**: Creates state synchronization issues between local and server state

## Usage in Other Parts of the App

If you need to use this elsewhere, just import and call:

```typescript
import { moveBookToTopOfInProgress } from '@/src/hooks/ABSHooks';

// When starting playback
await loadBook(bookId);
moveBookToTopOfInProgress(bookId, activeLibraryId);
```

## Related Files

- `src/hooks/ABSHooks.ts` - Helper function definition
- `src/components/home/HomeContainer.tsx` - Usage example
- `src/store/store-playback.ts` - Playback actions