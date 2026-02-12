# CallDoc Component Architecture

> Call center reporting platform for Avaya IP Office 11
> Next.js 14 App Router | TypeScript | shadcn/ui | Tailwind | Zustand | TanStack Query | Socket.io | Drizzle ORM | PostgreSQL | Redis

---

## 1. App Router Structure

```
app/
  layout.tsx                              # Root layout: providers, fonts, ThemeProvider
  not-found.tsx                           # Global 404 page
  error.tsx                               # Global error boundary

  (auth)/
    login/page.tsx                        # Email/password + SSO entry point
    sso/callback/page.tsx                 # SAML/OAuth callback handler

  (dashboard)/
    layout.tsx                            # Sidebar + TopBar shell, auth guard
    page.tsx                              # Main real-time dashboard
    wallboards/
      page.tsx                            # Wallboard list / picker
      [id]/page.tsx                       # Wallboard viewer (full-screen capable)
      [id]/edit/page.tsx                  # Wallboard editor with drag-drop canvas
    calls/page.tsx                        # Call lifecycle explorer (Cradle-to-Grave, route: /calls)
    reports/
      page.tsx                            # Report catalog and saved reports
      [id]/page.tsx                       # Individual report viewer
    recordings/page.tsx                   # Recording search, playback, scoring
    agent-timeline/page.tsx               # Agent state timeline visualization
    admin/
      users/page.tsx                      # User CRUD, role assignment
      settings/page.tsx                   # System configuration (DevLink3, SMTP, etc.)
      recording-rules/page.tsx            # Recording trigger rule builder
      storage-pools/page.tsx              # Recording storage pool management

  api/
    auth/[...saml]/route.ts               # SAML IdP callback, session creation
    devlink3/status/route.ts              # GET DevLink3 connector health
    calls/route.ts                        # GET active + historical calls
    calls/[id]/route.ts                   # GET single call detail
    calls/[id]/events/route.ts            # GET ordered call events
    reports/route.ts                      # GET saved reports, POST create report def
    reports/generate/route.ts             # POST run report against filters
    reports/[id]/export/route.ts          # GET export as CSV/PDF/XLSX
    recordings/route.ts                   # GET recording list with search
    recordings/[id]/route.ts              # GET recording metadata
    recordings/[id]/stream/route.ts       # GET audio stream (HTTP Range)
    recordings/[id]/pause/route.ts        # POST pause live recording
    recordings/[id]/resume/route.ts       # POST resume live recording
    recordings/[id]/notes/route.ts        # GET/POST recording annotations
    recordings/[id]/score/route.ts        # GET/POST QA scorecard
    recordings/[id]/share/route.ts        # POST generate share link
    wallboards/route.ts                   # GET list, POST create wallboard
    wallboards/[id]/route.ts              # GET/PUT/DELETE single wallboard
    agents/route.ts                       # GET all agents with current state
    agents/[id]/state/route.ts            # GET/PUT agent state
    agents/[id]/timeline/route.ts         # GET agent state history for date range
    admin/users/route.ts                  # GET/POST/PUT/DELETE users
    admin/settings/route.ts               # GET/PUT system settings
    admin/recording-rules/route.ts        # CRUD recording trigger rules
    admin/storage-pools/route.ts          # CRUD storage pool configs
    socket/route.ts                       # Socket.io upgrade endpoint
```

---

## 2. Component Tree

### 2.1 Dashboard (`(dashboard)/page.tsx`)

```
DashboardShell
  TopBar
    ConnectionIndicator (DevLink3 status + latency)
    TimeRangeSelector (Today, Last Hour, custom)
    NotificationBell
    UserMenu
  Sidebar
    SidebarNav (links to all pages)
    SidebarFooter (collapse toggle, version)
  WidgetGrid (react-grid-layout, responsive breakpoints)
    ActiveCallsWidget        # Live call count, ringing/connected/held breakdown
    AgentBoxWidget           # Grid of agent avatars with colored state borders
    GaugeWidget              # Radial gauge for SLA %, ASA, abandonment rate
    ChartWidget              # Bar/line chart via Recharts (calls per interval)
    GroupBoxWidget            # Hunt group summary: available, busy, wrap counts
    TitleValueWidget          # Single large metric with label
    LeaderboardWidget         # Ranked agent list by calls handled / talk time
    PieChartWidget            # Proportional breakdown (call types, dispositions)
    MarqueeWidget             # Scrolling text ticker for announcements
    ImageWidget               # Static image / company logo
    WebPageWidget             # Embedded iframe content
    TextWidget                # Rich text / markdown block
    LineWidget                # Visual separator line
    WidgetGroupWidget         # Container that nests child widgets with shared border
```

