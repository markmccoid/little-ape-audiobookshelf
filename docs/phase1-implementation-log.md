# Phase 1: Core Auth Improvements - Implementation Log

**Branch:** `feature/auth-network-improvements`  
**Date:** 2025-12-05  
**Status:** Completed

---

## Overview

This document details the implementation steps taken for Phase 1 of the authentication and network status improvements.

---

## Changes Made

### 1. New Files Created

#### `src/utils/AudiobookShelf/authTypes.ts`

- Created `AuthState` enum with states:

  - `CHECKING` - Initial state, checking for stored credentials
  - `AUTHENTICATED` - User is authenticated with valid token
  - `UNAUTHENTICATED` - User is not logged in
  - `TOKEN_REFRESHING` - Token is being refreshed
  - `TOKEN_EXPIRED` - Token refresh failed
  - `NETWORK_ERROR` - Network prevented auth check

- Created `AuthErrorType` enum for specific error handling:

  - `INVALID_CREDENTIALS`
  - `SESSION_EXPIRED`
  - `TOKEN_REFRESH_FAILED`
  - `NETWORK_UNAVAILABLE`
  - `SERVER_UNREACHABLE`
  - `INVALID_SERVER_URL`
  - `UNKNOWN`

- Created `AuthError` interface with type, message, timestamp, and recoverable flag
- Created `AuthEvent` enum for event types
- Created `AuthEventPayload` interface
- Added helper functions: `createAuthError`, `canMakeAPICall`, `requiresUserAction`, `allowOfflinePlayback`

#### `src/utils/AudiobookShelf/authEventEmitter.ts`

- Created `AuthEventEmitter` class - a simple typed event emitter for auth events
- Supports subscribing to specific events or all events
- Singleton instance exported as `authEventEmitter`
- Helper functions for emitting common events:
  - `emitLoginSuccess`
  - `emitLoginFailed`
  - `emitLogout`
  - `emitTokenRefreshed`
  - `emitTokenRefreshFailed`
  - `emitTokenExpiringSoon`
  - `emitAuthStateChanged`

#### `src/components/AuthErrorBanner.tsx`

- New component that displays when authentication fails
- Shows contextual error messages based on error type
- Provides "Retry" button to attempt re-authentication
- Provides "Continue Offline" button for downloaded book access
- Uses animated slide-in/out from top of screen
- Automatically appears when `requiresUserAction` returns true

---

### 2. Modified Files

#### `src/utils/AudiobookShelf/absAuthClass.ts`

**Added:**

- Token refresh timing constants:
  - `TOKEN_REFRESH_BUFFER_MS` - 10 minutes before expiry
  - `TOKEN_WARNING_BUFFER_MS` - 15 minutes before expiry (warning)
- Token refresh scheduler properties:
  - `refreshSchedulerId` - Timer for proactive refresh
  - `warningSchedulerId` - Timer for warning event
- `tokenExpiresAt` getter - Returns token expiry timestamp
- `scheduleTokenRefresh(expiresAt)` method - Schedules proactive token refresh
- `clearRefreshSchedulers()` method - Clears pending schedulers

**Modified:**

- `login()` method:
  - Now schedules token refresh after successful login
  - Emits `LOGIN_SUCCESS` and `AUTH_STATE_CHANGED` events
  - Emits `LOGIN_FAILED` events with specific error types on failure
- `refreshAccessToken()` method:
  - Now schedules next token refresh after successful refresh
  - Emits `TOKEN_REFRESHED` event on success
  - Emits `TOKEN_REFRESH_FAILED` event on failure
- `logout()` method:

  - Now clears refresh schedulers before logout
  - Emits `LOGOUT` and `AUTH_STATE_CHANGED` events

- `checkNetworkConnection()` method:
  - Fixed lint error by using strict boolean comparison (`=== true`)

#### `src/contexts/AuthContext.tsx`

**Added:**

- New state variables:

  - `authState: AuthState` - Detailed auth state
  - `authError: AuthError | null` - Current error if any
  - `tokenExpiresAt: number | null` - Token expiry timestamp

- Auth event subscription using `authEventEmitter.onAll()`
- New context properties:

  - `authState`
  - `authError`
  - `tokenExpiresAt`
  - `clearAuthError()` - Action to clear current error
  - `retryAuthentication()` - Action to retry auth

- New hook `useAuthState()`:
  - Returns detailed auth state
  - Provides helper properties:
    - `isChecking`
    - `isTokenExpired`
    - `hasNetworkError`
    - `requiresUserAction`
    - `timeUntilExpiry`

**Modified:**

