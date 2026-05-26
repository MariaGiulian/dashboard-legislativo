import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Câmara Federal — azul ───────────────────────────────────────────
        federal: {
          DEFAULT: "#3b82f6",
          light:   "#bfdbfe",
          dark:    "#1d4ed8",
          bg:      "#eff6ff",
          text:    "#1e40af",
        },
        // ── Câmara Municipal POA — verde (paleta clara) ─────────────────────
        poa: {
          DEFAULT: "#22c55e",
          light:   "#bbf7d0",
          dark:    "#15803d",
          bg:      "#f0fdf4",
          text:    "#166534",
        },
      },
      fontFamily: {
        // Carregada via @import no theme.css
        sans: ["var(--font-base)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.625rem",
        lg: "0.875rem",
        xl: "1.25rem",
      },
      boxShadow: {
        green: "0 4px 14px -2px rgb(34 197 94 / 0.25)",
        blue:  "0 4px 14px -2px rgb(59 130 246 / 0.25)",
      },
      animation: {
        "fade-in":  "fadeIn 0.25s ease-out forwards",
        "slide-in": "slideIn 0.2s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