### 2.2 Cradle-to-Grave (`(dashboard)/calls/page.tsx`)

```
C2GShell
  FilterPanel
    TimeRangeSelector
    FilterBuilder (caller, called, agent, group, direction, disposition)
    ApplyButton + ResetButton
  C2GTable (virtualized DataTable)
    C2GRow (expandable)
      SummaryColumns (time, caller, called, duration, agent, disposition)
      ExpandedContent
        EventTimeline
          EventBar[] (colored horizontal segments per FRONTEND_UX_SPEC Section 4.2:
                      ringing=#FBBF24, talking=#3B82F6, hold=#EF4444, transfer=#38BDF8,
                      auto-attendant=#94A3B8, voicemail=#A78BFA, queue=#F97316, acw=#8B5CF6)
          TimeAxis (absolute timestamps)
        EventDetailPanel
          EventList (ordered call events with icons and durations)
          PartyInfo (caller/called CLID, trunk, codec)
        RecordingInlinePlayer (if recording exists)
          WaveformMini
          PlaybackControls (play, pause, speed, skip)
```

### 2.3 Agent Timeline (`(dashboard)/agent-timeline/page.tsx`)

```
TimelineShell
  AgentSelector
    AgentSearchInput
    AgentCheckboxList (filter which agents display)
    GroupFilter (filter by hunt group membership)
  TimelineCanvas
    TimeAxis (horizontal, configurable 15m/30m/1h granularity)
    AgentRow[] (one horizontal bar per agent)
      StateSegment[] (colored blocks per FRONTEND_UX_SPEC Section 4.2:
                      idle=#4ADE80, talking=#3B82F6, ringing=#FBBF24, hold=#EF4444,
                      acw=#8B5CF6, dnd=#DC2626, away=gray, logged-out=#374151)
      SegmentTooltip (state name, start, end, duration)
  StateBreakdownPanel
    AgentName + AvatarBadge
    StatePieChart (% time in each state)
    MetricRow[] (total talk time, avg handle time, calls handled, idle %)
    StateTransitionList (chronological log of state changes)
```

### 2.4 Reports (`(dashboard)/reports/page.tsx` + `[id]/page.tsx`)

```
ReportShell
  ReportSelector
    ReportCategoryTabs (Call, Agent, Group, Trunk, Custom)
    ReportCard[] (name, description, last run, favorite toggle)
    CreateReportButton
  FilterBuilder
    DateRangeField
    GroupMultiSelect
    AgentMultiSelect
    TrunkSelect
    DirectionToggle (inbound, outbound, internal, all)
    IntervalSelect (15m, 30m, hourly, daily, weekly, monthly)
    FieldChooser (drag to reorder visible columns)
  ReportViewer
    ViewToggle (table | chart)
    DataTable (sortable, paginated, column resizing)
    ChartView (Recharts bar/line/stacked)
    SummaryRow (totals, averages)
  ExportToolbar
    ExportCSVButton
    ExportPDFButton
    ExportXLSXButton
    ScheduleButton (email recurring report)
    SaveAsButton (persist report definition)
```

### 2.5 Recordings (`(dashboard)/recordings/page.tsx`)

```
RecordingsShell
  RecordingSearch
    SearchInput (caller, called, agent, call ID)
    TimeRangeSelector
    FilterBuilder (direction, min/max duration, scored/unscored, group)
    TagFilter
  RecordingList (virtualized DataTable)
    RecordingRow
      MetadataColumns (date, caller, called, agent, duration, score badge)
      ActionButtons (play inline, download, share, delete)
      ExpandedContent
        WaveformPlayer (wavesurfer.js)
          Waveform (zoomable, click-to-seek)
          PlaybackControls (play, pause, stop, speed 0.5x-2x, skip 10s)
          VolumeSlider
          TimestampDisplay (current / total)
          AnnotationMarkers (clickable pins on waveform)
        ScorecardPanel
          ScoreHeader (overall score, evaluator, date)
          CategorySection[]
            CriterionRow (label, weight, score slider, comment)
          ScoreSubmitButton
        NotesPanel
          NoteList (timestamped annotations)
          NoteInput (add note at current playback position)
```

### 2.6 Wallboard Editor (`(dashboard)/wallboards/[id]/edit/page.tsx`)

