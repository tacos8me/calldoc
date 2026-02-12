// ─── /api/recordings/[id]/notes ──────────────────────────────────────────────
// GET: List recording notes
// POST: Create note (body: { timestampMs, text })

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { recordingNotes, recordings, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, parseBody, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';

const createRecordingNoteSchema = z.object({
  timestampMs: z.number().int().min(0),
  text: z.string().min(1).max(5000),
});

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
    const [recording] = await db
      .select({ id: recordings.id })
      .from(recordings)
      .where(eq(recordings.id, params.id))
      .limit(1);

    if (!recording) return notFoundResponse('Recording');

    const notes = await db
      .select({
        id: recordingNotes.id,
        recordingId: recordingNotes.recordingId,
        userId: recordingNotes.userId,
        userName: users.name,
        timestampMs: recordingNotes.timestampMs,
        noteText: recordingNotes.noteText,
        createdAt: recordingNotes.createdAt,
      })
      .from(recordingNotes)
      .leftJoin(users, eq(recordingNotes.userId, users.id))
      .where(eq(recordingNotes.recordingId, params.id))
      .orderBy(asc(recordingNotes.timestampMs));

    return NextResponse.json({
      data: notes.map((n) => ({
        id: n.id,
        recordingId: n.recordingId,
        userId: n.userId,
        userName: n.userName ?? 'Unknown',
        timestampMs: n.timestampMs,
        text: n.noteText,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/recordings/[id]/notes error:', error);
    return serverErrorResponse('Failed to fetch recording notes');
  }
}

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

  const parsed = await parseBody(request, createRecordingNoteSchema);
  if (!parsed.success) return parsed.response;

  try {
    const [recording] = await db
      .select({ id: recordings.id })
      .from(recordings)
      .where(eq(recordings.id, params.id))
      .limit(1);

    if (!recording) return notFoundResponse('Recording');

    const [note] = await db
      .insert(recordingNotes)
      .values({
        recordingId: params.id,
        userId: auth.user.userId,
        timestampMs: parsed.data.timestampMs,
        noteText: parsed.data.text,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          id: note.id,
          recordingId: note.recordingId,
          userId: note.userId,
          userName: auth.user.name,
          timestampMs: note.timestampMs,
          text: note.noteText,
          createdAt: note.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/recordings/[id]/notes error:', error);
    return serverErrorResponse('Failed to create recording note');
  }
}
