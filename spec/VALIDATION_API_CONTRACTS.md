# API & Type Contract Validation

> Generated from cross-referencing all 6 spec files. Each finding cites `file:section`.
> Canonical sources: COMPONENT_ARCHITECTURE.md (CA), PROJECT_ROADMAP.md (PR), DevLink3_Protocol_Spec.md (DL3), Avaya_SMDR_Format_Spec.md (SMDR), Recording_Integration_Spec.md (REC), FRONTEND_UX_SPEC.md (UX).

---

## 1. Missing API Routes

UI features that have no corresponding API route in CA:Section 6.

| # | Feature | Spec Reference | Required Route | Status |
|---|---------|---------------|----------------|--------|
| 1 | Alert rule CRUD + history | PR:T3.7, UX:Section 7.5 (status tooltip shows service health) | `GET/POST/PUT/DELETE /api/admin/alerts` | **MISSING** |
| 2 | Alert history log | PR:T3.7 (`alert_history` table) | `GET /api/alerts/history` | **MISSING** |
| 3 | Hunt group list/detail | PR:DB schema (`hunt_groups`, `hunt_group_members`), UX:Section 3.5.5 GroupBoxWidget | `GET /api/groups`, `GET /api/groups/[id]` | **MISSING** |
| 4 | Trunk list/status | PR:DB schema (`trunks`, `trunk_groups`), UX:Section 3.4 T3.4 Trunk Utilization widget | `GET /api/trunks` | **MISSING** |
| 5 | Skill group CRUD | PR:T1.7 skill_groups, skill_group_members, skill_routing_rules | `GET/POST/PUT/DELETE /api/admin/skill-groups` | **MISSING** |
| 6 | System connections CRUD | PR:T1.8 lists explicit routes `POST/GET/PUT/DELETE /api/system/connections` | `/api/system/connections`, `/api/system/status` | **MISSING** from CA route table |
| 7 | SAML metadata/config endpoints | PR:T2.1 lists `GET /auth/saml/metadata`, logout, SLO | `GET /api/auth/saml/metadata`, `GET /api/auth/saml/logout`, `POST /api/auth/saml/slo` | **MISSING** (CA only has `[...saml]` catch-all) |
| 8 | User preferences (color legend, layout, filter presets) | PR:DB `user_preferences`, UX:Section 4.2 color legend | `GET/PUT /api/users/[id]/preferences` | **MISSING** |
| 9 | Saved filters | PR:DB `saved_filters` | `GET/POST/DELETE /api/filters` | **MISSING** |
| 10 | Report schedules CRUD | PR:T4.5, CA:types `ReportSchedule` | `GET/POST/PUT/DELETE /api/reports/schedules` | **MISSING** |
| 11 | Scorecard templates CRUD | REC:Section 9, PR:DB `scorecard_templates` | `GET/POST/PUT/DELETE /api/admin/scorecard-templates` | **MISSING** |
| 12 | Recording deletion | REC:Section 5, UX:RecordingRow ActionButtons | `DELETE /api/recordings/[id]` | **MISSING** (only GET exists) |
| 13 | Recording download | UX:Section 8.5, REC:Section 5 | `GET /api/recordings/[id]/download` | **MISSING** (stream exists, but download as WAV is separate) |
| 14 | Call notes CRUD | PR:DB `call_notes`, UX:Section 5.2 "Add Note" | `GET/POST /api/calls/[id]/notes` | **MISSING** |
| 15 | Agent-extension mapping | PR:T2.4 | `GET/PUT /api/users/[id]/mapping` | **MISSING** from CA route table |
| 16 | Bulk user import (CSV) | CA:Section 2.7 `BulkImportButton` | `POST /api/admin/users/import` | **MISSING** |

---

## 2. Missing TypeScript Types

Types referenced or implied by specs but absent from CA:Section 7.

