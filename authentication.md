# Authentication Flow Documentation

## Overview

This document outlines the complete authentication flow for the Little Ape Audiobookshelf app, detailing how it connects to the Audiobookshelf API and manages user authentication throughout the application lifecycle.

## Architecture Components

### 1. Core Authentication Classes

#### [`AudiobookshelfAuth`](src/utils/AudiobookShelf/absAuthClass.ts:13)

- Singleton pattern class that handles all authentication operations
- Manages token storage, refresh, and validation
- Stores user information (username, email, userId)
- Handles login, logout, and token refresh operations
- Uses Expo SecureStore for persistent storage of credentials

#### [`AudiobookshelfAPI`](src/utils/AudiobookShelf/absAPIClass.ts:96)

- Handles all API communications with the Audiobookshelf server
- Requires authentication tokens for all operations
- Manages library selection, book retrieval, and user progress tracking
- Automatically includes authentication headers in requests

### 2. State Management

#### [`AuthContext`](src/contexts/AuthContext.tsx:37)

- React Context that provides authentication state throughout the app
- Manages authentication status (isAuthenticated, isInitialized, hasStoredCredentials)
- Provides user information (authInfo)
- Exposes authentication methods (login, logout, checkAuthStatus)
- Handles post-login initialization

### 3. Initialization & Management

#### [`absInit`](src/utils/AudiobookShelf/absInit.ts:23)

- Initializes both auth and API instances on app startup
- Creates a proxy for API calls that ensures authentication
- Handles cleanup of instances during logout
- Manages the singleton instances of both classes

## Authentication Flow

### App Startup Flow

1. **Root Layout Initialization** ([`_layout.tsx`](src/app/_layout.tsx:28))

   - App starts with splash screen
   - `AuthProvider` wraps the entire application
   - `AppContent` component handles initialization

2. **Initial Authentication Check** ([`AuthContext.checkAuthStatus`](src/contexts/AuthContext.tsx:54))

   - Checks for stored credentials in SecureStore
   - Sets `hasStoredCredentials` state
   - If credentials exist, checks if authentication is valid
   - Updates `isAuthenticated` state accordingly

3. **ABS Initialization** ([`absInitalize`](src/utils/AudiobookShelf/absInit.ts:23))

   - Only runs if stored credentials exist
   - Creates `AudiobookshelfAuth` instance
   - Creates `AudiobookshelfAPI` instance
   - Sets up API proxy with authentication checks
   - Pre-warms cache with user data if authenticated

4. **App Ready** ([`_layout.tsx`](src/app/_layout.tsx:56))
   - Once initialization completes, splash screen is hidden
   - Main navigation is rendered
   - App is now ready for user interaction

### Login Flow

1. **User Initiates Login** ([`ABSAuthMain.tsx`](src/screens/Settings/auth/ABSAuthMain.tsx:36))

   - User enters server URL, username, and password
   - `onSubmit` function is called with credentials

2. **Authentication Process** ([`AudiobookshelfAuth.login`](src/utils/AudiobookShelf/absAuthClass.ts:101))

   - Creates new auth instance with server URL
   - Makes POST request to `/login` endpoint
   - Receives tokens and user information
   - Stores tokens in SecureStore
   - Updates in-memory authentication state

3. **Post-Login Initialization** ([`AuthContext.initializeAfterLogin`](src/contexts/AuthContext.tsx:147))

   - Re-runs full ABS initialization with new auth
   - Creates fresh API instance with authentication
   - Updates authentication status
   - Invalidates any stale cached data

4. **App State Update** ([`AuthContext.checkAuthStatus`](src/contexts/AuthContext.tsx:54))
   - Updates authentication state throughout app
   - User information becomes available
   - API calls can now be made successfully

### API Request Flow

1. **API Call Initiated** ([`absInit.ts`](src/utils/AudiobookShelf/absInit.ts:52))

   - API proxy intercepts all method calls
   - Checks authentication status before proceeding
   - Shows alert if not authenticated

