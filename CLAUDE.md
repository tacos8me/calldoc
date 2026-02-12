# CallDoc - Avaya IP Office 11 Call Center Reporting Platform

## Project Overview
CallDoc is a self-hosted Docker call center reporting platform for Avaya IP Office 11. It replicates and improves upon Chronicall (Xima) and TASKE functionality with a modern web-native architecture.

## Tech Stack
- **Frontend**: Next.js 14 App Router, TypeScript strict, shadcn/ui, Tailwind CSS, Zustand, TanStack Query, Socket.io client, nuqs, wavesurfer.js, react-grid-layout, Recharts
- **Backend**: Next.js API routes, Drizzle ORM, PostgreSQL 16, Redis 7, Socket.io server, node-cron
- **Auth**: Local (bcryptjs + iron-session) and SAML 2.0 via @node-saml/passport-saml
- **Protocol**: DevLink3 binary TCP (port 50797/50796 TLS) for real-time events, SMDR CSV (port 1150) for historical records
- **Deployment**: Docker Compose (self-hosted), MinIO for S3-compatible recording storage
- **Audio**: Opus codec (~100KB/min), wavesurfer.js waveform player
- **Testing**: Vitest + happy-dom + @testing-library/react + MSW

## File Tree

```
calldoc/
├── CLAUDE.md                          # This file - project guide for AI
├── DEPLOY.md                          # Deployment documentation
├── Dockerfile                         # Multi-stage Docker build (node:20-alpine)
├── docker-compose.yml                 # Dev: app, postgres, redis, devlink3-sim, smdr-sim, mocksaml, minio
├── docker-compose.prod.yml            # Prod overrides: no simulators, external DB, scaling
├── drizzle.config.ts                  # Drizzle Kit configuration
├── next.config.ts                     # Next.js configuration
├── package.json                       # Dependencies and scripts
├── tsconfig.json                      # TypeScript strict config
├── vitest.config.ts                   # Vitest with happy-dom, @/ alias
├── tailwind.config.ts                 # Tailwind with custom theme tokens
├── postcss.config.js                  # PostCSS for Tailwind
├── components.json                    # shadcn/ui configuration
│
├── spec/                              # Specification documents
│   ├── PROJECT_ROADMAP.md             # Master roadmap
│   ├── TASK_OPTIMIZATION.md           # Sprint plan, 143 sub-tasks
│   ├── COMPONENT_ARCHITECTURE.md      # React component trees, API routes
│   ├── INTERACTION_DESIGN_SPEC.md     # Page flows, keyboard shortcuts
│   ├── FRONTEND_UX_SPEC.md            # Design system, all widget types
│   ├── DevLink3_Protocol_Spec.md      # Binary TCP protocol
│   ├── Avaya_SMDR_Format_Spec.md      # CSV format, 30+ fields
│   ├── Recording_Integration_Spec.md  # Recording capture, storage, PCI
│   └── chronicall-metric-definitions.md # 69 agent + 66 call metrics
│
├── avaya-sample/                      # Reference implementations
│   ├── devlink3-reference.md
│   └── IPOtut/                        # C# DevLink3 reference
│
├── simulators/                        # Dev simulators for testing
│   ├── devlink3/                      # DevLink3 protocol simulator
│   └── smdr/                          # SMDR TCP simulator
│
├── drizzle/                           # Migration files (auto-generated)
│
├── public/
│   └── api-docs.html                  # Swagger UI (dark theme)
│
└── src/
    ├── app/
    │   ├── layout.tsx                 # Root layout
    │   ├── (auth)/
    │   │   └── login/page.tsx         # Login page
    │   ├── (dashboard)/
    │   │   ├── layout.tsx             # Dashboard layout (sidebar + topbar)
    │   │   ├── page.tsx               # Dashboard home (widget grid)
    │   │   ├── calls/page.tsx         # Call log with C2G detail
    │   │   ├── agent-timeline/page.tsx # Agent timeline visualization
    │   │   ├── recordings/page.tsx    # Recording browser + player
    │   │   ├── reports/page.tsx       # Report generator + viewer
    │   │   ├── wallboards/
    │   │   │   ├── page.tsx           # Wallboard list
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx       # Wallboard viewer
    │   │   │       └── edit/page.tsx  # Wallboard editor
    │   │   └── admin/
    │   │       ├── page.tsx           # Admin dashboard
    │   │       ├── users/page.tsx     # User management
    │   │       ├── settings/page.tsx  # System settings
    │   │       ├── recording-rules/page.tsx
    │   │       └── storage/page.tsx
    │   ├── wallboard/[id]/page.tsx    # Standalone wallboard display
    │   └── api/
    │       ├── docs/route.ts          # OpenAPI 3.0 spec (GET /api/docs)
    │       ├── health/route.ts        # Health check endpoint
    │       ├── auth/
    │       │   ├── local/route.ts     # Email/password login
    │       │   └── [...saml]/route.ts # SAML SSO flow
    │       ├── calls/
    │       │   ├── route.ts           # GET (list), POST (search)
    │       │   └── [id]/
    │       │       ├── route.ts       # GET single call
    │       │       ├── events/route.ts # GET call events
    │       │       └── notes/route.ts # POST add note
    │       ├── agents/
    │       │   ├── route.ts           # GET agent list
    │       │   └── [id]/
    │       │       ├── route.ts       # GET single agent
    │       │       └── timeline/route.ts # GET agent timeline
    │       ├── reports/
    │       │   ├── route.ts           # GET template list
    │       │   ├── generate/route.ts  # POST generate report
    │       │   ├── schedules/route.ts # GET/POST schedules
    │       │   └── [id]/export/route.ts # POST export
    │       ├── recordings/
    │       │   ├── route.ts           # GET recording list
    │       │   └── [id]/
    │       │       ├── route.ts       # GET recording metadata
    │       │       ├── stream/route.ts # GET audio stream
    │       │       ├── notes/route.ts # POST add note
    │       │       ├── score/route.ts # POST QA scorecard
    │       │       └── share/route.ts # POST create share link
    │       ├── wallboards/
    │       │   ├── route.ts           # GET list, POST create
    │       │   └── [id]/route.ts      # GET/PUT/DELETE
    │       ├── groups/route.ts        # GET hunt groups
    │       ├── devlink3/status/route.ts # GET connector status
    │       ├── bulk/jobs/             # Bulk operation jobs
    │       └── admin/
    │           ├── users/
    │           │   ├── route.ts       # GET/POST users
    │           │   └── [id]/route.ts  # GET/PUT/DELETE user
    │           ├── settings/route.ts  # GET/PUT settings
    │           ├── alerts/route.ts    # GET/POST alerts
    │           ├── recording-rules/route.ts
    │           ├── storage-pools/route.ts
    │           ├── audit-log/route.ts
    │           └── webhooks/
    │
    ├── components/
    │   ├── shared/                    # Reusable shared components
    │   │   ├── data-table.tsx         # TanStack Table + virtual scroll
    │   │   ├── filter-builder.tsx     # Dynamic filter panel + chips
    │   │   ├── event-bar.tsx          # Call timeline visualization
    │   │   ├── notification-center.tsx # Bell + dropdown notifications
    │   │   ├── command-palette.tsx     # Cmd+K command palette
    │   │   ├── connection-indicator.tsx # WebSocket status
    │   │   ├── empty-state.tsx        # Empty data placeholder
    │   │   ├── error-boundary.tsx     # React error boundary
    │   │   ├── keyboard-help.tsx      # ? shortcut help modal
    │   │   ├── responsive-sidebar.tsx # Collapsible sidebar
    │   │   ├── skeleton-variants.tsx  # Loading skeletons
    │   │   ├── status-badge.tsx       # Agent/call state badges
    │   │   └── time-range-selector.tsx
    │   ├── dashboard/                 # Dashboard widget components
    │   │   ├── widget-registry.tsx    # Widget type -> component map
    │   │   ├── widget-container.tsx   # Widget chrome (header, actions)
    │   │   ├── widget-active-calls.tsx
    │   │   ├── widget-agent-box.tsx
    │   │   ├── widget-chart.tsx
    │   │   ├── widget-clock.tsx
    │   │   ├── widget-decorative.tsx
    │   │   ├── widget-gauge.tsx
    │   │   ├── widget-group-box.tsx
    │   │   ├── widget-image.tsx
    │   │   ├── widget-leaderboard.tsx
    │   │   ├── widget-marquee.tsx
    │   │   ├── widget-pie-chart.tsx
    │   │   ├── widget-text.tsx
    │   │   ├── widget-title-value.tsx
    │   │   └── widget-web-page.tsx
    │   ├── recordings/                # Recording player components
    │   │   ├── waveform-player.tsx    # wavesurfer.js integration
    │   │   ├── playback-controls.tsx
    │   │   ├── recording-notes.tsx
    │   │   └── scorecard-panel.tsx
    │   ├── providers/
    │   │   ├── query-provider.tsx     # TanStack Query provider
    │   │   └── socket-provider.tsx    # Socket.io provider
    │   ├── ui/                        # shadcn/ui primitives
    │   ├── admin/                     # Admin page components
    │   ├── agent-timeline/            # Agent timeline components
    │   ├── calls/                     # Call-specific components
    │   ├── reports/                   # Report viewer components
    │   └── wallboards/                # Wallboard editor components
    │   └── __tests__/                 # Component test files
    │       ├── data-table.test.tsx
    │       ├── filter-builder.test.tsx
    │       ├── notification-center.test.tsx
    │       └── event-bar.test.tsx
    │
    ├── stores/                        # Zustand stores (real-time state)
    │   ├── call-store.ts              # Active calls + recent calls ring buffer
    │   ├── agent-store.ts             # Agent presence + state
    │   ├── dashboard-store.ts         # Widget layout + config + persistence
    │   ├── group-store.ts             # Hunt group stats
    │   ├── wallboard-store.ts         # Wallboard editor state
    │   ├── ui-store.ts                # UI preferences
    │   └── __tests__/                 # Store test files
    │       ├── call-store.test.ts
    │       ├── agent-store.test.ts
    │       └── dashboard-store.test.ts
    │
    ├── hooks/                         # React hooks
    │   ├── use-calls.ts               # TanStack Query hooks for calls
    │   ├── use-agents.ts              # Agent query hooks
    │   ├── use-recordings.ts          # Recording query hooks
    │   ├── use-reports.ts             # Report query hooks
    │   ├── use-wallboards.ts          # Wallboard query hooks
    │   ├── use-admin.ts               # Admin query hooks
    │   ├── use-keyboard-shortcuts.ts  # Global keyboard shortcut handler
    │   └── use-url-filters.ts         # nuqs URL filter sync
    │
    ├── lib/
    │   ├── utils.ts                   # cn() tailwind merge utility
    │   ├── logger.ts                  # Structured logging
    │   ├── theme.ts                   # Design tokens (EVENT_COLORS, CHART_COLORS, etc.)
    │   ├── db/                        # Database layer
    │   │   ├── index.ts               # Drizzle client singleton
    │   │   ├── schema.ts              # Full database schema
    │   │   ├── migrate.ts             # Migration runner
    │   │   └── seed.ts                # Demo data seeder
    │   ├── auth/
    │   │   ├── index.ts               # Session management (iron-session)
    │   │   └── middleware.ts           # Auth middleware
    │   ├── devlink3/                   # DevLink3 protocol implementation
    │   │   ├── connector.ts           # TCP connection manager
    │   │   ├── auth.ts                # SHA1 challenge-response auth
    │   │   ├── parser.ts              # Delta3 XML event parser
    │   │   ├── writer.ts              # Event writer to Redis
    │   │   └── __tests__/
    │   │       ├── auth.test.ts
    │   │       └── parser.test.ts
    │   ├── smdr/                       # SMDR protocol implementation
    │   │   ├── listener.ts            # TCP listener
    │   │   ├── parser.ts              # CSV record parser
    │   │   ├── writer.ts              # Record writer to DB + Redis
    │   │   └── __tests__/
    │   │       └── parser.test.ts
    │   ├── correlation/                # Event correlation engine
    │   │   ├── engine.ts              # DevLink3 + SMDR matching
    │   │   ├── persist.ts             # DB write operations
    │   │   └── agent-mapping.ts       # Extension -> agent resolution
    │   ├── reports/                    # Report engine
    │   │   ├── engine.ts              # Report generation (20 templates)
    │   │   ├── templates.ts           # Template definitions + registry
    │   │   ├── metrics.ts             # Metric calculation functions
    │   │   ├── export.ts              # CSV, XLSX, PDF export
    │   │   ├── scheduler.ts           # Scheduled report delivery
    │   │   └── saved-filters.ts       # User saved filter presets
    │   ├── recordings/                 # Recording management
    │   ├── alerts/                     # Alert rule engine
    │   │   └── engine.ts
    │   ├── audit/                      # Audit logging
    │   │   └── service.ts
    │   ├── email/                      # Email sending (nodemailer)
    │   ├── socket/                     # Socket.io server setup
    │   ├── services/                   # Shared business logic
    │   ├── api/
    │   │   └── validation.ts          # Zod request validation
    │   ├── config/                     # Environment config
    │   ├── webhooks/                   # Outbound webhook delivery
    │   └── __tests__/                  # Integration test files
    │       ├── correlation-engine.test.ts
    │       └── report-engine.test.ts
    │
    ├── types/                         # TypeScript type definitions
    │   ├── index.ts                   # Barrel re-export
    │   ├── calls.ts                   # Call, CallEvent, CallState, CallDirection
    │   ├── agents.ts                  # Agent, AgentState, AgentTimelineEntry
    │   ├── recordings.ts             # Recording, RecordingFormat, ScoreCard
    │   ├── reports.ts                 # Report, ReportCategory, ReportSchedule
    │   ├── wallboards.ts             # Widget, WidgetConfig, LayoutItem
    │   ├── users.ts                   # User, UserRole, Session
    │   ├── system.ts                  # AlertRule, HuntGroup, SamlConfig
    │   ├── devlink3.ts                # Wire-level DevLink3 types + enums
    │   ├── smdr.ts                    # SmdrRecord, SmdrDirection
    │   ├── socket-events.ts           # Socket.io event contracts
    │   ├── redis-events.ts            # Redis pub/sub message types
    │   └── api.ts                     # PaginatedResponse, ApiError, queryKeys
    │
    └── test/                          # Test infrastructure
        ├── setup.ts                   # Vitest global setup (@testing-library/jest-dom)
        └── helpers.ts                 # Mock factories (Call, Agent, Recording, DB, Redis)
```

