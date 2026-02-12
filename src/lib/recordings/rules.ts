// ---------------------------------------------------------------------------
// Recording Rules Engine - Evaluate recording rules against calls
// ---------------------------------------------------------------------------
// Loads rules from the database ordered by priority and evaluates them
// against call metadata to determine whether a call should be recorded.

import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { recordingRules } from '@/lib/db/schema';
import type { RecordingRuleCondition } from '@/types/recordings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Call metadata used for rule evaluation.
 * This is a minimal subset of a call record needed for rule matching.
 */
export interface CallForRuleEvaluation {
  agentId: string | null;
  queueName: string | null;
  direction: string;
  callerNumber: string;
  calledNumber: string;
}

/**
 * Result of recording rule evaluation.
 */
export interface RuleEvaluationResult {
  /** Whether the call should be recorded */
  shouldRecord: boolean;
  /** ID of the matching rule, if any */
  ruleId: string | null;
  /** Record percentage from the matching rule */
  recordPercent: number;
  /** Name of the matching rule */
  ruleName: string | null;
}

/**
 * A recording rule as loaded from the database.
 */
interface LoadedRule {
  id: string;
  name: string;
  ruleType: string;
  conditionsJson: Record<string, unknown>;
  recordPercentage: number;
  direction: string | null;
  isActive: boolean;
  priority: number;
}

// ---------------------------------------------------------------------------
// Rule Cache
// ---------------------------------------------------------------------------

let rulesCache: LoadedRule[] | null = null;
let rulesCacheTime = 0;
const RULES_CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Load active recording rules from the database, ordered by priority (ascending).
 * Uses a 30-second cache to avoid excessive DB queries during bulk processing.
 */
async function loadRules(): Promise<LoadedRule[]> {
  const now = Date.now();
  if (rulesCache && now - rulesCacheTime < RULES_CACHE_TTL_MS) {
    return rulesCache;
  }

  const rows = await db
    .select()
    .from(recordingRules)
    .where(eq(recordingRules.isActive, true))
    .orderBy(asc(recordingRules.priority));

  rulesCache = rows.map((row) => ({
    id: row.id,
    name: row.name,
    ruleType: row.ruleType,
    conditionsJson: row.conditionsJson,
    recordPercentage: row.recordPercentage,
    direction: row.direction,
    isActive: row.isActive,
    priority: row.priority,
  }));

  rulesCacheTime = now;
  return rulesCache;
}

/**
 * Invalidate the rules cache. Call this when rules are modified.
 */
export function invalidateRulesCache(): void {
  rulesCache = null;
  rulesCacheTime = 0;
}

// ---------------------------------------------------------------------------
// shouldRecord - Main entry point
// ---------------------------------------------------------------------------

/**
 * Evaluate recording rules against a call to determine if it should be recorded.
 * Rules are evaluated in priority order (lowest number = highest priority).
 * The first matching rule wins.
 *
 * @param call - Call metadata for evaluation
 * @param customRules - Optional custom rules (for testing); if not provided, loads from DB
 * @returns Evaluation result indicating whether to record
 */
export async function shouldRecord(
  call: CallForRuleEvaluation,
  customRules?: LoadedRule[]
): Promise<RuleEvaluationResult> {
  return evaluateRecordingRules(call, customRules);
}

/**
 * Core rule evaluation function. Exported separately for use in ingestion pipeline.
 */
export async function evaluateRecordingRules(
  call: CallForRuleEvaluation,
  customRules?: LoadedRule[]
): Promise<RuleEvaluationResult> {
  const rules = customRules || await loadRules();

  if (rules.length === 0) {
    return {
      shouldRecord: false,
      ruleId: null,
      recordPercent: 0,
      ruleName: null,
    };
  }

  for (const rule of rules) {
    const matches = evaluateRule(rule, call);

    if (matches) {
      // Apply percentage-based recording
      const shouldRecordCall = applyPercentage(rule.recordPercentage);

      return {
        shouldRecord: shouldRecordCall,
        ruleId: rule.id,
        recordPercent: rule.recordPercentage,
        ruleName: rule.name,
      };
    }
  }

  // No rule matched
  return {
    shouldRecord: false,
    ruleId: null,
    recordPercent: 0,
    ruleName: null,
  };
}

// ---------------------------------------------------------------------------
// Rule Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single rule against call metadata.
 */