```
WallboardShell
  CanvasToolbar
    WidgetPalette (draggable widget type icons)
    LayoutControls (grid snap, alignment guides, lock toggle)
    ThemeSelector (dark, light, custom branded)
    ResolutionSelector (1080p, 4K, custom)
    PreviewButton + SaveButton + PublishButton
  WallboardCanvas (react-grid-layout)
    Widget[] (each widget type from Dashboard list, draggable/resizable)
      WidgetFrame (border, header with title, resize handle)
      WidgetContent (type-specific rendering)
    DropZoneOverlay (visual feedback for drag-and-drop)
  WidgetConfigDrawer (Sheet, slides from right)
    GeneralTab (title, refresh interval, data source binding)
    AppearanceTab (colors, font size, border, background)
    DataTab (metric selection, group/agent filter, threshold rules)
    ThresholdsTab (color rules: green/amber/red breakpoints)
```

### 2.7 Admin (`(dashboard)/admin/*`)

```
AdminShell
  AdminNav (vertical tab list)
  ContentArea
    UserManagement
      UserTable (DataTable: name, email, role, last login, status)
      UserFormDrawer (create/edit: name, email, role select, group access, permissions)
      BulkImportButton (CSV upload)
      RoleSummaryCards (admin count, supervisor count, agent count)
    SystemSettings
      DevLinkConfigForm (host, port, username, password, test connection)
      SMTPConfigForm (server, port, from, credentials, test send)
      LDAPConfigForm (server, base DN, bind credentials, group mapping)
      RetentionPolicyForm (call data TTL, recording TTL, report archive TTL)
      LicenseInfoCard (seats used, expiry, feature flags)
    RecordingRulesEditor
      RuleTable (name, trigger type, target, active toggle)
      RuleFormDrawer
        TriggerTypeSelect (all calls, inbound only, group, agent, trunk, scheduled)
        TargetSelector (which groups/agents/trunks)
        ScheduleBuilder (cron-like day/time matrix)
        StoragePoolSelect
        RetentionOverride
    StoragePoolManager
      PoolTable (name, type, path/bucket, used/total, status)
      PoolFormDrawer (name, type: local/NFS/S3, connection params, quota)
      UsageChart (storage consumption over time)
```

---

## 3. State Management Architecture

### 3.1 Zustand Stores

```typescript
// connectionStore - DevLink3 and Socket.io connection health
connectionStore = create({
  socketStatus: 'connected' | 'connecting' | 'disconnected' | 'error',
  devlinkStatus: 'connected' | 'disconnected' | 'error',
  lastHeartbeat: number,           // epoch ms of last DevLink3 heartbeat
  latencyMs: number,               // round-trip socket ping
  reconnectAttempts: number,
  actions: { setSocketStatus, setDevlinkStatus, updateHeartbeat }
})

// callStore - active calls keyed by call ID
callStore = create({
  calls: Map<string, Call>,        // active call map
  recentCompleted: Call[],         // last N completed (ring buffer, max 200)
  stats: { active, ringing, held, inQueue, longestWait },
  actions: { upsertCall, removeCall, clearAll, updateStats }
})

// agentStore - agent presence and state
agentStore = create({
  agents: Map<string, Agent>,      // keyed by agent extension
  groupMembership: Map<string, string[]>,  // groupId -> agentIds
  actions: { updateState, setAgents, bulkUpdate }
})

// wallboardStore - widget configs and layouts per wallboard
wallboardStore = create({
  wallboards: Map<string, WallboardConfig>,
  activeWallboardId: string | null,
  layouts: Map<string, ReactGridLayout.Layout[]>,  // per breakpoint
  actions: { setLayout, addWidget, removeWidget, updateWidgetConfig, save }
})

// filterStore - shared filter state for C2G and reports
filterStore = create({
  c2gFilters: C2GFilterState,
  reportFilters: ReportFilterState,
  recordingFilters: RecordingFilterState,
  actions: { setC2GFilter, setReportFilter, setRecordingFilter, resetAll }
})

// uiStore - UI chrome and transient state
uiStore = create({
  sidebarCollapsed: boolean,
  theme: 'light' | 'dark' | 'system',
  activeModal: string | null,
  toasts: Toast[],
  actions: { toggleSidebar, setTheme, openModal, closeModal, addToast }
})
```

### 3.2 TanStack Query Conventions

