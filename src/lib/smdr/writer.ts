// ---------------------------------------------------------------------------
// CallDoc - SMDR-to-DB Writer
//
// Subscribes to the Redis ipo:smdr channel, parses incoming SMDR JSON
// messages, inserts them into the smdr_records table, and publishes
// to the correlation engine for matching with DevLink3 call events.
// ---------------------------------------------------------------------------

import Redis from 'ioredis';
import { db } from '@/lib/db';
import { smdrRecords } from '@/lib/db/schema';
import type { SmdrRecord } from '@/types/smdr';
import { parseDuration } from '@/lib/smdr/parser';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Redis channel for raw SMDR data from the SMDR listener. */
const SMDR_CHANNEL = 'ipo:smdr';

/** Redis channel for correlation engine consumption. */
const CORRELATION_CHANNEL = 'ipo:smdr:correlated';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SmdrWriterConfig {
  /** Redis connection URL (default: redis://localhost:6379) */
  redisUrl?: string;
  /** System ID to tag SMDR records with */
  systemId?: string;
}

export interface SmdrWriterStats {
  /** Total SMDR records received */
  recordsReceived: number;
  /** Total records successfully written to DB */
  recordsWritten: number;
  /** Total write errors */
  writeErrors: number;
  /** Whether the writer is currently running */
  isRunning: boolean;
  /** ISO timestamp of last record written */
  lastWriteAt: string | null;
}

// ---------------------------------------------------------------------------
// SmdrWriter
// ---------------------------------------------------------------------------

/**
 * SmdrWriter subscribes to Redis for SMDR records, persists them to the
 * database, and forwards them to the correlation engine channel.
 *
 * The SMDR listener publishes raw parsed records to the ipo:smdr channel.
 * This writer receives those records, inserts them into smdr_records,
 * and re-publishes them on ipo:smdr:correlated for the correlation engine.
 */
export class SmdrWriter {
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private config: SmdrWriterConfig = {};
  private running = false;

  // Stats
  private recordsReceived = 0;
  private recordsWritten = 0;
  private writeErrors = 0;
  private lastWriteAt: string | null = null;

  /**
   * Start the SMDR writer: connect to Redis and subscribe to the SMDR channel.
   *
   * @param config - Writer configuration
   */
  async start(config: SmdrWriterConfig = {}): Promise<void> {
    this.config = config;
    const redisUrl = config.redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379';

    // Create subscriber connection (dedicated for subscribe mode)
    this.subscriber = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 500, 5000),
      maxRetriesPerRequest: null, // Required for subscriber mode
      lazyConnect: true,
    });

    // Create publisher connection for forwarding to correlation
    this.publisher = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 500, 5000),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    try {
      await Promise.all([this.subscriber.connect(), this.publisher.connect()]);
    } catch (err) {
      log(`Redis connection failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }

    // Subscribe to the SMDR channel
    await this.subscriber.subscribe(SMDR_CHANNEL);

    this.subscriber.on('message', (channel: string, message: string) => {
      if (channel === SMDR_CHANNEL) {
        this.handleMessage(message).catch((err) => {
          log(`Error handling SMDR message: ${err instanceof Error ? err.message : err}`);
        });
      }
    });

    this.running = true;
    log('SMDR writer started, subscribed to ' + SMDR_CHANNEL);
  }

  /**
   * Stop the SMDR writer and clean up resources.
   */
  async stop(): Promise<void> {
    this.running = false;

    if (this.subscriber) {
      await this.subscriber.unsubscribe(SMDR_CHANNEL).catch(() => {});
      await this.subscriber.quit().catch(() => {});
      this.subscriber = null;
    }

    if (this.publisher) {
      await this.publisher.quit().catch(() => {});
      this.publisher = null;
    }

    log('SMDR writer stopped');
  }

  /**
   * Get current writer statistics.
   */
  getStats(): SmdrWriterStats {
    return {
      recordsReceived: this.recordsReceived,
      recordsWritten: this.recordsWritten,
      writeErrors: this.writeErrors,
      isRunning: this.running,
      lastWriteAt: this.lastWriteAt,
    };
  }

  /**
   * Handle an incoming SMDR message from Redis.
   * Parses the JSON, writes to the database, and publishes to correlation.
   */
  private async handleMessage(message: string): Promise<void> {
    this.recordsReceived++;

    let parsed: { type?: string; data?: SmdrRecord; timestamp?: string };
    try {
      parsed = JSON.parse(message) as { type?: string; data?: SmdrRecord; timestamp?: string };
    } catch {
      log('Failed to parse SMDR message JSON');
      this.writeErrors++;
      return;
    }

    const record = parsed.data;
    if (!record) {
      log('SMDR message missing data field');
      return;
    }

    // Write to smdr_records table
    try {
      const connectedTimeSec = parseDuration(record.connectedTime);
      const callStartDate = record.callStart ? new Date(record.callStart) : new Date();
      const connectedTimeDate = record.connectedTime && connectedTimeSec > 0
        ? new Date(callStartDate.getTime() + (record.ringTime * 1000))
        : null;

      const direction = record.direction === 'I' ? 'inbound' as const : 'outbound' as const;

      const inserted = await db
        .insert(smdrRecords)
        .values({
          systemId: this.config.systemId ?? null,
          callId: String(record.callId),
          callStart: callStartDate,
          connectedTime: connectedTimeDate,
          ringDuration: record.ringTime,
          callerNumber: record.caller,
          direction,
          calledNumber: record.calledNumber,
          dialledNumber: record.dialledNumber,
          accountCode: record.account || null,
          isInternal: record.isInternal === 1,
          callDuration: connectedTimeSec + record.ringTime + record.holdTime + record.parkTime,
          holdDuration: record.holdTime,
          parkDuration: record.parkTime,
          callingPartyDevice: record.party1Device,
          calledPartyDevice: record.party2Device,
          continuationRecord: record.continuation === 1,
          externalTargetingCause: record.externalTargetingCause || null,
          rawRecord: JSON.stringify(record),
          parsedFields: record as unknown as Record<string, unknown>,
          isReconciled: false,
        })
        .returning({ id: smdrRecords.id });

      this.recordsWritten++;
      this.lastWriteAt = new Date().toISOString();

      // Publish to correlation engine channel
      if (this.publisher) {
        const correlationMessage = {
          type: 'smdr:written',
          smdrRecordId: inserted[0].id,
          data: record,
          timestamp: new Date().toISOString(),
        };

        await this.publisher.publish(
          CORRELATION_CHANNEL,
          JSON.stringify(correlationMessage)
        );
      }
    } catch (err) {
      this.writeErrors++;
      log(`Error writing SMDR record to DB: ${err instanceof Error ? err.message : err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

/** Singleton SmdrWriter instance. */
export const smdrWriter = new SmdrWriter();

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [SMDR:Writer] ${message}`);
}
