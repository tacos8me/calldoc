# DevLink3 Protocol Implementation Specification
## For CallDoc - Avaya IP Office 11 Integration

---

## 1. Connection Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| **TCP Port** | 50797 | Unsecured DevLink3 |
| **TLS Port** | 50796 | Requires certificate of "at least medium security" on IP Office |
| **WebSocket (HTTP)** | Port varies | Uses MD5 socket authentication |
| **WebSocket (HTTPS)** | Port varies | Uses HTTP Basic authentication (base64 username:password) |
| **Transport** | Packetized TCP | Binary protocol over TCP or TLS stream |
| **Max Connections** | 3 per IP Office | Maximum 3 concurrent DevLink3 event-monitoring connections |
| **Byte Order** | Network byte order (big-endian) | All 2-octet and 4-octet numeric fields |
| **String Encoding** | UTF-8 for passwords; double-byte Unicode (network byte order) for strings | |

---

## 2. Packet Structure

Every DevLink3 packet has this binary layout:

```
Byte 0:       0x49 (magic byte / protocol identifier "I")
Bytes 1-2:    Packet length (2 bytes, big-endian) = 3 + header_len + requestid_len + body_len
Bytes 3-6:    Packet Type (4 bytes, hex-encoded identifier)
Bytes 7-14:   Request ID (8 ASCII decimal digits, random per-request)
Bytes 15+:    Body (variable, depends on packet type)
```

The `BuildBuffer()` method constructs the packet as:
```
"49" + pktlength(2 bytes hex) + hexheader(4 bytes) + requestid(8 bytes) + body(variable)
```

Specifically:
```csharp
pktlength = (3 + (hexheader.Length / 2) + (requestid.Length / 2) + (body.Length / 2)).ToString("X4");
Headerbytes = HexOcttoByte("49" + pktlength + hexheader);
```

For payloads > 0x7FFF bytes, a 3-byte length encoding is used.

---

## 3. Packet Types

| Packet Type | Hex Value | Direction | Description |
|-------------|-----------|-----------|-------------|
| **Test** | `002A0001` | Client -> Server | Keepalive / link verification |
| **TestR** | `802A0001` | Server -> Client | Test response |
| **Authenticate** | `00300001` | Client -> Server | Authentication request |
| **AuthenticateR** | `80300001` | Server -> Client | Authentication response |
| **EventRequest** | `00300011` | Client -> Server | Register for event streams |
| **EventRequestR** | `80300011` | Server -> Client | Event registration response |
| **Event** | `10300011` | Server -> Client | Unsolicited event data |
| **ReadFile** | `00300041` | Client -> Server | ReadFile request |
| **ReadFileR** | `80300041` | Server -> Client | ReadFile response |

Pattern: Requests have MSB=0, responses have MSB=8 (bit 31 set). Events have MSB=1 (bit 28 set).

---

## 4. Response Codes

| Response Code | Hex Value | Meaning |
|---------------|-----------|---------|
| **Pass/Success** | `00000000` | Request succeeded |
| **Challenge** | `00000002` | Server sends SHA1 challenge (during auth) |
| **UnknownFlag** | `80000021` | Unknown event flag string in EventRequest |
| **Fail** | `80000041` | Authentication failed |

---

## 5. Authentication Sequence (SHA1 Challenge-Response)

### Phase 1: Username Submission
1. Client connects TCP to IP Office port 50797
2. Client sends Authenticate packet with body: `"00000001"` + UTF8(username + null terminator)

```csharp
body = "00000001" + BitConverter.ToString(
    Encoding.UTF8.GetBytes(txt.Trim() + Char.MinValue)
).Replace("-", string.Empty);
```

### Phase 2: SHA1 Challenge-Response
3. Server responds with AuthenticateR containing Response code `00000002` (Challenge) and challenge bytes
4. Client extracts challenge bytes (size at byte offset 18, data at offset 19)
5. Client computes: `SHA1(challenge_bytes + password_utf8_padded_to_16_bytes)`

