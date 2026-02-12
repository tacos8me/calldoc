// ─── GET /api/calls/[id]/events ──────────────────────────────────────────────
// Call events for a specific call, ordered by timestamp.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callEvents, calls } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';

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

    const events = await db
      .select()
      .from(callEvents)
      .where(eq(callEvents.callId, params.id))
      .orderBy(asc(callEvents.timestamp));

    return NextResponse.json({
      data: events.map((e) => ({
        id: e.id,
        callId: e.callId,
        type: e.eventType,
        timestamp: e.timestamp.toISOString(),
        duration: e.duration,
        party: e.party,
        agentId: e.agentId,
        agentExtension: e.agentExtension,
        queueName: e.queueName,
        details: e.details ?? {},
      })),
    });
  } catch (error) {
    console.error('GET /api/calls/[id]/events error:', error);
    return serverErrorResponse('Failed to fetch call events');
  }
}
