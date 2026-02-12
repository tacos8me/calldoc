# CallDoc: Optimized Task Dependency Graph & Build Order
## Maximum Parallelism Across 4 Teams -- 6-Week Sprint Plan

---

## 1. Critical Path Analysis

### 1.1 True Critical Path (Longest Dependent Chain)

The critical path runs through the core data pipeline into the most complex UI features:

```
T1.1 Project Scaffolding (8h)
  -> T1.2 Database Schema (16h)
    -> T1.3 DevLink3 Client Library (24h)
      -> T1.5 Event Ingestion Pipeline (16h)
        -> T3.2 Real-time State Engine (20h)
          -> T3.4 Dashboard Widgets (40h)
            -> T3.6 Wallboard Builder (32h)

Total Critical Path: ~156 hours = ~19.5 working days = ~4 weeks
```

Secondary Critical Path (Historical):
```
T1.1 (8h) -> T1.2 (16h) -> T1.5 (16h) -> T4.1 Cradle-to-Grave (24h)
  -> T4.2 Search & Filters (40h) -> T4.3 Standard Reports (48h)
    -> T4.5 Report Scheduler (16h)

Total: ~168 hours = ~21 working days = ~4.2 weeks
```

### 1.2 Zero-Dependency Tasks (Can Start Immediately)

These tasks have NO prerequisites and can begin on Day 1:

| Task | Team | Hours | Description |
|------|------|-------|-------------|
| T1.1 Project Scaffolding | Team 1 | 8 | Docker, Next.js, configs |
| T2.1 SAML Integration | Team 2 | 20 | Can build against MockSAML standalone |
| T1.4 DevLink3 Simulator | Team 1 | 20 | Standalone TCP server, no app deps |
| T3.3 Dashboard Layout System | Team 3 | 16 | Pure UI component, mock data |
| T4.4 Report Rendering Engine | Team 4 | 16 | PDF/CSV/HTML engine, mock data |

### 1.3 Highest Fan-Out Tasks (Blocking the Most Downstream Work)

| Task | Blocks (Direct) | Blocks (Transitive) | Priority |
|------|-----------------|---------------------|----------|
| **T1.1 Project Scaffolding** | T1.2, T1.3, T1.6, T1.8, T2.2, T2.3, T3.1 | Everything | P0-CRITICAL |
| **T1.2 Database Schema** | T1.5, T1.6, T1.7, T2.3, T2.4, T4.1, T4.2, T4.3 | 20+ tasks | P0-CRITICAL |
| **T1.5 Event Ingestion** | T3.2, T4.1, T4.2, T4.3, T1.6 reconciliation | 15+ tasks | P0-CRITICAL |
| **T1.3 DevLink3 Client** | T1.5, T1.4 validation, T2.4 auto-discovery | 12+ tasks | P0-CRITICAL |
| **T3.1 WebSocket Server** | T3.2, T3.4, T3.5, T3.6, T3.7 | 10+ tasks | P1-HIGH |
| **T2.5 Permission Middleware** | T2.6, T4.6 permissions, all admin UIs | 8+ tasks | P1-HIGH |

---

## 2. Optimized 4-Team Assignment

### Team Redistribution Strategy

The original roadmap has Team 1 overloaded (8 tasks, many on critical path) while Team 2 has less work. Redistribute for balance:

### TEAM 1: Data Pipeline & Protocol (2 engineers)
**Mission**: Get data flowing from Avaya into PostgreSQL and Redis as fast as possible.

| Task ID | Task | Hours | Depends On |
|---------|------|-------|------------|
| T1.1 | Project Scaffolding & Docker | 8 | -- |
| T1.2 | PostgreSQL Schema & Migrations | 16 | T1.1 |
| T1.3 | DevLink3 Client Library | 24 | T1.1 |
| T1.4 | DevLink3 Simulator | 20 | T1.1 |
| T1.5 | Event Ingestion Pipeline | 16 | T1.2, T1.3 |
| T1.6 | SMDR Ingestion Service | 16 | T1.2 |
| T1.8 | System Configuration API | 12 | T1.2, T2.5 |
| **Total** | | **112h** | |

**Engineer A**: T1.1 -> T1.2 -> T1.5 -> T1.6 -> T1.8
**Engineer B**: T1.4 (parallel with A) -> T1.3 -> T1.5 (join A) -> T1.6 reconciliation

### TEAM 2: Auth, Users & Platform Services (2 engineers)
**Mission**: Secure the platform, manage users, and deliver skills/config.

| Task ID | Task | Hours | Depends On |
|---------|------|-------|------------|
| T2.1 | SAML 2.0 Integration | 20 | -- |
| T2.2 | Session Management | 12 | T1.1 |
| T2.3 | User & Role Management | 16 | T1.2, T2.1 |
| T2.4 | Agent-Extension Mapping | 12 | T1.2, T2.3 |
| T2.5 | Permission Middleware & Guards | 12 | T2.2, T2.3 |
| T2.6 | Settings & Profile Pages | 16 | T2.3, T2.5 |
| T1.7 | Skills-Based Routing Config | 16 | T1.2, T2.5 |
| **Total** | | **104h** | |

**Engineer C**: T2.1 -> T2.3 -> T2.5 -> T2.6
**Engineer D**: T2.2 (waits for T1.1) -> T2.4 -> T1.7 -> T2.6 (join C)

### TEAM 3: Real-time & Dashboards (2 engineers)
**Mission**: Live dashboards, agent timeline, wallboards, alerts.

| Task ID | Task | Hours | Depends On |
|---------|------|-------|------------|
| T3.1 | WebSocket Server (Socket.io) | 12 | T1.1, T2.2 |
| T3.2 | Real-time State Engine | 20 | T1.5, T3.1 |
| T3.3 | Dashboard Layout System | 16 | T1.1 |
| T3.4 | Dashboard Widgets (14 types) | 40 | T3.2, T3.3 |
| T3.5 | Agent Timeline View | 24 | T3.2 |
| T3.6 | Wallboard Builder | 32 | T3.3, T3.4 |
| T3.7 | Alerts & Notification Engine | 20 | T3.2, T2.5 |
| **Total** | | **164h** | |

**Engineer E**: T3.3 (Day 1, mock data) -> T3.1 -> T3.2 -> T3.4 (first 7) -> T3.6
**Engineer F**: T3.3 (assists) -> T3.5 -> T3.4 (remaining 7) -> T3.7

### TEAM 4: Historical, Reports & Recording (2 engineers)
**Mission**: Cradle-to-grave, 80+ filters, 69+ reports, recording lifecycle.

