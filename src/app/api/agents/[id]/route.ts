// ─── GET /api/agents/[id] ────────────────────────────────────────────────────
// Single agent with current state and group memberships.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents, huntGroupMembers, huntGroups } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';

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

  try {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, params.id))
      .limit(1);

    if (!agent) return notFoundResponse('Agent');

    // Fetch group memberships
    const memberships = await db
      .select({
        groupId: huntGroupMembers.huntGroupId,
        groupName: huntGroups.name,
        priority: huntGroupMembers.priority,
        isEnabled: huntGroupMembers.isEnabled,
      })
      .from(huntGroupMembers)
      .innerJoin(huntGroups, eq(huntGroupMembers.huntGroupId, huntGroups.id))
      .where(eq(huntGroupMembers.agentId, params.id));

    return NextResponse.json({
      data: {
        id: agent.id,
        extension: agent.extension,
        name: agent.name,
        firstName: agent.firstName,
        lastName: agent.lastName,
        state: agent.state,
        stateStartTime: agent.stateStartTime?.toISOString() ?? new Date().toISOString(),
        stateDuration: agent.stateStartTime
          ? Math.floor((Date.now() - agent.stateStartTime.getTime()) / 1000)
          : 0,
        activeCallId: agent.activeCallId,
        loginTime: agent.loginTime?.toISOString() ?? null,
        skills: agent.skills ?? [],
        active: agent.active,
        groups: memberships.map((m) => ({
          id: m.groupId,
          name: m.groupName,
          priority: m.priority,
          isEnabled: m.isEnabled,
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/agents/[id] error:', error);
    return serverErrorResponse('Failed to fetch agent');
  }
}
