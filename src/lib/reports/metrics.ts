// ---------------------------------------------------------------------------
// Metric Calculator - Call center metric computation functions
// ---------------------------------------------------------------------------
// Implements industry-standard call center metric calculations using data from
// the calls and agent_states tables. Each function operates on typed row arrays
// and returns computed values suitable for report generation.
//
// References: spec/chronicall-metric-definitions.md

import type { InferSelectModel } from 'drizzle-orm';
import type { calls, agentStates } from '@/lib/db/schema';

// ---------------------------------------------------------------------------
// Row types derived from Drizzle schema
// ---------------------------------------------------------------------------

export type CallRow = InferSelectModel<typeof calls>;
export type AgentStateRow = InferSelectModel<typeof agentStates>;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a duration in seconds to HH:MM:SS string.
 * Handles negative values gracefully by returning "00:00:00".
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00:00';
  const totalSeconds = Math.round(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format a decimal value as a percentage string (e.g., 0.852 -> "85.2%").
 */
export function formatPercent(decimal: number): string {
  if (!Number.isFinite(decimal)) return '0.0%';
  return `${(decimal * 100).toFixed(1)}%`;
}

/**
 * Format a number with thousand separators.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('en-US');
}

/**
 * Safe division that returns 0 when the divisor is zero.
 */
function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

// ---------------------------------------------------------------------------
// Count metrics
// ---------------------------------------------------------------------------

/** Total number of calls. */
export function calcTotalCalls(callRows: CallRow[]): number {
  return callRows.length;
}

/** Number of calls that were answered (had a talking event). */
export function calcAnsweredCalls(callRows: CallRow[]): number {
  return callRows.filter((c) => c.isAnswered).length;
}

/** Number of calls that were abandoned (caller hung up before being answered). */
export function calcAbandonedCalls(callRows: CallRow[]): number {
  return callRows.filter((c) => c.isAbandoned).length;
}

/** Number of calls that involved at least one transfer. */
export function calcTransferredCalls(callRows: CallRow[]): number {
  return callRows.filter((c) => c.transferCount > 0).length;
}

/** Number of inbound calls. */
export function calcInboundCalls(callRows: CallRow[]): number {
  return callRows.filter((c) => c.direction === 'inbound').length;
}

/** Number of outbound calls. */
export function calcOutboundCalls(callRows: CallRow[]): number {
  return callRows.filter((c) => c.direction === 'outbound').length;
}

/** Number of internal calls. */
export function calcInternalCalls(callRows: CallRow[]): number {
  return callRows.filter((c) => c.direction === 'internal').length;
}

/** Number of calls that were recorded. */
export function calcRecordedCalls(callRows: CallRow[]): number {
  return callRows.filter((c) => c.isRecorded).length;
}

// ---------------------------------------------------------------------------
// Duration metrics (return value in seconds)
// ---------------------------------------------------------------------------

/** Average talk duration across all calls. */
export function calcAvgTalkTime(callRows: CallRow[]): number {
  if (callRows.length === 0) return 0;
  const total = callRows.reduce((sum, c) => sum + (c.talkDuration ?? 0), 0);
  return safeDivide(total, callRows.length);
}

/** Total talk duration across all calls. */
export function calcTotalTalkTime(callRows: CallRow[]): number {
  return callRows.reduce((sum, c) => sum + (c.talkDuration ?? 0), 0);
}

/** Average hold duration across all calls. */
export function calcAvgHoldTime(callRows: CallRow[]): number {
  if (callRows.length === 0) return 0;
  const total = callRows.reduce((sum, c) => sum + c.holdDuration, 0);
  return safeDivide(total, callRows.length);
}

/** Total hold duration across all calls. */
export function calcTotalHoldTime(callRows: CallRow[]): number {
  return callRows.reduce((sum, c) => sum + c.holdDuration, 0);
}

/**
 * Average wait time (time from queue entry to answer).
 * Only considers calls that have both queueEntryTime and answerTime.
 */
export function calcAvgWaitTime(callRows: CallRow[]): number {
  const withWait = callRows.filter((c) => c.queueEntryTime && c.answerTime);
  if (withWait.length === 0) return 0;
  const totalWait = withWait.reduce((sum, c) => {
    const queueMs = c.queueEntryTime!.getTime();
    const answerMs = c.answerTime!.getTime();
    return sum + Math.max(0, (answerMs - queueMs) / 1000);
  }, 0);
  return safeDivide(totalWait, withWait.length);
}

/**
 * Average After-Call Work (ACW) time from agent states.
 * ACW state represents time agent is in post-call processing.
 */
export function calcAvgACW(agentStateRows: AgentStateRow[]): number {
  const acwStates = agentStateRows.filter((s) => s.state === 'acw' && s.duration != null);
  if (acwStates.length === 0) return 0;
  const total = acwStates.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  return safeDivide(total, acwStates.length);
}

/** Total ACW time across all agent state entries. */
export function calcTotalACW(agentStateRows: AgentStateRow[]): number {
  return agentStateRows
    .filter((s) => s.state === 'acw')
    .reduce((sum, s) => sum + (s.duration ?? 0), 0);
}

/**
 * Average handle time = avg(talk time + hold time + ACW).
 * This is the total time an agent spends on a call including post-call work.
 */
export function calcAvgHandleTime(callRows: CallRow[], agentStateRows?: AgentStateRow[]): number {
  if (callRows.length === 0) return 0;
  const avgTalk = calcAvgTalkTime(callRows);
  const avgHold = calcAvgHoldTime(callRows);
  const avgAcw = agentStateRows ? calcAvgACW(agentStateRows) : 0;
  return avgTalk + avgHold + avgAcw;
}

/** Average call duration (full call duration, ring to hangup). */
export function calcAvgDuration(callRows: CallRow[]): number {
  if (callRows.length === 0) return 0;
  const total = callRows.reduce((sum, c) => sum + c.duration, 0);
  return safeDivide(total, callRows.length);
}

/** Total call duration. */
export function calcTotalDuration(callRows: CallRow[]): number {
  return callRows.reduce((sum, c) => sum + c.duration, 0);
}

/** Maximum call duration. */
export function calcMaxDuration(callRows: CallRow[]): number {
  if (callRows.length === 0) return 0;
  return Math.max(...callRows.map((c) => c.duration));
}

/** Maximum wait time (queue entry to answer). */
export function calcMaxWaitTime(callRows: CallRow[]): number {
  const withWait = callRows.filter((c) => c.queueEntryTime && c.answerTime);
  if (withWait.length === 0) return 0;
  return Math.max(
    ...withWait.map((c) => {
      const queueMs = c.queueEntryTime!.getTime();
      const answerMs = c.answerTime!.getTime();
      return Math.max(0, (answerMs - queueMs) / 1000);
    })
  );
}

// ---------------------------------------------------------------------------
// Rate metrics (return decimal 0..1)
// ---------------------------------------------------------------------------

/** Abandon rate = abandoned calls / total calls. */
export function calcAbandonRate(callRows: CallRow[]): number {
  return safeDivide(calcAbandonedCalls(callRows), callRows.length);
}

/** Transfer rate = transferred calls / total calls. */
export function calcTransferRate(callRows: CallRow[]): number {
  return safeDivide(calcTransferredCalls(callRows), callRows.length);
}

/** Answer rate = answered calls / total calls. */
export function calcAnswerRate(callRows: CallRow[]): number {
  return safeDivide(calcAnsweredCalls(callRows), callRows.length);
}

/**
 * Service level = percentage of inbound calls answered within a threshold (seconds).
 * Industry standard formula: (calls answered within threshold / total inbound calls) * 100.
 * Common thresholds: 20s (80/20 rule), 30s, 60s.
 */
export function calcServiceLevel(callRows: CallRow[], thresholdSeconds: number = 20): number {
  const inbound = callRows.filter((c) => c.direction === 'inbound');
  if (inbound.length === 0) return 0;

  const answeredWithinThreshold = inbound.filter((c) => {
    if (!c.isAnswered || !c.answerTime || !c.startTime) return false;
    const waitSeconds = (c.answerTime.getTime() - c.startTime.getTime()) / 1000;
    return waitSeconds <= thresholdSeconds;
  }).length;

  return safeDivide(answeredWithinThreshold, inbound.length);
}

/**
 * Average Speed of Answer (ASA) in seconds.
 * Time from call start to answer for answered inbound calls.
 */
export function calcASA(callRows: CallRow[]): number {
  const answered = callRows.filter(
    (c) => c.direction === 'inbound' && c.isAnswered && c.answerTime && c.startTime
  );
  if (answered.length === 0) return 0;
  const totalWait = answered.reduce((sum, c) => {
    return sum + Math.max(0, (c.answerTime!.getTime() - c.startTime.getTime()) / 1000);
  }, 0);
  return safeDivide(totalWait, answered.length);
}

// ---------------------------------------------------------------------------
// Agent metrics
// ---------------------------------------------------------------------------

/**
 * Agent occupancy = (talk time + hold time + ACW) / (talk time + hold time + ACW + idle time).
 * Measures how much of an agent's logged-in time is spent on call-related activities.
 */
export function calcOccupancy(
  callRows: CallRow[],
  agentStateRows: AgentStateRow[]
): number {
  const talkTime = calcTotalTalkTime(callRows);
  const holdTime = calcTotalHoldTime(callRows);
  const acwTime = calcTotalACW(agentStateRows);
  const idleTime = calcIdleTime(agentStateRows);

  const handleTime = talkTime + holdTime + acwTime;
  const totalTime = handleTime + idleTime;
  return safeDivide(handleTime, totalTime);
}

/**
 * Agent utilization = (talk time + hold time) / total logged-in time.
 * Measures productive call handling time relative to total availability.
 */
export function calcUtilization(
  callRows: CallRow[],
  agentStateRows: AgentStateRow[]
): number {
  const talkTime = calcTotalTalkTime(callRows);
  const holdTime = calcTotalHoldTime(callRows);
  const loggedInTime = calcLoggedInTime(agentStateRows);

  return safeDivide(talkTime + holdTime, loggedInTime);
}

/**
 * Total idle time from agent state records.
 * Idle state = agent logged in but not on a call or in ACW/DND.
 */
export function calcIdleTime(agentStateRows: AgentStateRow[]): number {
  return agentStateRows
    .filter((s) => s.state === 'idle' && s.duration != null)
    .reduce((sum, s) => sum + (s.duration ?? 0), 0);
}

/**
 * Total available time = idle time (agent ready to take calls).
 * Same as idle for IP Office; separate concept in some systems.
 */
export function calcAvailableTime(agentStateRows: AgentStateRow[]): number {
  return calcIdleTime(agentStateRows);
}

/**
 * Total logged-in time across all agent state entries.
 * Counts all states except 'logged-out' as logged-in time.
 */
export function calcLoggedInTime(agentStateRows: AgentStateRow[]): number {
  return agentStateRows
    .filter((s) => s.state !== 'logged-out' && s.duration != null)
    .reduce((sum, s) => sum + (s.duration ?? 0), 0);
}

/**
 * Total DND (Do Not Disturb) time.
 */
export function calcDNDTime(agentStateRows: AgentStateRow[]): number {
  return agentStateRows
    .filter((s) => s.state === 'dnd' && s.duration != null)
    .reduce((sum, s) => sum + (s.duration ?? 0), 0);
}

/**
 * Total ringing time from agent states.
 */
export function calcRingingTime(agentStateRows: AgentStateRow[]): number {
  return agentStateRows
    .filter((s) => s.state === 'ringing' && s.duration != null)
    .reduce((sum, s) => sum + (s.duration ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Distribution metrics
// ---------------------------------------------------------------------------

/**
 * Distribution of calls by hour of day (0-23).
 * Returns an array of 24 objects with hour and count.
 */
export function calcCallsByHour(
  callRows: CallRow[]
): Array<{ hour: number; count: number; label: string }> {
  const counts = new Array(24).fill(0) as number[];

  for (const call of callRows) {
    const hour = call.startTime.getHours();
    counts[hour]++;
  }

  return counts.map((count, hour) => ({
    hour,
    count,
    label: formatHourLabel(hour),
  }));
}

/**
 * Distribution of calls by day of week (0=Sunday, 6=Saturday).
 */
export function calcCallsByDayOfWeek(
  callRows: CallRow[]
): Array<{ dayOfWeek: number; dayName: string; count: number }> {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const counts = new Array(7).fill(0) as number[];

  for (const call of callRows) {
    const dow = call.startTime.getDay();
    counts[dow]++;
  }

  return counts.map((count, dow) => ({
    dayOfWeek: dow,
    dayName: dayNames[dow],
    count,
  }));
}

/**
 * Identify the peak hour (hour with most calls).
 * Returns the hour (0-23) and its call count.
 */
export function calcPeakHour(callRows: CallRow[]): { hour: number; count: number; label: string } {
  const byHour = calcCallsByHour(callRows);
  let peak = { hour: 0, count: 0, label: '12:00 AM' };

  for (const entry of byHour) {
    if (entry.count > peak.count) {
      peak = entry;
    }
  }

  return peak;
}

/**
 * Calculate calls per hour rate over a date range.
 */
export function calcCallsPerHour(callRows: CallRow[], hoursInRange: number): number {
  if (hoursInRange <= 0) return 0;
  return safeDivide(callRows.length, hoursInRange);
}

/**
 * Calculate the average number of calls per day.
 */
export function calcCallsPerDay(callRows: CallRow[], daysInRange: number): number {
  if (daysInRange <= 0) return 0;
  return safeDivide(callRows.length, daysInRange);
}

// ---------------------------------------------------------------------------
// Summary / aggregation helpers
// ---------------------------------------------------------------------------

/**
 * Group calls by a key function and return per-group arrays.
 */
export function groupCallsBy<K extends string>(
  callRows: CallRow[],
  keyFn: (call: CallRow) => K | null
): Map<K, CallRow[]> {
  const groups = new Map<K, CallRow[]>();
  for (const call of callRows) {
    const key = keyFn(call);
    if (key == null) continue;
    const existing = groups.get(key);
    if (existing) {
      existing.push(call);
    } else {
      groups.set(key, [call]);
    }
  }
  return groups;
}

/**
 * Group agent states by agent ID.
 */
export function groupStatesByAgent(
  stateRows: AgentStateRow[]
): Map<string, AgentStateRow[]> {
  const groups = new Map<string, AgentStateRow[]>();
  for (const state of stateRows) {
    const existing = groups.get(state.agentId);
    if (existing) {
      existing.push(state);
    } else {
      groups.set(state.agentId, [state]);
    }
  }
  return groups;
}

/**
 * Compute a complete agent summary from their calls and states.
 */
export function computeAgentSummary(
  agentCalls: CallRow[],
  agentStates: AgentStateRow[]
): {
  totalCalls: number;
  answeredCalls: number;
  abandonedCalls: number;
  missedCalls: number;
  avgTalkTime: number;
  avgHoldTime: number;
  avgHandleTime: number;
  totalTalkTime: number;
  totalHoldTime: number;
  idleTime: number;
  acwTime: number;
  occupancy: number;
  utilization: number;
  answerRate: number;
} {
  const totalCalls = calcTotalCalls(agentCalls);
  const answeredCalls = calcAnsweredCalls(agentCalls);
  const abandonedCalls = calcAbandonedCalls(agentCalls);
  const missedCalls = totalCalls - answeredCalls - abandonedCalls;

  return {
    totalCalls,
    answeredCalls,
    abandonedCalls,
    missedCalls: Math.max(0, missedCalls),
    avgTalkTime: calcAvgTalkTime(agentCalls),
    avgHoldTime: calcAvgHoldTime(agentCalls),
    avgHandleTime: calcAvgHandleTime(agentCalls, agentStates),
    totalTalkTime: calcTotalTalkTime(agentCalls),
    totalHoldTime: calcTotalHoldTime(agentCalls),
    idleTime: calcIdleTime(agentStates),
    acwTime: calcTotalACW(agentStates),
    occupancy: calcOccupancy(agentCalls, agentStates),
    utilization: calcUtilization(agentCalls, agentStates),
    answerRate: calcAnswerRate(agentCalls),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}
