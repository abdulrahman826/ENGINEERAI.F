import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16548C",
          dark: "#0F3D61",
          tint: "#E9F1F8",
          foreground: "#FFFFFF",
        },
        background: "#F4F6F8",
        surface: "#FFFFFF",
        border: "#D8DEE4",
        "text-primary": "#1A202C",
        "text-secondary": "#5A6572",
        success: {
          DEFAULT: "#1E7B44",
          tint: "#E6F4EC",
          dark: "#14532D",
        },
        warning: {
          DEFAULT: "#B45309",
          tint: "#FEF3C7",
          dark: "#7C3A03",
        },
        destructive: {
          DEFAULT: "#B3261E",
          tint: "#FDECEA",
          dark: "#7F1D1D",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "16px",
        button: "14px",
        input: "12px",
        chip: "9999px",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