```typescript
// Query key factory pattern
const queryKeys = {
  calls:      { all: ['calls'],       list:  (f) => ['calls', f],        detail: (id) => ['calls', id] },
  reports:    { all: ['reports'],      list:  (f) => ['reports', f],      detail: (id) => ['reports', id] },
  recordings: { all: ['recordings'],  list:  (f) => ['recordings', f],   detail: (id) => ['recordings', id] },
  agents:     { all: ['agents'],      list:  ()  => ['agents', 'list'],  timeline: (id, d) => ['agents', id, 'timeline', d] },
  wallboards: { all: ['wallboards'],  detail: (id) => ['wallboards', id] },
  users:      { all: ['users'],       detail: (id) => ['users', id] },
  settings:   { all: ['settings'] },
}

// Default options
const defaultOptions = {
  staleTime: 30_000,         // 30s - REST data considered fresh
  gcTime: 5 * 60_000,       // 5m - garbage collect unused cache entries
  retry: 2,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
}

// Real-time data override: calls and agents have staleTime=Infinity
// because Zustand stores are the source of truth via Socket.io

// Optimistic updates for admin operations
useMutation({
  mutationFn: updateUser,
  onMutate: async (updated) => {
    await queryClient.cancelQueries(queryKeys.users.all)
    const previous = queryClient.getQueryData(queryKeys.users.all)
    queryClient.setQueryData(queryKeys.users.all, (old) => patchUser(old, updated))
    return { previous }
  },
  onError: (err, vars, context) => queryClient.setQueryData(queryKeys.users.all, context.previous),
  onSettled: () => queryClient.invalidateQueries(queryKeys.users.all),
})
```

### 3.3 Socket.io Real-Time Flow

```
Server:
  DevLink3Connector (Node process)
    -> parses CSTA/SMDR events from Avaya IP Office
    -> publishes to Redis channels: ipo:calls, ipo:agents, ipo:groups

  Socket.io Server (attached to Next.js custom server)
    -> subscribes to Redis pub/sub channels
    -> validates session cookie on WebSocket handshake
    -> joins clients to rooms based on tenant/group permissions
    -> emits typed events: 'call:update', 'call:end', 'agent:state', 'group:stats'

Client:
  useSocketConnection() hook (mounted in DashboardShell layout)
    -> connects to /api/socket with auth token
    -> registers event listeners:
        socket.on('call:update',  (data) => callStore.getState().upsertCall(data))
        socket.on('call:end',     (data) => callStore.getState().removeCall(data.id))
        socket.on('agent:state',  (data) => agentStore.getState().updateState(data))
        socket.on('group:stats',  (data) => /* derived, updates via callStore */)
        socket.on('connect',      ()     => connectionStore.getState().setSocketStatus('connected'))
        socket.on('disconnect',   ()     => connectionStore.getState().setSocketStatus('disconnected'))
    -> heartbeat ping every 15s to measure latency
```

### 3.4 URL State via nuqs

```typescript
// Cradle-to-Grave page URL params
const [startDate, setStartDate] = useQueryState('from', parseAsIsoDateTime)
const [endDate, setEndDate]     = useQueryState('to', parseAsIsoDateTime)
const [caller, setCaller]       = useQueryState('caller', parseAsString)
const [agent, setAgent]         = useQueryState('agent', parseAsString)
const [group, setGroup]         = useQueryState('group', parseAsString)
const [page, setPage]           = useQueryState('page', parseAsInteger.withDefault(1))
const [sort, setSort]           = useQueryState('sort', parseAsString.withDefault('startTime'))
const [order, setOrder]         = useQueryState('order', parseAsStringLiteral(['asc','desc']).withDefault('desc'))

// Reports page
const [reportId]  = useQueryState('id', parseAsString)
const [interval]  = useQueryState('interval', parseAsStringLiteral(['15m','30m','1h','1d','1w','1M']))
const [view]      = useQueryState('view', parseAsStringLiteral(['table','chart']).withDefault('table'))
```

---

## 4. Data Flow Diagrams

### 4.1 Real-Time Call Event

```
Avaya IP Office 11
       |
       | CSTA/DevLink3 TCP (port 50797)
       v
DevLink3Connector (Node.js long-running process)
       |
       | Parse CSTA XML -> typed CallEvent object
       | Enrich with hunt group + agent lookup
       v
Redis Pub/Sub
  channel: ipo:calls
  channel: ipo:agents
       |
       | Subscribe
       v
Socket.io Server (rooms per tenant + group)
       |
       | emit('call:update', { id, state, parties, queue, duration })
       v
Client Socket.io Listener (useSocketConnection hook)
       |
       | callStore.getState().upsertCall(callData)
       v
Zustand callStore (Map<string, Call>)
       |
       | Selective subscription via useStore(callStore, selector)
       v
ActiveCallsWidget / AgentBoxWidget / GaugeWidget
       |
       | React re-render (only subscribed components)
       v
DOM Update
```

