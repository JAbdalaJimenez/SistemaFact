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
        obsidian: {
          DEFAULT: "#0F172A", // Deep Obsidian - Superficies de poder
          hover: "#1E293B",
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#020617",
        },
        slateDark: {
          DEFAULT: "#1E293B", // Dark Slate - Bordes oscuros y texto alta jerarquía
          hover: "#0F172A",
        },
        gold: {
          DEFAULT: "#C5A059", // Champagne Warm Gold - Acento legal / sellos / importes
          warm: "#9A6E24",
          champagne: "#C5A059",
          50: "#FCFAF6",
          100: "#F7F3E9",
          200: "#EFE3C9",
          300: "#DFCAA0",
          400: "#D1B273",
          500: "#C5A059",
          600: "#AF863E",
          700: "#9A6E24",
          800: "#795418",
          900: "#573B0E",
        },
        primary: {
          DEFAULT: "#0F172A", // Deep Obsidian
          hover: "#1E293B",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#1E293B", // Dark Slate
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#C5A059", // Champagne Warm Gold
          warm: "#9A6E24",
          foreground: "#0F172A",
        },
        success: {
          DEFAULT: "#15803D", // Verde Esmeralda apagado
          foreground: "#FFFFFF",
          50: "#F0FDF4",
          100: "#DCFCE7",
          600: "#16A34A",
          700: "#15803D",
        },
        warning: {
          DEFAULT: "#B45309", // Ámbar cálido
          foreground: "#FFFFFF",
          50: "#FFFBEB",
          100: "#FEF3C7",
          600: "#D97706",
          700: "#B45309",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "Aptos", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        architectural: "0.12em",
        widest: "0.15em",
      },
    },
  },
  plugins: [],
};

export default config;