| Task ID | Task | Hours | Depends On |
|---------|------|-------|------------|
| T4.1 | Cradle-to-Grave View | 24 | T1.2, T1.5 |
| T4.2 | Search & Filter System (83 filters) | 40 | T4.1 |
| T4.3 | Standard Report Templates (69 reports) | 48 | T1.2, T4.4 |
| T4.4 | Report Rendering Engine | 16 | T1.1 |
| T4.5 | Report Scheduler | 16 | T4.3, T4.4 |
| T4.6 | Call Recording Integration | 40 | T1.2, T2.5, T4.1 |
| **Total** | | **184h** | |

**Engineer G**: T4.4 (Day 1, mock data) -> T4.1 -> T4.2 -> T4.5
**Engineer H**: T4.3 (starts with mock DB after T1.2) -> T4.6

### Cross-Team Hand-Off Points

| Hand-Off | From | To | What | When |
|----------|------|----|----- |------|
| HP-1 | Team 1 | All Teams | T1.1 scaffolding complete, `docker compose up` works | End of Day 1 |
| HP-2 | Team 1 | Teams 2,3,4 | T1.2 schema + ORM types available | End of Day 3 |
| HP-3 | Team 2 | Teams 3,4 | T2.2 session middleware exported | End of Day 4 |
| HP-4 | Team 1 | Team 3 | T1.5 events flowing to Redis pub/sub | End of Week 2 |
| HP-5 | Team 2 | Teams 1,3,4 | T2.5 permission guards available | End of Week 2 |
| HP-6 | Team 1 | Team 4 | T1.5 events flowing to PostgreSQL | End of Week 2 |
| HP-7 | Team 3 | Team 3 | T3.2 state engine provides widget data API | End of Week 2 |
| HP-8 | Team 4 | Team 4 | T4.4 render engine accepts report data | End of Week 1 |

---

## 3. Detailed Sub-Task Breakdown

### T1.1 - Project Scaffolding & Docker (8h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T1.1.1 | 2 | Initialize Next.js 14 App Router + TypeScript strict mode + Tailwind + shadcn/ui |
| T1.1.2 | 2 | Docker Compose: app, PostgreSQL 16, Redis 7 services |
| T1.1.3 | 2 | Dev compose overrides (simulator, MockSAML, MinIO profiles) |
| T1.1.4 | 2 | ESLint + Prettier + .env schema + tsconfig paths + CI lint script |

### T1.2 - PostgreSQL Schema & Migrations (16h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T1.2.1 | 3 | Drizzle ORM setup + drizzle-kit config + migration runner |
| T1.2.2 | 3 | Core call tables: `calls`, `call_events`, `call_parties`, `call_recordings`, `call_notes` |
| T1.2.3 | 2 | Phone system tables: `agents`, `agent_states`, `extensions`, `hunt_groups`, `hunt_group_members`, `trunks`, `trunk_groups` |
| T1.2.4 | 2 | User/auth tables: `users`, `user_roles`, `saml_configs`, `sessions`, `agent_mappings`, `user_preferences` |
| T1.2.5 | 2 | System tables: `systems`, `system_status`, `smdr_records`, `smdr_reconciliation` |
| T1.2.6 | 2 | Reporting/config tables: `report_templates`, `report_schedules`, `saved_filters`, `alert_rules`, `alert_history`, `wallboard_layouts`, `wallboard_widgets` |
| T1.2.7 | 1 | Recording tables: `recording_storage_pools`, `recording_rules`, `recording_notes`, `recording_pause_events`, `scorecard_templates`, `scorecard_responses`, `recording_share_links` |
| T1.2.8 | 1 | Index strategy (call_events composite indexes) + partitioning (by month) + seed script |

### T1.3 - DevLink3 Client Library (24h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T1.3.1 | 4 | Binary framing: 0x49 discriminator + 2-byte big-endian length + payload parser/serializer |
| T1.3.2 | 4 | Packet types: Test (002A0001), Auth (00300001), EventRequest (00300011), Event (10300011) |
| T1.3.3 | 4 | SHA1 challenge-response auth (Phase 1: username, Phase 2: SHA1(challenge+password)) |
| T1.3.4 | 4 | Event registration: flag strings (-SIPTrack, -CallDelta3, -CMExtn) |
| T1.3.5 | 4 | Delta3 XML parser: Detail/CallLost/LinkLost records, Call (18 fields), Party (26 fields), Target (14 fields) |
| T1.3.6 | 4 | TCP/TLS socket manager: connection, reconnection (exponential backoff), health monitoring (Test keepalive) |

### T1.4 - DevLink3 Simulator (20h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T1.4.1 | 4 | TCP server shell: listen on port, accept connections, implement auth handshake |
| T1.4.2 | 4 | Binary frame encoder matching IP Office format |
| T1.4.3 | 4 | Scenario engine: JSON config for call flows (normal, queue, transfer, conference, abandoned) |
| T1.4.4 | 4 | Agent state machine: login/ready/busy/ACW/DND/logout transitions with realistic timing |
| T1.4.5 | 4 | Continuous mode: random traffic generator with configurable agent pool (10-50), hunt groups (3-10), trunks (10-30) |

### T1.5 - Event Ingestion Pipeline (16h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T1.5.1 | 4 | Connector service: long-running process, connects to DevLink3 (sim or real) |
| T1.5.2 | 4 | Event transformer: raw DevLink3 events -> normalized `calls` + `call_events` + `agent_states` records |
| T1.5.3 | 4 | PostgreSQL writer: batch inserts, transaction management, dead letter queue |
| T1.5.4 | 4 | Redis publisher: real-time events to pub/sub channels, in-memory state map (agents, calls, queues) |

### T1.6 - SMDR Ingestion Service (16h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T1.6.1 | 4 | TCP listener on configurable port (default 1150), push + pull modes |
| T1.6.2 | 4 | CSV parser: 30+ field parser, device type prefix decoder (E/T/V), continuation record assembly |
| T1.6.3 | 4 | Call direction logic + External Targeting Cause decoder + 3000-record buffer |
| T1.6.4 | 4 | Reconciliation engine: match SMDR -> DevLink3 calls by Call ID + timestamp, conflict resolution |

### T1.7 - Skills-Based Routing Configuration (16h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T1.7.1 | 4 | Skill group CRUD API: create/edit/delete + agent-skill mapping with expertise ranking (1-10) |
| T1.7.2 | 4 | Routing algorithm config per group: Most Idle, Circular, Linear, Highest Skill First |
| T1.7.3 | 4 | Admin UI: skill group management page, drag-and-drop agent assignment |
| T1.7.4 | 4 | Skill-based metrics: per-skill call volume, answer rate, wait time calculations |

