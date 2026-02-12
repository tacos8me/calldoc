// ---------------------------------------------------------------------------
// Report Template Definitions - Standard report templates for CallDoc
// ---------------------------------------------------------------------------
// Defines 20+ standard report templates covering agent, call, queue/group,
// recording, and system categories. Each template specifies columns, default
// filters, sort order, and optional chart configuration.
//
// References: spec/chronicall-metric-definitions.md (Sections 1, 2, 5)

import type { ReportCategory, ReportChartType, ReportInterval } from '@/types/reports';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Column format determines how a cell value is rendered in tables and exports.
 */
export type ColumnFormat =
  | 'string'
  | 'number'
  | 'duration'    // seconds -> HH:MM:SS
  | 'percent'     // decimal -> XX.X%
  | 'currency'
  | 'datetime'
  | 'date'
  | 'boolean';

/**
 * Column alignment for table rendering.
 */
export type ColumnAlign = 'left' | 'center' | 'right';

/**
 * A column definition for a report template.
 */
export interface ReportColumnDef {
  /** Unique key used to reference the column in data rows */
  key: string;
  /** Display label for the column header */
  label: string;
  /** How to format the cell value */
  format: ColumnFormat;
  /** Cell alignment */
  align?: ColumnAlign;
  /** Whether this column should be shown in the summary row */
  summary?: 'sum' | 'avg' | 'max' | 'min' | 'count' | null;
  /** Tooltip description for the column header */
  description?: string;
  /** Default width in pixels (for XLSX export) */
  width?: number;
}

/**
 * Chart configuration for visual report rendering.
 */
export interface ChartConfig {
  /** Chart type */
  type: ReportChartType;
  /** Column key for the X-axis / category axis */
  xKey: string;
  /** Column keys for the Y-axis / data series */
  yKeys: string[];
  /** Whether to stack data series */
  stacked?: boolean;
  /** Colors for data series */
  colors?: string[];
}

/**
 * Report display style.
 */
export type ReportStyle = 'summary' | 'detail' | 'distribution' | 'timeline';

/**
 * Default filter configuration for a template.
 */
export interface TemplateDefaultFilters {
  direction?: ('inbound' | 'outbound' | 'internal')[];
  groupBy?: string;
  interval?: ReportInterval;
}

/**
 * Default sort configuration for a template.
 */
export interface TemplateDefaultSort {
  key: string;
  order: 'asc' | 'desc';
}

/**
 * A report template definition. Templates define the structure and defaults
 * for report generation. Users can override filters and columns at runtime.
 */
export interface ReportTemplate {
  /** Unique template identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of what this report shows */
  description: string;
  /** Report category for catalog grouping */
  category: ReportCategory;
  /** Display style (summary, detail, distribution, timeline) */
  style: ReportStyle;
  /** Column definitions in display order */
  columns: ReportColumnDef[];
  /** Default filter settings */
  defaultFilters: TemplateDefaultFilters;
  /** Default sort */
  defaultSort: TemplateDefaultSort;
  /** Optional chart configuration */
  chartConfig?: ChartConfig;
}

// ---------------------------------------------------------------------------
// Column definitions - reusable column building blocks
// ---------------------------------------------------------------------------

