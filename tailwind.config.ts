import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Semantische tokens via CSS-variabelen (zie globals.css)
        canvas:     "rgb(var(--canvas) / <alpha-value>)",
        panel:      "rgb(var(--panel) / <alpha-value>)",
        pane:       "rgb(var(--pane) / <alpha-value>)",
        sunken:     "rgb(var(--sunken) / <alpha-value>)",
        elevated:   "rgb(var(--elevated) / <alpha-value>)",
        hover:      "rgb(var(--hover) / <alpha-value>)",
        line:       "rgb(var(--line) / <alpha-value>)",
        "line-strong": "rgb(var(--line-strong) / <alpha-value>)",
        fg:         "rgb(var(--fg) / <alpha-value>)",
        "fg-muted": "rgb(var(--fg-muted) / <alpha-value>)",
        "fg-dim":   "rgb(var(--fg-dim) / <alpha-value>)",
        "fg-faint": "rgb(var(--fg-faint) / <alpha-value>)",
        // Accent tokens
        brand:      "rgb(var(--brand) / <alpha-value>)",
        "brand-bg": "rgb(var(--brand-bg) / <alpha-value>)",
        // Mode-kleuren
        "mode-exam":      "rgb(var(--mode-exam) / <alpha-value>)",
        "mode-exam-bg":   "rgb(var(--mode-exam-bg) / <alpha-value>)",
        "mode-general":   "rgb(var(--mode-general) / <alpha-value>)",
        "mode-general-bg":"rgb(var(--mode-general-bg) / <alpha-value>)",
        // Status
        ok:         "rgb(var(--ok) / <alpha-value>)",
        warn:       "rgb(var(--warn) / <alpha-value>)",
        err:        "rgb(var(--err) / <alpha-value>)",
        // Difficulty
        "diff-easy":   "rgb(var(--diff-easy) / <alpha-value>)",
        "diff-medium": "rgb(var(--diff-medium) / <alpha-value>)",
        "diff-hard":   "rgb(var(--diff-hard) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto"],
        mono: ['"JetBrains Mono"', '"Cascadia Code"', "ui-monospace", "Consolas", "monospace"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
        lg: "6px",
      },
      fontSize: {
        "2xs": ["11px", "14px"],
      },
    },
  },
  plugins: [],
};
export default config;
