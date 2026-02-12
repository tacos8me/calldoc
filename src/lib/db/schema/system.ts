import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  boolean,
  text,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  bigint,
  smallint,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const connectionTypeEnum = pgEnum('connection_type', [
  'devlink3',
  'smdr',
]);

export const connectionStatusEnum = pgEnum('connection_status', [
  'connected',
  'disconnected',
  'connecting',
  'error',
]);

export const alertSeverityEnum = pgEnum('alert_severity', [
  'info',
  'warning',
  'critical',
]);

export const alertStatusEnum = pgEnum('alert_status', [
  'active',
  'acknowledged',
  'resolved',
]);

export const smdrCallDirectionEnum = pgEnum('smdr_call_direction', [
  'inbound',
  'outbound',
  'internal',
]);

// ---------------------------------------------------------------------------
// systems - IP Office connection configs
// ---------------------------------------------------------------------------

export const systems = pgTable(
  'systems',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    // DevLink3 connection
    devlinkHost: varchar('devlink_host', { length: 255 }).notNull(),
    devlinkPort: integer('devlink_port').notNull().default(50797),
    devlinkUseTls: boolean('devlink_use_tls').notNull().default(false),
    devlinkTlsPort: integer('devlink_tls_port').default(50796),
    devlinkUsername: varchar('devlink_username', { length: 255 }).notNull(),
    devlinkPasswordEncrypted: text('devlink_password_encrypted').notNull(),
    // SMDR connection
    smdrHost: varchar('smdr_host', { length: 255 }),
    smdrPort: integer('smdr_port').default(1150),
    smdrEnabled: boolean('smdr_enabled').notNull().default(true),
    // General
    timezone: varchar('timezone', { length: 64 }).default('UTC'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('systems_name_idx').on(table.name),
    index('systems_active_idx').on(table.active),
  ]
);

// ---------------------------------------------------------------------------
// system_status - Connection health monitoring
// ---------------------------------------------------------------------------

export const systemStatus = pgTable(
  'system_status',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    systemId: uuid('system_id')
      .notNull()
      .references(() => systems.id, { onDelete: 'cascade' }),
    connectionType: connectionTypeEnum('connection_type').notNull(),
    status: connectionStatusEnum('status').notNull().default('disconnected'),
    lastConnectedAt: timestamp('last_connected_at', { withTimezone: true }),
    lastDisconnectedAt: timestamp('last_disconnected_at', { withTimezone: true }),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
    lastErrorMessage: text('last_error_message'),
    reconnectAttempts: integer('reconnect_attempts').notNull().default(0),
    eventsReceived: bigint('events_received', { mode: 'number' }).notNull().default(0),
    uptime: integer('uptime').default(0),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('system_status_system_conn_type_idx').on(table.systemId, table.connectionType),
    index('system_status_system_id_idx').on(table.systemId),
    index('system_status_status_idx').on(table.status),
  ]
);

// ---------------------------------------------------------------------------
// alert_rules - Threshold-based alert configurations
// ---------------------------------------------------------------------------

export const alertRules = pgTable(
  'alert_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    metric: varchar('metric', { length: 128 }).notNull(),
    condition: varchar('condition', { length: 16 }).notNull(),
    threshold: integer('threshold').notNull(),
    severity: alertSeverityEnum('severity').notNull().default('warning'),
    evaluationWindow: varchar('evaluation_window', { length: 32 }).default('immediate'),
    cooldownMinutes: integer('cooldown_minutes').notNull().default(15),
    // Notification channels
    notifyInApp: boolean('notify_in_app').notNull().default(true),
    notifyEmail: boolean('notify_email').notNull().default(false),
    notifyWallboard: boolean('notify_wallboard').notNull().default(false),
    emailRecipients: jsonb('email_recipients').$type<string[]>().default([]),
    // Targeting
    targetGroups: jsonb('target_groups').$type<string[]>().default([]),
    targetAgents: jsonb('target_agents').$type<string[]>().default([]),
    isBuiltIn: boolean('is_built_in').notNull().default(false),
    active: boolean('active').notNull().default(true),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    lastFiredAt: timestamp('last_fired_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('alert_rules_metric_idx').on(table.metric),
    index('alert_rules_severity_idx').on(table.severity),
    index('alert_rules_active_idx').on(table.active),
    index('alert_rules_created_by_idx').on(table.createdBy),
  ]
);

// ---------------------------------------------------------------------------
// alert_history - Fired alert log
// ---------------------------------------------------------------------------

export const alertHistory = pgTable(
  'alert_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    alertRuleId: uuid('alert_rule_id')
      .notNull()
      .references(() => alertRules.id, { onDelete: 'cascade' }),
    severity: alertSeverityEnum('severity').notNull(),
    status: alertStatusEnum('status').notNull().default('active'),
    metricValue: integer('metric_value').notNull(),
    thresholdValue: integer('threshold_value').notNull(),
    message: text('message').notNull(),
    details: jsonb('details').$type<Record<string, unknown>>(),
    acknowledgedBy: uuid('acknowledged_by').references(() => users.id, { onDelete: 'set null' }),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    firedAt: timestamp('fired_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('alert_history_alert_rule_id_idx').on(table.alertRuleId),
    index('alert_history_severity_idx').on(table.severity),
    index('alert_history_status_idx').on(table.status),
    index('alert_history_fired_at_idx').on(table.firedAt),
  ]
);

// ---------------------------------------------------------------------------
// trunks - IP Office trunks
// ---------------------------------------------------------------------------