const COL = {
  // Agent
  agentId: { key: 'agentId', label: 'Agent ID', format: 'string' as const, width: 36 },
  agentName: { key: 'agentName', label: 'Agent Name', format: 'string' as const, width: 24 },
  agentExtension: { key: 'agentExtension', label: 'Extension', format: 'string' as const, width: 12 },

  // Call identifiers
  callId: { key: 'callId', label: 'Call ID', format: 'string' as const, width: 36 },
  direction: { key: 'direction', label: 'Direction', format: 'string' as const, width: 10 },
  callerNumber: { key: 'callerNumber', label: 'Caller Number', format: 'string' as const, width: 16 },
  callerName: { key: 'callerName', label: 'Caller Name', format: 'string' as const, width: 20 },
  calledNumber: { key: 'calledNumber', label: 'Called Number', format: 'string' as const, width: 16 },
  calledName: { key: 'calledName', label: 'Called Name', format: 'string' as const, width: 20 },

  // Queue/Group
  queueName: { key: 'queueName', label: 'Queue / Group', format: 'string' as const, width: 20 },
  groupName: { key: 'groupName', label: 'Group Name', format: 'string' as const, width: 20 },

  // Trunk
  trunkId: { key: 'trunkId', label: 'Trunk ID', format: 'string' as const, width: 12 },
  trunkName: { key: 'trunkName', label: 'Trunk Name', format: 'string' as const, width: 20 },

  // Timestamps
  startTime: { key: 'startTime', label: 'Start Time', format: 'datetime' as const, width: 22 },
  endTime: { key: 'endTime', label: 'End Time', format: 'datetime' as const, width: 22 },
  answerTime: { key: 'answerTime', label: 'Answer Time', format: 'datetime' as const, width: 22 },
  date: { key: 'date', label: 'Date', format: 'date' as const, width: 12 },

  // Time bucket
  timeBucket: { key: 'timeBucket', label: 'Time Period', format: 'string' as const, width: 18 },
  hour: { key: 'hour', label: 'Hour', format: 'string' as const, width: 10 },
  dayOfWeek: { key: 'dayOfWeek', label: 'Day of Week', format: 'string' as const, width: 12 },

  // Count metrics
  totalCalls: { key: 'totalCalls', label: 'Total Calls', format: 'number' as const, align: 'right' as const, summary: 'sum' as const, width: 12 },
  answeredCalls: { key: 'answeredCalls', label: 'Answered', format: 'number' as const, align: 'right' as const, summary: 'sum' as const, width: 12 },
  abandonedCalls: { key: 'abandonedCalls', label: 'Abandoned', format: 'number' as const, align: 'right' as const, summary: 'sum' as const, width: 12 },
  missedCalls: { key: 'missedCalls', label: 'Missed', format: 'number' as const, align: 'right' as const, summary: 'sum' as const, width: 12 },
  transferredCalls: { key: 'transferredCalls', label: 'Transferred', format: 'number' as const, align: 'right' as const, summary: 'sum' as const, width: 12 },
  inboundCalls: { key: 'inboundCalls', label: 'Inbound', format: 'number' as const, align: 'right' as const, summary: 'sum' as const, width: 12 },
  outboundCalls: { key: 'outboundCalls', label: 'Outbound', format: 'number' as const, align: 'right' as const, summary: 'sum' as const, width: 12 },
  internalCalls: { key: 'internalCalls', label: 'Internal', format: 'number' as const, align: 'right' as const, summary: 'sum' as const, width: 12 },
  holdCount: { key: 'holdCount', label: 'Hold Count', format: 'number' as const, align: 'right' as const, summary: 'sum' as const, width: 12 },
  transferCount: { key: 'transferCount', label: 'Transfer Count', format: 'number' as const, align: 'right' as const, summary: 'sum' as const, width: 12 },

  // Duration metrics
  avgTalkTime: { key: 'avgTalkTime', label: 'Avg Talk Time', format: 'duration' as const, align: 'right' as const, summary: 'avg' as const, width: 14 },
  totalTalkTime: { key: 'totalTalkTime', label: 'Total Talk Time', format: 'duration' as const, align: 'right' as const, summary: 'sum' as const, width: 16 },
  avgHoldTime: { key: 'avgHoldTime', label: 'Avg Hold Time', format: 'duration' as const, align: 'right' as const, summary: 'avg' as const, width: 14 },
  totalHoldTime: { key: 'totalHoldTime', label: 'Total Hold Time', format: 'duration' as const, align: 'right' as const, summary: 'sum' as const, width: 16 },
  avgWaitTime: { key: 'avgWaitTime', label: 'Avg Wait Time', format: 'duration' as const, align: 'right' as const, summary: 'avg' as const, width: 14 },
  maxWaitTime: { key: 'maxWaitTime', label: 'Max Wait Time', format: 'duration' as const, align: 'right' as const, summary: 'max' as const, width: 14 },
  avgDuration: { key: 'avgDuration', label: 'Avg Duration', format: 'duration' as const, align: 'right' as const, summary: 'avg' as const, width: 14 },
  totalDuration: { key: 'totalDuration', label: 'Total Duration', format: 'duration' as const, align: 'right' as const, summary: 'sum' as const, width: 16 },
  duration: { key: 'duration', label: 'Duration', format: 'duration' as const, align: 'right' as const, width: 12 },
  talkDuration: { key: 'talkDuration', label: 'Talk Time', format: 'duration' as const, align: 'right' as const, width: 12 },
  holdDuration: { key: 'holdDuration', label: 'Hold Time', format: 'duration' as const, align: 'right' as const, width: 12 },
  avgHandleTime: { key: 'avgHandleTime', label: 'Avg Handle Time', format: 'duration' as const, align: 'right' as const, summary: 'avg' as const, width: 16 },
  acwTime: { key: 'acwTime', label: 'ACW Time', format: 'duration' as const, align: 'right' as const, summary: 'sum' as const, width: 12 },
  idleTime: { key: 'idleTime', label: 'Idle Time', format: 'duration' as const, align: 'right' as const, summary: 'sum' as const, width: 12 },
  loginDuration: { key: 'loginDuration', label: 'Login Duration', format: 'duration' as const, align: 'right' as const, summary: 'sum' as const, width: 14 },
  asa: { key: 'asa', label: 'ASA', format: 'duration' as const, align: 'right' as const, summary: 'avg' as const, description: 'Average Speed of Answer', width: 12 },

  // Rate metrics
  answerRate: { key: 'answerRate', label: 'Answer Rate', format: 'percent' as const, align: 'right' as const, summary: 'avg' as const, width: 12 },
  abandonRate: { key: 'abandonRate', label: 'Abandon Rate', format: 'percent' as const, align: 'right' as const, summary: 'avg' as const, width: 12 },
  transferRate: { key: 'transferRate', label: 'Transfer Rate', format: 'percent' as const, align: 'right' as const, summary: 'avg' as const, width: 12 },
  serviceLevel: { key: 'serviceLevel', label: 'Service Level', format: 'percent' as const, align: 'right' as const, summary: 'avg' as const, description: '% answered within SLA threshold', width: 12 },
  occupancy: { key: 'occupancy', label: 'Occupancy', format: 'percent' as const, align: 'right' as const, summary: 'avg' as const, width: 12 },
  utilization: { key: 'utilization', label: 'Utilization', format: 'percent' as const, align: 'right' as const, summary: 'avg' as const, width: 12 },

  // Boolean
  isAnswered: { key: 'isAnswered', label: 'Answered', format: 'boolean' as const, width: 10 },
  isAbandoned: { key: 'isAbandoned', label: 'Abandoned', format: 'boolean' as const, width: 10 },
  isRecorded: { key: 'isRecorded', label: 'Recorded', format: 'boolean' as const, width: 10 },

  // Misc
  callsPerHour: { key: 'callsPerHour', label: 'Calls/Hour', format: 'number' as const, align: 'right' as const, summary: 'avg' as const, width: 12 },
  peakHour: { key: 'peakHour', label: 'Peak Hour', format: 'string' as const, width: 12 },
  accountCode: { key: 'accountCode', label: 'Account Code', format: 'string' as const, width: 14 },
  dnis: { key: 'dnis', label: 'DNIS / Dialed Number', format: 'string' as const, width: 18 },
  state: { key: 'state', label: 'State', format: 'string' as const, width: 12 },

  // Recording
  recordingId: { key: 'recordingId', label: 'Recording ID', format: 'string' as const, width: 36 },
  recordingDuration: { key: 'recordingDuration', label: 'Recording Duration', format: 'duration' as const, align: 'right' as const, width: 16 },
  fileSize: { key: 'fileSize', label: 'File Size (MB)', format: 'number' as const, align: 'right' as const, width: 14 },
  recordingCount: { key: 'recordingCount', label: 'Recordings', format: 'number' as const, align: 'right' as const, summary: 'sum' as const, width: 12 },

  // Scorecard
  overallScore: { key: 'overallScore', label: 'Overall Score', format: 'number' as const, align: 'right' as const, summary: 'avg' as const, width: 14 },
  scorePercentage: { key: 'scorePercentage', label: 'Score %', format: 'percent' as const, align: 'right' as const, summary: 'avg' as const, width: 12 },
  templateName: { key: 'templateName', label: 'Scorecard Template', format: 'string' as const, width: 22 },
  evaluatorName: { key: 'evaluatorName', label: 'Evaluator', format: 'string' as const, width: 18 },

  // Trunk
  channels: { key: 'channels', label: 'Channels', format: 'number' as const, align: 'right' as const, width: 10 },
  peakUsage: { key: 'peakUsage', label: 'Peak Usage', format: 'number' as const, align: 'right' as const, width: 12 },
  trunkUtilization: { key: 'trunkUtilization', label: 'Utilization %', format: 'percent' as const, align: 'right' as const, width: 14 },
} as const;