2. **Request Authentication** ([`AudiobookshelfAPI.makeAuthenticatedRequest`](src/utils/AudiobookShelf/absAPIClass.ts:122))

   - Retrieves valid access token
   - Includes Bearer token in request headers
   - Handles token refresh if needed

3. **Token Refresh Handling** ([`AudiobookshelfAuth.refreshAccessToken`](src/utils/AudiobookShelf/absAuthClass.ts:152))

   - Automatically refreshes expired tokens
   - Updates stored tokens
   - Handles refresh failures gracefully

4. **Error Handling**
   - 401 errors trigger token refresh
   - Failed refresh results in logout
   - Network errors are handled appropriately

### Logout Flow

1. **Logout Initiated** ([`AuthContext.logout`](src/contexts/AuthContext.tsx:166))

   - Clears authentication state immediately
   - Prevents hooks from accessing stale instances
   - Calls server-side logout endpoint

2. **Cleanup Process** ([`AudiobookshelfAuth.logout`](src/utils/AudiobookShelf/absAuthClass.ts:221))

   - Clears stored tokens from SecureStore
   - Clears user information
   - Resets singleton instance

3. **Instance Cleanup** ([`cleanupAbsInstances`](src/utils/AudiobookShelf/absInit.ts:120))
   - Clears all in-memory instances
   - Forces fresh initialization on next login
   - Prevents memory leaks

## Key Features

### Token Management

- Access tokens with expiration handling
- Automatic refresh before expiration (5-minute buffer)
- Secure storage using Expo SecureStore
- In-memory caching for performance

### Authentication State

- Multiple authentication states tracked:
  - `isInitialized`: Has the auth system loaded?
  - `hasStoredCredentials`: Are there stored credentials?
  - `isAuthenticated`: Is the user currently authenticated?
- User information cached and available throughout app

### Error Handling

- Graceful handling of network errors
- Automatic token refresh on 401 errors
- Fallback behavior when authentication fails
- User-friendly error messages

### Security

- Tokens stored securely using Expo SecureStore
- Server URL and user information encrypted
- Automatic cleanup of sensitive data on logout
- Protection against token leakage

## Integration Points

### With Navigation

- Authentication state controls navigation access
- Protected routes check authentication status
- Redirect to login if not authenticated

### With API Calls

- All API calls require authentication
- Automatic token refresh on expired tokens
- Graceful handling of authentication failures

### With UI Components

- Authentication state drives UI rendering
- Loading states during authentication
- User information displayed in headers and settings

## Best Practices

1. **Always use `useSafeAbsAPI()`** in components rather than direct API access
2. **Check authentication status** before making API calls
3. **Handle authentication errors** gracefully in UI
4. **Use AuthContext methods** for authentication operations
5. **Let the system handle token refresh** automatically

## Troubleshooting

### Common Issues

1. **Authentication not persisting**

   - Check SecureStore is working properly
   - Verify token storage and retrieval
   - Ensure singleton pattern is maintained

2. **API calls failing with 401**

   - Check token refresh logic
   - Verify server URL is correct
   - Ensure tokens haven't expired

3. **App stuck on loading**
   - Check ABS initialization
   - Verify authentication check completes
   - Look for errors in initialization flow

### Debug Tips

1. Check console logs for authentication status
2. Verify stored credentials in SecureStore
3. Monitor network requests for authentication headers
4. Check AuthContext state values
5. Verify ABS instances are properly initialized

## Files Involved

- [`src/app/_layout.tsx`](src/app/_layout.tsx:1) - App initialization and entry point
- [`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx:1) - Authentication state management
- [`src/utils/AudiobookShelf/absAuthClass.ts`](src/utils/AudiobookShelf/absAuthClass.ts:1) - Core authentication logic
- [`src/utils/AudiobookShelf/absAPIClass.ts`](src/utils/AudiobookShelf/absAPIClass.ts:1) - API communication with authentication
- [`src/utils/AudiobookShelf/absInit.ts`](src/utils/AudiobookShelf/absInit.ts:1) - Initialization and instance management
- [`src/screens/Settings/auth/ABSAuthMain.tsx`](src/screens/Settings/auth/ABSAuthMain.tsx:1) - Login/logout UI
