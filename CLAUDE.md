# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint for code quality checks
- `npm run reset-project` - Reset project to clean state

## Project Architecture

This is a React Native audiobook player app built with Expo that connects to an Audiobookshelf server.

### Core Architecture

**App Structure:**
- Expo Router for file-based navigation in `src/app/`
- Tab-based navigation with Home, Library, and Settings tabs
- Modal screens for main player and settings
- Global state managed with Zustand stores
- Data fetching with React Query (TanStack Query)

**Key Components:**
- `MiniPlayer` - Persistent mini player shown at bottom when audio is loaded
- Authentication flow through AuthContext with secure credential storage
- Audiobookshelf API integration for server communication

### State Management

**Zustand Stores:**
- `store-books.ts` - Book metadata, playback speed, download status
- `store-playback.ts` - Audio playback state, session management

**React Query:**
- Server data caching and synchronization
- API call management for library items, progress, etc.

### Audiobookshelf Integration

**Authentication:**
- `AuthContext.tsx` - Global auth state management
- `absAuthClass.ts` - Server authentication and token management
- Secure storage using Expo SecureStore

**API Layer:**
- `absAPIClass.ts` - Complete Audiobookshelf API implementation
- Handles library browsing, progress tracking, bookmarks, streaming
- Session management for playback progress sync

**Audio Playback:**
- `rn-trackplayer` - Audio playback engine
- `AudiobookStreamer.ts` - Streaming and session management
- Real-time progress synchronization with server

### Key Patterns

**Singleton Pattern:**
- AudiobookStreamer instance for global playback management
- Auth and API instances initialized at app startup

**Data Flow:**
1. API calls fetch data from Audiobookshelf server
2. React Query caches responses in global state
3. Zustand stores manage UI-specific state (playback, book preferences)
4. Real-time sync maintains playback progress across sessions

**Error Handling:**
- Network errors handled gracefully with fallbacks
- Authentication state managed globally with safe access patterns
- Session cleanup on logout to prevent memory leaks

### File Organization

- `src/app/` - Navigation and screen components
- `src/components/` - Reusable UI components
- `src/contexts/` - React contexts (Auth, etc.)
- `src/store/` - Zustand state management
- `src/utils/` - Utility functions and API classes
- `src/screens/` - Feature-specific screen components

### Development Notes

- Uses NativeWind for Tailwind CSS styling
- MMKV for fast local storage persistence
- Expo Image for optimized image loading with placeholders
- TypeScript throughout for type safety