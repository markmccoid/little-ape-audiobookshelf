const { hairlineWidth } = require("nativewind/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        // Single entry with weight mapping
        firacode: [
          "FiraCode-Regular",
          {
            fontWeight: {
              100: "FiraCode-Light", // font-firacode font-light
              200: "FiraCode-Light", // or font-firacode font-thin
              300: "FiraCode-Light", // font-firacode font-extralight
              400: "FiraCode-Regular", // font-firacode (default)
              500: "FiraCode-Medium", // font-firacode font-medium
              600: "FiraCode-SemiBold", // font-firacode font-semibold
              700: "FiraCode-Bold", // font-firacode font-bold
              800: "FiraCode-Bold", // font-firacode font-extrabold
              900: "FiraCode-Bold", // font-firacode font-black
            },
          },
        ],
      },
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
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
    },
  },
};
