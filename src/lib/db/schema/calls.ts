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
  smallint,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const callStateEnum = pgEnum('call_state', [
  'idle',
  'ringing',
  'connected',
  'hold',
  'transferring',
  'conferencing',
  'queued',
  'parked',
  'voicemail',
  'completed',
  'abandoned',
]);

export const callDirectionEnum = pgEnum('call_direction', [
  'inbound',
  'outbound',
  'internal',
]);

export const callEventTypeEnum = pgEnum('call_event_type', [
  'initiated',
  'queued',
  'ringing',
  'answered',
  'held',
  'retrieved',
  'transferred',
  'conferenced',
  'parked',
  'unparked',
  'voicemail',
  'completed',
  'abandoned',
  'dtmf',
  'recording_started',
  'recording_stopped',
]);

// ---------------------------------------------------------------------------
// calls
// NOTE: In production, this table should be partitioned by month on
//       start_time for query performance. Drizzle does not support
//       declarative partitioning, so partitioning must be applied via
//       a raw SQL migration:
//
//       CREATE TABLE calls (...) PARTITION BY RANGE (start_time);
//       CREATE TABLE calls_2025_01 PARTITION OF calls
//         FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
// ---------------------------------------------------------------------------

export const calls = pgTable(
  'calls',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    systemId: uuid('system_id'),
    externalCallId: varchar('external_call_id', { length: 128 }),
    direction: callDirectionEnum('direction').notNull(),
    state: callStateEnum('state').notNull().default('idle'),
    callerNumber: varchar('caller_number', { length: 64 }).notNull(),
    callerName: varchar('caller_name', { length: 255 }),
    calledNumber: varchar('called_number', { length: 64 }).notNull(),
    calledName: varchar('called_name', { length: 255 }),
    queueName: varchar('queue_name', { length: 255 }),
    queueEntryTime: timestamp('queue_entry_time', { withTimezone: true }),
    agentId: uuid('agent_id'),
    agentExtension: varchar('agent_extension', { length: 32 }),
    agentName: varchar('agent_name', { length: 255 }),
    trunkId: varchar('trunk_id', { length: 64 }),
    trunkName: varchar('trunk_name', { length: 255 }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    answerTime: timestamp('answer_time', { withTimezone: true }),
    endTime: timestamp('end_time', { withTimezone: true }),
    duration: integer('duration').notNull().default(0),
    talkDuration: integer('talk_duration').default(0),
    holdCount: smallint('hold_count').notNull().default(0),
    holdDuration: integer('hold_duration').notNull().default(0),
    transferCount: smallint('transfer_count').notNull().default(0),
    isAnswered: boolean('is_answered').notNull().default(false),
    isAbandoned: boolean('is_abandoned').notNull().default(false),
    isRecorded: boolean('is_recorded').notNull().default(false),
    accountCode: varchar('account_code', { length: 64 }),
    tags: jsonb('tags').$type<string[]>().default([]),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('calls_start_time_idx').on(table.startTime),
    index('calls_end_time_idx').on(table.endTime),
    index('calls_caller_number_idx').on(table.callerNumber),
    index('calls_called_number_idx').on(table.calledNumber),
    index('calls_agent_id_idx').on(table.agentId),
    index('calls_direction_idx').on(table.direction),
    index('calls_state_idx').on(table.state),
    index('calls_external_call_id_idx').on(table.externalCallId),
    index('calls_system_id_idx').on(table.systemId),
    index('calls_queue_name_idx').on(table.queueName),
    index('calls_is_answered_idx').on(table.isAnswered),
    index('calls_is_abandoned_idx').on(table.isAbandoned),
  ]
);

// ---------------------------------------------------------------------------
// call_events
// ---------------------------------------------------------------------------

export const callEvents = pgTable(
  'call_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    callId: uuid('call_id')
      .notNull()
      .references(() => calls.id, { onDelete: 'cascade' }),
    eventType: callEventTypeEnum('event_type').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    duration: integer('duration'),
    party: varchar('party', { length: 255 }),
    agentId: uuid('agent_id'),
    agentExtension: varchar('agent_extension', { length: 32 }),
    queueName: varchar('queue_name', { length: 255 }),
    details: jsonb('details').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('call_events_call_id_idx').on(table.callId),
    index('call_events_event_type_idx').on(table.eventType),
    index('call_events_timestamp_idx').on(table.timestamp),
    index('call_events_agent_id_idx').on(table.agentId),
    index('call_events_call_id_timestamp_idx').on(table.callId, table.timestamp),
  ]
);

// ---------------------------------------------------------------------------
// call_notes
// ---------------------------------------------------------------------------

export const callNotes = pgTable(
  'call_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    callId: uuid('call_id')
      .notNull()
      .references(() => calls.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    noteText: text('note_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('call_notes_call_id_idx').on(table.callId),
    index('call_notes_user_id_idx').on(table.userId),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const callsRelations = relations(calls, ({ many }) => ({
  events: many(callEvents),
  notes: many(callNotes),
}));

export const callEventsRelations = relations(callEvents, ({ one }) => ({
  call: one(calls, {
    fields: [callEvents.callId],
    references: [calls.id],
  }),
}));

export const callNotesRelations = relations(callNotes, ({ one }) => ({
  call: one(calls, {
    fields: [callNotes.callId],
    references: [calls.id],
  }),
  user: one(users, {
    fields: [callNotes.userId],
    references: [users.id],
  }),
}));
