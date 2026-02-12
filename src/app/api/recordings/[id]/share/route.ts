// ─── POST /api/recordings/[id]/share ─────────────────────────────────────────
// Generate time-limited share link for a recording.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { recordings, recordingShareLinks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, parseBody, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';
import { auditLog } from '@/lib/audit/service';
import * as crypto from 'crypto';

const shareSchema = z.object({
  expiresInDays: z.number().int().min(1).max(365).default(7),
  maxAccesses: z.number().int().min(1).optional(),
  snippetStartMs: z.number().int().min(0).optional(),
  snippetEndMs: z.number().int().min(0).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('recordings:playback');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid recording ID format' } },
      { status: 400 }
    );
  }

  const parsed = await parseBody(request, shareSchema);
  if (!parsed.success) return parsed.response;

  try {
    const [recording] = await db
      .select({ id: recordings.id, isDeleted: recordings.isDeleted })
      .from(recordings)
      .where(eq(recordings.id, params.id))
      .limit(1);

    if (!recording || recording.isDeleted) return notFoundResponse('Recording');

    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays);

    const [shareLink] = await db
      .insert(recordingShareLinks)
      .values({
        recordingId: params.id,
        createdByUserId: auth.user.userId,
        tokenHash,
        expiresAt,
        snippetStartMs: parsed.data.snippetStartMs ?? null,
        snippetEndMs: parsed.data.snippetEndMs ?? null,
        maxAccesses: parsed.data.maxAccesses ?? null,
      })
      .returning();

    // Build the share URL
    const baseUrl = request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : new URL(request.url).origin;
    const shareUrl = `${baseUrl}/shared/recordings/${token}`;

    // Audit log share link creation for HIPAA compliance
    const creatorIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    await auditLog(
      auth.user.userId,
      auth.user.name,
      'recording.shared',
      'recording',
      params.id,
      {
        shareLinkId: shareLink.id,
        recordingId: params.id,
        expiresAt: shareLink.expiresAt.toISOString(),
        expiresInDays: parsed.data.expiresInDays,
        maxAccesses: parsed.data.maxAccesses ?? null,
        snippetStartMs: parsed.data.snippetStartMs ?? null,
        snippetEndMs: parsed.data.snippetEndMs ?? null,
      },
      creatorIp
    );

    return NextResponse.json(
      {
        data: {
          id: shareLink.id,
          recordingId: params.id,
          createdBy: auth.user.userId,
          url: shareUrl,
          token,
          expiresAt: shareLink.expiresAt.toISOString(),
          createdAt: shareLink.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/recordings/[id]/share error:', error);
    return serverErrorResponse('Failed to create share link');
  }
}
