// ─── /api/wallboards ─────────────────────────────────────────────────────────
// GET: List wallboard configs
// POST: Create new wallboard

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { wallboards, wallboardWidgets } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import {
  paginationSchema,
  parseSearchParams,
  parseBody,
  paginatedResponse,
  serverErrorResponse,
} from '@/lib/api/validation';

const wallboardsQuerySchema = paginationSchema;

const createWallboardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  theme: z.enum(['dark', 'light', 'custom']).default('dark'),
  resolutionWidth: z.number().int().min(640).max(7680).default(1920),
  resolutionHeight: z.number().int().min(480).max(4320).default(1080),
  refreshInterval: z.number().int().min(5).max(300).default(30),
  layouts: z.record(z.array(z.object({
    i: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    minW: z.number().optional(),
    minH: z.number().optional(),
    static: z.boolean().optional(),
  }))).optional().default({}),
  widgets: z.array(z.object({
    widgetType: z.string(),
    title: z.string().default(''),
    config: z.record(z.unknown()).default({}),
    thresholds: z.array(z.object({
      operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
      value: z.number(),
      color: z.string(),
      flash: z.boolean().optional(),
    })).default([]),
    sortOrder: z.number().int().default(0),
  })).optional().default([]),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission('wallboards:view');
  if (!auth.authorized) return auth.response;

  const parsed = parseSearchParams(request.url, wallboardsQuerySchema);
  if (!parsed.success) return parsed.response;

  const { page, limit } = parsed.data;

  try {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wallboards)
      .where(eq(wallboards.active, true));

    const total = countResult?.count ?? 0;

    const rows = await db
      .select()
      .from(wallboards)
      .where(eq(wallboards.active, true))
      .orderBy(desc(wallboards.updatedAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const data = rows.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      createdBy: w.createdBy,
      theme: w.theme,
      resolution: { width: w.resolutionWidth, height: w.resolutionHeight },
      refreshInterval: w.refreshInterval,
      isPublished: w.isPublished,
      layouts: w.layouts ?? {},
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    }));

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    console.error('GET /api/wallboards error:', error);
    return serverErrorResponse('Failed to fetch wallboards');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('wallboards:edit');
  if (!auth.authorized) return auth.response;

  const parsed = await parseBody(request, createWallboardSchema);
  if (!parsed.success) return parsed.response;

  try {
    const [wallboard] = await db
      .insert(wallboards)
      .values({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        createdBy: auth.user.userId,
        theme: parsed.data.theme,
        resolutionWidth: parsed.data.resolutionWidth,
        resolutionHeight: parsed.data.resolutionHeight,
        refreshInterval: parsed.data.refreshInterval,
        layouts: parsed.data.layouts,
      })
      .returning();

    // Create widgets if provided
    if (parsed.data.widgets.length > 0) {
      await db.insert(wallboardWidgets).values(
        parsed.data.widgets.map((w, idx) => ({
          wallboardId: wallboard.id,
          widgetType: w.widgetType as 'active-calls',
          title: w.title,
          config: w.config,
          thresholds: w.thresholds,
          sortOrder: w.sortOrder ?? idx,
        }))
      );
    }

    return NextResponse.json(
      {
        data: {
          id: wallboard.id,
          name: wallboard.name,
          description: wallboard.description,
          createdBy: wallboard.createdBy,
          theme: wallboard.theme,
          resolution: {
            width: wallboard.resolutionWidth,
            height: wallboard.resolutionHeight,
          },
          refreshInterval: wallboard.refreshInterval,
          layouts: wallboard.layouts ?? {},
          createdAt: wallboard.createdAt.toISOString(),
          updatedAt: wallboard.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/wallboards error:', error);
    return serverErrorResponse('Failed to create wallboard');
  }
}
