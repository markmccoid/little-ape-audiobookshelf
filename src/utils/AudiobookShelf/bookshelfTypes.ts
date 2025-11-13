// 1) source of truth
export const defaultBookshelves = [
  { id: "continue-listening", key: "continueListening", label: "Continue Listening", type: "ABS" },
  { id: "recently-added", key: "recentlyAdded", label: "Recently Added", type: "ABS" },
  { id: "discover", key: "discover", label: "Discover", type: "ABS" },
  { id: "listen-again", key: "listenAgain", label: "Listen Again", type: "ABS" },
] as const;

export type ABookShelf = (typeof defaultBookshelves)[number];
export type DefaultShelfId = ABookShelf["id"];
export type DefaultShelfKey = ABookShelf["key"];
// runtime/general shapes
export type CustomBookShelf = {
  id: string;
  key: string;
  label: string;
  type: "downloaded" | "custom";
};
// union used inside the store
export type BookShelf = ABookShelf | CustomBookShelf;

// 3) handy maps (typed)
export const BookShelfIdByKey: Record<DefaultShelfKey, DefaultShelfId> = Object.fromEntries(
  defaultBookshelves.map((s) => [s.key, s.id])
) as Record<DefaultShelfKey, DefaultShelfId>;

export const BookShelfKeyById: Record<DefaultShelfId, DefaultShelfKey> = Object.fromEntries(
  defaultBookshelves.map((s) => [s.id, s.key])
) as Record<DefaultShelfId, DefaultShelfKey>;

// 4) shape of shelf contents (use the minimal shape you need)
export type ShelfContents = string[]; // array of libraryItemIds
// allow default keys (fully typed) and arbitrary custom shelf keys (string)
// export type BookShelves = Partial<Record<DefaultShelfKey, { books: ShelfContents }>> &
//   Record<string, { books: ShelfContents }>;
export type BookShelves = Record<DefaultShelfId | string, string[]> &
  Record<string, { books: ShelfContents }>;
// type BookShelf = {
//   id: string;
//   key: string;
//   label: string;
// };

// export const defaultBookshelves = [
//   {
//     id: "continue-listening",
//     key: "continueListening",
//     label: "Continue Listening",
//   },
//   {
//     id: "recently-added",
//     key: "recentlyAdded",
//     label: "Recently Added",
//   },
//   {
//     id: "discover",
//     key: "discover",
//     label: "Discover",
//   },
//   {
//     id: "listen-again",
//     key: "listenAgain",
//     label: "Listen Again",
//   },
// ] as const;

// // Infer the camelCase keys (e.g., "continueListening" | "recentlyAdded" | ...)
// type DefaultShelfKey = typeof defaultBookshelves[number]["key"];

// // Infer the hyphenated IDs (e.g., "continue-listening" | "recently-added" | ...)
// type DefaultShelfId = typeof defaultBookshelves[number]["id"];

// // Custom shelves can have any string ID/key, but we'll assume they match the BookShelf shape for consistency.
// type CustomShelfKey = string; // Or narrow if you have specific customs in mind, e.g., "recentSeries" | "newestAuthors" | "custom".
// type CustomShelfId = string;

// // Combined types for use in code (defaults + customs).
// type ShelfKey = DefaultShelfKey | CustomShelfKey;
// type ShelfId = DefaultShelfId | CustomShelfId;

// type BookShelves = Partial<Record<ShelfKey, { books: string[] }>>; // Or undefined if needed, but Partial handles optionality.

// const defaultShelfKeyToId = Object.fromEntries(
//   defaultBookshelves.map(shelf => [shelf.key, shelf.id])
// ) as Readonly<Record<DefaultShelfKey, DefaultShelfId>>;
