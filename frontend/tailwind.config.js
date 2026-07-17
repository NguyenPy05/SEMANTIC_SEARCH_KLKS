/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        border: "var(--color-border)",
        "border-bright": "var(--color-border-bright)",
        accent: "var(--color-accent)",
        "accent-2": "var(--color-accent-2)",
        "accent-3": "var(--color-accent-3)",
        "text-muted": "var(--color-text-muted)",
        text: "var(--color-text)",
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(56,189,248,0.35), 0 10px 30px rgba(56,189,248,0.16)",
        "neon-sm": "0 0 0 1px rgba(56,189,248,0.2), 0 4px 15px rgba(56,189,248,0.08)",
        "neon-lg": "0 0 60px rgba(56,189,248,0.25)",
      },
      fontFamily: {
        display: ["Inter", "Segoe UI", "sans-serif"],
        body: ["Inter", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      keyframes: {
        floatIn: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(56,189,248,0.15)" },
          "50%": { boxShadow: "0 0 30px rgba(56,189,248,0.35)" },
        },
      },
      animation: {
        floatIn: "floatIn 600ms ease-out forwards",
        shimmer: "shimmer 2s ease infinite",
        gradientShift: "gradientShift 4s ease infinite",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
