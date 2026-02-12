# Recording Integration Specification
## For CallDoc - Avaya IP Office 11 Call Recording Module

---

## 1. Recording Capture Methods (Avaya Side)

### Method A: Voicemail Pro Recording (Passive/Traditional)
- Voicemail Pro acts as recording engine, consuming voicemail/AA channels
- Recordings land in VRL directory: `/opt/vmpro/VRL` (Linux)
- Files produced as **.wav** (default) or **.opus** (`UseOpusForRecordings` setting)
- Configurable: per-user, per-hunt-group, per-incoming-call-route, per-account-code
- Auto recording: 0-100% of calls, inbound and/or outbound
- Manual recording: Agent presses DSS key (`CallRecord` action)
- Max capacity: up to 500 channels (Dual VM Pro), 7,200-10,000 BHCC on Linux

### Method B: VRTX Hardware Recording (Network Tap)
- Physical device taps PRI trunk lines via USB
- Records live RTP packets without consuming VM channels
- Supports live listen capability

### Method C: Active Recording via DevLink3 (IP Office 11.0.4+)
- Line-side recording, audio received directly from phone via DevLink3
- No VRTX hardware or VM Pro channels required
- Most modern approach, aligned with our DevLink3 connector

### Licensing
- CTI Link Pro license (already required for DevLink3)
- Voice Recording Administrators license for VRL
- Per-channel recording port licenses

---

## 2. Recording Retrieval and Call Matching

### Retrieval Mechanisms
- **VM Pro method**: FTP/SFTP from VM Pro VRL directory (required for IP Office 10.1+)
- **VRTX method**: USB from VRTX device
- **Active Recording**: Audio received directly over DevLink3 connection

### Call-to-Recording Matching Algorithm
1. Call logging engine records events via DevLink3 (with call IDs, timestamps, extensions)
2. Recording ingestion service picks up audio file
3. Extract metadata from recording (timestamps, extension, call identifiers)
4. Correlate to call record using multi-strategy matching:
   - **Primary**: Direct Call ID match (DevLink3 active recording, stream_id)
   - **Secondary**: Timestamp + extension window matching
   - **Tertiary**: Manual association

---

## 3. File Formats and Compression

| Source | Raw Format | Codec | Size/Minute |
|--------|-----------|-------|-------------|
| Voicemail Pro (default) | .wav | G.711 | ~0.5-1 MB/min |
| Voicemail Pro (opus) | .opus | Opus | Smaller |
| Chronicall compressed | .spx | Speex | ~100 KB/min |

### Our Choice: Opus Codec
- Successor to Speex, ~100 KB/min
- Browser-native support via `<audio>` with OGG container
- Excellent voice quality at low bitrates

---

## 4. Storage Architecture

### Storage Pool System
- Local pools (Docker volume for MVP)
- S3-compatible pools (MinIO for self-hosted, production)
- Configurable max size, write/delete restrictions per pool
- Pool-level retention policies

### Storage Math
- Opus at ~100 KB/min: **32 GB = ~5,300 hours of recordings**
- One agent, 8hr/day, every workday, 2 years = ~32 GB

### Retention Policies
- "Never delete recordings newer than X days"
- "Delete recordings older than X days"
- Background job enforces policies

---

## 5. Playback Features (Match Chronicall)

- **Inline waveform player** (wavesurfer.js) in Cradle-to-Grave view
- **Playback speed control**: 0.5x, 1x, 1.5x, 2x (pitch-preserved)
- **Download**: .WAV export, permission-gated
- **External listen links**: Signed URLs with configurable TTL
- **Waveform notes**: Timestamped markers on recording timeline
- **Snippet creation**: Select portion for download/email
- **Recording deletion**: Admin-only with warnings

### Permission Model
- Listen: Per-role (supervisor + admin default)
- Download/Email: Admin/manager, grantable to agents
- Delete: Admin only

---

## 6. Recording Rules Engine (7 Rule Types)

