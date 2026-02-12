// ---------------------------------------------------------------------------
// Advanced Features Schema - Sprint 4
// Audit logs, webhook endpoints, webhook deliveries, bulk jobs
// ---------------------------------------------------------------------------

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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const auditActionEnum = pgEnum('audit_action', [
  'user.created',
  'user.updated',
  'user.deleted',
  'settings.changed',
  'rule.created',
  'rule.updated',
  'wallboard.created',
  'recording.shared',
  'recording.deleted',
  'report.scheduled',
  'webhook.created',
  'webhook.updated',
  'webhook.deleted',
  'bulk.export',
  'bulk.tag',
  'bulk.score',
]);

export const webhookEventEnum = pgEnum('webhook_event', [
  'call.started',
  'call.ended',
  'call.abandoned',
  'agent.state_changed',
  'alert.fired',
  'recording.ready',
]);

export const bulkJobStatusEnum = pgEnum('bulk_job_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const bulkJobTypeEnum = pgEnum('bulk_job_type', [
  'calls_export',
  'recordings_score',
  'recordings_tag',
]);

// ---------------------------------------------------------------------------
// audit_logs
// ---------------------------------------------------------------------------

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    userName: varchar('user_name', { length: 255 }),
    action: auditActionEnum('action').notNull(),
    resource: varchar('resource', { length: 128 }).notNull(),
    resourceId: varchar('resource_id', { length: 255 }),
    details: jsonb('details').$type<Record<string, unknown>>(),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_user_id_idx').on(table.userId),
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_resource_idx').on(table.resource),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// webhook_endpoints
// ---------------------------------------------------------------------------

export const webhookEndpoints = pgTable(
  'webhook_endpoints',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    url: varchar('url', { length: 2048 }).notNull(),
    secret: varchar('secret', { length: 512 }).notNull(),
    events: jsonb('events').$type<string[]>().notNull().default([]),
    active: boolean('active').notNull().default(true),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('webhook_endpoints_active_idx').on(table.active),
    index('webhook_endpoints_created_by_idx').on(table.createdBy),
  ]
);

// ---------------------------------------------------------------------------
// webhook_deliveries
// ---------------------------------------------------------------------------

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    endpointId: uuid('endpoint_id')
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
    event: varchar('event', { length: 128 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    latencyMs: integer('latency_ms'),
    attempt: integer('attempt').notNull().default(1),
    success: boolean('success').notNull().default(false),
    errorMessage: text('error_message'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('webhook_deliveries_endpoint_id_idx').on(table.endpointId),
    index('webhook_deliveries_event_idx').on(table.event),
    index('webhook_deliveries_delivered_at_idx').on(table.deliveredAt),
    index('webhook_deliveries_success_idx').on(table.success),
  ]
);

// ---------------------------------------------------------------------------
// bulk_jobs
// ---------------------------------------------------------------------------

export const bulkJobs = pgTable(
  'bulk_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobType: bulkJobTypeEnum('job_type').notNull(),
    status: bulkJobStatusEnum('status').notNull().default('pending'),
    params: jsonb('params').$type<Record<string, unknown>>().notNull().default({}),
    resultUrl: varchar('result_url', { length: 2048 }),
    resultMeta: jsonb('result_meta').$type<Record<string, unknown>>(),
    totalItems: integer('total_items').default(0),
    processedItems: integer('processed_items').default(0),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('bulk_jobs_user_id_idx').on(table.userId),
    index('bulk_jobs_status_idx').on(table.status),
    index('bulk_jobs_job_type_idx').on(table.jobType),
    index('bulk_jobs_created_at_idx').on(table.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const webhookEndpointsRelations = relations(webhookEndpoints, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [webhookEndpoints.createdBy],
    references: [users.id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  endpoint: one(webhookEndpoints, {
    fields: [webhookDeliveries.endpointId],
    references: [webhookEndpoints.id],
  }),
}));

export const bulkJobsRelations = relations(bulkJobs, ({ one }) => ({
  user: one(users, {
    fields: [bulkJobs.userId],
    references: [users.id],
  }),
}));
