# Little Ape Audiobookshelf App Overview

This document gives a high-level understanding of how the React Native + Expo app works and how it integrates with the Audiobookshelf (ABS) server for audiobook streaming, downloads, and playback sync.

## What This App Does

- Streams audiobooks from an Audiobookshelf server.
- Supports downloading audiobooks for offline playback.
- Keeps playback progress synced with the ABS server, with offline queueing.
- Uses a unified playback pipeline for streamed and downloaded audio.

## Core Architecture

- **Framework**: React Native + Expo
- **Navigation**: Expo Router (file-based)
- **State**: Zustand (local app state) + React Query (server cache)
- **Playback**: react-native-track-player
- **Storage**: MMKV for fast local persistence, SecureStore for auth

## App Startup Flow

1. `src/app/_layout.tsx` runs app initialization once.
2. `trackPlayerInit()` initializes the audio engine.
3. `absInitalize()` creates ABS auth and API singletons.
4. `storeInit()` hydrates local stores when auth is ready.
5. App renders the main navigation and the `MiniPlayer`.

## Auth + ABS API

- `AudiobookshelfAuth` manages tokens and refresh.
- `AudiobookshelfAPI` wraps ABS endpoints and injects auth.
- `AuthContext` exposes `useSafeAbsAPI()` for safe access.

Key files:
- `src/utils/AudiobookShelf/absAuthClass.ts`
- `src/utils/AudiobookShelf/absAPIClass.ts`
- `src/utils/AudiobookShelf/absInit.ts`
- `src/contexts/AuthContext.tsx`

## Playback System (Unified)

Playback is coordinated by a singleton facade that handles both streaming and local downloads using the same flow.

- `AudiobookStreamer` is the facade and event listener.
- `SessionManager` tracks the active book session and global position math.
- `SyncManager` handles periodic sync, forced sync, and offline queueing.

Key files:
- `src/utils/rn-trackplayer/AudiobookStreamer.ts`
- `src/utils/rn-trackplayer/SessionManager.ts`
- `src/utils/rn-trackplayer/SyncManager.ts`
- `src/store/store-playback.ts`

## Streaming vs Downloaded Flow

- `store-playback.loadBook(itemId)` branches by download status.
- Streamed path creates a server session and uses ABS URLs.
- Downloaded path maps local files to tracks and uses no sessionId.
- Both paths feed TrackPlayer and share the same sync logic.

See: `docs/PlaybackSessionSync.md`

## Progress Sync (Server Is Source of Truth)

- Sync uses a timer while playing and a forced sync on pause.
- If offline, syncs are queued in MMKV and replayed later.
- The books store is updated from server responses to avoid drift.

See: `docs/PlaybackSessionSync.md` and `CODEDOCS.md`

## Key Screens

- **Home**: `src/screens/Home/HomeContainer.tsx`
- **Library**: `src/screens/Library/LibraryContainer.tsx`
- **Book Detail**: `src/screens/BookViewer/BookContainer.tsx`
- **Main Player**: `src/screens/MainPlayer/MainPlayerContainer.tsx`

## Downloads

- Download flow uses `react-native-blob-util` for progress and cancel.
- File ops are centralized in `src/utils/fileSystemAccess.ts`.
- UI is in `src/screens/BookViewer/DownloadSheet.tsx`.

## UI Responsiveness Notes

- `useSmartPosition()` provides fast UI updates for sliders.
- Seeking uses optimistic position and debounced jumps.

See: `docs/PlaybackSeekingUI.md`

## Mini Player

- Draggable, persistent mini player using MMKV.
- Adapts position when the Filter Sheet is open.

See: `docs/MiniPlayer.md`

