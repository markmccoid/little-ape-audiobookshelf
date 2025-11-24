// Single unified type for all bookshelves (default and custom)
export type Bookshelf = {
  id: string;
  label: string;
  type: "abs" | "custom";
  position: number;
  displayed: boolean;
};

// The 4 default bookshelves from the API
export const defaultBookshelves: Bookshelf[] = [
  {
    id: "continue-listening",
    label: "Continue Listening",
    type: "abs",
    position: 1,
    displayed: true,
  },
  { id: "recently-added", label: "Recently Added", type: "abs", position: 2, displayed: true },
  { id: "discover", label: "Discover", type: "abs", position: 3, displayed: true },
  { id: "listen-again", label: "Listen Again", type: "abs", position: 4, displayed: true },
];

// Simple Record mapping bookshelf IDs to arrays of book IDs
export type BookshelvesState = Record<string, string[]>;
