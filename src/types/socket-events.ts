// ─── Socket.io Event Types ──────────────────────────────────────────────────
// Source: COMPONENT_ARCHITECTURE.md Section 3.3, VALIDATION_API_CONTRACTS.md Section 5

import type { Call } from './calls';
import type { AgentState } from './agents';
import type { SystemStatus, AlertSeverity } from './system';

/**
 * Events emitted from the server to connected clients.
 * These are typed for use with Socket.io's typed events feature.
 * Source: COMPONENT_ARCHITECTURE.md Section 3.3.
 */
export interface ServerToClientEvents {
  /** A call was created or updated */
  'call:update': (data: Call) => void;
  /** A call has ended */
  'call:end': (data: { id: string }) => void;
  /** An agent's state changed */
  'agent:state': (data: AgentStateUpdate) => void;
  /** Hunt group statistics updated */
  'group:stats': (data: GroupStats) => void;
  /** An alert rule fired */
  'alert': (data: AlertNotification) => void;
  /** System service status changed */
  'system:status': (data: SystemStatus) => void;
  /** A transcription job has started processing */
  'transcription:started': (data: { recordingId: string; transcriptionId: string; jobId: string }) => void;
  /** A transcription job progress update */
  'transcription:progress': (data: { recordingId: string; transcriptionId: string; progress: number }) => void;
  /** A transcription job completed successfully */
  'transcription:completed': (data: { recordingId: string; transcriptionId: string }) => void;
  /** A transcription job failed */
  'transcription:failed': (data: { recordingId: string; transcriptionId: string; error: string }) => void;
}

/**
 * Events emitted from clients to the server.
 * Source: COMPONENT_ARCHITECTURE.md Section 3.3.
 */
export interface ClientToServerEvents {
  /** Subscribe to one or more rooms for real-time updates */
  'subscribe': (rooms: string[]) => void;
  /** Unsubscribe from one or more rooms */
  'unsubscribe': (rooms: string[]) => void;
  /** Heartbeat ping for latency measurement (every 15s) */
  'ping': (data: { timestamp: number }) => void;
}

/**
 * Payload for agent state change events.
 * Sent via 'agent:state' socket event.
 * Source: VALIDATION_API_CONTRACTS.md Section 5.4.
 */
export interface AgentStateUpdate {
  /** Agent identifier */
  id: string;
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
 * Hunt group real-time statistics.
 * Sent via 'group:stats' socket event.
 * Source: VALIDATION_API_CONTRACTS.md Section 5.4.
 */
export interface GroupStats {
  /** Hunt group identifier */
  groupId: string;
  /** Hunt group display name */
  groupName: string;
  /** Number of agents in idle/available state */
  agentsAvailable: number;
  /** Number of agents currently on calls */
  agentsBusy: number;
  /** Number of calls waiting in queue */
  callsWaiting: number;
  /** Longest wait time in seconds for any call in queue */
  longestWait: number;
  /** Current service level percentage (0-100) */
  serviceLevel: number;
}

/**
 * Alert notification payload.
 * Sent via 'alert' socket event when an alert rule fires.
 * Source: VALIDATION_API_CONTRACTS.md Section 5.4.
 */
export interface AlertNotification {
  /** Unique notification identifier */
  id: string;
  /** ID of the alert rule that fired */
  ruleId: string;
  /** Alert severity level */
  severity: AlertSeverity;
  /** Metric that triggered the alert */
  metric: string;
  /** Current metric value */
  value: number;
  /** Threshold that was exceeded */
  threshold: number;
  /** ISO timestamp when the alert fired */
  timestamp: string;
  /** Human-readable alert message */
  message: string;
}
