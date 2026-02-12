// ---------------------------------------------------------------------------
// GET/PUT/DELETE /api/admin/webhooks/[id] - Individual webhook endpoint ops
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { webhookEndpoints } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/middleware';
import { uuidSchema, parseBody, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';
import { auditLog } from '@/lib/audit/service';
import { webhookService } from '@/lib/webhooks/service';

const VALID_EVENTS = [
  'call.started',
  'call.ended',
  'call.abandoned',
  'agent.state_changed',
  'alert.fired',
  'recording.ready',
] as const;

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().max(2048).optional(),
  events: z.array(z.enum(VALID_EVENTS)).min(1).optional(),
  active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole('admin');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid webhook endpoint ID' } },
      { status: 400 }
    );
  }

  try {
    const [endpoint] = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, params.id))
      .limit(1);

    if (!endpoint) return notFoundResponse('Webhook endpoint');

    // Also fetch delivery history
    const history = await webhookService.getDeliveryHistory(params.id, 1, 50);

    return NextResponse.json({
      data: {
        id: endpoint.id,
        name: endpoint.name,
        url: endpoint.url,
        events: endpoint.events,
        active: endpoint.active,
        createdBy: endpoint.createdBy,
        createdAt: endpoint.createdAt.toISOString(),
        updatedAt: endpoint.updatedAt.toISOString(),
        deliveries: history.data,
        deliveryCount: history.total,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/webhooks/[id] error:', error);
    return serverErrorResponse('Failed to fetch webhook endpoint');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole('admin');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid webhook endpoint ID' } },
      { status: 400 }
    );
  }

  const parsed = await parseBody(request, updateWebhookSchema);
  if (!parsed.success) return parsed.response;

  try {
    const [existing] = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, params.id))
      .limit(1);

    if (!existing) return notFoundResponse('Webhook endpoint');

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.url !== undefined) updates.url = parsed.data.url;
    if (parsed.data.events !== undefined) updates.events = parsed.data.events;
    if (parsed.data.active !== undefined) updates.active = parsed.data.active;

    const [updated] = await db
      .update(webhookEndpoints)
      .set(updates)
      .where(eq(webhookEndpoints.id, params.id))
      .returning();

    await auditLog(
      auth.user.userId,
      auth.user.name,
      'webhook.updated',
      'webhook_endpoint',
      params.id,
      { changes: parsed.data }
    );

    return NextResponse.json({
      data: {
        id: updated.id,
        name: updated.name,
        url: updated.url,
        events: updated.events,
        active: updated.active,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('PUT /api/admin/webhooks/[id] error:', error);
    return serverErrorResponse('Failed to update webhook endpoint');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole('admin');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid webhook endpoint ID' } },
      { status: 400 }
    );
  }

  try {
    const [existing] = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, params.id))
      .limit(1);

    if (!existing) return notFoundResponse('Webhook endpoint');

    await db
      .delete(webhookEndpoints)
      .where(eq(webhookEndpoints.id, params.id));

    await auditLog(
      auth.user.userId,
      auth.user.name,
      'webhook.deleted',
      'webhook_endpoint',
      params.id,
      { name: existing.name }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/admin/webhooks/[id] error:', error);
    return serverErrorResponse('Failed to delete webhook endpoint');
  }
}
