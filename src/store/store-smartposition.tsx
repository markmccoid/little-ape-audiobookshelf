import { create } from "zustand";

type ChapterInfo = {
  chapterPosition: number;
  chapterDuration: number;
  chapterTitle: string;
  chapterNumber: number;
};

type BookSmartPosition = {
  globalPosition?: number;
  globalDuration?: number;
  chapterInfo: ChapterInfo;
};

type SmartPosState = {
  // keyed by libraryItemId
  smartPositions: Record<string, BookSmartPosition>;
  updateForInactiveBook: (
    libraryItemId: string,
    globalPosition: number,
    globalDuration: number,
    chapterInfo: ChapterInfo
  ) => void;
  updateForActiveBook: (
    libraryItemId: string,
    globalPosition: number,
    globalDuration: number,
    chapterInfo: ChapterInfo
  ) => void;
};

export const useSmartPositionStore = create<SmartPosState>((set) => ({
  smartPositions: {},

  updateForInactiveBook: (id, pos, dur, info) =>
    set((state) => ({
      smartPositions: {
        ...state.smartPositions,
        [id]: { globalPosition: pos, globalDuration: dur, chapterInfo: info },
      },
    })),

  updateForActiveBook: (id, pos, dur, info) =>
    set((state) => ({
      smartPositions: {
        ...state.smartPositions,
        [id]: { globalPosition: pos, globalDuration: dur, chapterInfo: info },
      },
    })),
}));

const EMPTY_SMART_POSITION = {
  globalPosition: 0,
  globalDuration: 0,
  chapterInfo: {
    chapterPosition: 0,
    chapterDuration: 0,
    chapterTitle: "",
    chapterNumber: 1,
  },
};
export const useSmartPositions = (libraryItemId: string) => {
  const {
    globalPosition,
    globalDuration,
    chapterInfo: { chapterDuration, chapterPosition, chapterTitle, chapterNumber },
  } = useSmartPositionStore((state) => state.smartPositions[libraryItemId] ?? EMPTY_SMART_POSITION);
  return {
    globalPosition,
    globalDuration,
    chapterInfo: { chapterDuration, chapterPosition, chapterTitle, chapterNumber },
  };
};
