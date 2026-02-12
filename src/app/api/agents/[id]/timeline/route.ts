// ─── GET /api/agents/[id]/timeline ───────────────────────────────────────────
// Agent state history. Query params: from, to.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { agentStates, agents } from '@/lib/db/schema';
import { and, eq, gte, lte, asc, SQL } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import {
  dateRangeSchema,
  uuidSchema,
  parseSearchParams,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api/validation';

const timelineQuerySchema = dateRangeSchema;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('agents:view');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid agent ID format' } },
      { status: 400 }
    );
  }

  const parsed = parseSearchParams(request.url, timelineQuerySchema);
  if (!parsed.success) return parsed.response;

  const { from, to } = parsed.data;

  try {
    // Verify agent exists
    const [agent] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.id, params.id))
      .limit(1);

    if (!agent) return notFoundResponse('Agent');

    const conditions: SQL[] = [eq(agentStates.agentId, params.id)];
    if (from) conditions.push(gte(agentStates.startTime, new Date(from)));
    if (to) conditions.push(lte(agentStates.startTime, new Date(to)));

    const states = await db
      .select()
      .from(agentStates)
      .where(and(...conditions))
      .orderBy(asc(agentStates.startTime));

    return NextResponse.json({
      data: states.map((s) => ({
        agentId: s.agentId,
        state: s.state,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime?.toISOString() ?? null,
        duration: s.duration ?? 0,
        callId: s.callId,
        reason: s.reason,
      })),
    });
  } catch (error) {
    console.error('GET /api/agents/[id]/timeline error:', error);
    return serverErrorResponse('Failed to fetch agent timeline');
  }
}
