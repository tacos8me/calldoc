// ─── User & Auth Domain Types ───────────────────────────────────────────────
// Source: COMPONENT_ARCHITECTURE.md Section 7, VALIDATION_API_CONTRACTS.md

/**
 * User roles with descending privilege levels.
 * Source: COMPONENT_ARCHITECTURE.md Section 7 (canonical naming).
 */
export type UserRole = 'admin' | 'supervisor' | 'agent' | 'wallboard-only';

/**
 * Granular permission identifiers.
 * 17 original permissions from CA + 4 new permissions from VALIDATION Section 6.4:
 * 'alerts:view', 'alerts:manage', 'admin:skills', 'admin:connections'.
 */
export type Permission =
  | 'calls:view'
  | 'calls:cradle-to-grave'
  | 'reports:view'
  | 'reports:create'
  | 'reports:export'
  | 'recordings:view'
  | 'recordings:playback'
  | 'recordings:download'
  | 'recordings:delete'
  | 'recordings:score'
  | 'recordings:manage-rules'
  | 'wallboards:view'
  | 'wallboards:edit'
  | 'agents:view'
  | 'agents:change-state'
  | 'admin:users'
  | 'admin:settings'
  | 'admin:storage'
  | 'alerts:view'
  | 'alerts:manage'
  | 'admin:skills'
  | 'admin:connections';

/**
 * A user account in the system.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User email address (also used for login) */
  email: string;
  /** Display name */
  name: string;
  /** Role determining base privilege level */
  role: UserRole;
  /** Permitted hunt group IDs (empty array = access to all groups) */
  groupAccess: string[];
  /** Granular permissions assigned to this user */
  permissions: Permission[];
  /** ISO timestamp of last successful login */
  lastLoginAt: string | null;
  /** ISO timestamp of account creation */
  createdAt: string;
  /** Whether the account is active */
  active: boolean;
  /** SSO provider identifier, or null for local authentication */
  ssoProvider: string | null;
}

/**
 * A user preference key-value pair.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 item 19 (DB: user_preferences).
 */
export interface UserPreference {
  /** Unique preference identifier */
  id: string;
  /** ID of the user this preference belongs to */
  userId: string;
  /** Preference key (e.g., 'theme', 'color-legend', 'sidebar-collapsed') */
  key: string;
  /** Serialized preference value */
  valueJson: unknown;
}

/**
 * An active user session.
 * Used internally for session management.
 */
export interface Session {
  /** Unique session identifier */
  id: string;
  /** ID of the authenticated user */
  userId: string;
  /** User's role at the time of session creation */
  role: UserRole;
  /** User's permissions at the time of session creation */
  permissions: Permission[];
  /** User's permitted group IDs */
  groupAccess: string[];
  /** ISO timestamp of session creation */
  createdAt: string;
  /** ISO timestamp when the session expires */
  expiresAt: string;
}