- `logout()` method now clears detailed state
- `checkAuthStatus()` now updates `authState`
- `updateAuthInfo()` now updates `tokenExpiresAt`

#### `src/app/_layout.tsx`

**Added:**

- Import for `AuthErrorBanner` component
- `<AuthErrorBanner />` rendered after `<NetworkStatusBanner />`

#### `src/screens/Settings/auth/LoginForm.tsx`

**Added:**

- Network status integration with `useNetwork()` hook
- Form validation with touched state tracking
- URL validation function with format checking
- "Test Connection" button to verify server accessibility
- Network status indicator (online/offline)
- Field-level error display with icons
- Disabled state when offline with explanation
- Better button states (loading, disabled)

**Modified:**

- Form inputs now show validation errors when touched
- Login button disabled when form invalid or offline
- Visual feedback for connection quality

#### `src/screens/Settings/auth/ABSAuthMain.tsx`

**Added:**

- Import `useAuthState` hook
- `LoginError` interface for typed error handling
- `parseError()` function for user-friendly error messages
- Session status display showing "Logged in" with token expiry info
- `formatTokenExpiry()` function for readable expiry time
- Better error display with icon and dismiss button

**Modified:**

- Error state now uses `LoginError` type instead of raw error
- Reset of `AudiobookshelfAuth` instance before login to start fresh

---

## Architecture Decisions

### 1. Event-Based Communication

We chose an event emitter pattern to allow the `AudiobookshelfAuth` class (which is not a React component) to communicate state changes to React components. This decouples the auth logic from React while still enabling reactive UI updates.

### 2. Proactive Token Refresh

Token refresh is scheduled 10 minutes before expiry. A warning event is emitted 15 minutes before expiry. This ensures tokens are refreshed in the background without user intervention, while still allowing UI to show expiry warnings if desired.

### 3. Downloaded Books Exception

The design allows offline playback of downloaded books even when authentication has issues. The `allowOfflinePlayback()` helper and the "Continue Offline" button in `AuthErrorBanner` support this behavior.

### 4. Form Validation

The login form uses a "touched" pattern where validation errors only show for fields the user has interacted with. This provides a good UX where errors appear at appropriate times.

---

## Testing Notes

### Manual Testing Scenarios

1. **Fresh Login**

   - Enter valid server URL, username, password
   - Verify login succeeds
   - Verify token expiry displayed on settings page

2. **Invalid Credentials**

   - Enter wrong password
   - Verify error message shows "Invalid username or password"
   - Verify can retry with correct credentials

3. **Network Offline**

   - Turn off network connection
   - Verify login button is disabled
   - Verify offline message appears
   - Turn network back on
   - Verify login button re-enables

4. **Test Connection Button**

   - Enter valid server URL
   - Click "Test" button
   - Verify success message appears
   - Enter invalid URL
   - Click "Test" button
   - Verify error message appears

5. **Token Expiry**

   - Log in and wait for token to approach expiry
   - Verify proactive refresh occurs (check console logs)
   - Verify no interruption to user

6. **Logout**
   - Click logout button
   - Verify state is cleared
   - Verify can log in again

---

## Known Issues / Future Work

1. **Token Refresh Scheduler in Background**

   - Currently the scheduler uses `setTimeout` which may not be reliable when app is backgrounded
   - Consider using a more robust background task solution for truly reliable background refresh

2. **Network Reachability**

   - The "Test Connection" feature does a simple fetch to `/ping`
   - Some ABS servers might not have this endpoint
   - Consider using `/api/status` or similar standard endpoint

3. **Error Message Localization**
   - Error messages are hardcoded in English
   - Should be localized in future

---

## Files Changed Summary

| File                                           | Change Type |
| ---------------------------------------------- | ----------- |
| `src/utils/AudiobookShelf/authTypes.ts`        | New         |
| `src/utils/AudiobookShelf/authEventEmitter.ts` | New         |
| `src/components/AuthErrorBanner.tsx`           | New         |
| `docs/auth-network-improvements-todo.md`       | New         |
| `src/utils/AudiobookShelf/absAuthClass.ts`     | Modified    |
| `src/contexts/AuthContext.tsx`                 | Modified    |
| `src/app/_layout.tsx`                          | Modified    |
| `src/screens/Settings/auth/LoginForm.tsx`      | Modified    |
| `src/screens/Settings/auth/ABSAuthMain.tsx`    | Modified    |

---

## Next Steps (Phase 2)

1. Integrate network awareness into API calls
2. Create `useOfflineAwareAPI()` hook
3. Add request queuing for offline scenarios
4. Create `OfflineError` class
