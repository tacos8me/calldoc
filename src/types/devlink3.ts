// ─── DevLink3 Wire-Level Protocol Types ─────────────────────────────────────
// Source: DevLink3_Protocol_Spec.md Sections 2-14
// These types represent the binary/XML protocol used to communicate with
// Avaya IP Office 11 over TCP port 50797 (or TLS 50796).

import type { CallState } from './calls';

// ─── Packet Framing ─────────────────────────────────────────────────────────

/**
 * A raw DevLink3 packet before deserialization.
 * Source: DevLink3_Protocol_Spec.md Section 2.
 *
 * Wire format:
 *   Byte 0:    0x49 (magic byte "I")
 *   Bytes 1-2: Packet length (big-endian uint16)
 *   Bytes 3-6: Packet type (4 bytes, hex-encoded)
 *   Bytes 7-14: Request ID (8 ASCII decimal digits)
 *   Bytes 15+: Body (variable)
 */
export interface DevLink3Packet {
  /** Magic byte, always 0x49 */
  magic: number;
  /** Total packet length in bytes (3 + header + requestId + body) */
  length: number;
  /** Packet type identifier */
  type: PacketType;
  /** Body payload (interpretation depends on packet type) */
  payload: Buffer;
}

/**
 * DevLink3 packet type identifiers.
 * Source: DevLink3_Protocol_Spec.md Section 3.
 *
 * Pattern: Requests have MSB=0, responses have MSB=8 (bit 31 set),
 * events have MSB=1 (bit 28 set).
 */
export enum PacketType {
  /** Keepalive / link verification (Client -> Server) */
  Test = 0x002a0001,
  /** Test response (Server -> Client) */
  TestAck = 0x802a0001,
  /** Authentication request (Client -> Server) */
  Auth = 0x00300001,
  /** Authentication response (Server -> Client) */
  AuthResponse = 0x80300001,
  /** Register for event streams (Client -> Server) */
  EventRequest = 0x00300011,
  /** Event registration response (Server -> Client) */
  EventRequestResponse = 0x80300011,
  /** Unsolicited event data (Server -> Client) */
  Event = 0x10300011,
  /** ReadFile request (Client -> Server) */
  ReadFile = 0x00300041,
  /** ReadFile response (Server -> Client) */
  ReadFileResponse = 0x80300041,
}

/**
 * Authentication/request response codes.
 * Source: DevLink3_Protocol_Spec.md Section 4.
 */
export enum ResponseCode {
  /** Request succeeded */
  Success = 0x00000000,
  /** Server sends SHA1 challenge during authentication */
  Challenge = 0x00000002,
  /** Unknown event flag string in EventRequest */
  UnknownFlag = 0x80000021,
  /** Authentication failed */
  Fail = 0x80000041,
}

/**
 * Tuple type codes for event data classification.
 * Source: DevLink3_Protocol_Spec.md Section 8.
 */
export enum TupleCode {
  /** Application identifier */
  AppName = 0x007e0001,
  /** PBX type identifier */
  PbxType = 0x007d0001,
  /** DevLink version variant */
  DevLinkVariant = 0x007d0002,
  /** XML call event data (primary) */
  CallDelta3 = 0x00760001,
  /** Legacy comma-separated call data */
  CallDelta2 = 0x00760002,
  /** SIP call ID association */
  SipTrack = 0x00760003,
  /** Extension state change */
  CmExtn = 0x00760004,
}

/**
 * Event flag strings for EventRequest registration.
 * Source: DevLink3_Protocol_Spec.md Section 7.
 */
export const EVENT_FLAGS = {
  SIP_TRACK: '-SIPTrack',
  CALL_DELTA3: '-CallDelta3',
  CALL_DELTA2: '-CallDelta2',
  CM_EXTN: '-CMExtn',
  SCN: '-SCN',
  CONN: '-CONN',
  TEXT: '-TEXT',
} as const;

export type EventFlag = (typeof EVENT_FLAGS)[keyof typeof EVENT_FLAGS];

// ─── Delta3 XML Record Types ────────────────────────────────────────────────

/**
 * Delta3 Detail record -- a full call state snapshot.
 * This is the most common event type and contains complete call information.
 * Source: DevLink3_Protocol_Spec.md Section 9.
 */
export interface Delta3DetailRecord {
  /** Record type discriminator */
  recordType: 'Detail';