### T1.8 - System Configuration API (12h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T1.8.1 | 4 | REST endpoints: CRUD for IP Office connections (DevLink3 + SMDR) |
| T1.8.2 | 4 | Connection test endpoint: attempt DevLink3 handshake + SMDR probe |
| T1.8.3 | 4 | Connection health dashboard: status page data, auto-reconnect controls |

### T2.1 - SAML 2.0 Integration (20h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T2.1.1 | 4 | Install @node-saml/passport-saml, configure SP entity ID, ACS URL, metadata |
| T2.1.2 | 4 | API routes: GET /auth/saml/login, POST /auth/saml/callback, GET /auth/saml/metadata |
| T2.1.3 | 4 | Logout routes: GET /auth/saml/logout (SP-initiated), POST /auth/saml/slo (IdP-initiated) |
| T2.1.4 | 4 | Certificate management: PEM storage in DB, rotation support |
| T2.1.5 | 4 | MockSAML Docker container setup + attribute mapping (email, firstName, lastName, groups) |

### T2.2 - Session Management (12h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T2.2.1 | 4 | Redis-backed sessions: httpOnly secure cookie, session schema (userId, roles, agentMapping, etc.) |
| T2.2.2 | 4 | Timeout logic: 12h absolute, 30min idle (skip during active calls), force logout |
| T2.2.3 | 4 | Session middleware for all API routes + pages, session refresh on activity |

### T2.3 - User & Role Management (16h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T2.3.1 | 4 | Role hierarchy: system_admin > supervisor > agent > wallboard_viewer + permission definitions |
| T2.3.2 | 4 | User CRUD API: GET/PUT/DELETE /api/users, role assignment, deactivation |
| T2.3.3 | 4 | SAML group -> role mapping (configurable per deployment) |
| T2.3.4 | 4 | JIT provisioning: auto-create user on first SAML login, sync attributes |

### T2.4 - Agent-Extension Mapping (12h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T2.4.1 | 4 | Mapping UI: admin assigns user -> extension, hunt group membership display |
| T2.4.2 | 4 | Auto-discovery: pull extension list from DevLink3, suggest mappings |
| T2.4.3 | 4 | Bulk import: CSV upload, validation (warn duplicate extension mappings) |

### T2.5 - Permission Middleware & Guards (12h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T2.5.1 | 4 | Next.js middleware for route protection (redirect unauthenticated) |
| T2.5.2 | 4 | API guards: requireAuth(), requireRole(role), requirePermission(perm) decorators |
| T2.5.3 | 4 | Resource-level ACL: supervisor sees assigned groups only, agent sees own data, useAuth() React hook |

### T2.6 - Settings & Profile Pages (16h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T2.6.1 | 3 | /settings/profile -- user profile (name, email from SAML, extension mapping display) |
| T2.6.2 | 4 | /settings/users -- user management table (list, search, role assign, deactivate) |
| T2.6.3 | 3 | /settings/roles -- role mapping configuration (SAML group -> CallDoc role) |
| T2.6.4 | 3 | /settings/saml -- SAML IdP configuration (cert upload, entity ID, endpoints) |
| T2.6.5 | 3 | /settings/system -- IP Office connection config (DevLink3 + SMDR, health status) |

### T3.1 - WebSocket Server (12h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T3.1.1 | 4 | Socket.io server integrated with Next.js custom server, Redis adapter for scaling |
| T3.1.2 | 4 | Channel architecture: agent-states, call-events, queue-stats, alerts, agent:{id}, group:{id} |
| T3.1.3 | 4 | Auth handshake (validate session cookie), rate limiting (100ms batch), client reconnection |

### T3.2 - Real-time State Engine (20h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T3.2.1 | 4 | In-memory state manager: agent state map, active calls map, queue depth counters |
| T3.2.2 | 4 | Computed metrics: calls waiting, longest wait, ASA (rolling), agent occupancy, SL% |
| T3.2.3 | 4 | State snapshots: initial state on new WS connection, Redis persistence (survive restart) |
| T3.2.4 | 4 | Redis subscriber: consume events from T1.5 pipeline, update in-memory state |
| T3.2.5 | 4 | Trunk utilization tracking, service level calculations (configurable threshold) |

### T3.3 - Dashboard Layout System (16h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T3.3.1 | 4 | react-grid-layout integration, responsive grid breakpoints |
| T3.3.2 | 4 | Drag-and-drop widget placement + resize handles |
| T3.3.3 | 4 | Save/load layout per user (API + DB persistence) |
| T3.3.4 | 4 | Default layouts per role (supervisor, agent), layout reset functionality |

### T3.4 - Dashboard Widgets (40h total, 14 widget types)

| Sub-Task | Hours | Description | Data Source |
|----------|-------|-------------|-------------|
| T3.4.1 | 3 | **Agent Status Grid** -- color-coded cards, current state, extension, call duration | agent-states channel |
| T3.4.2 | 3 | **Queue Summary Cards** -- per-queue: waiting, longest wait, agents, SL% | queue-stats channel |
| T3.4.3 | 3 | **Active Calls Table** -- live table: caller ID, agent, duration, queue, event | call-events channel |
| T3.4.4 | 3 | **Service Level Gauge** -- circular gauge, threshold coloring (green/yellow/red) | computed metrics |
| T3.4.5 | 3 | **Call Volume Chart** -- real-time line chart, calls per 15-min, today vs yesterday | computed metrics |
| T3.4.6 | 3 | **Agent Leaderboard** -- ranked: calls handled, avg talk time, answer rate | computed metrics |
| T3.4.7 | 3 | **Queue Depth Chart** -- bar chart: calls waiting per queue, threshold colors | queue-stats channel |
| T3.4.8 | 3 | **Trunk Utilization** -- bar chart: trunk usage % per trunk group | trunk events |
| T3.4.9 | 2 | **KPI Ticker** -- scrolling marquee of key numbers | computed metrics |
| T3.4.10 | 2 | **Clock/Date** -- large format clock for wallboard | system |
| T3.4.11 | 3 | **Pie Chart Widget** -- configurable metric, proportional distribution | any metric |
| T3.4.12 | 3 | **Text/Title Value Widget** -- simple numeric display with label | any metric |
| T3.4.13 | 3 | **Group Box Widget** -- group login count, calls in queue, max/avg duration | queue-stats |
| T3.4.14 | 3 | **Widget Container/Group** -- groups multiple widgets, collapsible | container |

