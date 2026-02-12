// ─── Report Domain Types ────────────────────────────────────────────────────
// Source: COMPONENT_ARCHITECTURE.md Section 7, VALIDATION_API_CONTRACTS.md

/**
 * Report category for organizational grouping.
 */
export type ReportCategory = 'call' | 'agent' | 'group' | 'trunk' | 'custom';

/**
 * Report time interval for data aggregation.
 */
export type ReportInterval = '15m' | '30m' | '1h' | '1d' | '1w' | '1M';

/**
 * Chart type for report visualization.
 */
export type ReportChartType = 'bar' | 'line' | 'stacked' | 'pie';

/**
 * Export format for report downloads.
 */
export type ReportExportFormat = 'csv' | 'pdf' | 'xlsx';

/**
 * Schedule frequency for recurring report delivery.
 */
export type ReportScheduleFrequency = 'daily' | 'weekly' | 'monthly';

/**
 * A saved report definition with filters, columns, and visualization settings.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface Report {
  /** Unique report identifier */
  id: string;
  /** Report name */
  name: string;
  /** Report description */
  description: string | null;
  /** Report category for catalog grouping */
  category: ReportCategory;
  /** ID of the user who created the report */
  createdBy: string;
  /** ISO timestamp of report creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Active filter state for this report */
  filters: ReportFilterState;
  /** Ordered list of visible column keys */
  columns: string[];
  /** Column key to group results by */
  groupBy: string | null;
  /** Time interval for data aggregation */
  interval: ReportInterval;
  /** Chart type for visualization, or null for table-only */
  chartType: ReportChartType | null;
  /** Recurring delivery schedule, or null if not scheduled */
  schedule: ReportSchedule | null;
}

/**
 * Filter state for report generation.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface ReportFilterState {
  /** Date range for the report */
  dateRange: { from: string; to: string };
  /** Hunt group IDs to include */
  groups: string[];
  /** Agent IDs to include */
  agents: string[];
  /** Trunk IDs to include */
  trunks: string[];
  /** Call directions to include */
  direction: ('inbound' | 'outbound' | 'internal')[];
  /** Minimum call duration in seconds */
  minDuration: number | null;
  /** Maximum call duration in seconds */
  maxDuration: number | null;
  /** Disposition codes to include */
  dispositions: string[];
}

/**
 * Recurring delivery schedule for a report.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface ReportSchedule {
  /** Whether this schedule is active */
  enabled: boolean;
  /** Delivery frequency */
  frequency: ReportScheduleFrequency;
  /** Time of day to run (HH:mm format) */
  time: string;
  /** Day of week for weekly schedules (0=Sunday, 6=Saturday) */
  dayOfWeek: number | null;
  /** Day of month for monthly schedules (1-31) */
  dayOfMonth: number | null;
  /** Email addresses to deliver the report to */
  recipients: string[];
  /** Export format for the delivered report */
  format: ReportExportFormat;
}

/**
 * Page context for saved filters.
 */
export type SavedFilterPageContext = 'c2g' | 'reports' | 'recordings';

/**
 * A user-saved filter preset.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 item 15 (DB: saved_filters).
 */
export interface SavedFilter {
  /** Unique filter identifier */
  id: string;
  /** Display name for the saved filter */
  name: string;
  /** ID of the user who saved this filter */
  userId: string;
  /** Which page/view this filter applies to */
  pageContext: SavedFilterPageContext;
  /** Serialized filter values */
  filtersJson: Record<string, unknown>;
  /** ISO timestamp of creation */
  createdAt: string;
}
