import TrackPlayer, { State } from "react-native-track-player";

export type Chapter = {
  id: number;
  title: string;
  // start position in seconds
  start: number;
  // end position in seconds
  end: number;
  // durationSeconds: number;
  // startMilliSeconds?: number;
  // endMilliSeconds?: number;
  // lengthMilliSeconds?: number;
};

type Params = { chapters: Chapter[]; position: number };

//~ ------------------------------------------
//~ getCurrentChapter
//~ ------------------------------------------
export const getCurrentChapter = ({ chapters = [], position }: Params) => {
  // const queueChapters = chapters[currentTrack.]
  // const qChapters = chapters?.[currentQueueId];

  if (chapters?.length > 0 && chapters[0].title !== "~NO CHAPTERS~") {
    for (let i = 0; i < chapters.length; i++) {
      // console.log("in GCC", position, i, chapters[i]?.endSeconds);
      if (position <= chapters[i]?.end) {
        return {
          chapterInfo: chapters[i],
          chapterIndex: i,
          nextChapterExists: i < chapters.length,
          chapterProgressOffset: chapters[i].start,
        };
        break;
      }
    }
  }
  return {
    chapterInfo: undefined,
    chapterIndex: -1,
    chapterProgressOffset: 0,
    nextChapterExists: false,
  };
};

//~ ------------------------------------------
//~ waitForReadyState
//~ When loading a book for the first time, this will let
//~ us know when the book is fully loaded and ready to be played.
//~ ------------------------------------------
export const waitForReadyState = (timeout = 15000) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Playback timeout"));
    }, timeout);

    const checkState = async () => {
      const state = await TrackPlayer.getPlaybackState();
      if (state.state === State.Ready) {
        // if (state.state === State.Playing) {
        clearTimeout(timeoutId);
        resolve(true);
      } else {
        setTimeout(checkState, 100);
      }
    };

    checkState();
  });
};
