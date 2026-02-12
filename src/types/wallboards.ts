// ─── Wallboard Domain Types ─────────────────────────────────────────────────
// Source: COMPONENT_ARCHITECTURE.md Section 7, VALIDATION_API_CONTRACTS.md Section 6.3

/**
 * Widget types available in the wallboard editor.
 * 14 original types from CA + 'box', 'ellipse' (UX:3.5.13 decorative),
 * and 'clock' (PR:T3.4) = 17 total.
 */
export type WidgetType =
  | 'active-calls'
  | 'agent-box'
  | 'gauge'
  | 'chart'
  | 'group-box'
  | 'title-value'
  | 'leaderboard'
  | 'pie-chart'
  | 'marquee'
  | 'image'
  | 'web-page'
  | 'text'
  | 'line'
  | 'widget-group'
  | 'box'
  | 'ellipse'
  | 'clock';

/**
 * Wallboard theme options.
 */
export type WallboardTheme = 'dark' | 'light' | 'custom';

/**
 * Threshold comparison operators for widget color rules.
 */
export type ThresholdOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

/**
 * Chart sub-type for chart widgets.
 */
export type WidgetChartType = 'bar' | 'line' | 'area';

/**
 * A complete wallboard configuration including layout and widgets.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface WallboardConfig {
  /** Unique wallboard identifier */
  id: string;
  /** Wallboard name */
  name: string;
  /** ID of the user who created the wallboard */
  createdBy: string;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Visual theme */
  theme: WallboardTheme;
  /** Display resolution */
  resolution: { width: number; height: number };
  /** Auto-refresh interval in seconds */
  refreshInterval: number;
  /** Widgets placed on the wallboard */
  widgets: Widget[];
  /** Layout positions per responsive breakpoint (e.g., 'lg', 'md', 'sm') */
  layouts: Record<string, LayoutItem[]>;
}

/**
 * A single widget instance on a wallboard.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface Widget {
  /** Unique widget identifier */
  id: string;
  /** Widget type */
  type: WidgetType;
  /** Display title */
  title: string;
  /** Type-specific configuration */
  config: WidgetConfig;
  /** Color threshold rules */
  thresholds: ThresholdRule[];
}

/**
 * Widget-specific configuration.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface WidgetConfig {
  /** Metric identifier to display */
  metric?: string;
  /** Filter to specific hunt groups */
  groups?: string[];
  /** Filter to specific agents */
  agents?: string[];
  /** Override wallboard refresh interval (seconds) */
  refreshInterval?: number;
  /** Font size in pixels */
  fontSize?: number;
  /** Background color (CSS color string) */
  backgroundColor?: string;
  /** Foreground/text color (CSS color string) */
  foregroundColor?: string;
  /** Border color (CSS color string) */
  borderColor?: string;
  /** Chart sub-type for chart widgets */
  chartType?: WidgetChartType;
  /** Maximum items to display (for leaderboards, lists) */
  maxItems?: number;
  /** URL for web-page or image widgets */
  url?: string;
  /** Text content for text or marquee widgets */
  content?: string;
  /** Scroll speed for marquee widgets (pixels per second) */
  scrollSpeed?: number;
  /** Child widget IDs for widget-group containers */
  childWidgetIds?: string[];
  /** Extensible per widget type */
  [key: string]: unknown;
}

/**
 * A threshold rule that applies visual formatting when a metric crosses a boundary.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface ThresholdRule {
  /** Comparison operator */
  operator: ThresholdOperator;
  /** Threshold value to compare against */
  value: number;
  /** CSS color to apply when threshold is met */
  color: string;
  /** Whether to flash/pulse the widget when threshold is met */
  flash?: boolean;
}

/**
 * Position and size of a widget within the grid layout.
 * Compatible with react-grid-layout's Layout type.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface LayoutItem {
  /** Widget ID (must match a Widget.id) */
  i: string;
  /** X position in grid units */
  x: number;
  /** Y position in grid units */
  y: number;
  /** Width in grid units */
  w: number;
  /** Height in grid units */
  h: number;
  /** Minimum width in grid units */
  minW?: number;
  /** Minimum height in grid units */
  minH?: number;
  /** Whether the widget is locked in place */
  static?: boolean;
}
