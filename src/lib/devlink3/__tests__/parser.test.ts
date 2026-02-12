// ─── DevLink3 Delta3 XML Parser Tests ────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  parseDelta3Event,
  mapCallState,
  mapEquipmentType,
  mapCalledType,
  mapCauseCode,
} from '../parser';
import { DevLink3CallState, EquipmentType, CalledType, CauseCode } from '@/types/devlink3';

// ---------------------------------------------------------------------------
// Fixtures: Attribute-based XML (Protocol Spec format)
// ---------------------------------------------------------------------------

const DETAIL_ATTR_XML = `
<Detail>
  <Call State="2" Flags="4" CalledType="103" CallID="12345" TargetGroup="Sales"
    OrigGroup="Support" OrigUser="Admin" Stamp="1707573600" ConnStamp="1707573610"
    RingStamp="1707573605" ConnDur="45" RingDur="5" Locale="0" Tag="vip"
    AccCode="ACCT001" ParkSlot="0" CallWait="0" Xfer="1" />
  <PartyA State="2" Connected="1" Music="0" Name="201" Slot="" Dir="I"
    EqType="10" CalledPN="201" CalledPT="101" CallingPN="+442075551234"
    CallingPT="0" DialPN="201" DialPT="0" KeyPN="" KeyPT="0"
    RingCount="2" Cause="16" VMDisallow="0" SendComplete="1"
    CallType="0" TransType="0" UCID="ucid-001" SCNCallID="" />
  <PartyB State="2" Connected="1" Music="0" Name="T9001" Slot="LINE1.1" Dir="O"
    EqType="5" CalledPN="+442075551234" CalledPT="0" CallingPN="201"
    CallingPT="101" DialPN="+442075551234" DialPT="0" KeyPN="" KeyPT="0"
    RingCount="0" Cause="0" VMDisallow="0" SendComplete="0"
    CallType="0" TransType="0" UCID="" SCNCallID="" />
  <Target Name="Sales" State="1" EqType="15" UCID="" SCNCallID=""
    Dir="" CalledPN="201" CalledPT="103" CallingPN="+442075551234"
    CallingPT="0" DialPN="" DialPT="0" KeyPN="" KeyPT="0"
    RingCount="3" Cause="0" VMDisallow="0" SendComplete="0"
    CallType="0" TransType="0" />
</Detail>
`;

const CALLLOST_ATTR_XML = `<CallLost CallID="12345" PartyName="201" Cause="16" Stamp="1707573700" />`;

const LINKLOST_ATTR_XML = `<LinkLost NodeID="node-1" Stamp="1707573800" />`;

const ATTEMPTREJECT_ATTR_XML = `<AttemptReject CallID="12345" PartyName="202" Cause="21" Stamp="1707573650" />`;

// ---------------------------------------------------------------------------
// Fixtures: CSV-based XML (Reference Doc format)
// ---------------------------------------------------------------------------

const DETAIL_CSV_XML = `
<Detail>
  <Call>0,12346,ACCT002,0,tag2,2,0,Support,Admin,Sales,0,0,0,0,1707573600</Call>
  <PartyA>0,1,2,1,0,0,0,0,0,10,0,EXT201,201,101,16,201,+442075551234,0,0,0,0,+442075551234,0,0,0,0</PartyA>
  <PartyB>0,0,2,1,0,0,0,0,0,5,0,LINE1.1,T9001,0,0,+442075551234,201,0,0,0,0,201,101,0,0,0</PartyB>
  <Target_list>
    <Target>0,0,0,15,0,Sales,103,0,201,0,0,+442075551234,0,0,0,0,0,0,0,0</Target>
  </Target_list>
</Detail>
`;

const CALLLOST_CSV_XML = `<CallLost>node1,12347,0,16,1707573700</CallLost>`;

const LINKLOST_CSV_XML = `<LinkLost>node-2,0,0,0,1707573800</LinkLost>`;

const ATTEMPTREJECT_CSV_XML = `<AttemptReject>node1,12348,202,0,1707573650</AttemptReject>`;

// ---------------------------------------------------------------------------
// Test: Detail Record Parsing (Attribute-based)
// ---------------------------------------------------------------------------

