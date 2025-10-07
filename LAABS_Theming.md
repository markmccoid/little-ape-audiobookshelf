# Little Ape Audiobookshelf (LAABS) Theming System

## Overview

The LAABS theming system provides a unified approach to handling light and dark modes across the application. It combines **NativeWind** (TailwindCSS for React Native) for declarative className-based styling with a **programmatic color access hook** for components that cannot use NativeWind classes (like navigation components or third-party libraries).

### Key Principles

1. **Single Source of Truth**: All color values are defined in one place (`src/global.css`)
2. **Automatic Theme Switching**: The system automatically responds to device color scheme preferences
3. **Dual Access Patterns**: Colors can be accessed via NativeWind classes OR programmatically via the `useThemeColors()` hook
4. **Consistency**: Both access patterns use the exact same color values

---

## Architecture Overview

```
Device Color Scheme (iOS/Android Settings)
    ↓
React Native useColorScheme() hook
    ↓
Root Layout (_layout.tsx) applies "dark" className
    ↓
┌─────────────────────────────────────────────────┐
│  NativeWind reads CSS variables from global.css │
│  and applies appropriate colors to classNames   │
└─────────────────────────────────────────────────┘
    ↓
Components can use:
  • className="text-foreground" (NativeWind)
  • OR useThemeColors().foreground (Programmatic)
```

---

## File Structure & Responsibilities

### 1. `src/app/_layout.tsx` - Theme Initialization

**Purpose**: Detects device color scheme and applies the `dark` className to the root View.

```typescript
import { useColorScheme } from "react-native";

export default function RootLayout() {
  const colorScheme = useColorScheme(); // "light" or "dark"
  
  return (
    <View style={{ flex: 1 }} className={colorScheme === "dark" ? "dark" : ""}>
      <ThemeProvider value={colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light}>
        {/* App content */}
      </ThemeProvider>
    </View>
  );
}
```

**Key Points**:
- Uses React Native's `useColorScheme()` to detect system theme
- Applies `dark` className to root View when dark mode is active
- Provides React Navigation theme via `ThemeProvider`

---

### 2. `src/global.css` - Color Definitions

**Purpose**: Single source of truth for all color values in both light and dark modes.

```css
@layer base {
  :root {
    /* Light mode colors */
    --background: #ffffff;
    --foreground: #09090b;
    --card: #f5f5f5;
    --muted: #737373;
    --border: #e4e4e7;
    --primary: #09090b;
    --accent: #41751C;
    --accent-foreground: #ffffff;
    --destructive: #ef4444;
    --success: #22c55e;
    --warning: #f97316;
  }

  .dark {
    /* Dark mode colors */
    --background: #09090b;
    --foreground: #fafafa;
    --card: #18181b;
    --muted: #a1a1aa;
    --border: #27272a;
    --primary: #fafafa;
    --accent: #84CC16;
    --accent-foreground: #09090b;
    --destructive: #f87171;
    --success: #4ade80;
    --warning: #fb923c;
  }
}
```

