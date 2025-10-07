import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";

interface LAABTextProps extends TextProps {
  className?: string;
}

/**
 * LAABText - A custom Text component with default styling
 *
 * Default className: "text-foreground"
 *
 * Usage:
 * ```tsx
 * // Basic usage with defaults
 * <LAABText>Hello World</LAABText>
 *
 * // Override className
 * <LAABText className="text-accent text-lg">Accent Text</LAABText>
 *
 * // Merge className with defaults
 * <LAABText className="font-bold text-xl">Bold Large Text</LAABText>
 *
 * // Add custom styles (merged with defaults)
 * <LAABText style={{ letterSpacing: 2 }}>Spaced Text</LAABText>
 *
 * // All Text props are supported
 * <LAABText numberOfLines={2} ellipsizeMode="tail">Long text...</LAABText>
 * ```
 */
export default function LAABText({ className = "", style, children, ...rest }: LAABTextProps) {
  // Default className - will be overridden if className prop contains text-* color class
  const defaultClassName = "text-accent";

  // Merge classNames: defaults + passed className
  // If passed className contains a text color class (text-*), it will take precedence
  const mergedClassName = className ? `${defaultClassName} ${className}` : defaultClassName;

  // Merge styles: default styles are applied first, then passed styles override
  const mergedStyle = style ? [styles.default, style] : styles.default;

  return (
    <Text className={mergedClassName} style={mergedStyle} {...rest}>
      {children}
    </Text>
  );
}

// Default styles that can be overridden by passed style prop
const styles = StyleSheet.create({
  default: {
    // Add any default styles here
    // fontSize: 14,
    // These will be overridden by passed style prop
  },
});
