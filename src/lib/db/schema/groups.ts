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
  smallint,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { agents } from './agents';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const routingAlgorithmEnum = pgEnum('routing_algorithm', [
  'most-idle',
  'circular',
  'linear',
  'highest-skill-first',
]);

// ---------------------------------------------------------------------------
// hunt_groups - IP Office hunt groups (queues)
// ---------------------------------------------------------------------------

export const huntGroups = pgTable(
  'hunt_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    systemId: uuid('system_id'),
    externalId: varchar('external_id', { length: 128 }),
    name: varchar('name', { length: 255 }).notNull(),
    extension: varchar('extension', { length: 32 }),
    ringMode: varchar('ring_mode', { length: 64 }),
    queueEnabled: boolean('queue_enabled').notNull().default(false),
    voicemailEnabled: boolean('voicemail_enabled').notNull().default(false),
    overflowGroup: varchar('overflow_group', { length: 255 }),
    overflowTimeout: integer('overflow_timeout'),
    nightServiceGroup: varchar('night_service_group', { length: 255 }),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('hunt_groups_name_system_idx').on(table.name, table.systemId),
    index('hunt_groups_system_id_idx').on(table.systemId),
    index('hunt_groups_external_id_idx').on(table.externalId),
    index('hunt_groups_active_idx').on(table.active),
  ]
);

// ---------------------------------------------------------------------------
// hunt_group_members - Agent <-> hunt group membership
// ---------------------------------------------------------------------------

export const huntGroupMembers = pgTable(
  'hunt_group_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    huntGroupId: uuid('hunt_group_id')
      .notNull()
      .references(() => huntGroups.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    priority: smallint('priority').default(1),
    isEnabled: boolean('is_enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('hunt_group_members_group_agent_idx').on(table.huntGroupId, table.agentId),
    index('hunt_group_members_hunt_group_id_idx').on(table.huntGroupId),
    index('hunt_group_members_agent_id_idx').on(table.agentId),
  ]
);

// ---------------------------------------------------------------------------
// skill_groups - Skill group definitions
// ---------------------------------------------------------------------------

export const skillGroups = pgTable(
  'skill_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    routingAlgorithm: routingAlgorithmEnum('routing_algorithm').notNull().default('most-idle'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('skill_groups_name_idx').on(table.name),
  ]
);

// ---------------------------------------------------------------------------
// skill_group_members - Agent <-> skill group with expertise ranking
// ---------------------------------------------------------------------------

export const skillGroupMembers = pgTable(
  'skill_group_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    skillGroupId: uuid('skill_group_id')
      .notNull()
      .references(() => skillGroups.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    expertiseRanking: smallint('expertise_ranking').notNull().default(5),
    isEnabled: boolean('is_enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('skill_group_members_group_agent_idx').on(table.skillGroupId, table.agentId),
    index('skill_group_members_skill_group_id_idx').on(table.skillGroupId),
    index('skill_group_members_agent_id_idx').on(table.agentId),
  ]
);

// ---------------------------------------------------------------------------
// skill_routing_rules - Routing algorithm config per skill group
// ---------------------------------------------------------------------------

export const skillRoutingRules = pgTable(
  'skill_routing_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    skillGroupId: uuid('skill_group_id')
      .notNull()
      .references(() => skillGroups.id, { onDelete: 'cascade' }),
    algorithm: routingAlgorithmEnum('algorithm').notNull(),
    priorityThreshold: smallint('priority_threshold'),
    overflowSkillGroupId: uuid('overflow_skill_group_id'),
    overflowTimeout: integer('overflow_timeout'),
    config: jsonb('config').$type<Record<string, unknown>>().default({}),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('skill_routing_rules_skill_group_id_idx').on(table.skillGroupId),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const huntGroupsRelations = relations(huntGroups, ({ many }) => ({
  members: many(huntGroupMembers),
}));

export const huntGroupMembersRelations = relations(huntGroupMembers, ({ one }) => ({
  huntGroup: one(huntGroups, {
    fields: [huntGroupMembers.huntGroupId],
    references: [huntGroups.id],
  }),
  agent: one(agents, {
    fields: [huntGroupMembers.agentId],
    references: [agents.id],
  }),
}));

export const skillGroupsRelations = relations(skillGroups, ({ many }) => ({
  members: many(skillGroupMembers),
  routingRules: many(skillRoutingRules),
}));

export const skillGroupMembersRelations = relations(skillGroupMembers, ({ one }) => ({
  skillGroup: one(skillGroups, {
    fields: [skillGroupMembers.skillGroupId],
    references: [skillGroups.id],
  }),
  agent: one(agents, {
    fields: [skillGroupMembers.agentId],
    references: [agents.id],
  }),
}));

export const skillRoutingRulesRelations = relations(skillRoutingRules, ({ one }) => ({
  skillGroup: one(skillGroups, {
    fields: [skillRoutingRules.skillGroupId],
    references: [skillGroups.id],
  }),
}));
