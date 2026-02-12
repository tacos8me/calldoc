# CallDoc: Avaya IP Office 11 Call Center Management Platform
## Project Roadmap & Parallel Team Architecture

---

## Project Overview

**Product Name**: CallDoc
**Description**: A self-hosted (Docker) call center reporting and management platform for Avaya IP Office 11, replicating and improving upon the core functionality of TASKE Contact and Xima Chronicall (now "Avaya Call Reporting").

**Tech Stack**: Next.js 14+ (App Router) + TypeScript + PostgreSQL 16 + Redis 7 + Socket.io
**Auth**: SAML 2.0 (Okta primary) via @node-saml/passport-saml
**Integration**: Avaya IP Office 11 via DevLink3 protocol (TCP:50797 / TLS:50796) + SMDR (TCP:1150)
**Deployment**: Docker Compose (self-hosted)
**Testing**: DevLink3 simulator + SMDR simulator (no live API available)
**Scale**: Single IP Office initially (multi-site SCN in Phase 2)

---

## Research Documents Index

| Document | Path | Contents |
|----------|------|----------|
| Chronicall Competitive Analysis | `Chronicall_Research_Breakdown.md` | 50+ reports, 69 metrics, 14 widgets, competitive weaknesses |
| TASKE Competitive Analysis | `TASKE_Research_Breakdown.md` | 150+ reports, full data model, UI screens |
| DevLink3 Protocol Spec | `DevLink3_Protocol_Spec.md` | Binary framing, SHA1 auth, packet types, Delta3 XML format |
| Avaya DevLink3 Reference | `avaya-sample/devlink3-reference.md` | Official protocol docs (user-provided) |
| C# Reference Implementation | `avaya-sample/IPOtut/` | Working DevLink3 client code |
| SMDR Format Spec | `Avaya_SMDR_Format_Spec.md` | 30+ field CSV format, TCP transport, parsing rules |
| Chronicall Metric Definitions | `chronicall-metric-definitions.md` | 381 items: 69 agent, 66 call, 80 time metrics, 83 filters |
| Cradle-to-Grave UI Spec | `Chronicall_Cradle_to_Grave_UI_Spec.md` | 40+ columns, 80+ filters, event timeline, export |
| Realtime UI Specs | `Chronicall_Realtime_UI_Specs.md` | Wallboard widgets, Agent Timeline, Group Timeline, WebSocket API |
| Recording Integration Spec | `Recording_Integration_Spec.md` | 3 capture methods, storage, playback, PCI, scorecards |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │   Next.js    │  │  PostgreSQL  │  │    Redis       │ │
│  │   App        │  │  (call data, │  │  (sessions,    │ │
│  │  (SSR +API)  │  │   config,    │  │   real-time    │ │
│  │              │  │   users)     │  │   pub/sub)     │ │
│  └──────┬───────┘  └──────────────┘  └───────────────┘ │
│         │                                                │
│  ┌──────┴───────┐  ┌──────────────────────────────────┐ │
│  │  WebSocket   │  │  DevLink3 Connector Service      │ │
│  │  Server      │◄─┤  (TCP/TLS client → event stream) │ │
│  │  (Socket.io) │  │  Ingests events → PostgreSQL     │ │
│  └──────────────┘  └──────────┬───────────────────────┘ │
│                               │                          │
│  ┌────────────────────────────┴───────────────────────┐ │
│  │  DevLink3 Simulator (dev/test only)                │ │
│  │  Emits realistic call events, agent states, queues │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
          │
          │ DevLink3 Protocol (TCP:50797 / TLS:50796)
          ▼
┌─────────────────────┐
│  Avaya IP Office 11 │  (production only)
│  CTI Link Pro       │
└─────────────────────┘
```

---

## Database Schema (Core Tables)

```sql
-- System configuration
systems                -- IP Office connection configs (DevLink3 + SMDR)
system_status          -- Connection health monitoring

-- Users & Auth
users                  -- Application users (from SAML)
user_roles             -- Role assignments (admin, supervisor, agent)
saml_configs           -- Per-tenant IdP configurations
sessions               -- Active sessions (backed by Redis)
agent_mappings         -- User → IP Office extension mapping
user_preferences       -- Per-user settings (color legend, dashboard layout, filter presets)

