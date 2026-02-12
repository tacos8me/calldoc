// ─── /api/admin/alerts ───────────────────────────────────────────────────────
// GET: List alert rules
// POST: Create alert rule

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { alertRules } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { parseBody, serverErrorResponse } from '@/lib/api/validation';

const createAlertRuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  metric: z.string().min(1).max(128),
  condition: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'ne']),
  threshold: z.number().int(),
  severity: z.enum(['info', 'warning', 'critical']).default('warning'),
  evaluationWindow: z.string().max(32).default('immediate'),
  cooldownMinutes: z.number().int().min(0).default(15),
  notifyInApp: z.boolean().default(true),
  notifyEmail: z.boolean().default(false),
  notifyWallboard: z.boolean().default(false),
  emailRecipients: z.array(z.string().email()).optional().default([]),
  targetGroups: z.array(z.string()).optional().default([]),
  targetAgents: z.array(z.string()).optional().default([]),
  active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission('alerts:view');
  if (!auth.authorized) return auth.response;

  try {
    const rules = await db
      .select()
      .from(alertRules)
      .orderBy(asc(alertRules.name));

    return NextResponse.json({
      data: rules.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        metric: r.metric,
        condition: r.condition,
        threshold: r.threshold,
        severity: r.severity,
        evaluationWindow: r.evaluationWindow,
        cooldownMinutes: r.cooldownMinutes,
        notifyInApp: r.notifyInApp,
        notifyEmail: r.notifyEmail,
        notifyWallboard: r.notifyWallboard,
        emailRecipients: r.emailRecipients ?? [],
        targetGroups: r.targetGroups ?? [],
        targetAgents: r.targetAgents ?? [],
        isBuiltIn: r.isBuiltIn,
        active: r.active,
        lastFiredAt: r.lastFiredAt?.toISOString() ?? null,
        createdBy: r.createdBy,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/alerts error:', error);
    return serverErrorResponse('Failed to fetch alert rules');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('alerts:manage');
  if (!auth.authorized) return auth.response;

  const parsed = await parseBody(request, createAlertRuleSchema);
  if (!parsed.success) return parsed.response;

  try {
    const [rule] = await db
      .insert(alertRules)
      .values({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        metric: parsed.data.metric,
        condition: parsed.data.condition,
        threshold: parsed.data.threshold,
        severity: parsed.data.severity,
        evaluationWindow: parsed.data.evaluationWindow,
        cooldownMinutes: parsed.data.cooldownMinutes,
        notifyInApp: parsed.data.notifyInApp,
        notifyEmail: parsed.data.notifyEmail,
        notifyWallboard: parsed.data.notifyWallboard,
        emailRecipients: parsed.data.emailRecipients,
        targetGroups: parsed.data.targetGroups,
        targetAgents: parsed.data.targetAgents,
        active: parsed.data.active,
        createdBy: auth.user.userId,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          id: rule.id,
          name: rule.name,
          description: rule.description,
          metric: rule.metric,
          condition: rule.condition,
          threshold: rule.threshold,
          severity: rule.severity,
          evaluationWindow: rule.evaluationWindow,
          cooldownMinutes: rule.cooldownMinutes,
          notifyInApp: rule.notifyInApp,
          notifyEmail: rule.notifyEmail,
          notifyWallboard: rule.notifyWallboard,
          emailRecipients: rule.emailRecipients ?? [],
          targetGroups: rule.targetGroups ?? [],
          targetAgents: rule.targetAgents ?? [],
          active: rule.active,
          createdBy: rule.createdBy,
          createdAt: rule.createdAt.toISOString(),
          updatedAt: rule.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/admin/alerts error:', error);
    return serverErrorResponse('Failed to create alert rule');
  }
}
