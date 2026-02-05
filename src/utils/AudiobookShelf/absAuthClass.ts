// services/AudiobookshelfAuth.ts
import * as SecureStore from "expo-secure-store";
import {
  AudiobookshelfError,
  AuthCredentials,
  AuthenticationError,
  AuthTokens,
  LoginResponse,
  LogoutResponse,
  NetworkError,
} from "./abstypes";
import {
  emitAuthStateChanged,
  emitLoginFailed,
  emitLoginSuccess,
  emitLogout,
  emitTokenExpiringSoon,
  emitTokenRefreshed,
  emitTokenRefreshFailed,
} from "./authEventEmitter";
import { AuthErrorType, AuthState, createAuthError } from "./authTypes";
import { checkIsOnline } from "../networkHelper";

export class AudiobookshelfAuth {
  private static readonly TOKEN_KEY = "audiobookshelf_tokens";
  private static readonly SERVER_URL_KEY = "audiobookshelf_server_url";
  private static readonly USERINFO_KEY = "audiobookshelf_user_info";
  private static readonly CREDENTIALS_KEY = "audiobookshelf_credentials";

  // Token refresh timing constants
  private static readonly TOKEN_REFRESH_BUFFER_MS = 10 * 60 * 1000; // 10 minutes before expiry
  private static readonly TOKEN_WARNING_BUFFER_MS = 15 * 60 * 1000; // 15 minutes before expiry (warning)

  private static instance: AudiobookshelfAuth | null = null;

  // 🔹 In-memory cache
  private tokens: AuthTokens | null = null;
  private credentials: AuthCredentials | null = null;
  username: string | undefined = "";
  userEmail: string | undefined = "";
  userId: string | undefined = "";
  defaultLibraryId: string | undefined = "";

  // Retry logic properties
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private baseRetryDelayMs: number = 1000; // Start with 1 second

  // Token refresh scheduler
  private refreshSchedulerId: ReturnType<typeof setTimeout> | null = null;
  private warningSchedulerId: ReturnType<typeof setTimeout> | null = null;

  private constructor(private serverUrl: string) {}

  get absURL() {
    return this.serverUrl;
  }

  /**
   * Get the token expiry timestamp
   */
  get tokenExpiresAt(): number | null {
    return this.tokens?.expiresAt ?? null;
  }

  // -------------------------
  // TOKEN REFRESH SCHEDULING
  // -------------------------

  /**
   * Schedule proactive token refresh before expiry
   * This ensures tokens are refreshed in the background without disrupting user experience
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    // Clear any existing schedulers
    this.clearRefreshSchedulers();

    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // Schedule warning before token expires
    const warningTime = timeUntilExpiry - AudiobookshelfAuth.TOKEN_WARNING_BUFFER_MS;
    if (warningTime > 0) {
      this.warningSchedulerId = setTimeout(() => {
        console.log("Token expiring soon, emitting warning event");
        emitTokenExpiringSoon(expiresAt);
      }, warningTime);
    }

    // Schedule refresh before token expires
    const refreshTime = timeUntilExpiry - AudiobookshelfAuth.TOKEN_REFRESH_BUFFER_MS;
    if (refreshTime > 0) {
      this.refreshSchedulerId = setTimeout(async () => {
        console.log("Proactive token refresh triggered");
        try {
          await this.refreshAccessToken();
          console.log("Proactive token refresh successful");
        } catch (error) {
          console.error("Proactive token refresh failed:", error);
          // Event will be emitted by refreshAccessToken
        }
      }, refreshTime);

      console.log(`Token refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`);
    } else if (timeUntilExpiry > 0) {
      // Token expires soon, try to refresh immediately
      console.log("Token expires soon, attempting immediate refresh");
      this.refreshAccessToken().catch((error) => {
        console.error("Immediate token refresh failed:", error);
      });
    }
  }

  /**
   * Clear any pending refresh schedulers
   */
  private clearRefreshSchedulers(): void {
    if (this.refreshSchedulerId) {
      clearTimeout(this.refreshSchedulerId);
      this.refreshSchedulerId = null;
    }
    if (this.warningSchedulerId) {
      clearTimeout(this.warningSchedulerId);
      this.warningSchedulerId = null;
    }
  }