export const trunks = pgTable(
  'trunks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    systemId: uuid('system_id').references(() => systems.id, { onDelete: 'cascade' }),
    externalId: varchar('external_id', { length: 128 }),
    name: varchar('name', { length: 255 }).notNull(),
    trunkType: varchar('trunk_type', { length: 64 }),
    channels: integer('channels').default(0),
    inService: boolean('in_service').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('trunks_system_id_idx').on(table.systemId),
    index('trunks_external_id_idx').on(table.externalId),
    index('trunks_in_service_idx').on(table.inService),
  ]
);

// ---------------------------------------------------------------------------
// trunk_groups - Trunk groupings
// ---------------------------------------------------------------------------

export const trunkGroups = pgTable(
  'trunk_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    systemId: uuid('system_id').references(() => systems.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    trunkIds: jsonb('trunk_ids').$type<string[]>().default([]),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('trunk_groups_system_id_idx').on(table.systemId),
    index('trunk_groups_active_idx').on(table.active),
  ]
);

// ---------------------------------------------------------------------------
// user_preferences - Per-user settings
// ---------------------------------------------------------------------------

export const userPreferences = pgTable(
  'user_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    theme: varchar('theme', { length: 32 }).default('system'),
    colorLegend: jsonb('color_legend').$type<Record<string, string>>(),
    dashboardLayout: jsonb('dashboard_layout').$type<Record<string, unknown>>(),
    defaultDateRange: varchar('default_date_range', { length: 32 }).default('today'),
    timezone: varchar('timezone', { length: 64 }),
    notificationPreferences: jsonb('notification_preferences').$type<Record<string, boolean>>(),
    sidebarCollapsed: boolean('sidebar_collapsed').notNull().default(false),
    tablePageSize: smallint('table_page_size').default(25),
    preferences: jsonb('preferences').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_preferences_user_id_idx').on(table.userId),
  ]
);

// ---------------------------------------------------------------------------
// smdr_records - Raw SMDR records (30+ fields per record)
// ---------------------------------------------------------------------------

export const smdrRecords = pgTable(
  'smdr_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    systemId: uuid('system_id').references(() => systems.id, { onDelete: 'cascade' }),
    // Core SMDR fields
    callId: varchar('call_id', { length: 128 }),
    callStart: timestamp('call_start', { withTimezone: true }).notNull(),
    connectedTime: timestamp('connected_time', { withTimezone: true }),
    ringDuration: integer('ring_duration'),
    callerNumber: varchar('caller_number', { length: 64 }),
    direction: smdrCallDirectionEnum('direction'),
    calledNumber: varchar('called_number', { length: 64 }),
    dialledNumber: varchar('dialled_number', { length: 64 }),
    accountCode: varchar('account_code', { length: 64 }),
    isInternal: boolean('is_internal').notNull().default(false),
    callDuration: integer('call_duration'),
    holdDuration: integer('hold_duration'),
    parkDuration: integer('park_duration'),
    // Device identifiers
    callingPartyDevice: varchar('calling_party_device', { length: 128 }),
    calledPartyDevice: varchar('called_party_device', { length: 128 }),
    // IP Office specific
    continuationRecord: boolean('continuation_record').notNull().default(false),
    externalTargetingCause: varchar('external_targeting_cause', { length: 64 }),
    // Full raw record and parsed fields
    rawRecord: text('raw_record').notNull(),
    parsedFields: jsonb('parsed_fields').$type<Record<string, unknown>>(),
    // Reconciliation
    matchedCallId: uuid('matched_call_id'),
    isReconciled: boolean('is_reconciled').notNull().default(false),
    reconciledAt: timestamp('reconciled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('smdr_records_system_id_idx').on(table.systemId),
    index('smdr_records_call_id_idx').on(table.callId),
    index('smdr_records_call_start_idx').on(table.callStart),
    index('smdr_records_caller_number_idx').on(table.callerNumber),
    index('smdr_records_called_number_idx').on(table.calledNumber),
    index('smdr_records_matched_call_id_idx').on(table.matchedCallId),
    index('smdr_records_is_reconciled_idx').on(table.isReconciled),
    index('smdr_records_direction_idx').on(table.direction),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const systemsRelations = relations(systems, ({ many }) => ({
  statuses: many(systemStatus),
  trunks: many(trunks),
  trunkGroups: many(trunkGroups),
  smdrRecords: many(smdrRecords),
}));

export const systemStatusRelations = relations(systemStatus, ({ one }) => ({
  system: one(systems, {
    fields: [systemStatus.systemId],
    references: [systems.id],
  }),
}));

export const alertRulesRelations = relations(alertRules, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [alertRules.createdBy],
    references: [users.id],
  }),
  history: many(alertHistory),
}));

export const alertHistoryRelations = relations(alertHistory, ({ one }) => ({
  alertRule: one(alertRules, {
    fields: [alertHistory.alertRuleId],
    references: [alertRules.id],
  }),
  acknowledgedByUser: one(users, {
    fields: [alertHistory.acknowledgedBy],
    references: [users.id],
  }),
}));

export const trunksRelations = relations(trunks, ({ one }) => ({
  system: one(systems, {
    fields: [trunks.systemId],
    references: [systems.id],
  }),
}));

export const trunkGroupsRelations = relations(trunkGroups, ({ one }) => ({
  system: one(systems, {
    fields: [trunkGroups.systemId],
    references: [systems.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const smdrRecordsRelations = relations(smdrRecords, ({ one }) => ({
  system: one(systems, {
    fields: [smdrRecords.systemId],
    references: [systems.id],
  }),
}));
