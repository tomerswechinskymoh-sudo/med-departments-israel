import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#edf5fa",
          100: "#d7e8f2",
          200: "#b3cfe2",
          300: "#84aecb",
          400: "#5b8eb0",
          500: "#3b7396",
          600: "#295b7a",
          700: "#1b4460",
          800: "#112f45",
          900: "#091c2d"
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
          900: "#123f3d"
        },
        ink: "#10273a",
        surface: "#f4f7fb"
      },
      boxShadow: {
        panel:
          "0 30px 80px -38px rgba(9, 28, 45, 0.38), 0 18px 34px -28px rgba(27, 68, 96, 0.28)"
      },
      fontFamily: {
        sans: ["Rubik", "Heebo", "Assistant", "Segoe UI", "Arial", "sans-serif"]
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(19,179,154,0.14), transparent 32%), radial-gradient(circle at top right, rgba(59,115,150,0.16), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.18), transparent 48%)"
      }
    }
  },
  plugins: []
};

export default config;