### T3.5 - Agent Timeline View (24h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T3.5.1 | 4 | Timeline bar renderer: horizontal bars per agent, proportional duration segments |
| T3.5.2 | 4 | Color-coded events: Idle(green), Talking(blue), Hold(yellow), Ringing(orange), DND(red), ACW(purple), Queue(amber) |
| T3.5.3 | 3 | Customizable color legend component with live preview and per-user persistence |
| T3.5.4 | 3 | Hover tooltip: event type, duration, caller ID, group |
| T3.5.5 | 3 | Sort controls: name A-Z, extension, current state, idle time |
| T3.5.6 | 3 | Filter controls: select agents, groups, search |
| T3.5.7 | 2 | Click agent row -> detailed agent view with full day history |
| T3.5.8 | 2 | Live Column View toggle: agents grouped by current state in columns |

### T3.6 - Wallboard Builder (32h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T3.6.1 | 6 | Canvas editor: freeform positioning, snap-to-grid, zoom controls |
| T3.6.2 | 4 | Widget palette: drag widget types from sidebar onto canvas |
| T3.6.3 | 4 | Widget configuration panel: select metric, group, agent, time frame, font, color, border |
| T3.6.4 | 4 | Background customization: color picker or image upload |
| T3.6.5 | 4 | Save/load wallboard layouts (API + DB), wallboard list management page |
| T3.6.6 | 4 | Full-screen view mode (/wallboards/:id/view) with kiosk mode (hide browser chrome) |
| T3.6.7 | 3 | Pre-built templates: 3-4 starter templates (call center overview, queue focus, agent performance) |
| T3.6.8 | 3 | Auto-rotate: cycle between multiple wallboards at configurable interval |

### T3.7 - Alerts & Notification Engine (20h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T3.7.1 | 4 | Alert rule builder UI: metric selection, condition, threshold, evaluation window, cooldown |
| T3.7.2 | 4 | Alert evaluation engine: subscribe to state engine, evaluate rules against metrics |
| T3.7.3 | 4 | In-app notifications: toast component, notification center drawer, badge count |
| T3.7.4 | 4 | Email notifications: SMTP configuration, alert email templates (nodemailer) |
| T3.7.5 | 2 | Wallboard alerts: push color change / flash via WebSocket |
| T3.7.6 | 2 | Built-in alerts: 911 dialed, DevLink3 disconnected, disk space warning |

### T4.1 - Cradle-to-Grave View (24h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T4.1.1 | 4 | Paginated table shell: sortable columns, column management (add/remove/reorder/resize) |
| T4.1.2 | 4 | Default columns: Call ID, Direction, Start/End Time, Duration, Calling/Receiving Party, External/Internal, Dialed Number, Is Answered, Is Recorded |
| T4.1.3 | 4 | Hidden columns: 40+ additional fields (all call report values as optional columns) |
| T4.1.4 | 4 | Expandable row: event timeline visualization with proportional colored bars per event |
| T4.1.5 | 3 | Event type rendering: 19 base event types + 14 contact center events with color coding |
| T4.1.6 | 2 | Date range picker: today, yesterday, this week, this month, custom range |
| T4.1.7 | 2 | Summary metrics bar: totals/averages above grid, updates on filter |
| T4.1.8 | 1 | Quick Search: Call ID search with magnifying glass icon |

### T4.2 - Search & Filter System (40h total, 83 filters)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T4.2.1 | 4 | Filter panel UI: collapsible sidebar, category accordion, active filter chips, clear all button |
| T4.2.2 | 4 | **Agent filters (9 types)**: Agent, Agent Does Not Equal, Agent Speed of Answer, Initial Agent, Initial Agent Does Not Equal, Final Agent, Final Agent Does Not Equal, Calling Agent, Receiving Agent |
| T4.2.3 | 3 | **Call direction & type (3 types)**: Call Direction, Call Direction Does Not Equal, Calls/Chats toggle |
| T4.2.4 | 4 | **Duration/timing filters (6 types)**: Call Duration, Time to Answer, Agent Speed of Answer, Group Speed of Answer, Event Duration, Individual Event Duration (range bracket notation [a..b], (a..b), etc.) |
| T4.2.5 | 4 | **Event filters (11 types)**: Call Includes Any/All Events, Call Does Not Include Event/All Events, Event Type, Event Type Does Not Equal, Final Event, Final Event Does Not Equal, Event Sequence Matches/Does Not Match, Total Event Count |
| T4.2.6 | 4 | **Party filters (9 types)**: Call Includes/Does Not Include Calling Party, Calling Party Number, Call Includes/Does Not Include External Party, Call Includes/Does Not Include Receiving Party, Call Includes/Does Not Include Local Party |
| T4.2.7 | 4 | **Group & skill filters (9 types)**: Group, Group Does Not Equal, Call Includes/Does Not Include Group, Initial/Final Group, Initial/Final Group Does Not Equal, Group Speed of Answer |
| T4.2.8 | 3 | **Call identification (4 types)**: Call ID Equals, Call ID Range, Caller ID, Dialed Party Number |
| T4.2.9 | 2 | **Status/boolean filters (6 types)**: Is Answered, Is Abandoned, Is Conferenced, Is Recorded, Has Note, Has Survey |
| T4.2.10 | 2 | **Notes & tags (5 types)**: Note Authored By, Note Contains Text, Call Includes/Does Not Include Tag, Tag |
| T4.2.11 | 2 | **Time-based filters (4 types)**: Time of Day, Days of Week, Time Intervals, Shift |
| T4.2.12 | 1 | **System/infrastructure (4 types)**: Trunk, System ID, System ID Does Not Equal, State/Province |
| T4.2.13 | 1 | **Post-filter criteria (4 types)**: Filtered Call Includes/Does Not Include All/Any Events |
| T4.2.14 | 1 | **Role & cost (2 types)**: Role, Rate Label |
| T4.2.15 | 1 | Filter preset save/load per user (saved_filters table) |

### T4.3 - Standard Report Templates (48h total)

Prioritized into 3 tiers: MVP (most common), Standard (important), and Extended (nice-to-have).

