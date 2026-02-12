// ─── DevLink3 Test Simulator ─────────────────────────────────────────────────
// A TCP server that mimics the Avaya IP Office DevLink3 protocol for
// development and testing. Generates realistic call events at configurable
// rates without requiring a real IP Office system.

import net from 'net';
import crypto from 'crypto';
import { PacketType, ResponseCode, DevLink3CallState, EquipmentType, CalledType } from '@/types/devlink3';

// ─── Configuration ───────────────────────────────────────────────────────────

const SIM_PORT = parseInt(process.env.SIM_PORT ?? '50797', 10);
const SIM_HOST = process.env.SIM_HOST ?? '0.0.0.0';
const EVENT_RATE = parseInt(process.env.EVENT_RATE ?? '5', 10); // events per minute
const NUM_EXTENSIONS = parseInt(process.env.NUM_EXTENSIONS ?? '10', 10);

/** Hardcoded credentials for the simulator. */
const SIM_USERNAME = process.env.SIM_USERNAME ?? 'admin';
const SIM_PASSWORD = process.env.SIM_PASSWORD ?? 'admin';

/** Magic byte for DevLink3 framing. */
const MAGIC = 0x49;

/** Simulated extensions (201-210 by default). */
const EXTENSIONS = Array.from({ length: NUM_EXTENSIONS }, (_, i) => ({
  number: String(201 + i),
  name: `Extn${201 + i}`,
  eqType: i % 3 === 0 ? EquipmentType.SIPDevice : i % 3 === 1 ? EquipmentType.H323Phone : EquipmentType.TDMPhone,
}));

/** Simulated hunt groups. */
const HUNT_GROUPS = [
  { number: '300', name: 'Sales' },
  { number: '301', name: 'Support' },
  { number: '302', name: 'Billing' },
];

/** External phone numbers for simulation. */
const EXTERNAL_NUMBERS = [
  '5551234567', '5559876543', '5555551212', '4155551234',
  '2125559999', '3105554321', '8005551111', '8885552222',
  '7145553333', '6175554444', '2025555555', '3125556666',
];

/** Trunk names. */
const TRUNKS = [
  { slot: '1.1', name: 'T9001', eqType: EquipmentType.SIPTrunk },
  { slot: '1.2', name: 'T9002', eqType: EquipmentType.SIPTrunk },
  { slot: '2.1', name: 'T9003', eqType: EquipmentType.ISDNTrunk },
];

// ─── State Tracking ──────────────────────────────────────────────────────────

interface SimulatedCall {
  callId: number;
  state: DevLink3CallState;
  extensionIdx: number;
  trunkIdx: number;
  externalNumber: string;
  direction: 'I' | 'O';
  huntGroup: string | null;
  startTime: number;
  connectedTime: number;
  targetDuration: number; // How long the call should last (seconds)
}

interface ClientConnection {
  socket: net.Socket;
  authenticated: boolean;
  eventStreaming: boolean;
  challengeBytes: Buffer;
  pendingRequestId: string;
}

/**
 * DevLink3Simulator runs a TCP server that emulates an Avaya IP Office
 * system for development and testing purposes.
 *
 * Features:
 *   - SHA1 challenge-response authentication (hardcoded: admin/admin)
 *   - Generates realistic Delta3 XML call events
 *   - Simulates new calls (ringing -> connected -> completed), transfers, holds
 *   - Configurable event rate, extensions, hunt groups
 *   - Supports multiple simultaneous client connections
 *
 * @example
 * ```ts
 * const sim = new DevLink3Simulator();
 * sim.start();
 * // Connect your DevLink3 client to localhost:50797
 * ```
 */
export class DevLink3Simulator {
  private server: net.Server | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private activeCalls: Map<number, SimulatedCall> = new Map();
  private nextCallId = 1000;
  private eventTimer: ReturnType<typeof setInterval> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  /**
   * Start the simulator TCP server.
   *
   * @param port - TCP port to listen on (default from SIM_PORT env or 50797)
   * @param host - Interface to bind to (default '0.0.0.0')
   */
  start(port: number = SIM_PORT, host: string = SIM_HOST): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.server = net.createServer((socket) => {
      this.handleClient(socket);
    });

    this.server.listen(port, host, () => {
      this.log(`DevLink3 Simulator listening on ${host}:${port}`);
      this.log(`Credentials: ${SIM_USERNAME}/${SIM_PASSWORD}`);
      this.log(`Event rate: ${EVENT_RATE}/min, Extensions: ${EXTENSIONS.map(e => e.number).join(',')}`);
    });