| # | Type Needed | Referenced By | Notes |
|---|-------------|---------------|-------|
| 1 | `SmdrRecord` | SMDR:Section 3 (30+ fields), PR:T1.6 | No TS interface for the 35-field SMDR record |
| 2 | `DevLink3Packet` | DL3:Section 2-3 (packet structure, types) | No TS type for raw packet framing |
| 3 | `Delta3Detail` / `Delta3CallLost` / `Delta3AttemptReject` | DL3:Section 9 (XML record types) | No TS interfaces for parsed Delta3 XML records |
| 4 | `DevLink3CallState` (numeric enum 0-13) | DL3:Section 10 | CA defines string `CallState`; no mapping type for wire-level numeric values |
| 5 | `EquipmentType` (enum) | DL3:Section 11 | Not defined in CA types |
| 6 | `CalledType` (enum) | DL3:Section 12 | Not defined in CA types |
| 7 | `CauseCode` (enum) | DL3:Section 14 | Not defined in CA types |
| 8 | `AlertRule` | PR:T3.7, DB `alert_rules` | No TS interface |
| 9 | `AlertHistory` | PR:T3.7, DB `alert_history` | No TS interface |
| 10 | `HuntGroup` | PR:DB `hunt_groups` | No TS interface |
| 11 | `Trunk` / `TrunkGroup` | PR:DB `trunks`, `trunk_groups` | No TS interface |
| 12 | `SkillGroup` / `SkillRoutingRule` | PR:T1.7 | No TS interface |
| 13 | `SamlConfig` | PR:DB `saml_configs`, T2.1 | No TS interface |
| 14 | `SystemConnection` | PR:DB `systems`, T1.8 | No TS interface |
| 15 | `SavedFilter` | PR:DB `saved_filters` | No TS interface |
| 16 | `ScorecardTemplate` | REC:Section 9, PR:DB `scorecard_templates` | CA has `ScoreCard` and `ScoreCategory` but no template type |
| 17 | `RecordingRule` (full) | REC:Section 6 (7 rule types) | No typed `conditions_json` structure |
| 18 | `StoragePool` | REC:Section 4, PR:DB `recording_storage_pools` | No TS interface |
| 19 | `UserPreference` | PR:DB `user_preferences` | No TS interface |
| 20 | `CallNote` | PR:DB `call_notes` | No TS interface (only recording notes exist) |
| 21 | Request/Response types for mutations | CA:Section 6 | POST/PUT bodies and response shapes are implied but not explicitly typed (e.g., `CreateReportRequest`, `UpdateWallboardRequest`) |

---

## 3. DB-to-API Mapping Gaps

Every DB table (PR:DB Schema) mapped to its API coverage.

| DB Table | API Route | Status |
|----------|-----------|--------|
| `systems` | None | **ORPHAN** -- needs `/api/system/connections` |
| `system_status` | None | **ORPHAN** -- needs `/api/system/status` |
| `saml_configs` | `/api/auth/[...saml]` (implicit) | **PARTIAL** -- no explicit CRUD |
| `sessions` | Redis-backed, no direct API | OK (internal) |
| `agent_mappings` | None | **ORPHAN** -- needs `/api/users/[id]/mapping` |
| `user_preferences` | None | **ORPHAN** -- needs `/api/users/[id]/preferences` |
| `call_notes` | None | **ORPHAN** -- needs `/api/calls/[id]/notes` |
| `smdr_records` | None | **ORPHAN** (internal ingestion only -- acceptable if no UI) |
| `smdr_reconciliation` | None | **ORPHAN** (internal -- acceptable) |
| `hunt_groups` | None | **ORPHAN** -- needs `/api/groups` |
| `hunt_group_members` | None | **ORPHAN** -- covered by groups API |
| `trunks` / `trunk_groups` | None | **ORPHAN** -- needs `/api/trunks` |
| `skill_groups` / `skill_group_members` / `skill_routing_rules` | None | **ORPHAN** -- needs admin API |
| `alert_rules` / `alert_history` | None | **ORPHAN** -- needs `/api/admin/alerts` |
| `saved_filters` | None | **ORPHAN** -- needs `/api/filters` |
| `report_schedules` | None | **ORPHAN** -- needs `/api/reports/schedules` |
| `scorecard_templates` | None | **ORPHAN** -- needs `/api/admin/scorecard-templates` |
| `recording_share_links` | `/api/recordings/[id]/share` | OK |
| `recording_pause_events` | `/api/recordings/[id]/pause\|resume` | OK |
| `agent_groups` / `agent_group_members` | None | **ORPHAN** -- needs API or merge with hunt_groups |
| `wallboard_widgets` | Covered by `/api/wallboards/[id]` (nested) | OK |

