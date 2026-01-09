# MiniPlayer Architecture

The `MiniPlayer` is a persistent floating component that displays playback controls and track information. It is designed to be draggable, capable of snapping to screen bounds, and responsive to application state (specifically the Filter Sheet).

## Components & Hooks

### `MiniPlayer.tsx`

The visual component.

- **Rendering**: Uses `LiquidGlassView` for a premium blurred background effect.
- **State Integration**: Connects to `usePlaybackStore` for playback state and `useFiltersStore` for UI layout adjustments.
- **Animations**: Uses `react-native-reanimated` for smooth entrance/exit (`SlideInDown`/`SlideOutDown`) and drag transformations.
- **Interactions**: Wraps content in a `GestureDetector` provided by the drag hook.

### `useMiniPlayerDrag.ts`

The core logic for gesture handling and positioning.

- **Drag Logic**: Uses `react-native-gesture-handler` (Pan + Fling).
- **Position State**: Uses `useSharedValue` for `translateX`/`translateY` to ensure smooth 60fps animations on the UI thread.
- **Persistence**: Saves the final user-selected position to `store-miniPlayer`.
- **Filter Sheet Response**: Automatically moves the player to the bottom-right corner when the Filter Sheet is open (see "Filter Sheet Interaction" below).

### `store-miniPlayer.ts`

Zustand store for persisting the player's position.

- **Storage**: Uses `mmkv-storage` for fast synchronous persistence.
- **State**: Stores `position: { x, y } | null`. Null indicates default positioning.

## Key Behaviors

### 1. Drag & Drop

- **Constraints**: Constrained to screen safe areas (via `clampX`/`clampY`).
- **Gestures**:
  - **Pan**: Move the player.
  - **Fling Down**: Close the current session.
  - **Fling Up**: Reset to default position (centered bottom).

### 2. Filter Sheet Interaction

When the user opens the Filter Sheet (`filterSheetShown` becomes true), the MiniPlayer adapts to avoid obstructing the view.

- **Trigger**: Listens to `useFiltersStore.filterSheetShown`.
- **Action**:
  - **On Open**:
    1.  Saves the current user-defined position to `previousPositionX/Y` shared values.
    2.  Animates to the bottom-right corner.
    3.  Sets `isFilteredRef` to true to lock the "restore" target.
  - **On Close**:
    1.  Animates back to the saved `previousPositionX/Y`.
    2.  Resets `isFilteredRef`.
- **Persistence Protection**: The `savePosition` function is guarded (`if (!filterSheetShown)`). If the user drags the player _while_ the filter sheet is open, those coordinates are **not** saved to persistent storage. This ensures the temporary corner position doesn't become the permanent default.

### 3. Sizing

- **Regular Mode**: Expands to `width - 64`.
- **Filter Mode**: Shrinks to width `75` (icon only).
