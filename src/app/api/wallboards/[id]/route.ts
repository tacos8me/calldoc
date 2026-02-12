// ─── /api/wallboards/[id] ────────────────────────────────────────────────────
// GET: Single wallboard config with widgets and layouts
// PUT: Update wallboard
// DELETE: Delete wallboard (soft delete via active=false)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { wallboards, wallboardWidgets } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, parseBody, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';

const updateWallboardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  theme: z.enum(['dark', 'light', 'custom']).optional(),
  resolutionWidth: z.number().int().min(640).max(7680).optional(),
  resolutionHeight: z.number().int().min(480).max(4320).optional(),
  refreshInterval: z.number().int().min(5).max(300).optional(),
  isPublished: z.boolean().optional(),
  layouts: z.record(z.array(z.object({
    i: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    minW: z.number().optional(),
    minH: z.number().optional(),
    static: z.boolean().optional(),
  }))).optional(),
  backgroundImage: z.string().max(1024).optional().nullable(),
  backgroundColor: z.string().max(32).optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('wallboards:view');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid wallboard ID format' } },
      { status: 400 }
    );
  }

  try {
    const [wallboard] = await db
      .select()
      .from(wallboards)
      .where(eq(wallboards.id, params.id))
      .limit(1);

    if (!wallboard || !wallboard.active) return notFoundResponse('Wallboard');

    const widgets = await db
      .select()
      .from(wallboardWidgets)
      .where(eq(wallboardWidgets.wallboardId, params.id))
      .orderBy(asc(wallboardWidgets.sortOrder));

    return NextResponse.json({
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
        isPublished: wallboard.isPublished,
        layouts: wallboard.layouts ?? {},
        backgroundImage: wallboard.backgroundImage,
        backgroundColor: wallboard.backgroundColor,
        createdAt: wallboard.createdAt.toISOString(),
        updatedAt: wallboard.updatedAt.toISOString(),
        widgets: widgets.map((w) => ({
          id: w.id,
          type: w.widgetType,
          title: w.title,
          config: w.config ?? {},
          thresholds: w.thresholds ?? [],
          sortOrder: w.sortOrder,
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/wallboards/[id] error:', error);
    return serverErrorResponse('Failed to fetch wallboard');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('wallboards:edit');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid wallboard ID format' } },
      { status: 400 }
    );
  }

  const parsed = await parseBody(request, updateWallboardSchema);
  if (!parsed.success) return parsed.response;

  try {
    const [existing] = await db
      .select({ id: wallboards.id, active: wallboards.active })
      .from(wallboards)
      .where(eq(wallboards.id, params.id))
      .limit(1);

    if (!existing || !existing.active) return notFoundResponse('Wallboard');

    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    const d = parsed.data;
    if (d.name !== undefined) updateValues.name = d.name;
    if (d.description !== undefined) updateValues.description = d.description;
    if (d.theme !== undefined) updateValues.theme = d.theme;
    if (d.resolutionWidth !== undefined) updateValues.resolutionWidth = d.resolutionWidth;
    if (d.resolutionHeight !== undefined) updateValues.resolutionHeight = d.resolutionHeight;
    if (d.refreshInterval !== undefined) updateValues.refreshInterval = d.refreshInterval;
    if (d.isPublished !== undefined) updateValues.isPublished = d.isPublished;
    if (d.layouts !== undefined) updateValues.layouts = d.layouts;
    if (d.backgroundImage !== undefined) updateValues.backgroundImage = d.backgroundImage;
    if (d.backgroundColor !== undefined) updateValues.backgroundColor = d.backgroundColor;

    const [updated] = await db
      .update(wallboards)
      .set(updateValues)
      .where(eq(wallboards.id, params.id))
      .returning();

    return NextResponse.json({
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        theme: updated.theme,
        resolution: {
          width: updated.resolutionWidth,
          height: updated.resolutionHeight,
        },
        refreshInterval: updated.refreshInterval,
        isPublished: updated.isPublished,
        layouts: updated.layouts ?? {},
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('PUT /api/wallboards/[id] error:', error);
    return serverErrorResponse('Failed to update wallboard');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('wallboards:edit');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid wallboard ID format' } },
      { status: 400 }
    );
  }

  try {
    const [existing] = await db
      .select({ id: wallboards.id })
      .from(wallboards)
      .where(eq(wallboards.id, params.id))
      .limit(1);

    if (!existing) return notFoundResponse('Wallboard');

    await db
      .update(wallboards)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(wallboards.id, params.id));

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('DELETE /api/wallboards/[id] error:', error);
    return serverErrorResponse('Failed to delete wallboard');
  }
}
