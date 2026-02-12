// ---------------------------------------------------------------------------
// GET /api/recordings/[id]/pci/segments - Get active/paused segments
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recordings, recordingPauseEvents, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/middleware';
import { uuidSchema, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';
import { getRecordingSegments } from '@/lib/recordings/pci';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole('supervisor');
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
      .select({ id: recordings.id, isDeleted: recordings.isDeleted })
      .from(recordings)
      .where(eq(recordings.id, params.id))
      .limit(1);

    if (!recording) return notFoundResponse('Recording');
    if (recording.isDeleted) {
      return NextResponse.json(
        { error: { code: 'GONE', message: 'Recording has been deleted' } },
        { status: 410 }
      );
    }

    // Get segments
    const segments = await getRecordingSegments(params.id);

    // Get audit trail (pause events with user info)
    const events = await db
      .select({
        id: recordingPauseEvents.id,
        eventType: recordingPauseEvents.eventType,
        timestampMs: recordingPauseEvents.timestampMs,
        reason: recordingPauseEvents.reason,
        userId: recordingPauseEvents.userId,
        userName: users.name,
        createdAt: recordingPauseEvents.createdAt,
      })
      .from(recordingPauseEvents)
      .leftJoin(users, eq(recordingPauseEvents.userId, users.id))
      .where(eq(recordingPauseEvents.recordingId, params.id))
      .orderBy(asc(recordingPauseEvents.createdAt));

    return NextResponse.json({
      data: {
        segments,
        auditTrail: events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          timestampMs: e.timestampMs,
          reason: e.reason,
          userId: e.userId,
          userName: e.userName ?? 'System',
          createdAt: e.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/recordings/[id]/pci/segments error:', error);
    return serverErrorResponse('Failed to fetch PCI segments');
  }
}
