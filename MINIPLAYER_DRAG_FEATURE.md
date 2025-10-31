# MiniPlayer Drag Feature

## Overview
The MiniPlayer component now supports dragging functionality via long press gesture, allowing users to position it anywhere on the screen. The position is persisted using MMKV storage.

## Implementation Details

### Files Created

#### 1. `src/store/store-miniPlayer.ts`
- Zustand store for persisting MiniPlayer position
- Stores x/y coordinates in MMKV storage
- Provides hooks: `useMiniPlayerPosition()` and `useMiniPlayerActions()`
- Default position: null (falls back to centered at bottom)

#### 2. `src/hooks/useMiniPlayerDrag.ts`
- Custom hook managing all drag logic and animations
- Accepts optional `onCloseSession` callback
- Combines two gestures with `Gesture.Race()`:
  - **Fling Down**: Quick swipe down to close session
  - **Pan + Long Press**: Drag to reposition (activates after 500ms hold)
- Features:
  - Long press activation (500ms) with haptic feedback
  - Swipe down to close with success haptic
  - Boundary constraints (respects safe area insets)
  - Smooth spring animations during drag
  - Visual feedback (scale, opacity, border)
  - Position persistence on drag end
  - Single-finger drag only (minPointers/maxPointers: 1)
- Returns: `{ gesture, animatedStyle, isDragging }`

### Files Modified

#### 3. `src/components/miniPlayer/MiniPlayer.tsx`
- Integrated `useMiniPlayerDrag` hook
- Wrapped component with `GestureDetector`
- Applied animated styles for positioning
- Added visual feedback (border change during drag)
- Disabled interactions during drag (Link, Pressables)
- Cleaned up unused code and hooks

## User Experience

### Long Press + Drag
1. **Long Press** - User holds down on MiniPlayer for 500ms
2. **Haptic Feedback** - Device vibrates to confirm drag mode
3. **Visual Feedback** - MiniPlayer scales slightly and border appears
4. **Drag** - User can move MiniPlayer anywhere on screen
5. **Boundary Prevention** - Cannot drag off-screen
6. **Release** - Position is saved and springs to final location
7. **Persistence** - Position remembered across app sessions

### Swipe Down to Close
1. **Quick Swipe Down** - User performs a quick downward swipe/fling
2. **Success Haptic** - Device gives success feedback
3. **Session Closes** - Audio session closes and MiniPlayer disappears

## Technical Features

- ✅ **Reanimated Worklets** - All animations run on UI thread (60fps)
- ✅ **Gesture Handler** - Native gesture recognition
- ✅ **MMKV Persistence** - Fast, synchronous storage
- ✅ **Safe Area Aware** - Respects device notches and home indicators
- ✅ **Clean Architecture** - Logic separated into reusable hook
- ✅ **Zero Lint Errors** - Follows codebase conventions

## Configuration

### Adjust Long Press Duration
In `useMiniPlayerDrag.ts`:
```typescript
const LONG_PRESS_DURATION = 500; // milliseconds
```

### Adjust MiniPlayer Dimensions
In `useMiniPlayerDrag.ts`:
```typescript
const MINI_PLAYER_WIDTH = 200;
const MINI_PLAYER_HEIGHT = 120;
```

### Reset Position
Users can reset to default position by calling:
```typescript
const { resetPosition } = useMiniPlayerActions();
resetPosition();
```

## Future Enhancements

Potential improvements:
- Double tap to reset position
- Snap to edges/corners
- Different sizes (compact/expanded)
- Settings UI to reset position
- Animation presets (bounce, slide, etc.)
