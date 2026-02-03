# Onboarding Checklist

Use this checklist to get productive quickly in the Little Ape Audiobookshelf app.

## 1. Project Setup

- [ ] Review `docs/overview.md` for architecture context.
- [ ] Review `APPLICATION_FLOW.md` and `authentication.md`.
- [ ] Install dependencies: `npm install`.
- [ ] Configure your ABS server credentials in the app UI.

## 2. Understand Core Concepts

- [ ] Read `docs/PlaybackSessionSync.md` to understand unified sync.
- [ ] Read `docs/PlaybackSeekingUI.md` for optimistic seek behavior.
- [ ] Read `docs/MiniPlayer.md` for drag + persistence logic.
- [ ] Skim `CODEDOCS.md` for server-as-source-of-truth position tracking.

## 3. Key Code Areas to Explore

- [ ] App startup: `src/app/_layout.tsx`
- [ ] Auth + API singletons: `src/utils/AudiobookShelf/absAuthClass.ts`, `src/utils/AudiobookShelf/absAPIClass.ts`, `src/utils/AudiobookShelf/absInit.ts`
- [ ] Playback pipeline: `src/utils/rn-trackplayer/AudiobookStreamer.ts`, `SessionManager.ts`, `SyncManager.ts`
- [ ] Playback store: `src/store/store-playback.ts`
- [ ] Books store: `src/store/store-books.ts`
- [ ] Library screens: `src/screens/Library/LibraryContainer.tsx`
- [ ] Book detail screen: `src/screens/BookViewer/BookContainer.tsx`

## 4. Verify End-to-End Flows

- [ ] Launch app and confirm auth flow works.
- [ ] Browse library and open a book.
- [ ] Stream a book and confirm progress sync.
- [ ] Download a book and test offline playback.
- [ ] Toggle network offline and confirm sync queue is populated.
- [ ] Reconnect and confirm queue is processed.

## 5. Useful Debug Tips

- [ ] Check network status banner and auth banner on the root layout.
- [ ] Use `src/store/store-debuglogs.ts` for playback sync debugging.
- [ ] When playback feels laggy, verify `useSmartPosition()` usage.

