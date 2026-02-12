// ─── DevLink3 TCP Connection Manager ─────────────────────────────────────────
// Handles the raw TCP/TLS connection to an Avaya IP Office system,
// binary packet framing, keepalive, and auto-reconnection.

import net from 'net';
import tls from 'tls';
import { EventEmitter } from 'events';
import type { DevLink3Packet } from '@/types/devlink3';
import { PacketType } from '@/types/devlink3';

/** Magic byte that starts every DevLink3 frame. */
const MAGIC_BYTE = 0x49;

/** Default keepalive interval (ms). */
const KEEPALIVE_INTERVAL_MS = 30_000;

/** Maximum reconnect backoff (ms). */
const MAX_BACKOFF_MS = 30_000;

/** Base reconnect delay (ms). */
const BASE_BACKOFF_MS = 1_000;

/**
 * Configuration for a DevLink3 connection.
 */
export interface DevLink3ConnectionConfig {
  /** IP Office hostname or IP address */
  host: string;
  /** TCP port (default 50797 for plain, 50796 for TLS) */
  port: number;
  /** Use TLS transport (port 50796) */
  useTls?: boolean;
  /** TLS options (certificates, etc.) */
  tlsOptions?: tls.ConnectionOptions;
  /** Keepalive interval in milliseconds (default 30000) */
  keepaliveMs?: number;
  /** Whether to auto-reconnect on disconnect (default true) */
  autoReconnect?: boolean;
}

/**
 * Events emitted by DevLink3Connection.
 */
export interface DevLink3ConnectionEvents {
  connected: () => void;
  disconnected: (reason: string) => void;
  error: (err: Error) => void;
  packet: (packet: DevLink3Packet) => void;
  delta3: (xml: string) => void;
}

/**
 * Generate an 8-digit random request ID matching the C# reference.
 */
function generateRequestId(): string {
  const num = Math.floor(Math.random() * 100_000_000);
  return num.toString().padStart(8, '0').slice(0, 8);
}

/**
 * Format a timestamp for log output.
 */
function timestamp(): string {
  return new Date().toISOString();
}

/**
 * DevLink3Connection manages a TCP/TLS connection to an Avaya IP Office,
 * handles binary packet framing (0x49 magic + 2-byte length + payload),
 * keepalive via Test packets, and exponential-backoff reconnection.
 *
 * @example
 * ```ts
 * const conn = new DevLink3Connection();
 * conn.on('connected', () => console.log('Connected'));
 * conn.on('packet', (pkt) => console.log('Packet:', pkt.type));
 * conn.on('delta3', (xml) => console.log('Delta3 XML:', xml));
 * await conn.connect({ host: '192.168.1.1', port: 50797 });
 * ```
 */
export class DevLink3Connection extends EventEmitter {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private config: DevLink3ConnectionConfig | null = null;
  /** Accumulated incoming chunks awaiting processing. */
  private chunks: Buffer[] = [];
  /** Total byte length across all chunks. */
  private chunksLength = 0;
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private _isConnected = false;
  private _isDestroyed = false;
  private pendingTestAck = false;

  /** Whether the connection is currently established. */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Open a TCP or TLS connection to the IP Office DevLink3 service.
   * Resolves once the socket is connected. Authentication is handled
   * separately via the auth module.
   *
   * @param config - Connection parameters
   * @returns Promise that resolves when the TCP connection is established
   */
  async connect(config: DevLink3ConnectionConfig): Promise<void> {
    this.config = config;
    this._isDestroyed = false;
    this.reconnectAttempt = 0;

    return this.doConnect();
  }