function evaluateRule(rule: LoadedRule, call: CallForRuleEvaluation): boolean {
  const conditions = rule.conditionsJson as RecordingRuleCondition;

  // Check direction filter first (applies to all rule types)
  if (rule.direction) {
    const directionFilter = rule.direction.toLowerCase();
    if (directionFilter !== 'all' && directionFilter !== call.direction) {
      return false;
    }
  }

  switch (rule.ruleType) {
    case 'agent':
      return evaluateAgentRule(conditions, call);

    case 'group':
      return evaluateGroupRule(conditions, call);

    case 'direction':
      return evaluateDirectionRule(conditions, call);

    case 'number':
    case 'inbound-number-dialed':
      return evaluateNumberRule(conditions, call);

    case 'basic-call-event':
      return evaluateBasicCallEventRule(conditions, call);

    case 'advanced':
      return evaluateAdvancedRule(conditions, call);

    default:
      log(`Unknown rule type: ${rule.ruleType}`);
      return false;
  }
}

/**
 * Agent rule: check if the call's agent matches the rule's agent list.
 */
function evaluateAgentRule(conditions: RecordingRuleCondition, call: CallForRuleEvaluation): boolean {
  if (!conditions.agents || conditions.agents.length === 0) {
    // No agents specified = match all agents
    return true;
  }

  if (!call.agentId) return false;

  return conditions.agents.includes(call.agentId);
}

/**
 * Group rule: check if the call's queue matches the rule's group list.
 */
function evaluateGroupRule(conditions: RecordingRuleCondition, call: CallForRuleEvaluation): boolean {
  if (!conditions.groups || conditions.groups.length === 0) {
    return true;
  }

  if (!call.queueName) return false;

  return conditions.groups.includes(call.queueName);
}

/**
 * Direction rule: match based on call direction.
 */
function evaluateDirectionRule(conditions: RecordingRuleCondition, call: CallForRuleEvaluation): boolean {
  // Direction is already checked at the top level via rule.direction.
  // If we got here, the direction matched (or no direction filter).
  return true;
}

/**
 * Number rule: regex match on caller or called number.
 */
function evaluateNumberRule(conditions: RecordingRuleCondition, call: CallForRuleEvaluation): boolean {
  // For number rules, trunks acts as patterns to match
  if (!conditions.trunks || conditions.trunks.length === 0) {
    return true;
  }

  for (const pattern of conditions.trunks) {
    try {
      const regex = new RegExp(pattern);
      if (regex.test(call.callerNumber) || regex.test(call.calledNumber)) {
        return true;
      }
    } catch {
      // If pattern is not a valid regex, treat as literal match
      if (call.callerNumber.includes(pattern) || call.calledNumber.includes(pattern)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Basic call event rule: combines group/agent with direction filtering.
 */
function evaluateBasicCallEventRule(
  conditions: RecordingRuleCondition,
  call: CallForRuleEvaluation
): boolean {
  // Check group filter
  if (conditions.groups && conditions.groups.length > 0) {
    if (!call.queueName || !conditions.groups.includes(call.queueName)) {
      return false;
    }
  }

  // Check agent filter
  if (conditions.agents && conditions.agents.length > 0) {
    if (!call.agentId || !conditions.agents.includes(call.agentId)) {
      return false;
    }
  }

  return true;
}

/**
 * Advanced rule: supports schedule constraints and minimum duration.
 * Schedule evaluation checks current time against configured days/hours.
 */
function evaluateAdvancedRule(
  conditions: RecordingRuleCondition,
  call: CallForRuleEvaluation
): boolean {
  // Check group and agent filters first
  if (!evaluateBasicCallEventRule(conditions, call)) {
    return false;
  }

  // Check schedule
  if (conditions.daysOfWeek || conditions.startTime || conditions.endTime) {
    if (!evaluateSchedule(conditions)) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluate schedule constraints against the current time.
 */
function evaluateSchedule(conditions: RecordingRuleCondition): boolean {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Check day of week
  if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
    if (!conditions.daysOfWeek.includes(currentDay)) {
      return false;
    }
  }

  // Check time range
  if (conditions.startTime) {
    const [startH, startM] = conditions.startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const currentMinutes = currentHour * 60 + currentMinute;

    if (currentMinutes < startMinutes) {
      return false;
    }
  }

  if (conditions.endTime) {
    const [endH, endM] = conditions.endTime.split(':').map(Number);
    const endMinutes = endH * 60 + endM;
    const currentMinutes = currentHour * 60 + currentMinute;

    if (currentMinutes > endMinutes) {
      return false;
    }
  }

  return true;
}

/**
 * Apply percentage-based recording. Returns true if this call should be recorded
 * based on the configured percentage.
 *
 * @param percent - Percentage of calls to record (0-100)
 */
function applyPercentage(percent: number): boolean {
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  return Math.random() * 100 < percent;
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [RecordingRules] ${message}`);
}
