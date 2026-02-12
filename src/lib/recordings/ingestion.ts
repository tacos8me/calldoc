// ---------------------------------------------------------------------------
// Recording Ingestion - File-based recording ingestion pipeline
// ---------------------------------------------------------------------------
// Polls a watch directory for new WAV files from Avaya Voicemail Pro,
// matches them to call records, transcodes to Opus, generates waveform
// peaks, and stores them in the configured storage pool.

import { promises as fs } from 'fs';
import * as path from 'path';
import { eq, and, gte, lte, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { recordings, recordingStoragePools, calls } from '@/lib/db/schema';
import { storageService, StorageService } from './storage';
import { transcodeToOpus, generatePeaks, getAudioDuration } from './transcoder';
import { evaluateRecordingRules } from './rules';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IngestionConfig {
  /** Directory to watch for new WAV files */
  watchDir: string;
  /** Poll interval in milliseconds (default 30000) */
  pollIntervalMs?: number;
  /** Temp directory for transcoding intermediates */
  tempDir?: string;
  /** Error directory for failed files */
  errorDir?: string;
  /** Default storage pool ID to write recordings to */
  defaultPoolId: string;
  /** Source type for ingested recordings */
  sourceType?: 'vmpro_ftp' | 'vrtx' | 'devlink3_active' | 'manual_upload';
  /** Time in ms to wait for file to be stable (default 2000) */
  fileStableMs?: number;
}

interface FileMetadata {
  callId: string | null;
  extension: string | null;
  timestamp: Date | null;
  originalFilename: string;
}

/** Subset of a call DB row needed during ingestion. */
interface MatchedCall {
  id: string;
  agentId: string | null;
  queueName: string | null;
  direction: string;
  callerNumber: string;
  calledNumber: string;
  agentName: string | null;
  startTime: Date;
  endTime: Date | null;
}

// ---------------------------------------------------------------------------
// RecordingIngestionService
// ---------------------------------------------------------------------------

/**
 * File-based recording ingestion service. Polls a watch directory for new
 * WAV files, matches them to call records, transcodes to Opus, generates
 * waveform peaks, and stores in the configured storage pool.
 *
 * File naming convention: {callId}_{extension}_{timestamp}.wav
 * Fallback: if no call ID, matches by timestamp +/- 5s and extension.
 */
export class RecordingIngestionService {
  private config: IngestionConfig | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private processedFiles: Set<string> = new Set();
  private isProcessing = false;
  private isRunning = false;
  private processedCount = 0;
  private errorCount = 0;

  /** Number of successfully processed recordings. */
  get totalProcessed(): number {
    return this.processedCount;
  }

  /** Number of recordings that failed processing. */
  get totalErrors(): number {
    return this.errorCount;
  }

  /** Whether the service is currently running. */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Start the recording ingestion service.
   * Creates the watch, temp, and error directories if they don't exist.
   *
   * @param config - Ingestion configuration
   */
  async start(config: IngestionConfig): Promise<void> {
    this.config = {
      pollIntervalMs: parseInt(process.env.RECORDING_POLL_INTERVAL || '30000', 10),
      tempDir: path.join(config.watchDir, '.tmp'),
      errorDir: path.join(config.watchDir, '.errors'),
      sourceType: 'vmpro_ftp',
      fileStableMs: 2000,
      ...config,
      watchDir: process.env.RECORDING_WATCH_DIR || config.watchDir,
    };

    // Ensure directories exist
    await fs.mkdir(this.config.watchDir, { recursive: true });
    await fs.mkdir(this.config.tempDir!, { recursive: true });
    await fs.mkdir(this.config.errorDir!, { recursive: true });

    this.isRunning = true;

    log(`Ingestion service started - watching ${this.config.watchDir} ` +
        `(poll every ${this.config.pollIntervalMs}ms)`);

    // Initial poll
    await this.poll();

    // Set up recurring poll
    this.pollTimer = setInterval(() => {
      this.poll().catch((err) => {
        log(`Poll error: ${err instanceof Error ? err.message : err}`);
      });
    }, this.config.pollIntervalMs!);
  }

  /**
   * Stop the ingestion service.
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    log('Ingestion service stopped');
  }

  /**
   * Single poll cycle: scan the watch directory and process new files.
   */
  private async poll(): Promise<void> {
    if (!this.config || !this.isRunning || this.isProcessing) return;

    this.isProcessing = true;

    try {
      const entries = await fs.readdir(this.config.watchDir, { withFileTypes: true });
      const wavFiles = entries.filter(
        (e) => e.isFile() && e.name.toLowerCase().endsWith('.wav') && !this.processedFiles.has(e.name)
      );

      if (wavFiles.length > 0) {
        log(`Found ${wavFiles.length} new WAV file(s) to process`);
      }

      for (const file of wavFiles) {
        if (!this.isRunning) break;

        try {
          await this.processFile(file.name);
        } catch (err) {
          log(`Error processing ${file.name}: ${err instanceof Error ? err.message : err}`);
          this.errorCount++;
          await this.moveToError(file.name, err instanceof Error ? err.message : 'Unknown error');
        }
      }
    } catch (err) {
      // Watch directory may not exist yet
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        log(`Directory scan error: ${err instanceof Error ? err.message : err}`);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single WAV file through the ingestion pipeline.
   */
  private async processFile(fileName: string): Promise<void> {
    if (!this.config) return;

    const inputPath = path.join(this.config.watchDir, fileName);

    // Step 1: Wait for file to be fully written (size stable for configured period)
    const isStable = await this.waitForStableFile(inputPath, this.config.fileStableMs!);
    if (!isStable) {
      log(`File ${fileName} not yet stable, will retry next cycle`);
      return;
    }

    log(`Processing: ${fileName}`);

    // Step 2: Parse filename for metadata
    const metadata = this.parseFilename(fileName);

    // Step 3: Match to a call record in DB
    const matchResult = await this.matchToCall(metadata);

    // Step 4: Check recording rules to determine if should be kept
    if (matchResult.call) {
      const mc = matchResult.call;
      const ruleResult = await evaluateRecordingRules({
        agentId: mc.agentId,
        queueName: mc.queueName,
        direction: mc.direction,
        callerNumber: mc.callerNumber,
        calledNumber: mc.calledNumber,
      });

      if (!ruleResult.shouldRecord) {
        log(`Recording rules say skip for call ${mc.id} (no matching rule)`);
        this.processedFiles.add(fileName);
        await this.removeSourceFile(inputPath);
        return;
      }
    }

    // Step 5: Get source audio duration
    const sourceDuration = await getAudioDuration(inputPath);

    // Step 6: Transcode WAV to Opus
    const outputFileName = `${path.basename(fileName, '.wav')}.ogg`;
    const tempOutputPath = path.join(this.config.tempDir!, outputFileName);
    const transcodeResult = await transcodeToOpus(inputPath, tempOutputPath);

    // Step 7: Generate waveform peaks
    const peaks = await generatePeaks(tempOutputPath, 800);

    // Step 8: Write to storage pool
    const now = new Date();
    const recordingId = crypto.randomUUID();
    const storagePath = StorageService.generateStoragePath(recordingId, 'ogg', now);

    const fileData = await fs.readFile(tempOutputPath);
    await storageService.writeFile(this.config.defaultPoolId, storagePath, fileData);

    // Also write peaks JSON alongside the audio
    const peaksPath = storagePath.replace('.ogg', '.peaks.json');
    const peaksData = Buffer.from(JSON.stringify(peaks));
    await storageService.writeFile(this.config.defaultPoolId, peaksPath, peaksData);

    // Step 9: Create recording DB record
    const mc = matchResult.call;
    await db.insert(recordings).values({
      id: recordingId,
      callId: matchResult.callId,
      agentId: mc?.agentId ?? null,
      storagePoolId: this.config.defaultPoolId,
      storagePath,
      fileName: outputFileName,
      originalFormat: 'wav',
      storedFormat: 'opus',
      codec: 'libopus',
      sampleRate: 48000,
      channels: 1,
      duration: Math.round(sourceDuration),
      durationMs: Math.round(sourceDuration * 1000),
      fileSize: transcodeResult.fileSize,
      sourceType: this.config.sourceType!,
      matchMethod: matchResult.matchMethod,
      matchConfidence: matchResult.matchConfidence,
      callerNumber: mc?.callerNumber ?? null,
      calledNumber: mc?.calledNumber ?? null,
      agentName: mc?.agentName ?? null,
      direction: mc?.direction ?? null,
      startTime: mc?.startTime ?? now,
      endTime: mc?.endTime ?? null,
      tags: [],
    });

    // Update the call record to mark as recorded
    if (matchResult.callId) {
      await db
        .update(calls)
        .set({ isRecorded: true, updatedAt: new Date() })
        .where(eq(calls.id, matchResult.callId));
    }

    // Step 10: Clean up
    await this.removeSourceFile(inputPath);
    await fs.unlink(tempOutputPath).catch(() => {});

    this.processedFiles.add(fileName);
    this.processedCount++;

    log(`Completed: ${fileName} -> ${storagePath} ` +
        `(${transcodeResult.duration.toFixed(1)}s, ${(transcodeResult.fileSize / 1024).toFixed(0)} KB, ` +
        `match: ${matchResult.matchMethod || 'none'})`);
  }

  /**
   * Wait for a file's size to stabilize, indicating it has been fully written.
   * Checks file size twice with the specified interval between checks.
   */
  private async waitForStableFile(filePath: string, waitMs: number): Promise<boolean> {
    try {
      const stat1 = await fs.stat(filePath);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      const stat2 = await fs.stat(filePath);

      return stat1.size === stat2.size && stat1.size > 0;
    } catch {
      return false;
    }
  }

  /**
   * Parse a recording filename to extract metadata.
   * Expected format: {callId}_{extension}_{timestamp}.wav
   * Fallback: any filename with a .wav extension
   */
  private parseFilename(fileName: string): FileMetadata {
    const baseName = path.basename(fileName, '.wav');
    const parts = baseName.split('_');

    // Standard format: callId_extension_timestamp
    if (parts.length >= 3) {
      const callId = parts[0] || null;
      const extension = parts[1] || null;
      const timestampStr = parts.slice(2).join('_');

      let timestamp: Date | null = null;
      // Try ISO format or epoch
      const parsed = new Date(timestampStr);
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed;
      } else {
        const epoch = parseInt(timestampStr, 10);
        if (!isNaN(epoch)) {
          timestamp = new Date(epoch);
        }
      }

      return { callId, extension, timestamp, originalFilename: fileName };
    }

    // Minimal format: just a filename
    return {
      callId: null,
      extension: null,
      timestamp: null,
      originalFilename: fileName,
    };
  }

  /**
   * Match recording metadata to a call record in the database.
   * Strategy order:
   *   1. Direct call ID match
   *   2. Timestamp + extension window match (+/- 5 seconds)
   */
  private async matchToCall(metadata: FileMetadata): Promise<{
    callId: string | null;
    call: MatchedCall | null;
    matchMethod: 'call_id' | 'timestamp_extension' | 'manual' | null;
    matchConfidence: number;
  }> {
    const toMatchedCall = (row: typeof calls.$inferSelect): MatchedCall => ({
      id: row.id,
      agentId: row.agentId,
      queueName: row.queueName ?? null,
      direction: row.direction,
      callerNumber: row.callerNumber,
      calledNumber: row.calledNumber,
      agentName: row.agentName ?? null,
      startTime: row.startTime,
      endTime: row.endTime ?? null,
    });

    // Strategy 1: Direct call ID match
    if (metadata.callId) {
      const [callRecord] = await db
        .select()
        .from(calls)
        .where(eq(calls.externalCallId, metadata.callId))
        .limit(1);

      if (callRecord) {
        return {
          callId: callRecord.id,
          call: toMatchedCall(callRecord),
          matchMethod: 'call_id',
          matchConfidence: 100,
        };
      }

      // Also try matching by UUID call ID
      const [callById] = await db
        .select()
        .from(calls)
        .where(eq(calls.id, metadata.callId))
        .limit(1);

      if (callById) {
        return {
          callId: callById.id,
          call: toMatchedCall(callById),
          matchMethod: 'call_id',
          matchConfidence: 100,
        };
      }
    }

    // Strategy 2: Timestamp + extension window match
    if (metadata.timestamp && metadata.extension) {
      const windowMs = 5000; // +/- 5 seconds
      const tsLow = new Date(metadata.timestamp.getTime() - windowMs);
      const tsHigh = new Date(metadata.timestamp.getTime() + windowMs);

      const [callRecord] = await db
        .select()
        .from(calls)
        .where(
          and(
            gte(calls.startTime, tsLow),
            lte(calls.startTime, tsHigh),
            or(
              eq(calls.agentExtension, metadata.extension),
              eq(calls.callerNumber, metadata.extension),
              eq(calls.calledNumber, metadata.extension)
            )
          )
        )
        .limit(1);

      if (callRecord) {
        // Calculate confidence based on time proximity
        const timeDiff = Math.abs(
          callRecord.startTime.getTime() - metadata.timestamp.getTime()
        );
        const confidence = Math.max(50, Math.round(100 - (timeDiff / windowMs) * 50));

        return {
          callId: callRecord.id,
          call: toMatchedCall(callRecord),
          matchMethod: 'timestamp_extension',
          matchConfidence: confidence,
        };
      }
    }

    // Strategy 3: Timestamp-only fallback
    if (metadata.timestamp) {
      const windowMs = 5000;
      const tsLow = new Date(metadata.timestamp.getTime() - windowMs);
      const tsHigh = new Date(metadata.timestamp.getTime() + windowMs);

      const [callRecord] = await db
        .select()
        .from(calls)
        .where(
          and(
            gte(calls.startTime, tsLow),
            lte(calls.startTime, tsHigh)
          )
        )
        .limit(1);

      if (callRecord) {
        return {
          callId: callRecord.id,
          call: toMatchedCall(callRecord),
          matchMethod: 'timestamp_extension',
          matchConfidence: 40,
        };
      }
    }

    // No match found -- recording will be stored unlinked
    log(`No call match found for ${metadata.originalFilename}`);
    return {
      callId: null,
      call: null,
      matchMethod: null,
      matchConfidence: 0,
    };
  }

  /**
   * Move a failed file to the error directory with metadata.
   */
  private async moveToError(fileName: string, errorMessage: string): Promise<void> {
    if (!this.config) return;

    try {
      const src = path.join(this.config.watchDir, fileName);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const errorName = `${timestamp}_${fileName}`;
      const dest = path.join(this.config.errorDir!, errorName);

      await fs.rename(src, dest);

      // Write error metadata alongside the file
      const metaPath = `${dest}.error.txt`;
      await fs.writeFile(metaPath, `Error: ${errorMessage}\nOriginal: ${fileName}\nTime: ${new Date().toISOString()}\n`);

      this.processedFiles.add(fileName);
      log(`Moved failed file to error dir: ${errorName}`);
    } catch (err) {
      log(`Failed to move file to error dir: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Remove the source file after processing.
   */
  private async removeSourceFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      log(`Failed to remove source file ${filePath}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [Ingestion] ${message}`);
}

/** Singleton RecordingIngestionService instance. */
export const ingestionService = new RecordingIngestionService();
