// ---------------------------------------------------------------------------
// Storage Service - Abstract storage layer supporting local filesystem and S3
// ---------------------------------------------------------------------------
// Supports local Docker volume storage for MVP and S3-compatible storage
// (MinIO or AWS) for production deployments. Each storage pool has its own
// configuration and usage tracking.

import { promises as fs } from 'fs';
import { createReadStream, type ReadStream } from 'fs';
import * as path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { recordingStoragePools } from '@/lib/db/schema';
import type { Readable } from 'stream';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoragePoolRecord {
  id: string;
  name: string;
  poolType: 'local' | 'network' | 's3';
  path: string;
  credentialsEncrypted: string | null;
  maxSizeBytes: number | null;
  currentSizeBytes: number;
  writeEnabled: boolean;
  deleteEnabled: boolean;
  retentionMinDays: number | null;
  retentionMaxDays: number | null;
  active: boolean;
}

export interface WriteResult {
  storagePath: string;
  bytesWritten: number;
}

export interface StorageUsage {
  usedBytes: number;
  fileCount: number;
  maxBytes: number | null;
}

export interface ByteRange {
  start: number;
  end: number;
}

// ---------------------------------------------------------------------------
// StorageService
// ---------------------------------------------------------------------------

/**
 * Abstract storage layer that supports local filesystem and S3-compatible
 * backends. Each storage pool is independently configured in the database.
 *
 * For local pools, files are stored under the pool's configured base path.
 * For S3 pools, files are stored in the configured bucket with optional
 * endpoint override for MinIO compatibility.
 */
export class StorageService {
  private s3Clients: Map<string, S3Client> = new Map();
  private poolCache: Map<string, { pool: StoragePoolRecord; cachedAt: number }> = new Map();
  private readonly POOL_CACHE_TTL_MS = 60_000; // 1 minute

  /**
   * Fetch pool configuration from DB, with a short-lived cache to avoid
   * excessive queries during batch operations.
   */
  async getPool(poolId: string): Promise<StoragePoolRecord> {
    const cached = this.poolCache.get(poolId);
    if (cached && Date.now() - cached.cachedAt < this.POOL_CACHE_TTL_MS) {
      return cached.pool;
    }

    const [row] = await db
      .select()
      .from(recordingStoragePools)
      .where(eq(recordingStoragePools.id, poolId))
      .limit(1);

    if (!row) {
      throw new Error(`Storage pool not found: ${poolId}`);
    }

    const pool: StoragePoolRecord = {
      id: row.id,
      name: row.name,
      poolType: row.poolType,
      path: row.path,
      credentialsEncrypted: row.credentialsEncrypted,
      maxSizeBytes: row.maxSizeBytes,
      currentSizeBytes: row.currentSizeBytes,
      writeEnabled: row.writeEnabled,
      deleteEnabled: row.deleteEnabled,
      retentionMinDays: row.retentionMinDays,
      retentionMaxDays: row.retentionMaxDays,
      active: row.active,
    };

    this.poolCache.set(poolId, { pool, cachedAt: Date.now() });
    return pool;
  }

  /**
   * Write a file to the specified storage pool.
   *
   * @param poolId - Storage pool ID
   * @param filePath - Relative path within the pool (e.g., 2025/01/15/abc.ogg)
   * @param data - File contents as a Buffer
   * @returns Write result with path and bytes written
   */
  async writeFile(poolId: string, filePath: string, data: Buffer): Promise<WriteResult> {
    const pool = await this.getPool(poolId);

    if (!pool.writeEnabled) {
      throw new Error(`Storage pool "${pool.name}" is not write-enabled`);
    }

    if (!pool.active) {
      throw new Error(`Storage pool "${pool.name}" is not active`);
    }

    // Check capacity
    if (pool.maxSizeBytes && pool.currentSizeBytes + data.length > pool.maxSizeBytes) {
      throw new Error(
        `Storage pool "${pool.name}" would exceed capacity: ` +
        `${pool.currentSizeBytes + data.length} > ${pool.maxSizeBytes}`
      );
    }

    if (pool.poolType === 's3') {
      await this.writeToS3(pool, filePath, data);
    } else {
      await this.writeToLocal(pool, filePath, data);
    }

    // Update current_size_bytes in DB
    await db
      .update(recordingStoragePools)
      .set({
        currentSizeBytes: pool.currentSizeBytes + data.length,
        updatedAt: new Date(),
      })
      .where(eq(recordingStoragePools.id, poolId));

    // Invalidate cache
    this.poolCache.delete(poolId);

    return { storagePath: filePath, bytesWritten: data.length };
  }

  /**
   * Read a file from the specified storage pool.
   *
   * @param poolId - Storage pool ID
   * @param filePath - Relative path within the pool
   * @returns File contents as a Buffer
   */
  async readFile(poolId: string, filePath: string): Promise<Buffer> {
    const pool = await this.getPool(poolId);

    if (pool.poolType === 's3') {
      return this.readFromS3(pool, filePath);
    }
    return this.readFromLocal(pool, filePath);
  }

