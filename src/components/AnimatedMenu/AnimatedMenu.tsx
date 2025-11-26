import { Portal } from "@gorhom/portal";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type LayoutRectangle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { MenuContext, useMenu } from "./MenuContext";
import { MenuItem } from "./MenuItem";
import { MenuSeparator } from "./MenuSeparator";
import type { AnimatedMenuProps, MenuContentProps, MenuTriggerProps } from "./types";

// ============ MENU ROOT ============
export const AnimatedMenu: React.FC<AnimatedMenuProps> = ({ children, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState<LayoutRectangle | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const contextValue = useMemo(
    () => ({ isOpen, open, close, toggle, triggerLayout, setTriggerLayout }),
    [isOpen, open, close, toggle, triggerLayout]
  );

  return (
    <MenuContext.Provider value={contextValue}>
      <View className={`relative ${className ?? ""}`}>{children}</View>
    </MenuContext.Provider>
  );
};

// ============ MENU TRIGGER ============
export const MenuTrigger: React.FC<MenuTriggerProps> = ({ children, className }) => {
  const { toggle, setTriggerLayout, isOpen } = useMenu();
  const triggerRef = useRef<View>(null);

  const measureTrigger = useCallback(() => {
    // Use requestAnimationFrame to ensure measurement happens after layout
    requestAnimationFrame(() => {
      triggerRef.current?.measureInWindow((x, y, width, height) => {
        // Validate coordinates - sometimes headers return invalid coords
        if (x === 0 && y === 0 && width === 0 && height === 0) {
          // Retry once more
          setTimeout(() => {
            triggerRef.current?.measureInWindow((x2, y2, width2, height2) => {
              setTriggerLayout({ x: x2, y: y2, width: width2, height: height2 });
            });
          }, 50);
        } else {
          setTriggerLayout({ x, y, width, height });
        }
      });
    });
  }, [setTriggerLayout]);

  // Measure on layout (backup measurement)
  const handleLayout = useCallback(() => {
    if (!isOpen) {
      measureTrigger();
    }
  }, [measureTrigger, isOpen]);

  const tapGesture = Gesture.Tap().onEnd(() => {
    scheduleOnRN(measureTrigger);
    scheduleOnRN(toggle);
    // runOnJS(measureTrigger)();
    // runOnJS(toggle)();
  });

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View ref={triggerRef} onLayout={handleLayout} className={className}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

// ============ MENU CONTENT ============
export const MenuContent: React.FC<MenuContentProps> = ({ items, className }) => {
  const menuContext = useMenu();
  const { isOpen, close, triggerLayout } = menuContext;
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const contentHeight = useSharedValue(0); // Changed to shared value to fix worklet warning

  const progress = useSharedValue(0);
  const expandDirection = useSharedValue<"up" | "down">("down");

  // Convert triggerLayout to shared values for use in animated styles
  const triggerX = useSharedValue(0);
  const triggerY = useSharedValue(0);
  const triggerHeight = useSharedValue(0);

  // Determine expand direction based on trigger position
  // Prefer opening downward unless there's insufficient space below
  React.useEffect(() => {
    if (triggerLayout && isOpen) {
      let { x, y, height } = triggerLayout;

      // Clamp and adjust coordinates to handle header quirks
      // If y is negative or very small, it's likely in the header - adjust for safe area
      if (y < 50) {
        y = Math.max(insets.top, y + insets.top);
      }

      // Clamp x to valid range
      x = Math.max(0, Math.min(x, windowWidth - 200));

      console.log("Adjusted coordinates:", { original: triggerLayout, adjusted: { x, y } });

      // Update shared values with adjusted coordinates
      triggerX.value = x;
      triggerY.value = y;
      triggerHeight.value = height;

      const spaceBelow = windowHeight - (y + height);
      const spaceAbove = y;

      const MIN_SPACE_NEEDED = 200; // Minimum space needed to show menu

      // Only open upward if there's not enough space below AND more space above
      const shouldOpenUp = spaceBelow < MIN_SPACE_NEEDED && spaceAbove > spaceBelow;
      expandDirection.value = shouldOpenUp ? "up" : "down";
    }
  }, [
    triggerLayout,
    windowHeight,
    windowWidth,
    expandDirection,
    isOpen,
    triggerX,
    triggerY,
    triggerHeight,
    insets,
  ]);

  const handleContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      contentHeight.value = event.nativeEvent.layout.height;
    },
    [contentHeight]
  );

  // Animate open/close
  React.useEffect(() => {
    progress.value = withTiming(isOpen ? 1 : 0, {
      duration: 250,
    });
    // progress.value = withSpring(isOpen ? 1 : 0, {
    //   damping: 20,
    //   stiffness: 300,
    //   mass: 0.8,
    // });
  }, [isOpen, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    pointerEvents: progress.value > 0 ? "auto" : "none",
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => {
    // Use maxHeight instead of height to allow content to layout naturally
    // while still creating the expand/contract effect
    const maxHeight =
      contentHeight.value > 0
        ? interpolate(progress.value, [0, 1], [0, contentHeight.value], Extrapolation.CLAMP)
        : 1000; // Large value initially to allow measurement

    const opacity = interpolate(progress.value, [0, 0.2, 1], [0, 1, 1], Extrapolation.CLAMP);

    return {
      opacity,
      maxHeight,
      overflow: "hidden",
    };
  });

  const positionStyle = useAnimatedStyle(() => {
    // Use shared values for positioning
    const menuX = triggerX.value;
    const menuY = triggerY.value;
    const menuHeight = triggerHeight.value;

    if (expandDirection.value === "up") {
      // Calculate current animated maxHeight for upward expansion
      const currentMaxHeight =
        contentHeight.value > 0
          ? interpolate(progress.value, [0, 1], [0, contentHeight.value], Extrapolation.CLAMP)
          : 0;

      return {
        position: "absolute",
        left: menuX,
        top: menuY - 8, // 8px margin above trigger
        transform: [{ translateY: -currentMaxHeight }],
      };
    }
    return {
      position: "absolute",
      left: menuX,
      top: menuY + menuHeight + 8, // 8px margin below trigger
    };
  });

  // Render the visual elements - this will be portaled while keeping the component in context
  const renderMenuContent = () => {
    // We don't return null here so the exit animation can play
    // Visibility is controlled by opacity and pointerEvents in the animated styles

    return (
      <MenuContext.Provider value={menuContext}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle, styles.backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        {/* Menu Content - Outer container with animated height */}
        <Animated.View
          style={[positionStyle, contentAnimatedStyle]}
          className={`
            z-50 min-w-[200px] 
            bg-white dark:bg-gray-800 
            rounded-xl shadow-lg
            border border-gray-200 dark:border-gray-700
            ${className ?? ""}
          `}
        >
          {/* Inner container that we measure */}
          <View onLayout={handleContentLayout}>
            {items.map((item, index) => {
              if (item.key.startsWith("separator")) {
                return <MenuSeparator key={item.key} />;
              }
              return (
                <MenuItem key={item.key} item={item} index={index} totalItems={items.length} />
              );
            })}
          </View>
        </Animated.View>
      </MenuContext.Provider>
    );
  };

  // Portal the content to escape overflow boundaries while re-establishing context inside the portal
  return <Portal>{renderMenuContent()}</Portal>;
};

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 40,
  },
});
