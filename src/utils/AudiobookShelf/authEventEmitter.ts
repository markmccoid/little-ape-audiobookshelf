// authEventEmitter.ts - Simple event emitter for authentication events

import { AuthError, AuthEvent, AuthEventListener, AuthEventPayload, AuthState } from "./authTypes";

/**
 * Simple typed event emitter for authentication events
 * This allows the auth class to emit events without React dependencies,
 * and React components can subscribe to these events
 */
class AuthEventEmitter {
  private listeners: Map<AuthEvent, Set<AuthEventListener>> = new Map();
  private allListeners: Set<AuthEventListener> = new Set();

  /**
   * Subscribe to a specific auth event
   */
  on(event: AuthEvent, listener: AuthEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  /**
   * Subscribe to all auth events
   */
  onAll(listener: AuthEventListener): () => void {
    this.allListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.allListeners.delete(listener);
    };
  }

  /**
   * Emit an auth event
   */
  emit(
    event: AuthEvent,
    state: AuthState,
    options?: { error?: AuthError; tokenExpiresAt?: number }
  ): void {
    const payload: AuthEventPayload = {
      event,
      state,
      error: options?.error,
      tokenExpiresAt: options?.tokenExpiresAt,
      timestamp: Date.now(),
    };

    // Notify specific listeners
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          console.error(`Error in auth event listener for ${event}:`, error);
        }
      });
    }

    // Notify all-event listeners
    this.allListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error(`Error in auth all-event listener:`, error);
      }
    });
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
    this.allListeners.clear();
  }

  /**
   * Get count of listeners for debugging
   */
  getListenerCount(event?: AuthEvent): number {
    if (event) {
      return this.listeners.get(event)?.size ?? 0;
    }
    let total = this.allListeners.size;
    this.listeners.forEach((set) => {
      total += set.size;
    });
    return total;
  }
}

// Create singleton instance
export const authEventEmitter = new AuthEventEmitter();

// Export helper functions for common events
export function emitLoginSuccess(tokenExpiresAt?: number): void {
  authEventEmitter.emit(AuthEvent.LOGIN_SUCCESS, AuthState.AUTHENTICATED, {
    tokenExpiresAt,
  });
}

export function emitLoginFailed(error: AuthError): void {
  authEventEmitter.emit(AuthEvent.LOGIN_FAILED, AuthState.UNAUTHENTICATED, {
    error,
  });
}

export function emitLogout(): void {
  authEventEmitter.emit(AuthEvent.LOGOUT, AuthState.UNAUTHENTICATED);
}

export function emitTokenRefreshed(tokenExpiresAt: number): void {
  authEventEmitter.emit(AuthEvent.TOKEN_REFRESHED, AuthState.AUTHENTICATED, {
    tokenExpiresAt,
  });
}

export function emitTokenRefreshFailed(error: AuthError): void {
  authEventEmitter.emit(AuthEvent.TOKEN_REFRESH_FAILED, AuthState.TOKEN_EXPIRED, {
    error,
  });
}

export function emitTokenExpiringSoon(tokenExpiresAt: number): void {
  authEventEmitter.emit(AuthEvent.TOKEN_EXPIRING_SOON, AuthState.AUTHENTICATED, {
    tokenExpiresAt,
  });
}

export function emitAuthStateChanged(state: AuthState, error?: AuthError): void {
  authEventEmitter.emit(AuthEvent.AUTH_STATE_CHANGED, state, { error });
}