  /**
   * Internal connect implementation.
   */
  private doConnect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.config) {
        reject(new Error('No connection config provided'));
        return;
      }

      const { host, port, useTls, tlsOptions } = this.config;

      this.log(`Connecting to ${host}:${port}${useTls ? ' (TLS)' : ''}...`);

      // Clean up any existing socket
      this.cleanup(false);

      try {
        if (useTls) {
          // DEVLINK3_TLS_VERIFY: set to "true" to verify TLS certificates (recommended in production).
          // Defaults to true in production, false in development.
          const tlsVerify = process.env.DEVLINK3_TLS_VERIFY
            ? process.env.DEVLINK3_TLS_VERIFY === 'true'
            : process.env.NODE_ENV === 'production';

          this.socket = tls.connect({
            host,
            port,
            rejectUnauthorized: tlsVerify,
            ...tlsOptions,
          });
        } else {
          this.socket = new net.Socket();
          (this.socket as net.Socket).connect(port, host);
        }
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      // For TLS connections, only handle 'secureConnect' (not 'connect')
      // to avoid double-resolution which would start duplicate keepalive timers.
      const connectEvent = useTls ? 'secureConnect' : 'connect';
      this.socket.once(connectEvent, () => {
        this._isConnected = true;
        this.reconnectAttempt = 0;
        this.chunks = [];
        this.chunksLength = 0;
        this.log(`${useTls ? 'TLS' : 'TCP'} connection established`);
        this.startKeepalive();
        this.emit('connected');
        resolve();
      });

      this.socket.on('data', (data: Buffer) => {
        this.onData(data);
      });

      this.socket.on('error', (err: Error) => {
        this.log(`Socket error: ${err.message}`);
        this.emit('error', err);
        if (!this._isConnected) {
          reject(err);
        }
      });

      this.socket.on('close', () => {
        const wasConnected = this._isConnected;
        this._isConnected = false;
        this.stopKeepalive();
        this.log('Socket closed');
        if (wasConnected) {
          this.emit('disconnected', 'Socket closed');
          this.scheduleReconnect();
        }
      });

      this.socket.on('end', () => {
        this._isConnected = false;
        this.log('Socket ended by remote');
      });
    });
  }

  /**
   * Send a raw DevLink3 packet over the connection.
   *
   * Builds the binary frame: 0x49 (magic) + 2-byte big-endian length + type (4 bytes) + requestId (4 bytes) + body
   *
   * The C# reference builds packets as hex strings, then converts to bytes.
   * We replicate the exact same layout:
   *   Byte 0:     0x49
   *   Bytes 1-2:  Total frame length = 3 + 4 (type) + 4 (requestId) + body.length
   *   Bytes 3-6:  Packet type (4 bytes, big-endian uint32)
   *   Bytes 7-10: Request ID (4 bytes from hex-encoded 8 ASCII digits)
   *   Bytes 11+:  Body payload
   *
   * @param type - Packet type identifier
   * @param body - Body payload as a Buffer (already built by caller)
   * @returns The request ID used for this packet
   */
  sendPacket(type: PacketType, body: Buffer = Buffer.alloc(0)): string {
    if (!this.socket || !this._isConnected) {
      throw new Error('Not connected');
    }

    const requestId = generateRequestId();
    const requestIdBuf = Buffer.from(requestId, 'hex'); // 8 hex chars -> 4 bytes

    // Frame length = 3 + typeLen(4) + requestIdLen(4) + body.length
    const payloadLen = 4 + 4 + body.length;
    const frameLen = 3 + payloadLen;

    const frame = Buffer.alloc(frameLen);
    let offset = 0;

    // Magic byte
    frame.writeUInt8(MAGIC_BYTE, offset);
    offset += 1;

    // 2-byte length (big-endian)
    if (frameLen > 0x7fff) {
      // Packets exceeding 32KB are extremely rare in DevLink3.
      // Reject rather than risk silent corruption from incomplete 3-byte encoding.
      throw new Error(`Packet too large for 2-byte length encoding: ${frameLen} bytes`);
    } else {
      frame.writeUInt16BE(frameLen, offset);
      offset += 2;
    }

    // Packet type (4 bytes big-endian)
    frame.writeUInt32BE(type, offset);
    offset += 4;

    // Request ID (4 bytes from 8-char hex string)
    requestIdBuf.copy(frame, offset);
    offset += 4;

    // Body
    body.copy(frame, offset);

    this.socket.write(frame);
    return requestId;
  }

  /**
   * Send a raw pre-built buffer directly on the socket.
   * Used by the auth module which builds its own packet buffers.
   *
   * @param data - Complete packet bytes to send
   */
  sendRaw(data: Buffer): void {
    if (!this.socket || !this._isConnected) {
      throw new Error('Not connected');
    }
    this.socket.write(data);
  }

  /**
   * Gracefully disconnect and stop auto-reconnection.
   */
  disconnect(): void {
    this._isDestroyed = true;
    this.cleanup(true);
    this.log('Disconnected by user');
  }

  /**
   * Consolidate accumulated chunks into a single buffer only when we need
   * to inspect header bytes or extract a complete frame. This avoids
   * allocating a new concatenated buffer on every TCP data event, which
   * was the previous hot-path bottleneck under heavy call volume.
   */
  private consolidateChunks(): Buffer {
    if (this.chunks.length === 0) return Buffer.alloc(0);
    if (this.chunks.length === 1) return this.chunks[0];
    const buf = Buffer.concat(this.chunks, this.chunksLength);
    this.chunks = [buf];
    return buf;
  }

  /**
   * Handle incoming TCP data. Accumulates chunks in an array and only
   * concatenates when enough data is available for a complete frame,
   * reducing GC pressure under heavy call volume.
   */
  private onData(data: Buffer): void {
    this.chunks.push(data);
    this.chunksLength += data.length;

    // Process all complete packets in the accumulated data
    while (this.chunksLength >= 3) {
      // Consolidate only when we need to inspect the buffer
      const buffer = this.consolidateChunks();

      // Check magic byte
      if (buffer[0] !== MAGIC_BYTE) {
        // Scan for next magic byte
        const idx = buffer.indexOf(MAGIC_BYTE, 1);
        if (idx === -1) {
          this.chunks = [];
          this.chunksLength = 0;
          this.log('Warning: no magic byte found in buffer, discarding');
          return;
        }
        this.log(`Warning: skipping ${idx} bytes to next magic byte`);
        const remaining = buffer.subarray(idx);
        this.chunks = [remaining];
        this.chunksLength = remaining.length;
        continue;
      }

      // Read frame length (2 bytes big-endian at offset 1)
      let frameLen: number;
      let headerSize = 3; // magic(1) + length(2)

      // Check for 3-byte length encoding
      if (buffer[1] & 0x80) {
        if (this.chunksLength < 4) return; // Need more data
        frameLen =
          ((buffer[1] & 0x7f) << 15) |
          ((buffer[2] & 0x7f) << 8) |
          buffer[3];
        headerSize = 4;
      } else {
        frameLen = buffer.readUInt16BE(1);
      }

      if (frameLen < 3) {
        this.log(`Warning: invalid frame length ${frameLen}, skipping byte`);
        const remaining = buffer.subarray(1);
        this.chunks = [remaining];
        this.chunksLength = remaining.length;
        continue;
      }

      // Wait for full frame
      if (this.chunksLength < frameLen) {
        return;
      }

      // Extract the complete frame and keep the remainder
      const frameData = buffer.subarray(0, frameLen);
      const remaining = buffer.subarray(frameLen);
      if (remaining.length > 0) {
        this.chunks = [remaining];
        this.chunksLength = remaining.length;
      } else {
        this.chunks = [];
        this.chunksLength = 0;
      }

      // Parse the packet
      this.parseFrame(frameData, headerSize);
    }
  }

  /**
   * Parse a complete DevLink3 frame into a typed packet and emit events.
   */
  private parseFrame(frame: Buffer, headerSize: number): void {
    // After magic + length, the payload starts
    const payload = frame.subarray(headerSize);

    if (payload.length < 4) {
      this.log('Warning: payload too short for packet type');
      return;
    }

    // Packet type is first 4 bytes of payload
    const typeValue = payload.readUInt32BE(0);
    const packetPayload = payload.subarray(4); // Everything after type

    const packet: DevLink3Packet = {
      magic: MAGIC_BYTE,
      length: frame.length,
      type: typeValue as PacketType,
      payload: packetPayload,
    };

    // Emit generic packet event
    this.emit('packet', packet);

    // Handle keepalive acknowledgment
    if (typeValue === PacketType.TestAck) {
      this.pendingTestAck = false;
    }

    // Handle Event packets: extract Delta3 XML from tuple structure
    if (typeValue === PacketType.Event) {
      this.extractDelta3(packetPayload);
    }
  }

  /**
   * Extract CallDelta3 XML from an Event packet's tuple structure.
   *
   * Event payload layout:
   *   Bytes 0-3:  Request ID / counter (4 bytes)
   *   Bytes 4-7:  Originating PBX IP (4 bytes)
   *   Bytes 8-11: Incrementing counter (4 bytes)
   *   Bytes 12+:  Table of tuples
   *
   * Each tuple:
   *   Bytes 0-3: Tuple code (4 bytes big-endian)
   *   Bytes 4-5: Data length (2 bytes big-endian, includes NUL)
   *   Bytes 6+:  Data (NUL-terminated UTF-8 string)
   */
  private extractDelta3(payload: Buffer): void {
    // Skip requestId(4) + PBX IP(4) + counter(4) = 12 bytes
    let offset = 12;

    while (offset + 6 <= payload.length) {
      const tupleCode = payload.readUInt32BE(offset);
      offset += 4;

      const dataLen = payload.readUInt16BE(offset);
      offset += 2;

      if (offset + dataLen > payload.length) break;

      const data = payload.subarray(offset, offset + dataLen);
      offset += dataLen;

      // CallDelta3 tuple: 0x00760001
      if (tupleCode === 0x00760001) {
        // Strip trailing NUL if present
        let xmlStr = data.toString('utf-8');
        if (xmlStr.endsWith('\0')) {
          xmlStr = xmlStr.slice(0, -1);
        }
        xmlStr = xmlStr.trim();
        if (xmlStr.length > 0) {
          this.emit('delta3', xmlStr);
        }
      }
    }
  }

  /**
   * Start the keepalive timer. Sends Test packets at regular intervals
   * and checks for TestAck responses.
   */
  private startKeepalive(): void {
    this.stopKeepalive();
    const interval = this.config?.keepaliveMs ?? KEEPALIVE_INTERVAL_MS;

    this.keepaliveTimer = setInterval(() => {
      if (!this._isConnected) return;

      // If previous test was not acknowledged, the connection may be dead
      if (this.pendingTestAck) {
        this.log('Keepalive: TestAck not received, connection may be dead');
        this.emit('error', new Error('Keepalive timeout: no TestAck received'));
        this.cleanup(true);
        this.emit('disconnected', 'Keepalive timeout');
        this.scheduleReconnect();
        return;
      }

      try {
        // Build Test packet body: 4 bytes zero payload length
        const testBody = Buffer.alloc(4);
        testBody.writeUInt32BE(0, 0);
        this.sendPacket(PacketType.Test, testBody);
        this.pendingTestAck = true;
      } catch (err) {
        this.log(`Keepalive send error: ${err instanceof Error ? err.message : err}`);
      }
    }, interval);
  }

  /**
   * Stop the keepalive timer.
   */
  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    this.pendingTestAck = false;
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this._isDestroyed) return;
    if (this.config?.autoReconnect === false) return;

    const delay = Math.min(
      BASE_BACKOFF_MS * Math.pow(2, this.reconnectAttempt),
      MAX_BACKOFF_MS
    );
    this.reconnectAttempt++;

    this.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempt})`);

    this.reconnectTimer = setTimeout(async () => {
      if (this._isDestroyed) return;

      try {
        await this.doConnect();
      } catch (err) {
        this.log(`Reconnect failed: ${err instanceof Error ? err.message : err}`);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Clean up socket and timers.
   */
  private cleanup(stopReconnect: boolean): void {
    this.stopKeepalive();

    if (stopReconnect && this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }

    this._isConnected = false;
    this.chunks = [];
    this.chunksLength = 0;
  }

  /**
   * Internal logging helper with timestamps.
   */
  private log(message: string): void {
    console.log(`[${timestamp()}] [DevLink3] ${message}`);
  }
}

// Re-export helpers for use by auth module
export { generateRequestId, MAGIC_BYTE };
