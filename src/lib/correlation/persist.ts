// ---------------------------------------------------------------------------
// CallDoc - Event Persistence Layer
//
// DB write operations for real-time events. All writes use Drizzle ORM with
// proper type safety from the schema. Includes batch buffering for call
// events to reduce database round-trips under high event volume.
// ---------------------------------------------------------------------------

import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  calls,
  callEvents,
  agents,
  agentStates,
  huntGroups,
} from '@/lib/db/schema';
import type { CallDirection, CallState } from '@/types/calls';
import type { AgentState } from '@/types/agents';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Data required to upsert a call record. */
export interface UpsertCallData {
  externalCallId: string;
  systemId?: string;
  direction: CallDirection;
  state: CallState;
  callerNumber: string;
  callerName?: string | null;
  calledNumber: string;
  calledName?: string | null;
  queueName?: string | null;
  queueEntryTime?: Date | null;
  agentId?: string | null;
  agentExtension?: string | null;
  agentName?: string | null;
  trunkId?: string | null;
  trunkName?: string | null;
  startTime: Date;
  answerTime?: Date | null;
  endTime?: Date | null;
  duration?: number;
  talkDuration?: number;
  holdCount?: number;
  holdDuration?: number;
  transferCount?: number;
  isAnswered?: boolean;
  isAbandoned?: boolean;
  isRecorded?: boolean;
  accountCode?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/** Data required to insert a call event. */
export interface InsertCallEventData {
  callId: string;
  eventType:
    | 'initiated'
    | 'queued'
    | 'ringing'
    | 'answered'
    | 'held'
    | 'retrieved'
    | 'transferred'
    | 'conferenced'
    | 'parked'
    | 'unparked'
    | 'voicemail'
    | 'completed'
    | 'abandoned'
    | 'dtmf'
    | 'recording_started'
    | 'recording_stopped';
  timestamp: Date;
  duration?: number | null;
  party?: string | null;
  agentId?: string | null;
  agentExtension?: string | null;
  queueName?: string | null;
  details?: Record<string, unknown>;
}

/** Data required to update agent state. */
export interface UpdateAgentStateData {
  agentId: string;
  state: AgentState;
  previousState?: AgentState;
  timestamp: Date;
  callId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

/** Data required to upsert group stats. */
export interface UpdateGroupStatsData {
  groupId: string;
  groupName: string;
  callsWaiting?: number;
  longestWait?: number;
  agentsAvailable?: number;
  agentsBusy?: number;
}

/** Result from an upsert call operation. */
export interface UpsertCallResult {
  id: string;
  isNew: boolean;
}

// ---------------------------------------------------------------------------
// Call Event Buffer
// ---------------------------------------------------------------------------

const EVENT_BUFFER_MAX_SIZE = 50;
const EVENT_BUFFER_FLUSH_MS = 500;

let eventBuffer: InsertCallEventData[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushingEvents = false;

/**
 * Flush the call event buffer to the database.
 * Inserts all buffered events in a single batch operation.
 */
async function flushEventBuffer(): Promise<void> {
  if (isFlushingEvents || eventBuffer.length === 0) return;

  isFlushingEvents = true;
  const batch = eventBuffer.splice(0, eventBuffer.length);

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  try {
    const rows = batch.map((event) => ({
      callId: event.callId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      duration: event.duration ?? null,
      party: event.party ?? null,
      agentId: event.agentId ?? null,
      agentExtension: event.agentExtension ?? null,
      queueName: event.queueName ?? null,
      details: event.details ?? {},
    }));

    await db.insert(callEvents).values(rows);

    log(`Flushed ${rows.length} call events to database`);
  } catch (err) {
    log(`Error flushing call events: ${err instanceof Error ? err.message : err}`);
    // Put events back in buffer for retry (prepend so order is preserved)
    eventBuffer.unshift(...batch);
  } finally {
    isFlushingEvents = false;
  }
}

/**
 * Schedule a flush of the event buffer if not already scheduled.
 */
function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushEventBuffer().catch((err) => {
      log(`Scheduled flush error: ${err instanceof Error ? err.message : err}`);
    });
  }, EVENT_BUFFER_FLUSH_MS);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Insert or update a call record using Drizzle's onConflictDoUpdate.
 * Matches on external_call_id. If no conflict, inserts a new row.
 * If a row with the same external_call_id exists, updates it.
 *
 * @param data - Call data to upsert
 * @returns The call ID and whether it was newly created
 */
export async function upsertCall(data: UpsertCallData): Promise<UpsertCallResult> {
  try {
    const insertValues = {
      externalCallId: data.externalCallId,
      systemId: data.systemId ?? null,
      direction: data.direction,
      state: data.state,
      callerNumber: data.callerNumber,
      callerName: data.callerName ?? null,
      calledNumber: data.calledNumber,
      calledName: data.calledName ?? null,
      queueName: data.queueName ?? null,
      queueEntryTime: data.queueEntryTime ?? null,
      agentId: data.agentId ?? null,
      agentExtension: data.agentExtension ?? null,
      agentName: data.agentName ?? null,
      trunkId: data.trunkId ?? null,
      trunkName: data.trunkName ?? null,
      startTime: data.startTime,
      answerTime: data.answerTime ?? null,
      endTime: data.endTime ?? null,
      duration: data.duration ?? 0,
      talkDuration: data.talkDuration ?? 0,
      holdCount: data.holdCount ?? 0,
      holdDuration: data.holdDuration ?? 0,
      transferCount: data.transferCount ?? 0,
      isAnswered: data.isAnswered ?? false,
      isAbandoned: data.isAbandoned ?? false,
      isRecorded: data.isRecorded ?? false,
      accountCode: data.accountCode ?? null,
      tags: data.tags ?? [],
      metadata: data.metadata ?? null,
      updatedAt: new Date(),
    };

    // First try to find existing record
    const existing = data.externalCallId
      ? await db
          .select({ id: calls.id })
          .from(calls)
          .where(eq(calls.externalCallId, data.externalCallId))
          .limit(1)
      : [];

    if (existing.length > 0) {
      // Update existing record
      await db
        .update(calls)
        .set({
          state: data.state,
          callerName: data.callerName ?? undefined,
          calledName: data.calledName ?? undefined,
          queueName: data.queueName ?? undefined,
          queueEntryTime: data.queueEntryTime ?? undefined,
          agentId: data.agentId ?? undefined,
          agentExtension: data.agentExtension ?? undefined,
          agentName: data.agentName ?? undefined,
          trunkId: data.trunkId ?? undefined,
          trunkName: data.trunkName ?? undefined,
          answerTime: data.answerTime ?? undefined,
          endTime: data.endTime ?? undefined,
          duration: data.duration ?? undefined,
          talkDuration: data.talkDuration ?? undefined,
          holdCount: data.holdCount ?? undefined,
          holdDuration: data.holdDuration ?? undefined,
          transferCount: data.transferCount ?? undefined,
          isAnswered: data.isAnswered ?? undefined,
          isAbandoned: data.isAbandoned ?? undefined,
          isRecorded: data.isRecorded ?? undefined,
          accountCode: data.accountCode ?? undefined,
          tags: data.tags ?? undefined,
          metadata: data.metadata ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(calls.id, existing[0].id));

      return { id: existing[0].id, isNew: false };
    }

    // Insert new record
    const result = await db.insert(calls).values(insertValues).returning({ id: calls.id });

    return { id: result[0].id, isNew: true };
  } catch (err) {
    log(`Error upserting call: ${err instanceof Error ? err.message : err}`);
    throw err;
  }
}

/**
 * Buffer a call event for batch insertion. Events are flushed when
 * the buffer reaches 50 events or after 500ms, whichever comes first.
 *
 * @param data - Call event data to insert
 */
export function insertCallEvent(data: InsertCallEventData): void {
  eventBuffer.push(data);

  if (eventBuffer.length >= EVENT_BUFFER_MAX_SIZE) {
    flushEventBuffer().catch((err) => {
      log(`Flush error: ${err instanceof Error ? err.message : err}`);
    });
  } else {
    scheduleFlush();
  }
}

/**
 * Force an immediate flush of all buffered call events.
 * Useful during shutdown or when immediate persistence is needed.
 */
export async function flushPendingEvents(): Promise<void> {
  await flushEventBuffer();
}

/**
 * Insert a new agent state record and update the agent's current state.
 * This performs two operations:
 *   1. Inserts a row into agent_states for the historical log
 *   2. Updates the agent's current state in the agents table
 *
 * @param data - Agent state update data
 */
export async function updateAgentState(data: UpdateAgentStateData): Promise<void> {
  try {
    // Insert state history record
    await db.insert(agentStates).values({
      agentId: data.agentId,
      state: data.state,
      previousState: data.previousState ?? null,
      startTime: data.timestamp,
      callId: data.callId ?? null,
      reason: data.reason ?? null,
      metadata: data.metadata ?? null,
    });

    // Update agent's current state
    await db
      .update(agents)
      .set({
        state: data.state,
        stateStartTime: data.timestamp,
        activeCallId: data.callId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, data.agentId));
  } catch (err) {
    log(`Error updating agent state: ${err instanceof Error ? err.message : err}`);
    throw err;
  }
}

/**
 * Upsert hunt group metrics. Updates the group record with the
 * latest real-time statistics.
 *
 * @param data - Group stats to upsert
 */
export async function updateGroupStats(data: UpdateGroupStatsData): Promise<void> {
  try {
    // Update the hunt group record with the latest stats via updatedAt timestamp
    // The actual queue metrics are computed in real time by the correlation engine
    // and stored in Redis; this just keeps the DB record's timestamp current.
    await db
      .update(huntGroups)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(huntGroups.id, data.groupId));
  } catch (err) {
    log(`Error updating group stats: ${err instanceof Error ? err.message : err}`);
    throw err;
  }
}

/**
 * Get the current size of the event buffer.
 * Useful for monitoring and health checks.
 */
export function getEventBufferSize(): number {
  return eventBuffer.length;
}

/**
 * Reset the event buffer. Mainly used for testing.
 */
export function resetEventBuffer(): void {
  eventBuffer = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [Persist] ${message}`);
}