  /**
   * Get a readable stream for a file, with optional byte range support
   * for HTTP 206 partial content responses (audio seeking).
   *
   * @param poolId - Storage pool ID
   * @param filePath - Relative path within the pool
   * @param range - Optional byte range for partial reads
   * @returns Object containing the stream, content length, and actual range
   */
  async readFileStream(
    poolId: string,
    filePath: string,
    range?: ByteRange
  ): Promise<{
    stream: ReadStream | Readable;
    contentLength: number;
    totalSize: number;
    range?: ByteRange;
  }> {
    const pool = await this.getPool(poolId);

    if (pool.poolType === 's3') {
      return this.streamFromS3(pool, filePath, range);
    }
    return this.streamFromLocal(pool, filePath, range);
  }

  /**
   * Delete a file from the specified storage pool.
   *
   * @param poolId - Storage pool ID
   * @param filePath - Relative path within the pool
   */
  async deleteFile(poolId: string, filePath: string): Promise<void> {
    const pool = await this.getPool(poolId);

    if (!pool.deleteEnabled) {
      throw new Error(`Storage pool "${pool.name}" does not allow deletion`);
    }

    let fileSize = 0;

    if (pool.poolType === 's3') {
      fileSize = await this.getS3FileSize(pool, filePath);
      await this.deleteFromS3(pool, filePath);
    } else {
      const fullPath = path.join(pool.path, filePath);
      const stat = await fs.stat(fullPath);
      fileSize = stat.size;
      await fs.unlink(fullPath);
    }

    // Update current_size_bytes in DB
    const newSize = Math.max(0, pool.currentSizeBytes - fileSize);
    await db
      .update(recordingStoragePools)
      .set({
        currentSizeBytes: newSize,
        updatedAt: new Date(),
      })
      .where(eq(recordingStoragePools.id, poolId));

    this.poolCache.delete(poolId);
  }

  /**
   * Get storage usage statistics for a pool.
   *
   * @param poolId - Storage pool ID
   * @returns Usage stats including used bytes and file count
   */
  async getUsage(poolId: string): Promise<StorageUsage> {
    const pool = await this.getPool(poolId);

    if (pool.poolType === 's3') {
      return this.getS3Usage(pool);
    }
    return this.getLocalUsage(pool);
  }