**Summary**: 14 tables have no API route. 2 are acceptable (SMDR internals). 12 need routes added.

---

## 4. DevLink3 Event Coverage

DL3:Section 9 defines record types. DL3:Sections 10-14 define enumerations. CA:Section 7 defines application-level types.

### 4.1 Delta3 Record Types to TypeScript Interfaces

| Delta3 Record | TS Interface | Status |
|---------------|-------------|--------|
| `Detail` (call snapshot) | None | **MISSING** -- needs `Delta3DetailRecord` |
| `CallLost` (party disconnect) | None | **MISSING** -- needs `Delta3CallLostRecord` |
| `LinkLost` (node disconnect) | None | **MISSING** -- needs `Delta3LinkLostRecord` |
| `AttemptReject` (call rejected) | None | **MISSING** -- needs `Delta3AttemptRejectRecord` |

### 4.2 DevLink3 Wire Enumerations

| DL3 Enum | Values | TS Type | Status |
|----------|--------|---------|--------|
| Call State (numeric 0-13) | DL3:Section 10 | `CallState` (string union in CA) | **MISMATCH** -- CA uses string literals; need numeric-to-string mapping type |
| Equipment Type | DL3:Section 11 (8 values) | None | **MISSING** |
| Called Type | DL3:Section 12 (5 values) | None | **MISSING** |
| Flags Bitfield | DL3:Section 13 (5 bits) | None | **MISSING** |
| Cause Code | DL3:Section 14 (12 values) | None | **MISSING** |
| Packet Type | DL3:Section 3 (9 types) | None | **MISSING** |
| Response Code | DL3:Section 4 (4 values) | None | **MISSING** |
| Tuple Code | DL3:Section 8 (7 values) | None | **MISSING** |

### 4.3 DevLink3 Call Event Mapping

PR:T1.3 lists these event types that must map to `CallEventType` (CA:Section 7):

| DevLink3 Event (PR:T1.3) | CA `CallEventType` member | Status |
|---------------------------|--------------------------|--------|
| CallCreated | `initiated` | OK (name differs, mapping needed) |
| CallRinging | `ringing` | OK |
| CallAnswered | `answered` | OK |
| CallHeld | `held` | OK |
| CallRetrieved | `retrieved` | OK |
| CallTransferred | `transferred` | OK |
| CallConferenced | `conferenced` | OK |
| CallDisconnected | `completed` | OK (name differs) |
| CallQueued | `queued` | OK |
| CallDequeued | None | **MISSING** -- no `dequeued` in `CallEventType` |
| CallParked | `parked` | OK |
| AgentLogin | None | **MISSING** from `CallEventType` (belongs in `AgentEventType`) |
| AgentLogout | None | **MISSING** (agent domain) |
| AgentReady | None | **MISSING** (agent domain) |
| AgentNotReady | None | **MISSING** (agent domain) |
| AgentDND | None | **MISSING** (agent domain) |
| AgentACW | None | **MISSING** (agent domain) |
| AgentMCW | None | **MISSING** (agent domain) |
| TrunkBusy | None | **MISSING** (system domain) |
| TrunkIdle | None | **MISSING** (system domain) |
| HuntGroupStatus | None | **MISSING** (system domain) |

**Finding**: CA only defines `CallEventType`. Agent, trunk, and system events need separate union types: `AgentEventType`, `TrunkEventType`, `SystemEventType`.

---

## 5. Socket.io Event Catalog

Compiled from CA:Section 3.3 and PR:T3.1.

### 5.1 Server -> Client Events

