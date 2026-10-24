import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        oxford: {
          DEFAULT: "#0B132B", // Oxford Blue - Corporate Authority
          hover: "#1C2541",
          900: "#0B132B",
          800: "#1C2541",
          700: "#3A506B",
        },
        obsidian: {
          DEFAULT: "#0B132B",
          hover: "#1C2541",
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0B132B",
        },
        primary: {
          DEFAULT: "#0B132B", // Oxford Blue
          hover: "#1C2541",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#475569", // Slate 600
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#C5A059", // Champagne Legal Gold
          warm: "#9A6E24",
          foreground: "#0B132B",
        },
        success: {
          DEFAULT: "#166534", // Desaturated Success Dark Green
          foreground: "#FFFFFF",
          50: "#F0FDF4",
          100: "#DCFCE7",
          600: "#16A34A",
          700: "#166534",
        },
        warning: {
          DEFAULT: "#B45309", // Desaturated Amber
          foreground: "#FFFFFF",
          50: "#FFFBEB",
          100: "#FEF3C7",
          600: "#D97706",
          700: "#B45309",
        },
        destructive: {
          DEFAULT: "#991B1B",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#475569",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0B132B",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["'Inter'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        architectural: "0.08em",
        widest: "0.12em",
      },
    },
  },
  plugins: [],
};

export default config;
