import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          bg: "#0F172A",
          surface: "#1E293B",
          surface2: "#334155",
          border: "#475569",
        },

        accent: {
          DEFAULT: "#2563EB",
          dim: "#1D4ED8",
          glow: "#60A5FA",
          cyan: "#06B6D4",
        },

        status: {
          online: "#10B981",
          offline: "#EF4444",
          idle: "#F59E0B",
        },

        text: {
          primary: "#F8FAFC",
          muted: "#CBD5E1",
          faint: "#94A3B8",
        },
      },

      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },

      boxShadow: {
        glow: "0 0 20px rgba(6, 182, 212, 0.15)",
      },

      backgroundImage: {
        grid: `
          linear-gradient(rgba(6,182,212,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6,182,212,0.05) 1px, transparent 1px)
        `,
      },

      backgroundSize: {
        grid: "32px 32px",
      },
    },
  },
  plugins: [],
};

export default config;