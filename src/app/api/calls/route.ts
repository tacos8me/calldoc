// ─── GET /api/calls ──────────────────────────────────────────────────────────
// List calls with filtering, pagination, and sorting.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { calls, agents } from '@/lib/db/schema';
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

const callsQuerySchema = paginationSchema.merge(sortSchema).merge(dateRangeSchema).extend({
  caller: z.string().optional(),
  called: z.string().optional(),
  agent: z.string().uuid().optional(),
  group: z.string().optional(),
  direction: z.enum(['inbound', 'outbound', 'internal']).optional(),
  state: z.enum([
    'idle', 'ringing', 'connected', 'hold', 'transferring',
    'conferencing', 'queued', 'parked', 'voicemail', 'completed', 'abandoned',
  ]).optional(),
  hasRecording: z.coerce.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission('calls:view');
  if (!auth.authorized) return auth.response;

  const parsed = parseSearchParams(request.url, callsQuerySchema);
  if (!parsed.success) return parsed.response;

  const { page, limit, sort, order, from, to, caller, called, agent, group, direction, state, hasRecording } = parsed.data;

  try {
    // Build dynamic where conditions
    const conditions: SQL[] = [];

    if (from) conditions.push(gte(calls.startTime, new Date(from)));
    if (to) conditions.push(lte(calls.startTime, new Date(to)));
    if (caller) conditions.push(like(calls.callerNumber, `%${caller}%`));
    if (called) conditions.push(like(calls.calledNumber, `%${called}%`));
    if (agent) conditions.push(eq(calls.agentId, agent));
    if (group) conditions.push(eq(calls.queueName, group));
    if (direction) conditions.push(eq(calls.direction, direction));
    if (state) conditions.push(eq(calls.state, state));
    if (hasRecording !== undefined) conditions.push(eq(calls.isRecorded, hasRecording));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(calls)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    // Build ORDER BY clause
    const orderFn = order === 'asc' ? asc : desc;
    const orderByClause = (() => {
      switch (sort) {
        case 'endTime': return orderFn(calls.endTime);
        case 'duration': return orderFn(calls.duration);
        case 'callerNumber': return orderFn(calls.callerNumber);
        case 'calledNumber': return orderFn(calls.calledNumber);
        case 'agentName': return orderFn(calls.agentName);
        case 'direction': return orderFn(calls.direction);
        case 'state': return orderFn(calls.state);
        default: return orderFn(calls.startTime);
      }
    })();

    // Fetch paginated results with agent name join
    const rows = await db
      .select({
        id: calls.id,
        direction: calls.direction,
        state: calls.state,
        callerNumber: calls.callerNumber,
        callerName: calls.callerName,
        calledNumber: calls.calledNumber,
        calledName: calls.calledName,
        queueName: calls.queueName,
        queueEntryTime: calls.queueEntryTime,
        agentId: calls.agentId,
        agentExtension: calls.agentExtension,
        agentName: calls.agentName,
        trunkId: calls.trunkId,
        startTime: calls.startTime,
        answerTime: calls.answerTime,
        endTime: calls.endTime,
        duration: calls.duration,
        talkDuration: calls.talkDuration,
        holdCount: calls.holdCount,
        holdDuration: calls.holdDuration,
        transferCount: calls.transferCount,
        isRecorded: calls.isRecorded,
        tags: calls.tags,
      })
      .from(calls)
      .leftJoin(agents, eq(calls.agentId, agents.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset((page - 1) * limit);

    const data = rows.map((row) => ({
      id: row.id,
      direction: row.direction,
      state: row.state,
      callerNumber: row.callerNumber,
      callerName: row.callerName,
      calledNumber: row.calledNumber,
      calledName: row.calledName,
      queueName: row.queueName,
      queueEntryTime: row.queueEntryTime?.toISOString() ?? null,
      agentExtension: row.agentExtension,
      agentName: row.agentName,
      trunkId: row.trunkId,
      startTime: row.startTime.toISOString(),
      answerTime: row.answerTime?.toISOString() ?? null,
      endTime: row.endTime?.toISOString() ?? null,
      duration: row.duration,
      holdCount: row.holdCount,
      holdDuration: row.holdDuration,
      transferCount: row.transferCount,
      recordingId: null,
      tags: row.tags ?? [],
    }));

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    console.error('GET /api/calls error:', error);
    return serverErrorResponse('Failed to fetch calls');
  }
}
