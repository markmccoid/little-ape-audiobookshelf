# Audiobookshelf Progress Sync Utility

This utility provides a method to update both the **Media Bookmark** (`currentTime`) and the **Listening Statistics** (`timeListened`) in Audiobookshelf (ABS) without maintaining a persistent WebSocket or long-running playback session.

## Background

In the Audiobookshelf API, progress is split into two distinct tables:

1. **Media Progress**: Stores _where_ you are in a book.
2. **Listening Sessions**: Stores _how long_ you spent listening (used for your personal stats dashboard).

The standard `PATCH /api/me/progress` route only updates the bookmark. To record "Time Listened," a session must be opened, synced, and closed. This script automates that "handshake."

## The Workflow

The script executes three sequential API calls to ensure the server registers the listening activity correctly:

1. **Initialize**: `POST /api/items/:id/play` creates a unique `sessionId`.
2. **Sync**: `POST /api/session/:id/sync` injects the `timeListened` delta and the `currentTime`.
3. **Finalize**: `POST /api/session/:id/close` gracefully terminates the session so it doesn't appear as "Active" on the server dashboard.

## Implementation

```javascript
/**
 * Syncs audiobook progress and increments listening statistics.
 * * @param {string} baseUrl - The base URL of your ABS instance (e.g., 'https://abs.example.com')
 * @param {string} token - Your API User Token
 * @param {string} libraryItemId - The ID of the book (starts with 'li_')
 * @param {Object} data - The progress data
 * @param {number} data.currentTime - The new position in the book (seconds)
 * @param {number} data.timeListened - The amount of time to add to stats (seconds)
 * @param {number} data.duration - The total length of the book (seconds)
 */
async function syncABSProgress(baseUrl, token, libraryItemId, data) {
  const { currentTime, timeListened, duration } = data;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    // 1. Open a temporary session
    // We send deviceInfo so the server knows which "device" earned these stats.
    const openResponse = await fetch(`${baseUrl}/api/items/${libraryItemId}/play`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        deviceInfo: {
          clientName: "External-Sync-Utility",
          deviceId: "sync-utility-01",
        },
        forceDirectPlay: true,
      }),
    });

    if (!openResponse.ok) throw new Error(`Init failed: ${openResponse.statusText}`);

    const session = await openResponse.json();
    const sessionId = session.id;

    // 2. Sync the progress and 'timeListened'
    // This is the call that actually populates the 'Listening Stats' in the dashboard.
    const syncResponse = await fetch(`${baseUrl}/api/session/${sessionId}/sync`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        currentTime,
        timeListened,
        duration,
      }),
    });

    if (!syncResponse.ok) throw new Error(`Sync failed: ${syncResponse.statusText}`);

    // 3. Close the session immediately
    // This ensures the session doesn't hang open on the server.
    await fetch(`${baseUrl}/api/session/${sessionId}/close`, {
      method: "POST",
      headers,
      body: JSON.stringify({ currentTime }),
    });

    console.log(
      `Successfully updated: Position ${currentTime}s | Added ${timeListened}s listening time.`
    );
  } catch (error) {
    console.error("ABS Sync Error:", error.message);
  }
}
```

## Usage Example

```javascript
const CONFIG = {
  url: "https://audiobooks.myserver.com",
  token: "YOUR_API_TOKEN",
};

const progressUpdate = {
  currentTime: 3600.5, // 1 hour into the book
  timeListened: 600, // User just listened for 10 minutes
  duration: 7200, // Total book length is 2 hours
};

syncABSProgress(CONFIG.url, CONFIG.token, "li_yourbookid", progressUpdate);
```

## Important Considerations

- **Time Listened Delta**: The `timeListened` value should be the **amount of time spent since the last sync**, not the total time spent on the book.
- **Rate Limiting**: If you are calling this repeatedly in a loop, it is better to maintain one `sessionId` rather than opening/closing it constantly. This script is intended for "Post-Listening" or "Offline-Sync" scenarios.

---

Would you like me to adapt this to handle a batch of updates (e.g., if you have multiple books to sync at once after being offline)?
