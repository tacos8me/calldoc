// ─── DevLink3 SHA1 Challenge-Response Authentication ─────────────────────────
// Implements the full authentication handshake with Avaya IP Office
// as described in DevLink3_Protocol_Spec.md Section 5 and the reference
// implementation in Packet.cs.

import crypto from 'crypto';
import { PacketType, ResponseCode } from '@/types/devlink3';
import type { DevLink3Packet } from '@/types/devlink3';
import type { DevLink3Connection } from './connection';
import { generateRequestId, MAGIC_BYTE } from './connection';

/**
 * Compute the SHA1 challenge response.
 *
 * The hash input is 32 bytes:
 *   - Bytes 0-15:  Challenge data from IP Office (16 bytes)
 *   - Bytes 16-31: Password as UTF-8, zero-padded to 16 bytes (truncated if longer)
 *
 * @param challenge - The 16-byte random challenge from IP Office
 * @param password  - The service user password
 * @returns The 20-byte SHA1 hash
 */
export function computeChallengeResponse(challenge: Buffer, password: string): Buffer {
  const pwdBytes = Buffer.from(password.trim(), 'utf-8').subarray(0, 16);
  const pwdPadded = Buffer.alloc(16);
  pwdBytes.copy(pwdPadded);

  const hashInput = Buffer.concat([challenge, pwdPadded]); // 32 bytes
  return crypto.createHash('sha1').update(hashInput).digest(); // 20 bytes
}

/**
 * Build the Phase 1 authentication packet (username submission).
 *
 * Wire format (from C# reference Packet.cs):
 *   Header:  0x00300001 (Authenticate)
 *   Body:    00000001 (Request subtype) + UTF-8(username + NUL)
 *
 * @param username - The DevLink3 service user name
 * @returns Complete packet buffer ready to send, and the request ID
 */
function buildAuthUsernamePacket(username: string): { buffer: Buffer; requestId: string } {
  const requestId = generateRequestId();

  // Body: subtype(4 bytes) + username bytes + NUL
  const usernameBytes = Buffer.from(username.trim() + '\0', 'utf-8');
  const subtypeBytes = Buffer.from('00000001', 'hex'); // Request subtype
  const body = Buffer.concat([subtypeBytes, usernameBytes]);

  // Request ID as 4 bytes
  const requestIdBuf = Buffer.from(requestId, 'hex');

  // Type header
  const typeBuf = Buffer.alloc(4);
  typeBuf.writeUInt32BE(PacketType.Auth, 0);

  // Payload = type(4) + requestId(4) + body
  const payloadLen = 4 + 4 + body.length;
  const frameLen = 3 + payloadLen;

  const frame = Buffer.alloc(frameLen);
  let offset = 0;

  frame.writeUInt8(MAGIC_BYTE, offset); offset += 1;
  frame.writeUInt16BE(frameLen, offset); offset += 2;
  typeBuf.copy(frame, offset); offset += 4;
  requestIdBuf.copy(frame, offset); offset += 4;
  body.copy(frame, offset);

  return { buffer: frame, requestId };
}

/**
 * Build the Phase 2 authentication packet (SHA1 challenge response).
 *
 * Wire format (from C# reference Packet.cs):
 *   Header:  0x00300001 (Authenticate)
 *   Body:    00000050 (ChallengeResponse subtype) + length(4 bytes, 0x00000014 = 20) + SHA1 hash(20 bytes)
 *
 * @param sha1Hash - The 20-byte SHA1 hash result
 * @returns Complete packet buffer ready to send, and the request ID
 */
