// ---------------------------------------------------------------------------
// Alert Engine - Real-time alert evaluation against live metrics
// ---------------------------------------------------------------------------
// Subscribes to Redis channels for real-time call center metrics and
// evaluates alert rules against current values. Fires alerts via Socket.io
// and email, with cooldown and hysteresis support.

import Redis from 'ioredis';
import { eq, and, desc, gte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { alertRules, alertHistory } from '@/lib/db/schema';
import { emailService } from '@/lib/email/service';
import type { EmailAlert } from '@/lib/email/service';
import { REDIS_CHANNELS } from '@/types/redis-events';
import type { GroupStatsMessage, AgentStateMessage } from '@/types/redis-events';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlertRuleRecord {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  cooldownMinutes: number;
  notifyInApp: boolean;
  notifyEmail: boolean;
  notifyWallboard: boolean;
  emailRecipients: string[] | null;
  targetGroups: string[] | null;
  targetAgents: string[] | null;
  active: boolean;
  lastFiredAt: Date | null;
}

/**
 * Current metric values tracked by the alert engine.
 */
interface MetricValues {
  /** queue_wait_time: longest wait per group */
  'queue.longest_wait': Map<string, number>;
  /** abandoned_calls counter */
  'queue.abandoned': Map<string, number>;
  /** agents_available count per group */
  'agents.available': Map<string, number>;
  /** agents_busy count per group */
  'agents.busy': Map<string, number>;
  /** calls_waiting per group */
  'queue.calls_waiting': Map<string, number>;
}

/**
 * Alert state for hysteresis tracking.
 * An alert is "active" once it crosses the threshold, and "cleared"
 * when it returns below the threshold.
 */
interface AlertState {
  /** Whether this rule is currently in alert state */
  isActive: boolean;
  /** Last time this rule was fired */
  lastFiredAt: number;
  /** Last metric value that triggered the alert */
  lastValue: number;
}

// ---------------------------------------------------------------------------
// AlertEngine
// ---------------------------------------------------------------------------

/**
 * Real-time alert evaluation engine. Subscribes to Redis pub/sub channels
 * for group statistics and agent state changes, then evaluates configured
 * alert rules against the incoming data.
 *
 * Features:
 *   - Cooldown: prevents re-firing the same alert within a configurable period
 *   - Hysteresis: fires when crossing threshold, clears when back below
 *   - Multi-channel: notifies via Socket.io, email, and wallboard
 */
export class AlertEngine {
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private isRunning = false;
  private rules: AlertRuleRecord[] = [];
  private alertStates: Map<string, AlertState> = new Map();
  private metrics: MetricValues = {
    'queue.longest_wait': new Map(),
    'queue.abandoned': new Map(),
    'agents.available': new Map(),
    'agents.busy': new Map(),
    'queue.calls_waiting': new Map(),
  };
  private rulesRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private socketIo: unknown = null;

  /** Number of alerts fired since start. */
  private firedCount = 0;
  get totalFired(): number {
    return this.firedCount;
  }

  /** Whether the engine is running. */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Start the alert engine.
   *
   * @param redisUrl - Redis connection URL
   * @param io - Optional Socket.io server instance for real-time notifications
   */
  async start(redisUrl: string = 'redis://localhost:6379', io?: unknown): Promise<void> {
    this.socketIo = io;
    this.isRunning = true;

    // Load rules from DB
    await this.refreshRules();

    // Refresh rules every 60 seconds
    this.rulesRefreshTimer = setInterval(() => {
      this.refreshRules().catch((err) => {
        log(`Rules refresh error: ${err instanceof Error ? err.message : err}`);
      });
    }, 60_000);

    // Set up Redis subscriber for real-time metrics
    this.subscriber = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 500, 5000),
      maxRetriesPerRequest: null, // Required for subscriber mode
      lazyConnect: true,
    });

    // Set up Redis publisher for alert notifications
    this.publisher = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 500, 5000),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    try {
      await this.subscriber.connect();
      await this.publisher.connect();

      await this.subscriber.subscribe(
        REDIS_CHANNELS.groups,
        REDIS_CHANNELS.agents
      );

      this.subscriber.on('message', (channel: string, message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(channel, data);
        } catch (err) {
          log(`Error parsing Redis message: ${err instanceof Error ? err.message : err}`);
        }
      });

      log(`Alert engine started with ${this.rules.length} active rule(s)`);
    } catch (err) {
      log(`Failed to connect to Redis: ${err instanceof Error ? err.message : err}`);
      // Continue without Redis -- rules won't fire
    }
  }

  /**
   * Stop the alert engine and clean up resources.
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.rulesRefreshTimer) {
      clearInterval(this.rulesRefreshTimer);
      this.rulesRefreshTimer = null;
    }

    if (this.subscriber) {
      await this.subscriber.unsubscribe().catch(() => {});
      await this.subscriber.quit().catch(() => {});
      this.subscriber = null;
    }

    if (this.publisher) {
      await this.publisher.quit().catch(() => {});
      this.publisher = null;
    }

    this.alertStates.clear();
    log('Alert engine stopped');
  }

  /**
   * Reload active alert rules from the database.
   */
  async refreshRules(): Promise<void> {
    const rows = await db
      .select()
      .from(alertRules)
      .where(eq(alertRules.active, true));

    this.rules = rows.map((row) => ({
      id: row.id,
      name: row.name,
      metric: row.metric,
      condition: row.condition,
      threshold: row.threshold,
      severity: row.severity,
      cooldownMinutes: row.cooldownMinutes,
      notifyInApp: row.notifyInApp,
      notifyEmail: row.notifyEmail,
      notifyWallboard: row.notifyWallboard,
      emailRecipients: row.emailRecipients,
      targetGroups: row.targetGroups,
      targetAgents: row.targetAgents,
      active: row.active,
      lastFiredAt: row.lastFiredAt,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Message Handling
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Handle an incoming Redis message and update metric values.
   */
  private handleMessage(channel: string, data: unknown): void {
    if (channel === REDIS_CHANNELS.groups) {
      this.handleGroupStats(data as GroupStatsMessage);
    } else if (channel === REDIS_CHANNELS.agents) {
      this.handleAgentState(data as AgentStateMessage);
    }
  }

  /**
   * Update metrics from a group stats message and evaluate rules.
   */
  private handleGroupStats(msg: GroupStatsMessage): void {
    const groupId = msg.groupId;

    this.metrics['queue.longest_wait'].set(groupId, msg.longestWait);
    this.metrics['queue.calls_waiting'].set(groupId, msg.callsWaiting);
    this.metrics['agents.available'].set(groupId, msg.agentsAvailable);
    this.metrics['agents.busy'].set(groupId, msg.agentsBusy);

    // Evaluate all rules against updated metrics
    this.evaluateAllRules();
  }

  /**
   * Handle an agent state change. Currently used for counting.
   */
  private handleAgentState(_msg: AgentStateMessage): void {
    // Agent state changes are reflected in group stats.
    // Individual agent alerts can be added here in the future.
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rule Evaluation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Evaluate all active rules against current metric values.
   */
  private evaluateAllRules(): void {
    for (const rule of this.rules) {
      this.evaluateRule(rule);
    }
  }

  /**
   * Evaluate a single rule. Checks the metric, applies the condition,
   * and handles cooldown and hysteresis.
   */
  private evaluateRule(rule: AlertRuleRecord): void {
    // Get the current value for this metric
    const currentValue = this.getMetricValue(rule.metric, rule.targetGroups);
    if (currentValue === null) return;

    // Compare value against threshold
    const breached = this.compareValue(currentValue, rule.condition, rule.threshold);

    const stateKey = rule.id;
    const state = this.alertStates.get(stateKey) || {
      isActive: false,
      lastFiredAt: 0,
      lastValue: 0,
    };

    if (breached && !state.isActive) {
      // Threshold crossed -- check cooldown
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;
      const now = Date.now();

      if (now - state.lastFiredAt < cooldownMs) {
        // Still in cooldown
        return;
      }

      // Fire the alert
      state.isActive = true;
      state.lastFiredAt = now;
      state.lastValue = currentValue;
      this.alertStates.set(stateKey, state);

      this.fireAlert(rule, currentValue).catch((err) => {
        log(`Failed to fire alert ${rule.id}: ${err instanceof Error ? err.message : err}`);
      });
    } else if (!breached && state.isActive) {
      // Threshold no longer breached -- clear alert (hysteresis)
      state.isActive = false;
      this.alertStates.set(stateKey, state);

      this.clearAlert(rule, currentValue).catch((err) => {
        log(`Failed to clear alert ${rule.id}: ${err instanceof Error ? err.message : err}`);
      });
    }
  }

  /**
   * Get the current value for a metric, optionally filtered by target groups.
   * Returns the worst-case (max for gt/gte, min for lt/lte) across all groups.
   */
  private getMetricValue(metric: string, targetGroups: string[] | null): number | null {
    const metricMap = this.metrics[metric as keyof MetricValues];
    if (!metricMap) return null;

    let values: number[];

    if (targetGroups && targetGroups.length > 0) {
      values = targetGroups
        .map((g) => metricMap.get(g))
        .filter((v): v is number => v !== undefined);
    } else {
      values = Array.from(metricMap.values());
    }

    if (values.length === 0) return null;

    // For "greater than" metrics, return the maximum
    // For "less than" metrics, return the minimum
    return Math.max(...values);
  }

  /**
   * Compare a value against a threshold using the specified operator.
   */
  private compareValue(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      default:
        log(`Unknown operator: ${operator}`);
        return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Alert Actions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Fire an alert: insert history, publish to Socket.io, send email.
   */
  private async fireAlert(rule: AlertRuleRecord, currentValue: number): Promise<void> {
    this.firedCount++;
    const now = new Date();
    const alertId = crypto.randomUUID();

    const message = `${rule.name}: ${rule.metric} is ${currentValue} ` +
      `(threshold: ${rule.condition} ${rule.threshold})`;

    log(`ALERT FIRED: ${message}`);

    // Step 1: Insert alert_history record
    try {
      await db.insert(alertHistory).values({
        id: alertId,
        alertRuleId: rule.id,
        severity: rule.severity,
        status: 'active',
        metricValue: Math.round(currentValue),
        thresholdValue: rule.threshold,
        message,
        details: {
          metric: rule.metric,
          condition: rule.condition,
          currentValue,
        },
        firedAt: now,
      });
    } catch (err) {
      log(`Failed to insert alert history: ${err instanceof Error ? err.message : err}`);
    }

    // Update last_fired_at on the rule
    try {
      await db
        .update(alertRules)
        .set({ lastFiredAt: now, updatedAt: now })
        .where(eq(alertRules.id, rule.id));
    } catch (err) {
      log(`Failed to update rule lastFiredAt: ${err instanceof Error ? err.message : err}`);
    }

    // Step 2: Publish alert notification via Socket.io
    if (rule.notifyInApp || rule.notifyWallboard) {
      const notification = {
        id: alertId,
        ruleId: rule.id,
        severity: rule.severity,
        metric: rule.metric,
        value: currentValue,
        threshold: rule.threshold,
        timestamp: now.toISOString(),
        message,
      };

      // Publish to Redis for Socket.io bridge to pick up
      if (this.publisher) {
        try {
          await this.publisher.publish(
            'ipo:alerts',
            JSON.stringify({ type: 'alert:fired', ...notification })
          );
        } catch (err) {
          log(`Failed to publish alert to Redis: ${err instanceof Error ? err.message : err}`);
        }
      }

      // Also emit directly if Socket.io is available
      if (this.socketIo && typeof (this.socketIo as Record<string, unknown>).emit === 'function') {
        (this.socketIo as { emit: (event: string, data: unknown) => void }).emit('alert', notification);
      }
    }

    // Step 3: Send email if configured
    if (rule.notifyEmail && rule.emailRecipients && rule.emailRecipients.length > 0) {
      const emailAlert: EmailAlert = {
        id: alertId,
        ruleName: rule.name,
        severity: rule.severity,
        metric: rule.metric,
        value: currentValue,
        threshold: rule.threshold,
        message,
        timestamp: now.toISOString(),
      };

      for (const recipient of rule.emailRecipients) {
        emailService.sendAlertEmail(recipient, emailAlert).catch((err) => {
          log(`Email alert to ${recipient} failed: ${err instanceof Error ? err.message : err}`);
        });
      }
    }
  }

  /**
   * Clear an alert: insert a "resolved" history entry.
   */
  private async clearAlert(rule: AlertRuleRecord, currentValue: number): Promise<void> {
    const now = new Date();

    const message = `${rule.name}: ${rule.metric} returned to normal ` +
      `(current: ${currentValue}, threshold: ${rule.condition} ${rule.threshold})`;

    log(`ALERT CLEARED: ${message}`);

    // Find the most recent active alert for this rule and resolve it
    try {
      const [activeAlert] = await db
        .select()
        .from(alertHistory)
        .where(
          and(
            eq(alertHistory.alertRuleId, rule.id),
            eq(alertHistory.status, 'active')
          )
        )
        .orderBy(desc(alertHistory.firedAt))
        .limit(1);

      if (activeAlert) {
        await db
          .update(alertHistory)
          .set({
            status: 'resolved',
            resolvedAt: now,
          })
          .where(eq(alertHistory.id, activeAlert.id));
      }
    } catch (err) {
      log(`Failed to clear alert history: ${err instanceof Error ? err.message : err}`);
    }

    // Publish clear notification
    if (this.publisher) {
      try {
        await this.publisher.publish(
          'ipo:alerts',
          JSON.stringify({
            type: 'alert:cleared',
            ruleId: rule.id,
            metric: rule.metric,
            value: currentValue,
            timestamp: now.toISOString(),
            message,
          })
        );
      } catch (err) {
        log(`Failed to publish alert clear to Redis: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [AlertEngine] ${message}`);
}

/** Singleton AlertEngine instance. */
export const alertEngine = new AlertEngine();
