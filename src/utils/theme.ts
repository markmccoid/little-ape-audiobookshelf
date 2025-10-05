import { DarkTheme, DefaultTheme, Theme } from "@react-navigation/native";
import { useColorScheme } from "react-native";

// Base color palette
const THEME = {
  light: {
    // Backgrounds
    background: "#FFF",
    card: "#ccc",

    // Foreground colors
    foreground: "#09090B",
    muted: "#71717A",

    // Border colors
    border: "#E4E4E7",

    // Primary brand color
    primary: "#18181B",

    // Accent color for interactive elements
    accent: "#41751C", // green accent
    accentForeground: "#FFFFFF",

    // Status colors
    destructive: "#EF4444",
    success: "#10B981",
    warning: "#F59E0B",
  },
  dark: {
    // Backgrounds
    background: "#09090B",
    card: "#18181B",

    // Foreground colors
    foreground: "#FAFAFA",
    muted: "#A1A1AA",

    // Border colors
    border: "#27272A",

    // Primary brand color
    primary: "#FAFAFA",

    // Accent color for interactive elements
    accent: "#84CC16", // Lighter green for dark mode
    accentForeground: "#09090B",

    // Status colors
    destructive: "#F87171",
    success: "#34D399",
    warning: "#FBBF24",
  },
} as const;

// React Navigation theme structure
export const NAV_THEME: Record<"light" | "dark", Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};

// Export the full theme for use in components
export { THEME };

// Helper hook for accessing theme colors in components
export const useThemeColors = () => {
  const colorScheme = useColorScheme();
  return THEME[colorScheme];
};

/* 
USAGE RECOMMENDATIONS:

1. TAB BAR ICONS:
   Use THEME[colorScheme].accent for active tabs
   Use THEME[colorScheme].muted for inactive tabs

   Example:
   <Tab.Screen
     options={{
       tabBarIcon: ({ focused }) => (
         <Icon 
           color={focused ? THEME[colorScheme].accent : THEME[colorScheme].muted}
         />
       ),
     }}
   />

2. TAB BAR LABELS:
   Use THEME[colorScheme].accent for active labels
   Use THEME[colorScheme].foreground for inactive labels

   Example:
   tabBarActiveTintColor: THEME[colorScheme].accent,
   tabBarInactiveTintColor: THEME[colorScheme].muted,

3. BUTTONS & CALL-TO-ACTIONS:
   Background: THEME[colorScheme].accent
   Text: THEME[colorScheme].accentForeground

4. LINKS & INTERACTIVE TEXT:
   Color: THEME[colorScheme].accent

5. BADGES & HIGHLIGHTS:
   Background: THEME[colorScheme].accent with opacity (e.g., rgba)
   Text: THEME[colorScheme].accent

6. EXAMPLE TAB NAVIGATOR CONFIGURATION:
   <Tab.Navigator
     screenOptions={{
       tabBarActiveTintColor: THEME[colorScheme].accent,
       tabBarInactiveTintColor: THEME[colorScheme].muted,
       tabBarStyle: {
         backgroundColor: THEME[colorScheme].card,
         borderTopColor: THEME[colorScheme].border,
       },
     }}
   >
*/
