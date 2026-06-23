/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d7fe",
          300: "#a5b8fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        surface: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          850: "#1c1c1f",
          900: "#18181b",
          950: "#09090b",
        },
        danger: {
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          900: "#7f1d1d",
        },
        success: {
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
        },
        warning: {
          400: "#fbbf24",
          500: "#f59e0b",
        },
      },

      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Cascadia Code",
          "monospace",
        ],
      },

      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.5rem" }],
        lg: ["1rem", { lineHeight: "1.5rem" }],
        xl: ["1.125rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.25rem", { lineHeight: "1.75rem" }],
        "3xl": ["1.5rem", { lineHeight: "2rem" }],
        "4xl": ["2rem", { lineHeight: "2.25rem" }],
      },

      spacing: {
        0.5: "0.125rem",
        1.5: "0.375rem",
        2.5: "0.625rem",
        3.5: "0.875rem",
        4.5: "1.125rem",
        5.5: "1.375rem",
        sidebar: "240px",
        "sidebar-collapsed": "64px",
      },

      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },

      boxShadow: {
        "glow-brand": "0 0 20px rgba(99, 102, 241, 0.15)",
        "glow-success": "0 0 12px rgba(34, 197, 94, 0.2)",
        "glow-danger": "0 0 12px rgba(239, 68, 68, 0.2)",
        "inner-sm": "inset 0 1px 2px rgba(0,0,0,0.25)",
        elevated: "0 4px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)",
        overlay: "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
      },

      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "fade-out": "fadeOut 0.15s ease-in",
        "slide-up": "slideUp 0.25s cubic-bezier(0.16,1,0.3,1)",
        "slide-down": "slideDown 0.25s cubic-bezier(0.16,1,0.3,1)",
        "slide-in-left": "slideInLeft 0.3s cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)",
        "pulse-dot": "pulseDot 2s cubic-bezier(0.4,0,0.6,1) infinite",
        "typing": "typing 1.2s steps(3,end) infinite",
        "spin-slow": "spin 3s linear infinite",
        shimmer: "shimmer 1.5s infinite",
        "bounce-in": "bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.85)" },
        },
        typing: {
          "0%": { content: "''" },
          "33%": { content: "'.'" },
          "66%": { content: "'..'" },
          "100%": { content: "'...'" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        bounceIn: {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },

      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      transitionDuration: {
        250: "250ms",
        350: "350ms",
        400: "400ms",
      },

      backdropBlur: {
        xs: "2px",
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },

      zIndex: {
        dropdown: "100",
        sticky: "200",
        overlay: "300",
        modal: "400",
        toast: "500",
        tooltip: "600",
      },

      screens: {
        xs: "480px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px",
      },
    },
  },
  plugins: [],
};
