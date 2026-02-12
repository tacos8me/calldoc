// ─── SMDR CSV Parser Tests ───────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  parseSmdrRecord,
  parseDuration,
  parseSmdrDateTime,
  splitCsvLine,
  getConnectedTimeSeconds,
  getTotalDuration,
  parseDeviceField,
  isContinuation,
} from '../parser';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Complete 35-field SMDR record (base 30 + R11 5) */
// Fields: callStart,connectedTime,ringTime,caller,direction,calledNumber,dialledNumber,
//   account,isInternal,callId,continuation,party1Device,party1Name,party2Device,party2Name,
//   holdTime,parkTime,authValid,authCode,userCharged,callCharge,currency,amountAtLastUserChange,
//   callUnits,unitsAtLastUserChange,costPerUnit,markUp,externalTargetingCause,externalTargeterId,
//   externalTargetedNumber,callingPartyServerIp,uniqueCallIdCaller,calledPartyServerIp,
//   uniqueCallIdCalled,smdrRecordTime
const COMPLETE_RECORD =
  '2024/02/10 14:30:00,00:03:45,7,201,O,+442075551234,+442075551234,ACCT001,0,1000014160,0,E201,John Smith,T9001,LINE 1.1,11,3,0,n/a,,0.00,GBP,0.00,,0,0.00,,HG:fb,Sales,+442075551234,192.168.1.10,ucid-caller-001,192.168.1.20,ucid-called-001,2024/02/10 14:33:52';

/** Inbound call record */
const INBOUND_RECORD =
  '2024/02/10 15:00:00,00:05:30,3,+441234567890,I,201,201,ACCT002,0,1000014161,0,T9001,LINE 1.1,E201,John Smith,0,0,0,n/a,,0.00,,,0,,0,,,,,,,,,,';

/** Internal call record */
const INTERNAL_RECORD =
  '2024/02/10 16:00:00,00:01:15,2,201,O,202,202,,1,1000014162,0,E201,John Smith,E202,Jane Doe,0,0,0,n/a,,0.00,,,0,,0,,,,,,,,,,';

/** Continuation record (multi-party call) */
const CONTINUATION_RECORD =
  '2024/02/10 14:30:00,00:03:45,7,201,O,+442075551234,+442075551234,,0,1000014160,1,E201,John Smith,T9001,LINE 1.1,0,0,0,n/a,,0.00,,,0,,0,,,,,,,,,,';

/** Minimal record with just enough fields */
const MINIMAL_RECORD =
  '2024/02/10 12:00:00,00:00:30,0,100,I,200,200,,0,1000000001,0,T9001,Trunk 1,E200,Agent,0,0,0,n/a,,0.00,,,0,,0,,,,';

// ---------------------------------------------------------------------------
// Test: Complete Record Parsing
// ---------------------------------------------------------------------------