-- Call Data (the core)
calls                  -- Master call record (one row per call)
call_events            -- Every event in a call lifecycle (19 event types + 14 contact center)
call_parties           -- External/internal parties on each call
call_recordings        -- Recording metadata + file references
call_notes             -- Per-call notes from Cradle-to-Grave UI

-- SMDR Data (backup/reconciliation)
smdr_records           -- Raw SMDR records (30+ fields per record)
smdr_reconciliation    -- SMDR ↔ DevLink3 call matching log

-- Phone System Entities
agents                 -- IP Office agents (synced via DevLink3)
agent_states           -- Real-time + historical agent state log
extensions             -- IP Office extensions
hunt_groups            -- IP Office hunt groups (queues)
hunt_group_members     -- Agent ↔ hunt group membership
trunks                 -- IP Office trunks
trunk_groups           -- Trunk groupings

-- Skills-Based Routing
skill_groups           -- Skill group definitions
skill_group_members    -- Agent ↔ skill group with expertise ranking (1-10)
skill_routing_rules    -- Routing algorithm config (Most Idle, Circular, Linear, Highest Skill First)

-- Recording Module
recording_storage_pools -- Storage pool configs (local, network, S3)
recording_rules        -- Recording rules engine (7 rule types, per-agent/group/number)
recording_notes        -- Timestamped markers on recording waveform
recording_pause_events -- PCI pause/resume audit trail
scorecard_templates    -- Quality scoring templates (yes/no, scale, text questions)
scorecard_responses    -- Per-recording evaluations with scores
recording_share_links  -- External listen links with TTL

-- Reporting & Config
report_templates       -- Standard + custom report definitions
report_schedules       -- Automated report generation jobs
saved_filters          -- Per-user saved filter presets (Cradle-to-Grave)
alert_rules            -- Threshold-based alert configurations (3 severity levels)
alert_history          -- Fired alert log
wallboard_layouts      -- Saved wallboard configurations
wallboard_widgets      -- Widget definitions within layouts