// ---------------------------------------------------------------------------
// Template Definitions
// ---------------------------------------------------------------------------

// ── Agent Reports ──────────────────────────────────────────────────────────

const agentSummary: ReportTemplate = {
  id: 'agent-summary',
  name: 'Agent Summary',
  description: 'Per-agent totals including calls handled, talk time, hold time, ACW, and idle time',
  category: 'agent',
  style: 'summary',
  columns: [
    COL.agentName,
    COL.agentExtension,
    COL.totalCalls,
    COL.answeredCalls,
    COL.abandonedCalls,
    COL.avgTalkTime,
    COL.totalTalkTime,
    COL.avgHoldTime,
    COL.totalHoldTime,
    COL.acwTime,
    COL.idleTime,
    COL.avgHandleTime,
    COL.answerRate,
    COL.occupancy,
  ],
  defaultFilters: {},
  defaultSort: { key: 'totalCalls', order: 'desc' },
  chartConfig: {
    type: 'bar',
    xKey: 'agentName',
    yKeys: ['totalCalls', 'answeredCalls', 'abandonedCalls'],
  },
};

const agentDetail: ReportTemplate = {
  id: 'agent-detail',
  name: 'Agent Detail',
  description: 'Hourly breakdown of agent activity with per-period metrics',
  category: 'agent',
  style: 'timeline',
  columns: [
    COL.agentName,
    COL.timeBucket,
    COL.totalCalls,
    COL.answeredCalls,
    COL.avgTalkTime,
    COL.avgHoldTime,
    COL.avgHandleTime,
    COL.answerRate,
  ],
  defaultFilters: { interval: '1h' },
  defaultSort: { key: 'timeBucket', order: 'asc' },
  chartConfig: {
    type: 'line',
    xKey: 'timeBucket',
    yKeys: ['totalCalls', 'answeredCalls'],
  },
};