    this.server.on('error', (err) => {
      this.log(`Server error: ${err.message}`);
    });

    // Start event generation timer
    const intervalMs = (60 / EVENT_RATE) * 1000;
    this.eventTimer = setInterval(() => {
      this.generateEvent();
    }, intervalMs);

    // Tick timer for advancing call states (every 2 seconds)
    this.tickTimer = setInterval(() => {
      this.tickCalls();
    }, 2000);
  }

  /**
   * Stop the simulator.
   */
  stop(): void {
    this.isRunning = false;

    if (this.eventTimer) {
      clearInterval(this.eventTimer);
      this.eventTimer = null;
    }

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    for (const [, client] of this.clients) {
      client.socket.destroy();
    }
    this.clients.clear();

    if (this.server) {
      this.server.close();
      this.server = null;
    }

    this.activeCalls.clear();
    this.log('Simulator stopped');
  }

  /**
   * Handle a new client connection.
   */
  private handleClient(socket: net.Socket): void {
    const id = `${socket.remoteAddress}:${socket.remotePort}`;
    this.log(`Client connected: ${id}`);

    const client: ClientConnection = {
      socket,
      authenticated: false,
      eventStreaming: false,
      challengeBytes: crypto.randomBytes(16),
      pendingRequestId: '',
    };

    this.clients.set(id, client);

    let buffer = Buffer.alloc(0);

    socket.on('data', (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);

      while (buffer.length >= 3) {
        if (buffer[0] !== MAGIC) {
          const idx = buffer.indexOf(MAGIC, 1);
          if (idx === -1) { buffer = Buffer.alloc(0); return; }
          buffer = buffer.subarray(idx);
          continue;
        }

        const frameLen = buffer.readUInt16BE(1);
        if (buffer.length < frameLen) return;

        const frame = buffer.subarray(0, frameLen);
        buffer = buffer.subarray(frameLen);

        this.handlePacket(id, frame);
      }
    });

    socket.on('error', (err) => {
      this.log(`Client ${id} error: ${err.message}`);
    });

    socket.on('close', () => {
      this.log(`Client disconnected: ${id}`);
      this.clients.delete(id);
    });
  }

  /**
   * Handle an incoming packet from a client.
   */
  private handlePacket(clientId: string, frame: Buffer): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Parse: magic(1) + length(2) + type(4) + requestId(4) + body(...)
    if (frame.length < 11) return;

    const packetType = frame.readUInt32BE(3);
    const requestIdBuf = frame.subarray(7, 11);
    const requestIdHex = requestIdBuf.toString('hex').toUpperCase();
    const body = frame.subarray(11);

    switch (packetType) {
      case PacketType.Test:
        this.handleTest(client, requestIdHex);
        break;
      case PacketType.Auth:
        this.handleAuth(client, requestIdHex, body);
        break;
      case PacketType.EventRequest:
        this.handleEventRequest(client, requestIdHex, body);
        break;
      default:
        this.log(`Unknown packet type: 0x${packetType.toString(16).padStart(8, '0')}`);
    }
  }

  /**
   * Handle a Test packet: respond with TestAck.
   */
  private handleTest(client: ClientConnection, requestId: string): void {
    // TestAck: magic + length + type(TestAck) + requestId + result(SUCCESS) + payload_len(0)
    const response = this.buildPacket(PacketType.TestAck, requestId, Buffer.from('0000000000000000', 'hex'));
    client.socket.write(response);
  }

  /**
   * Handle authentication packets (both username and challenge response).
   */
  private handleAuth(client: ClientConnection, requestId: string, body: Buffer): void {
    if (body.length < 4) return;

    const subtype = body.readUInt32BE(0);

    if (subtype === 0x00000001) {
      // Phase 1: Username submission
      // Extract username (NULL-terminated UTF-8 after 4-byte subtype)
      const usernameBytes = body.subarray(4);
      const nullIdx = usernameBytes.indexOf(0);
      const username = usernameBytes.subarray(0, nullIdx >= 0 ? nullIdx : usernameBytes.length).toString('utf-8');

      this.log(`Auth phase 1: username="${username}"`);

      if (username !== SIM_USERNAME) {
        // Send fail
        const failBody = Buffer.alloc(4);
        failBody.writeUInt32BE(ResponseCode.Fail, 0);
        const response = this.buildPacket(PacketType.AuthResponse, requestId, failBody);
        client.socket.write(response);
        return;
      }

      // Send challenge
      client.challengeBytes = crypto.randomBytes(16);
      client.pendingRequestId = requestId;

      // Response: responseCode(Challenge=0x00000002) + challengeLength(4 bytes) + challengeData(16 bytes)
      const challengeBody = Buffer.alloc(4 + 4 + 16);
      challengeBody.writeUInt32BE(ResponseCode.Challenge, 0);
      challengeBody.writeUInt32BE(16, 4);
      client.challengeBytes.copy(challengeBody, 8);

      const response = this.buildPacket(PacketType.AuthResponse, requestId, challengeBody);
      client.socket.write(response);

      this.log(`Auth phase 1: challenge sent (${client.challengeBytes.toString('hex')})`);

    } else if (subtype === 0x00000050) {
      // Phase 2: Challenge response
      // body: subtype(4) + hashLen(4) + hash(20)
      const hashLen = body.readUInt32BE(4);
      const clientHash = body.subarray(8, 8 + hashLen);

      // Compute expected hash
      const pwdBytes = Buffer.from(SIM_PASSWORD.trim(), 'utf-8').subarray(0, 16);
      const pwdPadded = Buffer.alloc(16);
      pwdBytes.copy(pwdPadded);
      const hashInput = Buffer.concat([client.challengeBytes, pwdPadded]);
      const expectedHash = crypto.createHash('sha1').update(hashInput).digest();

      const success = clientHash.equals(expectedHash);

      if (success) {
        client.authenticated = true;
        this.log('Auth phase 2: SUCCESS');

        // Send success response with PBX type and DevLink variant tuples
        const pbxTypeStr = 'Avaya IP500v2 11.0.0.0 (Simulator)\0';
        const variantStr = 'Standard 1.0\0';
        const pbxTypeBuf = Buffer.from(pbxTypeStr, 'utf-8');
        const variantBuf = Buffer.from(variantStr, 'utf-8');

        // Body: responseCode(SUCCESS) + tuples
        // Tuple: code(4) + len(2) + data
        const tupleSize = (4 + 2 + pbxTypeBuf.length) + (4 + 2 + variantBuf.length);
        const successBody = Buffer.alloc(4 + tupleSize);
        let offset = 0;

        successBody.writeUInt32BE(ResponseCode.Success, offset); offset += 4;

        // PBX Type tuple
        successBody.writeUInt32BE(0x007d0001, offset); offset += 4;
        successBody.writeUInt16BE(pbxTypeBuf.length, offset); offset += 2;
        pbxTypeBuf.copy(successBody, offset); offset += pbxTypeBuf.length;

        // DevLink Variant tuple
        successBody.writeUInt32BE(0x007d0002, offset); offset += 4;
        successBody.writeUInt16BE(variantBuf.length, offset); offset += 2;
        variantBuf.copy(successBody, offset);

        const response = this.buildPacket(PacketType.AuthResponse, requestId, successBody);
        client.socket.write(response);
      } else {
        this.log('Auth phase 2: FAIL (hash mismatch)');
        const failBody = Buffer.alloc(4);
        failBody.writeUInt32BE(ResponseCode.Fail, 0);
        const response = this.buildPacket(PacketType.AuthResponse, requestId, failBody);
        client.socket.write(response);
      }
    }
  }

  /**
   * Handle an EventRequest packet.
   */
  private handleEventRequest(client: ClientConnection, requestId: string, body: Buffer): void {
    if (!client.authenticated) {
      this.log('EventRequest from unauthenticated client -- ignoring');
      return;
    }

    // Extract flags string
    if (body.length >= 2) {
      const flagsLen = body.readUInt16BE(0);
      const flagsBytes = body.subarray(2, 2 + flagsLen);
      let flags = flagsBytes.toString('utf-8');
      if (flags.endsWith('\0')) flags = flags.slice(0, -1);
      this.log(`EventRequest: flags="${flags}"`);
    }

    client.eventStreaming = true;

    // Send success response with echoed flags
    const successBody = Buffer.alloc(4 + body.length);
    successBody.writeUInt32BE(ResponseCode.Success, 0);
    body.copy(successBody, 4);

    const response = this.buildPacket(PacketType.EventRequestResponse, requestId, successBody);
    client.socket.write(response);

    // Send initial Delta3 events for any active calls
    for (const [, call] of this.activeCalls) {
      this.broadcastDelta3Event(call);
    }
  }

  /**
   * Build a DevLink3 packet.
   */
  private buildPacket(type: number, requestId: string, body: Buffer): Buffer {
    const requestIdBuf = Buffer.from(requestId.padStart(8, '0').slice(0, 8), 'hex');

    const payloadLen = 4 + 4 + body.length; // type(4) + requestId(4) + body
    const frameLen = 3 + payloadLen;

    const frame = Buffer.alloc(frameLen);
    let offset = 0;

    frame.writeUInt8(MAGIC, offset); offset += 1;
    frame.writeUInt16BE(frameLen, offset); offset += 2;
    frame.writeUInt32BE(type, offset); offset += 4;
    requestIdBuf.copy(frame, offset); offset += 4;
    body.copy(frame, offset);

    return frame;
  }

  /**
   * Build a DevLink3 Event packet containing a CallDelta3 XML tuple.
   */
  private buildEventPacket(xmlContent: string): Buffer {
    // Event payload: requestId/counter(4) + PBX IP(4) + counter(4) + tuple
    // Tuple: code(4) + len(2) + NUL-terminated XML

    const xmlBuf = Buffer.from(xmlContent + '\0', 'utf-8');

    // Tuple: 0x00760001 + len(2) + xml
    const tupleBuf = Buffer.alloc(4 + 2 + xmlBuf.length);
    let tOffset = 0;
    tupleBuf.writeUInt32BE(0x00760001, tOffset); tOffset += 4;
    tupleBuf.writeUInt16BE(xmlBuf.length, tOffset); tOffset += 2;
    xmlBuf.copy(tupleBuf, tOffset);

    // Event body: counter(4) + PBX IP(4) + counter(4) + tuple
    const eventBody = Buffer.alloc(12 + tupleBuf.length);
    let eOffset = 0;
    eventBody.writeUInt32BE(0, eOffset); eOffset += 4;             // counter
    eventBody.writeUInt32BE(0xc0a80001, eOffset); eOffset += 4;   // PBX IP: 192.168.0.1
    eventBody.writeUInt32BE(this.nextCallId, eOffset); eOffset += 4; // incrementing counter
    tupleBuf.copy(eventBody, eOffset);

    const requestId = Math.floor(Math.random() * 100000000).toString().padStart(8, '0').slice(0, 8);
    return this.buildPacket(PacketType.Event, requestId, eventBody);
  }

  /**
   * Generate a new call event or advance existing calls.
   */
  private generateEvent(): void {
    // 70% chance of new call, 30% chance of modifying existing call
    if (this.activeCalls.size === 0 || Math.random() < 0.7) {
      this.createNewCall();
    } else {
      this.modifyExistingCall();
    }
  }

  /**
   * Create a new simulated call.
   */
  private createNewCall(): void {
    const callId = this.nextCallId++;
    const extensionIdx = Math.floor(Math.random() * EXTENSIONS.length);
    const trunkIdx = Math.floor(Math.random() * TRUNKS.length);
    const externalNumber = EXTERNAL_NUMBERS[Math.floor(Math.random() * EXTERNAL_NUMBERS.length)];
    const isInbound = Math.random() < 0.6; // 60% inbound
    const huntGroup = isInbound && Math.random() < 0.5
      ? HUNT_GROUPS[Math.floor(Math.random() * HUNT_GROUPS.length)].name
      : null;

    const call: SimulatedCall = {
      callId,
      state: DevLink3CallState.Ringing,
      extensionIdx,
      trunkIdx,
      externalNumber,
      direction: isInbound ? 'I' : 'O',
      huntGroup,
      startTime: Math.floor(Date.now() / 1000),
      connectedTime: 0,
      targetDuration: 15 + Math.floor(Math.random() * 120), // 15-135 seconds
    };

    this.activeCalls.set(callId, call);
    this.log(`New call #${callId}: ${isInbound ? 'inbound from' : 'outbound to'} ${externalNumber} -> ${EXTENSIONS[extensionIdx].number}`);

    this.broadcastDelta3Event(call);
  }

  /**
   * Modify an existing call (transfer, hold, etc.).
   */
  private modifyExistingCall(): void {
    const calls = Array.from(this.activeCalls.values());
    if (calls.length === 0) return;

    const call = calls[Math.floor(Math.random() * calls.length)];
    const action = Math.random();

    if (call.state === DevLink3CallState.Connected) {
      if (action < 0.2) {
        // Put on hold
        call.state = DevLink3CallState.Held;
        this.log(`Call #${call.callId}: placed on hold`);
      } else if (action < 0.35) {
        // Transfer to another extension
        const oldExt = EXTENSIONS[call.extensionIdx].number;
        call.extensionIdx = Math.floor(Math.random() * EXTENSIONS.length);
        call.state = DevLink3CallState.Ringing;
        this.log(`Call #${call.callId}: transferred from ${oldExt} to ${EXTENSIONS[call.extensionIdx].number}`);
      }
    } else if (call.state === DevLink3CallState.Held) {
      // Resume from hold
      call.state = DevLink3CallState.Connected;
      this.log(`Call #${call.callId}: resumed from hold`);
    }

    this.broadcastDelta3Event(call);
  }

  /**
   * Advance call states on tick (ringing -> connected, connected -> completed).
   */
  private tickCalls(): void {
    const now = Math.floor(Date.now() / 1000);

    for (const [callId, call] of this.activeCalls) {
      const elapsed = now - call.startTime;

      if (call.state === DevLink3CallState.Ringing && elapsed > 3) {
        // Answer after ~3 seconds of ringing
        call.state = DevLink3CallState.Connected;
        call.connectedTime = now;
        this.log(`Call #${callId}: answered by ${EXTENSIONS[call.extensionIdx].number}`);
        this.broadcastDelta3Event(call);
      } else if (call.state === DevLink3CallState.Connected) {
        const talkTime = now - call.connectedTime;
        if (talkTime >= call.targetDuration) {
          // End the call
          call.state = DevLink3CallState.Disconnecting;
          this.log(`Call #${callId}: completed after ${talkTime}s`);
          this.broadcastDelta3Event(call);

          // Send CallLost after a short delay
          setTimeout(() => {
            this.broadcastCallLost(call);
            this.activeCalls.delete(callId);
          }, 500);
        }
      }
    }
  }

  /**
   * Broadcast a Delta3 Detail event to all streaming clients.
   */
  private broadcastDelta3Event(call: SimulatedCall): void {
    const xml = this.buildDetailXml(call);
    const packet = this.buildEventPacket(xml);

    for (const [, client] of this.clients) {
      if (client.eventStreaming) {
        try {
          client.socket.write(packet);
        } catch {
          // Client may have disconnected
        }
      }
    }
  }

  /**
   * Broadcast a CallLost event.
   */
  private broadcastCallLost(call: SimulatedCall): void {
    const ext = EXTENSIONS[call.extensionIdx];
    const xml = `<CallLost CallID="${call.callId}" PartyName="${ext.name}" Cause="16" Stamp="${Math.floor(Date.now() / 1000)}" />`;
    const packet = this.buildEventPacket(xml);

    for (const [, client] of this.clients) {
      if (client.eventStreaming) {
        try {
          client.socket.write(packet);
        } catch {
          // Client may have disconnected
        }
      }
    }
  }

  /**
   * Build a Delta3 Detail XML string for a simulated call.
   */
  private buildDetailXml(call: SimulatedCall): string {
    const ext = EXTENSIONS[call.extensionIdx];
    const trunk = TRUNKS[call.trunkIdx];
    const now = Math.floor(Date.now() / 1000);
    const connDur = call.connectedTime ? now - call.connectedTime : 0;
    const ringDur = call.connectedTime ? call.connectedTime - call.startTime : now - call.startTime;

    const callState = call.state;
    const partyAConnected = callState === DevLink3CallState.Connected || callState === DevLink3CallState.Held ? 1 : 0;
    const partyBConnected = partyAConnected;
    const music = callState === DevLink3CallState.Held ? 1 : 0;

    // PartyA is the trunk (external) for inbound, extension for outbound
    // PartyB is the extension for inbound, trunk for outbound
    let partyAXml: string;
    let partyBXml: string;

    if (call.direction === 'I') {
      partyAXml = `  <PartyA State="${callState}" Connected="${partyAConnected}" Music="0" ` +
        `Name="${trunk.name}" Slot="${trunk.slot}" Dir="I" ` +
        `EqType="${trunk.eqType}" CalledPN="${ext.number}" CalledPT="0" ` +
        `CallingPN="${call.externalNumber}" CallingPT="0" ` +
        `DialPN="" DialPT="0" KeyPN="" KeyPT="0" ` +
        `RingCount="1" Cause="16" VMDisallow="0" ` +
        `SendComplete="1" CallType="0" TransType="0" ` +
        `UCID="" SCNCallID="" />`;

      partyBXml = callState !== DevLink3CallState.Ringing
        ? `  <PartyB State="${callState}" Connected="${partyBConnected}" Music="${music}" ` +
          `Name="${ext.name}" Slot="" Dir="I" ` +
          `EqType="${ext.eqType}" CalledPN="" CalledPT="0" ` +
          `CallingPN="${call.externalNumber}" CallingPT="0" ` +
          `DialPN="" DialPT="0" KeyPN="" KeyPT="0" ` +
          `RingCount="1" Cause="16" VMDisallow="0" ` +
          `SendComplete="1" CallType="0" TransType="0" ` +
          `UCID="" SCNCallID="" />`
        : '';
    } else {
      partyAXml = `  <PartyA State="${callState}" Connected="${partyAConnected}" Music="0" ` +
        `Name="${ext.name}" Slot="" Dir="O" ` +
        `EqType="${ext.eqType}" CalledPN="${call.externalNumber}" CalledPT="0" ` +
        `CallingPN="${ext.number}" CallingPT="0" ` +
        `DialPN="${call.externalNumber}" DialPT="0" KeyPN="" KeyPT="0" ` +
        `RingCount="0" Cause="16" VMDisallow="0" ` +
        `SendComplete="1" CallType="0" TransType="0" ` +
        `UCID="" SCNCallID="" />`;

      partyBXml = callState !== DevLink3CallState.Ringing
        ? `  <PartyB State="${callState}" Connected="${partyBConnected}" Music="${music}" ` +
          `Name="${trunk.name}" Slot="${trunk.slot}" Dir="O" ` +
          `EqType="${trunk.eqType}" CalledPN="" CalledPT="0" ` +
          `CallingPN="" CallingPT="0" ` +
          `DialPN="${call.externalNumber}" DialPT="0" KeyPN="" KeyPT="0" ` +
          `RingCount="0" Cause="16" VMDisallow="0" ` +
          `SendComplete="1" CallType="0" TransType="0" ` +
          `UCID="" SCNCallID="" />`
        : '';
    }

    // Target list (only for hunt group calls)
    let targetListXml = '';
    if (call.huntGroup) {
      const targetExts = EXTENSIONS.slice(0, 3); // First 3 extensions as targets
      const targets = targetExts.map((te) =>
        `    <Target Name="${te.name}" State="0" EqType="${te.eqType}" ` +
        `UCID="" SCNCallID="" Dir="" ` +
        `CalledPN="${te.number}" CalledPT="0" ` +
        `CallingPN="${call.externalNumber}" CallingPT="0" ` +
        `DialPN="" DialPT="0" KeyPN="" KeyPT="0" ` +
        `RingCount="0" Cause="0" VMDisallow="0" ` +
        `SendComplete="0" CallType="0" TransType="0" />`
      ).join('\n');

      targetListXml = `\n  <Target_list>\n${targets}\n  </Target_list>`;
    }

    const calledType = call.huntGroup ? CalledType.ACD : (call.direction === 'I' ? CalledType.Direct : CalledType.Internal);

    return `<Detail>
  <Call State="${callState}" Flags="0" CalledType="${calledType}" CallID="${call.callId}" ` +
    `TargetGroup="${call.huntGroup ?? ''}" OrigGroup="" OrigUser="" ` +
    `Stamp="${call.startTime}" ConnStamp="${call.connectedTime || 0}" RingStamp="${call.startTime}" ` +
    `ConnDur="${connDur}" RingDur="${ringDur}" Locale="0" Tag="" AccCode="" ` +
    `ParkSlot="0" CallWait="0" Xfer="0" SvcActive="0" SvcQuotaUsed="0" SvcQuotaTime="0" />
${partyAXml}
${partyBXml ? partyBXml + '\n' : ''}${targetListXml}
</Detail>`;
  }

  /**
   * Internal logging helper.
   */
  private log(message: string): void {
    console.log(`[${new Date().toISOString()}] [DevLink3:Simulator] ${message}`);
  }
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────
// If this file is run directly (via tsx), start the simulator.

if (typeof require !== 'undefined' && require.main === module) {
  const sim = new DevLink3Simulator();
  sim.start();

  process.on('SIGINT', () => {
    sim.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    sim.stop();
    process.exit(0);
  });
}
