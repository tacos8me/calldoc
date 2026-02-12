// ─── GET /api/recordings ─────────────────────────────────────────────────────
// List recordings with filtering, pagination. Joins with calls for call details.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { recordings, calls } from '@/lib/db/schema';
import { and, eq, like, gte, lte, desc, asc, sql, SQL } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import {
  paginationSchema,
  sortSchema,
  dateRangeSchema,
  parseSearchParams,
  paginatedResponse,
  serverErrorResponse,
} from '@/lib/api/validation';

const recordingsQuerySchema = paginationSchema.merge(sortSchema).merge(dateRangeSchema).extend({
  agent: z.string().uuid().optional(),
  caller: z.string().optional(),
  called: z.string().optional(),
  minDuration: z.coerce.number().int().optional(),
  maxDuration: z.coerce.number().int().optional(),
  scored: z.coerce.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission('recordings:view');
  if (!auth.authorized) return auth.response;

  const parsed = parseSearchParams(request.url, recordingsQuerySchema);
  if (!parsed.success) return parsed.response;

  const { page, limit, sort, order, from, to, agent, caller, called, minDuration, maxDuration, scored } = parsed.data;

  try {
    const conditions: SQL[] = [eq(recordings.isDeleted, false)];

    if (from) conditions.push(gte(recordings.startTime, new Date(from)));
    if (to) conditions.push(lte(recordings.startTime, new Date(to)));
    if (agent) conditions.push(eq(recordings.agentId, agent));
    if (caller) conditions.push(like(recordings.callerNumber, `%${caller}%`));
    if (called) conditions.push(like(recordings.calledNumber, `%${called}%`));
    if (minDuration !== undefined) conditions.push(gte(recordings.duration, minDuration));
    if (maxDuration !== undefined) conditions.push(lte(recordings.duration, maxDuration));
    if (scored !== undefined) conditions.push(eq(recordings.hasScorecard, scored));

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(recordings)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    const sortColumn =
      sort === 'duration' ? recordings.duration :
      sort === 'fileSize' ? recordings.fileSize :
      recordings.startTime;
    const orderFn = order === 'asc' ? asc : desc;

    const rows = await db
      .select({
        id: recordings.id,
        callId: recordings.callId,
        agentId: recordings.agentId,
        agentName: recordings.agentName,
        callerNumber: recordings.callerNumber,
        calledNumber: recordings.calledNumber,
        direction: recordings.direction,
        startTime: recordings.startTime,
        endTime: recordings.endTime,
        duration: recordings.duration,
        fileSize: recordings.fileSize,
        storedFormat: recordings.storedFormat,
        storagePoolId: recordings.storagePoolId,
        storagePath: recordings.storagePath,
        hasScorecard: recordings.hasScorecard,
        overallScore: recordings.overallScore,
        tags: recordings.tags,
        retainUntil: recordings.retainUntil,
        // Call details via join
        callDirection: calls.direction,
        callState: calls.state,
      })
      .from(recordings)
      .leftJoin(calls, eq(recordings.callId, calls.id))
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset((page - 1) * limit);

    const data = rows.map((r) => ({
      id: r.id,
      callId: r.callId,
      agentId: r.agentId,
      agentName: r.agentName,
      callerNumber: r.callerNumber ?? '',
      calledNumber: r.calledNumber ?? '',
      direction: r.direction ?? r.callDirection ?? 'inbound',
      startTime: r.startTime?.toISOString() ?? '',
      endTime: r.endTime?.toISOString() ?? '',
      duration: r.duration,
      fileSize: r.fileSize,
      format: r.storedFormat,
      storagePool: r.storagePoolId,
      storagePath: r.storagePath,
      hasScorecard: r.hasScorecard,
      score: r.overallScore,
      tags: r.tags ?? [],
      retainUntil: r.retainUntil ?? '',
    }));

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    console.error('GET /api/recordings error:', error);
    return serverErrorResponse('Failed to fetch recordings');
  }
}
