import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      md: "768px",
      lg: "1280px",
      xl: "1920px",
    },
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "SF Mono",
          "Consolas",
          "monospace",
        ],
      },

      fontSize: {
        // Display sizes -- hero numbers, KPIs
        "display-lg": [
          "48px",
          { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "700" },
        ],
        "display-md": [
          "36px",
          { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "display-sm": [
          "28px",
          { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "600" },
        ],

        // Headings
        "heading-xl": [
          "24px",
          { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "heading-lg": [
          "20px",
          { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "heading-md": [
          "16px",
          { lineHeight: "1.4", letterSpacing: "-0.005em", fontWeight: "600" },
        ],
        "heading-sm": [
          "14px",
          { lineHeight: "1.4", fontWeight: "600" },
        ],

        // Body text
        "body-lg": [
          "16px",
          { lineHeight: "1.5", fontWeight: "400" },
        ],
        "body-md": [
          "14px",
          { lineHeight: "1.5", fontWeight: "400" },
        ],
        "body-sm": [
          "13px",
          { lineHeight: "1.45", fontWeight: "400" },
        ],

        // Small utility text
        caption: [
          "12px",
          { lineHeight: "1.4", letterSpacing: "0.01em", fontWeight: "500" },
        ],
        overline: [
          "11px",
          { lineHeight: "1.4", letterSpacing: "0.06em", fontWeight: "600" },
        ],

        // Monospace variants (data displays, durations, timestamps)
        "mono-lg": [
          "16px",
          { lineHeight: "1.5", fontWeight: "500" },
        ],
        "mono-md": [
          "14px",
          { lineHeight: "1.5", fontWeight: "500" },
        ],
        "mono-sm": [
          "12px",
          { lineHeight: "1.4", fontWeight: "500" },
        ],
      },

      colors: {
        // ---------- Theme-aware surfaces (CSS variable backed) ----------
        surface: {
          base: "var(--bg-base)",
          card: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
          overlay: "var(--bg-overlay)",
        },

        // shadcn/ui compatibility aliases (HSL via CSS vars)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        accent: {
          DEFAULT: "var(--accent-primary)",
          hover: "var(--accent-hover)",
          subtle: "var(--accent-subtle)",
          ring: "var(--accent-ring)",
        },
        ring: "hsl(var(--ring))",
        input: "hsl(var(--input))",

        // ---------- Theme-aware borders ----------
        border: {
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
          focus: "var(--border-focus)",
        },

        // ---------- Theme-aware text ----------
        content: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          inverse: "var(--text-inverse)",
        },

        // ---------- Semantic status ----------
        status: {
          success: "#22C55E",
          "success-muted": "#22C55E1A",
          warning: "#EAB308",
          "warning-muted": "#EAB3081A",
          danger: "#EF4444",
          "danger-muted": "#EF44441A",
          info: "#3B82F6",
          "info-muted": "#3B82F61A",
        },

        // ---------- Event colors (timeline bars, agent states) ----------
        event: {
          idle: "#4ADE80",
          ringing: "#FBBF24",
          talking: "#3B82F6",
          hold: "#EF4444",
          park: "#D97706",
          queue: "#F97316",
          transfer: "#38BDF8",
          "transfer-hold": "#FB7185",
          dialing: "#2DD4BF",
          conference: "#818CF8",
          voicemail: "#A78BFA",
          "auto-attendant": "#94A3B8",
          overflow: "#6B7280",
          dnd: "#DC2626",
          acw: "#8B5CF6",
          listen: "#06B6D4",
          "calling-drop": "#F87171",
          "receiving-drop": "#FB923C",
          busy: "#52525B",
        },

        // ---------- Chart series (categorical palette) ----------
        chart: {
          1: "#6366F1",
          2: "#8B5CF6",
          3: "#EC4899",
          4: "#F59E0B",
          5: "#10B981",
          6: "#3B82F6",
          7: "#EF4444",
          8: "#06B6D4",
        },
      },

      spacing: {
        // Custom spacing tokens beyond the default 4px scale
        "0.5": "2px",
        "1": "4px",
        "1.5": "6px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
        "64": "256px",
      },

      borderRadius: {
        none: "0px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        full: "9999px",
      },

      boxShadow: {
        none: "none",
        sm: "0 1px 2px rgba(0,0,0,0.3)",
        md: "0 4px 12px rgba(0,0,0,0.4)",
        lg: "0 8px 24px rgba(0,0,0,0.5)",
        xl: "0 16px 48px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px var(--accent-primary), 0 0 16px var(--accent-ring)",
      },

      transitionDuration: {
        instant: "0ms",
        fast: "100ms",
        normal: "200ms",
        smooth: "300ms",
        slow: "500ms",
        chart: "600ms",
        counter: "800ms",
      },

      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-right-out": {
          "0%": { opacity: "1", transform: "translateX(0)" },
          "100%": { opacity: "0", transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 var(--accent-ring)" },
          "70%": { boxShadow: "0 0 0 6px transparent" },
          "100%": { boxShadow: "0 0 0 0 transparent" },
        },
        counter: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulse: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },

      animation: {
        shimmer: "shimmer 1.5s infinite linear",
        "fade-in": "fadeIn 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-up": "slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-down": "slideDown 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-out": "slide-right-out 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        counter: "counter 800ms cubic-bezier(0.16, 1, 0.3, 1)",
        pulse: "pulse 3s infinite ease-in-out",
        "pulse-fast": "pulse 1.5s infinite ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
