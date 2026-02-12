// ---------------------------------------------------------------------------
// Transcription Schema - Parakeet ASR Integration
// ---------------------------------------------------------------------------

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  jsonb,
  real,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { recordings } from './recordings';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const transcriptionStatusEnum = pgEnum('transcription_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

// ---------------------------------------------------------------------------
// transcriptions
// ---------------------------------------------------------------------------

export const transcriptions = pgTable(
  'transcriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    jobId: text('job_id'),
    status: transcriptionStatusEnum('status').notNull().default('pending'),
    transcript: text('transcript'),
    confidence: real('confidence'),
    language: text('language').default('en'),
    durationSeconds: real('duration_seconds'),
    processingTimeSeconds: real('processing_time_seconds'),
    segmentsJson: jsonb('segments_json').$type<
      Array<{
        start: number;
        end: number;
        text: string;
        confidence: number;
        speaker?: string;
        words: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
        }>;
      }>
    >(),
    wordCount: integer('word_count'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_transcriptions_recording_id').on(table.recordingId),
    index('idx_transcriptions_status').on(table.status),
    index('idx_transcriptions_created_at').on(table.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// transcription_search - Full-text search index for transcript content
// ---------------------------------------------------------------------------

export const transcriptionSearch = pgTable(
  'transcription_search',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    transcriptionId: uuid('transcription_id')
      .notNull()
      .references(() => transcriptions.id, { onDelete: 'cascade' }),
    recordingId: uuid('recording_id').notNull(),
    searchText: text('search_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_transcription_search_recording').on(table.recordingId),
    index('idx_transcription_search_transcription').on(table.transcriptionId),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const transcriptionsRelations = relations(transcriptions, ({ one }) => ({
  recording: one(recordings, {
    fields: [transcriptions.recordingId],
    references: [recordings.id],
  }),
}));

export const transcriptionSearchRelations = relations(transcriptionSearch, ({ one }) => ({
  transcription: one(transcriptions, {
    fields: [transcriptionSearch.transcriptionId],
    references: [transcriptions.id],
  }),
}));
