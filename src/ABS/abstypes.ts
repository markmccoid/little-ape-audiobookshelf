// types/audiobookshelf.ts

//~~ ========================================================
//~~ Base Types
//~~ ========================================================
export interface Author {
  id: string;
  name: string;
}

export interface Series {
  id: string;
  name: string;
}

export interface Chapter {
  id: number;
  start: number;
  end: number;
  title: string;
}

export interface FileMetadata {
  filename: string;
  ext: string;
  path: string;
  relPath: string;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  birthtimeMs: number;
}

//~~ ========================================================
//~~ Authentication & User Types
//~~ ========================================================
export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  oldToken: string; // For backwards compatibility
  expiresAt: number; // We'll calculate this client-side
}

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  type: string;
  token: string; // old token
  refreshToken?: string; // Only present when x-return-tokens header is used
  accessToken: string; // new JWT
}

export interface UserPermissions {
  download: boolean;
  update: boolean;
  delete: boolean;
  upload: boolean;
  accessAllLibraries: boolean;
  accessAllTags: boolean;
  selectedTagsNotAccessible?: boolean;
  accessExplicitContent: boolean;
}

export interface MediaProgress {
  id: string;
  userId: string;
  libraryItemId: string;
  episodeId: string | null;
  mediaItemId: string;
  mediaItemType: "book" | "podcast";
  duration: number;
  progress: number;
  currentTime: number;
  isFinished: boolean;
  hideFromContinueListening: boolean;
  ebookLocation: string | null;
  ebookProgress: number | null;
  lastUpdate: number;
  startedAt: number;
  finishedAt: number | null;
}

export interface Bookmark {
  libraryItemId: string;
  time: number;
  title: string;
  createdAt: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  type: "user" | "admin" | "guest";
  token: string;
  isOldToken: boolean;
  mediaProgress: MediaProgress[];
  seriesHideFromContinueListening: string[];
  bookmarks: Bookmark[];
  isActive: boolean;
  isLocked: boolean;
  lastSeen: number;
  createdAt: number;
  permissions: UserPermissions;
  librariesAccessible: string[];
  itemTagsSelected: string[];
  hasOpenIDLink: boolean;
  refreshToken: string;
  accessToken: string;
}

//~~ ========================================================
//~~ Server & Settings Types
//~~ ========================================================
export interface ServerSettings {
  id: string;
  scannerFindCovers: boolean;
  scannerCoverProvider: string;
  scannerParseSubtitle: boolean;
  scannerPreferMatchedMetadata: boolean;
  scannerDisableWatcher: boolean;
  storeCoverWithItem: boolean;
  storeMetadataWithItem: boolean;
  metadataFileFormat: string;
  rateLimitLoginRequests: number;
  rateLimitLoginWindow: number;
  allowIframe: boolean;
  backupPath: string;
  backupSchedule: string;
  backupsToKeep: number;
  maxBackupSize: number;
  loggerDailyLogsToKeep: number;
  loggerScannerLogsToKeep: number;
  homeBookshelfView: number;
  bookshelfView: number;
  podcastEpisodeSchedule: string;
  sortingIgnorePrefix: boolean;
  sortingPrefixes: string[];
  chromecastEnabled: boolean;
  dateFormat: string;
  timeFormat: string;
  language: string;
  logLevel: number;
  version: string;
  buildNumber: number;
  authLoginCustomMessage: string | null;
  authActiveAuthMethods: string[];
  authOpenIDIssuerURL: string | null;
  authOpenIDAuthorizationURL: string | null;
  authOpenIDTokenURL: string | null;
  authOpenIDUserInfoURL: string | null;
  authOpenIDJwksURL: string | null;
  authOpenIDLogoutURL: string | null;
  authOpenIDTokenSigningAlgorithm: string;
  authOpenIDButtonText: string;
  authOpenIDAutoLaunch: boolean;
  authOpenIDAutoRegister: boolean;
  authOpenIDMatchExistingBy: string | null;
}

export interface DeviceInfo {
  id: string;
  userId: string;
  deviceId: string;
  ipAddress: string;
  clientVersion: string;
  clientName: string;
}

//~~ ========================================================
//~~ Library Types
//~~ ========================================================
export interface Library {
  id: string;
  name: string;
  folders: {
    id: string;
    fullPath: string;
    libraryId: string;
    addedAt: number;
  }[];
  displayOrder: number;
  icon: string;
  mediaType: string;
  provider: string;
  settings: {
    coverAspectRatio: number;
    disableWatcher: boolean;
    skipMatchingMediaWithAsin: boolean;
    skipMatchingMediaWithIsbn: boolean;
    autoScanCronExpression: string | null;
  };
  createdAt: number;
  lastUpdate: number;
}

export interface FilterData {
  authors: { id: string; name: string }[];
  genres: string[];
  tags: string[];
  series: { id: string; name: string }[];
  narrators: string[];
  languages: string[];
}

//~~ ========================================================
//~~ Media & Metadata Types
//~~ ========================================================
export interface MediaMetadata {
  title: string;
  subtitle: string | null;
  authors: Author[];
  narrators: string[];
  series: Series[];
  genres: string[];
  publishedYear: string;
  publishedDate: string | null;
  publisher: string;
  description: string;
  isbn: string | null;
  asin: string | null;
  language: string;
  explicit: boolean;
  abridged: boolean;
  titleIgnorePrefix?: string;
  authorName?: string;
  authorNameLF?: string;
  narratorName?: string;
  seriesName?: string;
  descriptionPlain?: string;
}