const agentAvailability: ReportTemplate = {
  id: 'agent-availability',
  name: 'Agent Availability',
  description: 'Login/logout times, break durations, and availability percentage per agent',
  category: 'agent',
  style: 'summary',
  columns: [
    COL.agentName,
    COL.agentExtension,
    COL.loginDuration,
    COL.idleTime,
    COL.acwTime,
    { key: 'dndTime', label: 'DND Time', format: 'duration', align: 'right', summary: 'sum', width: 12 },
    { key: 'availablePercent', label: 'Available %', format: 'percent', align: 'right', summary: 'avg', width: 12 },
    COL.utilization,
  ],
  defaultFilters: {},
  defaultSort: { key: 'agentName', order: 'asc' },
  chartConfig: {
    type: 'bar',
    xKey: 'agentName',
    yKeys: ['loginDuration', 'idleTime', 'acwTime'],
    stacked: true,
  },
};

const agentGroupSummary: ReportTemplate = {
  id: 'agent-group-summary',
  name: 'Agent Group Summary',
  description: 'Aggregated metrics by hunt group showing agent performance within groups',
  category: 'agent',
  style: 'summary',
  columns: [
    COL.groupName,
    COL.totalCalls,
    COL.answeredCalls,
    COL.abandonedCalls,
    COL.avgTalkTime,
    COL.avgHoldTime,
    COL.avgWaitTime,
    COL.serviceLevel,
    COL.answerRate,
    COL.abandonRate,
  ],
  defaultFilters: {},
  defaultSort: { key: 'totalCalls', order: 'desc' },
  chartConfig: {
    type: 'bar',
    xKey: 'groupName',
    yKeys: ['answeredCalls', 'abandonedCalls'],
    stacked: true,
  },
};

const agentPerformanceComparison: ReportTemplate = {
  id: 'agent-performance-comparison',
  name: 'Agent Performance Comparison',
  description: 'Side-by-side comparison of key agent metrics for benchmarking',
  category: 'agent',
  style: 'summary',
  columns: [
    COL.agentName,
    COL.totalCalls,
    COL.answeredCalls,
    COL.avgTalkTime,
    COL.avgHandleTime,
    COL.answerRate,
    COL.occupancy,
    COL.utilization,
    COL.callsPerHour,
  ],
  defaultFilters: {},
  defaultSort: { key: 'answerRate', order: 'desc' },
  chartConfig: {
    type: 'bar',
    xKey: 'agentName',
    yKeys: ['answerRate', 'occupancy', 'utilization'],
  },
};

