// ---------------------------------------------------------------------------
// Report Data Engine - Core report generation for CallDoc
// ---------------------------------------------------------------------------
// Main entry point for report generation. Takes a template definition, date
// range, and filters, then queries the database and computes metrics to
// produce a typed report result with columns, rows, and summary.
//
// Uses Drizzle ORM for all database queries and the metrics module for
// computation. Supports agent, call, group, and trunk report categories.

import { and, eq, gte, lte, sql, inArray, isNotNull, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  calls,
  agents,
  agentStates,
  recordings,
  trunks,
  huntGroups,
  huntGroupMembers,
  scorecardResponses,
  scorecardTemplates,
} from '@/lib/db/schema';
import {
  type ReportTemplate,
  type ReportColumnDef,
  type ColumnFormat,
  getTemplate,
  REPORT_TEMPLATES,
} from './templates';
import {
  type CallRow,
  type AgentStateRow,
  formatDuration,
  formatPercent,
  formatNumber,
  calcTotalCalls,
  calcAnsweredCalls,
  calcAbandonedCalls,
  calcTransferredCalls,
  calcInboundCalls,
  calcOutboundCalls,
  calcInternalCalls,
  calcAvgTalkTime,
  calcTotalTalkTime,
  calcAvgHoldTime,
  calcTotalHoldTime,
  calcAvgWaitTime,
  calcMaxWaitTime,
  calcAvgACW,
  calcTotalACW,
  calcAvgHandleTime,
  calcAvgDuration,
  calcTotalDuration,
  calcAbandonRate,
  calcTransferRate,
  calcAnswerRate,
  calcServiceLevel,
  calcASA,
  calcOccupancy,
  calcUtilization,
  calcIdleTime,
  calcAvailableTime,
  calcLoggedInTime,
  calcDNDTime,
  calcCallsByHour,
  calcCallsByDayOfWeek,
  calcPeakHour,
  calcCallsPerHour,
  groupCallsBy,
  groupStatesByAgent,
  computeAgentSummary,
} from './metrics';
import {
  startOfDay,
  endOfDay,
  differenceInHours,
  differenceInDays,
  format as formatDate,
} from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportFilters {
  groups?: string[];
  agents?: string[];
  trunks?: string[];
  direction?: ('inbound' | 'outbound' | 'internal')[];
  minDuration?: number | null;
  maxDuration?: number | null;
  dispositions?: string[];
  groupBy?: string;
  interval?: string;
  serviceLevelThreshold?: number;
}

