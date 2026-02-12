// ---------------------------------------------------------------------------
// POST /api/recordings/[id]/pci/pause - Pause a recording for PCI compliance
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { uuidSchema, parseBody, serverErrorResponse } from '@/lib/api/validation';
import { pauseRecording } from '@/lib/recordings/pci';
import { auditLog } from '@/lib/audit/service';

const pauseSchema = z.object({
  reason: z.string().max(512).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole('supervisor');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid recording ID format' } },
      { status: 400 }
    );
  }

  const parsed = await parseBody(request, pauseSchema);
  if (!parsed.success) return parsed.response;

  try {
    const result = await pauseRecording(params.id, auth.user.userId, parsed.data.reason);

    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'PCI_ERROR', message: result.message } },
        { status: 409 }
      );
    }

    await auditLog(
      auth.user.userId,
      auth.user.name,
      'recording.shared',
      'recording_pci',
      params.id,
      { action: 'pause', reason: parsed.data.reason }
    );

    return NextResponse.json({
      data: {
        eventId: result.eventId,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('POST /api/recordings/[id]/pci/pause error:', error);
    return serverErrorResponse('Failed to pause recording');
  }
}