-- Organization
agent_groups           -- Custom agent groupings (separate from hunt groups)
agent_group_members    -- Agent ↔ custom group membership
```

---

## 4 Parallel Teams

### TEAM 1: Core Infrastructure & DevLink3 Integration
**Focus**: The foundation everything depends on - DevLink3 protocol, event pipeline, database, Docker

### TEAM 2: Authentication & User Management
**Focus**: SAML/Okta auth, user roles, permissions, agent-extension mapping, session management

### TEAM 3: Real-time Engine & Dashboards
**Focus**: WebSocket server, live dashboards, agent timeline, queue monitoring, wallboard builder, alerts

### TEAM 4: Historical Data, Reports & Recording
**Focus**: Cradle-to-grave, search/filter, standard reports, report scheduling, call recording integration

---

## Detailed Task Breakdown

### TEAM 1: Core Infrastructure & DevLink3

#### T1.1 - Project Scaffolding & Docker Setup
- Initialize Next.js 14 project with App Router, TypeScript strict mode
- Configure Tailwind CSS + shadcn/ui component library
- Docker Compose: Next.js app, PostgreSQL 16, Redis 7
- Environment configuration (.env schema)
- ESLint + Prettier config
- **Deliverable**: `docker compose up` boots the full stack

#### T1.2 - PostgreSQL Schema & Migrations
- Design and implement full database schema (see above)
- Drizzle ORM setup with typed schema definitions
- Migration system (drizzle-kit)
- Seed data scripts (empty structure, no mock data)
- Index strategy for call_events (timestamp, call_id, agent_id, event_type)
- Partitioning strategy for call_events table (by month)
- **Deliverable**: All tables created, ORM typed, migrations run on startup

#### T1.3 - DevLink3 Protocol Client Library
- TypeScript library: `lib/devlink3/`
- **Binary framing**: 0x49 discriminator + 2-byte big-endian length + payload
- **Packet types**: Test (002A0001), Auth (00300001), EventRequest (00300011), Event (10300011)
- **SHA1 challenge-response auth**:
  - Phase 1: Send username with 00000001 prefix
  - Phase 2: SHA1(challenge + password_utf8_padded_16) with 00000050 prefix
  - See `DevLink3_Protocol_Spec.md` and `avaya-sample/IPOtut/Packet.cs`
- **Event registration**: Send flag string "-SIPTrack" (or -CallDelta3, -CMExtn, etc.)
- **Delta3 XML parser**: Parse Detail, CallLost, LinkLost, AttemptReject records
  - Call section: 18 fields (State, Flags, CalledType, CallID, TargetGroup, timestamps, etc.)
  - Party section: 26 fields (State, Connected, Name, EqType, CallingPN, etc.)
  - Target section: 14 fields
- TCP/TLS socket connection management with reconnection (exponential backoff)
- Event types mapped to TypeScript:
  - Call events: CallCreated, CallRinging, CallAnswered, CallHeld, CallRetrieved, CallTransferred, CallConferenced, CallDisconnected, CallQueued, CallDequeued, CallParked
  - Agent events: AgentLogin, AgentLogout, AgentReady, AgentNotReady, AgentDND, AgentACW, AgentMCW
  - System events: TrunkBusy, TrunkIdle, HuntGroupStatus
- Connection health monitoring (Test packet keepalive)
- **Reference**: C# implementation in `avaya-sample/IPOtut/DevLink3.cs` and `Packet.cs`
- **Deliverable**: Typed DevLink3 client that connects, authenticates, and streams events

#### T1.4 - DevLink3 Simulator
- Standalone Node.js TCP server mimicking IP Office DevLink3
- Configurable scenarios:
  - Normal call flow (ring → answer → talk → disconnect)
  - Queue overflow (ring → queue → overflow → answer)
  - Transfer chain (A → B → C with hold events)
  - Conference call
  - Abandoned call (ring → queue → disconnect)
  - Agent state changes (login → ready → busy → ACW → ready → DND → logout)
- Realistic timing (randomized durations within configurable ranges)
- Configurable agent pool (10-50 agents), hunt groups (3-10), trunks (10-30)
- Scenario scripting via JSON config files
- Continuous mode: generates random realistic call center traffic
- **Deliverable**: `docker compose --profile dev up` starts simulator alongside app

#### T1.5 - Event Ingestion Pipeline
- DevLink3 Connector Service (long-running process)
- Connects to DevLink3 (simulator or real IP Office)
- Transforms raw events → normalized database records
- Writes to PostgreSQL (calls, call_events, agent_states)
- Publishes real-time events to Redis pub/sub (for WebSocket distribution)
- Maintains in-memory state map (current agent states, active calls, queue depths)
- Error handling: event logging, dead letter queue for failed writes
- **Deliverable**: Events flow from DevLink3 → DB + Redis continuously

#### T1.6 - SMDR Ingestion Service
- TCP listener on configurable port (default 1150)
- Accepts push from IP Office or pulls via TCP connect
- CSV parser for 30+ SMDR fields (see `Avaya_SMDR_Format_Spec.md`)
- Device type prefix decoder (E=extension, T=trunk, V=voicemail/conference)
- Continuation record assembly: group by Call ID, process in order
- Call direction logic: Direction + Is Internal → Inbound/Outbound/Internal
- External Targeting Cause decoder (source + reason codes)
- Reconciliation engine: match SMDR records to DevLink3 calls by Call ID + timestamp window
- Handles: missing DevLink3 data (SMDR as primary), conflicting data (DevLink3 wins)
- Buffer: 3,000 record buffer support matching IP Office capability
- **Deliverable**: SMDR records ingested, parsed, reconciled with DevLink3 data

#### T1.7 - Skills-Based Routing Configuration
- Skill group CRUD API: create/edit/delete skill groups
- Agent-skill mapping with expertise ranking (1-10)
- Routing algorithm configuration per skill group:
  - Most Idle Agent (default)
  - Circular (round-robin)
  - Linear (priority order)
  - Intelligent Highest Skill First
- Skill group display in Agent Timeline and Dashboard widgets
- Skill-based metrics: per-skill call volume, answer rate, wait time
- **Deliverable**: Skills routing configured and visible across all views

#### T1.8 - System Configuration API
- REST endpoints for IP Office connection management (DevLink3 + SMDR)
- POST /api/system/connections - Add IP Office connection
- GET /api/system/connections - List connections
- PUT /api/system/connections/:id - Update connection
- DELETE /api/system/connections/:id - Remove connection
- GET /api/system/status - Connection health dashboard data
- Connection test endpoint (attempt DevLink3 handshake + SMDR connection)
- **Deliverable**: Admin can configure and test IP Office connections

---

### TEAM 2: Authentication & User Management

#### T2.1 - SAML 2.0 Integration (Okta)
- Install and configure @node-saml/passport-saml
- Next.js API routes:
  - GET /auth/saml/login - SP-initiated login redirect
  - POST /auth/saml/callback - ACS endpoint (assertion consumer)
  - GET /auth/saml/metadata - SP metadata XML
  - GET /auth/saml/logout - SP-initiated logout
  - POST /auth/saml/slo - IdP-initiated logout callback
- SAML configuration stored in DB (saml_configs table)
- Certificate management (PEM storage, rotation support)
- Attribute mapping: email, firstName, lastName, groups
- MockSAML Docker container for development/testing
- **Deliverable**: Full SAML login/logout flow working with MockSAML

#### T2.2 - Session Management
- Redis-backed server sessions
- httpOnly secure cookie (sameSite: lax)
- Session schema: userId, tenantId, email, roles, agentMapping, samlNameID, samlSessionIndex
- Absolute timeout: 12 hours (longest shift)
- Idle timeout: 30 minutes (skip during active calls)
- Force logout capability (admin)
- Session middleware for all API routes and pages
- **Deliverable**: Authenticated sessions persist across requests, timeout correctly

#### T2.3 - User & Role Management
- Role hierarchy: admin > supervisor > agent > wallboard-only
- Permission definitions per role:
  - admin: full access
  - supervisor: monitor agents, view reports, manage wallboards, access recordings
  - agent: view own stats, queue status
  - wallboard-only: read-only dashboards
- SAML group → role mapping (configurable per deployment)
- User CRUD API (under `/api/admin/users` per COMPONENT_ARCHITECTURE.md):
  - GET /api/admin/users - List users (admin)
  - POST /api/admin/users - Create user
  - PUT /api/admin/users - Update user (roles, mapping)
  - DELETE /api/admin/users - Deactivate user
- Auto-provision users on first SAML login (JIT provisioning)
- **Deliverable**: Users created from SAML, roles assigned, permissions enforced

#### T2.4 - Agent-Extension Mapping
- UI for admins to map application users → IP Office extensions
- Auto-discovery: pull extension list from DevLink3 on connection
- Mapping table: user_id → extension_number, hunt_groups[]
- Bulk import (CSV upload)
- Validation: warn if extension already mapped to another user
- **Deliverable**: Admin can associate each user with their IP Office extension

#### T2.5 - Permission Middleware & Guards
- Next.js middleware for route protection
- API route guards: requireAuth, requireRole(role), requirePermission(perm)
- Resource-level access control:
  - Supervisors see only their assigned agent groups
  - Agents see only their own data
  - Admins see everything
- React context: useAuth() hook for client-side permission checks
- **Deliverable**: All routes and APIs enforce role-based access

#### T2.6 - Settings & Profile Pages
- /admin/users - User management table (admin only)
- /admin/settings - System configuration including DevLink3, SMTP, SAML, roles (admin only). Note: `/api/admin/settings` covers system connections.
- /admin/recording-rules - Recording rule management (admin only)
- /admin/storage-pools - Storage pool management (admin only)
- **Deliverable**: Full settings UI for all admin functions

---

### TEAM 3: Real-time Engine & Dashboards

#### T3.1 - WebSocket Server (Socket.io)
- Socket.io server integrated with Next.js custom server
- Redis adapter for Socket.io (pub/sub scaling)
- Authentication: validate session cookie on WebSocket handshake
- Channels:
  - `agent-states` - All agent state changes
  - `call-events` - Live call events
  - `queue-stats` - Queue depth, wait times, service levels
  - `alerts` - Fired alert notifications
  - `agent:{id}` - Per-agent channel
  - `group:{id}` - Per-hunt-group channel
- Rate limiting: batch events at 100ms intervals for UI performance
- Reconnection handling client-side
- **Deliverable**: Real-time events stream to connected browsers

#### T3.2 - Real-time State Engine
- In-memory state manager (server-side):
  - Current state of every agent (idle/busy/DND/ACW/etc.)
  - Active calls map (callId → participants, state, duration)
  - Queue depths per hunt group
  - Service level calculations (rolling TSF/ASF)
  - Trunk utilization
- State snapshots: new WebSocket connections receive current state immediately
- Computed metrics:
  - Calls waiting per queue
  - Longest wait time
  - Average speed of answer (rolling)
  - Agent occupancy rate
  - Service level % (configurable threshold, default 80/20)
- Persist state snapshots to Redis (survive service restart)
- **Deliverable**: Accurate real-time state available via API and WebSocket

#### T3.3 - Dashboard Layout System
- /dashboard - Main supervisor dashboard
- Responsive grid layout system (CSS Grid / react-grid-layout)
- Drag-and-drop widget placement
- Widget resize handles
- Save/load layout configurations per user
- Default layouts per role (supervisor default, agent default)
- **Deliverable**: Customizable drag-and-drop dashboard framework

#### T3.4 - Dashboard Widgets
Build the following widget components:

| Widget | Data Source | Display |
|--------|-----------|---------|
| **Agent Status Grid** | agent-states channel | Color-coded cards showing each agent's current state, extension, current call duration |
| **Queue Summary Cards** | queue-stats channel | Per-queue: calls waiting, longest wait, agents logged in, service level % |
| **Active Calls Table** | call-events channel | Live table: caller ID, agent, duration, queue, event type |
| **Service Level Gauge** | computed metrics | Circular gauge showing current SL% with threshold coloring (green/yellow/red) |
| **Call Volume Chart** | computed metrics | Real-time line chart: calls per 15-min interval, today vs. yesterday |
| **Agent Leaderboard** | computed metrics | Ranked list: most calls handled, best avg talk time, etc. |
| **Queue Depth Chart** | queue-stats channel | Bar chart: calls waiting per queue, color-coded by threshold |
| **Trunk Utilization** | trunk events | Bar showing trunk usage % across trunk groups |
| **KPI Ticker** | computed metrics | Scrolling marquee of key numbers |
| **Clock/Date** | system | Large format clock for wallboard displays |

- **Deliverable**: 10+ functional real-time widgets

#### T3.5 - Agent Timeline View
- /agent-timeline - Agent Timeline page
- Horizontal timeline bars per agent (like Chronicall)
- Color-coded events: Colors defined in FRONTEND_UX_SPEC.md Section 4.2 event palette
- Customizable color legend
- Hover tooltip: event type, duration, caller ID, group
- Sort by: name A-Z, extension, current state, idle time
- Filter: select specific agents, groups
- Click agent row → detailed agent view with full day history
- Historical timeline: date picker to view any past day
- Live Column View toggle: agents grouped by current state in columns
- **Deliverable**: Full agent timeline with real-time updates

#### T3.6 - Wallboard Builder
- /wallboards - Wallboard management page
- /wallboards/:id/edit - Visual wallboard editor
- /wallboards/:id/view - Full-screen wallboard display (for TVs)
- Canvas-based editor:
  - Drag-and-drop widget placement from palette
  - Widget resize and positioning
  - Background color or image upload
  - Per-widget data binding (select metric, group, agent, time frame)
  - Per-widget styling (font, color, border)
  - Title Value, Gauge, Chart, Active Calls, Agent Box, Group Box, Marquee, Image, Web embed
- Pre-built templates (quick start)
- Auto-rotate between multiple wallboards (configurable interval)
- Kiosk mode (hide browser chrome)
- **Deliverable**: Full wallboard builder matching Chronicall's HTML wallboards

#### T3.7 - Alerts & Notification Engine
- /settings/alerts - Alert rule management
- Alert rule builder:
  - Select metric (calls in queue, wait time, agent idle time, SL%, etc.)
  - Set condition (>, <, =, >=, <=)
  - Set threshold value
  - Set evaluation window (immediate, 5min rolling, etc.)
  - Cooldown period (don't re-fire for X minutes)
- Notification channels:
  - In-app notification (toast + notification center)
  - Email (via SMTP config)
  - WebSocket push to wallboards (color change, flash)
- Alert history log with timestamps
- Standard alerts (built-in):
  - Emergency number dialed (911)
  - Service disconnection (DevLink3 lost)
  - Disk space warning
- **Deliverable**: Configurable threshold alerts with email + in-app notifications

---

### TEAM 4: Historical Data, Reports & Recording

#### T4.1 - Cradle-to-Grave View
- /calls - Main call history page
- Paginated table with sortable columns:
  - Call ID, Start Time, End Time, Duration
  - Direction (Inbound/Outbound/Internal)
  - Calling Party (number + name), Called Party
  - Initial Agent, Final Agent
  - Initial Group, Final Group
  - Is Answered, Is Abandoned, Is Recorded
  - Trunk, Account Code
- Click row → expand to show full event timeline
- Event timeline visualization:
  - Horizontal colored bars for each event (ring, talk, hold, transfer, queue, park, voicemail)
  - Event bars show: agent/extension, duration, caller ID
  - Color-coded by event type (same palette as Agent Timeline)
- Date range picker (quick: today, yesterday, this week, this month, custom)
- **Deliverable**: Browse and inspect every call with full event detail

#### T4.2 - Advanced Search & Filter System
- Filter panel (sidebar or collapsible header)
- Filter categories (matching Chronicall's 83 filters):
  - **Agent**: agent equals, agent does not equal, initial agent, final agent
  - **Direction**: inbound, outbound, internal
  - **Duration**: call duration >/</= threshold, time to answer
  - **Events**: call includes event type, call does not include event
  - **Group**: hunt group equals, initial group, final group
  - **Parties**: calling party number, called party number, external party contains
  - **Status**: is answered, is abandoned, is recorded
  - **Time**: time of day range, days of week
  - **Other**: trunk, account code
- Combinable filters (AND logic between categories, OR within)
- Save filter presets (per user)
- Quick search: phone number search across all calls
- Export filtered results to CSV/Excel
- **Deliverable**: Comprehensive search matching Chronicall's filter depth

#### T4.3 - Standard Report Templates
Build the following report templates (matching TASKE/Chronicall core reports):

**Agent Reports:**
- Agent Performance Summary (calls handled, talk time, answer rate, idle time)
- Agent Call Summary (call counts by direction)
- Agent Time Card (login/logout times, state durations - requires real-time data)

**Group Reports:**
- Group Summary (presented, answered, missed, overflow, SL, avg speed of answer)
- Group Event Summary (detailed event breakdowns per group)

**Queue Reports:**
- Queue Summary by Group (queue depth over time, wait times, abandonment)
- Queued Call Volume (call volume by time interval)

**Call Reports:**
- Call Details (all calls with full metadata)
- Abandoned Calls (abandoned calls with wait time, caller info)
- Inbound Call Service Level (SL% by interval)

**Trunk Reports:**
- Trunk Usage Summary (utilization by trunk group)

**System Reports:**
- Emergency Calls (911/emergency number dialing log)

- Each report supports:
  - Date range selection
  - Agent/group/queue filtering
  - Time interval grouping (15min, hour, day, week, month)
  - Sort options
  - Chart visualization (bar, line, pie where appropriate)
- **Deliverable**: 12+ standard report templates with filtering and charting

#### T4.4 - Report Rendering Engine
- Server-side report generation
- Output formats: HTML (screen), PDF (print/email), CSV (export)
- Chart rendering: recharts (React) for screen, @react-pdf/renderer for PDF
- Report header: date range, filters applied, generated timestamp
- Report footer: page numbers, system name
- Print-optimized CSS
- **Deliverable**: Reports render beautifully on screen, PDF, and CSV

#### T4.5 - Report Scheduler
- /reports/schedules - Schedule management page
- Schedule builder:
  - Select report template
  - Set filters (agents, groups, date range logic)
  - Set frequency: daily, weekly, monthly
  - Set delivery: email recipients (comma-separated)
  - Set format: PDF or CSV
  - Set time of delivery
- Cron-based execution (node-cron or similar)
- Email delivery via SMTP
- Schedule history: last run, next run, success/failure log
- **Deliverable**: Automated report delivery on schedule

#### T4.6 - Call Recording Integration
- See `Recording_Integration_Spec.md` for full details
- **Recording ingestion** (3 methods):
  - FTP/SFTP from Avaya Voicemail Pro VRL directory (ssh2-sftp-client)
  - Manual file upload for testing without live Avaya
  - Future: Active Recording via DevLink3 (IP Office 11.0.4+)
- **Call-to-recording matching**: Multi-strategy (Call ID → timestamp+extension → manual)
- **Compression pipeline**: Accept .wav from Avaya, compress to Opus (~100KB/min, browser-native)
- **Storage pool system**: Docker volume (MVP), S3-compatible MinIO (production)
  - Configurable max size, write/delete restrictions, retention policies
- **Playback UI** (wavesurfer.js):
  - Inline waveform player in Cradle-to-Grave expansion
  - Playback speed control (0.5x, 1x, 1.5x, 2x) with pitch preservation
  - Waveform notes: timestamped markers on recording timeline
  - Snippet selection: download/email specific portion
  - Download button (permission-gated, .WAV export)
- **External listen links**: HMAC-signed JWT URLs with configurable TTL
- **PCI compliance**: API-triggered pause/resume + auto-resume timeout + audit trail
- **Recording rules engine**: 7 rule types (agent, group, number, direction, etc.) with 0-100% recording rate
- **Quality scorecards**: Template-based evaluation (yes/no, scale 1-10, text) with reports
- **Permission model**: Listen (supervisor+), Download (admin+), Delete (admin only)
- **Deliverable**: Full recording lifecycle: ingest, compress, store, play, score, share

#### T4.7 - Custom Report Builder (stretch goal)
- Visual report builder wizard:
  - Step 1: Choose data source (calls, agents, groups, queues)
  - Step 2: Select columns/metrics
  - Step 3: Set filters
  - Step 4: Choose grouping (summary, detailed, time interval)
  - Step 5: Preview and save
- Saved as report templates alongside standards
- **Deliverable**: Users create custom reports without code

---

## Phase 1 MVP Delivery Order

```
Week 1-2: Foundation (all teams start)
├── T1.1 Project scaffolding + Docker ← BLOCKING everything else
├── T1.2 Database schema + migrations ← BLOCKING data-dependent work
├── T1.4 DevLink3 simulator ← BLOCKING real-time dev
├── T2.1 SAML integration + MockSAML
└── T2.2 Session management

