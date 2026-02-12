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
  date,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth';
import { calls } from './calls';
import { agents } from './agents';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const recordingFormatEnum = pgEnum('recording_format', ['wav', 'opus']);

export const storagePoolTypeEnum = pgEnum('storage_pool_type', [
  'local',
  'network',
  's3',
]);

export const recordingRuleTypeEnum = pgEnum('recording_rule_type', [
  'agent',
  'group',
  'number',
  'direction',
  'inbound-number-dialed',
  'basic-call-event',
  'advanced',
]);

export const recordingSourceTypeEnum = pgEnum('recording_source_type', [
  'vmpro_ftp',
  'vrtx',
  'devlink3_active',
  'manual_upload',
]);

export const recordingMatchMethodEnum = pgEnum('recording_match_method', [
  'call_id',
  'timestamp_extension',
  'stream_id',
  'manual',
]);

export const pauseEventTypeEnum = pgEnum('pause_event_type', [
  'pause',
  'resume',
  'auto_resume',
]);

// ---------------------------------------------------------------------------
// recording_storage_pools
// ---------------------------------------------------------------------------

export const recordingStoragePools = pgTable(
  'recording_storage_pools',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    poolType: storagePoolTypeEnum('pool_type').notNull(),
    path: varchar('path', { length: 1024 }).notNull(),
    credentialsEncrypted: text('credentials_encrypted'),
    maxSizeBytes: bigint('max_size_bytes', { mode: 'number' }),
    currentSizeBytes: bigint('current_size_bytes', { mode: 'number' }).notNull().default(0),
    writeEnabled: boolean('write_enabled').notNull().default(true),
    deleteEnabled: boolean('delete_enabled').notNull().default(true),
    retentionMinDays: integer('retention_min_days'),
    retentionMaxDays: integer('retention_max_days'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('recording_storage_pools_name_idx').on(table.name),
    index('recording_storage_pools_pool_type_idx').on(table.poolType),
    index('recording_storage_pools_active_idx').on(table.active),
  ]
);

// ---------------------------------------------------------------------------
// recording_rules
// ---------------------------------------------------------------------------

export const recordingRules = pgTable(
  'recording_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    ruleType: recordingRuleTypeEnum('rule_type').notNull(),
    conditionsJson: jsonb('conditions_json').$type<Record<string, unknown>>().notNull(),
    recordPercentage: smallint('record_percentage').notNull().default(100),
    direction: varchar('direction', { length: 32 }),
    storagePoolId: uuid('storage_pool_id').references(() => recordingStoragePools.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').notNull().default(true),
    priority: smallint('priority').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('recording_rules_rule_type_idx').on(table.ruleType),
    index('recording_rules_is_active_idx').on(table.isActive),
    index('recording_rules_priority_idx').on(table.priority),
  ]
);

// ---------------------------------------------------------------------------
// recordings
// ---------------------------------------------------------------------------

