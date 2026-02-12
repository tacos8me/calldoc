// ─── Call Domain Types ──────────────────────────────────────────────────────
// Source: COMPONENT_ARCHITECTURE.md Section 7, VALIDATION_API_CONTRACTS.md

/**
 * Represents the full lifecycle state of a call.
 * Extended from the original 9-value union to include 'idle' and 'parked'
 * per DevLink3 wire-level states and UX spec requirements.
 */
export type CallState =
  | 'idle'
  | 'ringing'
  | 'connected'
  | 'hold'
  | 'transferring'
  | 'conferencing'
  | 'queued'
  | 'parked'
  | 'voicemail'
  | 'completed'
  | 'abandoned';

/**
 * Call event types emitted during call lifecycle.
 * 16 original types + 'dequeued' per VALIDATION_API_CONTRACTS.md Section 4.3.
 */
export type CallEventType =
  | 'initiated'
  | 'queued'
  | 'dequeued'
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

/**
 * Call direction relative to the IP Office system.
 */
export type CallDirection = 'inbound' | 'outbound' | 'internal';

/**
 * A call record representing an active or completed call.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface Call {
  /** Unique call reference from IPO */
  id: string;
  /** Direction of the call */
  direction: CallDirection;
  /** Current call state */
  state: CallState;
  /** Originating phone number */
  callerNumber: string;
  /** Originating caller display name */
  callerName: string | null;
  /** Destination phone number */
  calledNumber: string;
  /** Destination display name */
  calledName: string | null;
  /** Hunt group name if call was queued */
  queueName: string | null;
  /** ISO timestamp of queue entry */
  queueEntryTime: string | null;
  /** Extension of the handling agent */
  agentExtension: string | null;
  /** Name of the handling agent */
  agentName: string | null;
  /** Trunk identifier used for the call */
  trunkId: string | null;
  /** ISO timestamp of call initiation */
  startTime: string;
  /** ISO timestamp when call was answered */
  answerTime: string | null;
  /** ISO timestamp when call ended */
  endTime: string | null;
  /** Duration in seconds (updated in real time for active calls) */
  duration: number;
  /** Number of times the call was placed on hold */
  holdCount: number;
  /** Total seconds spent on hold */
  holdDuration: number;
  /** Number of times the call was transferred */
  transferCount: number;
  /** Associated recording ID, if recording exists */
  recordingId: string | null;
  /** User-applied tags */
  tags: string[];
}

/**
 * A discrete event in a call's lifecycle.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface CallEvent {
  /** Unique event identifier */
  id: string;
  /** Parent call identifier */
  callId: string;
  /** Event type */
  type: CallEventType;
  /** ISO timestamp of the event */
  timestamp: string;
  /** Duration in seconds for timed events (e.g., hold duration) */
  duration: number | null;
  /** Extension or number of the party involved */
  party: string | null;
  /** Type-specific payload data */
  details: Record<string, unknown>;
}

/**
 * A user-created note attached to a call.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 item 20 (DB table: call_notes).
 */
export interface CallNote {
  /** Unique note identifier */
  id: string;
  /** Parent call identifier */
  callId: string;
  /** ID of the user who created the note */
  userId: string;
  /** Display name of the note author */
  userName: string;
  /** Note text content */
  text: string;
  /** ISO timestamp of note creation */
  createdAt: string;
}
