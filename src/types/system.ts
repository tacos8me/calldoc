// ─── System Domain Types ────────────────────────────────────────────────────
// Source: VALIDATION_API_CONTRACTS.md Sections 2-3

/**
 * System connection types supported by CallDoc.
 */
export type SystemConnectionType = 'devlink3' | 'smdr';

/**
 * Connection health status values.
 */
export type SystemConnectionStatus = 'connected' | 'disconnected' | 'error';

/**
 * A configured connection to an Avaya IP Office system.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 item 14 (DB: systems).
 */
export interface SystemConnection {
  /** Unique connection identifier */
  id: string;
  /** Display name for this connection */
  name: string;
  /** Connection protocol type */
  type: SystemConnectionType;
  /** Hostname or IP address of the IP Office system */
  host: string;
  /** TCP port number */
  port: number;
  /** Authentication username */
  username: string;
  /** Authentication password (write-only in API responses) */
  password: string;
  /** Whether this connection is enabled */
  enabled: boolean;
  /** Current connection status */
  status: SystemConnectionStatus;
}

/**
 * Real-time status of a system service.
 * Source: VALIDATION_API_CONTRACTS.md Section 5.1 (Socket.io event: system:status).
 */
export interface SystemStatus {
  /** Service name (e.g., 'devlink3', 'smdr', 'redis', 'postgres') */
  service: string;
  /** Current connection status */
  status: SystemConnectionStatus;
  /** ISO timestamp of last health check */
  lastChecked: string;
  /** Additional status details (uptime, event rate, error message, etc.) */
  details: Record<string, unknown>;
}

/**
 * Alert severity levels.
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Comparison operators for alert metric evaluation.
 */
export type AlertOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';

/**
 * Actions to take when an alert fires.
 */
export type AlertAction = 'email' | 'socket' | 'webhook';

/**
 * A rule that defines when an alert should fire.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 item 8 (DB: alert_rules).
 */
export interface AlertRule {
  /** Unique rule identifier */
  id: string;
  /** Rule display name */
  name: string;
  /** Metric to monitor (e.g., 'queue.longest_wait', 'agents.idle_count') */
  metric: string;
  /** Comparison operator */
  operator: AlertOperator;
  /** Threshold value that triggers the alert */
  threshold: number;
  /** Alert severity when fired */
  severity: AlertSeverity;
  /** Actions to execute when the alert fires */
  actions: AlertAction[];
  /** Whether this rule is currently active */
  enabled: boolean;
}

/**
 * A historical record of a fired alert.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 item 9 (DB: alert_history).
 */
export interface AlertHistory {
  /** Unique history entry identifier */
  id: string;
  /** ID of the alert rule that fired */
  ruleId: string;
  /** ISO timestamp when the alert fired */
  firedAt: string;
  /** Metric value at the time of firing */
  value: number;
  /** Human-readable alert message */
  message: string;
  /** Whether this alert has been acknowledged by a user */
  acknowledged: boolean;
}

/**
 * A hunt group (ACD queue) on the IP Office system.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 item 10 (DB: hunt_groups).
 */
export interface HuntGroup {
  /** Unique hunt group identifier */
  id: string;
  /** Hunt group display name */
  name: string;
  /** Hunt group extension number */
  number: string;
  /** Number of agents assigned to this group */
  memberCount: number;
}

/**
 * A trunk line on the IP Office system.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 item 11 (DB: trunks).
 */
export interface Trunk {
  /** Unique trunk identifier */
  id: string;
  /** Trunk display name */
  name: string;
  /** Trunk number */
  number: string;
  /** Trunk type (e.g., 'sip', 'isdn', 'analog') */
  type: string;
  /** ID of the trunk group this trunk belongs to */
  trunkGroupId: string | null;
  /** Current trunk status */
  status: 'idle' | 'busy' | 'error' | 'disabled';
  /** Number of available channels */
  channels: number;
  /** Number of channels currently in use */
  channelsInUse: number;
}

/**
 * A logical grouping of trunks.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 item 11 (DB: trunk_groups).
 */
export interface TrunkGroup {
  /** Unique trunk group identifier */
  id: string;
  /** Trunk group display name */
  name: string;
  /** Number of trunks in this group */
  trunkCount: number;
  /** Total channels across all trunks in this group */
  totalChannels: number;
}

/**
 * SAML SSO configuration.
 * Source: VALIDATION_API_CONTRACTS.md Section 2 item 13 (DB: saml_configs).
 */
export interface SamlConfig {
  /** Unique configuration identifier */
  id: string;
  /** IdP SSO entry point URL */
  entryPoint: string;
  /** SP entity ID / issuer */
  issuer: string;
  /** Assertion Consumer Service callback URL */
  callbackUrl: string;
  /** IdP signing certificate (PEM format) */
  cert: string;
  /** Mapping of SAML attributes to user fields */
  attributeMapping: SamlAttributeMapping;
}

/**
 * SAML attribute mapping from IdP claims to user properties.
 */
export interface SamlAttributeMapping {
  /** SAML attribute for user email */
  email: string;
  /** SAML attribute for user display name */
  name: string;
  /** SAML attribute for user role (optional) */
  role?: string;
  /** SAML attribute for group access (optional) */
  groups?: string;
}
