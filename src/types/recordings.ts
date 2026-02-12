// ─── Recording Domain Types ─────────────────────────────────────────────────
// Source: COMPONENT_ARCHITECTURE.md Section 7, VALIDATION_API_CONTRACTS.md,
//         Recording_Integration_Spec.md

import type { CallDirection } from './calls';

/**
 * Recording audio format.
 * Fixed from the original 3-value union: only 'wav' and 'opus' are supported.
 */
export type RecordingFormat = 'wav' | 'opus';

/**
 * A recording of a call with associated metadata.
 * Source: COMPONENT_ARCHITECTURE.md Section 7 (format field corrected).
 */
export interface Recording {
  /** Unique recording identifier */
  id: string;
  /** Associated call identifier */
  callId: string;
  /** ID of the agent who handled the call */
  agentId: string | null;
  /** Display name of the handling agent */
  agentName: string | null;
  /** Originating phone number */
  callerNumber: string;
  /** Destination phone number */
  calledNumber: string;
  /** Call direction */
  direction: CallDirection;
  /** ISO timestamp of recording start */
  startTime: string;
  /** ISO timestamp of recording end */
  endTime: string;
  /** Duration in seconds */
  duration: number;
  /** File size in bytes */
  fileSize: number;
  /** Audio format (wav or opus only) */
  format: RecordingFormat;
  /** Storage pool ID where file is stored */
  storagePool: string;
  /** Relative file path within the storage pool */
  storagePath: string;
  /** Whether a QA scorecard has been submitted */
  hasScorecard: boolean;
  /** Aggregate QA score (0-100) or null if unscored */
  score: number | null;
  /** User-applied tags */
  tags: string[];
  /** ISO date for retention policy expiration */
  retainUntil: string;
}

/**
 * A timestamped annotation on a recording.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 (distinct from CallNote
 * because recording notes are pinned to a position in the audio).
 */
export interface RecordingNote {
  /** Unique note identifier */
  id: string;
  /** Parent recording identifier */
  recordingId: string;
  /** ID of the user who created the note */
  userId: string;
  /** Display name of the note author */
  userName: string;
  /** Milliseconds from recording start (audio position) */
  timestampMs: number;
  /** Note text content */
  text: string;
  /** ISO timestamp of note creation */
  createdAt: string;
}

/**
 * A QA scorecard evaluation for a recording.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface ScoreCard {
  /** Unique scorecard identifier */
  id: string;
  /** Parent recording identifier */
  recordingId: string;
  /** ID of the evaluator who scored the recording */
  evaluatorId: string;
  /** Display name of the evaluator */
  evaluatorName: string;
  /** ISO timestamp when evaluation was submitted */
  evaluatedAt: string;
  /** Overall score (0-100) */
  overallScore: number;
  /** Scored categories */
  categories: ScoreCategory[];
  /** General comments from the evaluator */
  comments: string | null;
}

/**
 * A category within a QA scorecard (e.g., "Greeting", "Problem Resolution").
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface ScoreCategory {
  /** Category name */
  name: string;
  /** Weight of this category (0-1, all weights should sum to 1) */
  weight: number;
  /** Score for this category (0-100) */
  score: number;
  /** Individual criteria within this category */
  criteria: ScoreCriterion[];
}

/**
 * A single criterion within a scorecard category.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface ScoreCriterion {
  /** Criterion label */
  label: string;
  /** Score for this criterion (0-100) */
  score: number;
  /** Optional evaluator comment */
  comment: string | null;
}

/**
 * A template for QA scorecards, defining the questions and structure.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 item 16 (DB: scorecard_templates).
 */
export interface ScorecardTemplate {
  /** Unique template identifier */
  id: string;
  /** Template name */
  name: string;
  /** Description of this scorecard template */
  description: string | null;
  /** JSON structure defining the questions, categories, weights, and criteria */
  questionsJson: ScorecardTemplateQuestion[];
  /** ID of the user who created the template */
  createdBy: string;
  /** Whether this template is currently active */
  active: boolean;
  /** ISO timestamp of template creation */
  createdAt: string;
}

/**
 * A question/category definition within a scorecard template.
 */
export interface ScorecardTemplateQuestion {
  /** Category name */
  category: string;
  /** Weight of this category (0-1) */
  weight: number;
  /** Individual criteria labels within this category */
  criteria: string[];
}

/**
 * Recording rule trigger types.
 * Source: Recording_Integration_Spec.md Section 6 (7 rule types).
 */
export type RecordingRuleType =
  | 'all-calls'
  | 'inbound-only'
  | 'outbound-only'
  | 'group'
  | 'agent'
  | 'trunk'
  | 'scheduled';

/**
 * A rule that defines when calls should be automatically recorded.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 item 17.
 */
export interface RecordingRule {
  /** Unique rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Trigger type for this rule */
  type: RecordingRuleType;
  /** JSON structure defining conditions (groups, agents, trunks, schedule) */
  conditionsJson: RecordingRuleCondition;
  /** Percentage of matching calls to record (0-100) */
  recordPercent: number;
  /** Rule priority (lower number = higher priority) */
  priority: number;
  /** Whether this rule is currently active */
  active: boolean;
}

/**
 * Conditions for a recording rule, stored as JSON.
 */
export interface RecordingRuleCondition {
  /** Hunt group IDs to match */
  groups?: string[];
  /** Agent IDs to match */
  agents?: string[];
  /** Trunk IDs to match */
  trunks?: string[];
  /** Schedule: days of week (0=Sun, 6=Sat) */
  daysOfWeek?: number[];
  /** Schedule: start time (HH:mm) */
  startTime?: string;
  /** Schedule: end time (HH:mm) */
  endTime?: string;
  /** Minimum call duration in seconds before recording starts */
  minDuration?: number;
}

/**
 * Storage pool type for recording storage.
 */
export type StoragePoolType = 'local' | 's3';

/**
 * A storage pool configuration for recording files.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 item 18 (DB: recording_storage_pools).
 */
export interface StoragePool {
  /** Unique pool identifier */
  id: string;
  /** Pool display name */
  name: string;
  /** Storage backend type */
  type: StoragePoolType;
  /** Backend-specific configuration (path for local, bucket/region/credentials for S3) */
  config: StoragePoolConfig;
  /** Maximum storage capacity in bytes */
  maxSizeBytes: number;
  /** Current used storage in bytes */
  usedBytes: number;
  /** Number of days to retain recordings before automatic deletion */
  retentionDays: number;
}

/**
 * Storage pool backend configuration.
 */
export interface StoragePoolConfig {
  /** Local filesystem path (for 'local' type) */
  path?: string;
  /** S3 bucket name (for 's3' type) */
  bucket?: string;
  /** S3 region (for 's3' type) */
  region?: string;
  /** S3 access key ID (for 's3' type) */
  accessKeyId?: string;
  /** S3 secret access key (for 's3' type) */
  secretAccessKey?: string;
  /** S3 endpoint URL for S3-compatible storage (for 's3' type) */
  endpoint?: string;
}

/**
 * A time-limited share link for a recording.
 * Source: VALIDATION_API_CONTRACTS.md Section 3 (DB: recording_share_links).
 */
export interface RecordingShareLink {
  /** Unique link identifier */
  id: string;
  /** Parent recording identifier */
  recordingId: string;
  /** Unique share token for URL construction */
  token: string;
  /** ISO timestamp when this link expires */
  expiresAt: string;
  /** ID of the user who created the share link */
  createdBy: string;
  /** ISO timestamp of link creation */
  createdAt: string;
}
