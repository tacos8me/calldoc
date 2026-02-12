// ─── GET /api/groups ─────────────────────────────────────────────────────────
// List hunt groups with member counts.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { huntGroups, huntGroupMembers } from '@/lib/db/schema';
import { eq, sql, asc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { serverErrorResponse } from '@/lib/api/validation';

export async function GET(request: NextRequest) {
  const auth = await requirePermission('agents:view');
  if (!auth.authorized) return auth.response;

  try {
    const groups = await db
      .select({
        id: huntGroups.id,
        name: huntGroups.name,
        extension: huntGroups.extension,
        ringMode: huntGroups.ringMode,
        queueEnabled: huntGroups.queueEnabled,
        voicemailEnabled: huntGroups.voicemailEnabled,
        overflowGroup: huntGroups.overflowGroup,
        overflowTimeout: huntGroups.overflowTimeout,
        nightServiceGroup: huntGroups.nightServiceGroup,
        active: huntGroups.active,
        memberCount: sql<number>`(
          select count(*)::int from ${huntGroupMembers}
          where ${huntGroupMembers.huntGroupId} = ${huntGroups.id}
        )`,
        createdAt: huntGroups.createdAt,
        updatedAt: huntGroups.updatedAt,
      })
      .from(huntGroups)
      .where(eq(huntGroups.active, true))
      .orderBy(asc(huntGroups.name));

    return NextResponse.json({
      data: groups.map((g) => ({
        id: g.id,
        name: g.name,
        number: g.extension,
        ringMode: g.ringMode,
        queueEnabled: g.queueEnabled,
        voicemailEnabled: g.voicemailEnabled,
        overflowGroup: g.overflowGroup,
        overflowTimeout: g.overflowTimeout,
        nightServiceGroup: g.nightServiceGroup,
        memberCount: g.memberCount,
        active: g.active,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/groups error:', error);
    return serverErrorResponse('Failed to fetch hunt groups');
  }
}
