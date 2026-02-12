// ─── SMDR TCP Listener ───────────────────────────────────────────────────────
// Creates a TCP server that accepts connections from Avaya IP Office
// for SMDR record delivery. IP Office acts as the TCP client and pushes
// CSV records to this listener.

import net from 'net';
import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { parseSmdrRecord } from './parser';
import type { SmdrRecord } from '@/types/smdr';
import { REDIS_CHANNELS } from '@/types/redis-events';

/** Default SMDR listener port (per spec, first site). */
const DEFAULT_PORT = 1150;

/**
 * Configuration for the SMDR listener.
 */
export interface SmdrListenerConfig {
  /** TCP port to listen on (default 1150) */
  port?: number;
  /** Interface to bind to (default '0.0.0.0') */
  host?: string;
  /** Redis connection URL for publishing parsed records */
  redisUrl?: string;
}

/**
 * SmdrListener creates a TCP server that receives SMDR records from
 * Avaya IP Office. IP Office connects as a client and pushes newline-
 * delimited CSV records.
 *
 * Features:
 *   - Handles partial line buffering (data arrives in chunks)
 *   - Parses each line with the SMDR parser
 *   - Publishes parsed records to Redis and/or emits as events
 *   - Handles multiple simultaneous IP Office connections
 *   - Connection/disconnection logging
 *
 * @example
 * ```ts
 * const listener = new SmdrListener();
 * listener.on('record', (record) => {
 *   console.log('SMDR record:', record.callId, record.caller);
 * });
 * await listener.start({ port: 1150 });
 * ```
 */
export class SmdrListener extends EventEmitter {
  private server: net.Server | null = null;
  private redis: Redis | null = null;
  private connections: Map<string, { socket: net.Socket; buffer: string }> = new Map();
  private config: SmdrListenerConfig = {};
  private recordCount = 0;
  private isRunning = false;

  /** Get the total number of records parsed since start. */
  get totalRecordCount(): number {
    return this.recordCount;
  }

  /** Get the number of active IP Office connections. */
  get connectionCount(): number {
    return this.connections.size;
  }

  /**
   * Start the SMDR TCP listener.
   *
   * @param config - Listener configuration
   * @returns Promise that resolves when the server is listening
   */
  async start(config: SmdrListenerConfig = {}): Promise<void> {
    this.config = config;
    this.isRunning = true;

    const port = config.port ?? DEFAULT_PORT;
    const host = config.host ?? '0.0.0.0';

    // Initialize Redis publisher if URL provided
    if (config.redisUrl) {
      this.redis = new Redis(config.redisUrl, {
        retryStrategy: (times) => Math.min(times * 500, 5000),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      try {
        await this.redis.connect();
        this.log('Redis publisher connected');
      } catch (err) {
        this.log(`Redis connection failed: ${err instanceof Error ? err.message : err}`);
      }
    }

    return new Promise<void>((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.on('error', (err) => {
        this.log(`Server error: ${err.message}`);
        this.emit('error', err);
        if (!this.isRunning) {
          reject(err);
        }
      });

      this.server.listen(port, host, () => {
        this.log(`SMDR listener started on ${host}:${port}`);
        this.isRunning = true;
        this.emit('listening', { host, port });
        resolve();
      });
    });
  }

  /**
   * Stop the SMDR listener and close all connections.
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Close all active connections
    for (const [id, { socket }] of this.connections) {
      socket.destroy();
      this.connections.delete(id);
    }

    // Close the server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }

    // Close Redis
    if (this.redis) {
      await this.redis.quit().catch(() => {});
      this.redis = null;
    }

    this.log('SMDR listener stopped');
  }

  /**
   * Handle a new TCP connection from IP Office.
   */
  private handleConnection(socket: net.Socket): void {
    const remoteAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    const connId = `${remoteAddr}-${Date.now()}`;

    this.log(`New connection from ${remoteAddr}`);
    this.connections.set(connId, { socket, buffer: '' });
    this.emit('connection', { address: remoteAddr });

    socket.setEncoding('utf-8');

    socket.on('data', (data: string | Buffer) => {
      const dataStr = typeof data === 'string' ? data : data.toString('utf-8');
      this.handleData(connId, dataStr);
    });

    socket.on('error', (err) => {
      this.log(`Connection error from ${remoteAddr}: ${err.message}`);
    });

    socket.on('close', () => {
      this.log(`Connection closed from ${remoteAddr}`);
      this.connections.delete(connId);
      this.emit('disconnection', { address: remoteAddr });
    });

    socket.on('end', () => {
      // Process any remaining data in the buffer
      const conn = this.connections.get(connId);
      if (conn && conn.buffer.trim()) {
        this.processLine(conn.buffer);
        conn.buffer = '';
      }
    });
  }

  /**
   * Handle incoming data from an IP Office connection.
   * Buffers partial lines and processes complete newline-terminated records.
   */
  private handleData(connId: string, data: string): void {
    const conn = this.connections.get(connId);
    if (!conn) return;

    // Append new data to the buffer
    conn.buffer += data;

    // Split on newlines and process complete lines
    const lines = conn.buffer.split('\n');

    // The last element may be a partial line -- keep it in the buffer
    conn.buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.replace(/\r$/, '').trim();
      if (trimmed.length > 0) {
        this.processLine(trimmed);
      }
    }
  }

  /**
   * Process a single complete SMDR CSV line.
   */
  private processLine(line: string): void {
    try {
      const record = parseSmdrRecord(line);
      if (!record) return;

      this.recordCount++;
      this.emit('record', record);

      // Publish to Redis
      if (this.redis) {
        const message = {
          type: 'smdr:record',
          data: record,
          timestamp: new Date().toISOString(),
        };

        this.redis.publish(REDIS_CHANNELS.smdr, JSON.stringify(message)).catch((err) => {
          this.log(`Redis publish error: ${err.message}`);
        });
      }
    } catch (err) {
      this.log(`Error parsing SMDR line: ${err instanceof Error ? err.message : err}`);
      this.log(`  Line: ${line.substring(0, 100)}`);
    }
  }

  /**
   * Internal logging helper.
   */
  private log(message: string): void {
    console.log(`[${new Date().toISOString()}] [SMDR:Listener] ${message}`);
  }
}

/** Singleton SmdrListener instance. */
export const smdrListener = new SmdrListener();