  // ── Call-level fields (18 fields) ──
  call: {
    /** Call state (numeric enum, see DevLink3CallState) */
    state: number;
    /** Flags bitfield (see FlagsBitfield) */
    flags: number;
    /** Called type code (see CalledType) */
    calledType: number;
    /** Unique call identifier from IP Office */
    callId: string;
    /** Target hunt group name */
    targetGroup: string;
    /** Originating hunt group name */
    origGroup: string;
    /** Originating user name */
    origUser: string;
    /** Unix timestamp of call start */
    stamp: number;
    /** Unix timestamp of connection */
    connStamp: number;
    /** Unix timestamp of first ring */
    ringStamp: number;
    /** Connected duration in seconds */
    connDur: number;
    /** Ring duration in seconds */
    ringDur: number;
    /** Locale identifier */
    locale: number;
    /** User-defined tag */
    tag: string;
    /** Account code */
    accCode: string;
    /** Park slot number (0 = not parked) */
    parkSlot: number;
    /** Call waiting indicator */
    callWait: number;
    /** Transfer count */
    xfer: number;
  };

  // ── Party fields (up to 26 fields each) ──
  partyA: Delta3Party;
  partyB: Delta3Party | null;

  // ── Target list (up to 14 fields each) ──
  targets: Delta3Target[];
}

/**
 * A party (endpoint) within a Delta3 Detail record.
 * Source: DevLink3_Protocol_Spec.md Section 9 (PartyA/PartyB attributes).
 */
export interface Delta3Party {
  /** Party call state (numeric) */
  state: number;
  /** Whether this party is connected (1=yes, 0=no) */
  connected: number;
  /** Whether music on hold is playing (1=yes, 0=no) */
  music: number;
  /** Device name (extension name or trunk name) */
  name: string;
  /** Trunk slot identifier */
  slot: string;
  /** Direction: 'I'=inbound, 'O'=outbound */
  dir: string;
  /** Equipment type (see EquipmentType enum) */
  eqType: number;
  /** Called party number */
  calledPN: string;
  /** Called party type */
  calledPT: number;
  /** Calling party number (CLI) */
  callingPN: string;
  /** Calling party type */
  callingPT: number;
  /** Dialed number */
  dialPN: string;
  /** Dialed party type */
  dialPT: number;
  /** Key number (e.g., for DSS/BLF) */
  keyPN: string;
  /** Key party type */
  keyPT: number;
  /** Number of times this party has been rung */
  ringCount: number;
  /** Cause code for last state change (see CauseCode) */
  cause: number;
  /** Whether voicemail is disallowed (1=yes, 0=no) */
  vmDisallow: number;
  /** Whether dial string is complete */
  sendComplete: number;
  /** Call type code */
  callType: number;
  /** Transfer type code */
  transType: number;
  /** Universal Call ID */
  ucid: string;
  /** SCN Call ID (multi-site) */
  scnCallId: string;
}

/**
 * A target entry within a Delta3 Detail record.
 * Represents a hunt group or endpoint that was targeted during call routing.
 * Source: DevLink3_Protocol_Spec.md Section 9 (Target_list attributes).
 */
export interface Delta3Target {
  /** Target name (e.g., hunt group name) */
  name: string;
  /** Target state (numeric) */
  state: number;
  /** Equipment type */
  eqType: number;
  /** Universal Call ID */
  ucid: string;
  /** SCN Call ID */
  scnCallId: string;
  /** Direction */
  dir: string;
  /** Called party number */
  calledPN: string;
  /** Called party type */
  calledPT: number;
  /** Calling party number */
  callingPN: string;
  /** Calling party type */
  callingPT: number;
  /** Dialed number */
  dialPN: string;
  /** Dialed party type */
  dialPT: number;
  /** Key number */
  keyPN: string;
  /** Key party type */
  keyPT: number;
  /** Ring count */
  ringCount: number;
  /** Cause code */
  cause: number;
  /** VM disallow flag */
  vmDisallow: number;
  /** Send complete flag */
  sendComplete: number;
  /** Call type */
  callType: number;
  /** Transfer type */
  transType: number;
}

/**
 * Delta3 CallLost record -- emitted when a party disconnects.
 * Source: DevLink3_Protocol_Spec.md Section 9.
 */
export interface Delta3CallLostRecord {
  /** Record type discriminator */
  recordType: 'CallLost';
  /** Call identifier */
  callId: string;
  /** Name of the party that disconnected */
  partyName: string;
  /** Cause code for disconnection */
  cause: number;
  /** Unix timestamp of disconnection */
  stamp: number;
}