| Event Name | Payload Type | Source |
|------------|-------------|--------|
| `call:update` | `Call` | CA:Section 3.3 |
| `call:end` | `{ id: string }` | CA:Section 3.3 |
| `agent:state` | `Agent` (partial, state fields) | CA:Section 3.3 |
| `group:stats` | **UNDEFINED** -- needs `GroupStats` type | CA:Section 3.3 |
| `alerts` | **UNDEFINED** -- needs `AlertNotification` type | PR:T3.1 |
| `connect` | (built-in) | CA:Section 3.3 |
| `disconnect` | (built-in) | CA:Section 3.3 |

### 5.2 Client -> Server Events

| Event Name | Payload Type | Source |
|------------|-------------|--------|
| `subscribe:agent` | `{ agentId: string }` | PR:T3.1 (`agent:{id}` channel) |
| `subscribe:group` | `{ groupId: string }` | PR:T3.1 (`group:{id}` channel) |
| `unsubscribe:agent` | `{ agentId: string }` | Implied |
| `unsubscribe:group` | `{ groupId: string }` | Implied |
| `ping` | `{ timestamp: number }` | CA:Section 3.3 (heartbeat every 15s) |

### 5.3 Redis Pub/Sub Channels (Internal)

| Channel | Publisher | Subscriber |
|---------|-----------|------------|
| `ipo:calls` | DevLink3Connector | Socket.io Server |
| `ipo:agents` | DevLink3Connector | Socket.io Server |
| `ipo:groups` | DevLink3Connector (implied) | Socket.io Server |

### 5.4 Missing Payload Types

| Event | Needed Type | Status |
|-------|-------------|--------|
| `group:stats` | `GroupStats { groupId, groupName, agentsAvailable, agentsBusy, callsWaiting, longestWait, serviceLevel }` | **MISSING** |
| `alerts` | `AlertNotification { id, ruleId, severity, metric, value, threshold, timestamp, message }` | **MISSING** |
| `agent:state` partial | Unclear if full `Agent` or partial `{ id, state, stateStartTime, activeCallId }` | **NEEDS CLARIFICATION** |
| `ping` / `pong` | `{ timestamp: number; latencyMs?: number }` | **MISSING** |

### 5.5 Socket.io Room Structure (from PR:T3.1)

| Room Pattern | Description |
|-------------|-------------|
| `agent-states` | Global -- all agent state changes |
| `call-events` | Global -- all live call events |
| `queue-stats` | Global -- queue depth/wait/SL |
| `alerts` | Global -- fired alert notifications |
| `agent:{id}` | Per-agent channel |
| `group:{id}` | Per-hunt-group channel |

---

## 6. Enum/Union Consistency Check

### 6.1 `CallState`

| Location | Values |
|----------|--------|
| CA:Section 7 | `'ringing' \| 'connected' \| 'hold' \| 'transferring' \| 'conferencing' \| 'queued' \| 'voicemail' \| 'completed' \| 'abandoned'` (9 values) |
| DL3:Section 10 | Numeric 0-13: Idle, Ringing, Connected, Disconnecting, Suspending, Suspended, Resuming, Dialling, Dialled, LocalDial, Queued, Parked, Held, Redialling (14 values) |
| UX:Section 4.2 event colors | Idle, Ringing, Talking, Hold, Park, Queue, Transfer, Transfer Hold, Dialing, Conference, Voicemail, Auto Attendant, Overflow, DND, ACW, Listen, Calling Drop, Receiving Drop, Busy (19 values) |

**INCONSISTENCY**: Three different sets. CA lacks `idle`, `parked`, `dialing`, `redialing`. DL3 is wire-level numeric. UX has the richest set (19 event colors). Recommendation: CA `CallState` should cover the DL3 wire values; UX event colors map to a broader `TimelineEventType`.

### 6.2 `AgentState`

| Location | Values |
|----------|--------|
| CA:Section 7 | `'available' \| 'busy' \| 'wrap' \| 'away' \| 'dnd' \| 'ringing' \| 'logged-out' \| 'unknown'` (8 values) |
| CA:Section 5 `StatusBadgeProps` | `'available' \| 'connected' \| 'ringing' \| 'hold' \| 'wrap' \| 'away' \| 'dnd' \| 'logged-out' \| 'unknown'` (9 values) |
| UX:Section 4.5 Column View | Idle, Ringing, Talking, Hold, DND, Logged Out (6 column headers) |
| PR:T3.5 color codes | Idle, Talking, Hold, Ringing, DND, ACW, Queue (7 values) |