## npm Scripts

```bash
# Development
npm run dev              # Start Next.js dev server (hot reload)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Testing
npm run test             # Run all tests (vitest run)
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with V8 coverage report

# Database
npm run db:generate      # Generate migration from schema changes
npm run db:migrate       # Apply pending database migrations
npm run db:seed          # Seed database with demo data
npm run db:studio        # Open Drizzle Studio (interactive DB browser)

# Type Checking
npm run typecheck        # TypeScript strict check (tsc --noEmit)

# Docker
npm run docker:dev       # Start dev environment (docker compose up -d)
npm run docker:prod      # Start production environment
npm run docker:build     # Build Docker images
```

## Database Migration Workflow

1. Edit the schema in `src/lib/db/schema.ts`
2. Generate a migration: `npm run db:generate`
3. Review the generated SQL in `drizzle/`
4. Apply the migration: `npm run db:migrate`
5. If using Docker: `docker compose exec app npm run db:migrate`

## Test Running Instructions

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run src/stores/__tests__/call-store.test.ts

# Run tests matching a pattern
npx vitest run --reporter=verbose data-table

# Run with coverage
npm run test:coverage

# Watch mode (re-runs on file changes)
npm run test:watch
```

Test infrastructure:
- **Framework**: Vitest with happy-dom environment
- **Setup**: `src/test/setup.ts` loads @testing-library/jest-dom matchers
- **Helpers**: `src/test/helpers.ts` provides createMockCall, createMockAgent, createMockRecording, createMockDb, createMockRedis
- **Component tests**: @testing-library/react + userEvent
- **Store tests**: Direct Zustand store manipulation (no rendering)
- **Integration tests**: vi.mock for external dependencies

## Docker Development Workflow

```bash
# Start everything (app + postgres + redis + simulators)
docker compose up -d

