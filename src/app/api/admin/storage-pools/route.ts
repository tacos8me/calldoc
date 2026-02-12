// ─── /api/admin/storage-pools ────────────────────────────────────────────────
// GET: List storage pools with usage stats
// POST: Create pool

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { recordingStoragePools } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { parseBody, serverErrorResponse } from '@/lib/api/validation';

const createPoolSchema = z.object({
  name: z.string().min(1).max(255),
  poolType: z.enum(['local', 'network', 's3']),
  path: z.string().min(1).max(1024),
  credentialsEncrypted: z.string().optional(),
  maxSizeBytes: z.number().int().optional(),
  writeEnabled: z.boolean().default(true),
  deleteEnabled: z.boolean().default(true),
  retentionMinDays: z.number().int().optional(),
  retentionMaxDays: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission('admin:storage');
  if (!auth.authorized) return auth.response;

  try {
    const pools = await db
      .select()
      .from(recordingStoragePools)
      .where(eq(recordingStoragePools.active, true));

    return NextResponse.json({
      data: pools.map((p) => ({
        id: p.id,
        name: p.name,
        poolType: p.poolType,
        path: p.path,
        maxSizeBytes: p.maxSizeBytes,
        currentSizeBytes: p.currentSizeBytes,
        usagePercent: p.maxSizeBytes
          ? Math.round((p.currentSizeBytes / p.maxSizeBytes) * 100)
          : 0,
        writeEnabled: p.writeEnabled,
        deleteEnabled: p.deleteEnabled,
        retentionMinDays: p.retentionMinDays,
        retentionMaxDays: p.retentionMaxDays,
        active: p.active,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/storage-pools error:', error);
    return serverErrorResponse('Failed to fetch storage pools');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('admin:storage');
  if (!auth.authorized) return auth.response;

  const parsed = await parseBody(request, createPoolSchema);
  if (!parsed.success) return parsed.response;

  try {
    // Check for name uniqueness
    const [existing] = await db
      .select({ id: recordingStoragePools.id })
      .from(recordingStoragePools)
      .where(eq(recordingStoragePools.name, parsed.data.name))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'A storage pool with this name already exists' } },
        { status: 409 }
      );
    }

    const [pool] = await db
      .insert(recordingStoragePools)
      .values({
        name: parsed.data.name,
        poolType: parsed.data.poolType,
        path: parsed.data.path,
        credentialsEncrypted: parsed.data.credentialsEncrypted ?? null,
        maxSizeBytes: parsed.data.maxSizeBytes ?? null,
        writeEnabled: parsed.data.writeEnabled,
        deleteEnabled: parsed.data.deleteEnabled,
        retentionMinDays: parsed.data.retentionMinDays ?? null,
        retentionMaxDays: parsed.data.retentionMaxDays ?? null,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          id: pool.id,
          name: pool.name,
          poolType: pool.poolType,
          path: pool.path,
          maxSizeBytes: pool.maxSizeBytes,
          currentSizeBytes: pool.currentSizeBytes,
          writeEnabled: pool.writeEnabled,
          deleteEnabled: pool.deleteEnabled,
          retentionMinDays: pool.retentionMinDays,
          retentionMaxDays: pool.retentionMaxDays,
          active: pool.active,
          createdAt: pool.createdAt.toISOString(),
          updatedAt: pool.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/admin/storage-pools error:', error);
    return serverErrorResponse('Failed to create storage pool');
  }
}
