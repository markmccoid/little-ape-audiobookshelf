import { useSmartPosition } from "@/src/hooks/trackPlayerHooks";
import { formatSeconds } from "@/src/lib/formatUtils";
import {
  usePlaybackActions,
  usePlaybackDuration,
  usePlaybackStore,
} from "@/src/store/store-playback";
// import { Host, Slider } from "@expo/ui/swift-ui";
import Slider from "@react-native-community/slider";
import React, { useState } from "react";
import { Text, View } from "react-native";

const BookSlider = () => {
  const position = useSmartPosition();

  const loaded = usePlaybackStore((state) => state.isLoaded);
  const duration = usePlaybackDuration();
  const { seekTo } = usePlaybackActions();

  // Track if user is actively sliding
  const [isUserSliding, setIsUserSliding] = useState(false);
  // Local slider value when user is actively sliding
  const [localSliderValue, setLocalSliderValue] = useState(0);

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
        minimumTrackTintColor="#FFFFFF"
        maximumTrackTintColor="#000000"
        onSlidingStart={() => setIsUserSliding(true)}
        onValueChange={(value) => {
          setLocalSliderValue(value);
        }}
        onSlidingComplete={async (value) => {
          await seekTo(value);
          setLocalSliderValue(value);
          // setIsUserSliding(false);
          setTimeout(() => setIsUserSliding(false), 1000);
        }}
        // thumbTintColor="red"
      />
    </View>
  );
};

export default BookSlider;