export interface MetaTags {
  tagAlbum?: string;
  tagArtist?: string;
  tagGenre?: string;
  tagTitle?: string;
  tagAlbumArtist?: string;
  tagDate?: string;
  tagComment?: string;
  tagEncoder?: string;
  tagEncodedBy?: string;
  tagTrack?: string;
  [key: string]: string | undefined;
}

//~~ ========================================================
//~~ File Types
//~~ ========================================================
export interface LibraryFile {
  ino: string;
  metadata: FileMetadata;
  isSupplementary: boolean | null;
  addedAt: number;
  updatedAt: number;
  fileType: string;
}

export interface AudioFile {
  index: number;
  ino: string;
  metadata: FileMetadata;
  addedAt: number;
  updatedAt: number;
  trackNumFromMeta: number | null;
  discNumFromMeta: number | null;
  trackNumFromFilename: number | null;
  discNumFromFilename: number | null;
  manuallyVerified: boolean;
  exclude: boolean;
  error: string | null;
  format: string;
  duration: number;
  bitRate: number;
  language: string | null;
  codec: string;
  timeBase: string;
  channels: number;
  channelLayout: string;
  chapters: Chapter[];
  embeddedCoverArt: string | null;
  metaTags: MetaTags;
  mimeType: string;
  title?: string;
  startOffset?: number;
  contentUrl?: string;
}

export interface EbookFile {
  ino: string;
  metadata: FileMetadata;
  ebookFormat: string;
  addedAt: number;
  updatedAt: number;
}

export interface AudioTrack {
  index: number;
  startOffset: number;
  duration: number;
  title: string;
  contentUrl: string;
  mimeType: string;
  codec: string | null;
  metadata: FileMetadata | null;
}

//~~ ========================================================
//~~ Media & Library Item Types
//~~ ========================================================
export interface Media {
  id: string;
  libraryItemId: string;
  metadata: MediaMetadata;
  coverPath: string;
  tags: string[];
  audioFiles: AudioFile[];
  chapters: Chapter[];
  ebookFile: EbookFile | null;
  duration: number;
  size: number;
  tracks: AudioFile[];
  numTracks?: number;
  numAudioFiles?: number;
  numChapters?: number;
  ebookFormat?: string | null;
}

export interface UserMediaProgress {
  id: string;
  libraryItemId: string;
  episodeId: null;
  duration: number;
  progress: number;
  currentTime: number;
  isFinished: boolean;
  hideFromContinueListening: boolean;
  lastUpdate: number;
  startedAt: number;
  finishedAt: null;
}

export interface LibraryItem {
  id: string;
  ino: string;
  oldLibraryItemId: string | null;
  libraryId: string;
  folderId: string;
  path: string;
  relPath: string;
  isFile: boolean;
  mtimeMs: number;
  ctimeMs: number;
  birthtimeMs: number;
  addedAt: number;
  updatedAt: number;
  lastScan: number;
  scanVersion: string;
  isMissing: boolean;
  isInvalid: boolean;
  mediaType: string;
  media: Media;
  libraryFiles: LibraryFile[];
  size: number;
  numFiles?: number;
  userMediaProgress?: UserMediaProgress;
  collapsedSeries?: {
    id: string;
    name: string;
    nameIgnorePrefix: string;
    numBooks: number;
  };
}

//~~ ========================================================
//~~ Session Types
//~~ ========================================================
export interface AudiobookSession {
  id: string;
  userId: string;
  libraryId: string;
  libraryItemId: string;
  bookId: string;
  episodeId: string | null;
  mediaType: string;
  mediaMetadata: MediaMetadata;
  chapters: Chapter[];
  displayTitle: string;
  displayAuthor: string;
  coverPath: string;
  duration: number;
  playMethod: number;
  mediaPlayer: string;
  deviceInfo: DeviceInfo;
  serverVersion: string;
  date: string;
  dayOfWeek: string;
  timeListening: number;
  startTime: number;
  currentTime: number;
  startedAt: number;
  updatedAt: number;
  audioTracks: AudioTrack[];
  libraryItem: LibraryItem;
}

//~~ ========================================================
//~~ API Response Types
//~~ ========================================================
export interface LoginResponse {
  user: User;
  userDefaultLibraryId: string;
  serverSettings: ServerSettings;
  ereaderDevices: unknown[];
  Source: string;
}

export interface LogoutResponse {
  redirect_url?: string; // For OIDC logout
}

export interface LibraryGetResponse {
  filterdata: FilterData;
  issues: number;
  numUserPlaylists: number;
  library: Library;
}

export interface GetLibraryItemsResponse {
  results: LibraryItem[];
  total: number;
  limit: number;
  page: number;
  sortBy: string;
  sortDesc: boolean;
  filterBy: string;
  mediaType: string;
  minified: boolean;
  collapseseries: boolean;
  include: string;
}

//~~ ========================================================
//~~ Error Classes
//~~ ========================================================
export class AudiobookshelfError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "AudiobookshelfError";
  }
}

export class AuthenticationError extends AudiobookshelfError {
  constructor(message: string = "Authentication failed") {
    super(message, "AUTH_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

export class NetworkError extends AudiobookshelfError {
  constructor(message: string = "Network connection failed") {
    super(message, "NETWORK_ERROR");
    this.name = "NetworkError";
  }
}

//~~ ========================================================
//~~ Legacy Type Aliases (for backwards compatibility)
//~~ ========================================================
export type ABSLoginResponse = LoginResponse;
export type ABSBookmark = Bookmark;
export type LibraryBookExtended = LibraryItem;
