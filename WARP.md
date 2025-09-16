# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a React Native/Expo application called "abs-only" that provides a mobile client for AudiobookShelf servers. The app allows users to stream audiobooks and manage their library through a native mobile interface.

## Commands

### Development Commands
- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint
- `npm run reset-project` - Run project reset script

### Testing and Development Notes
- No explicit test runner is configured in package.json
- Use `npx expo doctor` to diagnose Expo-specific issues
- Use `npx expo install` instead of npm install for Expo-compatible packages

## Architecture Overview

### Core Framework Stack
- **React Native 0.81.1** with **Expo SDK 54** (preview build)
- **TypeScript** with strict mode enabled
- **Expo Router** for file-based routing with typed routes
- **NativeWind** for Tailwind CSS styling in React Native
- **React Query** (@tanstack/react-query) for server state management
- **TanStack React DB** for local database operations and collections
- **MMKV** for fast local storage

### Key Architecture Patterns

#### 1. Audiobookshelf API Integration (`src/ABS/`)
The app uses a class-based architecture for API management:
- `AudiobookshelfAuth` - Handles authentication, token management, and refresh logic
- `AudiobookshelfAPI` - Main API client with automatic authentication and error handling
- Global API proxy pattern for authenticated requests
- JWT token management with automatic refresh

#### 2. Data Management Strategy
- **TanStack Query** for server state caching and synchronization
- **TanStack React DB** collections for local data querying and filtering
- **MMKV** for persistent local storage (auth tokens, settings)
- Prewarming cache strategy on app initialization

#### 3. Audio Streaming Architecture (`src/rn-trackplayer/`)
- **React Native Track Player** for audio playback
- Background audio support with proper iOS configuration
- Session-based streaming with server synchronization
- Progress tracking and bookmark management

#### 4. Navigation Structure (`src/app/`)
File-based routing using Expo Router:
- Tab-based navigation: Home, Library, Collections
- Modal presentation for settings
- Typed routes enabled for type safety

### Component Architecture

#### Authentication Flow
The app initializes through a multi-step process in `_layout.tsx`:
1. Track Player initialization
2. AudiobookShelf authentication setup
3. Cache prewarming if authenticated
4. Navigation to library on success

#### State Management Patterns
- React Query for server state
- React hooks for local component state  
- MMKV for persistent application state
- Context is avoided in favor of query-based state sharing

#### UI Components (`src/components/`)
- Organized by feature domains (auth, library, settings, ui)
- Uses NativeWind for styling with Tailwind classes
- Custom UI primitives in `src/components/ui/`

### Path Aliases
The project uses TypeScript path mapping:
- `@/*` - Root directory
- `@components/*` - src/components/*
- `@store/*` - src/store/*

### Development Configuration

#### Styling
- NativeWind with Tailwind CSS
- Custom theme extending with CSS variables for colors
- Responsive design patterns for mobile

#### Build Configuration  
- Expo config enables new architecture and development client
- TypeScript strict mode with Expo base configuration
- Metro bundler configured for NativeWind CSS processing

## Key Files to Understand

### Entry Points
- `index.js` - App entry point, registers TrackPlayer service
- `src/app/_layout.tsx` - Root layout with initialization logic

### Core Services
- `src/ABS/absInit.ts` - Service initialization and global API setup
- `src/ABS/absAPIClass.ts` - Main API client implementation
- `src/ABS/absAuthClass.ts` - Authentication management

### Data Layer
- `src/hooks/ABSHooks.ts` - Custom React hooks for data fetching
- `src/store/mmkv/` - Local storage abstractions

This architecture emphasizes type safety, robust error handling, and offline-capable data synchronization for a mobile audiobook streaming experience.