export interface ReportResult {
  columns: ReportColumnDef[];
  rows: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate a report based on a template definition, date range, and filters.
 *
 * @param templateId - The template ID to use for report generation
 * @param dateRange - Date range for the report data
 * @param filters - Additional filter criteria
 * @returns Report result with typed columns, data rows, and summary row
 */
export async function generateReport(
  templateId: string,
  dateRange: DateRange,
  filters: ReportFilters = {}
): Promise<ReportResult> {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Unknown report template: ${templateId}`);
  }

  // Merge template defaults with provided filters
  const mergedFilters: ReportFilters = {
    ...filters,
    direction: filters.direction?.length
      ? filters.direction
      : template.defaultFilters.direction,
    groupBy: filters.groupBy ?? template.defaultFilters.groupBy,
    interval: filters.interval ?? template.defaultFilters.interval,
  };

  // Route to the appropriate report generator based on template
  switch (template.id) {
    // Agent reports
    case 'agent-summary':
      return generateAgentSummaryReport(template, dateRange, mergedFilters);
    case 'agent-detail':
      return generateAgentDetailReport(template, dateRange, mergedFilters);
    case 'agent-availability':
      return generateAgentAvailabilityReport(template, dateRange, mergedFilters);
    case 'agent-group-summary':
      return generateAgentGroupSummaryReport(template, dateRange, mergedFilters);
    case 'agent-performance-comparison':
      return generateAgentSummaryReport(template, dateRange, mergedFilters);

    // Call reports
    case 'call-summary':
    case 'system-overview':
      return generateCallSummaryReport(template, dateRange, mergedFilters);
    case 'call-detail':
    case 'cradle-to-grave':
      return generateCallDetailReport(template, dateRange, mergedFilters);
    case 'abandoned-calls':
      return generateAbandonedCallReport(template, dateRange, mergedFilters);
    case 'transfer-report':
      return generateTransferReport(template, dateRange, mergedFilters);
    case 'call-distribution':
      return generateCallDistributionReport(template, dateRange, mergedFilters);
    case 'dnis-report':
      return generateDnisReport(template, dateRange, mergedFilters);
    case 'account-code-report':
      return generateAccountCodeReport(template, dateRange, mergedFilters);

    // Queue/Group reports
    case 'queue-performance':
    case 'queue-summary':
      return generateQueuePerformanceReport(template, dateRange, mergedFilters);
    case 'group-agent-activity':
      return generateGroupAgentActivityReport(template, dateRange, mergedFilters);

    // Recording reports
    case 'recording-summary':
      return generateRecordingSummaryReport(template, dateRange, mergedFilters);
    case 'qa-scorecard':
      return generateQaScorecardReport(template, dateRange, mergedFilters);

    // Trunk reports
    case 'trunk-utilization':
      return generateTrunkUtilizationReport(template, dateRange, mergedFilters);

    default:
      // Fallback: use call summary for unrecognized templates
      return generateCallSummaryReport(template, dateRange, mergedFilters);
  }
}

// ---------------------------------------------------------------------------
// Shared query helpers
// ---------------------------------------------------------------------------

/**
 * Build base WHERE conditions for call queries.
 */
function buildCallConditions(dateRange: DateRange, filters: ReportFilters): SQL[] {
  const conditions: SQL[] = [
    gte(calls.startTime, dateRange.from),
    lte(calls.startTime, dateRange.to),
  ];

  if (filters.agents && filters.agents.length > 0) {
    conditions.push(inArray(calls.agentId, filters.agents));
  }

  if (filters.direction && filters.direction.length > 0) {
    conditions.push(inArray(calls.direction, filters.direction));
  }

  if (filters.groups && filters.groups.length > 0) {
    conditions.push(inArray(calls.queueName, filters.groups));
  }

  if (filters.trunks && filters.trunks.length > 0) {
    conditions.push(inArray(calls.trunkId, filters.trunks));
  }

  if (filters.minDuration != null) {
    conditions.push(gte(calls.duration, filters.minDuration));
  }

  if (filters.maxDuration != null) {
    conditions.push(lte(calls.duration, filters.maxDuration));
  }

  return conditions;
}

/**
 * Fetch call rows matching the given conditions.
 */
async function fetchCalls(dateRange: DateRange, filters: ReportFilters): Promise<CallRow[]> {
  const conditions = buildCallConditions(dateRange, filters);
  const rows = await db
    .select()
    .from(calls)
    .where(and(...conditions))
    .limit(50000);
  return rows;
}

/**
 * Fetch agent state rows for a date range and optional agent filter.
 */
async function fetchAgentStates(
  dateRange: DateRange,
  agentIds?: string[]
): Promise<AgentStateRow[]> {
  const conditions: SQL[] = [
    gte(agentStates.startTime, dateRange.from),
    lte(agentStates.startTime, dateRange.to),
  ];

  if (agentIds && agentIds.length > 0) {
    conditions.push(inArray(agentStates.agentId, agentIds));
  }

  return db
    .select()
    .from(agentStates)
    .where(and(...conditions))
    .limit(100000);
}

/**
 * Build a summary row from data rows based on column definitions.
 */
function buildSummary(
  columns: ReportColumnDef[],
  rows: Record<string, unknown>[]
): Record<string, unknown> {
  const summary: Record<string, unknown> = {};

  for (const col of columns) {
    if (!col.summary) continue;

    const values = rows
      .map((r) => r[col.key])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

    if (values.length === 0) {
      summary[col.key] = 0;
      continue;
    }

    switch (col.summary) {
      case 'sum':
        summary[col.key] = values.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        summary[col.key] = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'max':
        summary[col.key] = Math.max(...values);
        break;
      case 'min':
        summary[col.key] = Math.min(...values);
        break;
      case 'count':
        summary[col.key] = values.length;
        break;
    }
  }

  return summary;
}

/**
 * Compute a metric value by key from call rows and agent states.
 */
function computeMetric(
  key: string,
  callRows: CallRow[],
  stateRows: AgentStateRow[],
  filters: ReportFilters
): unknown {
  const threshold = filters.serviceLevelThreshold ?? 20;

  switch (key) {
    case 'totalCalls': return calcTotalCalls(callRows);
    case 'answeredCalls': return calcAnsweredCalls(callRows);
    case 'abandonedCalls': return calcAbandonedCalls(callRows);
    case 'missedCalls': return Math.max(0, callRows.length - calcAnsweredCalls(callRows) - calcAbandonedCalls(callRows));
    case 'transferredCalls': return calcTransferredCalls(callRows);
    case 'inboundCalls': return calcInboundCalls(callRows);
    case 'outboundCalls': return calcOutboundCalls(callRows);
    case 'internalCalls': return calcInternalCalls(callRows);
    case 'avgTalkTime': return calcAvgTalkTime(callRows);
    case 'totalTalkTime': return calcTotalTalkTime(callRows);
    case 'avgHoldTime': return calcAvgHoldTime(callRows);
    case 'totalHoldTime': return calcTotalHoldTime(callRows);
    case 'avgWaitTime': return calcAvgWaitTime(callRows);
    case 'maxWaitTime': return calcMaxWaitTime(callRows);
    case 'avgDuration': return calcAvgDuration(callRows);
    case 'totalDuration': return calcTotalDuration(callRows);
    case 'avgHandleTime': return calcAvgHandleTime(callRows, stateRows);
    case 'acwTime': return calcTotalACW(stateRows);
    case 'idleTime': return calcIdleTime(stateRows);
    case 'dndTime': return calcDNDTime(stateRows);
    case 'loginDuration': return calcLoggedInTime(stateRows);
    case 'answerRate': return calcAnswerRate(callRows);
    case 'abandonRate': return calcAbandonRate(callRows);
    case 'transferRate': return calcTransferRate(callRows);
    case 'serviceLevel': return calcServiceLevel(callRows, threshold);
    case 'asa': return calcASA(callRows);
    case 'occupancy': return calcOccupancy(callRows, stateRows);
    case 'utilization': return calcUtilization(callRows, stateRows);
    case 'availablePercent': {
      const available = calcAvailableTime(stateRows);
      const loggedIn = calcLoggedInTime(stateRows);
      return loggedIn > 0 ? available / loggedIn : 0;
    }
    default: return null;
  }
}

/**
 * Convert SQL interval string to date_trunc precision.
 */
function intervalToPrecision(interval: string | undefined): string {
  switch (interval) {
    case '15m': return 'hour'; // PostgreSQL doesn't have 15m; we use hour as base
    case '30m': return 'hour';
    case '1h': return 'hour';
    case '1d': return 'day';
    case '1w': return 'week';
    case '1M': return 'month';
    default: return 'hour';
  }
}

// ---------------------------------------------------------------------------
// Agent Reports
// ---------------------------------------------------------------------------

async function generateAgentSummaryReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const callRows = await fetchCalls(dateRange, filters);

  // Get unique agent IDs from call data
  const agentIds = [...new Set(callRows.map((c) => c.agentId).filter(Boolean))] as string[];

  // Fetch agent states for the period
  const stateRows = await fetchAgentStates(dateRange, agentIds);

  // Fetch agent names
  const agentMap = new Map<string, { name: string; extension: string }>();
  if (agentIds.length > 0) {
    const agentRecords = await db
      .select({ id: agents.id, name: agents.name, extension: agents.extension })
      .from(agents)
      .where(inArray(agents.id, agentIds));
    for (const a of agentRecords) {
      agentMap.set(a.id, { name: a.name, extension: a.extension });
    }
  }

  // Group calls and states by agent
  const callsByAgent = groupCallsBy(callRows, (c) => c.agentId ?? null);
  const statesByAgent = groupStatesByAgent(stateRows);

  // Build rows
  const rows: Record<string, unknown>[] = [];

  for (const [agentId, agentCalls] of callsByAgent) {
    const agentInfo = agentMap.get(agentId);
    const agentStateList = statesByAgent.get(agentId) ?? [];

    const row: Record<string, unknown> = {
      agentId,
      agentName: agentInfo?.name ?? agentCalls[0]?.agentName ?? 'Unknown',
      agentExtension: agentInfo?.extension ?? agentCalls[0]?.agentExtension ?? '',
    };

    // Compute each metric column
    for (const col of template.columns) {
      if (row[col.key] !== undefined) continue; // Skip already-set columns
      const value = computeMetric(col.key, agentCalls, agentStateList, filters);
      if (value !== null) {
        row[col.key] = value;
      }
    }

    row.callsPerHour = calcCallsPerHour(
      agentCalls,
      Math.max(1, differenceInHours(dateRange.to, dateRange.from))
    );

    rows.push(row);
  }

  const summary = buildSummary(template.columns, rows);

  return { columns: template.columns, rows, summary };
}

async function generateAgentDetailReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const precision = intervalToPrecision(filters.interval);

  const conditions = buildCallConditions(dateRange, filters);

  // Query aggregated by agent and time bucket
  const dbRows = await db
    .select({
      agentName: calls.agentName,
      timeBucket: sql<string>`date_trunc(${sql.raw(`'${precision}'`)}, ${calls.startTime})::text`,
      totalCalls: sql<number>`count(*)::int`,
      answeredCalls: sql<number>`count(*) filter (where ${calls.isAnswered} = true)::int`,
      avgTalkTime: sql<number>`coalesce(avg(${calls.talkDuration}), 0)::int`,
      avgHoldTime: sql<number>`coalesce(avg(${calls.holdDuration}), 0)::int`,
      avgDuration: sql<number>`coalesce(avg(${calls.duration}), 0)::int`,
    })
    .from(calls)
    .where(and(...conditions))
    .groupBy(calls.agentName, sql`date_trunc(${sql.raw(`'${precision}'`)}, ${calls.startTime})`);

  const rows: Record<string, unknown>[] = dbRows.map((r) => ({
    agentName: r.agentName ?? 'Unknown',
    timeBucket: r.timeBucket,
    totalCalls: r.totalCalls,
    answeredCalls: r.answeredCalls,
    avgTalkTime: r.avgTalkTime,
    avgHoldTime: r.avgHoldTime,
    avgHandleTime: r.avgTalkTime + r.avgHoldTime,
    answerRate: r.totalCalls > 0 ? r.answeredCalls / r.totalCalls : 0,
  }));

  const summary = buildSummary(template.columns, rows);

  return { columns: template.columns, rows, summary };
}

async function generateAgentAvailabilityReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  // Fetch all active agents
  const agentConditions: SQL[] = [eq(agents.active, true)];
  if (filters.agents && filters.agents.length > 0) {
    agentConditions.push(inArray(agents.id, filters.agents));
  }
  const agentRecords = await db
    .select({ id: agents.id, name: agents.name, extension: agents.extension })
    .from(agents)
    .where(and(...agentConditions));

  const agentIds = agentRecords.map((a) => a.id);
  const stateRows = await fetchAgentStates(dateRange, agentIds);
  const statesByAgent = groupStatesByAgent(stateRows);

  const rows: Record<string, unknown>[] = agentRecords.map((agent) => {
    const states = statesByAgent.get(agent.id) ?? [];
    const loggedIn = calcLoggedInTime(states);
    const idle = calcIdleTime(states);
    const acw = calcTotalACW(states);
    const dnd = calcDNDTime(states);
    const available = calcAvailableTime(states);

    return {
      agentName: agent.name,
      agentExtension: agent.extension,
      loginDuration: loggedIn,
      idleTime: idle,
      acwTime: acw,
      dndTime: dnd,
      availablePercent: loggedIn > 0 ? available / loggedIn : 0,
      utilization: loggedIn > 0 ? (loggedIn - idle - dnd) / loggedIn : 0,
    };
  });

  const summary = buildSummary(template.columns, rows);
  return { columns: template.columns, rows, summary };
}

async function generateAgentGroupSummaryReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const conditions = buildCallConditions(dateRange, {
    ...filters,
    direction: filters.direction ?? ['inbound'],
  });
  conditions.push(isNotNull(calls.queueName));

  const dbRows = await db
    .select({
      groupName: calls.queueName,
      totalCalls: sql<number>`count(*)::int`,
      answeredCalls: sql<number>`count(*) filter (where ${calls.isAnswered} = true)::int`,
      abandonedCalls: sql<number>`count(*) filter (where ${calls.isAbandoned} = true)::int`,
      avgTalkTime: sql<number>`coalesce(avg(${calls.talkDuration}), 0)::int`,
      avgHoldTime: sql<number>`coalesce(avg(${calls.holdDuration}), 0)::int`,
      avgWaitTime: sql<number>`coalesce(avg(extract(epoch from (${calls.answerTime} - ${calls.queueEntryTime})))::int, 0)`,
    })
    .from(calls)
    .where(and(...conditions))
    .groupBy(calls.queueName);

  const threshold = filters.serviceLevelThreshold ?? 20;

  const rows: Record<string, unknown>[] = dbRows.map((r) => {
    const total = r.totalCalls || 1;
    return {
      groupName: r.groupName ?? 'Unknown',
      totalCalls: r.totalCalls,
      answeredCalls: r.answeredCalls,
      abandonedCalls: r.abandonedCalls,
      avgTalkTime: r.avgTalkTime,
      avgHoldTime: r.avgHoldTime,
      avgWaitTime: r.avgWaitTime,
      serviceLevel: r.answeredCalls / total, // Simplified; full SL needs per-call calculation
      answerRate: r.answeredCalls / total,
      abandonRate: r.abandonedCalls / total,
    };
  });

  const summary = buildSummary(template.columns, rows);
  return { columns: template.columns, rows, summary };
}

// ---------------------------------------------------------------------------
// Call Reports
// ---------------------------------------------------------------------------

async function generateCallSummaryReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const precision = intervalToPrecision(filters.interval);
  const conditions = buildCallConditions(dateRange, filters);

  const dbRows = await db
    .select({
      timeBucket: sql<string>`date_trunc(${sql.raw(`'${precision}'`)}, ${calls.startTime})::text`,
      totalCalls: sql<number>`count(*)::int`,
      answeredCalls: sql<number>`count(*) filter (where ${calls.isAnswered} = true)::int`,
      abandonedCalls: sql<number>`count(*) filter (where ${calls.isAbandoned} = true)::int`,
      inboundCalls: sql<number>`count(*) filter (where ${calls.direction} = 'inbound')::int`,
      outboundCalls: sql<number>`count(*) filter (where ${calls.direction} = 'outbound')::int`,
      internalCalls: sql<number>`count(*) filter (where ${calls.direction} = 'internal')::int`,
      avgDuration: sql<number>`coalesce(avg(${calls.duration}), 0)::int`,
      avgTalkTime: sql<number>`coalesce(avg(${calls.talkDuration}), 0)::int`,
      avgHoldTime: sql<number>`coalesce(avg(${calls.holdDuration}), 0)::int`,
      avgWaitTime: sql<number>`coalesce(avg(extract(epoch from (${calls.answerTime} - ${calls.startTime})) filter (where ${calls.isAnswered} = true))::int, 0)`,
    })
    .from(calls)
    .where(and(...conditions))
    .groupBy(sql`date_trunc(${sql.raw(`'${precision}'`)}, ${calls.startTime})`)
    .orderBy(sql`date_trunc(${sql.raw(`'${precision}'`)}, ${calls.startTime})`);

  const rows: Record<string, unknown>[] = dbRows.map((r) => ({
    timeBucket: r.timeBucket,
    totalCalls: r.totalCalls,
    answeredCalls: r.answeredCalls,
    abandonedCalls: r.abandonedCalls,
    inboundCalls: r.inboundCalls,
    outboundCalls: r.outboundCalls,
    internalCalls: r.internalCalls,
    avgDuration: r.avgDuration,
    avgTalkTime: r.avgTalkTime,
    avgHoldTime: r.avgHoldTime,
    avgWaitTime: r.avgWaitTime,
    serviceLevel: r.totalCalls > 0 ? r.answeredCalls / r.totalCalls : 0,
    peakHour: '', // Computed in summary
  }));

  const summary = buildSummary(template.columns, rows);

  // Identify peak period
  let maxCalls = 0;
  let peakBucket = '';
  for (const r of rows) {
    if ((r.totalCalls as number) > maxCalls) {
      maxCalls = r.totalCalls as number;
      peakBucket = r.timeBucket as string;
    }
  }
  summary.peakHour = peakBucket;

  return { columns: template.columns, rows, summary };
}

async function generateCallDetailReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const conditions = buildCallConditions(dateRange, filters);

  const dbRows = await db
    .select()
    .from(calls)
    .where(and(...conditions))
    .orderBy(calls.startTime)
    .limit(10000);

  const rows: Record<string, unknown>[] = dbRows.map((r) => ({
    callId: r.id,
    startTime: r.startTime.toISOString(),
    answerTime: r.answerTime?.toISOString() ?? null,
    endTime: r.endTime?.toISOString() ?? null,
    direction: r.direction,
    state: r.state,
    callerNumber: r.callerNumber,
    callerName: r.callerName ?? '',
    calledNumber: r.calledNumber,
    calledName: r.calledName ?? '',
    agentName: r.agentName ?? '',
    agentExtension: r.agentExtension ?? '',
    queueName: r.queueName ?? '',
    trunkName: r.trunkName ?? '',
    duration: r.duration,
    talkDuration: r.talkDuration ?? 0,
    holdDuration: r.holdDuration,
    holdCount: r.holdCount,
    transferCount: r.transferCount,
    isAnswered: r.isAnswered,
    isAbandoned: r.isAbandoned,
    isRecorded: r.isRecorded,
    accountCode: r.accountCode ?? '',
  }));

  const summary = buildSummary(template.columns, rows);

  return { columns: template.columns, rows, summary };
}

async function generateAbandonedCallReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const conditions = buildCallConditions(dateRange, {
    ...filters,
    direction: filters.direction ?? ['inbound'],
  });
  conditions.push(eq(calls.isAbandoned, true));

  const dbRows = await db
    .select()
    .from(calls)
    .where(and(...conditions))
    .orderBy(calls.startTime)
    .limit(10000);

  const rows: Record<string, unknown>[] = dbRows.map((r) => {
    const waitTime =
      r.queueEntryTime && r.endTime
        ? Math.max(0, (r.endTime.getTime() - r.queueEntryTime.getTime()) / 1000)
        : r.duration;

    return {
      startTime: r.startTime.toISOString(),
      callerNumber: r.callerNumber,
      callerName: r.callerName ?? '',
      queueName: r.queueName ?? '',
      direction: r.direction,
      duration: r.duration,
      waitTime,
      agentName: r.agentName ?? '',
      state: r.state,
    };
  });

  const summary = buildSummary(template.columns, rows);
  return { columns: template.columns, rows, summary };
}

async function generateTransferReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const conditions = buildCallConditions(dateRange, filters);
  conditions.push(gte(calls.transferCount, 1));

  const dbRows = await db
    .select()
    .from(calls)
    .where(and(...conditions))
    .orderBy(calls.startTime)
    .limit(10000);

  const rows: Record<string, unknown>[] = dbRows.map((r) => ({
    startTime: r.startTime.toISOString(),
    callerNumber: r.callerNumber,
    callerName: r.callerName ?? '',
    direction: r.direction,
    agentName: r.agentName ?? '',
    transferTo: '', // Would be populated from call_events data
    transferCount: r.transferCount,
    duration: r.duration,
    talkDuration: r.talkDuration ?? 0,
    holdDuration: r.holdDuration,
  }));

  const summary = buildSummary(template.columns, rows);
  return { columns: template.columns, rows, summary };
}

async function generateCallDistributionReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const callRows = await fetchCalls(dateRange, filters);

  const byHour = calcCallsByHour(callRows);
  const byDay = calcCallsByDayOfWeek(callRows);

  // Build hourly rows
  const rows: Record<string, unknown>[] = byHour.map((h) => {
    const hourCalls = callRows.filter((c) => c.startTime.getHours() === h.hour);
    return {
      hour: h.label,
      dayOfWeek: '',
      totalCalls: h.count,
      inboundCalls: calcInboundCalls(hourCalls),
      outboundCalls: calcOutboundCalls(hourCalls),
      internalCalls: calcInternalCalls(hourCalls),
      answeredCalls: calcAnsweredCalls(hourCalls),
      abandonedCalls: calcAbandonedCalls(hourCalls),
      avgDuration: calcAvgDuration(hourCalls),
    };
  });

  const summary = buildSummary(template.columns, rows);
  return { columns: template.columns, rows, summary };
}

async function generateDnisReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const conditions = buildCallConditions(dateRange, {
    ...filters,
    direction: filters.direction ?? ['inbound'],
  });

  const dbRows = await db
    .select({
      dnis: calls.calledNumber,
      totalCalls: sql<number>`count(*)::int`,
      answeredCalls: sql<number>`count(*) filter (where ${calls.isAnswered} = true)::int`,
      abandonedCalls: sql<number>`count(*) filter (where ${calls.isAbandoned} = true)::int`,
      avgDuration: sql<number>`coalesce(avg(${calls.duration}), 0)::int`,
      avgWaitTime: sql<number>`coalesce(avg(extract(epoch from (${calls.answerTime} - ${calls.startTime})) filter (where ${calls.isAnswered} = true))::int, 0)`,
    })
    .from(calls)
    .where(and(...conditions))
    .groupBy(calls.calledNumber);

  const rows: Record<string, unknown>[] = dbRows.map((r) => ({
    dnis: r.dnis,
    totalCalls: r.totalCalls,
    answeredCalls: r.answeredCalls,
    abandonedCalls: r.abandonedCalls,
    answerRate: r.totalCalls > 0 ? r.answeredCalls / r.totalCalls : 0,
    abandonRate: r.totalCalls > 0 ? r.abandonedCalls / r.totalCalls : 0,
    avgDuration: r.avgDuration,
    avgWaitTime: r.avgWaitTime,
  }));

  const summary = buildSummary(template.columns, rows);
  return { columns: template.columns, rows, summary };
}

async function generateAccountCodeReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const conditions = buildCallConditions(dateRange, filters);
  conditions.push(isNotNull(calls.accountCode));

  const dbRows = await db
    .select({
      accountCode: calls.accountCode,
      totalCalls: sql<number>`count(*)::int`,
      answeredCalls: sql<number>`count(*) filter (where ${calls.isAnswered} = true)::int`,
      abandonedCalls: sql<number>`count(*) filter (where ${calls.isAbandoned} = true)::int`,
      totalDuration: sql<number>`coalesce(sum(${calls.duration}), 0)::int`,
      avgDuration: sql<number>`coalesce(avg(${calls.duration}), 0)::int`,
      avgTalkTime: sql<number>`coalesce(avg(${calls.talkDuration}), 0)::int`,
      inboundCalls: sql<number>`count(*) filter (where ${calls.direction} = 'inbound')::int`,
      outboundCalls: sql<number>`count(*) filter (where ${calls.direction} = 'outbound')::int`,
    })
    .from(calls)
    .where(and(...conditions))
    .groupBy(calls.accountCode);

  const rows: Record<string, unknown>[] = dbRows.map((r) => ({
    accountCode: r.accountCode ?? '',
    totalCalls: r.totalCalls,
    answeredCalls: r.answeredCalls,
    abandonedCalls: r.abandonedCalls,
    totalDuration: r.totalDuration,
    avgDuration: r.avgDuration,
    avgTalkTime: r.avgTalkTime,
    inboundCalls: r.inboundCalls,
    outboundCalls: r.outboundCalls,
  }));

  const summary = buildSummary(template.columns, rows);
  return { columns: template.columns, rows, summary };
}

// ---------------------------------------------------------------------------
// Queue/Group Reports
// ---------------------------------------------------------------------------

async function generateQueuePerformanceReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const conditions = buildCallConditions(dateRange, {
    ...filters,
    direction: filters.direction ?? ['inbound'],
  });
  conditions.push(isNotNull(calls.queueName));

  const dbRows = await db
    .select({
      queueName: calls.queueName,
      totalCalls: sql<number>`count(*)::int`,
      answeredCalls: sql<number>`count(*) filter (where ${calls.isAnswered} = true)::int`,
      abandonedCalls: sql<number>`count(*) filter (where ${calls.isAbandoned} = true)::int`,
      avgTalkTime: sql<number>`coalesce(avg(${calls.talkDuration}) filter (where ${calls.isAnswered} = true), 0)::int`,
      avgHoldTime: sql<number>`coalesce(avg(${calls.holdDuration}), 0)::int`,
      avgWaitTime: sql<number>`coalesce(avg(extract(epoch from (${calls.answerTime} - ${calls.queueEntryTime})) filter (where ${calls.isAnswered} = true and ${calls.queueEntryTime} is not null))::int, 0)`,
      maxWaitTime: sql<number>`coalesce(max(extract(epoch from (${calls.answerTime} - ${calls.queueEntryTime})) filter (where ${calls.isAnswered} = true and ${calls.queueEntryTime} is not null))::int, 0)`,
    })
    .from(calls)
    .where(and(...conditions))
    .groupBy(calls.queueName);

  const threshold = filters.serviceLevelThreshold ?? 20;

  const rows: Record<string, unknown>[] = dbRows.map((r) => {
    const total = r.totalCalls || 1;
    return {
      queueName: r.queueName ?? 'Unknown',
      totalCalls: r.totalCalls,
      answeredCalls: r.answeredCalls,
      abandonedCalls: r.abandonedCalls,
      serviceLevel: r.answeredCalls / total, // Simplified
      asa: r.avgWaitTime,
      avgWaitTime: r.avgWaitTime,
      maxWaitTime: r.maxWaitTime,
      abandonRate: r.abandonedCalls / total,
      answerRate: r.answeredCalls / total,
      avgTalkTime: r.avgTalkTime,
      avgHoldTime: r.avgHoldTime,
      avgHandleTime: r.avgTalkTime + r.avgHoldTime,
      avgDuration: r.avgTalkTime + r.avgHoldTime + r.avgWaitTime,
    };
  });

  const summary = buildSummary(template.columns, rows);
  return { columns: template.columns, rows, summary };
}

async function generateGroupAgentActivityReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const conditions = buildCallConditions(dateRange, filters);
  conditions.push(isNotNull(calls.queueName));
  conditions.push(isNotNull(calls.agentId));

  const dbRows = await db
    .select({
      groupName: calls.queueName,
      agentName: calls.agentName,
      totalCalls: sql<number>`count(*)::int`,
      answeredCalls: sql<number>`count(*) filter (where ${calls.isAnswered} = true)::int`,
      avgTalkTime: sql<number>`coalesce(avg(${calls.talkDuration}), 0)::int`,
      avgHoldTime: sql<number>`coalesce(avg(${calls.holdDuration}), 0)::int`,
    })
    .from(calls)
    .where(and(...conditions))
    .groupBy(calls.queueName, calls.agentName);

  const rows: Record<string, unknown>[] = dbRows.map((r) => ({
    groupName: r.groupName ?? 'Unknown',
    agentName: r.agentName ?? 'Unknown',
    totalCalls: r.totalCalls,
    answeredCalls: r.answeredCalls,
    avgTalkTime: r.avgTalkTime,
    avgHoldTime: r.avgHoldTime,
    avgHandleTime: r.avgTalkTime + r.avgHoldTime,
    answerRate: r.totalCalls > 0 ? r.answeredCalls / r.totalCalls : 0,
  }));

  const summary = buildSummary(template.columns, rows);
  return { columns: template.columns, rows, summary };
}

// ---------------------------------------------------------------------------
// Recording Reports
// ---------------------------------------------------------------------------

async function generateRecordingSummaryReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const conditions: SQL[] = [
    gte(recordings.startTime, dateRange.from),
    lte(recordings.startTime, dateRange.to),
    eq(recordings.isDeleted, false),
  ];

  if (filters.agents && filters.agents.length > 0) {
    conditions.push(inArray(recordings.agentId, filters.agents));
  }

  const dbRows = await db
    .select({
      agentName: recordings.agentName,
      recordingCount: sql<number>`count(*)::int`,
      totalDuration: sql<number>`coalesce(sum(${recordings.duration}), 0)::int`,
      avgDuration: sql<number>`coalesce(avg(${recordings.duration}), 0)::int`,
      totalSize: sql<number>`coalesce(sum(${recordings.fileSize}), 0)::bigint`,
    })
    .from(recordings)
    .where(and(...conditions))
    .groupBy(recordings.agentName);

  const rows: Record<string, unknown>[] = dbRows.map((r) => ({
    agentName: r.agentName ?? 'Unknown',
    recordingCount: r.recordingCount,
    recordingDuration: r.totalDuration,
    avgDuration: r.avgDuration,
    fileSize: Math.round(Number(r.totalSize) / (1024 * 1024) * 100) / 100, // Convert to MB
  }));

  const summary = buildSummary(template.columns, rows);
  return { columns: template.columns, rows, summary };
}

async function generateQaScorecardReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  const conditions: SQL[] = [
    gte(scorecardResponses.createdAt, dateRange.from),
    lte(scorecardResponses.createdAt, dateRange.to),
  ];

  const dbRows = await db
    .select({
      agentUserId: scorecardResponses.agentUserId,
      templateName: scorecardTemplates.name,
      overallScore: scorecardResponses.overallScore,
      scorePercentage: scorecardResponses.scorePercentage,
      completedAt: scorecardResponses.completedAt,
    })
    .from(scorecardResponses)
    .leftJoin(scorecardTemplates, eq(scorecardResponses.templateId, scorecardTemplates.id))
    .where(and(...conditions))
    .orderBy(scorecardResponses.createdAt)
    .limit(10000);

  const rows: Record<string, unknown>[] = dbRows.map((r) => ({
    agentName: r.agentUserId ?? 'Unknown', // Would need agent name lookup
    templateName: r.templateName ?? 'Unknown',
    evaluatorName: '', // Would need user name lookup
    overallScore: r.overallScore,
    scorePercentage: r.scorePercentage / 100, // Convert to decimal for percent formatting
    date: r.completedAt?.toISOString().slice(0, 10) ?? '',
  }));

  const summary = buildSummary(template.columns, rows);
  return { columns: template.columns, rows, summary };
}

// ---------------------------------------------------------------------------
// Trunk Reports
// ---------------------------------------------------------------------------

async function generateTrunkUtilizationReport(
  template: ReportTemplate,
  dateRange: DateRange,
  filters: ReportFilters
): Promise<ReportResult> {
  // Get trunk info
  const trunkConditions: SQL[] = [];
  if (filters.trunks && filters.trunks.length > 0) {
    trunkConditions.push(inArray(trunks.id, filters.trunks));
  }

  const trunkRecords = await db
    .select({ id: trunks.id, name: trunks.name, channels: trunks.channels })
    .from(trunks)
    .where(trunkConditions.length > 0 ? and(...trunkConditions) : undefined);

  const trunkMap = new Map(trunkRecords.map((t) => [t.id, t]));

  // Get call stats per trunk
  const conditions = buildCallConditions(dateRange, filters);
  conditions.push(isNotNull(calls.trunkId));

  const dbRows = await db
    .select({
      trunkId: calls.trunkId,
      trunkName: calls.trunkName,
      totalCalls: sql<number>`count(*)::int`,
      inboundCalls: sql<number>`count(*) filter (where ${calls.direction} = 'inbound')::int`,
      outboundCalls: sql<number>`count(*) filter (where ${calls.direction} = 'outbound')::int`,
      totalDuration: sql<number>`coalesce(sum(${calls.duration}), 0)::int`,
      avgDuration: sql<number>`coalesce(avg(${calls.duration}), 0)::int`,
    })
    .from(calls)
    .where(and(...conditions))
    .groupBy(calls.trunkId, calls.trunkName);

  const rows: Record<string, unknown>[] = dbRows.map((r) => {
    const trunkInfo = r.trunkId ? trunkMap.get(r.trunkId) : null;
    const channelCount = trunkInfo?.channels ?? 0;

    return {
      trunkName: r.trunkName ?? trunkInfo?.name ?? 'Unknown',
      trunkId: r.trunkId ?? '',
      totalCalls: r.totalCalls,
      inboundCalls: r.inboundCalls,
      outboundCalls: r.outboundCalls,
      channels: channelCount,
      peakUsage: 0, // Would need time-series analysis of concurrent calls
      trunkUtilization: channelCount > 0 ? Math.min(1, r.totalCalls / (channelCount * 24)) : 0,
      totalDuration: r.totalDuration,
      avgDuration: r.avgDuration,
    };
  });

  const summary = buildSummary(template.columns, rows);
  return { columns: template.columns, rows, summary };
}

// ---------------------------------------------------------------------------
// Formatting utility for export
// ---------------------------------------------------------------------------

/**
 * Format a cell value based on column format for display/export.
 */
export function formatCellValue(value: unknown, format: ColumnFormat): string {
  if (value == null) return '';

  switch (format) {
    case 'duration':
      return typeof value === 'number' ? formatDuration(value) : String(value);
    case 'percent':
      return typeof value === 'number' ? formatPercent(value) : String(value);
    case 'number':
      return typeof value === 'number' ? formatNumber(value) : String(value);
    case 'currency':
      return typeof value === 'number' ? `$${value.toFixed(2)}` : String(value);
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'datetime':
      if (value instanceof Date) return value.toISOString();
      return String(value);
    case 'date':
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      return String(value);
    default:
      return String(value);
  }
}

/**
 * Get list of all available template IDs.
 */
export function getAvailableTemplateIds(): string[] {
  return Array.from(REPORT_TEMPLATES.keys());
}