**INCONSISTENCY**: `StatusBadgeProps.status` includes `connected` and `hold` which are not in `AgentState`. UX uses `Idle` (not `available`) and `Talking` (not `busy`). `ACW` in PR maps to `wrap` in CA. Needs single canonical mapping.

### 6.3 `WidgetType`

| Location | Values |
|----------|--------|
| CA:Section 7 | 14 types: `active-calls`, `agent-box`, `gauge`, `chart`, `group-box`, `title-value`, `leaderboard`, `pie-chart`, `marquee`, `image`, `web-page`, `text`, `line`, `widget-group` |
| UX:Section 3.5 | 14 types + 2 decorative: adds `box` and `ellipse` (Section 3.5.13) |
| CA:Section 2.1 component tree | 14 types (matches CA Section 7) |

**INCONSISTENCY**: UX adds `box` and `ellipse` decorative widgets (UX:3.5.13) not present in CA `WidgetType` union. Also, UX mentions a `clock/date` widget (PR:T3.4) not in either list.

### 6.4 `Permission`

| Location | Values |
|----------|--------|
| CA:Section 7 | 17 permissions listed |
| PR:T2.3 | Role hierarchy described but permissions not enumerated |
| REC:Section 5 | Listen, Download/Email, Delete -- maps to `recordings:view`, `recordings:playback`, `recordings:download`, `recordings:delete` |

**GAP**: No permission for alerts management (`alerts:view`, `alerts:manage`). No permission for skill group management. No permission for system connections management. Recommend adding: `alerts:view`, `alerts:manage`, `admin:skills`, `admin:connections`.

### 6.5 `UserRole`

| Location | Values |
|----------|--------|
| CA:Section 7 | `'admin' \| 'supervisor' \| 'agent' \| 'wallboard-only'` |
| PR:T2.3 | `system_admin`, `supervisor`, `agent`, `wallboard_viewer` |

**INCONSISTENCY**: `admin` vs `system_admin`; `wallboard-only` vs `wallboard_viewer`. Must unify.

---

## 7. Query Key Coverage

CA:Section 3.2 defines `queryKeys`. Cross-referenced against all API endpoints.

| API Endpoint | Query Key | Status |
|--------------|-----------|--------|
| `GET /api/calls` | `queryKeys.calls.list(f)` | OK |
| `GET /api/calls/[id]` | `queryKeys.calls.detail(id)` | OK |
| `GET /api/calls/[id]/events` | None | **MISSING** -- needs `queryKeys.calls.events(id)` |
| `GET /api/calls/[id]/notes` | None | **MISSING** -- needs `queryKeys.calls.notes(id)` |
| `GET /api/reports` | `queryKeys.reports.list(f)` | OK |
| `POST /api/reports/generate` | Mutation (no query key) | OK |
| `GET /api/reports/[id]/export` | None | **MISSING** -- needs `queryKeys.reports.export(id, format)` |
| `GET /api/reports/schedules` | None | **MISSING** -- needs `queryKeys.reports.schedules` |
| `GET /api/recordings` | `queryKeys.recordings.list(f)` | OK |
| `GET /api/recordings/[id]` | `queryKeys.recordings.detail(id)` | OK |
| `GET /api/recordings/[id]/notes` | None | **MISSING** -- needs `queryKeys.recordings.notes(id)` |
| `GET /api/recordings/[id]/score` | None | **MISSING** -- needs `queryKeys.recordings.score(id)` |
| `GET /api/agents` | `queryKeys.agents.list()` | OK |
| `GET /api/agents/[id]/state` | None | **MISSING** -- needs `queryKeys.agents.state(id)` |
| `GET /api/agents/[id]/timeline` | `queryKeys.agents.timeline(id, d)` | OK |
| `GET /api/wallboards` | `queryKeys.wallboards.all` | OK (but no `list` variant with filters) |
| `GET /api/wallboards/[id]` | `queryKeys.wallboards.detail(id)` | OK |
| `GET /api/admin/users` | `queryKeys.users.all` | OK |
| `GET /api/admin/settings` | `queryKeys.settings.all` | OK |
| `GET /api/admin/recording-rules` | None | **MISSING** -- needs `queryKeys.recordingRules` |
| `GET /api/admin/storage-pools` | None | **MISSING** -- needs `queryKeys.storagePools` |
| `GET /api/devlink3/status` | None | **MISSING** -- needs `queryKeys.devlink3.status` |
| `GET /api/groups` | None | **MISSING** -- needs `queryKeys.groups` |
| `GET /api/trunks` | None | **MISSING** -- needs `queryKeys.trunks` |
| `GET /api/admin/alerts` | None | **MISSING** -- needs `queryKeys.alerts` |
| `GET /api/admin/scorecard-templates` | None | **MISSING** -- needs `queryKeys.scorecardTemplates` |