  /**
   * Factory method to create or return the singleton instance
   */
  static async create(serverUrl?: string): Promise<AudiobookshelfAuth> {
    if (this.instance) {
      return this.instance;
    }

    let finalServerUrl = serverUrl;
    if (!finalServerUrl) {
      const storedUrl = await SecureStore.getItemAsync(this.SERVER_URL_KEY);
      if (!storedUrl) {
        finalServerUrl = "placeholder";
        throw new Error("No server URL provided and none found in storage");
      }
      finalServerUrl = storedUrl;
    }

    const auth = new AudiobookshelfAuth(finalServerUrl);

    // Load tokens into memory if they exist
    const storedTokens = await SecureStore.getItemAsync(this.TOKEN_KEY);
    if (storedTokens) {
      auth.tokens = JSON.parse(storedTokens);
    }
    const storedUserInfo = await SecureStore.getItemAsync(this.USERINFO_KEY);
    if (storedUserInfo) {
      const userInfo = JSON.parse(storedUserInfo);
      auth.username = userInfo.username;
      auth.userEmail = userInfo.userEmail;
      auth.userId = userInfo.userId;
    }
    // Load credentials into memory if they exist
    const storedCredentials = await SecureStore.getItemAsync(this.CREDENTIALS_KEY);
    if (storedCredentials) {
      auth.credentials = JSON.parse(storedCredentials);
    }

    this.instance = auth;
    return auth;
  }

  // checking if has stored credentials.  Looking at secure storage
  static async hasStoredCredentials(): Promise<boolean> {
    try {
      const [storedUrl, storedTokens] = await Promise.all([
        SecureStore.getItemAsync(this.SERVER_URL_KEY),
        SecureStore.getItemAsync(this.TOKEN_KEY),
      ]);
      return !!(storedUrl && storedTokens);
    } catch {
      return false;
    }
  }

  // Check if we have stored password for automatic re-authentication
  static async hasStoredPassword(): Promise<boolean> {
    try {
      const storedCredentials = await SecureStore.getItemAsync(this.CREDENTIALS_KEY);
      return !!storedCredentials;
    } catch {
      return false;
    }
  }

