# Avaya IP Office DevLink3 API Reference

> **Version:** Issue 1.2 | **Since:** IP Office Release 10.0 | **Current:** Release 12.2  
> **Last Updated:** 2025-07-30

---

## 1. Overview

DevLink3 is a TCP/TLS protocol introduced in IP Office Release 10.0 that supersedes the legacy Delta2 record reporting via the Devlink DLL. It streams real-time call events (Delta3 and legacy Delta2) and is platform/language-agnostic.

## 2. Prerequisites

- **CTI-PRO licences** — see [Licensing](#5-licensing)
- **Service User** configured on IP Office with username/password — see [Authentication Config](#4-ip-office-configuration-for-authentication)
- **SHA1 hashing** capability in your application

## 3. Transport Options

| Transport | Port  | Notes |
|-----------|-------|-------|
| TCP       | 50797 | Governed by `TAPI / DevLink 3` checkbox on "Unsecured Interfaces" tab in System Security |
| TLS       | 50796 | Always available. If TCP is disabled, mutual certificate auth is required (certificate must be in IP Office cert store, ≥ "medium" trust) |

### Packet Framing

Every packet in both directions uses this format:

```
Offset  Size      Description
0       1 byte    0x49 — DevLink3 discriminator
1       2 bytes   Frame length (N+3) in network byte order
3       N bytes   Payload
```

- **No padding** allowed in the stream.
- After TCP/TLS connect, the **client must send first** — IP Office remains passive until it receives valid data.
- If frame payload > `0x7FFF` bytes, use **3-byte length encoding**:

```c
if (len + 3 > 0x7FFF) {
    len += 4;
    header[1] = (uint8_t)(len >> 15) | 0x80;
    header[2] = (uint8_t)(len >> 8) & 0x7F;
    header[3] = (uint8_t)(len);
} else {
    len += 3;
    header[1] = (uint8_t)(len >> 8);
    header[2] = (uint8_t)(len);
}
```

## 4. IP Office Configuration for Authentication

1. **Create a Rights Group** — enable the `DevLink3` checkbox in the **Telephony API's** tab.
2. **Create a Service User** — assign username/password and add to the DevLink3 rights group.

Both are configured under **Security Settings** in IP Office Manager.

## 5. Licensing

| Licences | Capability |
|----------|-----------|
| 1× CTILINK_PRO | No SCN option |
| 2× CTILINK_PRO | SCN on networks ≤ 5 nodes |
| 3× CTILINK_PRO | SCN on networks ≤ 20 nodes |
| 4× CTILINK_PRO | SCN on large networks (> 20 nodes) |

Licences must be installed on the **node the application connects to**.

## 6. Protocol Description

- All 2-byte and 4-byte numeric fields are **network byte order** (big-endian).
- All Unicode strings are **double-byte, network byte order**.
- All payload descriptions below are carried inside the packet's Payload section.

---

### 6.1. Test Packets

Can be sent **before authentication** and at any time to verify the link.

**Request:**

```
Offset  Size     Value/Description
0       4 bytes  0x002A0001 — Test packet
4       4 bytes  RequestID (nonzero to get response)
8       4 bytes  Length of optional payload (max 1000)
12      N bytes  Payload
```

**Response:**

```
Offset  Size     Value/Description
0       4 bytes  0x802A0001 — Test packet response
4       4 bytes  RequestID (echoed from request)
8       4 bytes  Result code
12      4 bytes  Length of optional payload (max 1000)
16      N bytes  Payload (echoed on SUCCESS)
```

**Result codes:**

| Code | Name | Meaning |
|------|------|---------|
| `0x00000000` | SUCCESS | Payload echoed back |
| `0x80000001` | PAYLOAD_TOO_LONG | No payload returned |
| `0x80000002` | STREAM_INTEGRITY_LOST | Stream broken — must reconnect |
| `0x80000003` | STREAM_AUTHENTICATION_FAILED | Prior auth attempt failed — must reconnect |

---

### 6.2. Authentication (SHA1 Challenge)

IP Office blocks repeated failed password attempts even across reconnections.

#### 6.2.1. Auth Request

```
Offset  Size     Value/Description
0       4 bytes  0x00300001 — Authenticate Request
4       4 bytes  RequestID
8       4 bytes  1 (= Request)
12      N bytes  Username — NULL-terminated UTF-8 string
12+N    N bytes  Table of Tuples (optional)
```

##### Request Tuples

**Application Name tuple:**

```
Offset  Size     Value/Description
0       4 bytes  0x007E0001 — Application name
4       2 bytes  Length of name (including trailing NUL)
6       N bytes  NULL-terminated UTF-8 string (e.g. "MyApp DevLink 1.0")
```

#### 6.2.2. Challenge (from IP Office)

```
Offset  Size     Value/Description
0       4 bytes  0x80300001 — Authenticate Response
4       4 bytes  RequestID (same as request)
8       4 bytes  2 (= Challenge SHA1)
12      4 bytes  Length of challenge data
16      N bytes  Random challenge data (16 bytes)
```

#### 6.2.3. Challenge Response (from Client)

```
Offset  Size     Value/Description
0       4 bytes  0x00300001 — Authenticate Request
4       4 bytes  RequestID
8       4 bytes  0x50 (= Challenge Response SHA1)
12      4 bytes  Length of response (20 for SHA1)
16      20 bytes SHA1 hash result
```

**SHA1 hash computation:**

```
input[0..15]  = 16 bytes of challenge data
input[16..31] = password as UTF-8, zero-padded to 16 bytes
                (if password > 16 bytes UTF-8, truncate to 16)

output = SHA1(input)  // 32 bytes in → 20 bytes out
```

**Python example:**

```python
import hashlib

def compute_challenge_response(challenge: bytes, password: str) -> bytes:
    pwd_bytes = password.encode('utf-8')[:16]
    pwd_padded = pwd_bytes.ljust(16, b'\x00')
    hash_input = challenge + pwd_padded  # 32 bytes
    return hashlib.sha1(hash_input).digest()  # 20 bytes
```

**C example (Windows CryptoAPI):**

```c
unsigned char input[32];
memcpy(&input[0], challenge, 16);
memset(&input[16], 0, 16);
strncpy((char*)&input[16], password_str, 16);

HCRYPTPROV hProv = 0;
HCRYPTHASH hHash = 0;
unsigned long output_len = 20;

CryptAcquireContext(&hProv, NULL, NULL, PROV_RSA_FULL, 0);
CryptCreateHash(hProv, CALG_SHA1, 0, 0, &hHash);
CryptHashData(hHash, input, 32, 0);
CryptGetHashParam(hHash, HP_HASHVAL, output_data, &output_len, 0);

CryptDestroyHash(hHash);
CryptReleaseContext(hProv, 0);
```

#### 6.2.4. Authentication Result

```
Offset  Size     Value/Description
0       4 bytes  0x80300001 — Authenticate Response
4       4 bytes  RequestID
8       4 bytes  Result code
12      N bytes  Table of Tuples (on SUCCESS)
```

**Result codes:**

| Code | Name |
|------|------|
| `0x00000000` | SUCCESS |
| `0x80000041` | AUTHENTICATION FAILED |
| `0x80000042` | LIMITS EXCEEDED |
| `0x80000043` | RETRY LATER |
| `0x80000044` | LICENCE MISSING |

##### Success Tuples

**PBX Type and Version:**

```
4 bytes  0x007D0001
2 bytes  Length (including NUL)
N bytes  NULL-terminated UTF-8 (e.g. "Avaya IP500v2 10.0.2345.67894")
```

**DevLink Variant:**

```
4 bytes  0x007D0002
2 bytes  Length (including NUL)
N bytes  NULL-terminated UTF-8 (e.g. "Standard 1.0")
```

---

### 6.3. Plain Challenge (TLS Only)

IP Office may issue a PLAIN challenge instead of SHA1 — **only over TLS**.

#### 6.3.1. Plain Challenge (from IP Office)

```
Offset  Size     Value/Description
0       4 bytes  0x80300001 — Authenticate Response
4       4 bytes  RequestID
8       4 bytes  1 (= Challenge PLAIN)
```

#### 6.3.2. Plain Challenge Response (from Client)

```
Offset  Size     Value/Description
0       4 bytes  0x00300001 — Authenticate Request
4       4 bytes  RequestID
8       4 bytes  0x51 (= Plain Challenge Response)
12      4 bytes  Length (should be 32)
16      32 bytes Plaintext UTF-8 password, zero-padded to 32 bytes
```

---

### 6.4. Stream Requests

After authentication, request unsolicited event streaming.

#### 6.4.1. Event Request

```
Offset  Size     Value/Description
0       4 bytes  0x00300011 — Devlink3 Event Request
4       4 bytes  RequestID (nonzero)
8       2 bytes  Length of flags section (null-terminated)
10      N bytes  Flags string
```

**Supported flags:**

| Flag | Description |
|------|-------------|
| `-SCN` | Stream events from every PBX on the SCN (incompatible with `-CD2`) |
| `-CD2` | Generate legacy Delta2 events instead of Delta3 (prevents `-SCN`) |
| `-SIPTrack` | Include SIPTrack events |
| `-CMExtn` | Include CMExtn events |
| `-CONN` | Only report Delta3 events after call is initially connected |
| `-TEXT` | Output CD2 as UTF-8 instead of Unicode |

**Example:** `"-SCN -CMExtn"` — stream SCN-wide with extension monitoring.

#### 6.4.2. Event Response

```
Offset  Size     Value/Description
0       4 bytes  0x80300011 — Devlink3 Event Response
4       4 bytes  RequestID (echoed)
8       4 bytes  Result code
12      2 bytes  Length of accepted flags
14      N bytes  Accepted flags (copy of valid flags from request)
```

**Result codes:**

| Code | Name |
|------|------|
| `0x00000000` | SUCCESS |
| `0x00000009` | PARTIAL SUCCESS |
| `0x80000021` | UNKNOWN FLAG |
| `0x80000022` | INSUFFICIENT LICENCE |
| `0x80000023` | FEATURE NOT AVAILABLE |

On success, IP Office immediately sends a Delta3 record for **each call currently in progress**.

---

### 6.5. Stream Events

#### 6.5.1. Devlink3 Event Wrapper

```
Offset  Size     Value/Description
0       4 bytes  0x10300011 — Devlink3 Event
4       4 bytes  Originating PBX IP address
8       4 bytes  Incrementing counter (per PBX)
12      N bytes  Table of Devlink3 tuples (usually 1)
```

##### 6.5.1.1. CallDelta3 Tuple

```
4 bytes  0x00760001 — CallDelta3
2 bytes  Length (including NUL)
N bytes  NULL-terminated XML-formatted UTF-8 string
```

##### 6.5.1.2. CallDelta2 Tuple (Legacy)

```
4 bytes  0x00760001 — CallDelta3 (container)
4 bytes  0x00760002 — CallDelta2
2 bytes  Length (including trailing 0x0000)
N bytes  NULL-terminated Unicode string (legacy Delta2 format)
```

##### 6.5.1.3. SIPTrack Event Tuple

```
4 bytes  0x00760003 — SIPTrack Event
2 bytes  Length (including trailing 0x0000)
N bytes  NULL-terminated Unicode string
```

**Format:** `$event,$epid,$end_id,$siptype,$direction,$sip_callid`

| Field | Values |
|-------|--------|
| `$event` | `START` \| `END` |
| `$siptype` | `TRUNK` \| `PHONE` |
| `$direction` | `IN` \| `OUT` |

**Example:** `"START,c0a82a1f000003eb,17.1003.1,TRUNK,IN,0f5757c5c504c74197be9699697eab8d"`

These events associate SIP Call-IDs with Delta2 endpoints.

##### 6.5.1.4. CMExtn Event Tuple

```
4 bytes  0x00760004 — CMExtn Event
2 bytes  Length (including trailing 0x0000)
N bytes  NULL-terminated Unicode string
```

**Example:** `"Extn4001: CALL LOST (CMCauseForceIdle)"`

##### 6.5.1.5. CMExtn Extended Event Tuple (State Changes)

```
4 bytes  0x00760004 — CMExtn Event
2 bytes  Length of Unicode string (including trailing 0x0000) + 12
4 bytes  "v" value
4 bytes  p1
4 bytes  p2
N bytes  NULL-terminated Unicode string (e.g. "Extn865001")
```

**Example:** `v=1, p1=2, p2=0` → State change: `new=Dialling, old=Idle`

---

### 6.6. Commands

#### 6.6.1. ReadFile (e.g. user_list)

Read pseudo-files from the PBX after authentication.

**Request:**

```
Offset  Size     Value/Description
0       4 bytes  0x00300041 — Read file
4       4 bytes  RequestID (nonzero)
8       2 bytes  Length of filename (including NUL)
10      N bytes  Filename (e.g. "nasystem/user_list")
```

**Response:**

```
Offset  Size     Value/Description
0       4 bytes  0x80300041 — Read file Response
4       4 bytes  RequestID (echoed)
8       4 bytes  SUCCESS or NOT FOUND
12      N bytes  File contents
```

> **Tip:** Open a separate DevLink3 connection for each file read, then close it after loading.

---

### 6.7. Delta3 Protocol Records

Four record types, delivered as XML-like structured text inside CallDelta3 tuples:

| Record Type | Description |
|-------------|-------------|
| **Detail** | Full call state with sections: `<Call>`, `<PartyA>`, `<PartyB>`, `<Target_list>` |
| **CallLost** | Party disconnected (generated at SCN extremities) |
| **LinkLost** | Party disconnected (generated at intermediate SCN nodes) |
| **AttemptReject** | User in target list manually rejected the call |

---

#### 6.7.1. Detail Record Examples

##### Dial Tone (phone 4001 off-hook)

```xml
<Detail>
  <Call>
    c0a82a03,1,,,,0,,,,,
  </Call>
  <PartyA>
    c0a82a03000003ea,1,7,1,3,0,0,0,1,8,106,,4001,0,0,,,,,,,4001,100
  </PartyA>
</Detail>
```

##### Incoming ISDN Call (DID=5678, CLI=01707123456, huntgroup 200, ringing 3 phones)

```xml
<Detail>
  <Call>
    c0a82a03,3,,,,0,,200,,200,
  </Call>
  <PartyA>
    0a82a0300002329,1,19,1,2,0,1,0,0,2,2,5.23,,0,0,5678,,,,,,01707123456,100
  </PartyA>
  <Target_list>
    <Target>
      c0a82a03000003fe,0,0,8,106,,4002,0,4,,,200,901707123456,100
    </Target>
    <Target>
      c0a82a03000003ff,0,0,8,106,,4003,0,4,,,200,901707123456,100
    </Target>
    <Target>
      c0a82a0300000407,0,0,8,106,,4001,0,4,,,200,901707123456,100
    </Target>
  </Target_list>
</Detail>
```

##### Answered Call (4001 answers)

```xml
<Detail>
  <Call>
    c0a82a03,4,,,,0,,200,,200,
  </Call>
  <PartyA>
    c0a82a030000232a,1,2,1,0,0,1,0,0,2,2,5.23,,0,0,5678,,,,,,01707123456,100
  </PartyA>
  <PartyB>
    c0a82a0300000413,0,2,1,0,0,0,0,1,8,106,,4001,0,4,,,,,,200,901707123456,100
  </PartyB>
</Detail>
```

##### Phone Hung Up (4001 disconnects)

```xml
<CallLost>
  c0a82a03,c0a82a0300000413,1,16
</CallLost>
```

---

#### 6.7.2. Call Section Fields

Comma-separated, minimum 10 fields:

| # | Field | Type | Description |
|---|-------|------|-------------|
| 1 | Node identifier | UTF-8 (8 chars) | Unique ID of the IP Office node |
| 2 | CallID | Integer | Local call identity on this PBX |
| 3 | Account code | UTF-8 | Account code assigned to call |
| 4 | Authorization code | UTF-8 | Masked as `*****` if present |
| 5 | Tag | UTF-8 | Text tag; may contain UCID if Aura interworking |
| 6 | Transfer cause | Integer | (set to 0) |
| 7 | Owner huntgroup | UTF-8 | Extension number |
| 8 | Originally targeted huntgroup | UTF-8 | Extension number |
| 9 | Originally targeted user | UTF-8 | Extension number |
| 10 | Currently targeted huntgroup | UTF-8 | Extension number |
| 11 | Currently targeted user | UTF-8 | Extension number |
| 12 | VM message being left | Integer | Local VMPro only |
| 13 | VM message length | Integer | Seconds |
| 14 | Queue/announcement | Integer | 1=Queueing, 3=Listening to announcement |
| 15 | Timestamp | Integer | 1/10 seconds |
| 16 | Huntgroup overflow | Integer | |
| 17 | Transferred out of IVR callflow | Quoted UTF-8 | |
| 18 | Time in IVR callflow | Integer | 1/10 seconds |

---

#### 6.7.3. Party Section Fields (PartyA / PartyB)

Comma-separated:

| # | Field | Type | Description |
|---|-------|------|-------------|
| 1 | **End identifier** | UTF-8 (16 chars) | Unique within SCN. First 8 chars = originating node ID |
| 2 | **Direction** | Integer | `1`=inbound (call came in on this end), `0`=outbound |
| 3 | **State** | Integer | Q.931 call state — see table below |
| 4 | **Audiopath** | Integer | `1`=audio connected, `0`=on hold |
| 5 | **Tone** | Integer | `0`=none, `1`=hold music, `2`=ringback, `3`=dial tone, `6`=busy |
| 6 | **Remote** | Integer | `0`=local to this node, `1`=transiting from another node |
| 7 | **Public line** | Integer | `1`=terminates a public line (ISDN/R2/T1/SIP) |
| 8 | **Flags** | Integer | Bitfield — see below |
| 9 | **Emergency location** | Integer | Location ID for emergency routing |
| 10 | **Equipment classification** | Integer | Device type — see table below |
| 11 | **Equipment type** | Integer | More specific device identifier |
| 12 | **Description** | UTF-8 | Context-dependent (SIP Call-ID, lineID.BChannel, etc.) |
| 13 | **Identity** | UTF-8 | Extension number of IP Office User (if applicable) |
| 14 | **Called Type** | Integer | Call type code — see table below |
| 15 | **Called Reason** | Integer | Reason for call arriving (direction=0) |
| 16 | **DID** | UTF-8 | Called number from ISDN / To URI from SIP (direction=1) |
| 17 | **Dialled** | UTF-8 | Digits pressed by local phone |
| 18 | **OnBehalf** | UTF-8 | Set if call made via Bridge Appearance or Auth code |
| 19 | **Target number** | UTF-8 | Number sent to trunk (direction=0) |
| 20 | **Target subaddr** | UTF-8 | Subaddress sent to trunk (direction=0) |
| 21 | **Purpose** | UTF-8 | Nominal target (huntgroup, skill, diversion) |
| 22 | **CLI** | UTF-8 | Calling party number (true CLI on trunk) |
| 23 | **CLI Presentation** | Integer | `0`=Allowed, `1`=Withheld, `2`=Not available, `100`=Unspecified |
| 24 | **Calling party name type** | Integer | See values below |
| 25 | **Calling party name** | Quoted UTF-8 | |
| 26 | **Related End identifier** | UTF-8 (16 chars) | During certain transfers; may be empty |

##### Call States (field 3)

| Value | State |
|-------|-------|
| 0 | Idle |
| 1 | Ringing |
| 2 | Connected |
| 3 | Disconnecting |
| 7 | Dialling |
| 8 | Dialled |
| 9 | Dial Initiated |
| 15 | Offering |
| 16 | Overlap Receive |
| 17 | Accept |
| 18 | ConnectRequest |
| 19 | Ringback |
| 20 | OGConnect Request |
| 21 | IC Disconnecting |
| 22 | Seized |
| 23 | Completed |
| 24 | Completed Tone |
| 25 | Preserved |

##### Flags Bitfield (field 8)

| Bit | Meaning |
|-----|---------|
| `0x01` | Privacy requested |
| `0x02` | Auto-answered |
| `0x04` | Auto-recorded via VMPro |
| `0x10` | Consent question answered (≥ R11.1) |
| `0x20` | Consent refused (≥ R11.1) |

##### Equipment Classification (field 10)

| Value | Type | Value | Type |
|-------|------|-------|------|
| 1 | Unknown | 16 | Parkslot |
| 2 | ISDNTrunk | 17 | Conference |
| 3 | AlogTrunk | 18 | PagingConference |
| 4 | H323Trunk | 19 | RecordingHandler |
| 5 | SIPTrunk | 20 | S0Trunk |
| 6 | T1Trunk | 21 | MobilePhone |
| 7 | R2Trunk | 22 | GhostHandler |
| 8 | TDMPhone | 23 | IPONotificationHandler |
| 9 | H323Phone | 24 | Alarm call |
| 10 | SIPDevice | 25 | VoiceScreening |
| 11 | DECTPhone | 26 | ConferenceRecorder |
| 12 | Voicemail | 27 | Outdialer |
| 13 | WAVDriver | 28 | WebRTCPhone |
| 14 | Router | 29 | ListenOrCoach |
| 15 | DTEPort | 30 | ConferenceMeetMe |

**Contact center types** (SIPDevice subtypes via Equipment Type):  
`ACCS = 162`, `IPOCC = 163`

##### Called Type (field 14) — Common Values

| Value | Type | Value | Type |
|-------|------|-------|------|
| 0 | Unspecified | 109 | CampOn |
| 1 | International | 110 | Steal |
| 2 | National | 111 | Whisper |
| 3 | NetworkSpecific | 112 | Inclusion |
| 4 | Subscriber | 113 | Coverage |
| 100 | Unspecified | 114 | EConf |
| 101 | Internal | 116 | Conf |
| 102 | Voicemail | 119 | Emergency |
| 103 | ACD | 126 | FaxCall |
| 104 | Paging | 131 | Coach |
| 105 | Direct | 134 | ParkCall |
| 106 | Intrude | 135 | UnParkCall |
| 107 | Priority | 136 | Precision |
| 108 | Pickup | 139 | ACCSGroup |

##### Calling Party Name Type (field 24)

| Value | Meaning |
|-------|---------|
| 0 | Default |
| 1 | Directory match |
| 2 | Explicitly set |
| 4 | Restricted |
| 5 | Internal user |
| 6 | Huntgroup |
| 8 | Conference |
| 9 | External trunk |
| 12 | Voicemail callflow |

---

#### 6.7.4. Target Section Fields

Reduced PartyInfo — same field meanings where names match. All targets have `direction=0`.

| Field | Type |
|-------|------|
| End identifier | UTF-8 (16 chars) |
| Remote | Integer |
| Public line | Integer |
| Equipment classification | Integer |
| Equipment type | Integer |
| Description | UTF-8 |
| Identity | UTF-8 |
| Called Type | Integer |
| Called Reason | Integer |
| Target number | UTF-8 |
| Target subaddr | UTF-8 |
| Purpose | UTF-8 |
| CLI | UTF-8 |
| CLI Presentation | Integer |

---

#### 6.7.5. CallLost

Generated at SCN extremities when a reported PartyA/PartyB disconnects.

| Field | Type | Description |
|-------|------|-------------|
| Node identifier | UTF-8 (8 chars) | Node generating the event |
| End identifier | UTF-8 (16 chars) | Unique call end identity |
| Cleared Inbound | Integer | `1`=cleared from this device, `0`=other reason |
| Cause | Integer | `16`=Normal, `126`=Transfer |
| Timestamp | Integer | 1/10 seconds |

> **Note:** No explicit "call cleared" event exists. Deduce call completion when no parties remain attached.

---

#### 6.7.6. LinkLost

Same as CallLost but generated at **intermediate SCN nodes**.

| Field | Type | Description |
|-------|------|-------------|
| Node identifier | UTF-8 (8 chars) | |
| End identifier | UTF-8 (16 chars) | |
| Cleared Inbound | Integer | |
| Cause | Integer | `16`=Normal, `126`=Transfer |
| Timestamp | Integer | 1/10 seconds |
| Link local reference | UTF-8 | Matches the `Description` field |

---

#### 6.7.7. AttemptReject

Generated when a target user manually rejects a ringing call (e.g., Drop key, DND).

| Field | Type | Description |
|-------|------|-------------|
| Node identifier | UTF-8 (8 chars) | |
| End identifier | UTF-8 (16 chars) | |
| User | UTF-8 | User deflecting the call |
| Qualifier | UTF-8 | Method description (e.g., `"dnd"`) |
| Timestamp | Integer | 1/10 seconds |

---

## 7. Connection Limits

- **Max 3 DevLink3 connections** per single IP Office node
- **Max 3 DevLink3 connections** per SCN (when using multi-node flags)

---

## 8. Version Compatibility

Supported on **IP Office 10.0+** until withdrawn.

---

## 9. Quick Reference: Message Type Codes

| Code | Direction | Message |
|------|-----------|---------|
| `0x002A0001` | → IPO | Test Packet |
| `0x802A0001` | ← IPO | Test Packet Response |
| `0x00300001` | → IPO | Authenticate Request / Challenge Response |
| `0x80300001` | ← IPO | Authenticate Response / Challenge |
| `0x00300011` | → IPO | Devlink3 Event Request |
| `0x80300011` | ← IPO | Devlink3 Event Response |
| `0x10300011` | ← IPO | Devlink3 Event (stream data) |
| `0x00300041` | → IPO | ReadFile Request |
| `0x80300041` | ← IPO | ReadFile Response |

## 10. Quick Reference: Tuple Type Codes

| Code | Tuple |
|------|-------|
| `0x007E0001` | Application Name |
| `0x007D0001` | PBX Type and Version |
| `0x007D0002` | DevLink Variant |
| `0x00760001` | CallDelta3 |
| `0x00760002` | CallDelta2 |
| `0x00760003` | SIPTrack Event |
| `0x00760004` | CMExtn Event |

---

## 11. Typical Connection Flow

```
Client                              IP Office
  |                                     |
  |--- TCP/TLS Connect (50797/50796) -->|
  |                                     |
  |--- Test Packet (optional) --------->|
  |<-- Test Packet Response ------------|
  |                                     |
  |--- Auth Request (username) -------->|
  |<-- Challenge (16 bytes random) -----|
  |--- Challenge Response (SHA1) ------>|
  |<-- Auth Result (SUCCESS + tuples) --|
  |                                     |
  |--- Event Request (flags) ---------->|
  |<-- Event Response (accepted flags) -|
  |                                     |
  |<-- Delta3 events for active calls --|
  |<-- Delta3 events (ongoing stream) --|
  |                                     |
```

---

## Appendix A: C# Reference Implementation

> Source: Avaya IP Office DevLink3 Tutorial, Issue 1.2 (01 Aug 2025)

This appendix contains a complete C# implementation covering connection, authentication, and event streaming. Use as a reference for porting to other languages.

### A.1. Required Namespaces

```csharp
using System;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Security.Cryptography;
```

### A.2. Packet Type & Response Constants

```csharp
public static class PacketTypes
{
    public static string Test           { get { return "002A0001"; } }
    public static string TestR          { get { return "802A0001"; } }
    public static string Authenticate   { get { return "00300001"; } }
    public static string AuthenticateR  { get { return "80300001"; } }
    public static string EventRequest   { get { return "00300011"; } }
    public static string EventRequestR  { get { return "80300011"; } }
    public static string Event          { get { return "10300011"; } }
}

public static class Response
{
    public static string Pass        { get { return "00000000"; } }
    public static string Fail        { get { return "80000041"; } }
    public static string Challenge   { get { return "00000002"; } }
    public static string UnknownFlag { get { return "80000021"; } }
}
```

### A.3. Hex Encoding Helper

Converts a hex string (e.g. `"49002A"`) into a `byte[]`:

```csharp
private byte[] HexOcttoByte(string input)
{
    var length = input.Length / 2;
    var output = new byte[length];
    for (var i = 0; i < length; i++)
    {
        output[i] = Convert.ToByte(input.Substring((i * 2), 2), 16);
    }
    return output;
}
```

### A.4. Packet Class

Each DevLink3 packet is composed of a header, a unique request ID, and a body.

```csharp
class Packet
{
    private byte[] Pbytes, Headerbytes, RIDBodybytes;
    public string hexheader, requestid, body, pktlength;

    public byte[] Bytes { get { return Pbytes; } }

    // --- Request ID generation ---
    private string RequestID()
    {
        Random seed = new Random();
        int arb = seed.Next();
        requestid = arb.ToString("D8");
        if (requestid.Length > 8)
            requestid = requestid.Substring(0, 8);
        return requestid;
    }

    // --- Build final byte array for transmission ---
    public void BuildBuffer()
    {
        RIDBodybytes = HexOcttoByte(RequestID() + body);

        pktlength = (3 + (hexheader.Length / 2) + (requestid.Length / 2) 
                       + (body.Length / 2)).ToString("X4");

        Headerbytes = HexOcttoByte("49" + pktlength + hexheader);
        Pbytes = new byte[Headerbytes.Length + RIDBodybytes.Length];
        Buffer.BlockCopy(Headerbytes, 0, Pbytes, 0, Headerbytes.Length);
        Buffer.BlockCopy(RIDBodybytes, 0, Pbytes, Headerbytes.Length, RIDBodybytes.Length);
    }
```

#### Constructor: Test Packet

```csharp
    // Base constructor — handles Test packets
    public Packet(string hexvalue)
    {
        hexheader = hexvalue;
        if (hexvalue == PacketTypes.Test)
        {
            body = "00000000";
        }
    }
```

#### Constructor: Auth Request / Event Request (string payload)

```csharp
    // Auth request (username) or Event request (flags)
    public Packet(string hexvalue, string txt) : this(hexvalue)
    {
        if (hexheader == PacketTypes.Authenticate)
        {
            // body = 0x00000001 (Request) + NULL-terminated UTF-8 username
            body = "00000001" + BitConverter.ToString(
                Encoding.UTF8.GetBytes(txt.Trim() + Char.MinValue)
            ).Replace("-", string.Empty);
        }

        if (hexheader == PacketTypes.EventRequest)
        {
            // body = 2-byte length + NULL-terminated UTF-8 flags string
            txt = txt + Char.MinValue;
            body = (txt.Length / 2).ToString("X4") + BitConverter.ToString(
                Encoding.UTF8.GetBytes(txt.Trim())
            ).Replace("-", string.Empty);
        }
    }
```

#### Constructor: SHA1 Challenge Response

```csharp
    // SHA1 challenge response
    public Packet(string hexvalue, byte[] challenge, string password) : this(hexvalue)
    {
        if (hexheader == PacketTypes.Authenticate)
        {
            // Prepare 16-byte UTF-8 password (zero-padded, truncated to 16)
            byte[] utf8pwd = new byte[16];
            byte[] pwdRaw = Encoding.UTF8.GetBytes(password.Trim());
            Buffer.BlockCopy(pwdRaw, 0, utf8pwd, 0, 
                (pwdRaw.Length < 17) ? pwdRaw.Length : 16);

            // Concatenate: challenge (16 bytes) + password (16 bytes) = 32 bytes
            byte[] HashBytes = new byte[challenge.Length + 16];
            Buffer.BlockCopy(challenge, 0, HashBytes, 0, challenge.Length);
            Buffer.BlockCopy(utf8pwd, 0, HashBytes, challenge.Length, 16);

            // SHA1 hash → 20 bytes
            SHA1 sha = SHA1.Create();
            byte[] HashOutp = sha.ComputeHash(HashBytes);

            string response = BitConverter.ToString(HashOutp).Replace("-", string.Empty);

            // body = 0x00000050 (ChallengeResponse) + length (4 bytes) + hash
            body = "00000050" + (response.Length / 2).ToString("X8") + response;
        }
    }
}
```

### A.5. TCP Connection Management

```csharp
private TcpClient client;
private NetworkStream stream;
private Thread background;
private string pendingRequest;

private bool StartComms()
{
    bool retvalue = true;
    if (background == null)
    {
        retvalue = false;
        if (string.IsNullOrWhiteSpace(IPOaddress.Text))
        {
            this.SetText("Need IPO address\r\n");
        }
        else
        {
            this.SetText("Attempting establish connection\r\n");
            try
            {
                client = new TcpClient(IPOaddress.Text, 50797); // TCP port
                stream = client.GetStream();

                background = new Thread(Receive);
                background.Start();

                retvalue = true;
                this.SetText("Connected\r\n");
            }
            catch
            {
                this.SetText("Could not connect\r\n");
                retvalue = false;
            }
        }
    }
    return retvalue;
}
```

### A.6. Sending a Test Packet

```csharp
private void TestPkt_Click(object sender, EventArgs e)
{
    if (StartComms())
    {
        Packet STest = new Packet(PacketTypes.Test);
        STest.BuildBuffer();
        stream.Write(STest.Bytes, 0, STest.Bytes.Length);
    }
}
```

### A.7. Initiating Authentication

```csharp
private void Connect_Click(object sender, EventArgs e)
{
    if (StartComms())
    {
        Packet STest = new Packet(PacketTypes.Authenticate, UserName.Text);
        STest.BuildBuffer();
        pendingRequest = STest.requestid;
        stream.Write(STest.Bytes, 0, STest.Bytes.Length);
    }
}
```

### A.8. Response Parsing Helpers

```csharp
private string ParseHeader(byte[] Data)
{
    return BitConverter.ToString(Data, 0)
        .Replace("-", string.Empty).Substring(6, 8);
}

private string ParseRequestID(byte[] Data)
{
    return BitConverter.ToString(Data, 0)
        .Replace("-", string.Empty).Substring(14, 8);
}

private string ParseResponse(byte[] Data)
{
    return BitConverter.ToString(Data, 0)
        .Replace("-", string.Empty).Substring(22, 8);
}

private byte[] GetChallenge(byte[] Data)
{
    int size = Convert.ToInt16(Data[18]);
    byte[] result = new byte[size];
    Buffer.BlockCopy(Data, 19, result, 0, size);
    return result;
}
```

### A.9. Full Receive Loop (Background Thread)

This is the main event loop that handles the entire auth handshake and event streaming:

```csharp
public void Receive()
{
    byte[] bytes = new byte[1024];
    while (true)
    {
        int bytesRead = stream.Read(bytes, 0, bytes.Length);

        // --- Authentication Response ---
        if (ParseHeader(bytes) == PacketTypes.AuthenticateR)
        {
            if ((ParseRequestID(bytes) == pendingRequest) && (bytesRead > 16))
            {
                // Step 1: Received SHA1 Challenge → send challenge response
                if (ParseResponse(bytes) == Response.Challenge)
                {
                    Packet RTest = new Packet(
                        PacketTypes.Authenticate, 
                        GetChallenge(bytes), 
                        Password.Text
                    );
                    RTest.BuildBuffer();
                    pendingRequest = RTest.requestid;
                    stream.Write(RTest.Bytes, 0, RTest.Bytes.Length);
                }
                // Step 2a: Auth failed
                else if (ParseResponse(bytes) == Response.Fail)
                {
                    this.SetText("\r\n Authentication failed");
                }
                // Step 2b: Auth succeeded → register for events
                else if (ParseResponse(bytes) == Response.Pass)
                {
                    this.SetText("\r\n Authenticate succeeded");

                    Packet ETest = new Packet(
                        PacketTypes.EventRequest, 
                        EventFlags.Text.Trim()  // e.g. "-SIPTrack"
                    );
                    ETest.BuildBuffer();
                    pendingRequest = ETest.requestid;
                    stream.Write(ETest.Bytes, 0, ETest.Bytes.Length);
                }
            }
        }

        // --- Test Response ---
        if (ParseHeader(bytes) == PacketTypes.TestR)
            this.SetText("\r\n Test responded");

        // --- Event Registration Response ---
        if (ParseHeader(bytes) == PacketTypes.EventRequestR)
        {
            if (ParseResponse(bytes) == Response.UnknownFlag)
                this.SetText("\r\n Event unknown flag string");
            else if (ParseResponse(bytes) == Response.Pass)
                this.SetText("\r\n Event register success");
        }

        // --- Stream Events (Delta3/Delta2/SIPTrack/CMExtn) ---
        if (ParseHeader(bytes) == PacketTypes.Event)
            this.SetText("\r\n Event received");
    }
}
```

### A.10. Authentication Flow Summary

```
1. Client → IPO:  Packet(Authenticate, username)     body = 00000001 + UTF8(username\0)
2. IPO → Client:  AuthenticateR + Challenge(SHA1)     16 bytes random challenge
3. Client → IPO:  Packet(Authenticate, challenge, pw) body = 00000050 + len + SHA1(challenge+pw)
4. IPO → Client:  AuthenticateR + Success/Fail
5. Client → IPO:  Packet(EventRequest, "-SIPTrack")   body = length + UTF8(flags\0)
6. IPO → Client:  EventRequestR + Success
7. IPO → Client:  Stream events (ongoing)
```

### A.11. Byte Layout Reference (Parsing Offsets)

These offsets map to the hex string positions used in the parsing helpers:

```
Byte offset   Hex string pos   Field
─────────────────────────────────────────
0             [0..1]           0x49 discriminator
1-2           [2..5]           Frame length (2 bytes)
3-6           [6..13]          Packet type (4 bytes)    ← ParseHeader
7-10          [14..21]         Request ID (4 bytes)     ← ParseRequestID  
11-14         [22..29]         Response/SubType (4 bytes) ← ParseResponse
15-18         [30..]           Payload-specific data
```

> **Note:** The `GetChallenge` function reads challenge length from `Data[18]` and challenge data starting at `Data[19]`, which corresponds to the payload area after the response code and length prefix.
