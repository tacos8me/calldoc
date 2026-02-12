import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'supervisor',
  'agent',
  'wallboard-only',
]);

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull().default('agent'),
    groupAccess: jsonb('group_access').$type<string[]>().default([]),
    permissions: jsonb('permissions').$type<string[]>().default([]),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    passwordHash: varchar('password_hash', { length: 255 }),
    active: boolean('active').notNull().default(true),
    ssoProvider: varchar('sso_provider', { length: 100 }),
    ssoSubjectId: varchar('sso_subject_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_email_idx').on(table.email),
    index('users_role_idx').on(table.role),
    index('users_active_idx').on(table.active),
    index('users_sso_subject_idx').on(table.ssoProvider, table.ssoSubjectId),
  ]
);

// ---------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    roles: jsonb('roles').$type<string[]>().default([]),
    agentMapping: jsonb('agent_mapping').$type<Record<string, unknown>>(),
    samlNameId: varchar('saml_name_id', { length: 512 }),
    samlSessionIndex: varchar('saml_session_index', { length: 512 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ]
);

// ---------------------------------------------------------------------------
// saml_configs
// ---------------------------------------------------------------------------

export const samlConfigs = pgTable(
  'saml_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    entityId: varchar('entity_id', { length: 512 }).notNull(),
    ssoUrl: varchar('sso_url', { length: 1024 }).notNull(),
    sloUrl: varchar('slo_url', { length: 1024 }),
    certificate: text('certificate').notNull(),
    privateKey: text('private_key'),
    signatureAlgorithm: varchar('signature_algorithm', { length: 50 }).default('sha256'),
    digestAlgorithm: varchar('digest_algorithm', { length: 50 }).default('sha256'),
    attributeMapping: jsonb('attribute_mapping').$type<Record<string, string>>().default({}),
    groupRoleMapping: jsonb('group_role_mapping').$type<Record<string, string>>().default({}),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('saml_configs_entity_id_idx').on(table.entityId),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
