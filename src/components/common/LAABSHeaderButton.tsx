import { SymbolView, SymbolViewProps } from "expo-symbols";
import React from "react";
import { TouchableOpacity, TouchableOpacityProps, ViewStyle } from "react-native";

// Base props for the HeaderButton
interface BaseHeaderButtonProps extends Omit<TouchableOpacityProps, "children"> {
  /** Additional styles for the button container */
  containerStyle?: ViewStyle;
  /** Size of the button - affects padding and dimensions */
  size?: "small" | "medium" | "large";
  /** Variant styling */
  variant?: "default" | "outlined" | "filled";
}

// Props when using SymbolView as a child
interface HeaderButtonWithSymbolProps extends BaseHeaderButtonProps {
  children: React.ReactElement<SymbolViewProps>;
}

// Props when using custom children
interface HeaderButtonWithCustomChildrenProps extends BaseHeaderButtonProps {
  children: React.ReactNode;
}

// Union type for all possible props
export type HeaderButtonProps = HeaderButtonWithSymbolProps | HeaderButtonWithCustomChildrenProps;

// Size configurations
const sizeConfig = {
  small: {
    container: {
      width: 32,
      height: 32,
      padding: 6,
    },
  },
  medium: {
    container: {
      width: 40,
      height: 38,
      // padding: 8,
    },
  },
  large: {
    container: {
      width: 48,
      height: 48,
      padding: 10,
    },
  },
};

// Variant configurations
const variantConfig = {
  default: {
    container: {
      backgroundColor: "transparent",
      borderWidth: 0,
    },
  },
  outlined: {
    container: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "#007AFF",
      borderRadius: 8,
    },
  },
  filled: {
    container: {
      backgroundColor: "#007AFF",
      borderRadius: 8,
    },
  },
};

/**
 * HeaderButton component that can accept SymbolView or custom children
 * Provides consistent styling and behavior for header buttons
 *
 * @example
 * // With SymbolView
 * <HeaderButton onPress={() => console.log('pressed')}>
 *   <SymbolView name="brain.fill" size={20} />
 * </HeaderButton>
 *
 * @example
 * // With custom content
 * <HeaderButton onPress={() => console.log('pressed')} size="large">
 *   <Text>Custom</Text>
 * </HeaderButton>
 */
export const HeaderButton: React.FC<HeaderButtonProps> = ({
  children,
  containerStyle,
  style,
  ...touchableProps
}) => {
  // Get size and variant styles

  // Combine all container styles
  const combinedContainerStyle: ViewStyle = {
    // Custom container styles
    ...containerStyle,
    // TouchableOpacity style prop
    ...(style as ViewStyle),
  };

  return (
    <TouchableOpacity
      style={combinedContainerStyle}
      {...touchableProps}
      className="w-11 h-10 rounded-full flex-row justify-center items-center "
    >
      {children}
    </TouchableOpacity>
  );
};

// Type guard to check if children is a SymbolView
export const isSymbolViewChild = (
  children: React.ReactNode
): children is React.ReactElement<SymbolViewProps> => {
  return (
    React.isValidElement(children) &&
    typeof children.type === "object" &&
    children.type === SymbolView
  );
};

// Default export
export default HeaderButton;
