// ---------------------------------------------------------------------------
// GET /api/recordings/share/[token] - Public share link endpoint
// ---------------------------------------------------------------------------
// Validates a share token, returns recording metadata and audio stream URL.
// No auth required - this is a public endpoint for external users.
// Tracks access count and last accessed timestamp.

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { db } from '@/lib/db';
import { recordingShareLinks, recordings, recordingStoragePools } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notFoundResponse, serverErrorResponse } from '@/lib/api/validation';
import { storageService } from '@/lib/recordings/storage';
import type { Readable } from 'stream';
import type { ReadStream } from 'fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nodeStreamToWebStream(nodeStream: ReadStream | Readable): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer | string) => {
        const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
        controller.enqueue(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
      });
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err: Error) => controller.error(err));
    },
    cancel() {
      if ('destroy' in nodeStream && typeof nodeStream.destroy === 'function') {
        nodeStream.destroy();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Route Handler - GET returns metadata, query ?stream=true returns audio
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token || token.length < 16) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid share token' } },
      { status: 400 }
    );
  }

  try {
    // Hash the token to match against stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find the share link
    const [shareLink] = await db
      .select()
      .from(recordingShareLinks)
      .where(eq(recordingShareLinks.tokenHash, tokenHash))
      .limit(1);

    if (!shareLink) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Share link not found or has been revoked' } },
        { status: 404 }
      );
    }

    // Check expiration
    if (new Date() > shareLink.expiresAt) {
      return NextResponse.json(
        {
          error: {
            code: 'EXPIRED',
            message: 'This share link has expired',
          },
        },
        { status: 410 }
      );
    }

    // Check max accesses
    if (shareLink.maxAccesses && shareLink.accessCount >= shareLink.maxAccesses) {
      return NextResponse.json(
        {
          error: {
            code: 'ACCESS_LIMIT',
            message: 'This share link has reached its maximum number of accesses',
          },
        },
        { status: 410 }
      );
    }

    // Fetch the recording
    const [recording] = await db
      .select({
        id: recordings.id,
        callerNumber: recordings.callerNumber,
        calledNumber: recordings.calledNumber,
        agentName: recordings.agentName,
        direction: recordings.direction,
        duration: recordings.duration,
        durationMs: recordings.durationMs,
        startTime: recordings.startTime,
        endTime: recordings.endTime,
        storedFormat: recordings.storedFormat,
        storagePath: recordings.storagePath,
        storagePoolId: recordings.storagePoolId,
        fileSize: recordings.fileSize,
        isDeleted: recordings.isDeleted,
      })
      .from(recordings)
      .where(eq(recordings.id, shareLink.recordingId))
      .limit(1);

    if (!recording || recording.isDeleted) {
      return NextResponse.json(
        { error: { code: 'GONE', message: 'The shared recording is no longer available' } },
        { status: 410 }
      );
    }

    // Track access
    await db
      .update(recordingShareLinks)
      .set({
        accessCount: sql`${recordingShareLinks.accessCount} + 1`,
      })
      .where(eq(recordingShareLinks.id, shareLink.id));

    // Check if streaming audio was requested
    const isStreamRequest = request.nextUrl.searchParams.get('stream') === 'true';

    if (isStreamRequest) {
      // Stream the audio
      const rangeHeader = request.headers.get('range');
      const contentType = recording.storedFormat === 'opus' ? 'audio/ogg' : 'audio/wav';

      if (rangeHeader) {
        const streamResult = await storageService.readFileStream(
          recording.storagePoolId,
          recording.storagePath
        );
        const totalSize = streamResult.totalSize;
        if ('destroy' in streamResult.stream && typeof streamResult.stream.destroy === 'function') {
          streamResult.stream.destroy();
        }

        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (!match) {
          return new NextResponse(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${totalSize}` },
          });
        }

        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

        if (start >= totalSize || end >= totalSize) {
          return new NextResponse(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${totalSize}` },
          });
        }

        const rangedResult = await storageService.readFileStream(
          recording.storagePoolId,
          recording.storagePath,
          { start, end }
        );
        const webStream = nodeStreamToWebStream(rangedResult.stream);
        const actualRange = rangedResult.range ?? { start, end };

        return new NextResponse(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${actualRange.start}-${actualRange.end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(rangedResult.contentLength),
            'Content-Type': contentType,
          },
        });
      }

      // Full stream
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
        },
      });
    }

    // Return metadata (default)
    return NextResponse.json({
      data: {
        recording: {
          id: recording.id,
          callerNumber: recording.callerNumber,
          calledNumber: recording.calledNumber,
          agentName: recording.agentName,
          direction: recording.direction,
          duration: recording.duration,
          startTime: recording.startTime?.toISOString() ?? null,
          endTime: recording.endTime?.toISOString() ?? null,
          format: recording.storedFormat,
        },
        share: {
          expiresAt: shareLink.expiresAt.toISOString(),
          snippetStartMs: shareLink.snippetStartMs,
          snippetEndMs: shareLink.snippetEndMs,
        },
        audioUrl: `/api/recordings/share/${token}?stream=true`,
      },
    });
  } catch (error) {
    console.error('GET /api/recordings/share/[token] error:', error);
    return serverErrorResponse('Failed to access shared recording');
  }
}
