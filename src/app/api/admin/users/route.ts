// ─── /api/admin/users ────────────────────────────────────────────────────────
// GET: List users with search/filter. Requires admin or supervisor role.
// POST: Create user (name, email, role, password).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { and, eq, like, sql, desc, asc, SQL } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/middleware';
import {
  paginationSchema,
  sortSchema,
  parseSearchParams,
  parseBody,
  paginatedResponse,
  serverErrorResponse,
} from '@/lib/api/validation';

const usersQuerySchema = paginationSchema.merge(sortSchema).extend({
  search: z.string().optional(),
  role: z.enum(['admin', 'supervisor', 'agent', 'wallboard-only']).optional(),
  active: z.coerce.boolean().optional(),
});

const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  role: z.enum(['admin', 'supervisor', 'agent', 'wallboard-only']).default('agent'),
  groupAccess: z.array(z.string()).optional().default([]),
  permissions: z.array(z.string()).optional().default([]),
});

export async function GET(request: NextRequest) {
  const auth = await requireRole('supervisor');
  if (!auth.authorized) return auth.response;

  const parsed = parseSearchParams(request.url, usersQuerySchema);
  if (!parsed.success) return parsed.response;

  const { page, limit, sort, order, search, role, active } = parsed.data;

  try {
    const conditions: SQL[] = [];
    if (search) {
      conditions.push(
        sql`(${like(users.name, `%${search}%`)} OR ${like(users.email, `%${search}%`)})`
      );
    }
    if (role) conditions.push(eq(users.role, role));
    if (active !== undefined) conditions.push(eq(users.active, active));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    const sortColumn =
      sort === 'name' ? users.name :
      sort === 'email' ? users.email :
      sort === 'role' ? users.role :
      users.createdAt;
    const orderFn = order === 'asc' ? asc : desc;

    const rows = await db
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
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset((page - 1) * limit);

    const data = rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      groupAccess: u.groupAccess ?? [],
      permissions: u.permissions ?? [],
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      active: u.active,
      ssoProvider: u.ssoProvider,
      createdAt: u.createdAt.toISOString(),
    }));

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    return serverErrorResponse('Failed to fetch users');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.authorized) return auth.response;

  const parsed = await parseBody(request, createUserSchema);
  if (!parsed.success) return parsed.response;

  try {
    // Check for existing email
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'A user with this email already exists' } },
        { status: 409 }
      );
    }

    const [user] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        groupAccess: parsed.data.groupAccess,
        permissions: parsed.data.permissions,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          groupAccess: user.groupAccess ?? [],
          permissions: user.permissions ?? [],
          active: user.active,
          createdAt: user.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/admin/users error:', error);
    return serverErrorResponse('Failed to create user');
  }
}