**Available Color Tokens**:

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|--------|
| `background` | White (#ffffff) | Near Black (#09090b) | Screen backgrounds |
| `foreground` | Near Black (#09090b) | White (#fafafa) | Primary text color |
| `card` | Light Gray (#f5f5f5) | Dark Gray (#18181b) | Card/panel backgrounds |
| `muted` | Gray (#737373) | Light Gray (#a1a1aa) | Secondary text, disabled states |
| `border` | Light Gray (#e4e4e7) | Dark Gray (#27272a) | Borders and dividers |
| `primary` | Near Black (#09090b) | White (#fafafa) | Primary brand color |
| `accent` | Green (#41751C) | Light Green (#84CC16) | Interactive elements, CTAs |
| `accent-foreground` | White (#ffffff) | Near Black (#09090b) | Text on accent backgrounds |
| `destructive` | Red (#ef4444) | Light Red (#f87171) | Errors, delete actions |
| `success` | Green (#22c55e) | Light Green (#4ade80) | Success states |
| `warning` | Orange (#f97316) | Light Orange (#fb923c) | Warnings, alerts |

---

### 3. `tailwind.config.js` - TailwindCSS Configuration

**Purpose**: Bridges CSS variables from `global.css` to TailwindCSS/NativeWind class names.

```javascript
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        muted: "var(--muted)",
        border: "var(--border)",
        primary: "var(--primary)",
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: "var(--destructive)",
        success: "var(--success)",
        warning: "var(--warning)",
      },
    },
  },
};
```

**Key Points**:
- Maps CSS variables to TailwindCSS color tokens
- Enables usage like `className="text-foreground"` or `className="bg-accent"`
- NativeWind automatically reads these during compilation

---

### 4. `src/utils/theme.ts` - Programmatic Color Access

**Purpose**: Provides a hook for accessing theme colors in JavaScript/TypeScript code.

```typescript
import { useColorScheme } from "react-native";

const THEME = {
  light: {
    background: "#FFF",
    foreground: "#09090B",
    card: "#ccc",
    muted: "#71717A",
    border: "#E4E4E7",
    primary: "#18181B",
    accent: "#41751C",
    accentForeground: "#FFFFFF",
    destructive: "#EF4444",
    success: "#10B981",
    warning: "#F59E0B",
  },
  dark: {
    background: "#09090B",
    foreground: "#FAFAFA",
    card: "#18181B",
    muted: "#A1A1AA",
    border: "#27272A",
    primary: "#FAFAFA",
    accent: "#84CC16",
    accentForeground: "#09090B",
    destructive: "#F87171",
    success: "#34D399",
    warning: "#FBBF24",
  },
};

export const useThemeColors = () => {
  const colorScheme = useColorScheme();
  return THEME[colorScheme];
};

export const NAV_THEME = {
  light: { ...DefaultTheme, colors: { /* mapped from THEME.light */ } },
  dark: { ...DarkTheme, colors: { /* mapped from THEME.dark */ } },
};
```

**Exports**:
- `useThemeColors()` - Hook to get current theme colors
- `NAV_THEME` - React Navigation theme configuration
- `THEME` - Raw theme object (rarely needed)

---

## Usage Patterns

### Pattern 1: Using NativeWind Classes (Preferred)

**When to use**: Standard React Native components (View, Text, Pressable, etc.)

```tsx
import { Text, View } from "react-native";

export default function MyComponent() {
  return (
    <View className="bg-background">
      <Text className="text-foreground text-lg font-bold">
        This text automatically changes color in dark mode
      </Text>
      <View className="border border-border rounded-lg p-4">
        <Text className="text-muted">Secondary text</Text>
      </View>
    </View>
  );
}
```

**Available Class Patterns**:
- Text colors: `text-foreground`, `text-muted`, `text-accent`, `text-destructive`, etc.
- Background colors: `bg-background`, `bg-card`, `bg-accent`, etc.
- Border colors: `border-border`, `border-accent`, etc.

**Advantages**:
- ✅ Declarative and clean
- ✅ No extra imports needed
- ✅ Automatically updates with theme changes
- ✅ Works with all TailwindCSS utilities

---

### Pattern 2: Using `useThemeColors()` Hook (Programmatic)

**When to use**: 
- Navigation components
- Third-party libraries that require color props
- Dynamic styling based on logic
- Icons and symbol components

```tsx
import { useThemeColors } from "@/src/utils/theme";
import { Icon } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  const colors = useThemeColors();
  
  return (
    <NativeTabs tintColor={colors.accent}>
      <NativeTabs.Trigger name="home">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

**Another Example** (Custom Component):
```tsx
import { useThemeColors } from "@/src/utils/theme";
import { View } from "react-native";

export default function CustomButton({ onPress, children }) {
  const colors = useThemeColors();
  
  return (
    <View 
      style={{ 
        backgroundColor: colors.accent,
        borderColor: colors.border 
      }}
    >
      {children}
    </View>
  );
}
```

**Advantages**:
- ✅ Works with any component or library
- ✅ Can be used in inline styles
- ✅ Good for conditional logic
- ✅ Necessary for non-React-Native components

---

### Pattern 3: React Navigation Theme

**When to use**: Configuring React Navigation appearance

```tsx
import { NAV_THEME } from "@/src/utils/theme";
import { ThemeProvider } from "@react-navigation/native";
import { useColorScheme } from "react-native";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <ThemeProvider value={colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light}>
      {/* Navigation screens */}
    </ThemeProvider>
  );
}
```

**What it affects**:
- Navigation header backgrounds
- Header text colors
- Card backgrounds
- Screen backgrounds
- Border colors

---

## Common Use Cases

### 1. Styling Text

```tsx
// Primary text
<Text className="text-foreground text-base">Main content</Text>

// Secondary/muted text
<Text className="text-muted text-sm">Helper text</Text>

// Accent text (links, highlights)
<Text className="text-accent font-semibold">Click here</Text>

// Status text
<Text className="text-destructive">Error message</Text>
<Text className="text-success">Success!</Text>
<Text className="text-warning">Warning</Text>
```

---

### 2. Background Colors

```tsx
// Screen background
<View className="flex-1 bg-background">

// Card/panel background
<View className="bg-card rounded-lg p-4">

// Accent button background
<Pressable className="bg-accent rounded-md px-4 py-2">
  <Text className="text-accent-foreground">Submit</Text>
</Pressable>

// Destructive button
<Pressable className="bg-destructive rounded-md px-4 py-2">
  <Text className="text-white">Delete</Text>
</Pressable>
```

---

### 3. Borders

```tsx
// Standard border
<View className="border border-border rounded-lg">

// Accent border
<View className="border-2 border-accent rounded-lg">

// Top border only
<View className="border-t border-border">
```

---

### 4. Tab Navigation

```tsx
import { useThemeColors } from "@/src/utils/theme";

export default function TabLayout() {
  const colors = useThemeColors();
  
  return (
    <NativeTabs tintColor={colors.accent}>
      {/* Active tabs will use accent color */}
      {/* Inactive tabs will use default/muted color */}
    </NativeTabs>
  );
}
```

---

### 5. Icons & Symbols

```tsx
import { useThemeColors } from "@/src/utils/theme";
import { SymbolView } from "expo-symbols";

export default function IconButton() {
  const colors = useThemeColors();
  
  return (
    <SymbolView 
      name="heart.fill" 
      tintColor={colors.accent}
    />
  );
}
```

---

## Adding or Modifying Colors

### To Add a New Color Token:

1. **Update `src/global.css`**:
```css
:root {
  --my-new-color: #123456;
}

.dark {
  --my-new-color: #654321;
}
```

2. **Update `tailwind.config.js`**:
```javascript
colors: {
  // ... existing colors
  myNewColor: "var(--my-new-color)",
}
```

3. **Update `src/utils/theme.ts`**:
```typescript
const THEME = {
  light: {
    // ... existing colors
    myNewColor: "#123456",
  },
  dark: {
    // ... existing colors
    myNewColor: "#654321",
  },
};
```

4. **Use in components**:
```tsx
// With NativeWind
<Text className="text-myNewColor">Styled text</Text>

// With hook
const colors = useThemeColors();
<View style={{ backgroundColor: colors.myNewColor }} />
```

---

### To Modify an Existing Color:

1. **Update `src/global.css`** - Change the hex value
2. **Update `src/utils/theme.ts`** - Change the hex value to match
3. **Restart development server**: `npx expo start -c`

**Important**: Both files must have matching values for consistency.

---

## Color Synchronization

⚠️ **CRITICAL**: The color values in `global.css` and `theme.ts` MUST match exactly!

| File | Purpose | Format |
|------|---------|--------|
| `global.css` | NativeWind className colors | CSS hex (`#ffffff`) |
| `theme.ts` | Programmatic hook colors | JS hex (`"#FFFFFF"`) |

**Why synchronization matters**:
- Components using `className` will use `global.css` values
- Components using `useThemeColors()` will use `theme.ts` values
- If they differ, your app will have inconsistent colors!

**Verification Checklist** (after making color changes):
- [ ] Updated `global.css` `:root` section
- [ ] Updated `global.css` `.dark` section
- [ ] Updated `theme.ts` `THEME.light` object
- [ ] Updated `theme.ts` `THEME.dark` object
- [ ] Restarted development server with `-c` flag
- [ ] Tested both light and dark modes

---

## Testing Dark Mode

### On iOS Simulator:
1. Settings → Developer → Dark Appearance
2. Or: Device Settings → Display & Brightness → Appearance

### On Android Emulator:
1. Settings → Display → Dark theme

### Programmatically (for testing):
```tsx
import { Appearance } from "react-native";

// Force light mode
Appearance.setColorScheme("light");

// Force dark mode
Appearance.setColorScheme("dark");

// Reset to system default
Appearance.setColorScheme(null);
```

---

## Troubleshooting

### Issue: Colors not updating in dark mode

**Solutions**:
1. Ensure root View in `_layout.tsx` has `className={colorScheme === "dark" ? "dark" : ""}`
2. Restart dev server with cache clear: `npx expo start -c`
3. Verify CSS selector is `.dark` (not `.dark:root`)
4. Check that `global.css` is imported in `_layout.tsx`

---

### Issue: NativeWind classes not working

**Solutions**:
1. Verify `tailwind.config.js` has correct content paths
2. Check that component files are in `./src/**/*.{js,jsx,ts,tsx}`
3. Restart Metro bundler
4. Ensure NativeWind is properly installed

---

### Issue: Hook colors don't match className colors

**Solution**:
- Verify color values match exactly between `global.css` and `theme.ts`
- Use hex colors consistently (case doesn't matter: `#FFF` === `#fff`)

---

## Best Practices

### ✅ DO:

- Use NativeWind classes for standard React Native components
- Use `useThemeColors()` for navigation, icons, and third-party libraries
- Keep color values synchronized between `global.css` and `theme.ts`
- Test both light and dark modes after making changes
- Use semantic color names (`accent`, `destructive`) not color names (`green`, `red`)

### ❌ DON'T:

- Don't hardcode colors directly (e.g., `style={{ color: "#FF0000" }}`)
- Don't mix color systems (pick NativeWind OR inline styles, not both)
- Don't forget to restart server after modifying config files
- Don't use web-only TailwindCSS classes (like `hover:`)
- Don't modify `NAV_THEME` color values directly (update `THEME` instead)

---

## Examples from the Codebase

### Example 1: NativeWind Classes (Home Screen)
```tsx
// src/screens/Home/HomeContainer.tsx
<Text className="text-lg font-bold text-foreground">
  Continue Listening
</Text>
```

### Example 2: useThemeColors Hook (Tab Navigation)
```tsx
// src/app/(tabs)/_layout.tsx
const colors = useThemeColors();

<NativeTabs tintColor={colors.accent}>
  <NativeTabs.Trigger name="(home)">
    <Icon sf={{ default: "house", selected: "house.fill" }} />
  </NativeTabs.Trigger>
</NativeTabs>
```

### Example 3: Mixed Approach (MiniPlayer)
```tsx
// src/components/MiniPlayer.tsx
<Pressable className="mx-2 px-3 py-2 bg-slate-400 border-t border-slate-700">
  <Text className="text-slate-100 font-semibold">
    {session?.displayTitle}
  </Text>
  <Text className="text-slate-300 text-xs">
    {session?.displayAuthor}
  </Text>
</Pressable>
```

---

## Migration Guide

### Converting Hardcoded Colors to Theme Colors

**Before**:
```tsx
<Text style={{ color: "#000000" }}>Hello</Text>
<View style={{ backgroundColor: "#FFFFFF" }} />
```

**After (NativeWind)**:
```tsx
<Text className="text-foreground">Hello</Text>
<View className="bg-background" />
```

**After (Hook)**:
```tsx
const colors = useThemeColors();
<Text style={{ color: colors.foreground }}>Hello</Text>
<View style={{ backgroundColor: colors.background }} />
```

---

## Quick Reference

### Common Color Combinations

**Primary Text on Background**:
```tsx
<View className="bg-background">
  <Text className="text-foreground">Primary text</Text>
</View>
```

**Secondary Text on Card**:
```tsx
<View className="bg-card">
  <Text className="text-muted">Secondary text</Text>
</View>
```

**Accent Button**:
```tsx
<Pressable className="bg-accent">
  <Text className="text-accent-foreground">Button</Text>
</Pressable>
```

**Destructive Action**:
```tsx
<Pressable className="bg-destructive">
  <Text className="text-white">Delete</Text>
</Pressable>
```

---

## Summary

The LAABS theming system provides two complementary ways to access colors:

1. **NativeWind Classes** - Use for React Native components with `className` prop
2. **useThemeColors() Hook** - Use for programmatic access (navigation, icons, third-party libs)

Both methods share the same color values defined in `global.css`, ensuring consistency across the entire application. The system automatically responds to device color scheme changes, providing a seamless light/dark mode experience.

For any questions or issues, refer to this document or check the relevant source files mentioned in each section.
