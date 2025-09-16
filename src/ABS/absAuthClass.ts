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

export class AudiobookshelfAuth {
  private static readonly TOKEN_KEY = "audiobookshelf_tokens";
  private static readonly SERVER_URL_KEY = "audiobookshelf_server_url";
  private static readonly USERINFO_KEY = "audiobookshelf_user_info";

  private static instance: AudiobookshelfAuth | null = null;

  // 🔹 In-memory cache
  private tokens: AuthTokens | null = null;
  username: string | undefined = "";
  userEmail: string | undefined = "";
  userId: string | undefined = "";
  defaultLibraryId: string | undefined = "";

  private constructor(private serverUrl: string) {}

  get absURL() {
    return this.serverUrl;
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

  static reset(): void {
    this.instance = null;
  }

  // -------------------------
  // AUTH METHODS
  // -------------------------

  async login(credentials: AuthCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.serverUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-return-tokens": "true",
        },
        body: JSON.stringify(credentials),
      });

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

      this.defaultLibraryId = data.userDefaultLibraryId;
      this.username = data.user.username;
      this.userEmail = data.user.email;
      this.userId = data.user.id;

      return data;
    } catch (error) {
      if (error instanceof AudiobookshelfError) throw error;
      throw new NetworkError("Unable to connect to server");
    }
  }

  async refreshAccessToken(): Promise<string> {
    const tokens = this.tokens || (await this.getStoredTokens());
    if (!tokens?.refreshToken) {
      throw new AuthenticationError("No refresh token available");
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
        await this.clearTokens();
        AudiobookshelfAuth.reset();
        throw new AuthenticationError("Session expired. Please login again.");
      }

      const data: LoginResponse = await response.json();

      const newTokens: AuthTokens = {
        accessToken: data.user.accessToken,
        refreshToken: data.user.refreshToken || tokens.refreshToken,
        oldToken: data.user.token,
        expiresAt: this.calculateTokenExpiry(data.user.accessToken),
      };

      await this.storeTokens(newTokens);
      return newTokens.accessToken;
    } catch (error) {
      if (error instanceof AudiobookshelfError) throw error;
      throw new NetworkError("Unable to refresh session");
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    const tokens = this.tokens || (await this.getStoredTokens());
    if (!tokens) return null;

    if (Date.now() < tokens.expiresAt - 300000) {
      return tokens.accessToken;
    }

    try {
      return await this.refreshAccessToken();
    } catch {
      await this.clearTokens();
      AudiobookshelfAuth.reset();
      return null;
    }
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

    try {
      if (tokens?.refreshToken) {
        const response = await fetch(`${this.serverUrl}/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-refresh-token": tokens.refreshToken,
          },
        });

        if (response.ok) {
          const data: LogoutResponse = await response.json();
          await this.clearTokens();
          AudiobookshelfAuth.reset();
          this.username = "";
          this.userEmail = "";
          this.userId = "";
          return data;
        }
      }
    } catch {
      console.warn("Server logout failed, clearing local tokens anyway");
    }

    await this.clearTokens();
    AudiobookshelfAuth.reset();
    this.username = "";
    this.userEmail = "";
    this.userId = "";
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

  private async clearTokens(): Promise<void> {
    this.tokens = null; // 🔹 clear memory
    await SecureStore.deleteItemAsync(AudiobookshelfAuth.TOKEN_KEY);
    this.username = undefined;
    this.userEmail = undefined;
    this.userId = undefined;
    await SecureStore.deleteItemAsync(AudiobookshelfAuth.USERINFO_KEY);
  }

  private async storeServerUrl(): Promise<void> {
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
