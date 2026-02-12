// ---------------------------------------------------------------------------
// CallDoc Design System -- JavaScript/TypeScript constants
// Used by Recharts, wavesurfer.js, react-grid-layout, Framer Motion, etc.
// ---------------------------------------------------------------------------

/**
 * All 19 event type colors from the CallDoc timeline palette.
 * Designed for maximum distinguishability on dark backgrounds.
 */
export const EVENT_COLORS = {
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
} as const;

/** Categorical palette for chart series (bar, line, pie, area). */
export const CHART_COLORS = [
  "#6366F1", // indigo-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#F59E0B", // amber-500
  "#10B981", // emerald-500
  "#3B82F6", // blue-500
  "#EF4444", // red-500
  "#06B6D4", // cyan-500
] as const;

/** Semantic status colors for thresholds, alerts, and health indicators. */
export const STATUS_COLORS = {
  success: "#22C55E",
  successMuted: "#22C55E1A",
  warning: "#EAB308",
  warningMuted: "#EAB3081A",
  danger: "#EF4444",
  dangerMuted: "#EF44441A",
  info: "#3B82F6",
  infoMuted: "#3B82F61A",
} as const;

/** Theme-aware surface colors (dark theme values). */
export const SURFACES = {
  base: "#09090B",
  surface: "#18181B",
  elevated: "#27272A",
  overlay: "#3F3F46",
} as const;

/** Theme-aware text colors (dark theme values). */
export const TEXT_COLORS = {
  primary: "#FAFAFA",
  secondary: "#A1A1AA",
  tertiary: "#71717A",
  inverse: "#09090B",
} as const;

/** Brand accent colors. */
export const ACCENT_COLORS = {
  primary: "#6366F1",
  hover: "#818CF8",
  subtle: "rgba(99, 102, 241, 0.08)",
  ring: "rgba(99, 102, 241, 0.25)",
} as const;

/** react-grid-layout configuration for dashboard grids. */
export const GRID_CONFIG = {
  breakpoints: { xl: 1920, lg: 1280, md: 768, sm: 480 },
  cols: { xl: 12, lg: 12, md: 8, sm: 4 },
  rowHeight: 80,
  margin: [16, 16] as [number, number],
  containerPadding: [24, 24] as [number, number],
} as const;

/** Wallboard snap-to-grid increments. */
export const WALLBOARD_GRID = {
  snapOptions: [8, 16, 32, null] as const, // null = no snap
  defaultSnap: 8,
  minWidgetSize: { width: 120, height: 80 },
} as const;

/** Animation duration and easing tokens. */
export const ANIMATION = {
  durations: {
    instant: 0,
    fast: 100,
    normal: 200,
    smooth: 300,
    slow: 500,
    chart: 600,
    counter: 800,
  },
  easings: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    spring: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
} as const;

/** Responsive breakpoint values (matches tailwind.config.ts screens). */
export const BREAKPOINTS = {
  md: 768,
  lg: 1280,
  xl: 1920,
} as const;

/** Sidebar dimensions. */
export const SIDEBAR = {
  expandedWidth: 256,
  collapsedWidth: 64,
  transitionMs: 300,
} as const;

/** Top bar dimensions. */
export const TOP_BAR = {
  height: 56,
} as const;

/** Typography token map -- useful for programmatic Recharts axis styling. */
export const TYPOGRAPHY = {
  "display-lg": { size: 48, weight: 700, lineHeight: 1.1, letterSpacing: "-0.025em" },
  "display-md": { size: 36, weight: 700, lineHeight: 1.15, letterSpacing: "-0.02em" },
  "display-sm": { size: 28, weight: 600, lineHeight: 1.2, letterSpacing: "-0.015em" },
  "heading-xl": { size: 24, weight: 600, lineHeight: 1.25, letterSpacing: "-0.01em" },
  "heading-lg": { size: 20, weight: 600, lineHeight: 1.3, letterSpacing: "-0.01em" },
  "heading-md": { size: 16, weight: 600, lineHeight: 1.4, letterSpacing: "-0.005em" },
  "heading-sm": { size: 14, weight: 600, lineHeight: 1.4, letterSpacing: "0" },
  "body-lg": { size: 16, weight: 400, lineHeight: 1.5, letterSpacing: "0" },
  "body-md": { size: 14, weight: 400, lineHeight: 1.5, letterSpacing: "0" },
  "body-sm": { size: 13, weight: 400, lineHeight: 1.45, letterSpacing: "0" },
  caption: { size: 12, weight: 500, lineHeight: 1.4, letterSpacing: "0.01em" },
  overline: { size: 11, weight: 600, lineHeight: 1.4, letterSpacing: "0.06em" },
  "mono-lg": { size: 16, weight: 500, lineHeight: 1.5, letterSpacing: "0" },
  "mono-md": { size: 14, weight: 500, lineHeight: 1.5, letterSpacing: "0" },
  "mono-sm": { size: 12, weight: 500, lineHeight: 1.4, letterSpacing: "0" },
} as const;

/**
 * Helper: returns the Recharts-compatible tick style for chart axes.
 */
export function chartAxisStyle() {
  return {
    fontSize: TYPOGRAPHY["mono-sm"].size,
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
    fill: TEXT_COLORS.tertiary,
  };
}

/**
 * Helper: returns common Recharts tooltip style.
 */
export function chartTooltipStyle() {
  return {
    contentStyle: {
      backgroundColor: SURFACES.overlay,
      border: `1px solid ${SURFACES.overlay}`,
      borderRadius: 8,
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      padding: 12,
      fontSize: TYPOGRAPHY["body-sm"].size,
      color: TEXT_COLORS.primary,
    },
    itemStyle: {
      color: TEXT_COLORS.primary,
    },
    labelStyle: {
      color: TEXT_COLORS.secondary,
      marginBottom: 4,
    },
  };
}