describe('parseDelta3Event - Detail (attribute-based)', () => {
  it('should parse a complete Detail record with all call fields', () => {
    const result = parseDelta3Event(DETAIL_ATTR_XML);
    expect(result).not.toBeNull();
    expect(result!.recordType).toBe('Detail');

    if (result!.recordType !== 'Detail') return;

    expect(result!.call.state).toBe(2);
    expect(result!.call.flags).toBe(4);
    expect(result!.call.calledType).toBe(103);
    expect(result!.call.callId).toBe('12345');
    expect(result!.call.targetGroup).toBe('Sales');
    expect(result!.call.origGroup).toBe('Support');
    expect(result!.call.origUser).toBe('Admin');
    expect(result!.call.stamp).toBe(1707573600);
    expect(result!.call.connStamp).toBe(1707573610);
    expect(result!.call.ringStamp).toBe(1707573605);
    expect(result!.call.connDur).toBe(45);
    expect(result!.call.ringDur).toBe(5);
    expect(result!.call.tag).toBe('vip');
    expect(result!.call.accCode).toBe('ACCT001');
    expect(result!.call.xfer).toBe(1);
  });

  it('should parse PartyA fields correctly', () => {
    const result = parseDelta3Event(DETAIL_ATTR_XML);
    expect(result).not.toBeNull();
    if (result!.recordType !== 'Detail') return;

    const partyA = result!.partyA;
    expect(partyA.state).toBe(2);
    expect(partyA.connected).toBe(1);
    expect(partyA.music).toBe(0);
    expect(partyA.name).toBe('201');
    expect(partyA.dir).toBe('I');
    expect(partyA.eqType).toBe(EquipmentType.SIPDevice);
    expect(partyA.calledPN).toBe('201');
    expect(partyA.callingPN).toBe('+442075551234');
    expect(partyA.ringCount).toBe(2);
    expect(partyA.cause).toBe(16);
    expect(partyA.ucid).toBe('ucid-001');
  });

  it('should parse PartyB fields correctly', () => {
    const result = parseDelta3Event(DETAIL_ATTR_XML);
    expect(result).not.toBeNull();
    if (result!.recordType !== 'Detail') return;

    const partyB = result!.partyB;
    expect(partyB).not.toBeNull();
    expect(partyB!.name).toBe('T9001');
    expect(partyB!.slot).toBe('LINE1.1');
    expect(partyB!.dir).toBe('O');
    expect(partyB!.eqType).toBe(EquipmentType.SIPTrunk);
  });

  it('should parse Target list', () => {
    const result = parseDelta3Event(DETAIL_ATTR_XML);
    expect(result).not.toBeNull();
    if (result!.recordType !== 'Detail') return;

    expect(result!.targets).toHaveLength(1);
    expect(result!.targets[0].name).toBe('Sales');
    expect(result!.targets[0].eqType).toBe(EquipmentType.HuntGroup);
    expect(result!.targets[0].calledPN).toBe('201');
    expect(result!.targets[0].calledPT).toBe(103);
    expect(result!.targets[0].callingPN).toBe('+442075551234');
    expect(result!.targets[0].ringCount).toBe(3);
  });

  it('should handle Detail record with no PartyB', () => {
    const xml = `
      <Detail>
        <Call State="1" CallID="99999" TargetGroup="" OrigGroup="" OrigUser=""
          Stamp="0" ConnStamp="0" RingStamp="0" ConnDur="0" RingDur="0"
          Locale="0" Tag="" AccCode="" ParkSlot="0" CallWait="0" Xfer="0" Flags="0" CalledType="0" />
        <PartyA State="1" Connected="0" Music="0" Name="201" Slot="" Dir="I"
          EqType="10" CalledPN="201" CalledPT="0" CallingPN="+441234567890"
          CallingPT="0" DialPN="" DialPT="0" KeyPN="" KeyPT="0"
          RingCount="1" Cause="0" VMDisallow="0" SendComplete="0"
          CallType="0" TransType="0" UCID="" SCNCallID="" />
      </Detail>
    `;

    const result = parseDelta3Event(xml);
    expect(result).not.toBeNull();
    if (result!.recordType !== 'Detail') return;
    expect(result!.partyB).toBeNull();
    expect(result!.targets).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Test: Detail Record Parsing (CSV-based)
// ---------------------------------------------------------------------------

describe('parseDelta3Event - Detail (CSV-based)', () => {
  it('should parse a CSV-based Detail record', () => {
    const result = parseDelta3Event(DETAIL_CSV_XML);
    expect(result).not.toBeNull();
    expect(result!.recordType).toBe('Detail');

    if (result!.recordType !== 'Detail') return;
    expect(result!.call.callId).toBe('12346');
    expect(result!.call.targetGroup).toBe('Sales');
    expect(result!.call.origGroup).toBe('Support');
    expect(result!.call.origUser).toBe('Admin');
    expect(result!.call.stamp).toBe(1707573600);
    expect(result!.call.accCode).toBe('ACCT002');
  });

  it('should parse PartyA from CSV fields', () => {
    const result = parseDelta3Event(DETAIL_CSV_XML);
    expect(result).not.toBeNull();
    if (result!.recordType !== 'Detail') return;

    const partyA = result!.partyA;
    expect(partyA.state).toBe(2);
    expect(partyA.eqType).toBe(10);
    expect(partyA.name).toBe('201');
  });

  it('should parse targets from Target_list in CSV format', () => {
    const result = parseDelta3Event(DETAIL_CSV_XML);
    expect(result).not.toBeNull();
    if (result!.recordType !== 'Detail') return;

    expect(result!.targets.length).toBeGreaterThanOrEqual(1);
    // Target should have Sales data
    const salesTarget = result!.targets.find((t) => t.name === 'Sales');
    expect(salesTarget).toBeDefined();
    expect(salesTarget!.eqType).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// Test: CallLost Parsing
// ---------------------------------------------------------------------------

describe('parseDelta3Event - CallLost', () => {
  it('should parse attribute-based CallLost', () => {
    const result = parseDelta3Event(CALLLOST_ATTR_XML);
    expect(result).not.toBeNull();
    expect(result!.recordType).toBe('CallLost');

    if (result!.recordType !== 'CallLost') return;
    expect(result!.callId).toBe('12345');
    expect(result!.partyName).toBe('201');
    expect(result!.cause).toBe(16);
    expect(result!.stamp).toBe(1707573700);
  });

  it('should parse CSV-based CallLost', () => {
    const result = parseDelta3Event(CALLLOST_CSV_XML);
    expect(result).not.toBeNull();
    expect(result!.recordType).toBe('CallLost');

    if (result!.recordType !== 'CallLost') return;
    expect(result!.callId).toBe('12347');
    expect(result!.partyName).toBe('node1');
    expect(result!.cause).toBe(16);
  });
});

// ---------------------------------------------------------------------------
// Test: LinkLost Parsing
// ---------------------------------------------------------------------------

describe('parseDelta3Event - LinkLost', () => {
  it('should parse attribute-based LinkLost', () => {
    const result = parseDelta3Event(LINKLOST_ATTR_XML);
    expect(result).not.toBeNull();
    expect(result!.recordType).toBe('LinkLost');

    if (result!.recordType !== 'LinkLost') return;
    expect(result!.nodeId).toBe('node-1');
    expect(result!.stamp).toBe(1707573800);
  });

  it('should parse CSV-based LinkLost', () => {
    const result = parseDelta3Event(LINKLOST_CSV_XML);
    expect(result).not.toBeNull();
    expect(result!.recordType).toBe('LinkLost');

    if (result!.recordType !== 'LinkLost') return;
    expect(result!.nodeId).toBe('node-2');
  });
});

// ---------------------------------------------------------------------------
// Test: AttemptReject Parsing
// ---------------------------------------------------------------------------

describe('parseDelta3Event - AttemptReject', () => {
  it('should parse attribute-based AttemptReject', () => {
    const result = parseDelta3Event(ATTEMPTREJECT_ATTR_XML);
    expect(result).not.toBeNull();
    expect(result!.recordType).toBe('AttemptReject');

    if (result!.recordType !== 'AttemptReject') return;
    expect(result!.callId).toBe('12345');
    expect(result!.partyName).toBe('202');
    expect(result!.cause).toBe(21);
    expect(result!.stamp).toBe(1707573650);
  });

  it('should parse CSV-based AttemptReject', () => {
    const result = parseDelta3Event(ATTEMPTREJECT_CSV_XML);
    expect(result).not.toBeNull();
    expect(result!.recordType).toBe('AttemptReject');

    if (result!.recordType !== 'AttemptReject') return;
    expect(result!.callId).toBe('12348');
    expect(result!.partyName).toBe('202');
  });
});

// ---------------------------------------------------------------------------
// Test: Enum Mappings
// ---------------------------------------------------------------------------

describe('mapCallState', () => {
  it('should map all DevLink3 call states to application-level states', () => {
    expect(mapCallState(DevLink3CallState.Idle)).toBe('idle');
    expect(mapCallState(DevLink3CallState.Ringing)).toBe('ringing');
    expect(mapCallState(DevLink3CallState.Connected)).toBe('connected');
    expect(mapCallState(DevLink3CallState.Disconnecting)).toBe('completed');
    expect(mapCallState(DevLink3CallState.Suspending)).toBe('hold');
    expect(mapCallState(DevLink3CallState.Suspended)).toBe('hold');
    expect(mapCallState(DevLink3CallState.Resuming)).toBe('connected');
    expect(mapCallState(DevLink3CallState.Dialling)).toBe('ringing');
    expect(mapCallState(DevLink3CallState.Dialled)).toBe('ringing');
    expect(mapCallState(DevLink3CallState.LocalDial)).toBe('ringing');
    expect(mapCallState(DevLink3CallState.Queued)).toBe('queued');
    expect(mapCallState(DevLink3CallState.Parked)).toBe('parked');
    expect(mapCallState(DevLink3CallState.Held)).toBe('hold');
    expect(mapCallState(DevLink3CallState.Redialling)).toBe('ringing');
  });

  it('should return idle for unknown state values', () => {
    expect(mapCallState(99)).toBe('idle');
    expect(mapCallState(-1)).toBe('idle');
  });
});

describe('mapEquipmentType', () => {
  it('should map all known equipment types', () => {
    expect(mapEquipmentType(EquipmentType.ISDNTrunk)).toBe('ISDN Trunk');
    expect(mapEquipmentType(EquipmentType.SIPTrunk)).toBe('SIP Trunk');
    expect(mapEquipmentType(EquipmentType.TDMPhone)).toBe('TDM Phone');
    expect(mapEquipmentType(EquipmentType.H323Phone)).toBe('H.323 Phone');
    expect(mapEquipmentType(EquipmentType.SIPDevice)).toBe('SIP Device');
    expect(mapEquipmentType(EquipmentType.Voicemail)).toBe('Voicemail');
    expect(mapEquipmentType(EquipmentType.ConferenceChannel)).toBe('Conference');
    expect(mapEquipmentType(EquipmentType.HuntGroup)).toBe('Hunt Group');
    expect(mapEquipmentType(EquipmentType.WebRTCPhone)).toBe('WebRTC Phone');
  });

  it('should return Unknown for unrecognized types', () => {
    expect(mapEquipmentType(99)).toBe('Unknown (99)');
    expect(mapEquipmentType(0)).toBe('Unknown (0)');
  });
});

describe('mapCalledType', () => {
  it('should map all known called types', () => {
    expect(mapCalledType(CalledType.Internal)).toBe('Internal');
    expect(mapCalledType(CalledType.Voicemail)).toBe('Voicemail');
    expect(mapCalledType(CalledType.ACD)).toBe('ACD/Hunt Group');
    expect(mapCalledType(CalledType.Direct)).toBe('Direct');
    expect(mapCalledType(CalledType.Emergency)).toBe('Emergency');
  });

  it('should return Unknown for unrecognized types', () => {
    expect(mapCalledType(0)).toBe('Unknown (0)');
    expect(mapCalledType(999)).toBe('Unknown (999)');
  });
});

describe('mapCauseCode', () => {
  it('should map all known cause codes', () => {
    expect(mapCauseCode(CauseCode.Unknown)).toBe('Unknown');
    expect(mapCauseCode(CauseCode.Normal)).toBe('Normal');
    expect(mapCauseCode(CauseCode.Busy)).toBe('Busy');
    expect(mapCauseCode(CauseCode.NoUserResponding)).toBe('No User Responding');
    expect(mapCauseCode(CauseCode.CallRejected)).toBe('Call Rejected');
    expect(mapCauseCode(CauseCode.NetworkOutOfOrder)).toBe('Network Out Of Order');
  });

  it('should return Unknown for unrecognized cause codes', () => {
    expect(mapCauseCode(999)).toBe('Unknown (999)');
  });
});

// ---------------------------------------------------------------------------
// Test: Malformed XML Handling
// ---------------------------------------------------------------------------

describe('parseDelta3Event - malformed input', () => {
  it('should return null for empty string', () => {
    expect(parseDelta3Event('')).toBeNull();
  });

  it('should return null for whitespace-only input', () => {
    expect(parseDelta3Event('   \n\t  ')).toBeNull();
  });

  it('should return null for unrecognized XML', () => {
    expect(parseDelta3Event('<SomethingElse foo="bar" />')).toBeNull();
  });

  it('should return null for random non-XML text', () => {
    expect(parseDelta3Event('not xml at all')).toBeNull();
  });

  it('should handle Detail with missing Call tag gracefully', () => {
    const xml = '<Detail><PartyA State="1" Name="201" /></Detail>';
    const result = parseDelta3Event(xml);
    expect(result).not.toBeNull();
    if (result!.recordType !== 'Detail') return;
    // Should have empty/default call fields
    expect(result!.call.callId).toBe('');
    expect(result!.call.state).toBe(0);
  });

  it('should handle empty attribute values', () => {
    const xml = `
      <Detail>
        <Call State="" Flags="" CalledType="" CallID="" TargetGroup="" OrigGroup=""
          OrigUser="" Stamp="" ConnStamp="" RingStamp="" ConnDur="" RingDur=""
          Locale="" Tag="" AccCode="" ParkSlot="" CallWait="" Xfer="" />
        <PartyA State="" Connected="" Music="" Name="" Slot="" Dir=""
          EqType="" CalledPN="" CalledPT="" CallingPN="" CallingPT=""
          DialPN="" DialPT="" KeyPN="" KeyPT="" RingCount="" Cause=""
          VMDisallow="" SendComplete="" CallType="" TransType="" UCID="" SCNCallID="" />
      </Detail>
    `;
    const result = parseDelta3Event(xml);
    expect(result).not.toBeNull();
    if (result!.recordType !== 'Detail') return;
    expect(result!.call.state).toBe(0);
    expect(result!.call.callId).toBe('');
    expect(result!.partyA.name).toBe('');
  });

  it('should handle CallLost with no attributes', () => {
    const xml = '<CallLost />';
    const result = parseDelta3Event(xml);
    expect(result).not.toBeNull();
    expect(result!.recordType).toBe('CallLost');
    if (result!.recordType !== 'CallLost') return;
    expect(result!.callId).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Test: Multiple Targets
// ---------------------------------------------------------------------------

describe('parseDelta3Event - multiple targets', () => {
  it('should parse multiple Target entries', () => {
    const xml = `
      <Detail>
        <Call State="1" CallID="multi" TargetGroup="Sales" Flags="0" CalledType="0"
          OrigGroup="" OrigUser="" Stamp="0" ConnStamp="0" RingStamp="0"
          ConnDur="0" RingDur="0" Locale="0" Tag="" AccCode="" ParkSlot="0"
          CallWait="0" Xfer="0" />
        <PartyA State="1" Connected="0" Music="0" Name="T9001" Slot="" Dir="I"
          EqType="5" CalledPN="" CalledPT="0" CallingPN="+441234567890"
          CallingPT="0" DialPN="" DialPT="0" KeyPN="" KeyPT="0"
          RingCount="0" Cause="0" VMDisallow="0" SendComplete="0"
          CallType="0" TransType="0" UCID="" SCNCallID="" />
        <Target Name="201" State="1" EqType="10" UCID="" SCNCallID="" Dir=""
          CalledPN="201" CalledPT="0" CallingPN="" CallingPT="0" DialPN=""
          DialPT="0" KeyPN="" KeyPT="0" RingCount="2" Cause="0"
          VMDisallow="0" SendComplete="0" CallType="0" TransType="0" />
        <Target Name="202" State="0" EqType="10" UCID="" SCNCallID="" Dir=""
          CalledPN="202" CalledPT="0" CallingPN="" CallingPT="0" DialPN=""
          DialPT="0" KeyPN="" KeyPT="0" RingCount="0" Cause="0"
          VMDisallow="0" SendComplete="0" CallType="0" TransType="0" />
        <Target Name="203" State="0" EqType="10" UCID="" SCNCallID="" Dir=""
          CalledPN="203" CalledPT="0" CallingPN="" CallingPT="0" DialPN=""
          DialPT="0" KeyPN="" KeyPT="0" RingCount="0" Cause="0"
          VMDisallow="0" SendComplete="0" CallType="0" TransType="0" />
      </Detail>
    `;

    const result = parseDelta3Event(xml);
    expect(result).not.toBeNull();
    if (result!.recordType !== 'Detail') return;

    expect(result!.targets).toHaveLength(3);
    expect(result!.targets[0].name).toBe('201');
    expect(result!.targets[1].name).toBe('202');
    expect(result!.targets[2].name).toBe('203');
  });
});
