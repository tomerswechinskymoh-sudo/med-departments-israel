import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff8fb",
          100: "#d8eef6",
          200: "#b5dde9",
          300: "#87c4d6",
          400: "#55a4bf",
          500: "#2f8aa8",
          600: "#216c88",
          700: "#1f576e",
          800: "#1e485b",
          900: "#163543"
        },
        teal: {
          50: "#effcfb",
          100: "#cff9f5",
          200: "#9cf0e8",
          300: "#66e0d8",
          400: "#33c6bf",
          500: "#1daaa5",
          600: "#138884",
          700: "#126c6a",
          800: "#145655",
          900: "#154948"
        },
        ink: "#163043",
        surface: "#f6fbfd"
      },
      boxShadow: {
        panel: "0 24px 60px -32px rgba(22, 48, 67, 0.25)"
      },
      fontFamily: {
        sans: ["Rubik", "Heebo", "Assistant", "Segoe UI", "Arial", "sans-serif"]
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(29,170,165,0.14), transparent 32%), radial-gradient(circle at top right, rgba(47,138,168,0.12), transparent 28%)"
      }
    }
  },
  plugins: []
};

export default config;
