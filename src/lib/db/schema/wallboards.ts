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

export const wallboardThemeEnum = pgEnum('wallboard_theme', [
  'dark',
  'light',
  'custom',
]);

export const widgetTypeEnum = pgEnum('widget_type', [
  'active-calls',
  'agent-box',
  'gauge',
  'chart',
  'group-box',
  'title-value',
  'leaderboard',
  'pie-chart',
  'marquee',
  'image',
  'web-page',
  'text',
  'line',
  'widget-group',
]);

// ---------------------------------------------------------------------------
// wallboards
// ---------------------------------------------------------------------------

export const wallboards = pgTable(
  'wallboards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    theme: wallboardThemeEnum('theme').notNull().default('dark'),
    resolutionWidth: integer('resolution_width').notNull().default(1920),
    resolutionHeight: integer('resolution_height').notNull().default(1080),
    refreshInterval: integer('refresh_interval').notNull().default(30),
    layouts: jsonb('layouts')
      .$type<
        Record<
          string,
          Array<{
            i: string;
            x: number;
            y: number;
            w: number;
            h: number;
            minW?: number;
            minH?: number;
            static?: boolean;
          }>
        >
      >()
      .default({}),
    backgroundImage: varchar('background_image', { length: 1024 }),
    backgroundColor: varchar('background_color', { length: 32 }),
    isPublished: boolean('is_published').notNull().default(false),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('wallboards_created_by_idx').on(table.createdBy),
    index('wallboards_is_published_idx').on(table.isPublished),
    index('wallboards_active_idx').on(table.active),
  ]
);

// ---------------------------------------------------------------------------
// wallboard_widgets
// ---------------------------------------------------------------------------

export const wallboardWidgets = pgTable(
  'wallboard_widgets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    wallboardId: uuid('wallboard_id')
      .notNull()
      .references(() => wallboards.id, { onDelete: 'cascade' }),
    widgetType: widgetTypeEnum('widget_type').notNull(),
    title: varchar('title', { length: 255 }).notNull().default(''),
    config: jsonb('config')
      .$type<{
        metric?: string;
        groups?: string[];
        agents?: string[];
        refreshInterval?: number;
        fontSize?: number;
        backgroundColor?: string;
        foregroundColor?: string;
        borderColor?: string;
        chartType?: string;
        maxItems?: number;
        url?: string;
        content?: string;
        scrollSpeed?: number;
        childWidgetIds?: string[];
        [key: string]: unknown;
      }>()
      .default({}),
    thresholds: jsonb('thresholds')
      .$type<
        Array<{
          operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
          value: number;
          color: string;
          flash?: boolean;
        }>
      >()
      .default([]),
    sortOrder: smallint('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('wallboard_widgets_wallboard_id_idx').on(table.wallboardId),
    index('wallboard_widgets_widget_type_idx').on(table.widgetType),
    index('wallboard_widgets_sort_order_idx').on(table.wallboardId, table.sortOrder),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const wallboardsRelations = relations(wallboards, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [wallboards.createdBy],
    references: [users.id],
  }),
  widgets: many(wallboardWidgets),
}));

export const wallboardWidgetsRelations = relations(wallboardWidgets, ({ one }) => ({
  wallboard: one(wallboards, {
    fields: [wallboardWidgets.wallboardId],
    references: [wallboards.id],
  }),
}));