# View logs
docker compose logs -f app

# Shell into the app container
docker compose exec app sh

# Rebuild after package.json changes
docker compose build app && docker compose up -d app

# Reset database
docker compose exec app npm run db:migrate
docker compose exec app npm run db:seed
```

Services in dev mode:
- **app** (:3000) - Next.js with hot reload via volume mount
- **postgres** (:5432) - PostgreSQL 16
- **redis** (:6379) - Redis 7
- **devlink3-sim** (:50797) - DevLink3 protocol simulator
- **smdr-sim** (:1150) - SMDR TCP simulator
- **mocksaml** (:5225) - Mock SAML IdP
- **minio** (:9000/:9001) - S3-compatible storage

## Key Architectural Decisions

1. **Next.js 14 App Router** - Server components for initial data, client components for real-time. API routes co-located with the app.

2. **Zustand for real-time state** - Active calls, agent states, and UI state use Zustand stores updated via Socket.io. TanStack Query handles REST API data fetching.

3. **Correlation Engine** - DevLink3 provides instant call events; SMDR provides authoritative post-call data. The engine matches them by externalCallId (primary) or timestamp+extension (fallback within 5s window).

4. **20 report templates** - Predefined templates covering agent, call, group, recording, and trunk categories. Each template defines columns, default filters, sort, and optional chart config.

5. **Ring buffer for recent calls** - Call store keeps last 50 completed calls in memory for instant access. Older data is queried from PostgreSQL.

6. **Widget-based dashboards** - 17 widget types with react-grid-layout for drag-and-drop positioning. Dashboard layouts persist to localStorage with configurable breakpoints.

7. **Recording storage** - MinIO (S3-compatible) stores recordings. Audio is transcoded to Opus for browser-native playback. wavesurfer.js provides waveform visualization.

8. **Dark-first design** - zinc-950 base, Indigo-500 accent. 19 distinct event colors for timeline visualization. Inter + JetBrains Mono typography.

## Debugging Tips

### DevLink3 Subsystem
- Check connector status: `GET /api/devlink3/status`
- Binary framing: packets start with 4-byte length prefix (big-endian)
- Auth: SHA1 challenge-response (see `src/lib/devlink3/auth.ts`)
- Events are Delta3 XML (two formats: attribute-based and CSV-based)
- Common issue: connection drops -> auto-reconnect with exponential backoff

### SMDR Subsystem
- SMDR records arrive 30-60s after call completion
- TCP listener binds to `SMDR_HOST:SMDR_PORT`
- Records are CSV with 30+ fields, pipe-delimited device prefixes (E=extension, T=trunk)
- Parser at `src/lib/smdr/parser.ts` handles both standard and extended formats

### Correlation Engine
- Stats available via `correlationEngine.getStats()`
- Pending calls map tracks DevLink3 events awaiting SMDR match
- Stale pending calls cleaned up after 10 minutes
- Unmatched SMDR records create standalone call records

### Report Engine
- Template registry at `src/lib/reports/templates.ts` (20 templates)
- Metric calculations in `src/lib/reports/metrics.ts`
- Export formats: CSV (UTF-8 BOM), XLSX (ExcelJS), PDF (HTML-based)
- For debugging metrics, check the `computeMetric` switch in engine.ts

### Socket.io / Real-time
- Redis pub/sub channels defined in `src/types/redis-events.ts`
- Socket.io server setup in `src/lib/socket/`
- Client connects via `src/components/providers/socket-provider.tsx`
- Zustand stores subscribe to Socket.io events

### Database
- Schema defined with Drizzle ORM in `src/lib/db/schema.ts`
- Use `npm run db:studio` for visual database inspection
- Connection pooling handled by the postgres driver (pg/postgres.js)

## Specification Documents (./spec/)

### Architecture & Planning
- `spec/PROJECT_ROADMAP.md` - Master roadmap: DB schema, task breakdown, tech decisions, Docker services
- `spec/TASK_OPTIMIZATION.md` - 143 sub-tasks, dependency matrix, 6-week sprint plan, 4-team assignment
- `spec/COMPONENT_ARCHITECTURE.md` - React component trees, state management, data flow, API routes, TypeScript interfaces
- `spec/INTERACTION_DESIGN_SPEC.md` - Page flows, keyboard shortcuts, real-time behaviors, error states, loading patterns

### Frontend & UX
- `spec/FRONTEND_UX_SPEC.md` - Complete design system: colors, typography, spacing, motion, navigation, all 14 widget types, agent timeline, C2G, report viewer, recording player, Tailwind config, accessibility

### Protocol & Integration
- `spec/DevLink3_Protocol_Spec.md` - Binary framing, SHA1 challenge-response auth, packet types, Delta3 XML events, call states, equipment types
- `spec/Avaya_SMDR_Format_Spec.md` - 30+ field CSV format, TCP transport, device prefixes, parsing rules
- `spec/Recording_Integration_Spec.md` - 3 capture methods (VM Pro, VRTX, DevLink3 Active), storage pools, playback, PCI pause/resume, 7 recording rule types, quality scorecards

## Coding Conventions
- Use TypeScript strict mode everywhere
- Drizzle ORM for all DB operations (no raw SQL unless performance-critical)
- TanStack Query for all REST data fetching (use queryKey conventions from COMPONENT_ARCHITECTURE.md)
- Zustand for real-time/client state only (connection, active calls, agent states, UI)
- nuqs for URL-synced state (filters, pagination, sort)
- All components use shadcn/ui patterns and Tailwind utility classes
- File naming: kebab-case for files, PascalCase for components
- API routes return typed JSON responses with consistent error format