// ── Call Reports ──────────────────────────────────────────────────────────

const callSummary: ReportTemplate = {
  id: 'call-summary',
  name: 'Call Summary',
  description: 'Totals by hour, day, week, or month with volume and duration metrics',
  category: 'call',
  style: 'summary',
  columns: [
    COL.timeBucket,
    COL.totalCalls,
    COL.answeredCalls,
    COL.abandonedCalls,
    COL.inboundCalls,
    COL.outboundCalls,
    COL.avgDuration,
    COL.avgTalkTime,
    COL.avgHoldTime,
    COL.avgWaitTime,
    COL.serviceLevel,
  ],
  defaultFilters: { interval: '1h' },
  defaultSort: { key: 'timeBucket', order: 'asc' },
  chartConfig: {
    type: 'bar',
    xKey: 'timeBucket',
    yKeys: ['totalCalls', 'answeredCalls', 'abandonedCalls'],
    stacked: true,
  },
};

const callDetail: ReportTemplate = {
  id: 'call-detail',
  name: 'Call Detail (CDR)',
  description: 'Individual call records with complete fields for detailed analysis',
  category: 'call',
  style: 'detail',
  columns: [
    COL.startTime,
    COL.endTime,
    COL.direction,
    COL.callerNumber,
    COL.callerName,
    COL.calledNumber,
    COL.calledName,
    COL.agentName,
    COL.queueName,
    COL.duration,
    COL.talkDuration,
    COL.holdDuration,
    COL.holdCount,
    COL.transferCount,
    COL.isAnswered,
    COL.isAbandoned,
    COL.isRecorded,
    COL.accountCode,
  ],
  defaultFilters: {},
  defaultSort: { key: 'startTime', order: 'desc' },
};

const abandonedCallReport: ReportTemplate = {
  id: 'abandoned-calls',
  name: 'Abandoned Call Report',
  description: 'Calls that were not answered, with wait times and queue details',
  category: 'call',
  style: 'detail',
  columns: [
    COL.startTime,
    COL.callerNumber,
    COL.callerName,
    COL.queueName,
    COL.direction,
    COL.duration,
    { key: 'waitTime', label: 'Wait Time', format: 'duration', align: 'right', width: 12 },
    COL.agentName,
    COL.state,
  ],
  defaultFilters: { direction: ['inbound'] },
  defaultSort: { key: 'startTime', order: 'desc' },
};

const transferReport: ReportTemplate = {
  id: 'transfer-report',
  name: 'Transfer Report',
  description: 'Calls with transfers including source and destination agents',
  category: 'call',
  style: 'detail',
  columns: [
    COL.startTime,
    COL.callerNumber,
    COL.callerName,
    COL.direction,
    COL.agentName,
    { key: 'transferTo', label: 'Transferred To', format: 'string', width: 20 },
    COL.transferCount,
    COL.duration,
    COL.talkDuration,
    COL.holdDuration,
  ],
  defaultFilters: {},
  defaultSort: { key: 'startTime', order: 'desc' },
};

const callDistribution: ReportTemplate = {
  id: 'call-distribution',
  name: 'Call Distribution',
  description: 'Calls by time of day and day of week for staffing analysis',
  category: 'call',
  style: 'distribution',
  columns: [
    COL.hour,
    COL.dayOfWeek,
    COL.totalCalls,
    COL.inboundCalls,
    COL.outboundCalls,
    COL.internalCalls,
    COL.answeredCalls,
    COL.abandonedCalls,
    COL.avgDuration,
  ],
  defaultFilters: {},
  defaultSort: { key: 'hour', order: 'asc' },
  chartConfig: {
    type: 'bar',
    xKey: 'hour',
    yKeys: ['inboundCalls', 'outboundCalls', 'internalCalls'],
    stacked: true,
  },
};

// ── Queue/Group Reports ──────────────────────────────────────────────────

const queuePerformance: ReportTemplate = {
  id: 'queue-performance',
  name: 'Queue Performance',
  description: 'Per-queue metrics including SLA, ASA, abandon rate, and wait times',
  category: 'group',
  style: 'summary',
  columns: [
    COL.queueName,
    COL.totalCalls,
    COL.answeredCalls,
    COL.abandonedCalls,
    COL.serviceLevel,
    COL.asa,
    COL.avgWaitTime,
    COL.maxWaitTime,
    COL.abandonRate,
    COL.avgTalkTime,
    COL.avgHandleTime,
  ],
  defaultFilters: { direction: ['inbound'] },
  defaultSort: { key: 'totalCalls', order: 'desc' },
  chartConfig: {
    type: 'bar',
    xKey: 'queueName',
    yKeys: ['serviceLevel'],
  },
};