describe('parseSmdrRecord', () => {
  it('should parse all 35 fields from a complete SMDR record', () => {
    const record = parseSmdrRecord(COMPLETE_RECORD);
    expect(record).not.toBeNull();

    // Base fields (1-30)
    // callStart is converted to ISO via toISOString() which outputs UTC
    expect(record!.callStart).toBeTruthy();
    expect(new Date(record!.callStart).getTime()).not.toBeNaN();
    expect(record!.connectedTime).toBe('00:03:45');
    expect(record!.ringTime).toBe(7);
    expect(record!.caller).toBe('201');
    expect(record!.direction).toBe('O');
    expect(record!.calledNumber).toBe('+442075551234');
    expect(record!.dialledNumber).toBe('+442075551234');
    expect(record!.account).toBe('ACCT001');
    expect(record!.isInternal).toBe(0);
    expect(record!.callId).toBe(1000014160);
    expect(record!.continuation).toBe(0);
    expect(record!.party1Device).toBe('E201');
    expect(record!.party1Name).toBe('John Smith');
    expect(record!.party2Device).toBe('T9001');
    expect(record!.party2Name).toBe('LINE 1.1');
    expect(record!.holdTime).toBe(11);
    expect(record!.parkTime).toBe(3);
    expect(record!.authValid).toBe(0);
    expect(record!.authCode).toBe('n/a');
    expect(record!.callCharge).toBe(0);
    expect(record!.currency).toBe('GBP');
    expect(record!.externalTargetingCause).toBe('HG:fb');
    expect(record!.externalTargeterId).toBe('Sales');
    expect(record!.externalTargetedNumber).toBe('+442075551234');

    // R11 fields (31-35)
    expect(record!.callingPartyServerIp).toBe('192.168.1.10');
    expect(record!.uniqueCallIdCaller).toBe('ucid-caller-001');
    expect(record!.calledPartyServerIp).toBe('192.168.1.20');
    expect(record!.uniqueCallIdCalled).toBe('ucid-called-001');
    expect(record!.smdrRecordTime).toBeTruthy();
    expect(new Date(record!.smdrRecordTime).getTime()).not.toBeNaN();
  });

  it('should parse an inbound call record', () => {
    const record = parseSmdrRecord(INBOUND_RECORD);
    expect(record).not.toBeNull();
    expect(record!.direction).toBe('I');
    expect(record!.caller).toBe('+441234567890');
    expect(record!.calledNumber).toBe('201');
    expect(record!.callId).toBe(1000014161);
  });

  it('should parse an internal call record', () => {
    const record = parseSmdrRecord(INTERNAL_RECORD);
    expect(record).not.toBeNull();
    expect(record!.isInternal).toBe(1);
    expect(record!.caller).toBe('201');
    expect(record!.calledNumber).toBe('202');
    expect(record!.party1Name).toBe('John Smith');
    expect(record!.party2Name).toBe('Jane Doe');
  });

  it('should detect continuation records', () => {
    const record = parseSmdrRecord(CONTINUATION_RECORD);
    expect(record).not.toBeNull();
    expect(record!.continuation).toBe(1);
    expect(isContinuation(record!)).toBe(true);
  });

  it('should not mark non-continuation records', () => {
    const record = parseSmdrRecord(COMPLETE_RECORD);
    expect(record).not.toBeNull();
    expect(isContinuation(record!)).toBe(false);
  });

  it('should parse minimal records', () => {
    const record = parseSmdrRecord(MINIMAL_RECORD);
    expect(record).not.toBeNull();
    expect(record!.direction).toBe('I');
    expect(record!.callId).toBe(1000000001);
  });

  it('should handle records with missing R11 fields', () => {
    // Record with only 30 fields (no R11 extension)
    const baseOnly =
      '2024/02/10 12:00:00,00:00:30,0,100,I,200,200,,0,1000000001,0,T9001,Trunk 1,E200,Agent,0,0,0,n/a,,0.00,,,0,,0,,,,';
    const record = parseSmdrRecord(baseOnly);
    expect(record).not.toBeNull();
    expect(record!.callingPartyServerIp).toBe('');
    expect(record!.uniqueCallIdCaller).toBe('');
    expect(record!.calledPartyServerIp).toBe('');
    expect(record!.uniqueCallIdCalled).toBe('');
    expect(record!.smdrRecordTime).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Test: Duration Parsing
// ---------------------------------------------------------------------------

describe('parseDuration', () => {
  it('should parse H:MM:SS format correctly', () => {
    expect(parseDuration('00:03:45')).toBe(225);
  });

  it('should parse zero duration', () => {
    expect(parseDuration('00:00:00')).toBe(0);
  });

  it('should parse hours correctly', () => {
    expect(parseDuration('01:00:00')).toBe(3600);
    expect(parseDuration('02:30:15')).toBe(9015);
  });

  it('should parse single-digit minutes and seconds', () => {
    expect(parseDuration('00:01:01')).toBe(61);
  });

  it('should handle large durations', () => {
    expect(parseDuration('23:59:59')).toBe(86399);
  });

  it('should return 0 for empty string', () => {
    expect(parseDuration('')).toBe(0);
  });

  it('should return 0 for invalid format', () => {
    expect(parseDuration('abc')).toBe(0);
    expect(parseDuration('12:34')).toBe(0);  // Missing seconds
    expect(parseDuration('12')).toBe(0);
  });

  it('should return 0 for null-like input', () => {
    expect(parseDuration(undefined as unknown as string)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test: DateTime Parsing
// ---------------------------------------------------------------------------

describe('parseSmdrDateTime', () => {
  it('should parse YYYY/MM/DD HH:MM:SS to ISO 8601', () => {
    const result = parseSmdrDateTime('2024/02/10 14:30:00');
    // toISOString() converts to UTC, so the output depends on local timezone.
    // The important thing is it returns a valid ISO string.
    expect(result).toBeTruthy();
    expect(new Date(result).getTime()).not.toBeNaN();
  });

  it('should return empty string for empty input', () => {
    expect(parseSmdrDateTime('')).toBe('');
  });

  it('should return empty string for invalid date', () => {
    expect(parseSmdrDateTime('not-a-date')).toBe('');
    expect(parseSmdrDateTime('9999/99/99 99:99:99')).toBe('');
  });

  it('should return empty string for null-like input', () => {
    expect(parseSmdrDateTime(undefined as unknown as string)).toBe('');
  });

  it('should parse midnight correctly', () => {
    const result = parseSmdrDateTime('2024/01/01 00:00:00');
    expect(result).toBeTruthy();
    const date = new Date(result);
    expect(date.getTime()).not.toBeNaN();
    // Verify the date portion is correct (accounting for UTC conversion)
    expect(date.getFullYear()).toBe(2024);
  });

  it('should parse end of day', () => {
    const result = parseSmdrDateTime('2024/12/31 23:59:59');
    expect(result).toBeTruthy();
    const date = new Date(result);
    expect(date.getTime()).not.toBeNaN();
    // The year should be 2024 or 2025 (depending on timezone offset)
    expect(date.getFullYear()).toBeGreaterThanOrEqual(2024);
  });

  it('should produce consistent results for the same input', () => {
    const result1 = parseSmdrDateTime('2024/06/15 12:00:00');
    const result2 = parseSmdrDateTime('2024/06/15 12:00:00');
    expect(result1).toBe(result2);
  });
});

// ---------------------------------------------------------------------------
// Test: CSV Line Splitting
// ---------------------------------------------------------------------------

describe('splitCsvLine', () => {
  it('should split simple comma-separated values', () => {
    const fields = splitCsvLine('a,b,c,d');
    expect(fields).toEqual(['a', 'b', 'c', 'd']);
  });

  it('should handle quoted fields with commas', () => {
    const fields = splitCsvLine('a,"b,c",d');
    expect(fields).toEqual(['a', 'b,c', 'd']);
  });

  it('should handle escaped quotes (double quote)', () => {
    const fields = splitCsvLine('a,"say ""hello""",c');
    expect(fields).toEqual(['a', 'say "hello"', 'c']);
  });

  it('should strip leading NUL bytes', () => {
    const fields = splitCsvLine('\0\0value1,value2');
    expect(fields[0]).toBe('value1');
  });

  it('should strip trailing newlines', () => {
    const fields = splitCsvLine('a,b,c\r\n');
    expect(fields[fields.length - 1]).toBe('c');
  });

  it('should handle empty fields', () => {
    const fields = splitCsvLine('a,,c,,e');
    expect(fields).toEqual(['a', '', 'c', '', 'e']);
  });

  it('should handle a single field', () => {
    const fields = splitCsvLine('only');
    expect(fields).toEqual(['only']);
  });

  it('should handle all-empty fields', () => {
    const fields = splitCsvLine(',,,');
    expect(fields).toEqual(['', '', '', '']);
  });
});

// ---------------------------------------------------------------------------
// Test: Malformed Records
// ---------------------------------------------------------------------------

describe('parseSmdrRecord - malformed input', () => {
  it('should return null for empty string', () => {
    expect(parseSmdrRecord('')).toBeNull();
  });

  it('should return null for whitespace-only input', () => {
    expect(parseSmdrRecord('   \n\t  ')).toBeNull();
  });

  it('should return null for too few fields', () => {
    expect(parseSmdrRecord('a,b,c')).toBeNull();
  });

  it('should return null for invalid direction field', () => {
    // Direction is neither I nor O -- could be a header line
    expect(parseSmdrRecord('2024/01/01 00:00:00,00:00:00,0,100,X,200,200,,0,1,0')).toBeNull();
  });

  it('should handle missing numeric fields gracefully', () => {
    const csv = '2024/02/10 12:00:00,,abc,100,I,200,200,,notnum,notnum,0,E100,Agent,T9001,Trunk,,,,n/a,,,,,,,,,,,,,,,,';
    const record = parseSmdrRecord(csv);
    expect(record).not.toBeNull();
    expect(record!.ringTime).toBe(0); // 'abc' -> 0
    expect(record!.isInternal).toBe(0); // 'notnum' -> 0
    expect(record!.callId).toBe(0); // 'notnum' -> 0
    expect(record!.holdTime).toBe(0);
  });

  it('should handle special characters in party names', () => {
    const csv =
      '2024/02/10 12:00:00,00:00:30,0,100,I,200,200,,0,1000000001,0,E100,"O\'Brien, James",T9001,LINE 1.1,0,0,0,n/a,,0.00,,,0,,0,,,,';
    const record = parseSmdrRecord(csv);
    expect(record).not.toBeNull();
    expect(record!.party1Name).toBe("O'Brien, James");
  });
});

// ---------------------------------------------------------------------------
// Test: Derived Calculations
// ---------------------------------------------------------------------------

describe('getConnectedTimeSeconds', () => {
  it('should return connected time in seconds', () => {
    const record = parseSmdrRecord(COMPLETE_RECORD);
    expect(record).not.toBeNull();
    expect(getConnectedTimeSeconds(record!)).toBe(225); // 00:03:45
  });
});

describe('getTotalDuration', () => {
  it('should sum connected + ring + hold + park times', () => {
    const record = parseSmdrRecord(COMPLETE_RECORD);
    expect(record).not.toBeNull();
    // connectedTime=225 + ringTime=7 + holdTime=11 + parkTime=3 = 246
    expect(getTotalDuration(record!)).toBe(246);
  });
});

// ---------------------------------------------------------------------------
// Test: Device Field Parsing
// ---------------------------------------------------------------------------

describe('parseDeviceField', () => {
  it('should parse extension devices', () => {
    const result = parseDeviceField('E201');
    expect(result).toEqual({ prefix: 'E', number: '201' });
  });

  it('should parse trunk devices', () => {
    const result = parseDeviceField('T9001');
    expect(result).toEqual({ prefix: 'T', number: '9001' });
  });

  it('should parse voicemail/conference devices', () => {
    const result = parseDeviceField('V9501');
    expect(result).toEqual({ prefix: 'V', number: '9501' });
  });

  it('should return null for empty input', () => {
    expect(parseDeviceField('')).toBeNull();
  });

  it('should return null for single character', () => {
    expect(parseDeviceField('E')).toBeNull();
  });

  it('should return null for unknown prefix', () => {
    expect(parseDeviceField('X123')).toBeNull();
  });

  it('should handle lowercase prefix', () => {
    const result = parseDeviceField('e201');
    expect(result).toEqual({ prefix: 'E', number: '201' });
  });
});
