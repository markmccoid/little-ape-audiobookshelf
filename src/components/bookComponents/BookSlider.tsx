import { useBookData, useSmartPosition } from "@/src/hooks/trackPlayerHooks";
import { usePlaybackActions, usePlaybackDuration } from "@/src/store/store-playback";
import { formatSeconds } from "@/src/utils/formatUtils";
import { useThemeColors } from "@/src/utils/theme";
// import { Host, Slider } from "@expo/ui/swift-ui";
import { THEME } from "@/src/utils/theme";
import Slider from "@react-native-community/slider";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
interface BookSliderProps {
  bookId: string;
  // this flag tells us when to use the colors for the mainplayer which is always a "dark" like theme.
  useStaticColors?: boolean;
}

//!!
//!! Colors on the MainPlayer need to be static (pretty much always dark theme colors)
//!! Colors on other views can adhere to dark/light theme.
//!!
const BookSlider: React.FC<BookSliderProps> = ({ bookId, useStaticColors = false }) => {
  const { position } = useSmartPosition(bookId);
  const { duration: bookDuration } = useBookData(bookId);
  // const loaded = usePlaybackStore((state) => state.isLoaded);
  const playbackDuration = usePlaybackDuration();
  const { seekTo } = usePlaybackActions();
  const themeColors = useThemeColors();
  // Use playback duration when available (book is loaded), otherwise use book duration from cache/server
  const duration = playbackDuration || bookDuration || 0;
  const isMountedRef = useRef(true);

  // Track if user is actively sliding
  const [isUserSliding, setIsUserSliding] = useState(false);
  // Local slider value when user is actively sliding
  const [localSliderValue, setLocalSliderValue] = useState(0);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Calculate the display value for the slider
  const sliderDisplayValue = useMemo(
    () => (isUserSliding ? localSliderValue : position || 0),
    [isUserSliding, position]
  );
  // const sliderDisplayValue = isUserSliding ? localSliderValue : position || 0;
  console.log("BOok Slider", position, sliderDisplayValue);
  // loaded &&
  //   console.log(
  //     "SLIDER",
  //     loaded,
  //     isUserSliding,
  //     localSliderValue,
  //     position,
  //     sliderDisplayValue,
  //     duration
  //   );

  return (
    <View>
      <Text
        className="text-lg "
        style={{ color: useStaticColors ? THEME.dark.foreground : themeColors.foreground }}
      >
        {formatSeconds(sliderDisplayValue || 0)}
      </Text>

      <Slider
        style={{ width: "100%", height: 40 }}
        minimumValue={0}
        maximumValue={duration}
        value={sliderDisplayValue}
        step={1}
        tapToSeek
        minimumTrackTintColor={useStaticColors ? THEME.dark.accent : themeColors.accent}
        maximumTrackTintColor={useStaticColors ? THEME.dark.foreground : themeColors.foreground}
        onSlidingStart={() => setIsUserSliding(true)}
        onValueChange={(value) => {
          setLocalSliderValue(value);
        }}
        onSlidingComplete={async (value) => {
          // Don't execute seek operations if component is unmounted
          if (!isMountedRef.current) {
            console.log("BookSlider: Skipping seekTo - component unmounted");
            return;
          }
          try {
            await seekTo(value);
            // Only update state if still mounted
            if (isMountedRef.current) {
              setLocalSliderValue(value);
              // setIsUserSliding(false);
              setTimeout(() => {
                if (isMountedRef.current) {
                  setIsUserSliding(false);
                }
              }, 1000);
            }
          } catch (error) {
            console.warn("BookSlider: seekTo failed:", error);
            // Still reset sliding state even on error
            if (isMountedRef.current) {
              setIsUserSliding(false);
            }
          }
        }}
        // thumbTintColor="red"
      />
    </View>
  );
};

export default BookSlider;
