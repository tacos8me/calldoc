// ─── GET /api/agents ─────────────────────────────────────────────────────────
// List all agents with current state and group membership.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { agents, huntGroupMembers, huntGroups } from '@/lib/db/schema';
import { and, eq, sql, SQL } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import {
  paginationSchema,
  parseSearchParams,
  paginatedResponse,
  serverErrorResponse,
} from '@/lib/api/validation';

const agentsQuerySchema = paginationSchema.extend({
  state: z.enum([
    'idle', 'talking', 'ringing', 'hold', 'acw', 'dnd', 'away', 'logged-out', 'unknown',
  ]).optional(),
  group: z.string().uuid().optional(),
  active: z.coerce.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission('agents:view');
  if (!auth.authorized) return auth.response;

  const parsed = parseSearchParams(request.url, agentsQuerySchema);
  if (!parsed.success) return parsed.response;

  const { page, limit, state, group, active } = parsed.data;

  try {
    const conditions: SQL[] = [eq(agents.active, active)];

    if (state) conditions.push(eq(agents.state, state));

    // If filtering by group, join through hunt_group_members
    if (group) {
      const memberAgentIds = await db
        .select({ agentId: huntGroupMembers.agentId })
        .from(huntGroupMembers)
        .where(eq(huntGroupMembers.huntGroupId, group));

      const ids = memberAgentIds.map((m) => m.agentId);
      if (ids.length === 0) {
        return paginatedResponse([], 0, page, limit);
      }
      conditions.push(sql`${agents.id} = ANY(${ids})`);
    }

    const whereClause = and(...conditions);

    // Count total
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agents)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    // Fetch agents
    const rows = await db
      .select()
      .from(agents)
      .where(whereClause)
      .limit(limit)
      .offset((page - 1) * limit);

    // Fetch group memberships for all returned agents
    const agentIds = rows.map((a) => a.id);
    const memberships =
      agentIds.length > 0
        ? await db
            .select({
              agentId: huntGroupMembers.agentId,
              groupId: huntGroupMembers.huntGroupId,
              groupName: huntGroups.name,
            })
            .from(huntGroupMembers)
            .innerJoin(huntGroups, eq(huntGroupMembers.huntGroupId, huntGroups.id))
            .where(sql`${huntGroupMembers.agentId} = ANY(${agentIds})`)
        : [];

    // Build a map of agentId -> group ids
    const groupMap = new Map<string, string[]>();
    for (const m of memberships) {
      const groups = groupMap.get(m.agentId) ?? [];
      groups.push(m.groupId);
      groupMap.set(m.agentId, groups);
    }

    const data = rows.map((a) => ({
      id: a.id,
      extension: a.extension,
      name: a.name,
      state: a.state,
      stateStartTime: a.stateStartTime?.toISOString() ?? new Date().toISOString(),
      stateDuration: a.stateStartTime
        ? Math.floor((Date.now() - a.stateStartTime.getTime()) / 1000)
        : 0,
      activeCallId: a.activeCallId,
      groups: groupMap.get(a.id) ?? [],
      skills: a.skills ?? [],
      loginTime: a.loginTime?.toISOString() ?? null,
    }));

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    console.error('GET /api/agents error:', error);
    return serverErrorResponse('Failed to fetch agents');
  }
}