function buildAuthChallengeResponsePacket(sha1Hash: Buffer): { buffer: Buffer; requestId: string } {
  const requestId = generateRequestId();

  // Body: subtype(4) + hash length(4) + hash(20)
  const subtypeBuf = Buffer.from('00000050', 'hex');
  const hashLenBuf = Buffer.alloc(4);
  hashLenBuf.writeUInt32BE(sha1Hash.length, 0); // 0x00000014 = 20
  const body = Buffer.concat([subtypeBuf, hashLenBuf, sha1Hash]);

  // Request ID as 4 bytes
  const requestIdBuf = Buffer.from(requestId, 'hex');

  // Type header
  const typeBuf = Buffer.alloc(4);
  typeBuf.writeUInt32BE(PacketType.Auth, 0);

  // Frame
  const payloadLen = 4 + 4 + body.length;
  const frameLen = 3 + payloadLen;

  const frame = Buffer.alloc(frameLen);
  let offset = 0;

  frame.writeUInt8(MAGIC_BYTE, offset); offset += 1;
  frame.writeUInt16BE(frameLen, offset); offset += 2;
  typeBuf.copy(frame, offset); offset += 4;
  requestIdBuf.copy(frame, offset); offset += 4;
  body.copy(frame, offset);

  return { buffer: frame, requestId };
}

/**
 * Extract the challenge data from an AuthResponse packet payload.
 *
 * From the C# reference (GetChallenge):
 *   Challenge size at byte offset 18 (relative to full raw packet)
 *   which is payload offset 18 - 3 (frame header) = offset 15 in raw packet payload.
 *
 * But the DevLink3Connection strips the magic+length, and gives us payload after the type.
 * So packet.payload starts at what was byte 7 of the raw frame:
 *   payload[0-3] = requestId (bytes 7-10 of frame)
 *   payload[4-7] = response code (bytes 11-14 of frame)
 *   payload[8-11] = challenge size as uint32 (bytes 15-18 of frame)
 *   payload[12+] = challenge data (byte 19+ of frame)
 *
 * @param payload - The packet payload (after type bytes have been stripped)
 * @returns The challenge bytes
 */
function extractChallenge(payload: Buffer): Buffer {
  // payload[0..3] = requestId, payload[4..7] = response code
  // payload[8..11] = challenge data length (4 bytes big-endian)
  // payload[12..] = challenge data
  const challengeLen = payload.readUInt32BE(8);
  return payload.subarray(12, 12 + challengeLen);
}

/**
 * Extract the response code from an AuthResponse packet payload.
 *
 * @param payload - The packet payload (after type bytes)
 * @returns The response code as a number
 */
function extractResponseCode(payload: Buffer): number {
  // payload[0..3] = requestId, payload[4..7] = response code
  return payload.readUInt32BE(4);
}

/**
 * Perform the full DevLink3 SHA1 challenge-response authentication sequence.
 *
 * Sequence:
 *   1. Send username in AuthRequest packet
 *   2. Receive challenge from AuthResponse (response code 0x00000002)
 *   3. Compute SHA1(challenge + padded_password)
 *   4. Send computed hash in second AuthRequest
 *   5. Receive success (0x00000000) or fail (0x80000041)
 *
 * @param connection - Active DevLink3Connection instance
 * @param username   - DevLink3 service user name
 * @param password   - DevLink3 service user password
 * @returns true if authentication succeeded, false otherwise
 */
