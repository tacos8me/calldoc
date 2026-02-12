// ─── /api/calls/[id]/notes ───────────────────────────────────────────────────
// GET: List notes for a call
// POST: Create a new note

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { callNotes, calls, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, parseBody, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';

const createNoteSchema = z.object({
  text: z.string().min(1).max(5000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('calls:view');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid call ID format' } },
      { status: 400 }
    );
  }

  try {
    // Verify call exists
    const [call] = await db
      .select({ id: calls.id })
      .from(calls)
      .where(eq(calls.id, params.id))
      .limit(1);

    if (!call) return notFoundResponse('Call');

    const notes = await db
      .select({
        id: callNotes.id,
        callId: callNotes.callId,
        userId: callNotes.userId,
        userName: users.name,
        noteText: callNotes.noteText,
        createdAt: callNotes.createdAt,
      })
      .from(callNotes)
      .leftJoin(users, eq(callNotes.userId, users.id))
      .where(eq(callNotes.callId, params.id))
      .orderBy(asc(callNotes.createdAt));

    return NextResponse.json({
      data: notes.map((n) => ({
        id: n.id,
        callId: n.callId,
        userId: n.userId,
        userName: n.userName ?? 'Unknown',
        text: n.noteText,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/calls/[id]/notes error:', error);
    return serverErrorResponse('Failed to fetch call notes');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('calls:view');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid call ID format' } },
      { status: 400 }
    );
  }

  const parsed = await parseBody(request, createNoteSchema);
  if (!parsed.success) return parsed.response;

  try {
    // Verify call exists
    const [call] = await db
      .select({ id: calls.id })
      .from(calls)
      .where(eq(calls.id, params.id))
      .limit(1);

    if (!call) return notFoundResponse('Call');

    const [note] = await db
      .insert(callNotes)
      .values({
        callId: params.id,
        userId: auth.user.userId,
        noteText: parsed.data.text,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          id: note.id,
          callId: note.callId,
          userId: note.userId,
          userName: auth.user.name,
          text: note.noteText,
          createdAt: note.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/calls/[id]/notes error:', error);
    return serverErrorResponse('Failed to create note');
  }
}
