// ---------------------------------------------------------------------------
// CallDoc - Call Correlation Engine
//
// Reconciles DevLink3 real-time events with SMDR historical records.
// Subscribes to Redis channels for both data sources and performs
// matching based on externalCallId or timestamp+extension proximity.
// ---------------------------------------------------------------------------

import Redis from 'ioredis';
import { eq, and, gte, lte, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { calls, smdrRecords } from '@/lib/db/schema';
import { REDIS_CHANNELS } from '@/types/redis-events';
import type { CallEventMessage } from '@/types/redis-events';
import type { SmdrRecord } from '@/types/smdr';
import type { CallDirection, CallState } from '@/types/calls';
import {
  upsertCall,
  insertCallEvent,
  updateAgentState,
  updateGroupStats,
  flushPendingEvents,
} from './persist';
import type {
  UpsertCallData,
  InsertCallEventData,
} from './persist';
import { agentMappingService } from './agent-mapping';
import { parseDuration } from '@/lib/smdr/parser';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Redis channel for SMDR records written by the SMDR writer. */
const SMDR_CORRELATION_CHANNEL = 'ipo:smdr:correlated';

/** Time window in milliseconds for timestamp+extension matching (+/- 5s). */
const MATCH_WINDOW_MS = 5_000;

/** How often to log stats (ms). */
const STATS_LOG_INTERVAL_MS = 60_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Correlation statistics. */
export interface CorrelationStats {
  /** Total DevLink3 call events received */
  devlinkEventsReceived: number;
  /** Total SMDR records received */
  smdrRecordsReceived: number;
  /** SMDR records matched to existing calls */
  matchedCount: number;
  /** SMDR records with no matching call (created standalone) */
  unmatchedCount: number;
  /** Average match latency in milliseconds */
  avgMatchLatencyMs: number;
  /** Whether the engine is currently running */
  isRunning: boolean;
  /** ISO timestamp of engine start */
  startedAt: string | null;
  /** Total errors encountered */
  errors: number;
}

/** Internal tracking for pending calls awaiting SMDR correlation. */
interface PendingCall {
  callId: string;
  dbCallId: string;
  externalCallId: string;
  extension: string | null;
  startTime: Date;
  receivedAt: number;
}

/** Parsed SMDR correlation message from Redis. */
interface SmdrCorrelationMessage {
  type: string;
  smdrRecordId: string;
  data: SmdrRecord;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// CorrelationEngine
// ---------------------------------------------------------------------------

/**
 * CorrelationEngine reconciles two data streams:
 *
 *   1. DevLink3 real-time call events (ipo:calls channel)
 *      - Provides immediate call state updates
 *      - Creates/updates call records in real time
 *
 *   2. SMDR historical records (ipo:smdr:correlated channel)
 *      - Arrives after call completion (30-60s delay typical)
 *      - Contains authoritative duration, cost, and trunk info
 *
 * Matching strategy:
 *   - Primary: Match SMDR callId to DevLink3 externalCallId
 *   - Secondary: Match by timestamp + extension within a +/-5s window
 *   - Fallback: Create a standalone call record from SMDR data
 */
export class CorrelationEngine {
  private subscriber: Redis | null = null;
  private isRunning = false;
  private startedAt: string | null = null;

  // Pending DevLink3 calls awaiting SMDR correlation
  private pendingCalls: Map<string, PendingCall> = new Map();

  // Stats
  private devlinkEventsReceived = 0;
  private smdrRecordsReceived = 0;
  private matchedCount = 0;
  private unmatchedCount = 0;
  private totalMatchLatencyMs = 0;
  private errors = 0;

  // Timers
  private statsTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the correlation engine.
   * Connects to Redis and subscribes to both call and SMDR channels.
   *
   * @param redisUrl - Redis connection URL
   */
  async start(redisUrl?: string): Promise<void> {
    if (this.isRunning) {
      log('Correlation engine already running');
      return;
    }

    const url = redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379';

    // Initialize agent mapping service
    try {
      await agentMappingService.initialize();
    } catch (err) {
      log(`Agent mapping init warning: ${err instanceof Error ? err.message : err}`);
      // Continue without mappings -- they will be populated as events arrive
    }

    // Create subscriber connection (dedicated for subscribe mode)
    this.subscriber = new Redis(url, {
      retryStrategy: (times) => Math.min(times * 500, 5000),
      maxRetriesPerRequest: null, // Required for subscriber mode
      lazyConnect: true,
    });

    try {
      await this.subscriber.connect();
    } catch (err) {
      log(`Redis connection failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }

    // Subscribe to both channels
    await this.subscriber.subscribe(
      REDIS_CHANNELS.calls,
      SMDR_CORRELATION_CHANNEL
    );

    this.subscriber.on('message', (channel: string, message: string) => {
      this.handleMessage(channel, message).catch((err) => {
        this.errors++;
        log(`Error handling message on ${channel}: ${err instanceof Error ? err.message : err}`);
      });
    });

    // Periodic stats logging
    this.statsTimer = setInterval(() => {
      this.logStats();
    }, STATS_LOG_INTERVAL_MS);

    // Periodic cleanup of stale pending calls (older than 10 minutes)
    this.cleanupTimer = setInterval(() => {
      this.cleanupStalePendingCalls();
    }, 60_000);

    this.isRunning = true;
    this.startedAt = new Date().toISOString();
    log('Correlation engine started');
  }

  /**
   * Stop the correlation engine and clean up resources.
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Flush any pending events
    try {
      await flushPendingEvents();
    } catch (err) {
      log(`Error flushing events on stop: ${err instanceof Error ? err.message : err}`);
    }

    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.subscriber) {
      await this.subscriber.unsubscribe().catch(() => {});
      await this.subscriber.quit().catch(() => {});
      this.subscriber = null;
    }

    this.pendingCalls.clear();
    log('Correlation engine stopped');
  }

  /**
   * Get current correlation statistics.
   */
  getStats(): CorrelationStats {
    const totalMatches = this.matchedCount;
    return {
      devlinkEventsReceived: this.devlinkEventsReceived,
      smdrRecordsReceived: this.smdrRecordsReceived,
      matchedCount: this.matchedCount,
      unmatchedCount: this.unmatchedCount,
      avgMatchLatencyMs: totalMatches > 0
        ? Math.round(this.totalMatchLatencyMs / totalMatches)
        : 0,
      isRunning: this.isRunning,
      startedAt: this.startedAt,
      errors: this.errors,
    };
  }

  // ---------------------------------------------------------------------------
  // Message Routing
  // ---------------------------------------------------------------------------

  /**
   * Route incoming Redis messages to the appropriate handler.
   */
  private async handleMessage(channel: string, message: string): Promise<void> {
    if (channel === REDIS_CHANNELS.calls) {
      await this.handleCallEvent(message);
    } else if (channel === SMDR_CORRELATION_CHANNEL) {
      await this.handleSmdrRecord(message);
    }
  }

  // ---------------------------------------------------------------------------
  // DevLink3 Call Event Processing
  // ---------------------------------------------------------------------------

  /**
   * Handle a DevLink3 call event from the ipo:calls channel.
   * Upserts the call record and inserts a call event.
   */
  private async handleCallEvent(message: string): Promise<void> {
    this.devlinkEventsReceived++;

    let event: CallEventMessage;
    try {
      event = JSON.parse(message) as CallEventMessage;
    } catch {
      log('Failed to parse call event JSON');
      this.errors++;
      return;
    }

    // Skip non-call events (e.g., smdr:record messages published to same channel)
    if (!event.type || !event.type.startsWith('call:')) return;

    const callData = event.data;
    if (!callData) return;

    const externalCallId = event.callId;
    const now = new Date();

    // Resolve agent if extension is present
    let agentId: string | null = null;
    if (callData.agentExtension) {
      try {
        const agent = await agentMappingService.resolveAgent(callData.agentExtension);
        if (agent && !agent.id.startsWith('placeholder-')) {
          agentId = agent.id;
        }
      } catch {
        // Non-critical, continue without agent mapping
      }
    }

    // Build upsert data
    const upsertData: UpsertCallData = {
      externalCallId,
      direction: callData.direction ?? 'inbound',
      state: callData.state ?? 'idle',
      callerNumber: callData.callerNumber ?? '',
      callerName: callData.callerName ?? null,
      calledNumber: callData.calledNumber ?? '',
      calledName: callData.calledName ?? null,
      queueName: callData.queueName ?? null,
      queueEntryTime: callData.queueEntryTime ? new Date(callData.queueEntryTime) : null,
      agentId,
      agentExtension: callData.agentExtension ?? null,
      agentName: callData.agentName ?? null,
      trunkId: callData.trunkId ?? null,
      startTime: callData.startTime ? new Date(callData.startTime) : now,
      answerTime: callData.answerTime ? new Date(callData.answerTime) : null,
      endTime: callData.endTime ? new Date(callData.endTime) : null,
      duration: callData.duration ?? 0,
      holdCount: callData.holdCount ?? 0,
      holdDuration: callData.holdDuration ?? 0,
      transferCount: callData.transferCount ?? 0,
      isAnswered: callData.state === 'connected' || (callData.answerTime != null),
      isAbandoned: callData.state === 'abandoned',
      tags: callData.tags ?? [],
    };

    // Upsert call record
    try {
      const result = await upsertCall(upsertData);

      // Track for SMDR correlation
      this.pendingCalls.set(externalCallId, {
        callId: externalCallId,
        dbCallId: result.id,
        externalCallId,
        extension: callData.agentExtension ?? null,
        startTime: upsertData.startTime,
        receivedAt: Date.now(),
      });

      // Insert call event
      const eventType = this.mapCallEventType(event.type, callData.state);
      if (eventType) {
        const eventData: InsertCallEventData = {
          callId: result.id,
          eventType,
          timestamp: event.timestamp ? new Date(event.timestamp) : now,
          party: callData.callerNumber ?? null,
          agentId,
          agentExtension: callData.agentExtension ?? null,
          queueName: callData.queueName ?? null,
          details: {
            direction: callData.direction,
            state: callData.state,
            externalCallId,
          },
        };

        insertCallEvent(eventData);
      }
    } catch (err) {
      this.errors++;
      log(`Error processing call event: ${err instanceof Error ? err.message : err}`);
    }
  }

  // ---------------------------------------------------------------------------
  // SMDR Record Processing
  // ---------------------------------------------------------------------------

  /**
   * Handle an SMDR record from the ipo:smdr:correlated channel.
   * Attempts to match it to an existing call, then enriches or creates a record.
   */
  private async handleSmdrRecord(message: string): Promise<void> {
    this.smdrRecordsReceived++;

    let parsed: SmdrCorrelationMessage;
    try {
      parsed = JSON.parse(message) as SmdrCorrelationMessage;
    } catch {
      log('Failed to parse SMDR correlation message JSON');
      this.errors++;
      return;
    }

    const smdrData = parsed.data;
    if (!smdrData) return;

    const matchStartTime = Date.now();

    // Strategy 1: Match by external call ID
    let matched = await this.matchByExternalCallId(smdrData, parsed.smdrRecordId);

    // Strategy 2: Match by timestamp + extension window
    if (!matched) {
      matched = await this.matchByTimestampExtension(smdrData, parsed.smdrRecordId);
    }

    // Strategy 3: Create standalone call from SMDR data
    if (!matched) {
      await this.createStandaloneCallFromSmdr(smdrData, parsed.smdrRecordId);
      this.unmatchedCount++;
    } else {
      const matchLatency = Date.now() - matchStartTime;
      this.totalMatchLatencyMs += matchLatency;
      this.matchedCount++;
    }
  }

  /**
   * Attempt to match an SMDR record by its callId to a DevLink3 externalCallId.
   */
  private async matchByExternalCallId(
    smdrData: SmdrRecord,
    smdrRecordId: string
  ): Promise<boolean> {
    const smdrCallId = String(smdrData.callId);

    // Check pending calls map first (fast path)
    const pending = this.pendingCalls.get(smdrCallId);
    if (pending) {
      await this.enrichCallWithSmdr(pending.dbCallId, smdrData, smdrRecordId);
      this.pendingCalls.delete(smdrCallId);
      return true;
    }

    // Check database for matching external_call_id
    try {
      const existing = await db
        .select({ id: calls.id })
        .from(calls)
        .where(eq(calls.externalCallId, smdrCallId))
        .limit(1);

      if (existing.length > 0) {
        await this.enrichCallWithSmdr(existing[0].id, smdrData, smdrRecordId);
        return true;
      }
    } catch (err) {
      log(`Error querying by external call ID: ${err instanceof Error ? err.message : err}`);
      this.errors++;
    }

    return false;
  }

  /**
   * Attempt to match an SMDR record by timestamp + extension within a +/-5s window.
   */
  private async matchByTimestampExtension(
    smdrData: SmdrRecord,
    smdrRecordId: string
  ): Promise<boolean> {
    const callStartDate = smdrData.callStart ? new Date(smdrData.callStart) : null;
    if (!callStartDate || isNaN(callStartDate.getTime())) return false;

    // Determine the extension from SMDR party1Device (e.g., 'E1001' -> '1001')
    const extension = this.extractExtensionFromDevice(smdrData.party1Device);
    if (!extension) return false;

    const windowStart = new Date(callStartDate.getTime() - MATCH_WINDOW_MS);
    const windowEnd = new Date(callStartDate.getTime() + MATCH_WINDOW_MS);

    try {
      const candidates = await db
        .select({ id: calls.id, externalCallId: calls.externalCallId })
        .from(calls)
        .where(
          and(
            gte(calls.startTime, windowStart),
            lte(calls.startTime, windowEnd),
            eq(calls.agentExtension, extension)
          )
        )
        .limit(1);

      if (candidates.length > 0) {
        await this.enrichCallWithSmdr(candidates[0].id, smdrData, smdrRecordId);
        return true;
      }
    } catch (err) {
      log(`Error querying by timestamp+extension: ${err instanceof Error ? err.message : err}`);
      this.errors++;
    }

    return false;
  }

  /**
   * Enrich an existing call record with SMDR data (duration, cost, account code, trunk info).
   * Also marks the SMDR record as reconciled.
   */
  private async enrichCallWithSmdr(
    dbCallId: string,
    smdrData: SmdrRecord,
    smdrRecordId: string
  ): Promise<void> {
    try {
      const connectedTimeSec = parseDuration(smdrData.connectedTime);
      const totalDuration = connectedTimeSec + smdrData.ringTime + smdrData.holdTime + smdrData.parkTime;

      // Update the call record with authoritative SMDR data
      await db
        .update(calls)
        .set({
          duration: totalDuration,
          talkDuration: connectedTimeSec,
          holdDuration: smdrData.holdTime,
          accountCode: smdrData.account || null,
          trunkName: smdrData.party2Name || undefined,
          isAnswered: connectedTimeSec > 0,
          updatedAt: new Date(),
          metadata: {
            smdrRecordId,
            smdrCallCharge: smdrData.callCharge,
            smdrCurrency: smdrData.currency,
            smdrExternalTargetingCause: smdrData.externalTargetingCause,
          },
        })
        .where(eq(calls.id, dbCallId));

      // Mark the SMDR record as reconciled
      await db
        .update(smdrRecords)
        .set({
          matchedCallId: dbCallId,
          isReconciled: true,
          reconciledAt: new Date(),
        })
        .where(eq(smdrRecords.id, smdrRecordId));

    } catch (err) {
      log(`Error enriching call ${dbCallId} with SMDR: ${err instanceof Error ? err.message : err}`);
      this.errors++;
    }
  }

  /**
   * Create a standalone call record from SMDR data when no DevLink3 match is found.
   * This handles cases where DevLink3 was unavailable or the call was missed.
   */
  private async createStandaloneCallFromSmdr(
    smdrData: SmdrRecord,
    smdrRecordId: string
  ): Promise<void> {
    try {
      const connectedTimeSec = parseDuration(smdrData.connectedTime);
      const totalDuration = connectedTimeSec + smdrData.ringTime + smdrData.holdTime + smdrData.parkTime;
      const callStartDate = smdrData.callStart ? new Date(smdrData.callStart) : new Date();
      const endTime = new Date(callStartDate.getTime() + totalDuration * 1000);

      const direction: CallDirection = smdrData.direction === 'I' ? 'inbound' :
        smdrData.isInternal === 1 ? 'internal' : 'outbound';

      const extension = this.extractExtensionFromDevice(smdrData.party1Device);
      let agentId: string | null = null;
      if (extension) {
        try {
          const agent = await agentMappingService.resolveAgent(extension);
          if (agent && !agent.id.startsWith('placeholder-')) {
            agentId = agent.id;
          }
        } catch {
          // Non-critical
        }
      }

      const upsertData: UpsertCallData = {
        externalCallId: String(smdrData.callId),
        direction,
        state: 'completed',
        callerNumber: smdrData.caller || '',
        calledNumber: smdrData.calledNumber || '',
        agentId,
        agentExtension: extension,
        agentName: smdrData.party1Name || null,
        trunkName: smdrData.party2Name || null,
        startTime: callStartDate,
        answerTime: connectedTimeSec > 0
          ? new Date(callStartDate.getTime() + smdrData.ringTime * 1000)
          : null,
        endTime,
        duration: totalDuration,
        talkDuration: connectedTimeSec,
        holdDuration: smdrData.holdTime,
        isAnswered: connectedTimeSec > 0,
        isAbandoned: connectedTimeSec === 0 && direction === 'inbound',
        accountCode: smdrData.account || null,
        metadata: {
          source: 'smdr-only',
          smdrRecordId,
          smdrCallCharge: smdrData.callCharge,
          smdrCurrency: smdrData.currency,
        },
      };

      const result = await upsertCall(upsertData);

      // Mark SMDR record as reconciled
      await db
        .update(smdrRecords)
        .set({
          matchedCallId: result.id,
          isReconciled: true,
          reconciledAt: new Date(),
        })
        .where(eq(smdrRecords.id, smdrRecordId));

    } catch (err) {
      log(`Error creating standalone call from SMDR: ${err instanceof Error ? err.message : err}`);
      this.errors++;
    }
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Map a call event message type + call state to a call event type for persistence.
   */
  private mapCallEventType(
    messageType: string,
    callState?: CallState
  ): InsertCallEventData['eventType'] | null {
    if (messageType === 'call:created') return 'initiated';
    if (messageType === 'call:ended') return 'completed';

    // For call:updated, map based on call state
    switch (callState) {
      case 'ringing':
        return 'ringing';
      case 'connected':
        return 'answered';
      case 'hold':
        return 'held';
      case 'queued':
        return 'queued';
      case 'parked':
        return 'parked';
      case 'transferring':
        return 'transferred';
      case 'conferencing':
        return 'conferenced';
      case 'voicemail':
        return 'voicemail';
      case 'abandoned':
        return 'abandoned';
      case 'completed':
        return 'completed';
      default:
        return null;
    }
  }

  /**
   * Extract an extension number from an SMDR party device field.
   * E.g., 'E1001' -> '1001', 'T9001' -> null (trunk, not an extension).
   */
  private extractExtensionFromDevice(device: string): string | null {
    if (!device || device.length < 2) return null;
    const prefix = device[0].toUpperCase();
    if (prefix !== 'E') return null;
    return device.substring(1);
  }

  /**
   * Clean up stale pending calls that are older than 10 minutes.
   * These are calls that received a DevLink3 event but never got an SMDR match.
   */
  private cleanupStalePendingCalls(): void {
    const staleThreshold = Date.now() - 10 * 60 * 1000; // 10 minutes
    let cleaned = 0;

    for (const [key, pending] of this.pendingCalls) {
      if (pending.receivedAt < staleThreshold) {
        this.pendingCalls.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log(`Cleaned up ${cleaned} stale pending calls`);
    }
  }

  /**
   * Log current correlation stats.
   */
  private logStats(): void {
    const stats = this.getStats();
    log(
      `Stats: devlink=${stats.devlinkEventsReceived} smdr=${stats.smdrRecordsReceived} ` +
      `matched=${stats.matchedCount} unmatched=${stats.unmatchedCount} ` +
      `avgLatency=${stats.avgMatchLatencyMs}ms errors=${stats.errors} ` +
      `pending=${this.pendingCalls.size}`
    );
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

/** Singleton CorrelationEngine instance. */
export const correlationEngine = new CorrelationEngine();

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [Correlation] ${message}`);
}
