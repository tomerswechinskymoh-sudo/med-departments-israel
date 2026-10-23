import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f8ff",
          100: "#e0edf9",
          200: "#b3cfe2",
          300: "#84aecb",
          400: "#5b8eb0",
          500: "#3b7396",
          600: "#295b7a",
          700: "#0062df",
          800: "#074896",
          900: "#0c1b46",
        },
        teal: {
          50: "#ecfcf8",
          100: "#cdf7ee",
          200: "#9ef0df",
          300: "#63e2cc",
          400: "#2dcdb3",
          500: "#13b39a",
          600: "#0e8f7c",
          700: "#0e6c61",
          800: "#114f49",
          900: "#123f3d",
        },
        ink: "#0c1b46",
        surface: "#f7fbff",
      },
      boxShadow: {
        panel: "0 2px 8px rgba(16, 45, 80, 0.035)",
      },
      fontFamily: {
        sans: ["Heebo", "Arial", "sans-serif"],
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(19,179,154,0.14), transparent 32%), radial-gradient(circle at top right, rgba(59,115,150,0.16), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.18), transparent 48%)",
      },
    },
  },
  plugins: [],
};

export default config;