### 4.2 Report Generation

```
User: selects filters in FilterBuilder
       |
       | filterStore.setReportFilter(filters)
       | nuqs syncs filters to URL search params
       v
User: clicks "Generate Report"
       |
       v
TanStack Query: useMutation
       |
       | POST /api/reports/generate
       | Body: { reportType, filters, columns, interval, groupBy }
       v
Next.js API Route
       |
       | Validate input with Zod schema
       | Build Drizzle ORM query from filters
       | Apply RBAC: restrict to permitted groups/agents
       v
PostgreSQL
       |
       | Execute aggregation query (calls, durations, SLA, abandonment)
       | Stream rows via cursor for large result sets
       v
API Route: Streamed JSON Response (Transfer-Encoding: chunked)
       |
       v
TanStack Query: onSuccess
       |
       | Cache result under queryKeys.reports.detail(generatedId)
       v
ReportViewer
       |
       | DataTable renders rows (virtualized for 10k+ rows)
       | ChartView renders Recharts visualization
       | SummaryRow computes totals from cached data
       v
DOM Update
```

### 4.3 Recording Playback

```
User: clicks play on RecordingRow
       |
       v
TanStack Query: useQuery(['recordings', id])
       |
       | GET /api/recordings/:id (metadata: duration, format, size, agent, call)
       v
WaveformPlayer mounts
       |
       | wavesurfer.js instance created
       | wavesurfer.load(url) -> GET /api/recordings/:id/stream
       v
Next.js API Route: /api/recordings/:id/stream
       |
       | Verify user has recording access (RBAC)
       | Resolve storage pool (local / NFS / S3)
       | Return audio with Accept-Ranges: bytes
       | Stream partial content for Range requests (206 Partial Content)
       v
wavesurfer.js
       |
       | Decode audio -> render waveform canvas
       | Fetch peaks from /api/recordings/:id?peaks=true for fast initial render
       | Overlay AnnotationMarkers at note timestamps
       v
User: interacts (seek, speed change, add note)
       |
       | Seek: wavesurfer.seekTo(ratio)
       | Speed: wavesurfer.setPlaybackRate(1.5)
       | Note: POST /api/recordings/:id/notes { timestamp, text }
       |        -> invalidateQueries(['recordings', id])
       v
DOM Update (waveform position, note markers)
```

---

## 5. Shared Component Library

### DataTable

```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[]            // TanStack Table column definitions
  data: T[]                          // Row data array
  sorting?: SortingState             // Controlled sort state
  onSortingChange?: OnChangeFn<SortingState>
  pagination?: PaginationState       // Controlled pagination
  onPaginationChange?: OnChangeFn<PaginationState>
  pageCount?: number                 // Server-side total pages
  selection?: RowSelectionState      // Row selection state
  onSelectionChange?: OnChangeFn<RowSelectionState>
  onRowClick?: (row: T) => void      // Row click handler
  expandable?: boolean               // Enable row expansion
  renderExpanded?: (row: T) => ReactNode
  loading?: boolean                  // Skeleton state
  emptyState?: ReactNode             // Custom empty state
  stickyHeader?: boolean             // Sticky column headers
  virtualized?: boolean              // Virtualize rows for large datasets
  className?: string
}
```

### FilterBuilder

```typescript
interface FilterBuilderProps {
  schema: FilterSchema               // Field definitions (type, label, options)
  value: FilterState                 // Current filter values
  onChange: (value: FilterState) => void
  onApply?: () => void               // Explicit apply action
  onReset?: () => void               // Reset to defaults
  layout?: 'horizontal' | 'vertical' | 'popover'
  maxVisible?: number                // Collapse beyond N fields into "More" popover
}

interface FilterSchema {
  fields: FilterFieldDef[]
}

interface FilterFieldDef {
  key: string
  label: string
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'toggle'
  options?: { label: string; value: string }[]
  defaultValue?: unknown
}
```

### StatusBadge

```typescript
interface StatusBadgeProps {
  status: AgentState                 // uses the AgentState type directly
  size?: 'sm' | 'md' | 'lg'         // Default: 'md'
  showLabel?: boolean                // Display status text beside dot
  pulse?: boolean                    // Animate for ringing/alerting states
  className?: string
}
```

### EventBar