| Rule Type | Description |
|-----------|-------------|
| Inbound Number Dialed | Records calls to specific DID/DNIS |
| External Number | Records calls involving external numbers |
| Agent | Records specific agents/extensions |
| Group | Records calls from hunt/work groups |
| Basic Call Event | Group/agent with direction filtering |
| Advanced Call Event | Specific recording with event conditions |
| Advanced Call (To this point) | Records up to a specific event |

Per-rule config: Record percentage (0-100%), direction filter, external party criteria.

---

## 7. Quality Scorecards

### Question Types
| Type | Points |
|------|--------|
| Yes/No | Yes=10, No=0 |
| Scale 1-10 | Points = selected |
| Free-form text | No points |

### Workflow
- Access via Cradle-to-Grave or Score Recordings section
- "Score Next" checkbox for batch scoring
- Reports: Agent/Group Scorecard Summary, Scores by Agent/Group

---

## 8. PCI Compliance (Pause/Resume)

### Approaches (Ranked by Security)
1. **Manual Pause/Resume** -- Agent-triggered, human error risk
2. **Automated Pause/Resume** -- System-detected payment workflow
3. **DTMF Masking** -- Gold standard, customer enters via keypad

### Our Implementation
- API-triggered pause/resume: `POST /api/recordings/:id/pause|resume`
- Visual indicator in UI (recording dot state)
- Audit trail in `recording_pause_events` table
- Auto-resume timeout (configurable, e.g., 3 minutes)
- Future: DTMF masking integration point

---

## 9. Database Schema

```sql
-- Recording storage pools
recording_storage_pools (
  id, name, pool_type, -- 'local' | 'network' | 's3'
  path, credentials_encrypted,
  max_size_bytes, current_size_bytes,
  write_enabled, delete_enabled,
  retention_min_days, retention_max_days,
  created_at, updated_at
)

-- Recording rules
recording_rules (
  id, name, rule_type, -- 'agent' | 'group' | 'number' | 'direction' | 'advanced'
  conditions_json,
  record_percentage,
  is_active, priority,
  created_at, updated_at
)

-- Call recordings (extend existing)
call_recordings (
  id, call_id, storage_pool_id,
  file_path, file_name,
  original_format, stored_format, -- 'wav' -> 'opus'
  codec, sample_rate, channels,
  duration_ms, file_size_bytes,
  source_type, -- 'vmpro_ftp' | 'vrtx' | 'devlink3_active' | 'manual_upload'
  match_method, -- 'call_id' | 'timestamp_extension' | 'stream_id' | 'manual'
  match_confidence,
  pci_paused_segments_json,
  is_deleted, deleted_at, deleted_by,
  created_at
)

-- Recording notes (timestamped markers on waveform)
recording_notes (
  id, recording_id, user_id,
  timestamp_ms,
  note_text,
  created_at, updated_at
)

-- Recording PCI pause events
recording_pause_events (
  id, recording_id, user_id,
  event_type, -- 'pause' | 'resume' | 'auto_resume'
  timestamp_ms, reason,
  created_at
)

-- Quality scorecards
scorecard_templates (
  id, name, description,
  questions_json,
  is_active,
  created_at, updated_at
)

-- Scorecard responses
scorecard_responses (
  id, recording_id, scorecard_template_id,
  evaluator_user_id, agent_user_id,
  answers_json,
  total_score, max_possible_score, score_percentage,
  completed_at, created_at
)

-- External listen links
recording_share_links (
  id, recording_id, created_by_user_id,
  token_hash,
  expires_at,
  snippet_start_ms, snippet_end_ms,
  access_count,
  created_at
)
```

---

## 10. Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Compression | Opus (not Speex) | Browser-native, Speex successor, ~100KB/min |
| Waveform player | wavesurfer.js | Regions, markers, zoom, speed control |
| File retrieval | ssh2-sftp-client | Required for VM Pro on IPO 10.1+ |
| Call matching | Multi-strategy | call_id -> timestamp+ext -> stream_id -> manual |
| Storage | Docker volume (MVP), S3 (prod) | MinIO for self-hosted S3 |
| PCI | API pause/resume + auto-resume | + audit trail |
| External links | HMAC-signed JWT with TTL | Stateless, configurable expiry |
| Audio streaming | HTTP Range requests | Standard HTML5 audio seeking |
