// ---------------------------------------------------------------------------
// /api/calls/[id]/tags - Call tag management
// ---------------------------------------------------------------------------
// GET: List tags for a call
// POST: Add a tag to a call
// DELETE: Remove a tag (via query param ?tag=xxx)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { calls } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, parseBody, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const addTagSchema = z.object({
  tag: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Tag must be alphanumeric with hyphens/underscores only')
    .transform((v) => v.toLowerCase()),
});

// ---------------------------------------------------------------------------
// Pre-defined tag suggestions
// ---------------------------------------------------------------------------

const SUGGESTED_TAGS = [
  'escalated',
  'callback-required',
  'complaint',
  'vip',
  'training',
  'quality-review',
] as const;

// ---------------------------------------------------------------------------
// GET - List tags
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('calls:view');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid call ID format' } },
      { status: 400 }
    );
  }

  try {
    const [call] = await db
      .select({ id: calls.id, tags: calls.tags })
      .from(calls)
      .where(eq(calls.id, params.id))
      .limit(1);

    if (!call) return notFoundResponse('Call');

    return NextResponse.json({
      data: {
        tags: call.tags ?? [],
        suggestions: SUGGESTED_TAGS,
      },
    });
  } catch (error) {
    console.error('GET /api/calls/[id]/tags error:', error);
    return serverErrorResponse('Failed to fetch tags');
  }
}

// ---------------------------------------------------------------------------
// POST - Add tag
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('calls:view');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid call ID format' } },
      { status: 400 }
    );
  }

  const parsed = await parseBody(request, addTagSchema);
  if (!parsed.success) return parsed.response;

  try {
    const [call] = await db
      .select({ id: calls.id, tags: calls.tags })
      .from(calls)
      .where(eq(calls.id, params.id))
      .limit(1);

    if (!call) return notFoundResponse('Call');

    const currentTags = (call.tags as string[] | null) ?? [];

    // Check for duplicates
    if (currentTags.includes(parsed.data.tag)) {
      return NextResponse.json(
        { error: { code: 'DUPLICATE', message: 'Tag already exists on this call' } },
        { status: 409 }
      );
    }

    // Max 20 tags per call
    if (currentTags.length >= 20) {
      return NextResponse.json(
        { error: { code: 'LIMIT_EXCEEDED', message: 'Maximum of 20 tags per call' } },
        { status: 422 }
      );
    }

    const updatedTags = [...currentTags, parsed.data.tag];

    await db
      .update(calls)
      .set({ tags: updatedTags, updatedAt: new Date() })
      .where(eq(calls.id, params.id));

    return NextResponse.json(
      { data: { tags: updatedTags } },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/calls/[id]/tags error:', error);
    return serverErrorResponse('Failed to add tag');
  }
}

// ---------------------------------------------------------------------------
// DELETE - Remove tag (uses query param: ?tag=xxx)
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('calls:view');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid call ID format' } },
      { status: 400 }
    );
  }

  const tagToRemove = request.nextUrl.searchParams.get('tag');
  if (!tagToRemove) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Missing ?tag= query parameter' } },
      { status: 400 }
    );
  }

  try {
    const [call] = await db
      .select({ id: calls.id, tags: calls.tags })
      .from(calls)
      .where(eq(calls.id, params.id))
      .limit(1);

    if (!call) return notFoundResponse('Call');

    const currentTags = (call.tags as string[] | null) ?? [];
    const normalizedTag = tagToRemove.toLowerCase();

    if (!currentTags.includes(normalizedTag)) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Tag not found on this call' } },
        { status: 404 }
      );
    }

    const updatedTags = currentTags.filter((t) => t !== normalizedTag);

    await db
      .update(calls)
      .set({ tags: updatedTags, updatedAt: new Date() })
      .where(eq(calls.id, params.id));

    return NextResponse.json({ data: { tags: updatedTags } });
  } catch (error) {
    console.error('DELETE /api/calls/[id]/tags error:', error);
    return serverErrorResponse('Failed to remove tag');
  }
}