```typescript
interface EventBarProps {
  events: CallEvent[]                // Ordered events for one call leg
  startTime: Date                    // Timeline left boundary
  endTime: Date                      // Timeline right boundary
  colorMap: Record<CallEventType, string>  // State -> CSS color
  height?: number                    // Bar height in px (default: 28)
  onClick?: (event: CallEvent) => void
  showTooltip?: boolean              // Hover tooltip with event details
  className?: string
}
```

### MetricCard

```typescript
interface MetricCardProps {
  label: string                      // Metric name
  value: string | number             // Display value
  trend?: { direction: 'up' | 'down' | 'flat'; percent: number }
  icon?: LucideIcon                  // Optional icon from lucide-react
  thresholds?: { warn: number; critical: number }
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  className?: string
}
```

### TimeRangeSelector

```typescript
interface TimeRangeSelectorProps {
  value: { from: Date; to: Date }
  onChange: (range: { from: Date; to: Date }) => void
  presets?: TimePreset[]             // Quick select: Today, Last Hour, Last 7d, etc.
  minDate?: Date                     // Earliest selectable date
  maxDate?: Date                     // Latest selectable date
  granularity?: 'minute' | 'hour' | 'day'
  showRelative?: boolean             // Show "last N hours" toggle
  className?: string
}

interface TimePreset {
  label: string                      // Display text
  from: () => Date                   // Factory for start
  to: () => Date                     // Factory for end
}
```

### ConnectionIndicator

```typescript
interface ConnectionIndicatorProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  latency?: number                   // Round-trip ms
  label?: string                     // "DevLink3" or "Socket"
  showLatency?: boolean              // Display ms value
  className?: string
}
```

### EmptyState

```typescript
interface EmptyStateProps {
  icon?: LucideIcon                  // Illustration icon
  title: string                      // Heading text
  description?: string               // Supporting text
  action?: { label: string; onClick: () => void }  // CTA button
  className?: string
}
```

### ConfirmDialog

```typescript
interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string              // Default: "Confirm"
  cancelLabel?: string               // Default: "Cancel"
  variant?: 'default' | 'destructive'
  onConfirm: () => void | Promise<void>
  loading?: boolean                  // Disable buttons while processing
}
```

### WaveformPlayer

```typescript
interface WaveformPlayerProps {
  src: string                        // Audio stream URL
  peaks?: number[]                   // Pre-computed waveform peaks
  annotations?: Annotation[]         // Timestamped markers
  onAnnotationClick?: (a: Annotation) => void
  onTimeUpdate?: (currentTime: number) => void
  autoPlay?: boolean
  className?: string
}

interface Annotation {
  id: string
  timestamp: number                  // Seconds from start
  label: string
  color?: string
}
```

---

## 6. API Route Structure

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/auth/[...saml]` | SAML SSO initiation and callback |
| GET | `/api/devlink3/status` | DevLink3 connector health, uptime, event rate |
| GET | `/api/calls` | List active + recent calls (query: status, group, agent, page) |
| GET | `/api/calls/[id]` | Single call with full party and trunk detail |
| GET | `/api/calls/[id]/events` | Ordered event log for a call |
| GET | `/api/reports` | List saved report definitions |
| POST | `/api/reports` | Create new report definition |
| POST | `/api/reports/generate` | Execute report query, return results |
| GET | `/api/reports/[id]/export` | Export report as CSV, PDF, or XLSX (query: format) |
| GET | `/api/recordings` | Search recordings (query: caller, agent, date range, scored) |
| GET | `/api/recordings/[id]` | Recording metadata and scorecard summary |
| GET | `/api/recordings/[id]/stream` | Audio stream with HTTP Range support |
| POST | `/api/recordings/[id]/pause` | Pause an active recording |
| POST | `/api/recordings/[id]/resume` | Resume a paused recording |
| GET/POST | `/api/recordings/[id]/notes` | List or add timestamped annotations |
| GET/POST | `/api/recordings/[id]/score` | Get or submit QA scorecard |
| POST | `/api/recordings/[id]/share` | Generate time-limited share URL |
| GET | `/api/wallboards` | List wallboard configs |
| POST | `/api/wallboards` | Create new wallboard |
| GET/PUT/DELETE | `/api/wallboards/[id]` | Read, update, or delete wallboard |
| GET | `/api/agents` | All agents with current state |
| GET/PUT | `/api/agents/[id]/state` | Get or change agent state |
| GET | `/api/agents/[id]/timeline` | Agent state history (query: from, to) |
| GET/POST/PUT/DELETE | `/api/admin/users` | User CRUD |
| GET/PUT | `/api/admin/settings` | System settings read/write |
| GET/POST/PUT/DELETE | `/api/admin/recording-rules` | Recording rule CRUD |
| GET/POST/PUT/DELETE | `/api/admin/storage-pools` | Storage pool CRUD |
| GET | `/api/socket` | Socket.io handshake and upgrade |

All API routes enforce authentication via middleware. Admin routes require `role: 'admin'`.
List endpoints support standard pagination (`page`, `limit`), sorting (`sort`, `order`),
and return envelope: `{ data: T[], meta: { total, page, limit, pageCount } }`.

---

## 7. Key TypeScript Interfaces

```typescript
// ─── Call Domain ──────────────────────────────────────────────

