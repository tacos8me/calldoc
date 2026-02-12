// ─── SMDR CSV Record Parser ──────────────────────────────────────────────────
// Parses Avaya IP Office SMDR (Station Message Detail Recording) CSV lines
// into typed SmdrRecord objects. Handles all 35 fields (30 base + 5 R11).
// Source: Avaya_SMDR_Format_Spec.md Sections 3-8.

import type { SmdrRecord, SmdrDirection } from '@/types/smdr';

/**
 * Parse a CSV field, handling quotes and escaped commas.
 * SMDR fields are generally NOT quoted per the spec, but we handle
 * quoted fields defensively.
 *
 * @param fields - Raw string fields from CSV split
 * @param index  - Field index (0-based)
 * @returns Trimmed string value, empty string if missing
 */
function getField(fields: string[], index: number): string {
  if (index >= fields.length) return '';
  return (fields[index] ?? '').trim();
}

/**
 * Parse an integer field, returning 0 for empty/invalid values.
 */
function parseInt10(value: string): number {
  if (!value || value === '') return 0;
  const n = parseInt(value, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse a float field, returning 0 for empty/invalid values.
 */
function parseFloat10(value: string): number {
  if (!value || value === '') return 0;
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse a duration string in HH:MM:SS format to total seconds.
 *
 * @param duration - Duration string like "00:03:45"
 * @returns Total seconds (225 for the example)
 */
export function parseDuration(duration: string): number {
  if (!duration || duration === '') return 0;

  const parts = duration.split(':');
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseInt(parts[2], 10) || 0;

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parse an SMDR date/time string (YYYY/MM/DD HH:MM:SS) to an ISO 8601 string.
 *
 * @param dateStr - Date string like "2024/02/10 14:30:00"
 * @returns ISO 8601 string like "2024-02-10T14:30:00.000Z", or empty string if invalid
 */
export function parseSmdrDateTime(dateStr: string): string {
  if (!dateStr || dateStr === '') return '';

  // YYYY/MM/DD HH:MM:SS -> YYYY-MM-DDTHH:MM:SS
  const isoStr = dateStr.replace(/\//g, '-').replace(' ', 'T');

  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString();
  } catch {
    return '';
  }
}

/**
 * Split a CSV line into fields, respecting quoted fields and handling
 * escaped commas. Also handles the edge case of leading NUL bytes
 * that some IP Office implementations produce.
 *
 * @param line - Raw CSV line from the SMDR TCP stream
 * @returns Array of string field values
 */
export function splitCsvLine(line: string): string[] {
  // Strip leading NUL bytes (per spec Section 8 note 7)
  let cleaned = line.replace(/^\0+/, '');

  // Strip trailing newline/carriage return
  cleaned = cleaned.replace(/[\r\n]+$/, '');

  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < cleaned.length) {
    const ch = cleaned[i];

    if (ch === '"') {
      // Check for escaped quote (double quote)
      if (inQuotes && i + 1 < cleaned.length && cleaned[i + 1] === '"') {
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  // Push the last field
  fields.push(current);

  return fields;
}

/**
 * Parse a single SMDR CSV line into a typed SmdrRecord.
 *
 * Handles all 35 fields (30 base + 5 R11 additions):
 *   Fields 1-30:  Base SMDR fields
 *   Fields 31-35: R11 additions (optional, may not be present in older systems)
 *
 * The TCP stream does NOT include a header row -- fields are mapped by position.
 *
 * @param csvLine - A single CSV line from the SMDR TCP stream
 * @returns Parsed SmdrRecord, or null if the line is empty or invalid
 *
 * @example
 * ```ts
 * const record = parseSmdrRecord(
 *   '2024/02/10 14:30:00,00:03:45,7,201,O,555-1234,555-1234,,0,1000014160,0,E201,John Smith,T9001,LINE 1.1,11,0,0,n/a,,0.00,,,0,,0,,,,,'
 * );
 * ```
 */
export function parseSmdrRecord(csvLine: string): SmdrRecord | null {
  if (!csvLine || csvLine.trim() === '') return null;

  const fields = splitCsvLine(csvLine);

  // Need at least 30 fields for a valid base record
  if (fields.length < 10) {
    console.warn(`[SMDR:Parser] Too few fields (${fields.length}) in: ${csvLine.substring(0, 80)}`);
    return null;
  }

  const direction = getField(fields, 4) as SmdrDirection;
  if (direction !== 'I' && direction !== 'O') {
    // May be a header line or garbage -- skip
    return null;
  }

  const record: SmdrRecord = {
    // Base fields (1-30, 0-indexed as 0-29)
    callStart: parseSmdrDateTime(getField(fields, 0)),
    connectedTime: getField(fields, 1),
    ringTime: parseInt10(getField(fields, 2)),
    caller: getField(fields, 3),
    direction,
    calledNumber: getField(fields, 5),
    dialledNumber: getField(fields, 6),
    account: getField(fields, 7),
    isInternal: parseInt10(getField(fields, 8)),
    callId: parseInt10(getField(fields, 9)),
    continuation: parseInt10(getField(fields, 10)),
    party1Device: getField(fields, 11),
    party1Name: getField(fields, 12),
    party2Device: getField(fields, 13),
    party2Name: getField(fields, 14),
    holdTime: parseInt10(getField(fields, 15)),
    parkTime: parseInt10(getField(fields, 16)),
    authValid: parseInt10(getField(fields, 17)),
    authCode: getField(fields, 18) || 'n/a',
    userCharged: getField(fields, 19),
    callCharge: parseFloat10(getField(fields, 20)),
    currency: getField(fields, 21),
    amountAtLastUserChange: parseFloat10(getField(fields, 22)),
    callUnits: getField(fields, 23),
    unitsAtLastUserChange: getField(fields, 24),
    costPerUnit: parseFloat10(getField(fields, 25)),
    markUp: getField(fields, 26),
    externalTargetingCause: getField(fields, 27),
    externalTargeterId: getField(fields, 28),
    externalTargetedNumber: getField(fields, 29),

    // R11 fields (31-35, 0-indexed as 30-34) -- may be absent
    callingPartyServerIp: getField(fields, 30),
    uniqueCallIdCaller: getField(fields, 31),
    calledPartyServerIp: getField(fields, 32),
    uniqueCallIdCalled: getField(fields, 33),
    smdrRecordTime: parseSmdrDateTime(getField(fields, 34)),
  };

  return record;
}

/**
 * Parse the connected time duration from an SmdrRecord to seconds.
 *
 * @param record - A parsed SmdrRecord
 * @returns Connected time in seconds
 */
export function getConnectedTimeSeconds(record: SmdrRecord): number {
  return parseDuration(record.connectedTime);
}

/**
 * Calculate the total call duration from an SmdrRecord.
 * Total = connected time + ring time + hold time + park time
 *
 * @param record - A parsed SmdrRecord
 * @returns Total duration in seconds
 */
export function getTotalDuration(record: SmdrRecord): number {
  return parseDuration(record.connectedTime) + record.ringTime + record.holdTime + record.parkTime;
}

/**
 * Extract the device type prefix from a party device field.
 *
 * @param device - Device string like "E4324", "T9001", "V9501"
 * @returns Object with prefix ('E'|'T'|'V') and number, or null if invalid
 */
export function parseDeviceField(device: string): { prefix: string; number: string } | null {
  if (!device || device.length < 2) return null;

  const prefix = device[0].toUpperCase();
  if (prefix !== 'E' && prefix !== 'T' && prefix !== 'V') return null;

  return {
    prefix,
    number: device.substring(1),
  };
}

/**
 * Determine if an SMDR record represents a continuation (multi-party call).
 *
 * @param record - A parsed SmdrRecord
 * @returns true if there are more records for this call
 */
export function isContinuation(record: SmdrRecord): boolean {
  return record.continuation === 1;
}
