import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./node_modules/streamdown/dist/index.js",
  ],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        background: "#020617",
        foreground: "#e2e8f0",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "sparkle": "sparkle 2.5s ease-in-out infinite",
        "pulse-subtle": "pulse-subtle 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s infinite",
        "gradient-shift": "gradient-shift 3s ease infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        sparkle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(0.98)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% center" },
          "50%": { backgroundPosition: "100% center" },
        },
      },
      typography: () => ({
        DEFAULT: {
          css: {
            table: {
              border: "none",
              borderWidth: "0",
            },
            thead: {
              borderBottom: "none",
              borderBottomWidth: "0",
            },
            "tbody tr": {
              borderBottom: "none",
              borderBottomWidth: "0",
            },
            th: {
              border: "none",
              borderWidth: "0",
            },
            td: {
              border: "none",
              borderWidth: "0",
            },
            pre: {
              border: "none",
              borderWidth: "0",
              outline: "none",
              outlineWidth: "0",
              boxShadow: "none",
              ring: "0",
            },
          },
        },
        invert: {
          css: {
            table: {
              border: "none",
              borderWidth: "0",
            },
            thead: {
              borderBottom: "none",
              borderBottomWidth: "0",
            },
            "tbody tr": {
              borderBottom: "none",
              borderBottomWidth: "0",
            },
            th: {
              border: "none",
              borderWidth: "0",
            },
            td: {
              border: "none",
              borderWidth: "0",
            },
            pre: {
              border: "none",
              borderWidth: "0",
              outline: "none",
              outlineWidth: "0",
              boxShadow: "none",
              ring: "0",
            },
          },
        },
      }),
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};

export default config;

