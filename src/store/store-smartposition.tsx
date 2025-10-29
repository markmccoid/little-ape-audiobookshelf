import { create } from "zustand";

type ChapterInfo = {
  chapterPosition: number;
  chapterDuration: number;
  chapterTitle: string;
  chapterNumber: number;
  chapterIndex: number;
  chapterStart: number;
  chapterEnd: number;
  numOfChapters: number;
};

type BookSmartPosition = {
  globalPosition?: number;
  globalDuration?: number;
  chapterInfo: ChapterInfo;
};

type SmartPosState = {
  // keyed by libraryItemId
  smartPositions: Record<string, BookSmartPosition>;
  getSmartPosition: (libraryItemId: string) => BookSmartPosition;
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

export const useSmartPositionStore = create<SmartPosState>((set, get) => ({
  smartPositions: {},

  getSmartPosition: (libraryItemId) => {
    const smartPositions = get().smartPositions;
    return smartPositions[libraryItemId] ?? EMPTY_SMART_POSITION;
  },
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
    chapterIndex: 0,
    chapterStart: 0,
    chapterEnd: 0,
  },
};
export const useSmartPositions = (libraryItemId: string) => {
  const {
    globalPosition,
    globalDuration,
    chapterInfo: {
      chapterDuration,
      chapterPosition,
      chapterTitle,
      chapterNumber,
      chapterIndex,
      chapterStart,
      chapterEnd,
      numOfChapters,
    },
  } = useSmartPositionStore((state) => state.smartPositions[libraryItemId] ?? EMPTY_SMART_POSITION);
  return {
    globalPosition,
    globalDuration,
    chapterInfo: {
      chapterDuration,
      chapterPosition,
      chapterTitle,
      chapterNumber,
      chapterIndex,
      chapterStart,
      chapterEnd,
      numOfChapters,
    },
  };
};
