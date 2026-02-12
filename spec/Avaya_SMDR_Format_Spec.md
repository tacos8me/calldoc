# Avaya IP Office 11 SMDR Format Specification
## For CallDoc - Backup/Reconciliation Data Source

---

## 1. Overview

SMDR (Station Message Detail Recording) is Avaya IP Office's native call detail recording mechanism. Each record is generated for every call segment between two devices. Records are output as **comma-separated values (CSV)** with variable-width fields, one record per line, newline-terminated.

---

## 2. TCP Connection / Transport

| Setting | Value |
|---------|-------|
| **Protocol** | TCP |
| **Default Port** | 1150 (first site), 1151 (second), 1152 (third) |
| **Connection Model** | IP Office acts as TCP **client** -- pushes records to a listening server |
| **Alternative Model** | Set SMDR IP to `0.0.0.0` and IP Office accepts inbound connections |
| **Buffer** | Up to 3,000 records buffered if connection is down |
| **Retry** | IP Office retries sending with every new call |

### Configuration in IP Office Manager:
1. System -> CDR/SMDR tab
2. Set Output to "SMDR only"
3. Enter IP Address of receiving server
4. Enter TCP Port (e.g., 1150)
5. Set Records to Buffer to maximum (3000)
6. Save and Merge

---

## 3. Complete Field Specification (30+ Fields)

### CSV Header:
```
Call Start,Connected Time,Ring Time,Caller,Direction,Called Number,Dialled Number,Account,Is Internal,Call ID,Continuation,Party1Device,Party1Name,Party2Device,Party2Name,Hold Time,Park Time,AuthValid,AuthCode,User Charged,Call Charge,Currency,Amount at Last User Change,Call Units,Units at Last User Change,Cost per Unit,Mark Up,External Targeting Cause,External Targeter Id,External Targeted Number
```

| # | Field Name | Type | Format | Description |
|---|-----------|------|--------|-------------|
| 1 | Call Start | datetime | `YYYY/MM/DD HH:MM:SS` | Call initiation timestamp |
| 2 | Connected Time | duration | `HH:MM:SS` | Talking duration (excludes ring/hold/park) |
| 3 | Ring Time | integer | Seconds | Time between arrival and answer |
| 4 | Caller | string | Alphanumeric | Originating number (extension or CLI) |
| 5 | Direction | char | `I` or `O` | `I`=Inbound, `O`=Outbound (internal calls are `O`) |
| 6 | Called Number | string | Alphanumeric | Originally dialed number |
| 7 | Dialled Number | string | Alphanumeric | DDI digits received (inbound) or dialed digits (outbound) |
| 8 | Account | string | Alphanumeric | Last account code attached |
| 9 | Is Internal | integer | `0`/`1` | `1`=Both parties internal |
| 10 | Call ID | integer | Starts at 1,000,000 | Unique call identifier (shared across continuations) |
| 11 | Continuation | integer | `0`/`1` | `1`=More records follow, `0`=Final record |
| 12 | Party1Device | string | Prefix+Number | Device ID (see prefix table) |
| 13 | Party1Name | string | Text | User/trunk name |
| 14 | Party2Device | string | Prefix+Number | Device ID |
| 15 | Party2Name | string | Text | User/trunk name |
| 16 | Hold Time | integer | Seconds | Total hold duration |
| 17 | Park Time | integer | Seconds | Total park duration |
| 18 | AuthValid | integer | `0`/`1` | Valid authorization code used |
| 19 | AuthCode | string | Alphanumeric | Authorization code or `n/a` |
| 20 | User Charged | string | Text | User assigned charges |
| 21 | Call Charge | float | Decimal | Calculated charge |
| 22 | Currency | string | Text | Currency setting |
| 23 | Amount at Last User Change | float | Decimal | AoC at transfer point |
| 24 | Call Units | string | Text | Total call units |
| 25 | Units at Last User Change | string | Text | AoC units at transfer |
| 26 | Cost per Unit | float | Decimal | Rate per line |
| 27 | Mark Up | string | Text | User markup percentage |
| 28 | External Targeting Cause | string | Two-part code | Who/what caused external call |
| 29 | External Targeter Id | string | Text | Targeting entity name |
| 30 | External Targeted Number | string | Alphanumeric | External number called |