/**
 * Delta3 LinkLost record -- emitted when an intermediate node disconnects.
 * Source: DevLink3_Protocol_Spec.md Section 9.
 */
export interface Delta3LinkLostRecord {
  /** Record type discriminator */
  recordType: 'LinkLost';
  /** Node identifier that was lost */
  nodeId: string;
  /** Unix timestamp of disconnection */
  stamp: number;
}

/**
 * Delta3 AttemptReject record -- emitted when a call is manually rejected.
 * Source: DevLink3_Protocol_Spec.md Section 9.
 */
export interface Delta3AttemptRejectRecord {
  /** Record type discriminator */
  recordType: 'AttemptReject';
  /** Call identifier */
  callId: string;
  /** Name of the party that rejected */
  partyName: string;
  /** Cause code for rejection */
  cause: number;
  /** Unix timestamp of rejection */
  stamp: number;
}

/**
 * Union of all Delta3 record types.
 */
export type Delta3Record =
  | Delta3DetailRecord
  | Delta3CallLostRecord
  | Delta3LinkLostRecord
  | Delta3AttemptRejectRecord;

// ─── Wire-Level Enumerations ────────────────────────────────────────────────

/**
 * DevLink3 numeric call state values.
 * Source: DevLink3_Protocol_Spec.md Section 10.
 */
export enum DevLink3CallState {
  Idle = 0,
  Ringing = 1,
  Connected = 2,
  Disconnecting = 3,
  Suspending = 4,
  Suspended = 5,
  Resuming = 6,
  Dialling = 7,
  Dialled = 8,
  LocalDial = 9,
  Queued = 10,
  Parked = 11,
  Held = 12,
  Redialling = 13,
}

/**
 * Mapping from DevLink3 numeric call states to application-level CallState.
 * Used by the DevLink3Connector to translate wire values into the domain model.
 */
export const DevLink3CallStateMap: Record<number, CallState> = {
  [DevLink3CallState.Idle]: 'idle',
  [DevLink3CallState.Ringing]: 'ringing',
  [DevLink3CallState.Connected]: 'connected',
  [DevLink3CallState.Disconnecting]: 'completed',
  [DevLink3CallState.Suspending]: 'hold',
  [DevLink3CallState.Suspended]: 'hold',
  [DevLink3CallState.Resuming]: 'connected',
  [DevLink3CallState.Dialling]: 'ringing',
  [DevLink3CallState.Dialled]: 'ringing',
  [DevLink3CallState.LocalDial]: 'ringing',
  [DevLink3CallState.Queued]: 'queued',
  [DevLink3CallState.Parked]: 'parked',
  [DevLink3CallState.Held]: 'hold',
  [DevLink3CallState.Redialling]: 'ringing',
};

/**
 * Equipment type classifications for devices on the IP Office system.
 * Source: DevLink3_Protocol_Spec.md Section 11.
 */
export enum EquipmentType {
  ISDNTrunk = 2,
  SIPTrunk = 5,
  TDMPhone = 8,
  H323Phone = 9,
  SIPDevice = 10,
  Voicemail = 12,
  ConferenceChannel = 13,
  HuntGroup = 15,
  WebRTCPhone = 28,
}

/**
 * Called type codes indicating how the call was routed.
 * Source: DevLink3_Protocol_Spec.md Section 12.
 */
export enum CalledType {
  Internal = 101,
  Voicemail = 102,
  ACD = 103,
  Direct = 105,
  Emergency = 119,
}

/**
 * Flags bitfield values for call attributes.
 * Source: DevLink3_Protocol_Spec.md Section 13.
 */
export enum FlagsBitfield {
  /** CLIR (Calling Line ID Restriction) requested */
  Privacy = 0x01,
  /** Call was auto-answered */
  AutoAnswered = 0x02,
  /** Call was auto-recorded */
  AutoRecorded = 0x04,
  /** Consent to record was answered */
  ConsentAnswered = 0x10,
  /** Consent to record was refused */
  ConsentRefused = 0x20,
}

/**
 * Cause codes for call state transitions.
 * Source: DevLink3_Protocol_Spec.md Section 14.
 */
export enum CauseCode {
  Unknown = 0,
  UnallocatedNumber = 1,
  ForceIdle = 2,
  Unregister = 3,
  Normal = 16,
  Busy = 17,
  NoUserResponding = 18,
  CallRejected = 21,
  NormalUnspecified = 31,
  NoChannel = 34,
  NetworkOutOfOrder = 38,
  Incompatible = 88,
}