export const recordings = pgTable(
  'recordings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    callId: uuid('call_id').references(() => calls.id, { onDelete: 'set null' }),
    agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
    storagePoolId: uuid('storage_pool_id')
      .notNull()
      .references(() => recordingStoragePools.id, { onDelete: 'restrict' }),
    storagePath: varchar('storage_path', { length: 1024 }).notNull(),
    fileName: varchar('file_name', { length: 512 }).notNull(),
    originalFormat: recordingFormatEnum('original_format').notNull(),
    storedFormat: recordingFormatEnum('stored_format').notNull(),
    codec: varchar('codec', { length: 64 }),
    sampleRate: integer('sample_rate'),
    channels: smallint('channels').default(1),
    duration: integer('duration').notNull().default(0),
    durationMs: integer('duration_ms').notNull().default(0),
    fileSize: bigint('file_size', { mode: 'number' }).notNull().default(0),
    sourceType: recordingSourceTypeEnum('source_type').notNull(),
    matchMethod: recordingMatchMethodEnum('match_method'),
    matchConfidence: smallint('match_confidence'),
    callerNumber: varchar('caller_number', { length: 64 }),
    calledNumber: varchar('called_number', { length: 64 }),
    agentName: varchar('agent_name', { length: 255 }),
    direction: varchar('direction', { length: 32 }),
    pciPausedSegmentsJson: jsonb('pci_paused_segments_json').$type<
      Array<{ startMs: number; endMs: number }>
    >(),
    hasScorecard: boolean('has_scorecard').notNull().default(false),
    overallScore: smallint('overall_score'),
    tags: jsonb('tags').$type<string[]>().default([]),
    retainUntil: date('retain_until'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedBy: uuid('deleted_by'),
    startTime: timestamp('start_time', { withTimezone: true }),
    endTime: timestamp('end_time', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('recordings_call_id_idx').on(table.callId),
    index('recordings_agent_id_idx').on(table.agentId),
    index('recordings_storage_pool_id_idx').on(table.storagePoolId),
    index('recordings_start_time_idx').on(table.startTime),
    index('recordings_caller_number_idx').on(table.callerNumber),
    index('recordings_called_number_idx').on(table.calledNumber),
    index('recordings_has_scorecard_idx').on(table.hasScorecard),
    index('recordings_is_deleted_idx').on(table.isDeleted),
    index('recordings_retain_until_idx').on(table.retainUntil),
    index('recordings_source_type_idx').on(table.sourceType),
  ]
);

// ---------------------------------------------------------------------------
// recording_pause_events - PCI pause/resume audit trail
// ---------------------------------------------------------------------------

export const recordingPauseEvents = pgTable(
  'recording_pause_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    eventType: pauseEventTypeEnum('event_type').notNull(),
    timestampMs: integer('timestamp_ms').notNull(),
    reason: varchar('reason', { length: 512 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('recording_pause_events_recording_id_idx').on(table.recordingId),
    index('recording_pause_events_event_type_idx').on(table.eventType),
  ]
);

// ---------------------------------------------------------------------------
// recording_notes - Timestamped markers on recording waveform
// ---------------------------------------------------------------------------

export const recordingNotes = pgTable(
  'recording_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    timestampMs: integer('timestamp_ms').notNull(),
    noteText: text('note_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('recording_notes_recording_id_idx').on(table.recordingId),
    index('recording_notes_user_id_idx').on(table.userId),
  ]
);

// ---------------------------------------------------------------------------
// recording_share_links - External listen links with TTL
// ---------------------------------------------------------------------------

export const recordingShareLinks = pgTable(
  'recording_share_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 512 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    snippetStartMs: integer('snippet_start_ms'),
    snippetEndMs: integer('snippet_end_ms'),
    accessCount: integer('access_count').notNull().default(0),
    maxAccesses: integer('max_accesses'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('recording_share_links_token_hash_idx').on(table.tokenHash),
    index('recording_share_links_recording_id_idx').on(table.recordingId),
    index('recording_share_links_expires_at_idx').on(table.expiresAt),
  ]
);

// ---------------------------------------------------------------------------
// scorecard_templates
// ---------------------------------------------------------------------------

export const scorecardTemplates = pgTable(
  'scorecard_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    questionsJson: jsonb('questions_json')
      .$type<
        Array<{
          id: string;
          category: string;
          label: string;
          type: 'yes_no' | 'scale' | 'text';
          weight: number;
          maxPoints: number;
        }>
      >()
      .notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('scorecard_templates_active_idx').on(table.active),
    index('scorecard_templates_created_by_idx').on(table.createdBy),
  ]
);

// ---------------------------------------------------------------------------
// scorecard_responses
// ---------------------------------------------------------------------------

export const scorecardResponses = pgTable(
  'scorecard_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id')
      .notNull()
      .references(() => scorecardTemplates.id, { onDelete: 'restrict' }),
    evaluatorId: uuid('evaluator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    agentUserId: uuid('agent_user_id').references(() => users.id, { onDelete: 'set null' }),
    scoresJson: jsonb('scores_json')
      .$type<
        Array<{
          questionId: string;
          score: number | null;
          comment: string | null;
        }>
      >()
      .notNull(),
    overallScore: smallint('overall_score').notNull(),
    maxPossibleScore: smallint('max_possible_score').notNull(),
    scorePercentage: smallint('score_percentage').notNull(),
    comments: text('comments'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('scorecard_responses_recording_id_idx').on(table.recordingId),
    index('scorecard_responses_template_id_idx').on(table.templateId),
    index('scorecard_responses_evaluator_id_idx').on(table.evaluatorId),
    index('scorecard_responses_agent_user_id_idx').on(table.agentUserId),
    index('scorecard_responses_overall_score_idx').on(table.overallScore),
    index('scorecard_responses_completed_at_idx').on(table.completedAt),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const recordingsRelations = relations(recordings, ({ one, many }) => ({
  call: one(calls, {
    fields: [recordings.callId],
    references: [calls.id],
  }),
  agent: one(agents, {
    fields: [recordings.agentId],
    references: [agents.id],
  }),
  storagePool: one(recordingStoragePools, {
    fields: [recordings.storagePoolId],
    references: [recordingStoragePools.id],
  }),
  pauseEvents: many(recordingPauseEvents),
  notes: many(recordingNotes),
  shareLinks: many(recordingShareLinks),
  scorecardResponses: many(scorecardResponses),
}));

export const recordingStoragePoolsRelations = relations(recordingStoragePools, ({ many }) => ({
  recordings: many(recordings),
}));

export const recordingPauseEventsRelations = relations(recordingPauseEvents, ({ one }) => ({
  recording: one(recordings, {
    fields: [recordingPauseEvents.recordingId],
    references: [recordings.id],
  }),
  user: one(users, {
    fields: [recordingPauseEvents.userId],
    references: [users.id],
  }),
}));

export const recordingNotesRelations = relations(recordingNotes, ({ one }) => ({
  recording: one(recordings, {
    fields: [recordingNotes.recordingId],
    references: [recordings.id],
  }),
  user: one(users, {
    fields: [recordingNotes.userId],
    references: [users.id],
  }),
}));

export const recordingShareLinksRelations = relations(recordingShareLinks, ({ one }) => ({
  recording: one(recordings, {
    fields: [recordingShareLinks.recordingId],
    references: [recordings.id],
  }),
  createdBy: one(users, {
    fields: [recordingShareLinks.createdByUserId],
    references: [users.id],
  }),
}));

export const scorecardTemplatesRelations = relations(scorecardTemplates, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [scorecardTemplates.createdBy],
    references: [users.id],
  }),
  responses: many(scorecardResponses),
}));

export const scorecardResponsesRelations = relations(scorecardResponses, ({ one }) => ({
  recording: one(recordings, {
    fields: [scorecardResponses.recordingId],
    references: [recordings.id],
  }),
  template: one(scorecardTemplates, {
    fields: [scorecardResponses.templateId],
    references: [scorecardTemplates.id],
  }),
  evaluator: one(users, {
    fields: [scorecardResponses.evaluatorId],
    references: [users.id],
  }),
}));
