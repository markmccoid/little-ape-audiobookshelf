export const Keys = {
  absDefaultLibraryId: "app:abs:default-lib-id",
} as const;

export type Key = (typeof Keys)[keyof typeof Keys];
