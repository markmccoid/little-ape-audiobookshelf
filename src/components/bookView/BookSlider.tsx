import { useSmartPosition } from "@/src/hooks/trackPlayerHooks";
import {
  usePlaybackActions,
  usePlaybackDuration,
  usePlaybackStore,
} from "@/src/store/store-playback";
import { formatSeconds } from "@/src/utils/formatUtils";
// import { Host, Slider } from "@expo/ui/swift-ui";
import Slider from "@react-native-community/slider";
import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

const BookSlider = () => {
  const position = useSmartPosition();

  const loaded = usePlaybackStore((state) => state.isLoaded);
  const duration = usePlaybackDuration();
  const { seekTo } = usePlaybackActions();
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
  const sliderDisplayValue = isUserSliding ? localSliderValue : position;
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

  if (!loaded)
    return (
      <View style={{ width: "100%", height: 40 }}>
        <Text>loading...</Text>
      </View>
    );
  return (
    <View>
      <Text>{formatSeconds(sliderDisplayValue || 0)}</Text>

      <Slider
        style={{ width: "100%", height: 40 }}
        minimumValue={0}
        maximumValue={duration}
        value={sliderDisplayValue}
        step={1}
        tapToSeek
        minimumTrackTintColor="#FFFFFF"
        maximumTrackTintColor="#000000"
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
