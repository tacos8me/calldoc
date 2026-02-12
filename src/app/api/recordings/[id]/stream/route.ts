// ─── GET /api/recordings/[id]/stream ─────────────────────────────────────────
// Audio stream with HTTP Range support (206 Partial Content).

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recordings, recordingStoragePools } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';
import * as fs from 'fs';
import * as path from 'path';

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
    // Fetch recording with storage pool
    const [recording] = await db
      .select({
        id: recordings.id,
        storagePath: recordings.storagePath,
        fileName: recordings.fileName,
        storedFormat: recordings.storedFormat,
        fileSize: recordings.fileSize,
        storagePoolId: recordings.storagePoolId,
        isDeleted: recordings.isDeleted,
        poolPath: recordingStoragePools.path,
        poolType: recordingStoragePools.poolType,
      })
      .from(recordings)
      .innerJoin(recordingStoragePools, eq(recordings.storagePoolId, recordingStoragePools.id))
      .where(eq(recordings.id, params.id))
      .limit(1);

    if (!recording || recording.isDeleted) return notFoundResponse('Recording');

    // Determine content type based on format
    const contentType = recording.storedFormat === 'opus' ? 'audio/ogg' : 'audio/wav';

    // For local storage pools, read from filesystem
    if (recording.poolType === 'local' || recording.poolType === 'network') {
      const filePath = path.join(recording.poolPath, recording.storagePath);

      // Check file exists
      if (!fs.existsSync(filePath)) {
        return notFoundResponse('Recording file');
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const rangeHeader = request.headers.get('range');

      if (rangeHeader) {
        // Parse Range header
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (!match) {
          return new NextResponse(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${fileSize}` },
          });
        }

        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
          return new NextResponse(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${fileSize}` },
          });
        }

        const chunkSize = end - start + 1;
        const stream = fs.createReadStream(filePath, { start, end });

        // Convert Node.js stream to Web ReadableStream
        const webStream = new ReadableStream({
          start(controller) {
            stream.on('data', (chunk: Buffer | string) => {
              const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
              controller.enqueue(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
            });
            stream.on('end', () => controller.close());
            stream.on('error', (err) => controller.error(err));
          },
        });

        return new NextResponse(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
            'Content-Type': contentType,
          },
        });
      }

      // No range header - serve full file
      const stream = fs.createReadStream(filePath);
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: Buffer | string) => {
            const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
            controller.enqueue(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
          });
          stream.on('end', () => controller.close());
          stream.on('error', (err) => controller.error(err));
        },
      });

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Length': String(fileSize),
          'Content-Type': contentType,
        },
      });
    }

    // S3 storage - return a redirect or proxy (placeholder for S3 implementation)
    return NextResponse.json(
      { error: { code: 'NOT_IMPLEMENTED', message: 'S3 streaming not yet implemented' } },
      { status: 501 }
    );
  } catch (error) {
    console.error('GET /api/recordings/[id]/stream error:', error);
    return serverErrorResponse('Failed to stream recording');
  }
}