const queueSummary: ReportTemplate = {
  id: 'queue-summary',
  name: 'Queue Summary',
  description: 'High-level queue KPIs with volume, service level, and abandon metrics',
  category: 'group',
  style: 'summary',
  columns: [
    COL.queueName,
    COL.totalCalls,
    COL.answeredCalls,
    COL.abandonedCalls,
    COL.answerRate,
    COL.abandonRate,
    COL.serviceLevel,
    COL.avgDuration,
  ],
  defaultFilters: { direction: ['inbound'] },
  defaultSort: { key: 'queueName', order: 'asc' },
};

const groupAgentActivity: ReportTemplate = {
  id: 'group-agent-activity',
  name: 'Group Agent Activity',
  description: 'Which agents handled calls for which queues with per-agent-per-queue breakdown',
  category: 'group',
  style: 'summary',
  columns: [
    COL.groupName,
    COL.agentName,
    COL.totalCalls,
    COL.answeredCalls,
    COL.avgTalkTime,
    COL.avgHoldTime,
    COL.avgHandleTime,
    COL.answerRate,
  ],
  defaultFilters: {},
  defaultSort: { key: 'groupName', order: 'asc' },
};

// ── Recording Reports ─────────────────────────────────────────────────────

const recordingSummary: ReportTemplate = {
  id: 'recording-summary',
  name: 'Recording Summary',
  description: 'Recordings aggregated by agent with duration, count, and storage details',
  category: 'call',
  style: 'summary',
  columns: [
    COL.agentName,
    COL.recordingCount,
    COL.recordingDuration,
    COL.fileSize,
    COL.avgDuration,
  ],
  defaultFilters: {},
  defaultSort: { key: 'recordingCount', order: 'desc' },
};

const qaScorecardReport: ReportTemplate = {
  id: 'qa-scorecard',
  name: 'QA Scorecard Report',
  description: 'Quality assurance scores by agent, scorecard template, and evaluation period',
  category: 'call',
  style: 'detail',
  columns: [
    COL.agentName,
    COL.templateName,
    COL.evaluatorName,
    COL.overallScore,
    COL.scorePercentage,
    COL.date,
  ],
  defaultFilters: {},
  defaultSort: { key: 'date', order: 'desc' },
};

// ── System Reports ────────────────────────────────────────────────────────

const trunkUtilization: ReportTemplate = {
  id: 'trunk-utilization',
  name: 'Trunk Utilization',
  description: 'Calls per trunk, channel usage, and peak utilization metrics',
  category: 'trunk',
  style: 'summary',
  columns: [
    COL.trunkName,
    COL.trunkId,
    COL.totalCalls,
    COL.inboundCalls,
    COL.outboundCalls,
    COL.channels,
    COL.peakUsage,
    COL.trunkUtilization,
    COL.totalDuration,
    COL.avgDuration,
  ],
  defaultFilters: {},
  defaultSort: { key: 'totalCalls', order: 'desc' },
  chartConfig: {
    type: 'bar',
    xKey: 'trunkName',
    yKeys: ['inboundCalls', 'outboundCalls'],
    stacked: true,
  },
};

const systemOverview: ReportTemplate = {
  id: 'system-overview',
  name: 'System Overview',
  description: 'Total call volume, concurrent peaks, and system-wide metrics',
  category: 'call',
  style: 'summary',
  columns: [
    COL.timeBucket,
    COL.totalCalls,
    COL.inboundCalls,
    COL.outboundCalls,
    COL.internalCalls,
    COL.answeredCalls,
    COL.abandonedCalls,
    COL.avgDuration,
    COL.peakHour,
    COL.serviceLevel,
  ],
  defaultFilters: { interval: '1d' },
  defaultSort: { key: 'timeBucket', order: 'asc' },
  chartConfig: {
    type: 'line',
    xKey: 'timeBucket',
    yKeys: ['totalCalls', 'answeredCalls', 'abandonedCalls'],
  },
};

