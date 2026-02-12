// ─── /api/recordings/[id]/transcript/callback ────────────────────────────────
// POST: Receives completed transcription result from the Parakeet server.
// Updates the transcription record and publishes a real-time event via Redis.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { transcriptions, transcriptionSearch } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseBody, serverErrorResponse } from '@/lib/api/validation';

// ---------------------------------------------------------------------------
// Callback payload schema from Parakeet server
// ---------------------------------------------------------------------------

const wordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number().min(0).max(1),
});

const segmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  confidence: z.number().min(0).max(1),
  speaker: z.string().optional(),
  words: z.array(wordSchema).default([]),
});

const callbackSchema = z.object({
  job_id: z.string(),
  status: z.enum(['completed', 'failed']),
  transcript: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  language: z.string().optional(),
  duration_seconds: z.number().optional(),
  processing_time_seconds: z.number().optional(),
  segments: z.array(segmentSchema).optional(),
  error: z.string().optional(),
});

// ---------------------------------------------------------------------------
// POST - Receive transcription result callback
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const parsed = await parseBody(request, callbackSchema);
  if (!parsed.success) return parsed.response;

  const {
    job_id,
    status,
    transcript,
    confidence,
    language,
    duration_seconds,
    processing_time_seconds,
    segments,
    error,
  } = parsed.data;

  try {
    // Find the transcription record by jobId and recordingId
    const [existing] = await db
      .select()
      .from(transcriptions)
      .where(
        and(
          eq(transcriptions.jobId, job_id),
          eq(transcriptions.recordingId, params.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Transcription job not found' } },
        { status: 404 }
      );
    }

    const now = new Date();

    if (status === 'completed' && transcript) {
      // Calculate word count from transcript
      const wordCount = transcript
        .split(/\s+/)
        .filter((w) => w.length > 0).length;

      // Update transcription record with results
      await db
        .update(transcriptions)
        .set({
          status: 'completed',
          transcript,
          confidence: confidence ?? null,
          language: language ?? existing.language,
          durationSeconds: duration_seconds ?? null,
          processingTimeSeconds: processing_time_seconds ?? null,
          segmentsJson: segments ?? null,
          wordCount,
          errorMessage: null,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(transcriptions.id, existing.id));

      // Upsert full-text search record
      await db
        .insert(transcriptionSearch)
        .values({
          transcriptionId: existing.id,
          recordingId: params.id,
          searchText: transcript.toLowerCase(),
        });

      // Publish real-time event to Redis for UI update
      try {
        const Redis = (await import('ioredis')).default;
        const publisher = new Redis(process.env.REDIS_URL ?? 'redis://redis:6379');
        await publisher.publish(
          'ipo:transcriptions',
          JSON.stringify({
            type: 'transcription:completed',
            recordingId: params.id,
            transcriptionId: existing.id,
            timestamp: now.toISOString(),
          })
        );
        publisher.disconnect();
      } catch (redisError) {
        // Redis publish failure is non-critical; log and continue
        console.error('Failed to publish transcription event to Redis:', redisError);
      }
    } else {
      // Failed transcription
      await db
        .update(transcriptions)
        .set({
          status: 'failed',
          errorMessage: error ?? 'Transcription failed without error details',
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(transcriptions.id, existing.id));

      // Publish failure event to Redis
      try {
        const Redis = (await import('ioredis')).default;
        const publisher = new Redis(process.env.REDIS_URL ?? 'redis://redis:6379');
        await publisher.publish(
          'ipo:transcriptions',
          JSON.stringify({
            type: 'transcription:failed',
            recordingId: params.id,
            transcriptionId: existing.id,
            error: error ?? 'Unknown error',
            timestamp: now.toISOString(),
          })
        );
        publisher.disconnect();
      } catch (redisError) {
        console.error('Failed to publish transcription failure event to Redis:', redisError);
      }
    }

    return NextResponse.json({ data: { status: 'accepted' } });
  } catch (err) {
    console.error('POST /api/recordings/[id]/transcript/callback error:', err);
    return serverErrorResponse('Failed to process transcription callback');
  }
}
