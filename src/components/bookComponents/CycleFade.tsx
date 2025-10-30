import React, { ReactNode, useCallback, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

type CycleFadeProps = {
  children: ReactNode[];
  transitionDurationMs?: number;
};

export function CycleFade({ children, transitionDurationMs = 300 }: CycleFadeProps) {
  const [index, setIndex] = useState(0);

  const childCount = children.length;

  const onPress = useCallback(() => {
    setIndex((prev) => (prev + 1) % childCount);
  }, [childCount]);

  return (
    <Pressable onPress={onPress} className="flex-row relative justify-center items-center h-full">
      {children.map((child, idx) => {
        const visible = idx === index;
        return (
          <Animated.View
            key={idx}
            // we overlay all children (absolute) and show/hide via opacity & transition
            style={[
              // styles.absoluteFill,
              {
                position: "absolute",
                top: 0,
                paddingHorizontal: 20,
                opacity: visible ? 1 : 0,
                transitionProperty: ["opacity"],
                transitionDuration: `${transitionDurationMs}ms`,
                transitionTimingFunction: "ease-in-out",
              },
            ]}
            pointerEvents={visible ? "auto" : "none"} // only active one handles touch if needed
          >
            {child}
          </Animated.View>
        );
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    // ensure children stack
    position: "relative",
    zIndex: 10,
    borderWidth: 1,
  },
  absoluteFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
