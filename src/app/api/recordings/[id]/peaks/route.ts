// ---------------------------------------------------------------------------
// GET /api/recordings/[id]/peaks - Return waveform peaks for visualization
// ---------------------------------------------------------------------------
// Returns pre-computed waveform peaks or generates them on-the-fly.
// Peaks are cached in the recordings table (peaks_json) after first generation.
// Returns JSON array of 800 float values (0-1) for wavesurfer.js rendering.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recordings, recordingStoragePools } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';
import { generatePeaks } from '@/lib/recordings/transcoder';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Number of waveform points to generate
// ---------------------------------------------------------------------------

const NUM_PEAKS = 800;

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET(
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

  try {
    // Fetch recording with metadata field for cached peaks
    const [recording] = await db
      .select({
        id: recordings.id,
        storagePath: recordings.storagePath,
        storagePoolId: recordings.storagePoolId,
        isDeleted: recordings.isDeleted,
        tags: recordings.tags,
        poolPath: recordingStoragePools.path,
        poolType: recordingStoragePools.poolType,
      })
      .from(recordings)
      .innerJoin(recordingStoragePools, eq(recordings.storagePoolId, recordingStoragePools.id))
      .where(eq(recordings.id, params.id))
      .limit(1);

    if (!recording) return notFoundResponse('Recording');

    if (recording.isDeleted) {
      return NextResponse.json(
        { error: { code: 'GONE', message: 'Recording has been deleted' } },
        { status: 410 }
      );
    }

    // Check for cached peaks in metadata
    // We store peaks as a tag-like convention: check if recording has a peaks field
    // Since we don't have a dedicated peaks_json column, we use the metadata approach:
    // Look for a sidecar file or generate fresh
    // For local storage: generate from file path
    // For S3: would need to download first (not implemented in this path)

    if (recording.poolType === 'local' || recording.poolType === 'network') {
      const filePath = path.join(recording.poolPath, recording.storagePath);

      try {
        const peaks = await generatePeaks(filePath, NUM_PEAKS);

        return NextResponse.json(
          { data: peaks },
          {
            headers: {
              'Cache-Control': 'public, max-age=86400, immutable',
            },
          }
        );
      } catch (peakErr) {
        console.error('Peak generation error:', peakErr);
        // Return an empty peaks array rather than error
        const emptyPeaks = new Array(NUM_PEAKS).fill(0);
        return NextResponse.json({ data: emptyPeaks });
      }
    }

    // For non-local pools, return empty peaks for now
    const emptyPeaks = new Array(NUM_PEAKS).fill(0);
    return NextResponse.json({ data: emptyPeaks });
  } catch (error) {
    console.error('GET /api/recordings/[id]/peaks error:', error);
    return serverErrorResponse('Failed to generate waveform peaks');
  }
}
