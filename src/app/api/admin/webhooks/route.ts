// ---------------------------------------------------------------------------
// GET/POST /api/admin/webhooks - CRUD for webhook endpoints
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { webhookEndpoints } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/middleware';
import { parseBody, serverErrorResponse } from '@/lib/api/validation';
import { auditLog } from '@/lib/audit/service';
import * as crypto from 'crypto';

const VALID_EVENTS = [
  'call.started',
  'call.ended',
  'call.abandoned',
  'agent.state_changed',
  'alert.fired',
  'recording.ready',
] as const;

const createWebhookSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url().max(2048),
  events: z.array(z.enum(VALID_EVENTS)).min(1),
  active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.authorized) return auth.response;

  try {
    const endpoints = await db
      .select()
      .from(webhookEndpoints)
      .orderBy(desc(webhookEndpoints.createdAt));

    return NextResponse.json({
      data: endpoints.map((ep) => ({
        id: ep.id,
        name: ep.name,
        url: ep.url,
        events: ep.events,
        active: ep.active,
        createdBy: ep.createdBy,
        createdAt: ep.createdAt.toISOString(),
        updatedAt: ep.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/webhooks error:', error);
    return serverErrorResponse('Failed to fetch webhook endpoints');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.authorized) return auth.response;

  const parsed = await parseBody(request, createWebhookSchema);
  if (!parsed.success) return parsed.response;

  try {
    // Generate a random secret for HMAC signing
    const secret = crypto.randomBytes(32).toString('hex');

    const [endpoint] = await db
      .insert(webhookEndpoints)
      .values({
        name: parsed.data.name,
        url: parsed.data.url,
        secret,
        events: parsed.data.events,
        active: parsed.data.active,
        createdBy: auth.user.userId,
      })
      .returning();

    await auditLog(
      auth.user.userId,
      auth.user.name,
      'webhook.created',
      'webhook_endpoint',
      endpoint.id,
      { name: parsed.data.name, url: parsed.data.url, events: parsed.data.events }
    );

    return NextResponse.json(
      {
        data: {
          id: endpoint.id,
          name: endpoint.name,
          url: endpoint.url,
          secret: endpoint.secret,
          events: endpoint.events,
          active: endpoint.active,
          createdAt: endpoint.createdAt.toISOString(),
          updatedAt: endpoint.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/admin/webhooks error:', error);
    return serverErrorResponse('Failed to create webhook endpoint');
  }
}
