import { AudioTrackInfo } from "@/src/store/store-books";
import { Chapter } from "@/src/utils/AudiobookShelf/abstypes";
import { Paths } from "expo-file-system";
import TrackPlayer, { PitchAlgorithm, State } from "react-native-track-player";
import { getAbsAPI } from "../AudiobookShelf/absInit";

// export type Chapter = {
//   id: number;
//   title: string;
//   // start position in seconds
//   start: number;
//   // end position in seconds
//   end: number;
//   // durationSeconds: number;
//   // startMilliSeconds?: number;
//   // endMilliSeconds?: number;
//   // lengthMilliSeconds?: number;
// };

type Params = { chapters: Chapter[]; position: number };

//~ ------------------------------------------
//~ getTrackPlayerTracks
//~ ------------------------------------------

export const getTrackPlayerTracksDL = (
  libraryItemId: string,
  currentTime: number,
  bookMetadata: { title: string; author: string },
  audioTracks: AudioTrackInfo[], //!  Need to define. need to make align with streaming if we want this function to be multipurpose NO
  chapters: Chapter[] //!chapters should be on the audioTracks array object
) => {
  const trackOffsets = audioTracks.map((el) => el.startOffset) || [];
  const absAPI = getAbsAPI();
  // Use the real progress, not the session's startTime
  // const actualStartTime = currentTime || 0;
  const coverURL = absAPI.buildCoverURL(libraryItemId);

  const tracks = audioTracks.map((audioTrack, index) => ({
    id: `${libraryItemId}-${index}`,
    trackIndex: index, // convert to zero based index
    url: `${Paths.document.uri}${audioTrack.cleanFileName}`, //! Make sure this is on the audiotrack object
    title: bookMetadata.title,
    artist: bookMetadata.author,
    artwork: coverURL.coverFull,
    duration: audioTrack.duration,
    sessionId: libraryItemId,
    trackOffset: trackOffsets[index] ?? 0,
    libraryItemId: libraryItemId,
    chapters: chapters || [],
    pitchAlgorithm: PitchAlgorithm.Voice,
  }));

  return tracks;
};

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
export const waitForReadyState = (timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      // reject(new Error("Playback timeout"));
      // clearTimeout(timeoutId);
      console.log("TrackPalyer State");
      resolve(true);
    }, timeout);

    const checkState = async () => {
      const state = await TrackPlayer.getPlaybackState();
      // console.log("Checking Ready state", state.state);
      if (state.state === State.Ready || state.state === State.Playing) {
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