### R11 Additional Fields (31-35):

| # | Field Name | Description |
|---|-----------|-------------|
| 31 | Calling Party Server IP | Server IP of calling party |
| 32 | Unique Call ID (Caller) | Globally unique caller call ID |
| 33 | Called Party Server IP | Server IP of called party |
| 34 | Unique Call ID (Called) | Globally unique called call ID |
| 35 | SMDR Record Time | Actual record generation time |

---

## 4. Device Type Prefixes

| Prefix | Format | Meaning | Example |
|--------|--------|---------|---------|
| **E** | `E` + extension | Internal extension | `E4324` |
| **T** | `T` + (9000 + line) | Trunk line | `T9001` = Line 1.1 |
| **V** | `V` + (9500 + channel) | Voicemail channel | `V9501` = VM Channel 1 |
| **V** | `V` + (9550 + channel) | Conference channel | `V9551` = CO Channel 1 |

**Rule:** When extension + trunk both involved, extension is always Party1.

---

## 5. External Targeting Cause Codes

**Source codes:**
| Code | Meaning |
|------|---------|
| `HG` | Hunt Group |
| `U` | User |
| `LINE` | Line |
| `AA` | Auto Attendant |
| `ICR` | Incoming Call Route |
| `MT` | Mobile Twinning |

**Reason codes:**
| Code | Meaning |
|------|---------|
| `fb` | Forward on Busy |
| `fu` | Forward Unconditional |
| `fnr` | Forward on No Response |
| `fdnd` | Forward on DND |
| `XfP` | Transfer proposal |
| `Xfd` | Transferred call |
| `CfP` | Conference proposal |
| `Cfd` | Conferenced |

---

## 6. Call Direction Logic

| Direction | Is Internal | Call Type |
|-----------|-------------|-----------|
| `I` | `0` | Inbound external |
| `O` | `0` | Outbound external |
| `O` | `1` | Internal (ext-to-ext) |
| `I` | `1` | Internal (rare, transfer continuations) |

---

## 7. Continuation Records

When a call is transferred/conferenced/parked, the current segment terminates and a new record is generated. All records share the **same Call ID**.

- `Continuation = 1`: More records coming for this Call ID
- `Continuation = 0`: Final record for this Call ID

### Example (Transfer to Voicemail):
```csv
2002/06/28 09:30:57,00:00:13,7,01707392200,I,299999,299999,,0,1000014160,1,E4750,John Smith,T9002,LINE 1.2,11,0
2002/06/28 09:30:57,00:00:21,0,01707392200,I,299999,299999,,0,1000014160,0,V9502,VM Channel 2,T9002,LINE 1.2,0,0
```

---

## 8. Parsing Considerations

1. **Delimiter:** Comma. Fields are NOT quoted.
2. **No CSV header in TCP stream** -- map fields by position.
3. **Empty fields:** Two consecutive commas (`,,`).
4. **Call reconstruction:** Group by Call ID, process in order. Last record has Continuation=0.
5. **Duration calc:** Total = Connected Time + Ring Time + Hold Time + Park Time.
6. **Trunk numbering:** `T9161` = line (9161-9000) = 161 = Line 5.1.
7. **Strip leading nulls:** Some implementations see `\0` bytes at start of TCP data.

---

## 9. Existing Parsers (Reference)

| Project | Language | URL |
|---------|----------|-----|
| SMDR-Logger | Perl | github.com/hexnet/SMDR-Logger |
| SMDRReader | C# | github.com/kiwipiet/SMDRReader |
| avaya-smdr-elasticstack | ELK | github.com/OzWookiee/avaya-smdr-elasticstack |