#### Tier 1 -- MVP Reports (16h, build first)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T4.3.1 | 2 | **Report framework**: shared layout, date range picker, agent/group filter, time interval grouping, sort, chart toggle |
| T4.3.2 | 2 | **Agent Performance Summary** (report #13): calls handled, talk time, answer rate, idle time, SL |
| T4.3.3 | 2 | **Agent Call Summary** (report #6): call counts by direction, duration aggregates |
| T4.3.4 | 2 | **Group Summary** (report #36): presented, answered, missed, overflow, SL, ASA |
| T4.3.5 | 2 | **Abandoned Calls** (report #2): abandoned calls with wait time, caller info, queue |
| T4.3.6 | 2 | **Inbound Call Service Level** (report #41): SL% by time interval |
| T4.3.7 | 2 | **Call Details** (report #18): all calls with full metadata columns |
| T4.3.8 | 2 | **Emergency Calls / 911** (report #1): emergency call tracking log |

#### Tier 2 -- Standard Reports (16h, build second)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T4.3.9 | 2 | **Agent Time Card** (report #3 via realtime): login/logout, state durations |
| T4.3.10 | 2 | **Queued Calls by Group** (report #48): queue depth over time, wait times |
| T4.3.11 | 2 | **Queued Call Volume** (report #49): call volume by time interval |
| T4.3.12 | 2 | **Trunk Usage Summary** (report #55): utilization by trunk group |
| T4.3.13 | 2 | **Agent Transfer Summary** (report #16): transfers to/from each agent |
| T4.3.14 | 2 | **Group Event Summary** (report #34): event breakdowns per group |
| T4.3.15 | 2 | **Agent Inbound Summary** (report #10): inbound metrics by agent |
| T4.3.16 | 2 | **Agent Outbound Summary** (report #12): outbound metrics by agent |

#### Tier 3 -- Extended Reports (16h, build last)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T4.3.17 | 1 | **Agent Call Volume** (#7) |
| T4.3.18 | 1 | **Agent Event Summary** (#8) |
| T4.3.19 | 1 | **Agent Talking Summary** (#15) |
| T4.3.20 | 1 | **Base System Totals** (#17) |
| T4.3.21 | 1 | **Call Direction Summary** (#20) |
| T4.3.22 | 1 | **Calls by Caller ID** (#22) |
| T4.3.23 | 1 | **Calls by External Party** (#23) |
| T4.3.24 | 1 | **Conference Calls** (#24) |
| T4.3.25 | 1 | **External Number Summary** (#32) |
| T4.3.26 | 1 | **Group Abandoned Calls** (#33) |
| T4.3.27 | 1 | **Inbound Call Performance** (#39) |
| T4.3.28 | 1 | **Lost Call Summary** (#45) |
| T4.3.29 | 1 | **Outbound Call Summary** (#47) |
| T4.3.30 | 1 | **Agent Summary by Group** (#14) |
| T4.3.31 | 1 | **Group Summary by Agent** (#37) |
| T4.3.32 | 1 | **Inbound Group Summary** (#43) |

Note: Remaining 37 reports from the full 69-report catalog (user-specific variants, cost reports, Cisco-only, web chat, callback) are Phase 2 stretch goals. The 32 reports above cover all core use cases.

### T4.4 - Report Rendering Engine (16h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T4.4.1 | 4 | HTML renderer: screen layout, responsive table, chart integration (recharts) |
| T4.4.2 | 4 | PDF renderer: @react-pdf/renderer, header (date range, filters, timestamp), footer (pages, system) |
| T4.4.3 | 4 | CSV/Excel export: streaming CSV writer, .xlsx via exceljs if needed |
| T4.4.4 | 4 | Print-optimized CSS, report preview modal |

### T4.5 - Report Scheduler (16h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T4.5.1 | 4 | Schedule builder UI: select template, set filters, frequency (daily/weekly/monthly), time |
| T4.5.2 | 4 | Cron execution engine: node-cron, run report at scheduled time |
| T4.5.3 | 4 | Email delivery: SMTP config, attach PDF/CSV, recipients list |
| T4.5.4 | 4 | Schedule management: list schedules, last/next run, success/failure log, enable/disable |

### T4.6 - Call Recording Integration (40h total)

| Sub-Task | Hours | Description |
|----------|-------|-------------|
| T4.6.1 | 4 | **Recording ingest -- FTP/SFTP**: ssh2-sftp-client, poll Avaya VM Pro VRL directory, download .wav files |
| T4.6.2 | 2 | **Recording ingest -- manual upload**: drag-and-drop upload UI for testing without live Avaya |
| T4.6.3 | 4 | **Call-to-recording matching**: multi-strategy (Call ID -> timestamp+extension -> manual link) |
| T4.6.4 | 4 | **Compression pipeline**: WAV -> Opus (OGG container, ~100KB/min), ffmpeg or @FFmpeg/ffmpeg |
| T4.6.5 | 4 | **Storage pool system**: Docker volume (MVP), S3-compatible MinIO, configurable max size, retention policies |
| T4.6.6 | 4 | **Playback UI**: wavesurfer.js inline waveform player, speed control (0.5x-2x), pitch preservation |
| T4.6.7 | 3 | **Waveform notes**: timestamped markers on recording timeline, note CRUD |
| T4.6.8 | 3 | **Snippet & download**: select portion, download/email snippet, full download (.wav export, permission-gated) |
| T4.6.9 | 3 | **External listen links**: HMAC-signed JWT URLs with configurable TTL |
| T4.6.10 | 3 | **PCI compliance**: API-triggered pause/resume, auto-resume timeout, audit trail in recording_pause_events |
| T4.6.11 | 3 | **Recording rules engine**: 7 rule types (agent, group, number, direction, etc.), 0-100% recording rate |
| T4.6.12 | 3 | **Quality scorecards**: template builder (yes/no, scale 1-10, text), per-recording evaluation, score aggregation |

---

## 4. Dependency Matrix

```
Task ID    | Depends On           | Blocks                          | Team | Est. Hours
-----------|----------------------|---------------------------------|------|----------
T1.1       | --                   | T1.2,T1.3,T1.4,T1.6,T1.8,      | 1    | 8
           |                      | T2.2,T3.1,T3.3,T4.4            |      |
T1.2       | T1.1                 | T1.5,T1.6,T1.7,T2.3,T2.4,      | 1    | 16
           |                      | T4.1,T4.2,T4.3                  |      |
T1.3       | T1.1                 | T1.5,T2.4(discovery)            | 1    | 24
T1.4       | --                   | T1.5(testing)                   | 1    | 20
T1.5       | T1.2,T1.3           | T3.2,T4.1,T4.2,T4.3,T1.6(rec) | 1    | 16
T1.6       | T1.2                 | T4.1(SMDR data)                 | 1    | 16
T1.7       | T1.2,T2.5           | T3.5(skill display)             | 2    | 16
T1.8       | T1.2,T2.5           | --                              | 1    | 12
T2.1       | --                   | T2.3                            | 2    | 20
T2.2       | T1.1                 | T2.5,T3.1                       | 2    | 12
T2.3       | T1.2,T2.1           | T2.4,T2.5,T2.6                 | 2    | 16
T2.4       | T1.2,T2.3           | T2.6                            | 2    | 12
T2.5       | T2.2,T2.3           | T1.7,T1.8,T2.6,T3.7,T4.6      | 2    | 12
T2.6       | T2.3,T2.5           | --                              | 2    | 16
T3.1       | T1.1,T2.2           | T3.2,T3.4,T3.5,T3.6,T3.7      | 3    | 12
T3.2       | T1.5,T3.1           | T3.4,T3.5,T3.6,T3.7            | 3    | 20
T3.3       | T1.1                 | T3.4,T3.6                       | 3    | 16
T3.4       | T3.2,T3.3           | T3.6                            | 3    | 40
T3.5       | T3.2                 | --                              | 3    | 24
T3.6       | T3.3,T3.4           | --                              | 3    | 32
T3.7       | T3.2,T2.5           | --                              | 3    | 20
T4.1       | T1.2,T1.5           | T4.2,T4.6                       | 4    | 24
T4.2       | T4.1                 | T4.3(filter reuse)              | 4    | 40
T4.3       | T1.2,T4.4           | T4.5                            | 4    | 48
T4.4       | T1.1                 | T4.3,T4.5                       | 4    | 16
T4.5       | T4.3,T4.4           | --                              | 4    | 16
T4.6       | T1.2,T2.5,T4.1      | --                              | 4    | 40
```

---

## 5. Sprint Plan (Week by Week)

### Week 1: Foundation Sprint
**Goal**: All infrastructure up, auth working, first UI shells rendered.

```
Team 1 (Pipeline):
  Engineer A: T1.1.1-T1.1.4 (Day 1-2) -> T1.2.1-T1.2.4 (Day 2-3) -> T1.2.5-T1.2.8 (Day 4-5)
  Engineer B: T1.4.1-T1.4.2 (Day 1-3) -> T1.3.1-T1.3.2 (Day 3-5)
  Deliverables: docker compose up works (Day 1), full schema migrated (Day 3), simulator accepts connections (Day 3)

Team 2 (Auth):
  Engineer C: T2.1.1-T2.1.3 (Day 1-3) -> T2.1.4-T2.1.5 (Day 3-5)
  Engineer D: [Blocked on T1.1 until Day 2] T2.2.1-T2.2.2 (Day 2-4) -> T2.2.3 (Day 4-5)
  Deliverables: SAML login/logout working with MockSAML (Day 5), sessions persisting (Day 5)

Team 3 (Realtime):
  Engineer E: T3.3.1-T3.3.2 (Day 1-3, mock data) -> T3.3.3-T3.3.4 (Day 3-5)
  Engineer F: [Assists T3.3 Day 1-2] -> T3.5.1-T3.5.2 (Day 2-5, mock/static data)
  Deliverables: Dashboard grid working with placeholder widgets (Day 5), timeline bar renderer working with mock data (Day 5)

Team 4 (Historical):
  Engineer G: T4.4.1-T4.4.2 (Day 1-3) -> T4.4.3-T4.4.4 (Day 3-5)
  Engineer H: T4.3.1 report framework (Day 1-2) -> T4.1.1-T4.1.2 (Day 2-5, mock data)
  Deliverables: PDF/CSV/HTML render engine working with sample data (Day 5), report framework shell (Day 2)

Integration Points:
  - HP-1: T1.1 scaffolding complete -> unblocks T2.2, T3.3, T4.4 (End of Day 1)
  - HP-2: T1.2 schema complete -> unblocks T2.3, T4.1 real data (End of Day 3)
```

### Week 2: Core Services Sprint
**Goal**: Events flowing end-to-end, permissions enforced, WebSocket live.

```
Team 1 (Pipeline):
  Engineer A: T1.5.1-T1.5.2 (Day 1-2) -> T1.5.3-T1.5.4 (Day 2-3) -> T1.6.1-T1.6.2 (Day 3-5)
  Engineer B: T1.3.3-T1.3.4 (Day 1-2) -> T1.3.5-T1.3.6 (Day 2-4) -> T1.5 integration test (Day 4-5)
  Deliverables: DevLink3 client authenticates + streams events (Day 4), events in DB + Redis (Day 5)

Team 2 (Auth):
  Engineer C: T2.3.1-T2.3.2 (Day 1-2) -> T2.3.3-T2.3.4 (Day 2-3) -> T2.5.1-T2.5.2 (Day 3-4) -> T2.5.3 (Day 4-5)
  Engineer D: T2.4.1-T2.4.2 (Day 1-3) -> T2.4.3 (Day 3-4) -> T1.7.1-T1.7.2 (Day 4-5)
  Deliverables: Users provisioned from SAML (Day 3), permissions enforced on all routes (Day 5), agent mapping UI (Day 4)

Team 3 (Realtime):
  Engineer E: T3.1.1-T3.1.2 (Day 1-2) -> T3.1.3 (Day 2-3) -> T3.2.1-T3.2.2 (Day 3-5)
  Engineer F: T3.5.3-T3.5.4 (Day 1-2) -> T3.5.5-T3.5.6 (Day 2-3) -> T3.5.7-T3.5.8 (Day 3-5)
  Deliverables: WebSocket server streaming live events (Day 3), state engine computing metrics (Day 5), agent timeline feature complete with mock data (Day 5)

Team 4 (Historical):
  Engineer G: T4.1.3-T4.1.4 (Day 1-2) -> T4.1.5-T4.1.6 (Day 2-3) -> T4.1.7-T4.1.8 (Day 3-4) -> T4.2.1 (Day 4-5)
  Engineer H: T4.3.2-T4.3.4 (Day 1-3, first 3 MVP reports) -> T4.3.5-T4.3.7 (Day 3-5, next 3 MVP reports)
  Deliverables: Cradle-to-Grave feature complete with all 40+ columns (Day 4), filter panel shell (Day 5), 6 MVP reports built (Day 5)

Integration Points:
  - HP-4: T1.5 events to Redis -> unblocks T3.2 live data (End of Day 3)
  - HP-5: T2.5 permission guards -> unblocks T1.7, T1.8, T3.7, T4.6 (End of Day 5)
  - HP-6: T1.5 events to PostgreSQL -> unblocks T4.1 live data (End of Day 3)
```

### Week 3: Feature Build Sprint (Part 1)
**Goal**: Dashboards populated with live data, filters operational, reports rendering.

```
Team 1 (Pipeline):
  Engineer A: T1.6.3-T1.6.4 (Day 1-3, SMDR reconciliation) -> T1.8.1-T1.8.2 (Day 3-5)
  Engineer B: T1.4.3-T1.4.5 (Day 1-3, simulator scenarios) -> T1.8.3 (Day 3-4) -> Integration testing (Day 4-5)
  Deliverables: SMDR fully reconciled with DevLink3 (Day 3), system config API + UI (Day 5), full scenario simulator (Day 3)

Team 2 (Auth):
  Engineer C: T2.6.1-T2.6.3 (Day 1-3) -> T2.6.4-T2.6.5 (Day 3-5)
  Engineer D: T1.7.3-T1.7.4 (Day 1-3, skills UI + metrics) -> Cross-team: assist T4.6 permission model (Day 3-5)
  Deliverables: All settings pages complete (Day 5), skills routing fully operational (Day 3)

Team 3 (Realtime):
  Engineer E: T3.2.3-T3.2.5 (Day 1-2, state snapshots + trunk) -> T3.4.1-T3.4.3 (Day 2-4, first 3 widgets) -> T3.4.4-T3.4.5 (Day 4-5, next 2 widgets)
  Engineer F: T3.4.6-T3.4.8 (Day 1-3, widgets 6-8) -> T3.4.9-T3.4.10 (Day 3-4, widgets 9-10) -> T3.7.1-T3.7.2 (Day 4-5, alert engine)
  Deliverables: 10 widgets live on dashboard (Day 5), state engine with snapshots (Day 2), alert rule builder (Day 5)

Team 4 (Historical):
  Engineer G: T4.2.2-T4.2.4 (Day 1-3, agent + direction + duration filters) -> T4.2.5-T4.2.7 (Day 3-5, event + party + group filters)
  Engineer H: T4.3.8 (Day 1, last MVP report) -> T4.3.9-T4.3.12 (Day 1-3, Tier 2 reports 1-4) -> T4.6.1-T4.6.2 (Day 3-5, recording ingest)
  Deliverables: 35+ filters operational (Day 5), 12 reports done (Day 3), recording ingest from FTP (Day 5)

Integration Points:
  - HP-7: T3.2 state engine API -> widgets consume live metrics (Day 2)
  - HP-8: T4.4 render engine + T4.3 framework -> reports render to PDF/CSV (Day 1)
  - Cross-team: T2.5 guards used by T4.6 recording permissions (Day 3)
```

### Week 4: Feature Build Sprint (Part 2)
**Goal**: All widgets, filters complete, wallboard builder, recording playback, remaining reports.

```
Team 1 (Pipeline):
  Engineer A: End-to-end integration testing: DevLink3 simulator -> client -> pipeline -> DB + Redis (Day 1-3) -> Performance tuning, index optimization (Day 3-5)
  Engineer B: SMDR simulator completion + testing (Day 1-2) -> Cross-team: assist Team 3 with data binding for widgets (Day 2-5)
  Deliverables: Full pipeline stress-tested (Day 3), SMDR simulator (Day 2)

Team 2 (Auth):
  Engineer C: Cross-team: integration test auth flows end-to-end (Day 1-2) -> Assist Team 4 with recording permission model (Day 2-3) -> Bug fixes + polish (Day 3-5)
  Engineer D: Cross-team: assist Team 3 with wallboard save/load permissions (Day 1-3) -> Bug fixes + polish (Day 3-5)
  Deliverables: All auth/permission edge cases resolved (Day 5)

Team 3 (Realtime):
  Engineer E: T3.4.11-T3.4.14 (Day 1-2, remaining 4 widgets) -> T3.6.1-T3.6.3 (Day 2-5, wallboard canvas + palette + config)
  Engineer F: T3.7.3-T3.7.6 (Day 1-3, alert notifications + email + built-ins) -> T3.6.4-T3.6.5 (Day 3-5, wallboard background + save/load)
  Deliverables: All 14 widgets complete (Day 2), alerts fully operational (Day 3), wallboard editor functional (Day 5)

Team 4 (Historical):
  Engineer G: T4.2.8-T4.2.15 (Day 1-3, remaining filters + presets) -> T4.5.1-T4.5.2 (Day 3-5, scheduler UI + cron)
  Engineer H: T4.6.3-T4.6.5 (Day 1-3, matching + compression + storage) -> T4.6.6-T4.6.7 (Day 3-5, playback UI + waveform notes)
  Deliverables: All 83 filters complete (Day 3), filter presets (Day 3), scheduler started (Day 5), recording playback UI (Day 5)

Integration Points:
  - All widgets bind to live state engine data (Day 2)
  - Recording playback integrated into Cradle-to-Grave expanded rows (Day 5)
```

### Week 5: Completion & Integration Sprint
**Goal**: All features complete, cross-team integration, remaining reports, recording features.

```
Team 1 (Pipeline):
  Engineer A: Production Docker build optimization (multi-stage, layer caching) (Day 1-2) -> Load testing: simulate 50 concurrent agents, 500 calls/hour (Day 2-4) -> Database partitioning validation (Day 4-5)
  Engineer B: Cross-team: assist with any data-layer bugs (Day 1-5) -> Monitoring: health check endpoints, logging (Day 3-5)
  Deliverables: Production-ready Docker images (Day 2), load test results (Day 4)

Team 2 (Auth):
  Engineer C: Security audit: SAML edge cases, session hijacking, CSRF (Day 1-3) -> Cross-team bug fixes (Day 3-5)
  Engineer D: Cross-team: final integration testing of permission guards across all features (Day 1-5)
  Deliverables: Security audit complete (Day 3), all permissions verified (Day 5)

Team 3 (Realtime):
  Engineer E: T3.6.6-T3.6.8 (Day 1-3, wallboard view mode + templates + rotation) -> Integration test: dashboard + wallboard end-to-end (Day 3-5)
  Engineer F: Cross-team: integrate Agent Timeline with skills display from T1.7 (Day 1-2) -> Wallboard polish + testing (Day 2-5)
  Deliverables: Wallboard builder complete (Day 3), all realtime features polished (Day 5)

Team 4 (Historical):
  Engineer G: T4.5.3-T4.5.4 (Day 1-3, scheduler email + management) -> T4.3.13-T4.3.16 (Day 3-5, Tier 2 reports 5-8)
  Engineer H: T4.6.8-T4.6.10 (Day 1-3, snippets + links + PCI) -> T4.6.11-T4.6.12 (Day 3-5, rules + scorecards)
  Deliverables: Report scheduler complete (Day 3), all Tier 2 reports (Day 5), recording lifecycle complete (Day 5)

Integration Points:
  - Full end-to-end flow: DevLink3 event -> DB -> dashboard widget -> wallboard (Day 3)
  - Recording playback in Cradle-to-Grave verified (Day 2)
  - Scheduled reports delivered via email verified (Day 3)
```

### Week 6: Polish, Extended Reports & Release
**Goal**: Extended reports, QA, performance, documentation, release candidate.

```
Team 1 (Pipeline):
  Engineer A: T4.3.17-T4.3.24 (Day 1-3, assist Team 4 with Tier 3 reports data queries)
  Engineer B: Final Docker Compose production config (Day 1-2) -> .env.example documentation (Day 2-3) -> Deployment guide (Day 3-5)
  Deliverables: All data queries optimized (Day 3), deployment documentation (Day 5)

Team 2 (Auth):
  Engineer C: T4.3.25-T4.3.32 (Day 1-3, assist Team 4 with remaining Tier 3 reports)
  Engineer D: End-to-end QA: run through every feature as each role (admin, supervisor, agent, viewer) (Day 1-5)
  Deliverables: All roles tested end-to-end (Day 5)

Team 3 (Realtime):
  Engineer E: Performance optimization: WebSocket batching tuning, memory profiling, state engine GC (Day 1-3) -> Cross-team QA (Day 3-5)
  Engineer F: UI polish: animations, loading states, error states, empty states across all realtime views (Day 1-5)
  Deliverables: Realtime performance validated at scale (Day 3), UI polished (Day 5)

Team 4 (Historical):
  Engineer G: T4.3.17-T4.3.32 (Day 1-4, Tier 3 extended reports) -> Export testing all formats (Day 4-5)
  Engineer H: Recording integration testing + PCI compliance verification (Day 1-3) -> Cross-team QA (Day 3-5)
  Deliverables: All 32 core reports complete (Day 4), recording PCI verified (Day 3)

Integration Points:
  - Full regression test: all 4 teams run through integration scenarios (Day 4-5)
  - Release candidate tagged (Day 5)
```

---

## 6. Risk Mitigation

### Highest-Risk Tasks

| Risk | Task | Impact | Probability | Mitigation |
|------|------|--------|-------------|------------|
| **DevLink3 protocol bugs** | T1.3 | Critical -- no data without it | HIGH | C# reference implementation available in `avaya-sample/IPOtut/`. Build simulator (T1.4) in parallel so protocol can be tested without live Avaya. Allocate 30% buffer on T1.3. |
| **DevLink3 simulator fidelity** | T1.4 | High -- all development depends on realistic test data | MEDIUM | Base scenarios on actual Chronicall/TASKE documented call flows. Build continuous mode early so teams have test data. |
| **83 filters complexity** | T4.2 | High -- each filter is a custom UI component + DB query | MEDIUM | Build generic filter components (range input, multi-select, boolean toggle) first. Most filters use 4-5 UI patterns. Batch similar filters together. |
| **69 report templates** | T4.3 | Medium -- huge volume but each is similar | LOW | Build the report framework (T4.3.1) with shared components first. Each report becomes mostly configuration after that. Prioritize into 3 tiers. |
| **Recording compression** | T4.6.4 | Medium -- ffmpeg in Docker adds complexity | MEDIUM | Use pre-built ffmpeg Docker image or static binary. Test Opus encoding early. Fallback: serve WAV directly (10x larger but works). |
| **WebSocket scale** | T3.1, T3.2 | Medium -- 50 concurrent supervisors watching live data | LOW | Redis adapter for Socket.io handles pub/sub scaling. 100ms batching prevents event storms. Test with simulated 50 connections in Week 5. |
| **SAML edge cases** | T2.1 | Medium -- every IdP behaves differently | MEDIUM | MockSAML covers happy path. Document known Okta/AzureAD/OneLogin quirks. Plan for 2-3 days of IdP-specific debugging during customer deployment. |
| **Database performance** | T1.2 | Medium -- call_events grows fast at 50 agents | LOW | Partition by month from Day 1. Composite indexes on (call_id, timestamp, agent_id). Load test in Week 5 with 500 calls/hour. |

### Buffer Allocation

| Category | Base Estimate | Buffer | Buffered Total |
|----------|--------------|--------|----------------|
| Team 1 (Pipeline) | 112h | +20% (22h) | 134h |
| Team 2 (Auth) | 104h | +10% (10h) | 114h |
| Team 3 (Realtime) | 164h | +15% (25h) | 189h |
| Team 4 (Historical) | 184h | +20% (37h) | 221h |
| **Total** | **564h** | **+17% (94h)** | **658h** |

At 2 engineers per team, 40h/week each: 80h/team/week, 480h total per team over 6 weeks. This gives us comfortable headroom.

### Contingency Plans

1. **If T1.3 DevLink3 takes longer**: Team 3 and 4 continue with mock data. Simulator (T1.4) provides test events even without the real client library. The client and simulator are independently testable.

2. **If T4.2 filter volume is too large**: Ship with Tier 1 filters (agent, direction, duration, status = 25 filters) by Week 4. Add Tier 2 (event, party, group = 30 more) by Week 5. Tier 3 (notes, tags, system, post-filter = remaining 28) can slip to Week 6 or post-launch.

3. **If T4.3 report volume is too large**: The 8 MVP reports (Tier 1) cover 80% of daily supervisor needs. Tier 2 (8 more) covers 95%. Tier 3 (16 extended) is stretch. The report framework makes each additional report a 1-2 hour task.

4. **If T3.6 wallboard builder is complex**: Ship with a simplified version (pre-built templates only, no freeform canvas) by Week 4. Add the full editor as a fast-follow.

5. **If T4.6 recording integration hits issues**: Ship recording ingest + playback (T4.6.1-T4.6.6) as MVP. Scorecards (T4.6.12), PCI (T4.6.10), and rules engine (T4.6.11) can be Phase 1.5.

---

## Summary: Key Numbers

| Metric | Value |
|--------|-------|
| Total tasks | 26 major tasks |
| Total sub-tasks | 143 individually-completable units |
| Total estimated hours | 564h (658h with buffer) |
| Teams | 4 teams x 2 engineers = 8 engineers |
| Duration | 6 weeks (240 working hours per person) |
| Critical path length | ~156h (19.5 working days) |
| Zero-dependency tasks | 5 (can start Day 1) |
| Report templates (MVP/Standard/Extended) | 8 / 8 / 16 = 32 core reports |
| Filters to implement | 83 across 14 categories |
| Dashboard widgets | 14 types |
| Recording sub-features | 12 sub-tasks |

### Parallelism Achieved

- **Week 1**: All 4 teams productive from Day 1 (5 zero-dependency tasks)
- **Week 2**: All 4 teams building core features (7 tasks in parallel)
- **Week 3**: Maximum parallelism: 8 engineers on 8 different feature streams
- **Blocking wait time**: < 2 days for any team (only Team 3 waits for T1.5 pipeline)
- **Cross-team dependencies**: 8 hand-off points, all at week boundaries
