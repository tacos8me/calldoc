// ─── GET /api/devlink3/status ────────────────────────────────────────────────
// DevLink3 connection health, uptime, event rate.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { systemStatus, systems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { serverErrorResponse } from '@/lib/api/validation';

export async function GET(request: NextRequest) {
  const auth = await requirePermission('admin:connections');
  if (!auth.authorized) return auth.response;

  try {
    // Fetch all system statuses for devlink3 connections
    const statuses = await db
      .select({
        id: systemStatus.id,
        systemId: systemStatus.systemId,
        systemName: systems.name,
        connectionType: systemStatus.connectionType,
        status: systemStatus.status,
        lastConnectedAt: systemStatus.lastConnectedAt,
        lastDisconnectedAt: systemStatus.lastDisconnectedAt,
        lastHeartbeatAt: systemStatus.lastHeartbeatAt,
        lastErrorMessage: systemStatus.lastErrorMessage,
        reconnectAttempts: systemStatus.reconnectAttempts,
        eventsReceived: systemStatus.eventsReceived,
        uptime: systemStatus.uptime,
        metadata: systemStatus.metadata,
        updatedAt: systemStatus.updatedAt,
      })
      .from(systemStatus)
      .innerJoin(systems, eq(systemStatus.systemId, systems.id))
      .where(eq(systemStatus.connectionType, 'devlink3'));

    return NextResponse.json({
      data: statuses.map((s) => ({
        id: s.id,
        systemId: s.systemId,
        systemName: s.systemName,
        connectionType: s.connectionType,
        status: s.status,
        lastConnectedAt: s.lastConnectedAt?.toISOString() ?? null,
        lastDisconnectedAt: s.lastDisconnectedAt?.toISOString() ?? null,
        lastHeartbeatAt: s.lastHeartbeatAt?.toISOString() ?? null,
        lastErrorMessage: s.lastErrorMessage,
        reconnectAttempts: s.reconnectAttempts,
        eventsReceived: s.eventsReceived,
        uptime: s.uptime,
        metadata: s.metadata ?? {},
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/devlink3/status error:', error);
    return serverErrorResponse('Failed to fetch DevLink3 status');
  }
}
