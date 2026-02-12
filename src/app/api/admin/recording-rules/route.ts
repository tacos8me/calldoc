// ─── /api/admin/recording-rules ──────────────────────────────────────────────
// GET: List recording rules ordered by priority
// POST: Create rule
// PUT: Update rule (including priority reorder)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { recordingRules } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { parseBody, serverErrorResponse, notFoundResponse } from '@/lib/api/validation';

const createRuleSchema = z.object({
  name: z.string().min(1).max(255),
  ruleType: z.enum([
    'agent', 'group', 'number', 'direction',
    'inbound-number-dialed', 'basic-call-event', 'advanced',
  ]),
  conditionsJson: z.record(z.unknown()),
  recordPercentage: z.number().int().min(0).max(100).default(100),
  direction: z.string().optional(),
  storagePoolId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
});

const updateRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  ruleType: z.enum([
    'agent', 'group', 'number', 'direction',
    'inbound-number-dialed', 'basic-call-event', 'advanced',
  ]).optional(),
  conditionsJson: z.record(z.unknown()).optional(),
  recordPercentage: z.number().int().min(0).max(100).optional(),
  direction: z.string().optional().nullable(),
  storagePoolId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission('recordings:manage-rules');
  if (!auth.authorized) return auth.response;

  try {
    const rules = await db
      .select()
      .from(recordingRules)
      .orderBy(asc(recordingRules.priority));

    return NextResponse.json({
      data: rules.map((r) => ({
        id: r.id,
        name: r.name,
        ruleType: r.ruleType,
        conditionsJson: r.conditionsJson,
        recordPercentage: r.recordPercentage,
        direction: r.direction,
        storagePoolId: r.storagePoolId,
        isActive: r.isActive,
        priority: r.priority,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/recording-rules error:', error);
    return serverErrorResponse('Failed to fetch recording rules');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('recordings:manage-rules');
  if (!auth.authorized) return auth.response;

  const parsed = await parseBody(request, createRuleSchema);
  if (!parsed.success) return parsed.response;

  try {
    const [rule] = await db
      .insert(recordingRules)
      .values({
        name: parsed.data.name,
        ruleType: parsed.data.ruleType,
        conditionsJson: parsed.data.conditionsJson,
        recordPercentage: parsed.data.recordPercentage,
        direction: parsed.data.direction ?? null,
        storagePoolId: parsed.data.storagePoolId ?? null,
        isActive: parsed.data.isActive,
        priority: parsed.data.priority,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          id: rule.id,
          name: rule.name,
          ruleType: rule.ruleType,
          conditionsJson: rule.conditionsJson,
          recordPercentage: rule.recordPercentage,
          direction: rule.direction,
          storagePoolId: rule.storagePoolId,
          isActive: rule.isActive,
          priority: rule.priority,
          createdAt: rule.createdAt.toISOString(),
          updatedAt: rule.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/admin/recording-rules error:', error);
    return serverErrorResponse('Failed to create recording rule');
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission('recordings:manage-rules');
  if (!auth.authorized) return auth.response;

  const parsed = await parseBody(request, updateRuleSchema);
  if (!parsed.success) return parsed.response;

  try {
    const { id, ...updates } = parsed.data;

    const [existing] = await db
      .select({ id: recordingRules.id })
      .from(recordingRules)
      .where(eq(recordingRules.id, id))
      .limit(1);

    if (!existing) return notFoundResponse('Recording rule');

    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) updateValues.name = updates.name;
    if (updates.ruleType !== undefined) updateValues.ruleType = updates.ruleType;
    if (updates.conditionsJson !== undefined) updateValues.conditionsJson = updates.conditionsJson;
    if (updates.recordPercentage !== undefined) updateValues.recordPercentage = updates.recordPercentage;
    if (updates.direction !== undefined) updateValues.direction = updates.direction;
    if (updates.storagePoolId !== undefined) updateValues.storagePoolId = updates.storagePoolId;
    if (updates.isActive !== undefined) updateValues.isActive = updates.isActive;
    if (updates.priority !== undefined) updateValues.priority = updates.priority;

    const [updated] = await db
      .update(recordingRules)
      .set(updateValues)
      .where(eq(recordingRules.id, id))
      .returning();

    return NextResponse.json({
      data: {
        id: updated.id,
        name: updated.name,
        ruleType: updated.ruleType,
        conditionsJson: updated.conditionsJson,
        recordPercentage: updated.recordPercentage,
        direction: updated.direction,
        storagePoolId: updated.storagePoolId,
        isActive: updated.isActive,
        priority: updated.priority,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('PUT /api/admin/recording-rules error:', error);
    return serverErrorResponse('Failed to update recording rule');
  }
}
