// ─── SMDR (Station Message Detail Recording) Types ──────────────────────────
// Source: Avaya_SMDR_Format_Spec.md Sections 3-5
// SMDR records are CSV-formatted call detail records pushed by IP Office
// over TCP (default port 1150).

/**
 * SMDR direction codes as received from IP Office.
 */
export type SmdrDirection = 'I' | 'O';

/**
 * External targeting source codes.
 * Source: Avaya_SMDR_Format_Spec.md Section 5.
 */
export type SmdrTargetingSource = 'HG' | 'U' | 'LINE' | 'AA' | 'ICR' | 'MT';

/**
 * External targeting reason codes.
 * Source: Avaya_SMDR_Format_Spec.md Section 5.
 */
export type SmdrTargetingReason =
  | 'fb'    // Forward on Busy
  | 'fu'    // Forward Unconditional
  | 'fnr'   // Forward on No Response
  | 'fdnd'  // Forward on DND
  | 'XfP'   // Transfer proposal
  | 'Xfd'   // Transferred call
  | 'CfP'   // Conference proposal
  | 'Cfd';  // Conferenced

/**
 * A complete SMDR record with all 35 fields (30 base + 5 R11 additions).
 * Source: Avaya_SMDR_Format_Spec.md Section 3.
 *
 * Field numbers correspond to CSV column positions (1-indexed).
 * TCP stream does NOT include a header row -- fields are mapped by position.
 */
export interface SmdrRecord {
  // ── Base Fields (1-30) ──

  /** Field 1: Call initiation timestamp (YYYY/MM/DD HH:MM:SS) */
  callStart: string;
  /** Field 2: Connected/talking duration (HH:MM:SS) */
  connectedTime: string;
  /** Field 3: Ring time in seconds */
  ringTime: number;
  /** Field 4: Originating number (extension or CLI) */
  caller: string;
  /** Field 5: Call direction: I=Inbound, O=Outbound (internal calls are O) */
  direction: SmdrDirection;
  /** Field 6: Originally dialed number */
  calledNumber: string;
  /** Field 7: DDI digits received (inbound) or dialed digits (outbound) */
  dialledNumber: string;
  /** Field 8: Last account code attached */
  account: string;
  /** Field 9: 1 if both parties are internal, 0 otherwise */
  isInternal: number;
  /** Field 10: Unique call identifier (shared across continuation records, starts at 1000000) */
  callId: number;
  /** Field 11: 1 if more records follow for this call, 0 if final */
  continuation: number;
  /** Field 12: Party 1 device ID (prefix+number, e.g., E4324, T9001, V9501) */
  party1Device: string;
  /** Field 13: Party 1 user/trunk name */
  party1Name: string;
  /** Field 14: Party 2 device ID */
  party2Device: string;
  /** Field 15: Party 2 user/trunk name */
  party2Name: string;
  /** Field 16: Total hold duration in seconds */
  holdTime: number;
  /** Field 17: Total park duration in seconds */
  parkTime: number;
  /** Field 18: 1 if a valid authorization code was used */
  authValid: number;
  /** Field 19: Authorization code or 'n/a' */
  authCode: string;
  /** Field 20: User assigned charges */
  userCharged: string;
  /** Field 21: Calculated call charge */
  callCharge: number;
  /** Field 22: Currency setting */
  currency: string;
  /** Field 23: Amount of Charge at the point of last user transfer */
  amountAtLastUserChange: number;
  /** Field 24: Total call units */
  callUnits: string;
  /** Field 25: AoC units at last transfer point */
  unitsAtLastUserChange: string;
  /** Field 26: Rate per line */
  costPerUnit: number;
  /** Field 27: User markup percentage */
  markUp: string;
  /** Field 28: External targeting cause (source+reason, e.g., 'HG:fb') */
  externalTargetingCause: string;
  /** Field 29: External targeting entity name */
  externalTargeterId: string;
  /** Field 30: External number that was called */
  externalTargetedNumber: string;

  // ── R11 Additional Fields (31-35) ──

  /** Field 31: Server IP of calling party */
  callingPartyServerIp: string;
  /** Field 32: Globally unique call ID for the caller */
  uniqueCallIdCaller: string;
  /** Field 33: Server IP of called party */
  calledPartyServerIp: string;
  /** Field 34: Globally unique call ID for the called party */
  uniqueCallIdCalled: string;
  /** Field 35: Actual SMDR record generation timestamp */
  smdrRecordTime: string;
}

/**
 * Device type prefix lookup for SMDR Party device fields.
 * Source: Avaya_SMDR_Format_Spec.md Section 4.
 *
 * E = Extension (E + extension number)
 * T = Trunk (T + 9000 + line number)
 * V = Voicemail (V + 9500 + channel) or Conference (V + 9550 + channel)
 */
export type SmdrDevicePrefix = 'E' | 'T' | 'V';