```csharp
byte[] utf8pwd = new byte[16];    // 16-byte password buffer
byte[] HashBytes = new byte[challenge.Length + 16];

// Copy password (truncated to 16 bytes if needed)
Buffer.BlockCopy(Encoding.UTF8.GetBytes(password.Trim()), 0, utf8pwd, 0,
    (pwd.Length < 17) ? pwd.Length : 16);

// HashBytes = challenge + utf8pwd
Buffer.BlockCopy(challenge, 0, HashBytes, 0, challenge.Length);
Buffer.BlockCopy(utf8pwd, 0, HashBytes, challenge.Length, 16);

SHA1 sha = SHA1.Create();
byte[] HashOutp = sha.ComputeHash(HashBytes);

response = BitConverter.ToString(HashOutp).Replace("-", string.Empty);
body = "00000050" + (response.Length / 2).ToString("X8") + response;
```

### TypeScript equivalent:
```typescript
function computeChallengeResponse(challenge: Buffer, password: string): Buffer {
  const pwdBytes = Buffer.from(password, 'utf-8').subarray(0, 16);
  const pwdPadded = Buffer.alloc(16);
  pwdBytes.copy(pwdPadded);
  const hashInput = Buffer.concat([challenge, pwdPadded]); // 32 bytes
  return crypto.createHash('sha1').update(hashInput).digest(); // 20 bytes
}
```

### Phase 3: Result
7. Server responds with AuthenticateR containing either `00000000` (Pass) or `80000041` (Fail)

---

## 6. Response Parsing Offsets

Hex string positions:
- **Header** (packet type): character offset 6, length 8 hex chars (bytes 3-6)
- **Request ID**: character offset 14, length 8 hex chars (bytes 7-10)
- **Response code**: character offset 22, length 8 hex chars (bytes 11-14)
- **Challenge size**: byte offset 18 (1 byte)
- **Challenge data**: byte offset 19, length = challenge size

---

## 7. Event Registration

After successful authentication, send an EventRequest packet with flag string.

Known event flag strings:
- `-SIPTrack` -- SIP tracking events (associate SIP CallID with endpoints)
- `-CallDelta3` -- Call delta v3 events (primary call event stream, XML-based)
- `-CallDelta2` -- Call delta v2 events (legacy comma-separated format)
- `-CMExtn` -- CM Extension state events
- `-SCN` -- Multi-site/Server Edition node events
- `-CONN` -- Connection info events
- `-TEXT` -- Text-mode events

Body format for EventRequest:
```
length_of_string(2 bytes hex) + UTF8(flag_string + null_terminator)
```

---

## 8. Tuple Type Codes

| Tuple Code | Name | Description |
|------------|------|-------------|
| `0x007E0001` | App Name | Application identifier |
| `0x007D0001` | PBX Type | PBX type identifier |
| `0x007D0002` | DevLink Variant | DevLink version variant |
| `0x00760001` | CallDelta3 | XML call event data (primary) |
| `0x00760002` | CallDelta2 | Legacy comma-separated call data |
| `0x00760003` | SIPTrack | SIP call ID association |
| `0x00760004` | CMExtn | Extension state change |

---

## 9. Delta3 XML Event Format

### Record Types:
- **Detail** -- Full call state snapshot (most common)
- **CallLost** -- Party disconnected
- **LinkLost** -- Intermediate node disconnect
- **AttemptReject** -- Call manually rejected

### Detail Record Structure:
```xml
<Detail>
  <Call State="2" Flags="0" CalledType="103" CallID="12345"
    TargetGroup="Sales" OrigGroup="Support" OrigUser="JSmith"
    Stamp="1707556800" ConnStamp="1707556810" RingStamp="1707556805"
    ConnDur="180" RingDur="5" Locale="0" Tag="" AccCode=""
    ParkSlot="0" CallWait="0" Xfer="0" SvcActive="0" SvcQuotaUsed="0"
    SvcQuotaTime="0" />
  <PartyA State="2" Connected="1" Music="0"
    Name="Extn201" Slot="" Dir="I"
    EqType="9" CalledPN="" CalledPT="0"
    CallingPN="5551234567" CallingPT="0"
    DialPN="" DialPT="0" KeyPN="" KeyPT="0"
    RingCount="1" Cause="16" VMDisallow="0"
    SendComplete="1" CallType="0" TransType="0"
    UCID="" SCNCallID="" />
  <PartyB State="2" Connected="1" Music="0"
    Name="T9001" Slot="1.1" Dir="I"
    EqType="2" ... />
  <Target_list>
    <Target Name="Sales" State="0" EqType="0"
      UCID="" SCNCallID="" Dir=""
      CalledPN="" CalledPT="0"
      CallingPN="" CallingPT="0"
      DialPN="" DialPT="0" KeyPN="" KeyPT="0"
      RingCount="0" Cause="0" VMDisallow="0"
      SendComplete="0" CallType="0" TransType="0" />
  </Target_list>
</Detail>
```

