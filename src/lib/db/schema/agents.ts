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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const agentStateEnum = pgEnum('agent_state', [
  'idle',
  'talking',
  'ringing',
  'hold',
  'acw',
  'dnd',
  'away',
  'logged-out',
  'unknown',
]);

// ---------------------------------------------------------------------------
// agents - IP Office agents synced via DevLink3
// ---------------------------------------------------------------------------

export const agents = pgTable(
  'agents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    systemId: uuid('system_id'),
    externalId: varchar('external_id', { length: 128 }),
    extension: varchar('extension', { length: 32 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 128 }),
    lastName: varchar('last_name', { length: 128 }),
    state: agentStateEnum('state').notNull().default('unknown'),
    stateStartTime: timestamp('state_start_time', { withTimezone: true }),
    activeCallId: uuid('active_call_id'),
    loginTime: timestamp('login_time', { withTimezone: true }),
    skills: jsonb('skills').$type<string[]>().default([]),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('agents_extension_system_idx').on(table.extension, table.systemId),
    index('agents_state_idx').on(table.state),
    index('agents_system_id_idx').on(table.systemId),
    index('agents_external_id_idx').on(table.externalId),
    index('agents_active_idx').on(table.active),
  ]
);

// ---------------------------------------------------------------------------
// agent_states - Real-time + historical agent state log
// ---------------------------------------------------------------------------

export const agentStates = pgTable(
  'agent_states',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    state: agentStateEnum('state').notNull(),
    previousState: agentStateEnum('previous_state'),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }),
    duration: integer('duration'),
    callId: uuid('call_id'),
    reason: varchar('reason', { length: 255 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('agent_states_agent_id_idx').on(table.agentId),
    index('agent_states_start_time_idx').on(table.startTime),
    index('agent_states_agent_id_start_time_idx').on(table.agentId, table.startTime),
    index('agent_states_state_idx').on(table.state),
    index('agent_states_call_id_idx').on(table.callId),
  ]
);

// ---------------------------------------------------------------------------
// agent_mappings - User -> IP Office extension mapping
// ---------------------------------------------------------------------------

export const agentMappings = pgTable(
  'agent_mappings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    extensionNumber: varchar('extension_number', { length: 32 }).notNull(),
    huntGroups: jsonb('hunt_groups').$type<string[]>().default([]),
    isPrimary: boolean('is_primary').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('agent_mappings_user_agent_idx').on(table.userId, table.agentId),
    index('agent_mappings_user_id_idx').on(table.userId),
    index('agent_mappings_agent_id_idx').on(table.agentId),
    index('agent_mappings_extension_idx').on(table.extensionNumber),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const agentsRelations = relations(agents, ({ many }) => ({
  states: many(agentStates),
  mappings: many(agentMappings),
}));

export const agentStatesRelations = relations(agentStates, ({ one }) => ({
  agent: one(agents, {
    fields: [agentStates.agentId],
    references: [agents.id],
  }),
}));

export const agentMappingsRelations = relations(agentMappings, ({ one }) => ({
  user: one(users, {
    fields: [agentMappings.userId],
    references: [users.id],
  }),
  agent: one(agents, {
    fields: [agentMappings.agentId],
    references: [agents.id],
  }),
}));
