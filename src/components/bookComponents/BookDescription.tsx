import { useState } from "react";
import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import HtmlToMarkdown from "./HTMLToMarkdown";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function BookDescription({ bookDescription }: { bookDescription: string }) {
  const [viewFullDesc, setViewFullDesc] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  const heightValue = useSharedValue(110);

  const handleContentLayout = (event) => {
    const measuredHeight = event.nativeEvent.layout.height;
    if (measuredHeight > contentHeight) {
      setContentHeight(measuredHeight);
    }
  };

  const toggleViewFullDesc = () => {
    if (viewFullDesc) {
      // collapse
      heightValue.value = withTiming(110, { duration: 600 });
    } else {
      // expand
      heightValue.value = withTiming(contentHeight, { duration: 800 });
    }
    setViewFullDesc(!viewFullDesc);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: heightValue.value,
  }));

  return (
    <AnimatedPressable
      onPress={toggleViewFullDesc}
      style={[animatedStyle, { overflow: "hidden" }]}
      className="overflow-hidden"
    >
      <Animated.View onLayout={handleContentLayout}>
        <HtmlToMarkdown html={bookDescription || ""} />
      </Animated.View>
    </AnimatedPressable>
  );
}
export default BookDescription;
