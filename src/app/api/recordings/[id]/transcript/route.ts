// ─── /api/recordings/[id]/transcript ─────────────────────────────────────────
// GET: Return transcript for a recording
// POST: Submit a new transcription job to the Parakeet server

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { recordings, transcriptions, transcriptionSearch } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import {
  uuidSchema,
  parseBody,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api/validation';

const TRANSCRIPTION_URL = process.env.TRANSCRIPTION_URL ?? 'http://transcription:8000';
const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// GET - Return transcript for a recording
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('recordings:view');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid recording ID format' } },
      { status: 400 }
    );
  }

  try {
    // Verify recording exists
    const [recording] = await db
      .select({ id: recordings.id })
      .from(recordings)
      .where(eq(recordings.id, params.id))
      .limit(1);

    if (!recording) return notFoundResponse('Recording');

    // Fetch the most recent transcription for this recording
    const [transcription] = await db
      .select()
      .from(transcriptions)
      .where(eq(transcriptions.recordingId, params.id))
      .orderBy(desc(transcriptions.createdAt))
      .limit(1);

    if (!transcription) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No transcription found for this recording' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: transcription.id,
        recordingId: transcription.recordingId,
        jobId: transcription.jobId,
        status: transcription.status,
        transcript: transcription.transcript,
        confidence: transcription.confidence,
        language: transcription.language,
        durationSeconds: transcription.durationSeconds,
        processingTimeSeconds: transcription.processingTimeSeconds,
        segments: transcription.segmentsJson ?? [],
        wordCount: transcription.wordCount,
        errorMessage: transcription.errorMessage,
        createdAt: transcription.createdAt.toISOString(),
        completedAt: transcription.completedAt?.toISOString() ?? null,
        updatedAt: transcription.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/recordings/[id]/transcript error:', error);
    return serverErrorResponse('Failed to fetch transcription');
  }
}

// ---------------------------------------------------------------------------
// POST - Submit a new transcription job to the Parakeet server
// ---------------------------------------------------------------------------

const submitTranscriptionSchema = z.object({
  language: z.string().min(2).max(10).default('en'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('recordings:view');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid recording ID format' } },
      { status: 400 }
    );
  }

  const parsed = await parseBody(request, submitTranscriptionSchema);
  if (!parsed.success) return parsed.response;

  try {
    // Verify recording exists
    const [recording] = await db
      .select({ id: recordings.id, duration: recordings.duration })
      .from(recordings)
      .where(eq(recordings.id, params.id))
      .limit(1);

    if (!recording) return notFoundResponse('Recording');

    // Create a pending transcription record
    const [transcription] = await db
      .insert(transcriptions)
      .values({
        recordingId: params.id,
        status: 'pending',
        language: parsed.data.language,
      })
      .returning();

    // Submit job to Parakeet server
    const audioUrl = `${NEXTAUTH_URL}/api/recordings/${params.id}/stream`;
    const callbackUrl = `${NEXTAUTH_URL}/api/recordings/${params.id}/transcript/callback`;

    let jobId: string | null = null;

    try {
      const parakeetResponse = await fetch(`${TRANSCRIPTION_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recording_id: params.id,
          audio_url: audioUrl,
          callback_url: callbackUrl,
          language: parsed.data.language,
        }),
      });

      if (parakeetResponse.ok) {
        const parakeetData = await parakeetResponse.json();
        jobId = parakeetData.job_id ?? parakeetData.jobId ?? null;

        // Update transcription with job ID and set status to processing
        await db
          .update(transcriptions)
          .set({
            jobId,
            status: 'processing',
            updatedAt: new Date(),
          })
          .where(eq(transcriptions.id, transcription.id));
      } else {
        // Parakeet server returned an error; mark transcription as failed
        const errorText = await parakeetResponse.text().catch(() => 'Unknown error');
        await db
          .update(transcriptions)
          .set({
            status: 'failed',
            errorMessage: `Parakeet server error (${parakeetResponse.status}): ${errorText}`,
            updatedAt: new Date(),
          })
          .where(eq(transcriptions.id, transcription.id));

        return NextResponse.json(
          {
            error: {
              code: 'TRANSCRIPTION_SUBMIT_FAILED',
              message: 'Failed to submit transcription job to Parakeet server',
            },
          },
          { status: 502 }
        );
      }
    } catch (fetchError) {
      // Network error reaching Parakeet server; keep as pending for retry
      console.error('Failed to reach Parakeet server:', fetchError);
      await db
        .update(transcriptions)
        .set({
          errorMessage: 'Failed to reach transcription server. Job will be retried.',
          updatedAt: new Date(),
        })
        .where(eq(transcriptions.id, transcription.id));
    }

    return NextResponse.json(
      {
        data: {
          transcriptionId: transcription.id,
          jobId,
          status: jobId ? 'processing' : 'pending',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/recordings/[id]/transcript error:', error);
    return serverErrorResponse('Failed to submit transcription job');
  }
}
