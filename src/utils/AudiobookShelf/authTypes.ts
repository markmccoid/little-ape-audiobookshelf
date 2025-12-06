// authTypes.ts - Authentication state and event types

/**
 * Detailed authentication states for granular UI control
 */
export enum AuthState {
  /** Initial state, checking for stored credentials */
  CHECKING = "CHECKING",
  /** User is authenticated and token is valid */
  AUTHENTICATED = "AUTHENTICATED",
  /** User is not logged in (no stored credentials) */
  UNAUTHENTICATED = "UNAUTHENTICATED",
  /** Token has expired, attempting refresh */
  TOKEN_REFRESHING = "TOKEN_REFRESHING",
  /** Token refresh failed, user needs to re-authenticate */
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  /** Network error prevented authentication check */
  NETWORK_ERROR = "NETWORK_ERROR",
}

/**
 * Authentication error types for specific error handling
 */
export enum AuthErrorType {
  NONE = "NONE",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  TOKEN_REFRESH_FAILED = "TOKEN_REFRESH_FAILED",
  NETWORK_UNAVAILABLE = "NETWORK_UNAVAILABLE",
  SERVER_UNREACHABLE = "SERVER_UNREACHABLE",
  INVALID_SERVER_URL = "INVALID_SERVER_URL",
  UNKNOWN = "UNKNOWN",
}

/**
 * Detailed auth error with type and message
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  timestamp: number;
  /** Whether this error is recoverable (e.g., retry might work) */
  recoverable: boolean;
}

/**
 * Events emitted by the auth system
 */
export enum AuthEvent {
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILED = "LOGIN_FAILED",
  LOGOUT = "LOGOUT",
  TOKEN_REFRESHED = "TOKEN_REFRESHED",
  TOKEN_REFRESH_FAILED = "TOKEN_REFRESH_FAILED",
  TOKEN_EXPIRING_SOON = "TOKEN_EXPIRING_SOON",
  AUTH_STATE_CHANGED = "AUTH_STATE_CHANGED",
  NETWORK_STATUS_CHANGED = "NETWORK_STATUS_CHANGED",
}

/**
 * Payload for auth event emissions
 */
export interface AuthEventPayload {
  event: AuthEvent;
  state: AuthState;
  error?: AuthError;
  timestamp: number;
  /** Token expiry time in ms since epoch (if applicable) */
  tokenExpiresAt?: number;
}

/**
 * Auth event listener callback type
 */
export type AuthEventListener = (payload: AuthEventPayload) => void;

/**
 * Helper to create an AuthError object
 */
export function createAuthError(
  type: AuthErrorType,
  message: string,
  recoverable: boolean = true
): AuthError {
  return {
    type,
    message,
    timestamp: Date.now(),
    recoverable,
  };
}

/**
 * Check if an auth state allows API calls
 */
export function canMakeAPICall(state: AuthState): boolean {
  return state === AuthState.AUTHENTICATED || state === AuthState.TOKEN_REFRESHING;
}

/**
 * Check if an auth state represents an error condition requiring user action
 */
export function requiresUserAction(state: AuthState): boolean {
  return state === AuthState.TOKEN_EXPIRED || state === AuthState.UNAUTHENTICATED;
}

/**
 * Check if offline playback should be allowed for downloaded books
 * This should return true even when auth has issues
 */
export function allowOfflinePlayback(state: AuthState): boolean {
  // Downloaded books can always be played regardless of auth state
  // Only CHECKING state might need to wait
  return state !== AuthState.CHECKING;
}
