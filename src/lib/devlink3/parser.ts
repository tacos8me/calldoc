// ─── DevLink3 Delta3 XML Event Parser ────────────────────────────────────────
// Parses Delta3 XML event strings into typed records.
// Uses simple string parsing (no external XML library) since Delta3 XML
// follows a predictable, flat attribute-based structure.

import type {
  Delta3Record,
  Delta3DetailRecord,
  Delta3Party,
  Delta3Target,
  Delta3CallLostRecord,
  Delta3LinkLostRecord,
  Delta3AttemptRejectRecord,
} from '@/types/devlink3';
import {
  DevLink3CallStateMap,
  EquipmentType,
  CalledType,
  CauseCode,
} from '@/types/devlink3';
import type { CallState } from '@/types/calls';

// ─── Helper Utilities ────────────────────────────────────────────────────────

/**
 * Extract XML attributes from a tag string into a key-value map.
 * Handles both quoted and unquoted attribute values.
 *
 * @param tagContent - The inner content of an XML tag (everything between < and >)
 * @returns Record of attribute name to string value
 */
function parseAttributes(tagContent: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  // Match: Name="value" or Name='value'
  const attrRegex = /(\w+)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(tagContent)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

/**
 * Extract the content between an opening and closing XML tag.
 * For self-closing tags like <Call ... />, returns null.
 *
 * @param xml - Full XML string
 * @param tagName - Tag name to search for
 * @returns The content between opening and closing tags, or null
 */
function extractTagContent(xml: string, tagName: string): string | null {
  const openRegex = new RegExp(`<${tagName}[^>]*>`, 'i');
  const closeRegex = new RegExp(`</${tagName}>`, 'i');

  const openMatch = openRegex.exec(xml);
  if (!openMatch) return null;

  // Check for self-closing tag
  if (openMatch[0].endsWith('/>')) return null;

  const closeMatch = closeRegex.exec(xml);
  if (!closeMatch) return null;

  return xml.substring(openMatch.index + openMatch[0].length, closeMatch.index);
}

/**
 * Extract the full tag (including attributes) for a self-closing or regular tag.
 *
 * @param xml - Full XML string
 * @param tagName - Tag name to search for
 * @returns The full tag string, or null if not found
 */
function extractTag(xml: string, tagName: string): string | null {
  // Match self-closing or opening tag
  const regex = new RegExp(`<${tagName}\\b([^>]*)/?>`);
  const match = regex.exec(xml);
  return match ? match[0] : null;
}

/**
 * Extract all occurrences of a tag.
 */
function extractAllTags(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}\\b[^>]*/?>`, 'g');
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}

/**
 * Safely parse an integer, returning 0 for empty/invalid values.
 */
function safeInt(value: string | undefined): number {
  if (!value || value === '') return 0;
  const n = parseInt(value, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Safely parse a string, returning empty string for undefined.
 */
function safeStr(value: string | undefined): string {
  return value ?? '';
}

// ─── CSV-based Record Parsers (Reference Doc Format) ─────────────────────────
// The reference doc (devlink3-reference.md Section 6.7) shows that
// Detail records contain comma-separated values INSIDE the tags, not attributes.
// We support BOTH formats: attribute-based (from Protocol Spec) and CSV-based (reference).

/**
 * Parse a comma-separated value string, respecting quoted fields.
 */
function parseCsvFields(csv: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ─── Detail Record Parser ────────────────────────────────────────────────────

/**
 * Parse a Detail record from attribute-based XML.
 * This format matches the example in DevLink3_Protocol_Spec.md Section 9.
 */
function parseDetailFromAttributes(xml: string): Delta3DetailRecord {
  // Parse Call section
  const callTag = extractTag(xml, 'Call');
  const callAttrs = callTag ? parseAttributes(callTag) : {};

  // Parse PartyA
  const partyATag = extractTag(xml, 'PartyA');
  const partyAAttrs = partyATag ? parseAttributes(partyATag) : {};

  // Parse PartyB
  const partyBTag = extractTag(xml, 'PartyB');
  const partyBAttrs = partyBTag ? parseAttributes(partyBTag) : null;

  // Parse Targets
  const targetTags = extractAllTags(xml, 'Target');
  const targets: Delta3Target[] = targetTags.map((tag) => {
    const attrs = parseAttributes(tag);
    return parseTargetFromAttrs(attrs);
  });

  return {
    recordType: 'Detail',
    call: {
      state: safeInt(callAttrs['State']),
      flags: safeInt(callAttrs['Flags']),
      calledType: safeInt(callAttrs['CalledType']),
      callId: safeStr(callAttrs['CallID']),
      targetGroup: safeStr(callAttrs['TargetGroup']),
      origGroup: safeStr(callAttrs['OrigGroup']),
      origUser: safeStr(callAttrs['OrigUser']),
      stamp: safeInt(callAttrs['Stamp']),
      connStamp: safeInt(callAttrs['ConnStamp']),
      ringStamp: safeInt(callAttrs['RingStamp']),
      connDur: safeInt(callAttrs['ConnDur']),
      ringDur: safeInt(callAttrs['RingDur']),
      locale: safeInt(callAttrs['Locale']),
      tag: safeStr(callAttrs['Tag']),
      accCode: safeStr(callAttrs['AccCode']),
      parkSlot: safeInt(callAttrs['ParkSlot']),
      callWait: safeInt(callAttrs['CallWait']),
      xfer: safeInt(callAttrs['Xfer']),
    },
    partyA: parsePartyFromAttrs(partyAAttrs),
    partyB: partyBAttrs ? parsePartyFromAttrs(partyBAttrs) : null,
    targets,
  };
}

/**
 * Parse a Detail record from CSV-based content (reference doc format).
 * In this format, Call/PartyA/PartyB content is comma-separated values.
 */
function parseDetailFromCsv(xml: string): Delta3DetailRecord {
  // Extract CSV content from each section
  const callContent = extractTagContent(xml, 'Call');
  const partyAContent = extractTagContent(xml, 'PartyA');
  const partyBContent = extractTagContent(xml, 'PartyB');
  const targetListContent = extractTagContent(xml, 'Target_list');

  const callFields = callContent ? parseCsvFields(callContent) : [];
  const partyAFields = partyAContent ? parseCsvFields(partyAContent) : [];
  const partyBFields = partyBContent ? parseCsvFields(partyBContent) : null;

  // Parse targets from Target_list
  const targets: Delta3Target[] = [];
  if (targetListContent) {
    // Each <Target> within <Target_list> has CSV content
    const targetRegex = /<Target\b[^>]*>([\s\S]*?)<\/Target>/gi;
    let targetMatch: RegExpExecArray | null;
    while ((targetMatch = targetRegex.exec(targetListContent)) !== null) {
      const targetFields = parseCsvFields(targetMatch[1]);
      targets.push(parseTargetFromCsvFields(targetFields));
    }
    // Also check for self-closing targets with attributes
    const selfClosingTargets = extractAllTags(targetListContent, 'Target');
    for (const tag of selfClosingTargets) {
      if (tag.endsWith('/>')) {
        const attrs = parseAttributes(tag);
        if (Object.keys(attrs).length > 0) {
          targets.push(parseTargetFromAttrs(attrs));
        }
      }
    }
  }

  return {
    recordType: 'Detail',
    call: {
      state: safeInt(callFields[1]),   // CallID at [1]
      flags: 0,
      calledType: 0,
      callId: safeStr(callFields[1]),
      targetGroup: safeStr(callFields[9]),
      origGroup: safeStr(callFields[7]),
      origUser: safeStr(callFields[8]),
      stamp: safeInt(callFields[14]),
      connStamp: 0,
      ringStamp: 0,
      connDur: 0,
      ringDur: 0,
      locale: 0,
      tag: safeStr(callFields[4]),
      accCode: safeStr(callFields[2]),
      parkSlot: 0,
      callWait: 0,
      xfer: safeInt(callFields[5]),
    },
    partyA: parsePartyFromCsvFields(partyAFields),
    partyB: partyBFields ? parsePartyFromCsvFields(partyBFields) : null,
    targets,
  };
}

/**
 * Parse a Party from attribute map.
 */
function parsePartyFromAttrs(attrs: Record<string, string>): Delta3Party {
  return {
    state: safeInt(attrs['State']),
    connected: safeInt(attrs['Connected']),
    music: safeInt(attrs['Music']),
    name: safeStr(attrs['Name']),
    slot: safeStr(attrs['Slot']),
    dir: safeStr(attrs['Dir']),
    eqType: safeInt(attrs['EqType']),
    calledPN: safeStr(attrs['CalledPN']),
    calledPT: safeInt(attrs['CalledPT']),
    callingPN: safeStr(attrs['CallingPN']),
    callingPT: safeInt(attrs['CallingPT']),
    dialPN: safeStr(attrs['DialPN']),
    dialPT: safeInt(attrs['DialPT']),
    keyPN: safeStr(attrs['KeyPN']),
    keyPT: safeInt(attrs['KeyPT']),
    ringCount: safeInt(attrs['RingCount']),
    cause: safeInt(attrs['Cause']),
    vmDisallow: safeInt(attrs['VMDisallow']),
    sendComplete: safeInt(attrs['SendComplete']),
    callType: safeInt(attrs['CallType']),
    transType: safeInt(attrs['TransType']),
    ucid: safeStr(attrs['UCID']),
    scnCallId: safeStr(attrs['SCNCallID']),
  };
}

/**
 * Parse a Party from CSV fields (reference doc format).
 * Field order from devlink3-reference.md Section 6.7.3.
 */
function parsePartyFromCsvFields(fields: string[]): Delta3Party {
  return {
    state: safeInt(fields[2]),       // Field 3: State
    connected: safeInt(fields[3]),   // Field 4: Audiopath
    music: safeInt(fields[4]),       // Field 5: Tone
    name: safeStr(fields[12]),       // Field 13: Identity (extension number)
    slot: safeStr(fields[11]),       // Field 12: Description
    dir: fields[1] === '1' ? 'I' : 'O', // Field 2: Direction (1=inbound)
    eqType: safeInt(fields[9]),      // Field 10: Equipment classification
    calledPN: safeStr(fields[15]),   // Field 16: DID
    calledPT: safeInt(fields[13]),   // Field 14: Called Type
    callingPN: safeStr(fields[21]),  // Field 22: CLI
    callingPT: safeInt(fields[22]),  // Field 23: CLI Presentation
    dialPN: safeStr(fields[16]),     // Field 17: Dialled
    dialPT: 0,
    keyPN: '',
    keyPT: 0,
    ringCount: 0,
    cause: safeInt(fields[14]),      // Field 15: Called Reason
    vmDisallow: 0,
    sendComplete: 0,
    callType: 0,
    transType: 0,
    ucid: '',
    scnCallId: '',
  };
}

/**
 * Parse a Target from attribute map.
 */
function parseTargetFromAttrs(attrs: Record<string, string>): Delta3Target {
  return {
    name: safeStr(attrs['Name']),
    state: safeInt(attrs['State']),
    eqType: safeInt(attrs['EqType']),
    ucid: safeStr(attrs['UCID']),
    scnCallId: safeStr(attrs['SCNCallID']),
    dir: safeStr(attrs['Dir']),
    calledPN: safeStr(attrs['CalledPN']),
    calledPT: safeInt(attrs['CalledPT']),
    callingPN: safeStr(attrs['CallingPN']),
    callingPT: safeInt(attrs['CallingPT']),
    dialPN: safeStr(attrs['DialPN']),
    dialPT: safeInt(attrs['DialPT']),
    keyPN: safeStr(attrs['KeyPN']),
    keyPT: safeInt(attrs['KeyPT']),
    ringCount: safeInt(attrs['RingCount']),
    cause: safeInt(attrs['Cause']),
    vmDisallow: safeInt(attrs['VMDisallow']),
    sendComplete: safeInt(attrs['SendComplete']),
    callType: safeInt(attrs['CallType']),
    transType: safeInt(attrs['TransType']),
  };
}

/**
 * Parse a Target from CSV fields (reference doc format).
 * Field order from devlink3-reference.md Section 6.7.4.
 */
function parseTargetFromCsvFields(fields: string[]): Delta3Target {
  return {
    name: safeStr(fields[5]),        // Identity
    state: 0,
    eqType: safeInt(fields[3]),      // Equipment classification
    ucid: '',
    scnCallId: '',
    dir: '',
    calledPN: safeStr(fields[8]),    // Target number
    calledPT: safeInt(fields[6]),    // Called Type
    callingPN: safeStr(fields[11]),  // CLI
    callingPT: safeInt(fields[12]),  // CLI Presentation
    dialPN: '',
    dialPT: 0,
    keyPN: '',
    keyPT: 0,
    ringCount: 0,
    cause: 0,
    vmDisallow: 0,
    sendComplete: 0,
    callType: 0,
    transType: 0,
  };
}

// ─── CallLost / LinkLost / AttemptReject Parsers ─────────────────────────────

/**
 * Parse a CallLost record.
 * Can be either attribute-based XML or CSV content inside tags.
 */
function parseCallLost(xml: string): Delta3CallLostRecord {
  // Try attribute-based first
  const tag = extractTag(xml, 'CallLost');
  const attrs = tag ? parseAttributes(tag) : {};

  if (attrs['CallID']) {
    return {
      recordType: 'CallLost',
      callId: safeStr(attrs['CallID']),
      partyName: safeStr(attrs['PartyName']),
      cause: safeInt(attrs['Cause']),
      stamp: safeInt(attrs['Stamp']),
    };
  }

  // CSV-based format: nodeId,endId,clearedInbound,cause[,timestamp]
  const content = extractTagContent(xml, 'CallLost');
  const fields = content ? parseCsvFields(content) : [];

  return {
    recordType: 'CallLost',
    callId: safeStr(fields[1]),      // End identifier
    partyName: safeStr(fields[0]),   // Node identifier
    cause: safeInt(fields[3]),       // Cause code
    stamp: safeInt(fields[4]),       // Timestamp
  };
}

/**
 * Parse a LinkLost record.
 */
function parseLinkLost(xml: string): Delta3LinkLostRecord {
  const tag = extractTag(xml, 'LinkLost');
  const attrs = tag ? parseAttributes(tag) : {};

  if (attrs['NodeID']) {
    return {
      recordType: 'LinkLost',
      nodeId: safeStr(attrs['NodeID']),
      stamp: safeInt(attrs['Stamp']),
    };
  }

  // CSV-based format: nodeId,endId,clearedInbound,cause,timestamp[,linkLocalRef]
  const content = extractTagContent(xml, 'LinkLost');
  const fields = content ? parseCsvFields(content) : [];

  return {
    recordType: 'LinkLost',
    nodeId: safeStr(fields[0]),
    stamp: safeInt(fields[4]),
  };
}

/**
 * Parse an AttemptReject record.
 */
function parseAttemptReject(xml: string): Delta3AttemptRejectRecord {
  const tag = extractTag(xml, 'AttemptReject');
  const attrs = tag ? parseAttributes(tag) : {};

  if (attrs['CallID']) {
    return {
      recordType: 'AttemptReject',
      callId: safeStr(attrs['CallID']),
      partyName: safeStr(attrs['PartyName']),
      cause: safeInt(attrs['Cause']),
      stamp: safeInt(attrs['Stamp']),
    };
  }

  // CSV-based: nodeId,endId,user,qualifier,timestamp
  const content = extractTagContent(xml, 'AttemptReject');
  const fields = content ? parseCsvFields(content) : [];

  return {
    recordType: 'AttemptReject',
    callId: safeStr(fields[1]),      // End identifier
    partyName: safeStr(fields[2]),   // User
    cause: 0,
    stamp: safeInt(fields[4]),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a Delta3 XML event string into a typed record.
 *
 * Handles four record types:
 *   - Detail:        Full call state snapshot (most common)
 *   - CallLost:      Party disconnected
 *   - LinkLost:      Intermediate node disconnect
 *   - AttemptReject:  Call manually rejected
 *
 * Supports both attribute-based XML (from Protocol Spec examples) and
 * CSV-based content (from reference doc examples).
 *
 * @param xmlString - The raw Delta3 XML event string
 * @returns Parsed Delta3Record, or null if the XML could not be parsed
 */
export function parseDelta3Event(xmlString: string): Delta3Record | null {
  const trimmed = xmlString.trim();

  if (trimmed.includes('<Detail')) {
    // Determine if this is attribute-based or CSV-based
    // Attribute-based has attributes on <Call> like State="2"
    // CSV-based has content between <Call> and </Call>
    const hasCallAttrs = /<Call\s+\w+\s*=/.test(trimmed);
    if (hasCallAttrs) {
      return parseDetailFromAttributes(trimmed);
    }
    return parseDetailFromCsv(trimmed);
  }

  if (trimmed.includes('<CallLost')) {
    return parseCallLost(trimmed);
  }

  if (trimmed.includes('<LinkLost')) {
    return parseLinkLost(trimmed);
  }

  if (trimmed.includes('<AttemptReject')) {
    return parseAttemptReject(trimmed);
  }

  console.warn(`[DevLink3:Parser] Unknown Delta3 record type in: ${trimmed.substring(0, 100)}`);
  return null;
}

/**
 * Map a DevLink3 numeric call state to the application-level CallState string.
 *
 * @param numericState - The numeric call state from the wire protocol (0-13)
 * @returns The application-level CallState string
 */
export function mapCallState(numericState: number): CallState {
  return DevLink3CallStateMap[numericState] ?? 'idle';
}

/**
 * Map a numeric equipment type to a human-readable string.
 *
 * @param eqType - Equipment type numeric value
 * @returns Human-readable equipment type name
 */
export function mapEquipmentType(eqType: number): string {
  const map: Record<number, string> = {
    [EquipmentType.ISDNTrunk]: 'ISDN Trunk',
    [EquipmentType.SIPTrunk]: 'SIP Trunk',
    [EquipmentType.TDMPhone]: 'TDM Phone',
    [EquipmentType.H323Phone]: 'H.323 Phone',
    [EquipmentType.SIPDevice]: 'SIP Device',
    [EquipmentType.Voicemail]: 'Voicemail',
    [EquipmentType.ConferenceChannel]: 'Conference',
    [EquipmentType.HuntGroup]: 'Hunt Group',
    [EquipmentType.WebRTCPhone]: 'WebRTC Phone',
  };
  return map[eqType] ?? `Unknown (${eqType})`;
}

/**
 * Map a numeric called type to a human-readable string.
 *
 * @param calledType - Called type numeric value
 * @returns Human-readable called type name
 */
export function mapCalledType(calledType: number): string {
  const map: Record<number, string> = {
    [CalledType.Internal]: 'Internal',
    [CalledType.Voicemail]: 'Voicemail',
    [CalledType.ACD]: 'ACD/Hunt Group',
    [CalledType.Direct]: 'Direct',
    [CalledType.Emergency]: 'Emergency',
  };
  return map[calledType] ?? `Unknown (${calledType})`;
}

/**
 * Map a numeric cause code to a human-readable string.
 *
 * @param cause - Cause code numeric value
 * @returns Human-readable cause name
 */
export function mapCauseCode(cause: number): string {
  const map: Record<number, string> = {
    [CauseCode.Unknown]: 'Unknown',
    [CauseCode.UnallocatedNumber]: 'Unallocated Number',
    [CauseCode.ForceIdle]: 'Force Idle',
    [CauseCode.Unregister]: 'Unregister',
    [CauseCode.Normal]: 'Normal',
    [CauseCode.Busy]: 'Busy',
    [CauseCode.NoUserResponding]: 'No User Responding',
    [CauseCode.CallRejected]: 'Call Rejected',
    [CauseCode.NormalUnspecified]: 'Normal Unspecified',
    [CauseCode.NoChannel]: 'No Channel',
    [CauseCode.NetworkOutOfOrder]: 'Network Out Of Order',
    [CauseCode.Incompatible]: 'Incompatible',
  };
  return map[cause] ?? `Unknown (${cause})`;
}