Week 2-3: Core Services
├── T1.3 DevLink3 client library (SHA1 auth, Delta3 XML parser)
├── T1.5 Event ingestion pipeline
├── T1.6 SMDR ingestion service
├── T2.3 User & role management
├── T2.5 Permission middleware
├── T3.1 WebSocket server
└── T3.2 Real-time state engine

Week 3-4: UI Build Sprint
├── T1.7 Skills-based routing configuration
├── T3.3 Dashboard layout system
├── T3.4 Dashboard widgets (first 5)
├── T3.5 Agent timeline view
├── T4.1 Cradle-to-grave view
├── T4.2 Search & filter system (83 filters)
└── T2.4 Agent-extension mapping UI

Week 4-5: Features Sprint
├── T3.4 Dashboard widgets (remaining 14 widget types)
├── T3.6 Wallboard builder (freeform canvas)
├── T3.7 Alerts & notifications (3 severity levels)
├── T4.3 Standard reports (first 6)
├── T4.4 Report rendering engine
├── T4.6 Call recording integration (full lifecycle)
└── T2.6 Settings pages

Week 5-6: Polish & Integration
├── T4.3 Standard reports (remaining)
├── T4.5 Report scheduler
├── T1.8 System configuration API
├── Integration testing (all teams)
├── Docker production build optimization
└── Documentation
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 14 App Router | SSR for dashboards, API routes for SAML, WebSocket support |
| ORM | Drizzle | Type-safe, lightweight, great PostgreSQL support |
| UI Components | shadcn/ui + Tailwind | Fast to build, customizable, good for dashboards |
| Real-time | Socket.io + Redis pub/sub | Reliable WebSocket with fallback, scales via Redis |
| Charts | Recharts | React-native, good for real-time updates |
| Wallboard | react-grid-layout | Drag-and-drop grid, proven for dashboards |
| PDF Export | @react-pdf/renderer | React-based PDF generation, shared component model |
| Audio Player | wavesurfer.js | Waveform visualization, regions, markers, speed control |
| Audio Codec | Opus (OGG container) | Browser-native, Speex successor, ~100KB/min |
| Recording Retrieval | ssh2-sftp-client | Required for VM Pro FTP on IP Office 10.1+ |
| SAML | @node-saml/passport-saml | Most maintained Node.js SAML library |
| SAML Testing | boxyhq/mock-saml | Docker-based mock IdP |
| Migrations | drizzle-kit | Type-safe, works with Drizzle ORM |
| Email | nodemailer | Standard Node.js email, works with any SMTP |
| SMDR Parser | Custom TypeScript | 30-field CSV parser, no header in TCP stream |
| External Links | HMAC-signed JWT | Stateless verification, configurable TTL |