interface Call {
  id: string                         // Unique call reference from IPO
  direction: 'inbound' | 'outbound' | 'internal'
  state: CallState
  callerNumber: string
  callerName: string | null
  calledNumber: string
  calledName: string | null
  queueName: string | null           // Hunt group name if queued
  queueEntryTime: string | null      // ISO timestamp
  agentExtension: string | null      // Handling agent extension
  agentName: string | null
  trunkId: string | null
  startTime: string                  // ISO timestamp
  answerTime: string | null
  endTime: string | null
  duration: number                   // Seconds (updated in real time)
  holdCount: number
  holdDuration: number               // Total seconds on hold
  transferCount: number
  recordingId: string | null
  tags: string[]
}

type CallState = 'ringing' | 'connected' | 'hold' | 'transferring'
               | 'conferencing' | 'queued' | 'voicemail' | 'completed' | 'abandoned'

interface CallEvent {
  id: string
  callId: string
  type: CallEventType
  timestamp: string                  // ISO timestamp
  duration: number | null            // Seconds for timed events
  party: string | null               // Extension or number involved
  details: Record<string, unknown>   // Type-specific payload
}

type CallEventType = 'initiated' | 'queued' | 'ringing' | 'answered' | 'held'
                   | 'retrieved' | 'transferred' | 'conferenced' | 'parked'
                   | 'unparked' | 'voicemail' | 'completed' | 'abandoned'
                   | 'dtmf' | 'recording_started' | 'recording_stopped'

// ─── Agent Domain ─────────────────────────────────────────────

interface Agent {
  id: string
  extension: string
  name: string
  state: AgentState
  stateStartTime: string             // ISO timestamp of current state start
  stateDuration: number              // Seconds in current state
  activeCallId: string | null
  groups: string[]                   // Hunt group IDs agent belongs to
  skills: string[]
  loginTime: string | null           // ISO timestamp of last login
}

type AgentState = 'idle' | 'talking' | 'ringing' | 'hold' | 'acw' | 'dnd' | 'away' | 'logged-out' | 'unknown'

// Timeline event types - richer set for event bar rendering (19 types)
// See FRONTEND_UX_SPEC.md Section 4.2 for color mapping
type TimelineEventType = 'idle' | 'ringing' | 'talking' | 'hold' | 'park' | 'queue'
  | 'transfer' | 'transfer-hold' | 'dialing' | 'conference' | 'voicemail'
  | 'auto-attendant' | 'overflow' | 'dnd' | 'acw' | 'listen' | 'calling-drop'
  | 'receiving-drop' | 'busy'

interface AgentTimelineEntry {
  agentId: string
  state: AgentState
  startTime: string
  endTime: string
  duration: number
  callId: string | null              // Associated call if busy/ringing/wrap
  reason: string | null              // Reason code for away/dnd
}

// ─── Recording Domain ─────────────────────────────────────────

interface Recording {
  id: string
  callId: string
  agentId: string | null
  agentName: string | null
  callerNumber: string
  calledNumber: string
  direction: 'inbound' | 'outbound' | 'internal'
  startTime: string
  endTime: string
  duration: number                   // Seconds
  fileSize: number                   // Bytes
  format: 'wav' | 'opus'
  storagePool: string                // Storage pool ID
  storagePath: string                // Relative path within pool
  hasScorecard: boolean
  score: number | null               // Aggregate QA score (0-100)
  tags: string[]
  retainUntil: string                // ISO date for retention policy
}

// ScoreCard uses 0-100 scale internally; UI allows 1-10 input scaled to 0-100 via (score / 10) * 100
interface ScoreCard {
  id: string
  recordingId: string
  evaluatorId: string
  evaluatorName: string
  evaluatedAt: string
  overallScore: number               // 0-100
  categories: ScoreCategory[]
  comments: string | null
}

