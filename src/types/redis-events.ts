// ─── Redis Pub/Sub Event Types ──────────────────────────────────────────────
// Source: COMPONENT_ARCHITECTURE.md Section 3.3, VALIDATION_API_CONTRACTS.md Section 5.3
// These types define the internal message format published by the DevLink3Connector
// to Redis channels, consumed by the Socket.io server.

import type { Call } from './calls';
import type { AgentState } from './agents';

/**
 * Redis channel name constants.
 * Source: COMPONENT_ARCHITECTURE.md Section 3.3.
 */
export const REDIS_CHANNELS = {
  /** Call lifecycle events (create, update, end) */
  calls: 'ipo:calls',
  /** Agent state change events */
  agents: 'ipo:agents',
  /** Hunt group statistics updates */
  groups: 'ipo:groups',
  /** Raw SMDR records from TCP listener, consumed by SmdrWriter */
  smdr: 'ipo:smdr',
  /** Transcription lifecycle events (started, progress, completed, failed) */
  transcriptions: 'ipo:transcriptions',
} as const;

export type RedisChannel = (typeof REDIS_CHANNELS)[keyof typeof REDIS_CHANNELS];

/**
 * Call event types published to the calls channel.
 */
export type CallEventMessageType = 'call:created' | 'call:updated' | 'call:ended';

/**
 * Message published to the ipo:calls Redis channel.
 */
export interface CallEventMessage {
  /** Event type */
  type: CallEventMessageType;
  /** Call identifier */
  callId: string;
  /** Call data (full Call object for created/updated, partial for ended) */
  data: Partial<Call>;
  /** ISO timestamp when the event was published */
  timestamp: string;
}

/**
 * Message published to the ipo:agents Redis channel.
 */
export interface AgentStateMessage {
  /** Event type discriminator */
  type: 'agent:state_changed';
  /** Agent identifier */
  agentId: string;
  /** Agent's phone extension */
  extension: string;
  /** State before the transition */
  previousState: AgentState;
  /** New current state */
  newState: AgentState;
  /** ISO timestamp of the state change */
  timestamp: string;
  /** Associated call ID (if state change is call-related) */
  callId: string | null;
}

/**
 * Message published to the ipo:groups Redis channel.
 */
export interface GroupStatsMessage {
  /** Event type discriminator */
  type: 'group:stats_updated';
  /** Hunt group identifier */
  groupId: string;
  /** Number of calls waiting in queue */
  callsWaiting: number;
  /** Longest wait time in seconds */
  longestWait: number;
  /** Number of agents in idle/available state */
  agentsAvailable: number;
  /** Number of agents currently on calls */
  agentsBusy: number;
}

/**
 * Transcription event types published to the transcriptions channel.
 */
export type TranscriptionEventMessageType =
  | 'transcription:started'
  | 'transcription:progress'
  | 'transcription:completed'
  | 'transcription:failed';

/**
 * Message published to the ipo:transcriptions Redis channel.
 */
export interface TranscriptionEventMessage {
  /** Event type discriminator */
  type: TranscriptionEventMessageType;
  /** Parent recording identifier */
  recordingId: string;
  /** Transcription identifier */
  transcriptionId: string;
  /** Parakeet job ID (for started events) */
  jobId?: string;
  /** Processing progress 0-100 (for progress events) */
  progress?: number;
  /** Error message (for failed events) */
  error?: string;
  /** ISO timestamp when the event was published */
  timestamp: string;
}

/**
 * Union of all Redis pub/sub message types.
 */
export type RedisMessage = CallEventMessage | AgentStateMessage | GroupStatsMessage | TranscriptionEventMessage;