---

## 10. Call State Enumeration

| Value | State | Description |
|-------|-------|-------------|
| 0 | Idle | No active call |
| 1 | Ringing | Alerting/ringing |
| 2 | Connected | Active call connected |
| 3 | Disconnecting | Call being torn down |
| 4 | Suspending | Going on hold |
| 5 | Suspended | On hold |
| 6 | Resuming | Coming off hold |
| 7 | Dialling | Outbound digits being sent |
| 8 | Dialled | Outbound digits complete |
| 9 | LocalDial | Local dial tone |
| 10 | Queued | Waiting in queue |
| 11 | Parked | Call parked |
| 12 | Held | Call held |
| 13 | Redialling | Redialling attempt |

---

## 11. Equipment Type Classifications

| Value | Type | Description |
|-------|------|-------------|
| 2 | ISDNTrunk | ISDN trunk line |
| 5 | SIPTrunk | SIP trunk |
| 8 | TDMPhone | TDM analog phone |
| 9 | H323Phone | H.323 IP phone |
| 10 | SIPDevice | SIP endpoint |
| 12 | Voicemail | Voicemail port |
| 13 | ConferenceChannel | Conference bridge |
| 15 | HuntGroup | Hunt group |
| 28 | WebRTCPhone | WebRTC endpoint |

---

## 12. Called Type Codes

| Value | Type |
|-------|------|
| 101 | Internal |
| 102 | Voicemail |
| 103 | ACD (Hunt Group) |
| 105 | Direct |
| 119 | Emergency |

---

## 13. Flags Bitfield

| Bit | Meaning |
|-----|---------|
| 0x01 | Privacy (CLIR requested) |
| 0x02 | Auto-answered |
| 0x04 | Auto-recorded |
| 0x10 | Consent answered |
| 0x20 | Consent refused |

---

## 14. Cause Codes

| Value | Name | Description |
|-------|------|-------------|
| 0 | CMCauseUnknown | Unknown |
| 1 | CMCauseUnallocatedNumber | Unallocated number |
| 2 | CMCauseForceIdle | Forced idle |
| 3 | CMCauseUnregister | Endpoint unregistered |
| 16 | CMCauseNormal | Normal clearing |
| 17 | CMCauseBusy | User busy |
| 18 | CMCauseNoUserResponding | No user responding |
| 21 | CMCauseCallRejected | Call rejected |
| 31 | CMCauseNormalUnspecified | Normal, unspecified |
| 34 | CMCauseNoChannel | No channel available |
| 38 | CMCauseNetworkOOO | Network out of order |
| 88 | CMCauseIncompatible | Incompatible destination |

---

## 15. Connection Lifecycle

```
1. TCP Connect to IP Office:50797 (or TLS to :50796)
2. [Optional] Send Test packet (002A0001) -> Receive TestR (802A0001)
3. Send Authenticate phase 1: username
   -> Receive Challenge (response code 00000002 + challenge bytes)
4. Send Authenticate phase 2: SHA1(challenge + password_16bytes)
   -> Receive Pass (00000000) or Fail (80000041)
5. Send EventRequest with flags (e.g., "-SIPTrack")
   -> Receive EventRequestR Pass (00000000) or UnknownFlag (80000021)
6. Receive Event packets (10300011) continuously
7. [Periodic] Send Test packets as keepalive
```

---

## 16. IP Office Configuration Requirements

1. **Enable DevLink3**: File -> Advanced -> Security Settings -> System -> Unsecured Interfaces -> check "TAPI/Devlink 3"
2. **Create Rights Group**: Security Administration -> Rights Groups -> Telephony API's -> check "DevLink3"
3. **Create Service User**: Security Administration -> new Service User -> assign to DevLink3 rights group
4. **CTI Link Pro license** required
5. **IP Office version 10.0+** required

---

## 17. Reference Implementation Files

- `/root/ipo-log/avaya-sample/IPOtut/DevLink3.cs` -- Main connection, auth, and event handling
- `/root/ipo-log/avaya-sample/IPOtut/Packet.cs` -- Packet construction, SHA1, binary encoding
- `/root/ipo-log/avaya-sample/devlink3-reference.md` -- Complete protocol specification
