# Little Ape Audiobook Application Flow

**Last Updated:** 2025-10-30  
**Purpose:** Technical reference document describing the architecture, data flow, and key interactions in the audiobook streaming application.

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Application Initialization](#application-initialization)
4. [Authentication Flow](#authentication-flow)
5. [Navigation Structure](#navigation-structure)
6. [State Management](#state-management)
7. [Audio Playback System](#audio-playback-system)
8. [Data Flow Patterns](#data-flow-patterns)
9. [Key User Journeys](#key-user-journeys)

---

## Overview

This is a React Native audiobook player application built with Expo that streams audiobooks from an Audiobookshelf server. The app features persistent authentication, real-time playback progress synchronization, and a rich playback interface with chapter navigation.

**Core Technologies:**
- **Framework:** React Native + Expo (v54)
- **Navigation:** Expo Router (file-based routing)
- **State Management:** Zustand (global state) + React Query (server state)
- **Audio Playback:** react-native-track-player
- **Storage:** MMKV (fast local storage) + Expo SecureStore (credentials)
- **Styling:** NativeWind (Tailwind CSS)

---

## Architecture Components

### 1. Core Singletons

The application relies on three singleton instances that are initialized once and persist throughout the app lifecycle:

#### **AudiobookshelfAuth** (`src/utils/AudiobookShelf/absAuthClass.ts`)
- Manages authentication tokens (access token, refresh token)
- Handles automatic token refresh before expiration
- Stores credentials in Expo SecureStore
- Provides synchronous auth status checks via `isAssumedAuthedGlobal`

#### **AudiobookshelfAPI** (`src/utils/AudiobookShelf/absAPIClass.ts`)
- Wraps all API endpoints to Audiobookshelf server
- Automatically handles authentication for every request
- Manages active library selection
- Provides methods for:
  - Library browsing and filtering
  - Playback session management
  - Progress tracking and bookmarks
  - User preferences

#### **AudiobookStreamer** (`src/utils/rn-trackplayer/AudiobookStreamer.ts`)
- Singleton coordinator between TrackPlayer and Audiobookshelf server
- Manages playback sessions and progress synchronization
- Handles multi-track audiobook playback with chapter support
- Implements real-time sync timer (configurable interval, default 60s)
- Prevents race conditions during book switches
- Queues failed syncs for retry when network recovers

### 2. Context Providers

#### **AuthContext** (`src/contexts/AuthContext.tsx`)
- React context wrapping AudiobookshelfAuth singleton
- Provides hooks for auth status: `useAuth()`, `useSafeAbsAPI()`
- Manages auth state changes and logout flow
- Triggers re-initialization of API after login
- Safe instance access prevents crashes from accessing uninitialized instances

### 3. State Stores (Zustand)

#### **Playback Store** (`src/store/store-playback.ts`)
- Current session data (book, cover, duration)
- Playback state (playing, paused, position)
- Queue management (multi-track audiobooks)
- Playback actions (play, pause, seek, next, prev)
- UI state (isOnBookScreen, isLoaded)

#### **Books Store** (`src/store/store-books.ts`)
- Book metadata cache (title, author, cover, description)
- User-specific data (currentPosition, playbackRate)
- Chapter information (enhanced with formatting)
- Persisted to MMKV for offline access
- Lazy loading: returns cached data immediately, refreshes in background

#### **Settings Store** (`src/store/store-settings.ts`)
- User preferences (sync interval, playback defaults)
- App configuration

#### **Filters Store** (`src/store/store-filters.ts`)
- Library filtering state (genres, tags, series, authors)
- Sort preferences

### 4. React Query Integration

**Query Client** (`src/utils/queryClient.ts`)
- Manages server-side data caching
- Used for:
  - Library items
  - Book details
  - Personalized views (continue listening, recently added)
  - User progress data
- Stale time: 5 minutes (configurable per query)
- Automatic refetch on window focus
- Cache invalidation on library change

---

## Application Initialization

### Startup Sequence (_layout.tsx)

```
1. Root Layout Renders
   └─> QueryClientProvider
       └─> AuthProvider (creates AuthContext)
           └─> AppContent

2. AppContent useEffect (runs once)
   ├─> trackPlayerInit()        // Initialize audio engine
   ├─> absInitalize()            // Initialize ABS Auth + API
   │   ├─> Check for stored credentials (SecureStore)
   │   ├─> Create AudiobookshelfAuth singleton
   │   ├─> Create AudiobookshelfAPI singleton
   │   ├─> Prewarm React Query cache (fetch libraries)
   │   └─> Return success/failure
   └─> checkAuthStatus()         // Update AuthContext state

3. If Initialization Successful
   ├─> Hide splash screen
   └─> Navigate to (tabs) route (Home screen)

4. If No Stored Credentials
   ├─> User sees "Not Authenticated" UI
   └─> Redirect to settings/abs_auth for login
```

### Key Initialization Functions

**`absInitalize()`** - (`src/utils/AudiobookShelf/absInit.ts`)
- Only runs if stored credentials exist
- Creates Auth and API singletons
- Wraps API in Proxy for automatic auth checks
- Pre-warms React Query cache with library items
- Returns `false` if no credentials found (user must login)

**`trackPlayerInit()`** - (`src/utils/rn-trackplayer/rn-trackplayerInit.ts`)
- Configures react-native-track-player service
- Sets up playback capabilities (seek, rate, skip)
- Registers background playback service
- Configures progress update interval (5 seconds)

---

## Authentication Flow

### First-Time Login

```
1. User navigates to Settings → ABS Authentication
   └─> screens/Settings/auth/ABSAuthMain.tsx

2. User enters credentials
   ├─> Server URL (e.g., https://abs.example.com)
   ├─> Username
   └─> Password

3. Login Process (absAuthClass.ts)
   ├─> POST /login with credentials
   ├─> Receive tokens (accessToken, refreshToken, oldToken)
   ├─> Calculate token expiry from JWT
   ├─> Store tokens in SecureStore
   ├─> Store server URL in SecureStore
   └─> Store user info (username, email, userId) in SecureStore

4. Post-Login Initialization
   ├─> AuthContext.initializeAfterLogin()
   ├─> absInitalize() creates fresh API instance
   ├─> AudiobookStreamer singleton created
   └─> Navigate to Home screen
```

### Subsequent App Launches

```
1. App starts → absInitalize() runs
   ├─> AudiobookshelfAuth.hasStoredCredentials() = true
   ├─> Load tokens from SecureStore into memory
   ├─> Load server URL from SecureStore
   └─> Create Auth + API singletons

2. First API Request
   ├─> Check if access token expired
   ├─> If expired: Auto-refresh using refresh token
   │   ├─> POST /auth/refresh
   │   ├─> Update tokens in memory + SecureStore
   │   └─> Retry original request
   └─> If refresh fails: Clear tokens, redirect to login

3. User Experience
   └─> Seamless - no login required until tokens expire
```

### Token Management

**Access Token:**
- Short-lived (typically 1 hour)
- Used for all API requests
- Automatically refreshed 5 minutes before expiry
- Stored in memory for fast access

**Refresh Token:**
- Long-lived (typically 30 days)
- Used only to refresh access token
- Stored in SecureStore
- If refresh fails, user must login again

**Logout Process:**
```
1. User triggers logout
   ├─> POST /logout (with refresh token)
   ├─> Clear tokens from SecureStore
   ├─> Clear user info from SecureStore
   ├─> Reset Auth singleton instance
   ├─> Cleanup API and AudiobookStreamer instances
   ├─> Close active playback session
   └─> Navigate to login screen
```

---

## Navigation Structure

### Route Hierarchy (Expo Router)

```
src/app/
├─ _layout.tsx                    [Root - Auth + Query providers]
├─ (tabs)/                        [Tab Navigator - Bottom tabs]
│  ├─ _layout.tsx                 [Tab configuration]
│  ├─ (home)/                     [Home Stack]
│  │  ├─ index.tsx                → Home screen (continue listening, shelves)
│  │  └─ [libraryItemId].tsx      → Book details page
│  ├─ library/                    [Library Stack]
│  │  ├─ index.tsx                → Library browsing (filterable)
│  │  ├─ [libraryItemId].tsx      → Book details page
│  │  └─ filterroute.tsx          → Filter selection UI
│  └─ collections/                [Collections Stack - Future]
│     └─ index.tsx
├─ settings/                      [Settings Modal]
│  ├─ _layout.tsx                 [Stack Navigator]
│  ├─ index.tsx                   → Settings home
│  └─ abs_auth.tsx                → Login/authentication
└─ main-player.tsx                [Full-screen Player Modal]
```

### Navigation Patterns

**Persistent Bottom Bar:**
- Home, Library, Collections tabs
- MiniPlayer overlays bottom tabs when book is loaded
- Bottom tabs hide when on Book Details or Main Player screens

**Modal Presentations:**
- Settings: Full-screen modal (slides from bottom)
- Main Player: Card modal with rounded corners (dismissible via swipe)

**Deep Linking:**
- Book details: `/(tabs)/(home)/[libraryItemId]`
- Library with filters: `/library/filterroute`
- Player: `/main-player`

---

## State Management

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIOBOOKSHELF SERVER                         │
└─────────────────────────────────────────────────────────────────┘
                               ▲
                               │
                    ┌──────────┴──────────┐
                    │                     │
         ┌──────────▼─────────┐  ┌───────▼────────┐
         │ AudiobookshelfAPI  │  │  TrackPlayer   │
         │    (Singleton)     │  │  (RN Package)  │
         └──────────┬─────────┘  └───────┬────────┘
                    │                    │
         ┌──────────▼────────────────────▼─────────┐
         │      AudiobookStreamer (Singleton)      │
         │  • Session management                   │
         │  • Progress sync (real-time timer)      │
         │  • Multi-track coordination             │
         └──────────┬──────────────────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
┌────────▼──────┐    ┌─────────▼────────┐
│ React Query   │    │ Zustand Stores   │
│ • Library     │    │ • Playback       │
│ • Progress    │    │ • Books          │
│ • Shelves     │    │ • Settings       │
└────────┬──────┘    └─────────┬────────┘
         │                     │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │   React Components  │
         │   (UI Layer)        │
         └─────────────────────┘
```

### State Responsibilities

**React Query (Server State):**
- Source of truth for server data
- Automatically refetches when stale
- Handles loading/error states
- Used in: Home shelves, Library browsing, Book details

**Zustand Playback Store (Client State):**
- Current playback session
- Real-time position and duration
- UI state (isPlaying, isLoaded, seeking)
- Actions for play/pause/seek
- Does NOT persist (ephemeral)

**Zustand Books Store (Cached State):**
- Book metadata for quick access
- User preferences per book (playbackRate)
- Current position (synced from server responses)
- Persisted to MMKV
- Lazy loading pattern: return cache, update in background

**Zustand Settings Store (User Preferences):**
- Sync interval configuration
- UI preferences
- Persisted to MMKV

### Sync Flow: Position Updates

```
1. User plays audiobook
   └─> AudiobookStreamer starts real-time sync timer

2. Every N seconds (default 60s, configurable)
   ├─> Calculate time listened since last sync
   ├─> Get current position from TrackPlayer
   ├─> POST /api/session/{sessionId}/sync
   │   └─> Server updates progress
   └─> On successful sync:
       ├─> Update Books Store with new position
       └─> Process any queued syncs (from network failures)

3. On pause/stop
   ├─> Force immediate sync to server
   ├─> Stop sync timer
   └─> Update Books Store with final position

4. On seek operation
   └─> Immediate position sync (no time accumulated)

5. On book switch
   ├─> Capture current session state
   ├─> Pending session close stored
   ├─> New book session started
   └─> Previous session synced/closed after transition
```

**Race Condition Prevention:**
- `isSyncing` flag prevents concurrent sync operations
- `sessionClosed` flag prevents syncing to closed sessions
- `pendingSessionClose` captures state before book switches
- Active track's sessionId/libraryItemId used (not this.session) to prevent cross-contamination

---

## Audio Playback System

### Components

**TrackPlayer (react-native-track-player)**
- Low-level audio engine
- Handles actual audio streaming
- Multi-track queue management
- Background playback support
- Emits events: PlaybackState, PlaybackProgressUpdated

**AudiobookStreamer (Singleton)**
- High-level coordinator
- Bridges TrackPlayer ↔ Audiobookshelf API
- Session lifecycle management
- Progress synchronization
- Chapter offset calculations

**Playback Store (Zustand)**
- UI state management
- Exposes playback actions to components
- Listens to TrackPlayer events
- Updates position/duration for UI

### Playback Flow

#### Loading a Book

```
1. User taps "Play" on book
   └─> playbackActions.loadBookAndPlay(libraryItemId)

2. Check if book already loaded
   ├─> If same book: no-op (preserve state)
   └─> If different: proceed with loading

3. Initialize AudiobookStreamer (if not ready)
   └─> AudiobookStreamer.getInstance(serverUrl, apiClient, syncInterval)

4. Setup Audiobook Playback
   ├─> AudiobookStreamer.setupAudioPlayback(itemId)
   ├─> POST /api/items/{itemId}/play
   │   └─> Server returns:
   │       • Session ID
   │       • Audio tracks (URLs with session token)
   │       • Chapters
   │       • Start time (last progress position)
   └─> Calculate track offsets (for multi-track books)

5. Configure TrackPlayer
   ├─> Reset current queue
   ├─> Add all tracks to queue
   ├─> Each track contains:
   │   • Stream URL: /audiobookshelf/public/session/{sessionId}/track/{index}
   │   • Metadata: title, author, artwork
   │   • Custom fields: sessionId, libraryItemId, trackOffset, chapters
   └─> Seek to start time

6. Fetch Book Metadata (parallel)
   ├─> Books Store: getOrFetchBook()
   ├─> Returns cached immediately
   └─> Refreshes from server in background

7. Apply User Preferences
   ├─> Set playback rate (from Books Store)
   └─> Update Playback Store state

8. Start Playback
   ├─> TrackPlayer.play()
   ├─> AudiobookStreamer starts sync timer
   └─> UI updates to show playing state
```

#### Multi-Track Handling

Audiobooks can consist of multiple audio files. The app handles this seamlessly:

**Track Offsets:**
- Each track stores `trackOffset` = sum of previous track durations
- Global position = trackOffset + current track position
- Example: Track 3 at 5:30, previous tracks = 2:30:00 total → Global position = 2:35:30

**Seeking Across Tracks:**
```
1. User seeks to global position (e.g., 2:35:30)
2. Find which track contains this position
   └─> Compare against track offsets
3. Skip to correct track if needed
4. Seek within track: globalPos - trackOffset
5. Sync new position to server immediately
```

#### Chapter Navigation

Chapters are metadata that can span multiple tracks:

```
Book: 5 hours
├─ Track 1 (0:00 - 2:30:00)
│  ├─ Chapter 1: 0:00 - 0:45:00
│  ├─ Chapter 2: 0:45:00 - 1:30:00
│  └─ Chapter 3: 1:30:00 - 2:30:00
└─ Track 2 (2:30:00 - 5:00:00)
   ├─ Chapter 4: 2:30:00 - 3:45:00
   └─ Chapter 5: 3:45:00 - 5:00:00
```

**Enhanced Chapter Data:**
- Stored in Books Store with formatting
- Includes: start/end times, duration, completion percentage
- UI can display chapter progress and allow direct navigation

### Session Management

**Session Lifecycle:**
```
1. Session Created
   └─> POST /api/items/{itemId}/play
       └─> Returns session ID

2. Active Session
   ├─> Regular syncs every N seconds
   ├─> Position stored on server
   └─> Can be resumed across devices

3. Session Close (multiple triggers)
   ├─> User closes session explicitly
   ├─> User switches to different book
   ├─> App backgrounded (future feature)
   └─> POST /api/session/{sessionId}/close
       • Final time listened
       • Final position
       • Server marks session complete
```

**Concurrent Session Prevention:**
- When switching books, old session captured and closed
- New session doesn't start until old session cleanup complete
- Prevents "ghost" sessions on server

---

## Data Flow Patterns

### Pattern 1: Lazy Loading with Background Refresh

Used in Books Store for optimal UX:

```javascript
// User requests book
const book = await booksStore.getOrFetchBook({ userId, libraryItemId });

// Pattern:
1. Check cache → Return immediately (even if stale)
2. Fetch from server in background
3. Update cache when response arrives
4. UI re-renders with fresh data

// Benefits:
- Instant UI response (no loading spinners)
- Always shows most recent data
- Works offline (shows cached data)
```

### Pattern 2: Optimistic Updates with Server Sync

Used in playback progress:

```javascript
// Progress sync pattern:
1. UI updates immediately from TrackPlayer events (every 5s)
2. Position stored in Playback Store (ephemeral)
3. Server sync happens independently (every 60s)
4. On successful server sync:
   └─> Update Books Store (persisted cache)
   
// Benefits:
- Smooth UI updates (no lag)
- Server is source of truth
- Offline resilience (queued syncs retry)
```

### Pattern 3: Singleton + Context

Used for Auth and API:

```javascript
// Initialization:
1. Singleton created once on app start
2. Context wrapper provides React integration
3. Hooks provide safe access

// Access patterns:
- Direct: getAbsAPI() (throws if not initialized)
- Safe: useSafeAbsAPI() (returns null if not initialized)
- Guarded: useAuth().isAuthenticated (boolean check)

// Benefits:
- Single instance across app
- No prop drilling
- Type-safe access
```

---

## Key User Journeys

### Journey 1: First-Time User

```
1. Install app → Opens to "Not Authenticated" screen
2. Tap "Login" → Navigate to Settings/ABS Auth
3. Enter credentials → Submit
4. Login success → absInitalize() runs
5. Redirect to Home → See personalized shelves
6. Tap book → Book details screen
7. Tap "Play" → Load audiobook, start playing
8. Mini player appears → Persist across navigation
9. Close app → Progress saved to server

Next launch:
- Auto-login with stored credentials
- Continue from last position
```

### Journey 2: Browsing and Filtering

```
1. Home screen shows:
   ├─ Continue Listening (in-progress books)
   ├─ Recently Added
   ├─ Recent Series
   └─ Discover (personalized)

2. Tap Library tab
   └─> Full library with all books

3. Tap Filter icon
   ├─> Bottom sheet with filter options
   ├─> Select filter type (genres, tags, series, authors)
   ├─> Select specific value
   └─> Library updates with filtered results

4. Tap Sort icon
   └─> Change sort order (recent, title, author, duration)

5. Apply multiple filters
   └─> Filters stored in Filters Store
   └─> React Query refetches with filter params
```

### Journey 3: Playback Session

```
1. Playing audiobook in background
   ├─> Mini player visible on all screens
   ├─> Shows: title, author, play/pause, progress bar
   └─> Tap mini player → Opens main player

2. Main Player Screen
   ├─> Full-screen album art with blur effect
   ├─> Playback controls: back 15s, play/pause, forward 15s
   ├─> Seek slider (with chapter markers)
   ├─> Current chapter display
   ├─> Playback rate control (0.5x - 3.0x)
   ├─> Chapter list (tap to jump)
   └─> Sleep timer (future feature)

3. During playback:
   ├─> Progress syncs every 60s to server
   ├─> Books Store updates after each sync
   ├─> Position preserved across app restarts
   └─> On pause: immediate sync to server

4. Close session
   ├─> Tap "Close" in mini player
   ├─> Final sync to server
   ├─> Session closed on server
   ├─> Mini player disappears
   └─> TrackPlayer queue cleared
```

### Journey 4: Book Switching

```
1. Playing Book A at 1:23:45
2. User navigates to Library
3. User taps "Play" on Book B

Behind the scenes:
├─> Capture Book A session state (position, time listened)
├─> Store as pendingSessionClose
├─> Load Book B session (new session ID from server)
├─> Configure TrackPlayer with Book B tracks
├─> After TrackPlayer ready:
│   ├─> Sync Book A final position
│   ├─> Close Book A session on server
│   └─> Start Book B playback
└─> Mini player updates to show Book B

Race condition prevention:
- Active track's sessionId used (not this.session)
- Prevents syncing Book B position to Book A session
- Pending close ensures Book A progress saved
```

### Journey 5: Network Resilience

```
Scenario: User listening on spotty connection

1. Progress sync fails (network timeout)
   ├─> Sync queued for later
   ├─> Playback continues uninterrupted
   └─> UI shows current position (from TrackPlayer)

2. Network reconnects
   ├─> Next successful sync detected
   ├─> Process all queued syncs (max 3 retries each)
   └─> Server catches up with all progress

3. If network still unavailable
   ├─> Queued syncs persist in memory
   ├─> Manual sync on next app launch (future feature)
   └─> Position preserved in Books Store (local cache)

Offline playback (future):
- Downloaded books play without network
- Progress tracked locally (OfflineListenSession)
- Synced to server when connection restored
```

---

## Technical Considerations

### Performance Optimizations

1. **React Query Caching**
   - 5-minute stale time reduces API calls
   - Prefetching on library change
   - Background refetch on focus

2. **Zustand Atomic Selectors**
   - Components subscribe to specific state slices
   - Prevents unnecessary re-renders
   - Example: `usePlaybackPosition()` only updates when position changes

3. **Books Store Throttling**
   - Server syncs every 60s (configurable)
   - Books Store updates every 30s (or on pause)
   - Reduces re-render frequency

4. **Image Optimization**
   - expo-image with placeholder support
   - Cover URLs include auth token (single request)
   - WebP format for smaller file sizes

5. **MMKV Storage**
   - Synchronous, fast key-value storage
   - Used for Books Store persistence
   - 10x faster than AsyncStorage

### Error Handling

**Authentication Errors:**
- Invalid credentials → Show error message, stay on login
- Expired refresh token → Clear storage, redirect to login
- Network error during auth → Show retry option

**API Errors:**
- 401 Unauthorized → Attempt token refresh, retry once
- 404 Not Found → Handle gracefully (item might be deleted)
- 500 Server Error → Show user-friendly message
- Network timeout → Retry with exponential backoff

**Playback Errors:**
- Session not found (404) → Mark session closed, prevent further syncs
- Stream error → Show error, allow retry
- Seek error → Reset to last known good position

### Future Enhancements

1. **Download Support**
   - Download audiobooks for offline listening
   - Offline progress tracking (already stubbed in AudiobookStreamer)
   - Sync offline sessions when online

2. **Background Playback**
   - Continue playing when app backgrounded
   - Lock screen controls (already supported by TrackPlayer)
   - Notification with playback controls

3. **Advanced Features**
   - Sleep timer
   - Bookmarks UI (API support exists)
   - Playback speed presets per book
   - Chapter-based notifications

4. **Social Features**
   - Listening stats
   - Progress sharing
   - Book reviews

---

## Troubleshooting Guide

### Common Issues

**"Please login to continue" error:**
- Cause: Auth singleton not initialized or tokens expired
- Solution: Check `AudiobookshelfAuth.isAssumedAuthedGlobal`, re-login if needed

**Position not syncing:**
- Check: Is session closed? (`sessionClosed` flag)
- Check: Is sync timer running? (starts on play, stops on pause)
- Check: Network connectivity (syncs queue if offline)

**Book won't load:**
- Verify: Server URL is correct and accessible
- Verify: Library exists and user has access
- Check: `getPlayInfo()` API call succeeds (session creation)

**Progress lost after app restart:**
- Check: Books Store persisted to MMKV?
- Check: Last sync succeeded before app close?
- Check: Server has progress record (`/api/me/progress/{itemId}`)

**Cross-book contamination:**
- Verify: Active track's sessionId/libraryItemId used (not this.session)
- Verify: Pending session close captured before book switch
- Verify: Race condition flags prevent concurrent syncs

---

## File Structure Reference

```
src/
├── app/                          # Expo Router navigation
│   ├── _layout.tsx               # Root layout (providers)
│   ├── main-player.tsx           # Full-screen player modal
│   ├── (tabs)/                   # Bottom tab navigator
│   │   ├── (home)/               # Home stack
│   │   ├── library/              # Library stack
│   │   └── collections/          # Collections stack
│   └── settings/                 # Settings modal
│       └── abs_auth.tsx          # Login screen
├── components/                   # Reusable UI components
│   ├── miniPlayer/               
│   │   └── MiniPlayer.tsx        # Persistent mini player
│   └── bookComponents/           # Book-specific components
├── contexts/                     
│   └── AuthContext.tsx           # Auth state context
├── screens/                      # Feature screens
│   ├── Home/                     # Home screen + shelves
│   ├── Library/                  # Library browsing
│   ├── MainPlayer/               # Full player UI
│   ├── BookViewer/               # Book details
│   └── Settings/                 # Settings UI
├── store/                        # Zustand stores
│   ├── store-playback.ts         # Playback state
│   ├── store-books.ts            # Book cache
│   ├── store-settings.ts         # User preferences
│   ├── store-filters.ts          # Filter state
│   └── mmkv-storage.ts           # MMKV adapter
└── utils/                        # Utilities
    ├── AudiobookShelf/           
    │   ├── absAuthClass.ts       # Auth singleton
    │   ├── absAPIClass.ts        # API singleton
    │   ├── absInit.ts            # Initialization
    │   └── abstypes.ts           # TypeScript types
    ├── rn-trackplayer/           
    │   ├── AudiobookStreamer.ts  # Playback coordinator
    │   ├── rn-trackplayerInit.ts # TrackPlayer setup
    │   └── trackPlayerUtils.ts   # Helper functions
    ├── queryClient.ts            # React Query config
    └── theme.ts                  # Theme utilities
```

---

## Development Commands

```bash
# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android  
npm run android

# Lint code
npm run lint

# Reset project (clean cache)
npm run reset-project
```

---

**Document Status:** Living document - update as architecture evolves  
**Maintainer:** Keep updated with major architectural changes  
**Related Docs:** CLAUDE.md (coding guidelines), LOAD_BOOK_GUIDE.md (playback details)