export async function authenticate(
  connection: DevLink3Connection,
  username: string,
  password: string
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let phase: 'username' | 'challenge' = 'username';
    let pendingRequestId: string;

    const onPacket = (packet: DevLink3Packet) => {
      // Only handle AuthResponse packets
      if (packet.type !== PacketType.AuthResponse) return;

      const responseCode = extractResponseCode(packet.payload);

      if (phase === 'username') {
        // Phase 2: We sent username, expecting Challenge response
        if (responseCode === ResponseCode.Challenge) {
          phase = 'challenge';

          // Extract the challenge bytes
          const challenge = extractChallenge(packet.payload);

          // Compute SHA1 hash
          const sha1Hash = computeChallengeResponse(challenge, password);

          // Send challenge response
          const { buffer, requestId } = buildAuthChallengeResponsePacket(sha1Hash);
          pendingRequestId = requestId;
          connection.sendRaw(buffer);

          console.log(`[${new Date().toISOString()}] [DevLink3:Auth] Challenge received, response sent`);
        } else if (responseCode === ResponseCode.Fail) {
          connection.removeListener('packet', onPacket);
          console.log(`[${new Date().toISOString()}] [DevLink3:Auth] Authentication failed at username phase`);
          resolve(false);
        }
      } else if (phase === 'challenge') {
        // Phase 3: We sent challenge response, expecting Pass or Fail
        connection.removeListener('packet', onPacket);

        if (responseCode === ResponseCode.Success) {
          console.log(`[${new Date().toISOString()}] [DevLink3:Auth] Authentication succeeded`);
          resolve(true);
        } else {
          console.log(
            `[${new Date().toISOString()}] [DevLink3:Auth] Authentication failed (response code: 0x${responseCode.toString(16).padStart(8, '0')})`
          );
          resolve(false);
        }
      }
    };

    connection.on('packet', onPacket);

    // Phase 1: Send username
    const { buffer, requestId } = buildAuthUsernamePacket(username);
    pendingRequestId = requestId;
    connection.sendRaw(buffer);

    console.log(`[${new Date().toISOString()}] [DevLink3:Auth] Username sent: ${username}`);

    // Timeout after 15 seconds
    setTimeout(() => {
      connection.removeListener('packet', onPacket);
      console.log(`[${new Date().toISOString()}] [DevLink3:Auth] Authentication timed out`);
      resolve(false);
    }, 15_000);
  });
}

/**
 * Build and send an EventRequest packet to register for event streams.
 *
 * Wire format (from C# reference):
 *   Header: 0x00300011 (EventRequest)
 *   Body:   2-byte length of flags string (including NUL) + UTF-8 flags + NUL
 *
 * @param connection - Authenticated DevLink3 connection
 * @param flags      - Event flag string (e.g., '-CallDelta3' or '-CallDelta3 -CMExtn')
 * @returns Promise resolving to true if event registration succeeded
 */
export async function requestEvents(
  connection: DevLink3Connection,
  flags: string
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const onPacket = (packet: DevLink3Packet) => {
      if (packet.type !== PacketType.EventRequestResponse) return;
      connection.removeListener('packet', onPacket);

      const responseCode = extractResponseCode(packet.payload);

      if (responseCode === ResponseCode.Success || responseCode === 0x00000009 /* PARTIAL_SUCCESS */) {
        console.log(`[${new Date().toISOString()}] [DevLink3:Auth] Event registration succeeded`);
        resolve(true);
      } else {
        console.log(
          `[${new Date().toISOString()}] [DevLink3:Auth] Event registration failed (0x${responseCode.toString(16).padStart(8, '0')})`
        );
        resolve(false);
      }
    };

    connection.on('packet', onPacket);

    // Build the EventRequest packet
    const requestId = generateRequestId();
    const requestIdBuf = Buffer.from(requestId, 'hex');

    // Flags string with NUL terminator
    const flagsWithNul = flags.trim() + '\0';
    const flagsBytes = Buffer.from(flagsWithNul, 'utf-8');

    // Body: 2-byte length + flags bytes
    const lenBuf = Buffer.alloc(2);
    lenBuf.writeUInt16BE(flagsBytes.length, 0);
    const body = Buffer.concat([lenBuf, flagsBytes]);

    // Type header
    const typeBuf = Buffer.alloc(4);
    typeBuf.writeUInt32BE(PacketType.EventRequest, 0);

    // Frame
    const payloadLen = 4 + 4 + body.length;
    const frameLen = 3 + payloadLen;

    const frame = Buffer.alloc(frameLen);
    let offset = 0;

    frame.writeUInt8(MAGIC_BYTE, offset); offset += 1;
    frame.writeUInt16BE(frameLen, offset); offset += 2;
    typeBuf.copy(frame, offset); offset += 4;
    requestIdBuf.copy(frame, offset); offset += 4;
    body.copy(frame, offset);

    connection.sendRaw(frame);

    console.log(`[${new Date().toISOString()}] [DevLink3:Auth] Event request sent: "${flags}"`);

    // Timeout after 10 seconds
    setTimeout(() => {
      connection.removeListener('packet', onPacket);
      resolve(false);
    }, 10_000);
  });
}
