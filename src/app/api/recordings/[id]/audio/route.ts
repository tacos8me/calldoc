// ---------------------------------------------------------------------------
// GET /api/recordings/[id]/audio - Stream recording audio with Range support
// ---------------------------------------------------------------------------
// Streams recording audio files from the storage service with full HTTP
// byte-range support for seeking (HTTP 206 Partial Content). Supports both
// local filesystem and S3-backed storage pools.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recordings, recordingStoragePools } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';
import { storageService } from '@/lib/recordings/storage';
import type { Readable } from 'stream';
import type { ReadStream } from 'fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse an HTTP Range header into a { start, end } byte range.
 * Supports "bytes=START-END" and "bytes=START-" formats.
 */
function parseRangeHeader(
  rangeHeader: string,
  fileSize: number
): { start: number; end: number } | null {
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) return null;

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

  if (isNaN(start) || start < 0 || start >= fileSize) return null;
  if (isNaN(end) || end < start || end >= fileSize) return null;

  return { start, end };
}

/**
 * Convert a Node.js Readable/ReadStream into a Web ReadableStream<Uint8Array>.
 */
function nodeStreamToWebStream(nodeStream: ReadStream | Readable): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer | string) => {
        const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
        controller.enqueue(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
      });
      nodeStream.on('end', () => {
        controller.close();
      });
      nodeStream.on('error', (err: Error) => {
        controller.error(err);
      });
    },
    cancel() {
      if ('destroy' in nodeStream && typeof nodeStream.destroy === 'function') {
        nodeStream.destroy();
      }
    },
  });
}

/**
 * Get the audio MIME content type based on the stored format.
 */
function getContentType(format: string): string {
  switch (format) {
    case 'opus':
      return 'audio/ogg';
    case 'wav':
      return 'audio/wav';
    default:
      return 'application/octet-stream';
  }
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth check
  const auth = await requirePermission('recordings:playback');
  if (!auth.authorized) return auth.response;

  // Validate ID
  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid recording ID format' } },
      { status: 400 }
    );
  }

  try {
    // Look up recording in DB with storage pool info
    const [recording] = await db
      .select({
        id: recordings.id,
        storagePath: recordings.storagePath,
        storedFormat: recordings.storedFormat,
        fileSize: recordings.fileSize,
        storagePoolId: recordings.storagePoolId,
        isDeleted: recordings.isDeleted,
        deletedAt: recordings.deletedAt,
      })
      .from(recordings)
      .where(eq(recordings.id, params.id))
      .limit(1);

    // 404 if not found
    if (!recording) {
      return notFoundResponse('Recording');
    }

    // 410 Gone if deleted
    if (recording.isDeleted) {
      return NextResponse.json(
        { error: { code: 'GONE', message: 'Recording has been deleted' } },
        { status: 410 }
      );
    }

    const contentType = getContentType(recording.storedFormat);
    const rangeHeader = request.headers.get('range');

    if (rangeHeader) {
      // ─── Range Request (HTTP 206 Partial Content) ─────────────────────
      // First, we need the total file size. Use readFileStream without a range
      // to get totalSize, or pass a range to get both.
      const streamResult = await storageService.readFileStream(
        recording.storagePoolId,
        recording.storagePath
      );

      const totalSize = streamResult.totalSize;

      // Destroy the full stream since we only needed the size
      if ('destroy' in streamResult.stream && typeof streamResult.stream.destroy === 'function') {
        streamResult.stream.destroy();
      }

      const range = parseRangeHeader(rangeHeader, totalSize);
      if (!range) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${totalSize}` },
        });
      }

      // Get the ranged stream
      const rangedResult = await storageService.readFileStream(
        recording.storagePoolId,
        recording.storagePath,
        { start: range.start, end: range.end }
      );

      const webStream = nodeStreamToWebStream(rangedResult.stream);
      const actualRange = rangedResult.range ?? range;

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${actualRange.start}-${actualRange.end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(rangedResult.contentLength),
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=86400',
        },
      });
    }

    // ─── Full File Response (HTTP 200) ──────────────────────────────────
    const streamResult = await storageService.readFileStream(
      recording.storagePoolId,
      recording.storagePath
    );

    const webStream = nodeStreamToWebStream(streamResult.stream);

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(streamResult.contentLength),
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error) {
    console.error('GET /api/recordings/[id]/audio error:', error);

    // Handle file not found on disk separately
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return notFoundResponse('Recording file');
    }

    return serverErrorResponse('Failed to stream recording audio');
  }
}
