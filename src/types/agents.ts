// ─── Agent Domain Types ─────────────────────────────────────────────────────
// Source: COMPONENT_ARCHITECTURE.md Section 7, VALIDATION_API_CONTRACTS.md,
//         FRONTEND_UX_SPEC.md Section 4.2

/**
 * Canonical agent states.
 * Unified from CA Section 7 and UX spec. Uses 'idle' (not 'available'),
 * 'talking' (not 'busy'), 'acw' (not 'wrap') per UX naming convention.
 */
export type AgentState =
  | 'idle'
  | 'talking'
  | 'ringing'
  | 'hold'
  | 'acw'
  | 'dnd'
  | 'away'
  | 'logged-out'
  | 'unknown';

/**
 * Agent event types from DevLink3 agent events.
 * Source: VALIDATION_API_CONTRACTS.md Section 4.3 (AgentLogin through AgentMCW).
 */
export type AgentEventType =
  | 'login'
  | 'logout'
  | 'ready'
  | 'not-ready'
  | 'dnd'
  | 'acw'
  | 'mcw';

/**
 * Timeline event types for the agent timeline visualization.
 * The richest set of 19 event types from UX spec Section 4.2 color mapping.
 */
export type TimelineEventType =
  | 'idle'
  | 'ringing'
  | 'talking'
  | 'hold'
  | 'park'
  | 'queue'
  | 'transfer'
  | 'transfer-hold'
  | 'dialing'
  | 'conference'
  | 'voicemail'
  | 'auto-attendant'
  | 'overflow'
  | 'dnd'
  | 'acw'
  | 'listen'
  | 'calling-drop'
  | 'receiving-drop'
  | 'busy';

/**
 * An agent with their current real-time state.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface Agent {
  /** Unique agent identifier */
  id: string;
  /** Agent's phone extension */
  extension: string;
  /** Agent display name */
  name: string;
  /** Current agent state */
  state: AgentState;
  /** ISO timestamp when the current state began */
  stateStartTime: string;
  /** Seconds in the current state (updated in real time) */
  stateDuration: number;
  /** ID of the active call, if any */
  activeCallId: string | null;
  /** Hunt group IDs this agent belongs to */
  groups: string[];
  /** Skill tags assigned to this agent */
  skills: string[];
  /** ISO timestamp of last login */
  loginTime: string | null;
}

/**
 * A single entry in an agent's state timeline.
 * Used for the agent timeline visualization and state history queries.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface AgentTimelineEntry {
  /** Agent identifier */
  agentId: string;
  /** The state during this time segment */
  state: AgentState;
  /** ISO timestamp of segment start */
  startTime: string;
  /** ISO timestamp of segment end */
  endTime: string;
  /** Duration of the segment in seconds */
  duration: number;
  /** Associated call ID if the agent was on a call */
  callId: string | null;
  /** Reason code for away/dnd states */
  reason: string | null;
}