const dnisReport: ReportTemplate = {
  id: 'dnis-report',
  name: 'DNIS Report',
  description: 'Calls grouped by dialed number (DNIS/DID) with volume and answer metrics',
  category: 'call',
  style: 'summary',
  columns: [
    COL.dnis,
    COL.totalCalls,
    COL.answeredCalls,
    COL.abandonedCalls,
    COL.answerRate,
    COL.abandonRate,
    COL.avgDuration,
    COL.avgWaitTime,
  ],
  defaultFilters: { direction: ['inbound'] },
  defaultSort: { key: 'totalCalls', order: 'desc' },
  chartConfig: {
    type: 'bar',
    xKey: 'dnis',
    yKeys: ['totalCalls', 'answeredCalls'],
  },
};

const accountCodeReport: ReportTemplate = {
  id: 'account-code-report',
  name: 'Account Code Report',
  description: 'Calls tagged by account code with volume and duration metrics',
  category: 'call',
  style: 'summary',
  columns: [
    COL.accountCode,
    COL.totalCalls,
    COL.answeredCalls,
    COL.abandonedCalls,
    COL.totalDuration,
    COL.avgDuration,
    COL.avgTalkTime,
    COL.inboundCalls,
    COL.outboundCalls,
  ],
  defaultFilters: {},
  defaultSort: { key: 'totalCalls', order: 'desc' },
};

const cradleToGraveExport: ReportTemplate = {
  id: 'cradle-to-grave',
  name: 'Cradle-to-Grave Export',
  description: 'Full call lifecycle export with every field for compliance and auditing',
  category: 'call',
  style: 'detail',
  columns: [
    COL.callId,
    COL.startTime,
    COL.answerTime,
    COL.endTime,
    COL.direction,
    COL.state,
    COL.callerNumber,
    COL.callerName,
    COL.calledNumber,
    COL.calledName,
    COL.agentName,
    COL.agentExtension,
    COL.queueName,
    COL.trunkName,
    COL.duration,
    COL.talkDuration,
    COL.holdDuration,
    COL.holdCount,
    COL.transferCount,
    COL.isAnswered,
    COL.isAbandoned,
    COL.isRecorded,
    COL.accountCode,
  ],
  defaultFilters: {},
  defaultSort: { key: 'startTime', order: 'desc' },
};

// ---------------------------------------------------------------------------
// Template Registry
// ---------------------------------------------------------------------------

/**
 * All standard report templates indexed by ID.
 */
export const REPORT_TEMPLATES: ReadonlyMap<string, ReportTemplate> = new Map([
  [agentSummary.id, agentSummary],
  [agentDetail.id, agentDetail],
  [agentAvailability.id, agentAvailability],
  [agentGroupSummary.id, agentGroupSummary],
  [agentPerformanceComparison.id, agentPerformanceComparison],
  [callSummary.id, callSummary],
  [callDetail.id, callDetail],
  [abandonedCallReport.id, abandonedCallReport],
  [transferReport.id, transferReport],
  [callDistribution.id, callDistribution],
  [queuePerformance.id, queuePerformance],
  [queueSummary.id, queueSummary],
  [groupAgentActivity.id, groupAgentActivity],
  [recordingSummary.id, recordingSummary],
  [qaScorecardReport.id, qaScorecardReport],
  [trunkUtilization.id, trunkUtilization],
  [systemOverview.id, systemOverview],
  [dnisReport.id, dnisReport],
  [accountCodeReport.id, accountCodeReport],
  [cradleToGraveExport.id, cradleToGraveExport],
]);

/**
 * All standard report templates as an array.
 */
export const REPORT_TEMPLATES_LIST: readonly ReportTemplate[] = Array.from(
  REPORT_TEMPLATES.values()
);

/**
 * Get a template by ID.
 */
export function getTemplate(id: string): ReportTemplate | undefined {
  return REPORT_TEMPLATES.get(id);
}

/**
 * Get all templates in a given category.
 */
export function getTemplatesByCategory(category: ReportCategory): ReportTemplate[] {
  return REPORT_TEMPLATES_LIST.filter((t) => t.category === category);
}

/**
 * Get all unique categories from templates.
 */
export function getTemplateCategories(): ReportCategory[] {
  const cats = new Set<ReportCategory>();
  for (const t of REPORT_TEMPLATES_LIST) {
    cats.add(t.category);
  }
  return Array.from(cats);
}
