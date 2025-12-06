# Authentication & Network Status Improvements - To-Do List

**Branch:** `feature/auth-network-improvements`  
**Created:** 2025-12-05  
**Status:** In Progress

---

## Overview

This document outlines the improvements needed to make the authentication and network status handling more robust and user-friendly in the Little Ape Audiobookshelf app.

### Key Design Decisions

1. **Downloaded Books Feature**: New functionality - UI needs to be created (download API exists in `absAPIClass.ts`)
2. **Offline Data**: Books are cached in `store-books.bookInfo`, but online-only books cannot be played when offline
3. **Session Duration**: Users should stay logged in indefinitely
4. **Server Support**: Single ABS server at a time
5. **Token Expiry Handling**: Use refresh token in background. If still not authenticated, show retry overlay. Downloaded books should remain playable.

---

## Phase 1: Core Auth Improvements (High Priority) ✅ IN PROGRESS

### 1.1 Auth State Machine

- [ ] Create `AuthState` enum with states: `CHECKING`, `AUTHENTICATED`, `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `NETWORK_ERROR`
- [ ] Update `AuthContext` to expose the detailed state
- [ ] Add `authError` to context for detailed error information
- [ ] Update components to use new detailed auth states

### 1.2 Proactive Token Refresh

- [ ] Implement background token refresh scheduler (refresh 10 minutes before expiry)
- [ ] Add token expiry time to auth context for UI display
- [ ] Create `useTokenRefresh()` hook that handles refresh logic
- [ ] Handle refresh failures gracefully without disrupting downloaded book playback

### 1.3 Auth Event System

- [ ] Add `EventEmitter` pattern to `AudiobookshelfAuth` class
- [ ] Subscribe to events in `AuthContext` to update React state
- [ ] Emit events for: `login`, `logout`, `tokenRefreshed`, `tokenExpired`, `authError`
- [ ] Handle events appropriately based on download status

### 1.4 Login Flow Improvements

- [ ] Add URL validation (check format and accessibility)
- [ ] Add "Test Connection" button that pings server before login
- [ ] Show specific error messages for different failure types:
  - Invalid URL format
  - Server unreachable
  - Invalid credentials
  - Network error
- [ ] Add form field validation with visual feedback
- [ ] Disable login button when offline with explanation

---

## Phase 2: Network Awareness Integration (High Priority)

### 2.1 Unified Network/Auth State

- [ ] Create `useOfflineAwareAPI()` hook combining network and auth contexts
- [ ] Add `isOffline` check to API proxy before making requests
- [ ] Return cached data or appropriate error when offline
- [ ] Allow downloaded book playback regardless of network status

### 2.2 Offline Detection in API Calls

- [ ] Add network check to `makeAuthenticatedRequest()` in `absAPIClass.ts`
- [ ] Create `OfflineError` class for offline-specific errors
- [ ] Let calling code decide how to handle offline (use cache, show message, queue request)

### 2.3 Request Queuing for Offline

- [ ] Create `RequestQueue` class for storing failed requests
- [ ] Integrate with `NetworkContext` to process queue on reconnection
- [ ] Define which requests should be queued vs. failed immediately

---

## Phase 3: UI/UX Improvements (Medium Priority)

### 3.1 Enhanced Network Banner

- [ ] Fix banner positioning (slide from above screen, not from content top)
- [ ] Add contextual messages:
  - "Offline - Using cached data"
  - "Poor connection - Data may be slow"
  - "Reconnected - Syncing..."
- [ ] Add retry button when offline
- [ ] Add dismiss button for reconnected message

### 3.2 Auth Error Overlay

- [ ] Create auth error overlay component
- [ ] Show when token refresh fails
- [ ] Include retry button and "Continue Offline" option (for downloaded books)
- [ ] Auto-dismiss on successful re-authentication

### 3.3 Offline Visual Indicators

- [ ] Add subtle offline indicator in header/nav
- [ ] Dim or badge books that aren't downloaded when offline
- [ ] Show "Last synced: X minutes ago" in settings

### 3.4 Auth UI Improvements

- [ ] Add session expiry warning before auto-logout
- [ ] Show connection status in login screen
- [ ] Add auto-reconnect attempt when coming back online

---

## Phase 4: Downloaded Books Support (Future)

### 4.1 Download State Management

- [ ] Create `store-downloads.ts` for tracking downloaded books
- [ ] Add `isDownloaded` flag to book items
- [ ] Create download progress tracking
- [ ] Integrate with existing download functions in `absAPIClass.ts`

### 4.2 Offline Book Access

- [ ] When offline, filter book list to show only downloaded books
- [ ] Add "Download for offline" button to book details
- [ ] Show download size estimate before download
- [ ] Handle partial downloads gracefully

### 4.3 Sync Behavior

- [ ] Queue progress updates when offline
- [ ] Sync queued updates when back online
- [ ] Handle conflicts (local progress vs. server progress)
- [ ] Show sync status in UI

---

## Phase 5: Error Handling Standardization (Medium Priority)

### 5.1 Error Class Hierarchy

- [ ] Create extended error class hierarchy:
  ```typescript
  AudiobookshelfError
  ├── AuthenticationError
  │   ├── InvalidCredentialsError
  │   ├── SessionExpiredError
  │   └── TokenRefreshError
  ├── NetworkError
  │   ├── OfflineError
  │   ├── TimeoutError
  │   └── ServerUnreachableError
  └── APIError
      ├── NotFoundError
      └── PermissionError
  ```

### 5.2 Consistent Error Returns

- [ ] Standardize API methods (all throw or all return Result objects)
- [ ] Add TypeScript discriminated unions for error handling
- [ ] Create error boundary components for error recovery UI

---

## Testing Checklist

### Auth Flow Testing

- [ ] Fresh login works correctly
- [ ] Token refresh works in background
- [ ] Token expiry triggers proper UI feedback
- [ ] Logout clears all state properly
- [ ] Re-login after logout works

### Network Testing

- [ ] App handles going offline gracefully
- [ ] App handles coming back online
- [ ] Cached data displays when offline
- [ ] Network banner shows correct states
- [ ] API calls fail gracefully when offline

### Edge Cases

- [ ] Server URL changes work correctly
- [ ] Rapid network state changes don't break app
- [ ] Token refresh during active playback
- [ ] Multiple concurrent API calls with expired token

---

## Notes

- All changes should maintain backward compatibility with existing user data
- Downloaded book playback should NEVER be blocked by auth issues
- Sync operations should be queued, not blocking