  /**
   * Generate a storage path for a recording based on date and ID.
   * Format: {year}/{month}/{day}/{recordingId}.{format}
   *
   * @param recordingId - Unique recording identifier
   * @param format - Audio format extension (e.g., 'ogg', 'wav')
   * @param date - Date for path organization (defaults to now)
   * @returns Formatted storage path
   */
  static generateStoragePath(
    recordingId: string,
    format: string,
    date: Date = new Date()
  ): string {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}/${recordingId}.${format}`;
  }

  // ---------------------------------------------------------------------------
  // Local Filesystem Operations
  // ---------------------------------------------------------------------------

  private async writeToLocal(pool: StoragePoolRecord, filePath: string, data: Buffer): Promise<void> {
    const fullPath = path.join(pool.path, filePath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, data);
  }

  private async readFromLocal(pool: StoragePoolRecord, filePath: string): Promise<Buffer> {
    const fullPath = path.join(pool.path, filePath);
    return fs.readFile(fullPath);
  }

  private async streamFromLocal(
    pool: StoragePoolRecord,
    filePath: string,
    range?: ByteRange
  ): Promise<{
    stream: ReadStream;
    contentLength: number;
    totalSize: number;
    range?: ByteRange;
  }> {
    const fullPath = path.join(pool.path, filePath);
    const stat = await fs.stat(fullPath);
    const totalSize = stat.size;

    if (range) {
      const start = range.start;
      const end = Math.min(range.end, totalSize - 1);
      const contentLength = end - start + 1;

      const stream = createReadStream(fullPath, { start, end });
      return { stream, contentLength, totalSize, range: { start, end } };
    }

    const stream = createReadStream(fullPath);
    return { stream, contentLength: totalSize, totalSize };
  }

  private async getLocalUsage(pool: StoragePoolRecord): Promise<StorageUsage> {
    let usedBytes = 0;
    let fileCount = 0;

    async function walkDir(dirPath: string): Promise<void> {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            await walkDir(entryPath);
          } else if (entry.isFile()) {
            const stat = await fs.stat(entryPath);
            usedBytes += stat.size;
            fileCount++;
          }
        }
      } catch {
        // Directory may not exist yet
      }
    }

    await walkDir(pool.path);

    return {
      usedBytes,
      fileCount,
      maxBytes: pool.maxSizeBytes,
    };
  }

  // ---------------------------------------------------------------------------
  // S3 Operations
  // ---------------------------------------------------------------------------

  /**
   * Get or create an S3 client for the given pool.
   * Parses credentials from the pool's encrypted credentials field.
   */
  private getS3Client(pool: StoragePoolRecord): S3Client {
    const existing = this.s3Clients.get(pool.id);
    if (existing) return existing;

    let credentials: {
      accessKeyId?: string;
      secretAccessKey?: string;
      endpoint?: string;
      region?: string;
    } = {};

    if (pool.credentialsEncrypted) {
      try {
        credentials = JSON.parse(pool.credentialsEncrypted);
      } catch {
        log(`Failed to parse credentials for pool ${pool.name}`);
      }
    }

    const client = new S3Client({
      region: credentials.region || 'us-east-1',
      endpoint: credentials.endpoint || undefined,
      forcePathStyle: !!credentials.endpoint, // Required for MinIO
      credentials: credentials.accessKeyId
        ? {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey || '',
          }
        : undefined,
    });

    this.s3Clients.set(pool.id, client);
    return client;
  }

  /**
   * Extract bucket name from pool path. The path field stores the bucket name
   * for S3 pools (e.g., "calldoc-recordings").
   */
  private getBucket(pool: StoragePoolRecord): string {
    return pool.path;
  }

  private async writeToS3(pool: StoragePoolRecord, filePath: string, data: Buffer): Promise<void> {
    const client = this.getS3Client(pool);
    const bucket = this.getBucket(pool);

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: filePath,
        Body: data,
        ContentType: this.getContentType(filePath),
      })
    );
  }

  private async readFromS3(pool: StoragePoolRecord, filePath: string): Promise<Buffer> {
    const client = this.getS3Client(pool);
    const bucket = this.getBucket(pool);

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: filePath,
      })
    );

    if (!response.Body) {
      throw new Error(`Empty response for ${filePath} in pool ${pool.name}`);
    }

    // Convert the readable stream to a Buffer
    const chunks: Uint8Array[] = [];
    const readable = response.Body as Readable;
    for await (const chunk of readable) {
      chunks.push(chunk as Uint8Array);
    }
    return Buffer.concat(chunks);
  }

  private async streamFromS3(
    pool: StoragePoolRecord,
    filePath: string,
    range?: ByteRange
  ): Promise<{
    stream: Readable;
    contentLength: number;
    totalSize: number;
    range?: ByteRange;
  }> {
    const client = this.getS3Client(pool);
    const bucket = this.getBucket(pool);

    // First, get the total file size
    const headResponse = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: filePath,
      })
    );
    const totalSize = headResponse.ContentLength || 0;

    const getParams: { Bucket: string; Key: string; Range?: string } = {
      Bucket: bucket,
      Key: filePath,
    };

    let actualRange: ByteRange | undefined;

    if (range) {
      const start = range.start;
      const end = Math.min(range.end, totalSize - 1);
      getParams.Range = `bytes=${start}-${end}`;
      actualRange = { start, end };
    }

    const response = await client.send(new GetObjectCommand(getParams));

    if (!response.Body) {
      throw new Error(`Empty response for ${filePath} in pool ${pool.name}`);
    }

    const contentLength = response.ContentLength || totalSize;
    const stream = response.Body as Readable;

    return { stream, contentLength, totalSize, range: actualRange };
  }

  private async deleteFromS3(pool: StoragePoolRecord, filePath: string): Promise<void> {
    const client = this.getS3Client(pool);
    const bucket = this.getBucket(pool);

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: filePath,
      })
    );
  }

  private async getS3FileSize(pool: StoragePoolRecord, filePath: string): Promise<number> {
    const client = this.getS3Client(pool);
    const bucket = this.getBucket(pool);

    const response = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: filePath,
      })
    );

    return response.ContentLength || 0;
  }

  private async getS3Usage(pool: StoragePoolRecord): Promise<StorageUsage> {
    const client = this.getS3Client(pool);
    const bucket = this.getBucket(pool);

    let usedBytes = 0;
    let fileCount = 0;
    let continuationToken: string | undefined;

    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          ContinuationToken: continuationToken,
        })
      );

      if (response.Contents) {
        for (const obj of response.Contents) {
          usedBytes += obj.Size || 0;
          fileCount++;
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return {
      usedBytes,
      fileCount,
      maxBytes: pool.maxSizeBytes,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.ogg':
      case '.opus':
        return 'audio/ogg';
      case '.wav':
        return 'audio/wav';
      case '.mp3':
        return 'audio/mpeg';
      case '.json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Dispose of all cached S3 clients. Call on shutdown.
   */
  dispose(): void {
    for (const [, client] of this.s3Clients) {
      client.destroy();
    }
    this.s3Clients.clear();
    this.poolCache.clear();
  }
}

// ---------------------------------------------------------------------------
// Singleton & Logger
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [Storage] ${message}`);
}

/** Singleton StorageService instance. */
export const storageService = new StorageService();