---

## Docker Compose Services

```yaml
services:
  app:           # Next.js application (web + API + WebSocket + SMDR listener)
  postgres:      # PostgreSQL 16 (call data, config, users, recordings metadata)
  redis:         # Redis 7 (sessions, pub/sub, real-time state cache)
  devlink3-sim:  # DevLink3 simulator (dev profile only)
  smdr-sim:      # SMDR simulator (dev profile only)
  mocksaml:      # Mock SAML IdP (dev profile only)
  minio:         # S3-compatible object storage for recordings (optional, dev profile)
```

---

## File Structure

```
ipo-log/
├── docker-compose.yml
├── docker-compose.dev.yml          # Dev overrides (simulator, mocksaml)
├── Dockerfile
├── .env.example
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
│
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Auth routes (login, callback)
│   │   ├── (dashboard)/            # Protected dashboard routes
│   │   │   ├── dashboard/          # Main dashboard
│   │   │   ├── realtime/           # Agent timeline, queue view
│   │   │   ├── calls/              # Cradle-to-grave
│   │   │   ├── reports/            # Report viewer + scheduler
│   │   │   ├── wallboards/         # Wallboard builder + viewer
│   │   │   └── settings/           # Admin settings
│   │   ├── api/                    # API routes
│   │   │   ├── auth/               # SAML endpoints
│   │   │   ├── calls/              # Call data API
│   │   │   ├── agents/             # Agent data API
│   │   │   ├── groups/             # Hunt group API
│   │   │   ├── reports/            # Report generation API
│   │   │   ├── alerts/             # Alert management API
│   │   │   ├── wallboards/         # Wallboard config API
│   │   │   ├── recordings/         # Recording playback API
│   │   │   ├── system/             # System config API
│   │   │   └── users/              # User management API
│   │   └── layout.tsx
│   │
│   ├── components/                 # React components
│   │   ├── ui/                     # shadcn/ui base components
│   │   ├── dashboard/              # Dashboard widgets
│   │   ├── realtime/               # Agent timeline, queue charts
│   │   ├── calls/                  # Cradle-to-grave components
│   │   ├── reports/                # Report viewer components
│   │   ├── wallboards/             # Wallboard builder components
│   │   └── shared/                 # Shared layout, navigation
│   │
│   ├── lib/                        # Core libraries
│   │   ├── db/                     # Drizzle schema, client, migrations
│   │   ├── devlink3/               # DevLink3 client library
│   │   │   ├── client.ts           # TCP/TLS connection + SHA1 auth
│   │   │   ├── framer.ts           # Binary frame parser (0x49 + length)
│   │   │   ├── parser.ts           # Delta3 XML event parser
│   │   │   ├── types.ts            # Event type definitions
│   │   │   └── simulator/          # DevLink3 simulator
│   │   ├── smdr/                   # SMDR ingestion
│   │   │   ├── listener.ts         # TCP listener/client
│   │   │   ├── parser.ts           # CSV field parser (30+ fields)
│   │   │   ├── reconciler.ts       # SMDR ↔ DevLink3 matching
│   │   │   └── types.ts            # SMDR record types
│   │   ├── auth/                   # SAML config, session management
│   │   ├── realtime/               # State engine, WebSocket server
│   │   ├── reports/                # Report generation engine
│   │   ├── alerts/                 # Alert evaluation engine
│   │   └── recordings/             # Recording lifecycle management
│   │       ├── ingest.ts           # FTP/SFTP + upload ingestion
│   │       ├── compress.ts         # WAV → Opus compression
│   │       ├── matcher.ts          # Call-to-recording matching
│   │       ├── storage.ts          # Storage pool management
│   │       └── share.ts            # External listen link generation
│   │
│   ├── hooks/                      # React hooks
│   │   ├── useAuth.ts
│   │   ├── useSocket.ts
│   │   ├── useRealtimeData.ts
│   │   └── usePermissions.ts
│   │
│   └── types/                      # Shared TypeScript types
│       ├── calls.ts
│       ├── agents.ts
│       ├── events.ts
│       ├── reports.ts
│       └── auth.ts
│
├── migrations/                     # Drizzle migrations
└── scripts/                        # Utility scripts
    ├── seed.ts                     # DB seed (structure only)
    └── generate-scenarios.ts       # DevLink3 simulator scenarios
```