  // Get stored credentials for automatic re-authentication
  static async getStoredCredentials(): Promise<AuthCredentials | null> {
    try {
      const stored = await SecureStore.getItemAsync(this.CREDENTIALS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
  static async getStoredURL(): Promise<string | null> {
    try {
      const [storedUrl, storedTokens] = await Promise.all([
        SecureStore.getItemAsync(this.SERVER_URL_KEY),
        SecureStore.getItemAsync(this.TOKEN_KEY),
      ]);
      return storedUrl;
    } catch {
      return "";
    }
  }

  static reset(): void {
    this.instance = null;
  }

  // -------------------------
  // NETWORK CHECK
  // -------------------------

  private async checkNetworkConnection(): Promise<boolean> {
    try {
      const isConnected = await checkIsOnline();

      if (!isConnected) {
        console.warn("No internet connection available");
      }

      return isConnected;
    } catch (error) {
      console.error("Error checking network connection:", error);
      // Assume connected if we can't check (fail open)
      return true;
    }
  }

  // -------------------------
  // AUTH METHODS
  // -------------------------

  async login(credentials: AuthCredentials): Promise<LoginResponse> {
    // Check network before attempting login
    const isConnected = await this.checkNetworkConnection();
    if (!isConnected) {
      throw new NetworkError("No internet connection. Please check your network and try again.");
    }

    try {
      const response = await fetch(`${this.serverUrl}/audiobookshelf/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-return-tokens": "true",
        },
        body: JSON.stringify(credentials),
      });

      // console.log("login resp", credentials, response);
      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthenticationError("Invalid username or password");
        }
        throw new AuthenticationError("Login failed");
      }

      const data: LoginResponse = await response.json();

      if (!data.user.refreshToken) {
        throw new AuthenticationError("Server did not return refresh token");
      }

      const tokens: AuthTokens = {
        accessToken: data.user.accessToken,
        refreshToken: data.user.refreshToken,
        oldToken: data.user.token,
        expiresAt: this.calculateTokenExpiry(data.user.accessToken),
      };

      await this.storeTokens(tokens);
      await this.storeServerUrl();
      await this.storeUserInfo({
        username: data.user.username,
        userEmail: data.user.email,
        userId: data.user.id,
      });
      // Store credentials for automatic re-authentication
      await this.storeCredentials(credentials);

      this.defaultLibraryId = data.userDefaultLibraryId;
      this.username = data.user.username;
      this.userEmail = data.user.email;
      this.userId = data.user.id;

      // Schedule proactive token refresh
      this.scheduleTokenRefresh(tokens.expiresAt);

      // Emit login success event
      emitLoginSuccess(tokens.expiresAt);
      emitAuthStateChanged(AuthState.AUTHENTICATED);

      return data;
    } catch (error) {
      // Emit login failure event
      if (error instanceof AuthenticationError) {
        emitLoginFailed(createAuthError(AuthErrorType.INVALID_CREDENTIALS, error.message, false));
      } else if (error instanceof NetworkError) {
        emitLoginFailed(createAuthError(AuthErrorType.NETWORK_UNAVAILABLE, error.message, true));
      } else {
        emitLoginFailed(createAuthError(AuthErrorType.UNKNOWN, "Login failed", true));
      }
      if (error instanceof AudiobookshelfError) throw error;
      throw new NetworkError("Unable to connect to server");
    }
  }

  async refreshAccessToken(): Promise<string> {
    const tokens = this.tokens || (await this.getStoredTokens());
    if (!tokens?.refreshToken) {
      throw new AuthenticationError("No refresh token available");
    }

    // Check network before attempting token refresh
    const isConnected = await this.checkNetworkConnection();
    if (!isConnected) {
      throw new NetworkError("No internet connection. Unable to refresh session.");
    }

    try {
      const response = await fetch(`${this.serverUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-refresh-token": tokens.refreshToken,
        },
      });

      if (!response.ok) {
        // Token refresh failed - attempt automatic re-authentication with stored credentials
        const storedCredentials =
          this.credentials || (await AudiobookshelfAuth.getStoredCredentials());

        if (storedCredentials) {
          console.log("Token refresh failed, attempting automatic re-authentication...");
          try {
            // Attempt to re-login with stored credentials
            const loginResponse = await this.login(storedCredentials);
            console.log("Automatic re-authentication successful");
            return loginResponse.user.accessToken;
          } catch (reAuthError) {
            console.error("Automatic re-authentication failed:", reAuthError);
            // Only clear tokens but keep credentials for manual retry
            await this.clearTokens(false);
            AudiobookshelfAuth.reset();
            throw new AuthenticationError(
              "Session expired. Automatic re-login failed. Please login again."
            );
          }
        } else {
          // No stored credentials, can't auto re-authenticate
          await this.clearTokens(false);
          AudiobookshelfAuth.reset();
          throw new AuthenticationError("Session expired. Please login again.");
        }
      }

      const data: LoginResponse = await response.json();

      const newTokens: AuthTokens = {
        accessToken: data.user.accessToken,
        refreshToken: data.user.refreshToken || tokens.refreshToken,
        oldToken: data.user.token,
        expiresAt: this.calculateTokenExpiry(data.user.accessToken),
      };

      await this.storeTokens(newTokens);

      // Schedule next proactive token refresh
      this.scheduleTokenRefresh(newTokens.expiresAt);

      // Emit token refreshed event
      emitTokenRefreshed(newTokens.expiresAt);

      return newTokens.accessToken;
    } catch (error) {
      // Emit token refresh failed event
      if (error instanceof AuthenticationError) {
        emitTokenRefreshFailed(
          createAuthError(AuthErrorType.SESSION_EXPIRED, error.message, false)
        );
      } else {
        emitTokenRefreshFailed(
          createAuthError(AuthErrorType.TOKEN_REFRESH_FAILED, "Token refresh failed", true)
        );
      }
      if (error instanceof AudiobookshelfError) throw error;
      throw new NetworkError("Unable to refresh session");
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    const tokens = this.tokens || (await this.getStoredTokens());
    if (!tokens) return null;

    if (Date.now() < tokens.expiresAt - 300000) {
      // Reset retry count on successful token validation
      this.retryCount = 0;
      return tokens.accessToken;
    }

    // Try to refresh token with exponential backoff
    return await this.refreshTokenWithRetry();
  }

  private async refreshTokenWithRetry(): Promise<string | null> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const token = await this.refreshAccessToken();
        // Success - reset retry count
        this.retryCount = 0;
        return token;
      } catch (error) {
        this.retryCount = attempt + 1;

        // If this was the last attempt, or if it's an auth error (not network), don't retry
        if (attempt === this.maxRetries || error instanceof AuthenticationError) {
          console.error(`Token refresh failed after ${attempt + 1} attempts`);
          await this.clearTokens(false);
          AudiobookshelfAuth.reset();
          return null;
        }

        // Calculate exponential backoff delay
        const delayMs = this.baseRetryDelayMs * Math.pow(2, attempt);
        console.log(`Token refresh attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return null;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getValidAccessToken();
    return token !== null;
  }

  // ✅ Quick check (sync, no await)
  get isAssumedAuthed(): boolean {
    return !!(this.serverUrl && this.tokens?.refreshToken);
  }

  // ✅ Global quick check (no await, no instance required)
  static get isAssumedAuthedGlobal(): boolean {
    return !!(this.instance?.serverUrl && this.instance?.tokens?.refreshToken);
  }
  async logout(): Promise<LogoutResponse | null> {
    const tokens = this.tokens || (await this.getStoredTokens());

    // Clear refresh schedulers first
    this.clearRefreshSchedulers();

    // Check network - but don't block logout if offline
    const isConnected = await this.checkNetworkConnection();

    try {
      if (tokens?.refreshToken && isConnected) {
        const response = await fetch(`${this.serverUrl}/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-refresh-token": tokens.refreshToken,
          },
        });

        if (response.ok) {
          const data: LogoutResponse = await response.json();
          await this.clearTokens(true); // Clear credentials on explicit logout
          AudiobookshelfAuth.reset();
          this.username = "";
          this.userEmail = "";
          this.userId = "";

          // Emit logout event
          emitLogout();
          emitAuthStateChanged(AuthState.UNAUTHENTICATED);

          return data;
        }
      }
    } catch {
      console.warn("Server logout failed, clearing local tokens anyway");
    }

    await this.clearTokens(true); // Clear credentials on explicit logout
    AudiobookshelfAuth.reset();
    this.username = "";
    this.userEmail = "";
    this.userId = "";

    // Emit logout event
    emitLogout();
    emitAuthStateChanged(AuthState.UNAUTHENTICATED);

    return null;
  }

  // -------------------------
  // HELPERS
  // -------------------------

  private calculateTokenExpiry(jwt: string): number {
    try {
      const parts = jwt.split(".");
      if (parts.length !== 3) return Date.now() + 60 * 60 * 1000;

      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp) return payload.exp * 1000;

      return Date.now() + 60 * 60 * 1000;
    } catch {
      return Date.now() + 60 * 60 * 1000;
    }
  }

  private async storeTokens(tokens: AuthTokens): Promise<void> {
    this.tokens = tokens; // 🔹 keep in memory
    await SecureStore.setItemAsync(AudiobookshelfAuth.TOKEN_KEY, JSON.stringify(tokens));
  }

  private async getStoredTokens(): Promise<AuthTokens | null> {
    try {
      const stored = await SecureStore.getItemAsync(AudiobookshelfAuth.TOKEN_KEY);
      this.tokens = stored ? JSON.parse(stored) : null; // 🔹 update memory
      return this.tokens;
    } catch {
      return null;
    }
  }

  private async storeUserInfo(userInfo: { username: string; userEmail: string; userId: string }) {
    this.username = userInfo.username; // 🔹 keep in memory
    this.userEmail = userInfo.userEmail;
    this.userId = userInfo.userId;
    await SecureStore.setItemAsync(AudiobookshelfAuth.USERINFO_KEY, JSON.stringify(userInfo));
  }

  private async storeCredentials(credentials: AuthCredentials): Promise<void> {
    this.credentials = credentials; // 🔹 keep in memory
    await SecureStore.setItemAsync(AudiobookshelfAuth.CREDENTIALS_KEY, JSON.stringify(credentials));
  }

  private async clearTokens(clearCredentials: boolean = false): Promise<void> {
    this.tokens = null; // 🔹 clear memory
    await SecureStore.deleteItemAsync(AudiobookshelfAuth.TOKEN_KEY);
    this.username = undefined;
    this.userEmail = undefined;
    this.userId = undefined;
    await SecureStore.deleteItemAsync(AudiobookshelfAuth.USERINFO_KEY);

    // Only clear credentials on explicit logout
    if (clearCredentials) {
      this.credentials = null;
      await SecureStore.deleteItemAsync(AudiobookshelfAuth.CREDENTIALS_KEY);
    }
  }

  private async storeServerUrl(): Promise<void> {
    console.log("Seeting server URL", this.serverUrl);
    await SecureStore.setItemAsync(AudiobookshelfAuth.SERVER_URL_KEY, this.serverUrl);
  }

  async getStoredServerUrl(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(AudiobookshelfAuth.SERVER_URL_KEY);
    } catch {
      return null;
    }
  }
}
