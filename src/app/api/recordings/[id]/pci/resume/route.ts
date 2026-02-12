// ---------------------------------------------------------------------------
// POST /api/recordings/[id]/pci/resume - Resume a paused recording
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { uuidSchema, serverErrorResponse } from '@/lib/api/validation';
import { resumeRecording } from '@/lib/recordings/pci';
import { auditLog } from '@/lib/audit/service';

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

  try {
    const result = await resumeRecording(params.id, auth.user.userId);

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
      { action: 'resume' }
    );

    return NextResponse.json({
      data: {
        eventId: result.eventId,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('POST /api/recordings/[id]/pci/resume error:', error);
    return serverErrorResponse('Failed to resume recording');
  }
}
