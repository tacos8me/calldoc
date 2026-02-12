// ─── /api/admin/users/[id] ───────────────────────────────────────────────────
// GET: Single user
// PUT: Update user (name, email, role, active)
// DELETE: Deactivate user (set active=false)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/middleware';
import { uuidSchema, parseBody, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  role: z.enum(['admin', 'supervisor', 'agent', 'wallboard-only']).optional(),
  active: z.boolean().optional(),
  groupAccess: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole('supervisor');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID format' } },
      { status: 400 }
    );
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        groupAccess: users.groupAccess,
        permissions: users.permissions,
        lastLoginAt: users.lastLoginAt,
        active: users.active,
        ssoProvider: users.ssoProvider,
        ssoSubjectId: users.ssoSubjectId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);

    if (!user) return notFoundResponse('User');

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        groupAccess: user.groupAccess ?? [],
        permissions: user.permissions ?? [],
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        active: user.active,
        ssoProvider: user.ssoProvider,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/users/[id] error:', error);
    return serverErrorResponse('Failed to fetch user');
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
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID format' } },
      { status: 400 }
    );
  }

  const parsed = await parseBody(request, updateUserSchema);
  if (!parsed.success) return parsed.response;

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);

    if (!existing) return notFoundResponse('User');

    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    const d = parsed.data;
    if (d.name !== undefined) updateValues.name = d.name;
    if (d.email !== undefined) updateValues.email = d.email;
    if (d.role !== undefined) updateValues.role = d.role;
    if (d.active !== undefined) updateValues.active = d.active;
    if (d.groupAccess !== undefined) updateValues.groupAccess = d.groupAccess;
    if (d.permissions !== undefined) updateValues.permissions = d.permissions;

    const [updated] = await db
      .update(users)
      .set(updateValues)
      .where(eq(users.id, params.id))
      .returning();

    return NextResponse.json({
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        groupAccess: updated.groupAccess ?? [],
        permissions: updated.permissions ?? [],
        active: updated.active,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('PUT /api/admin/users/[id] error:', error);
    return serverErrorResponse('Failed to update user');
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
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID format' } },
      { status: 400 }
    );
  }

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);

    if (!existing) return notFoundResponse('User');

    // Soft delete: set active=false
    await db
      .update(users)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(users.id, params.id));

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('DELETE /api/admin/users/[id] error:', error);
    return serverErrorResponse('Failed to deactivate user');
  }
}