interface ScoreCategory {
  name: string                       // e.g. "Greeting", "Problem Resolution"
  weight: number                     // 0-1 (sum of all weights = 1)
  score: number                      // 0-100
  criteria: ScoreCriterion[]
}

interface ScoreCriterion {
  label: string
  score: number                      // 0-100
  comment: string | null
}

// ─── Report Domain ────────────────────────────────────────────

interface Report {
  id: string
  name: string
  description: string | null
  category: 'call' | 'agent' | 'group' | 'trunk' | 'custom'
  createdBy: string
  createdAt: string
  updatedAt: string
  filters: ReportFilterState
  columns: string[]                  // Ordered column keys
  groupBy: string | null
  interval: '15m' | '30m' | '1h' | '1d' | '1w' | '1M'
  chartType: 'bar' | 'line' | 'stacked' | 'pie' | null
  schedule: ReportSchedule | null
}

interface ReportFilterState {
  dateRange: { from: string; to: string }
  groups: string[]
  agents: string[]
  trunks: string[]
  direction: ('inbound' | 'outbound' | 'internal')[]
  minDuration: number | null
  maxDuration: number | null
  dispositions: string[]
}

interface ReportSchedule {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string                       // HH:mm
  dayOfWeek: number | null           // 0-6 for weekly
  dayOfMonth: number | null          // 1-31 for monthly
  recipients: string[]               // Email addresses
  format: 'csv' | 'pdf' | 'xlsx'
}

// ─── Wallboard Domain ─────────────────────────────────────────

interface WallboardConfig {
  id: string
  name: string
  createdBy: string
  createdAt: string
  updatedAt: string
  theme: 'dark' | 'light' | 'custom'
  resolution: { width: number; height: number }
  refreshInterval: number            // Seconds
  widgets: Widget[]
  layouts: Record<string, LayoutItem[]>  // Breakpoint -> layout items
}

interface Widget {
  id: string
  type: WidgetType
  title: string
  config: WidgetConfig               // Type-specific configuration
  thresholds: ThresholdRule[]
}

type WidgetType = 'active-calls' | 'agent-box' | 'gauge' | 'chart'
                | 'group-box' | 'title-value' | 'leaderboard' | 'pie-chart'
                | 'marquee' | 'image' | 'web-page' | 'text' | 'line' | 'widget-group'
                | 'box' | 'ellipse' | 'clock'

interface WidgetConfig {
  metric?: string                    // Which metric to display
  groups?: string[]                  // Filter to these hunt groups
  agents?: string[]                  // Filter to these agents
  refreshInterval?: number           // Override wallboard default (seconds)
  fontSize?: number
  backgroundColor?: string
  foregroundColor?: string
  borderColor?: string
  chartType?: 'bar' | 'line' | 'area'
  maxItems?: number                  // For leaderboards, lists
  url?: string                       // For web-page / image widgets
  content?: string                   // For text / marquee widgets
  scrollSpeed?: number               // For marquee
  childWidgetIds?: string[]          // For widget-group
  [key: string]: unknown             // Extensible per widget type
}

interface ThresholdRule {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  value: number
  color: string                      // CSS color to apply
  flash?: boolean                    // Flash/pulse animation
}

interface LayoutItem {
  i: string                          // Widget ID
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  static?: boolean
}

// ─── User & Auth Domain ───────────────────────────────────────

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  groupAccess: string[]              // Permitted hunt group IDs (empty = all)
  permissions: Permission[]
  lastLoginAt: string | null
  createdAt: string
  active: boolean
  ssoProvider: string | null         // null for local auth
}

type UserRole = 'admin' | 'supervisor' | 'agent' | 'wallboard-only'

type Permission =
  | 'calls:view'
  | 'calls:cradle-to-grave'
  | 'reports:view'
  | 'reports:create'
  | 'reports:export'
  | 'recordings:view'
  | 'recordings:playback'
  | 'recordings:download'
  | 'recordings:delete'
  | 'recordings:score'
  | 'recordings:manage-rules'
  | 'wallboards:view'
  | 'wallboards:edit'
  | 'agents:view'
  | 'agents:change-state'
  | 'admin:users'
  | 'admin:settings'
  | 'admin:storage'

// ─── Common Types ─────────────────────────────────────────────

interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    pageCount: number
  }
}

interface ApiError {
  code: string                       // Machine-readable error code
  message: string                    // Human-readable message
  details?: Record<string, unknown>
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number                  // Auto-dismiss ms, default 5000
}
```
