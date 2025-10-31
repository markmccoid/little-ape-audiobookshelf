import { useThemeColors } from "@/src/utils/theme";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import HtmlToMarkdown from "./HTMLToMarkdown";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function BookDescription({ bookDescription }: { bookDescription: string }) {
  const themeColors = useThemeColors();
  const [viewFullDesc, setViewFullDesc] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<View>(null); // Ref for the visible content (for measurement callback)
  const ghostRef = useRef<View>(null); // Ref for the hidden ghost view

  const heightValue = useSharedValue(110);
  const ellipsisValue = useSharedValue(1);

  // Measure full height using the ghost view after mount
  useEffect(() => {
    if (ghostRef.current && contentHeight === 0) {
      setTimeout(() => {
        // Small delay to ensure layout is complete
        if (Platform.OS === "ios") {
          // On iOS, use measure directly via ref
          ghostRef.current?.measure((x, y, width, height) => {
            setContentHeight(height);
          });
        }
      }, 100); // Adjust delay if needed for complex HTML rendering
    }
  }, [contentHeight, bookDescription]);

  const toggleViewFullDesc = () => {
    if (viewFullDesc) {
      // Collapse
      heightValue.value = withTiming(110, { duration: 600 });
      ellipsisValue.value = withDelay(600, withTiming(1, { duration: 600 }));
    } else {
      // Expand to measured full height
      heightValue.value = withTiming(contentHeight || 110, { duration: 800 });
      ellipsisValue.value = withTiming(0, { duration: 900 });
    }
    setViewFullDesc(!viewFullDesc);
  };

  const ellipsisAnim = useAnimatedStyle(() => ({
    opacity: ellipsisValue.value,
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    height: heightValue.value,
  }));

  return (
    <>
      {/* Ghost view: unconstrained, hidden, measures full height */}
      <View
        ref={ghostRef}
        style={{
          position: "absolute",
          opacity: 0, // Or top: -9999 to hide off-screen
          left: 0,
          top: 0,
          width: "100%", // Match parent width for accurate measurement
          pointerEvents: "none", // Prevent interactions
        }}
        collapsable={false} // Prevent RN from skipping layout
      >
        <HtmlToMarkdown html={bookDescription || ""} />
      </View>

      {/* Absolute position Ellipsis icon */}
      {!viewFullDesc && (
        <Animated.View
          style={[ellipsisAnim]}
          className="absolute top-[100] right-2 z-10 "
          pointerEvents="none"
        >
          <SymbolView name="ellipsis.rectangle.fill" tintColor={themeColors.accent} size={30} />
        </Animated.View>
      )}
      <ScrollView>
        {/* Main visible component */}
        <AnimatedPressable onPress={toggleViewFullDesc} hitSlop={20}>
          <Animated.View ref={contentRef} style={[animatedStyle, { overflow: "hidden" }]}>
            <HtmlToMarkdown html={bookDescription || ""} textColor={themeColors.foreground} />
          </Animated.View>
        </AnimatedPressable>
      </ScrollView>
    </>
  );
}

export default BookDescription;
