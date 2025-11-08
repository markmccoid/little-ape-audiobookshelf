/**
 * Book Availability Helper
 * Determines if a book can be played based on network state and download status
 */

export interface BookAvailability {
  libraryItemId: string;
  isDownloaded?: boolean;
  // Add more properties as needed for future download feature
}

/**
 * Check if a book can be played offline
 * 
 * @param book - Book object with availability info
 * @param isOnline - Current network online status
 * @param currentlyLoadedBookId - ID of currently loaded book (if any)
 * @returns true if book can be played, false otherwise
 */
export function canPlayBookOffline(
  book: BookAvailability,
  isOnline: boolean,
  currentlyLoadedBookId?: string | null
): boolean {
  // Already loaded in player - can continue offline
  if (currentlyLoadedBookId === book.libraryItemId) {
    return true;
  }
  
  // Downloaded - can play offline (future feature)
  if (book.isDownloaded === true) {
    return true;
  }
  
  // Not downloaded - requires internet
  return isOnline;
}

/**
 * Get availability status and reason
 * Useful for showing detailed messages to users
 */
export function getBookAvailabilityStatus(
  book: BookAvailability,
  isOnline: boolean,
  currentlyLoadedBookId?: string | null
): {
  canPlay: boolean;
  reason: "currently-playing" | "downloaded" | "online" | "offline-unavailable";
  message: string;
} {
  if (currentlyLoadedBookId === book.libraryItemId) {
    return {
      canPlay: true,
      reason: "currently-playing",
      message: "Currently playing",
    };
  }

  if (book.isDownloaded === true) {
    return {
      canPlay: true,
      reason: "downloaded",
      message: "Available offline (downloaded)",
    };
  }

  if (isOnline) {
    return {
      canPlay: true,
      reason: "online",
      message: "Requires internet connection",
    };
  }

  return {
    canPlay: false,
    reason: "offline-unavailable",
    message: "Unavailable offline - requires download or internet connection",
  };
}
