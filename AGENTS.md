# CallDoc Agent Reference

## Spec File Index
When working on any feature, agents MUST read the relevant spec files before implementing.

### Required Reading by Task Area

#### DevLink3 Connector / Real-time Events
1. `spec/DevLink3_Protocol_Spec.md` - Binary protocol, auth, packet types, Delta3 XML
2. `spec/PROJECT_ROADMAP.md` - DB schema for calls, events, agents
3. `spec/COMPONENT_ARCHITECTURE.md` - Socket.io data flow, Zustand stores

#### SMDR Parser / CDR Backup
1. `spec/Avaya_SMDR_Format_Spec.md` - CSV field spec, TCP transport, parsing rules
2. `spec/PROJECT_ROADMAP.md` - DB schema for call records

#### Dashboard & Wallboards
1. `spec/FRONTEND_UX_SPEC.md` - Widget design, layout, motion, Tailwind config
2. `spec/Chronicall_Realtime_UI_Specs.md` - 14 widget types, 70+ metrics
3. `spec/COMPONENT_ARCHITECTURE.md` - WidgetGrid component tree, wallboardStore
4. `spec/INTERACTION_DESIGN_SPEC.md` - Dashboard user flows, real-time update behaviors

#### Cradle-to-Grave
1. `spec/Chronicall_Cradle_to_Grave_UI_Spec.md` - 40+ columns, 80+ filters, 19 event types
2. `spec/FRONTEND_UX_SPEC.md` - C2G section (expandable rows, event timeline bars)
3. `spec/COMPONENT_ARCHITECTURE.md` - C2G component tree, filterStore
4. `spec/INTERACTION_DESIGN_SPEC.md` - C2G user flow, keyboard shortcuts
5. `spec/chronicall-metric-definitions.md` - Filter definitions and metric formulas

#### Agent Timeline
1. `spec/FRONTEND_UX_SPEC.md` - Agent Timeline section (horizontal bars, state colors)
2. `spec/Chronicall_Realtime_UI_Specs.md` - Agent/Group Timeline widget specs
3. `spec/COMPONENT_ARCHITECTURE.md` - Timeline component tree, agentStore
4. `spec/INTERACTION_DESIGN_SPEC.md` - Timeline user flow

#### Reports
1. `spec/chronicall-metric-definitions.md` - All 69 agent + 66 call metrics
2. `spec/FRONTEND_UX_SPEC.md` - Report Viewer section
3. `spec/COMPONENT_ARCHITECTURE.md` - Report component tree, API routes
4. `spec/INTERACTION_DESIGN_SPEC.md` - Report user flow, export behaviors

#### Recording Module
1. `spec/Recording_Integration_Spec.md` - Capture, storage, playback, PCI, scorecards
2. `spec/FRONTEND_UX_SPEC.md` - Recording Player section (waveform, controls, notes)
3. `spec/COMPONENT_ARCHITECTURE.md` - Recording component tree, API routes
4. `spec/INTERACTION_DESIGN_SPEC.md` - Recording user flow

#### Auth & Admin
1. `spec/PROJECT_ROADMAP.md` - SAML config, user/role schema
2. `spec/COMPONENT_ARCHITECTURE.md` - Auth routes, admin component tree
3. `spec/INTERACTION_DESIGN_SPEC.md` - Login flow, admin page flows

#### Database & Schema
1. `spec/PROJECT_ROADMAP.md` - Full DB schema (PostgreSQL 16, Drizzle ORM)
2. `spec/Recording_Integration_Spec.md` - Recording-specific tables
3. `spec/TASK_OPTIMIZATION.md` - Migration order and dependencies

## Agent Task Assignment (4 Teams)

### Team 1: Protocol & Data Pipeline
- DevLink3 TCP connector (binary framing, SHA1 auth, Delta3 XML parser)
- SMDR TCP listener + CSV parser
- Redis pub/sub event distribution
- Socket.io server setup
- Call correlation engine (DevLink3 + SMDR reconciliation)

### Team 2: Core UI & Real-time
- App shell (sidebar, top bar, auth guard)
- Dashboard page + widget grid (react-grid-layout)
- All 14 wallboard widget types
- Wallboard editor (add/remove/configure widgets)
- Socket.io client + Zustand real-time stores

### Team 3: Historical & Analytics
- Cradle-to-Grave page (table, filters, expandable rows, event timeline)
- Agent Timeline page (horizontal bar timeline, state segments)
- Report engine (50+ report types, 3 styles)
- Report viewer (table/chart toggle, export CSV/PDF/Excel)
- Scheduled report delivery (node-cron + email)

### Team 4: Recording & Admin
- Recording ingestion service (FTP polling, file processing)
- Opus transcoding pipeline
- Waveform player (wavesurfer.js)
- Quality scorecards (templates, scoring UI, reports)
- PCI pause/resume
- Admin pages (users, settings, recording rules, storage pools)
- SAML auth integration

## File Structure Convention
```
src/
  app/              # Next.js App Router pages and API routes
  components/
    ui/             # shadcn/ui primitives
    shared/         # Reusable components (DataTable, FilterBuilder, etc.)
    dashboard/      # Dashboard-specific components
    cradle-to-grave/
    agent-timeline/
    reports/
    recordings/
    admin/
  lib/
    db/             # Drizzle schema, migrations, queries
    devlink3/       # DevLink3 connector, parser, types
    smdr/           # SMDR listener, CSV parser
    socket/         # Socket.io server setup, event handlers
    auth/           # SAML config, session management
    recordings/     # Ingestion, transcoding, storage
  stores/           # Zustand stores
  hooks/            # Custom React hooks
  types/            # Shared TypeScript interfaces
  utils/            # Utility functions
```