**Summary**: 15 endpoints lack query key definitions. The factory needs expansion.

---

## 8. Recommended Fixes

### 8.1 High Priority (Blocks Development)

1. **Add 12 missing API routes** (Section 1, items 1-5, 8-12, 14-15). These map directly to DB tables and UI features that all 4 teams need.

2. **Define DevLink3 wire types** (Section 4). Team 1 cannot implement the connector without `Delta3DetailRecord`, `DevLink3CallState` (numeric), `EquipmentType`, `CalledType`, `CauseCode`. Place in `src/types/devlink3.ts`.

3. **Create `AgentEventType` and `SystemEventType` unions** (Section 4.3). Agent events (`AgentLogin` through `AgentMCW`) and system events (`TrunkBusy`, `HuntGroupStatus`) must not be conflated with `CallEventType`.

4. **Unify `UserRole` naming** (Section 6.5). Choose either CA or PR naming. Recommendation: use CA naming (`admin`, `supervisor`, `agent`, `wallboard-only`) and update PR accordingly.

### 8.2 Medium Priority (Blocks Integration)

5. **Expand `CallState`** to include `idle`, `parked`, `dialing` from DL3:Section 10. Add a `DevLink3CallStateMap: Record<number, CallState>` for wire-to-app translation.

6. **Align `StatusBadgeProps.status` with `AgentState`** (Section 6.2). Remove `connected`/`hold` from StatusBadge or add them to `AgentState`.

7. **Add `WidgetType` entries** for `box`, `ellipse`, `clock` (Section 6.3).

8. **Type all Socket.io payloads** (Section 5.4). Define `GroupStats`, `AlertNotification`, and the ping/pong shape. Place in `src/types/socket-events.ts`.

9. **Expand `queryKeys` factory** (Section 7) to cover all 15 missing endpoints.

10. **Add missing `Permission` values**: `alerts:view`, `alerts:manage`, `admin:skills`, `admin:connections` (Section 6.4).

### 8.3 Low Priority (Polish)

11. **Add `SmdrRecord` type** (Section 2, item 1). Even though SMDR is internal, a typed 35-field interface prevents parsing bugs.

12. **Define explicit request/response types** for all mutation endpoints (Section 2, item 21). E.g., `CreateReportRequest`, `UpdateWallboardRequest`, `CreateUserRequest`.

13. **Add `CallNote` type** (Section 2, item 20) distinct from `RecordingNote` (`recording_notes` has `timestamp_ms`; `call_notes` is per-call, not timestamped to audio).

14. **Clarify `agent:state` Socket.io payload** -- specify whether full `Agent` or a partial update DTO is sent (Section 5.4).

15. **Document the `recording_pause_events` table as `RecordingPauseEvent` type** referenced by REC:Section 8 (`event_type: 'pause' | 'resume' | 'auto_resume'`).

---

*Validated against 6 specification documents. 16 missing routes, 21 missing types, 12 orphan tables, 8 missing DL3 enums, 15 missing query keys, and 5 enum inconsistencies identified.*
