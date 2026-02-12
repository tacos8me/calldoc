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

export const reportCategoryEnum = pgEnum('report_category', [
  'call',
  'agent',
  'group',
  'trunk',
  'custom',
]);

export const reportIntervalEnum = pgEnum('report_interval', [
  '15m',
  '30m',
  '1h',
  '1d',
  '1w',
  '1M',
]);

export const reportFormatEnum = pgEnum('report_format', [
  'csv',
  'pdf',
  'xlsx',
]);

export const scheduleFrequencyEnum = pgEnum('schedule_frequency', [
  'daily',
  'weekly',
  'monthly',
]);

// ---------------------------------------------------------------------------
// report_definitions
// ---------------------------------------------------------------------------

export const reportDefinitions = pgTable(
  'report_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: reportCategoryEnum('category').notNull(),
    isStandard: boolean('is_standard').notNull().default(false),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    filters: jsonb('filters')
      .$type<{
        dateRange?: { from: string; to: string };
        groups?: string[];
        agents?: string[];
        trunks?: string[];
        direction?: string[];
        minDuration?: number | null;
        maxDuration?: number | null;
        dispositions?: string[];
      }>()
      .default({}),
    columns: jsonb('columns').$type<string[]>().default([]),
    groupBy: varchar('group_by', { length: 128 }),
    interval: reportIntervalEnum('interval'),
    chartType: varchar('chart_type', { length: 32 }),
    queryTemplate: text('query_template'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('report_definitions_category_idx').on(table.category),
    index('report_definitions_created_by_idx').on(table.createdBy),
    index('report_definitions_is_standard_idx').on(table.isStandard),
    index('report_definitions_active_idx').on(table.active),
  ]
);

// ---------------------------------------------------------------------------
// report_schedules
// ---------------------------------------------------------------------------

export const reportSchedules = pgTable(
  'report_schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reportDefinitionId: uuid('report_definition_id')
      .notNull()
      .references(() => reportDefinitions.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    enabled: boolean('enabled').notNull().default(true),
    frequency: scheduleFrequencyEnum('frequency').notNull(),
    time: varchar('time', { length: 5 }).notNull(),
    dayOfWeek: smallint('day_of_week'),
    dayOfMonth: smallint('day_of_month'),
    recipients: jsonb('recipients').$type<string[]>().notNull().default([]),
    format: reportFormatEnum('format').notNull().default('pdf'),
    filters: jsonb('filters')
      .$type<{
        dateRangeType?: 'yesterday' | 'last_week' | 'last_month' | 'custom';
        groups?: string[];
        agents?: string[];
      }>()
      .default({}),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    lastRunStatus: varchar('last_run_status', { length: 32 }),
    lastRunError: text('last_run_error'),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('report_schedules_report_definition_id_idx').on(table.reportDefinitionId),
    index('report_schedules_enabled_idx').on(table.enabled),
    index('report_schedules_next_run_at_idx').on(table.nextRunAt),
    index('report_schedules_created_by_idx').on(table.createdBy),
  ]
);

// ---------------------------------------------------------------------------
// saved_filters - Per-user saved filter presets (Cradle-to-Grave)
// ---------------------------------------------------------------------------

export const savedFilters = pgTable(
  'saved_filters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    context: varchar('context', { length: 64 }).notNull().default('cradle-to-grave'),
    filtersJson: jsonb('filters_json').$type<Record<string, unknown>>().notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('saved_filters_user_id_idx').on(table.userId),
    index('saved_filters_context_idx').on(table.context),
    index('saved_filters_user_context_idx').on(table.userId, table.context),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const reportDefinitionsRelations = relations(reportDefinitions, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [reportDefinitions.createdBy],
    references: [users.id],
  }),
  schedules: many(reportSchedules),
}));

export const reportSchedulesRelations = relations(reportSchedules, ({ one }) => ({
  reportDefinition: one(reportDefinitions, {
    fields: [reportSchedules.reportDefinitionId],
    references: [reportDefinitions.id],
  }),
  createdByUser: one(users, {
    fields: [reportSchedules.createdBy],
    references: [users.id],
  }),
}));

export const savedFiltersRelations = relations(savedFilters, ({ one }) => ({
  user: one(users, {
    fields: [savedFilters.userId],
    references: [users.id],
  }),
}));
