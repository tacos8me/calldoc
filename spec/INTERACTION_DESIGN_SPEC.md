# CallDoc Interaction Design Specification

> **Platform:** Call center reporting for Avaya IP Office 11
> **Stack:** Next.js 14 App Router, TypeScript, shadcn/ui, Tailwind CSS
> **Last updated:** 2026-02-10

---

## 1. Page-by-Page User Flows

### 1.1 Login Flow

1. User navigates to `/`. The Next.js middleware checks for a valid session cookie.
   - If a session exists, redirect to `/dashboard`.
   - If no session exists, redirect to `/login`.
2. The `/login` page renders two options:
   - **Primary:** "Sign in with SSO" button (full-width, prominent).
   - **Secondary:** Collapsible "Admin Login" section below for local username/password.
3. **SSO path:**
   - User clicks "Sign in with SSO".
   - Button enters loading state (spinner + "Redirecting to Okta...").
   - Browser redirects to Okta SAML endpoint.
   - After Okta authentication, callback hits `/api/auth/callback/saml`.
   - Server validates the SAML assertion, creates a session, and redirects to `/dashboard`.
   - If the SAML assertion is invalid or expired, redirect back to `/login?error=sso_failed` with an inline error banner: "SSO authentication failed. Please try again or contact your administrator."
4. **Local admin fallback path:**
   - User expands the "Admin Login" section.
   - Enters username and password, clicks "Sign In".
   - On success, session is created and user is redirected to `/dashboard`.
   - On failure, inline error appears below the form: "Invalid username or password."
   - After 5 failed attempts within 15 minutes, the account locks for 30 minutes with a message: "Account temporarily locked. Try again later."
5. After session creation, the user's role (admin, supervisor, agent) is loaded into the session context and governs all subsequent authorization checks.

### 1.2 Dashboard

1. User lands on `/dashboard`. The layout engine loads the user's last-saved layout from the database. If no saved layout exists, the default layout is applied.
2. Widgets auto-populate with real-time data via Socket.io connections established on mount.
3. **Widget configuration:**
   - Click the gear icon on any widget header.
   - A configuration drawer slides in from the right (400px wide, overlay on mobile).
   - Drawer contains widget-specific settings: title, data source, refresh interval, thresholds, colors.
   - "Apply" saves changes and closes the drawer. "Cancel" discards changes.
4. **Layout manipulation:**
   - Widgets are arranged via `react-grid-layout`.
   - Drag widget headers to reposition. Grab bottom-right handle to resize.
   - Grid snaps to a 12-column layout with 8px gutters.
   - During drag, a blue dashed outline shows the drop target position.
5. **Adding widgets:**
   - Click "Add Widget" button in the dashboard toolbar.
   - A modal opens with 14 widget types organized in a grid:
     - **Real-time:** Active Calls, Agent States, Queue Status, Trunk Utilization
     - **Metrics:** Call Volume, Answer Rate, Abandon Rate, Average Wait Time
     - **Charts:** Calls by Hour, Calls by Day, Agent Performance Bar, Group Comparison
     - **Status:** System Health, Connection Status
   - Click a widget type to add it to the first available grid position.
   - The new widget immediately begins receiving data.
6. **Persistence:**
   - "Save Layout" button persists the current widget positions, sizes, and configurations to the database.
   - "Reset Layout" opens a confirmation dialog, then reverts to the system default layout.

### 1.3 Cradle-to-Grave (C2G)

1. User navigates to `/calls`. The default view shows the last 24 hours of calls, sorted most recent first.
2. **Filter panel:**
   - Left side panel (320px wide, collapsible with `F` key or chevron button).
   - 83 filter options grouped into categories:
     - **Time:** Date range picker, time-of-day range, day-of-week checkboxes
     - **Call Properties:** Direction (Inbound/Outbound/Internal), duration range, ring time range, hold time range, call result (Answered/Abandoned/Voicemail/Transferred)
     - **Parties:** Caller ID, called number, account code, DNIS, DID
     - **Agents:** Agent multi-select (grouped by hunt group), extension range
     - **Groups:** Hunt group multi-select, queue multi-select
     - **Trunks:** Trunk multi-select, trunk group
     - **Tags:** Custom tags, scored/unscored, flagged/unflagged
   - Active filters appear as removable chips above the call list.
   - "Clear All Filters" link resets everything.
   - Filter changes trigger a debounced search (300ms delay after last change).
3. **Call list:**
   - Table columns: Time, Direction icon, Caller ID, Called Number, Agent, Duration, Ring Time, Result badge.
   - Column headers are sortable (click to toggle asc/desc).
   - Virtual scrolling activates for result sets exceeding 500 rows.
4. **Row expansion:**
   - Click a row to expand it inline.
   - Expanded view shows a colored event timeline bar spanning the full call duration.
   - Below the timeline bar, an event detail list shows each segment (event colors per FRONTEND_UX_SPEC Section 4.2):
     - Ringing (amber #FBBF24), Talking (blue #3B82F6), Hold (red #EF4444), Transfer (sky blue #38BDF8), IVR/Auto Attendant (slate #94A3B8), Queued (orange #F97316), ACW (violet #8B5CF6).
   - Each segment on the timeline bar is proportionally sized to its duration.
5. **Event detail interaction:**
   - Click any segment on the timeline bar to open a detail popup.
   - Popup shows: Agent name, extension, state, start time, end time, duration, and any associated notes.
6. **Recording playback:**
   - If a recording exists for the call, an inline waveform player appears below the timeline.
   - Standard playback controls: play/pause, scrub, volume, speed selector.
7. **Context menu:**
   - Right-click any row to open a context menu with options:
     - "View Details" -- expands the row.
     - "Play Recording" -- expands row and auto-plays recording.
     - "Download Recording" -- triggers browser download of the audio file.
     - "Score Recording" -- opens the scorecard panel.
     - "Share Link" -- copies a direct link to this call record.
   - Menu items that require permissions the user lacks are grayed out with a lock icon.

### 1.4 Agent Timeline

1. User navigates to `/agent-timeline`.
2. **Agent selection:**
   - Multi-select dropdown at the top of the page.
   - Agents are grouped by hunt group for easy selection.
   - "Select All in Group" option per group. Limit of 50 agents displayed simultaneously.
3. **Timeline rendering:**
   - One horizontal row per selected agent, labeled with agent name and extension.
   - Each row contains colored segments representing agent states (event colors per FRONTEND_UX_SPEC Section 4.2):
     - Idle = soft green (#4ADE80)
     - Talking = bright blue (#3B82F6)
     - Ringing = amber (#FBBF24)
     - Hold = red (#EF4444)
     - ACW (After Call Work) = violet (#8B5CF6)
     - DND (Do Not Disturb) = deep red (#DC2626)
     - Logged Out = dark gray (#374151)
   - Segments are proportionally sized to duration within the visible time window.
4. **Hover interaction:**
   - Hovering over any segment shows a tooltip with: state name, duration (mm:ss), and if Talking/Hold, the associated call details (caller ID, called number).
5. **Click interaction:**
   - Clicking a Talking or Ringing segment navigates to the C2G view filtered to that specific call.
6. **Time navigation:**
   - A time scrubber bar at the top allows panning and zooming the visible time window.
   - Drag the scrubber to pan. Pinch or scroll to zoom in/out.
   - Minimum zoom: 5-minute window. Maximum zoom: 24-hour window.
7. **Live mode:**
   - "Now" button (bottom-right, floating) snaps the view to the current time.
   - In live mode, the timeline auto-scrolls as new state changes arrive via Socket.io.
   - A pulsing green dot next to "Now" indicates live mode is active.
   - Any manual pan/zoom exits live mode.

### 1.5 Reports

1. User navigates to `/reports`.
2. **Report selection:**
   - Left sidebar shows a categorized list of available reports:
     - **Agent:** Agent Activity, Agent Summary, Agent Availability, Agent Call Detail
     - **Group:** Group Summary, Group Call Distribution, Group Service Level
     - **Queue:** Queue Performance, Queue Abandon Analysis, Queue Wait Times
     - **Call:** Call Detail, Call Summary by Hour, Call Summary by Day
     - **Trunk:** Trunk Utilization, Trunk Traffic Analysis
     - **Inbound:** Inbound Summary, Inbound by DNIS, Inbound by DID
   - Starred/favorite reports appear at the top.
   - "Custom Reports" section shows user-saved report configurations.
3. **Report configuration:**
   - After selecting a report type, a filter panel appears at the top:
     - Date range picker (presets: Today, Yesterday, This Week, Last Week, This Month, Last Month, Custom).
     - Entity selectors relevant to the report type (agents, groups, queues, trunks).
     - Additional filters: call direction, minimum duration, include/exclude internal calls.
   - All filters have sensible defaults pre-populated.
4. **Report generation:**
   - Click "Generate" (or `Cmd/Ctrl+Enter`).
   - A loading skeleton replaces the content area, matching the expected table structure.
   - If generation exceeds 5 seconds, a progress message appears: "This report is large and may take a moment."
   - Results render in a sortable, paginated table.
5. **View toggle:**
   - Toggle between "Table" and "Chart" view in the toolbar.
   - Chart view renders appropriate visualization (bar, line, pie) based on report type.
   - Charts are interactive: hover for values, click segments to drill down.
6. **Export:**
   - Toolbar buttons: CSV, PDF, Excel.
   - Export includes all data (not just the current page), with applied filters noted in the header.
   - PDF export uses a print-optimized layout with company branding.
7. **Save and schedule:**
   - "Save as Custom Report" prompts for a name and optional description, then saves the filter configuration.
   - "Schedule" opens a dialog for recurring delivery:
     - Frequency: Daily, Weekly (select day), Monthly (select date).
     - Time of delivery.
     - Recipients: email addresses (multi-input).
     - Format: PDF or Excel attachment.
     - "Save Schedule" confirms with a success toast.

### 1.6 Recordings

1. User navigates to `/recordings`.
2. **Search and filter:**
   - Search bar with filters: date range, agent, caller ID, called number, duration range, scored/unscored, tag.
   - Results appear in a list view with columns: Date/Time, Agent, Caller ID, Called Number, Duration, Score (if scored), Tags.
3. **List view:**
   - Each row shows a compact inline waveform preview (100px wide, grayscale).
   - Hover over the waveform preview to see a mini play button; click to play inline without navigating away.
4. **Full recording player:**
   - Click a row to open the full recording player view.
   - **Waveform display:** Large, zoomable waveform occupying the top portion of the view.
   - **Playback controls:**
     - Play/Pause button (spacebar shortcut).
     - Scrub bar synchronized with the waveform.
     - Volume slider.
     - Playback speed selector: 0.5x, 1x, 1.5x, 2x.
   - **Notes and markers:**
     - Click anywhere on the waveform to add a timestamped note/marker.
     - Existing markers appear as pins on the waveform; click to view/edit the note.
     - Notes are persisted to the database and visible to all users with access.
   - **Snippet selection:**
     - Click and drag on the waveform to select a portion.
     - Selected region highlights in blue.
     - Toolbar appears: "Download Snippet", "Share Snippet", "Cancel Selection".
5. **Scoring:**
   - "Score" button opens a scorecard panel alongside the player (split view).
   - Scorecard contains configurable criteria with point values.
   - Evaluator fills in scores and optional comments per criterion.
   - "Submit Score" saves and marks the recording as scored.
6. **Sharing:**
   - "Share" button generates a time-limited external link (default: 7 days).
   - Options: set expiration, require email verification, allow/disallow download.
   - Shared link opens a stripped-down player (no navigation, no scoring).

### 1.7 Admin Pages

#### 1.7.1 User Management (`/admin/users`)

1. Table of all users with columns: Name, Email, Role, Mapped Extension, Last Login, Status.
2. "Add User" button opens a creation form: name, email, role (admin/supervisor/agent/wallboard-only), mapped IPO extension (dropdown populated from DevLink3 discovery), initial password (or SSO-only toggle).
3. Click a user row to edit. Inline editing for role and extension mapping. Full edit form for other fields.
4. "Deactivate" button (with confirmation) disables the user without deleting their data.
5. Bulk actions: select multiple users via checkboxes -> bulk role change, bulk deactivate.

#### 1.7.2 System Settings (`/admin/settings`)

1. **DevLink3 Configuration:**
   - Fields: Host/IP, Port (default 50797), Username, Password.
   - "Test Connection" button: shows spinner, then success checkmark or error message with details.
   - Connection status indicator: green dot (connected), red dot (disconnected) with last connected timestamp.
2. **SMDR Configuration:**
   - SMDR source: TCP port listener or file watcher.
   - Fields vary by source type. Test button validates configuration.
3. **Recording Storage:**
   - List of configured storage pools with usage stats.
   - Global retention policy: days to retain, auto-delete or archive.

#### 1.7.3 Recording Rules (`/admin/recording-rules`)

1. List of recording rules displayed as cards, ordered by priority.
2. **7 rule types:**
   - Record All Calls
   - Record by Extension/Agent
   - Record by Hunt Group
   - Record by Direction (Inbound/Outbound/Internal)
   - Record by Caller ID Pattern
   - Record by Time Schedule
   - Percentage-based Random Recording
3. Each rule card shows: type, conditions summary, active/inactive toggle, priority number.
4. Drag rules to reorder priority (higher priority rules take precedence).
5. Click a rule to edit. "Add Rule" button opens creation form.
6. Percentage-based rules include a slider (0-100%) with the current value displayed.
7. Rules can be toggled active/inactive without deleting.

#### 1.7.4 Storage Pools (`/admin/storage`)

1. List of storage pools displayed as cards.
2. Each card shows: pool name, type (Local/S3), capacity bar (used/total), file count, retention policy.
3. "Add Pool" form:
   - **Local:** path on server, max size.
   - **S3:** bucket name, region, access key, secret key, prefix. "Test Access" button.
4. Capacity bar changes color as usage increases: green (<70%), amber (70-90%), red (>90%).
5. Retention policy per pool: days to retain, action on expiry (delete/archive to another pool).
6. "Migrate" action: move recordings from one pool to another (background job with progress).

---

## 2. Keyboard Shortcuts

### 2.1 Global Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + K` | Open command palette. Searches across calls, agents, reports, and settings. Results grouped by category. |
| `Cmd/Ctrl + /` | Toggle sidebar collapsed/expanded. |
| `Escape` | Close the topmost open panel, drawer, modal, or command palette. |

### 2.2 Cradle-to-Grave Shortcuts

| Shortcut | Action |
|---|---|
| `J` | Move selection to the next row down. |
| `K` | Move selection to the previous row up. |
| `Enter` | Expand or collapse the currently selected row. |
| `Space` | Play or pause the recording for the selected row (if available). |
| `F` | Toggle the filter panel open/closed. |

### 2.3 Report Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + Enter` | Generate the currently configured report. |
| `Cmd/Ctrl + E` | Export the current report view (opens export format picker). |

### 2.4 Recording Player Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play/pause the recording. |
| `Left Arrow` | Skip backward 5 seconds. |
| `Right Arrow` | Skip forward 5 seconds. |
| `Shift + Left Arrow` | Skip backward 30 seconds. |
| `Shift + Right Arrow` | Skip forward 30 seconds. |
| `[` | Set snippet start at current playhead position. |
| `]` | Set snippet end at current playhead position. |

### 2.5 Command Palette Behavior

- Opens centered modal with search input auto-focused.
- Results appear as user types (debounced 150ms).
- Arrow keys navigate results, `Enter` selects.
- Result categories: Recent Calls, Agents, Reports, Settings, Actions.
- Actions include: "Go to Dashboard", "Open C2G", "Generate Report", "View Agent Timeline".

---

## 3. Real-time Update Behaviors

### 3.1 Active Calls Widget

- **New call arrives:** Row slides in from the top with a brief green flash animation (300ms fade from green highlight to normal background).
- **Call state change:** Status badge updates with a 200ms color transition. Duration counter continues incrementing in real time.
- **Call ends:** Row transitions to a muted gray background (200ms ease). After 5 seconds, the row fades out and is removed from the list.
- **Sort order:** Active calls sorted by start time (newest at top). Ended calls sink to the bottom during their 5-second fade-out period.

### 3.2 Agent State Changes

- **Status badge:** Color transitions with a 200ms ease-in-out animation.
- **State duration:** Timer resets and begins counting from zero on each state change.
- **Dashboard widget:** Agent cards reorder to group by state (Talking first, then Ringing, ACW, Idle, DND, Logged Out).
- **Timeline view:** New segment appends to the agent's timeline row in real time.

### 3.3 Queue Metrics

- **Numeric values:** Animate between old and new values using a counting animation (numbers increment/decrement over 400ms).
- **Threshold alerts:** When a metric crosses a configured threshold (e.g., wait time > 60s), the value turns red and pulses once.
- **Sparkline charts:** New data points append with a smooth line extension animation.

### 3.4 Connection Status

- **Connection lost:**
  - Amber banner slides down from the top of the viewport: "Connection lost -- reconnecting..." with a spinning icon.
  - Automatic reconnection attempts with exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s).
  - After 30 seconds without reconnection, the banner turns red: "Unable to connect to server. Data may be stale."
  - All real-time widgets show a subtle amber border to indicate potentially stale data.
- **Reconnected:**
  - Green banner: "Connected" with a checkmark icon. Auto-dismisses after 3 seconds.
  - All widgets refresh their data immediately upon reconnection.
  - Amber borders on widgets are removed.

### 3.5 Data Freshness

- Each widget displays a "Last updated" timestamp in its footer (relative time: "2s ago", "1m ago").
- If data is older than the widget's configured refresh interval by more than 2x, the timestamp turns amber.
- Manual refresh button (circular arrow icon) in each widget header forces an immediate data fetch.

---

## 4. Error States and Edge Cases

### 4.1 Empty States

Each context has a tailored empty state with an illustration and message:

| Context | Message | Action |
|---|---|---|
| C2G with filters | "No calls match your filters" | "Clear filters" button |
| C2G no data | "No call data available yet" | "Check DevLink3 connection" link |
| Recordings search | "No recordings found" | "Adjust your search criteria" suggestion |
| Reports result | "No data for the selected period" | "Try a different date range" suggestion |
| Agent timeline | "Select agents to view their timeline" | Agent selector is highlighted |
| Dashboard no widgets | "Your dashboard is empty" | "Add your first widget" button |

### 4.2 API Errors

- **Non-critical errors:** Toast notification (red) with the error message and a "Retry" button. Auto-dismiss after 8 seconds (longer than standard to allow reading).
- **Critical errors (500):** Full-page error boundary with "Something went wrong" message, error ID for support reference, and "Reload Page" button.
- **Network errors:** Distinguished from server errors. Message: "Network error -- please check your connection."

### 4.3 DevLink3 Disconnection

- Persistent amber banner at the top of all pages: "DevLink3 connection lost -- real-time data unavailable."
- Automatic reconnection with exponential backoff.
- Historical data and recordings remain accessible.
- Admin notification: email sent to all admin users if disconnected for more than 5 minutes.
- Banner includes "Details" link that navigates to `/admin/settings` for troubleshooting.

### 4.4 Large Result Sets

- **Virtual scrolling:** Activates automatically for lists exceeding 500 rows. Uses `@tanstack/react-virtual` for efficient DOM recycling.
- **Pagination fallback:** For report exports and print views, results paginate at 100 rows per page.
- **Result count display:** "Showing 1-500 of 12,847 results" with a "Load All" option (warns if >10,000 results).
- **Search debouncing:** Filter inputs debounce at 300ms to prevent excessive API calls.

### 4.5 Stale Data

- Widgets show "Last updated X ago" in their footer.
- If a widget's data is older than its refresh interval by more than 2x, a yellow warning icon appears.
- Manual refresh button available on every widget and data view.
- Page-level "Refresh All" in the toolbar refreshes all visible data sources.

### 4.6 Permission Denied

- Actions the user lacks permission for are rendered in a disabled state (grayed out, reduced opacity).
- Hovering over a disabled action shows a tooltip: "You don't have permission to [action]. Contact your administrator."
- If a user navigates directly to a URL they lack access to, they see a 403 page: "Access Denied -- You don't have permission to view this page." with a "Go to Dashboard" button.
- API calls that return 403 show a toast: "Permission denied" without exposing internal details.

### 4.7 Concurrent Editing

- If two users edit the same recording scorecard simultaneously, the second user to save sees a conflict dialog: "This scorecard was updated by [User] at [time]. Overwrite or reload?"
- Dashboard layouts are per-user and do not conflict.

---

## 5. Loading Patterns

### 5.1 Page Load

- **Full-page skeleton:** On initial page navigation, a skeleton screen matching the target page layout renders immediately.
- Skeleton elements use a shimmer animation (left-to-right gradient sweep, 1.5s cycle).
- Navigation sidebar loads instantly (static); only the content area shows skeletons.
- Skeletons match the approximate shape and position of real content to minimize layout shift.

### 5.2 Data Refresh

- **Inline skeleton:** When refreshing data within an already-loaded page, only the content area shows skeleton loading. Navigation, filters, and toolbars remain interactive.
- **Optimistic updates:** Where possible (e.g., toggling a recording rule active/inactive), the UI updates immediately and reverts on failure.

### 5.3 Button Actions

- **Submit buttons:** On click, the button shows a spinner icon replacing the label text, enters a disabled state, and prevents double-clicks.
- **Duration:** If the action completes in under 200ms, no spinner is shown (to avoid flash). Spinner appears only for actions taking longer than 200ms.

### 5.4 Report Generation

- First 5 seconds: standard skeleton table.
- After 5 seconds: skeleton is overlaid with a centered message: "Generating report... This may take a moment for large datasets."
- After 30 seconds: message updates to include a cancel option: "Still working... [Cancel]".
- On completion: skeleton crossfades to real data (200ms transition).

### 5.5 Recording Load

- **Waveform placeholder:** A shimmer animation in the shape of a waveform renders while the audio buffer loads.
- **Progressive loading:** Playback can begin before the full file is loaded (streaming). The loaded portion of the waveform renders progressively from left to right.
- **Large files (>50MB):** A progress bar appears with percentage and estimated time remaining.

### 5.6 Suspense Boundaries

- Each major page section uses a React Suspense boundary with its own fallback.
- Nested Suspense boundaries allow parts of the page to load independently (e.g., the filter panel and the call list load in parallel and render as each completes).

---

## 6. Notification System

### 6.1 Toast Notifications

- **Position:** Bottom-right corner of the viewport, stacked vertically (newest on top).
- **Auto-dismiss:** 5 seconds for success and info toasts. 8 seconds for warnings and errors.
- **Manual dismiss:** "X" button on each toast.
- **Max visible:** 3 toasts at once. Additional toasts queue and appear as others dismiss.
- **Types and colors:**
  - Success: green left border, checkmark icon.
  - Error: red left border, X-circle icon.
  - Warning: amber left border, alert-triangle icon.
  - Info: blue left border, info icon.
- **Action toasts:** Some toasts include an action button (e.g., "Retry", "View", "Undo").

### 6.2 Persistent Alerts

- Rendered as banners below the top navigation bar. They do not auto-dismiss.
- Use cases:
  - DevLink3 connection lost (amber, then red).
  - License expiring within 30 days (amber).
  - Storage pool above 90% capacity (amber), above 95% (red).
  - System update available (blue, admin only).
- Dismissible only by resolving the underlying condition or by explicit "Dismiss" action (for informational alerts).

### 6.3 Badge Counts

- Sidebar navigation items display badge counts where relevant:
  - **Recordings:** Count of unscored recordings (supervisor/admin only).
  - **Admin:** Count of pending items (failed recording jobs, storage warnings).
- Badges use a red circle with white text for counts, positioned top-right of the nav icon.
- Counts update in real time via Socket.io.

### 6.4 Sound Alerts (Optional)

- Configurable per-user in settings.
- Available alert sounds: queue threshold exceeded, abandoned call, agent logged out.
- Sounds are short (< 1 second) and non-intrusive.
- Default: all sound alerts disabled.

---

## 7. Responsive Breakpoints

### 7.1 Desktop (>1280px)

- **Sidebar:** Full-width (256px) with text labels and icons. Always visible.
- **Content area:** Fills remaining width. Dashboard grid uses all 12 columns.
- **Panels and drawers:** Slide in from the right, overlaying content (400px wide).
- **Tables:** All columns visible. Horizontal scroll not needed for standard views.
- **Timeline:** Full horizontal rendering with comfortable row height (48px).

### 7.2 Tablet (768px -- 1279px)

- **Sidebar:** Collapsed to icon-only mode (64px wide) by default. Expands on hover or toggle to full width as an overlay.
- **Content area:** Fills remaining width. Dashboard grid uses 8 columns.
- **Panels and drawers:** Full-width overlay with backdrop blur.
- **Tables:** Less critical columns hidden. Horizontal scroll enabled for full detail.
- **Timeline:** Reduced row height (36px). Agent labels abbreviated.
- **Filter panel:** Collapses to a floating filter button that opens a full-screen filter sheet.

### 7.3 Mobile (<768px)

- **Navigation:** Bottom tab bar replaces sidebar. 5 tabs: Dashboard, Calls, Agents, Reports, More.
- **Content area:** Full-width, single-column layout.
- **Dashboard:** Widgets stack vertically in a single column. Drag-to-reorder replaces grid layout.
- **Tables:** Card-based layout replaces table rows. Each card shows key fields with "View Details" action.
- **Timeline:** Vertical orientation (time flows top-to-bottom). Swipe left/right to switch between agents.
- **Recording player:** Full-screen overlay with large touch-friendly controls.
- **Gestures:**
  - Swipe right on a call card to reveal quick actions (Play, Score, Share).
  - Pull-to-refresh on list views.
  - Pinch-to-zoom on timeline and waveform views.
- **Filter panel:** Full-screen modal with "Apply" and "Clear" buttons fixed at the bottom.

### 7.4 Breakpoint Transition Behavior

- Layout transitions use CSS transitions (200ms ease) to avoid jarring layout shifts.
- User's sidebar state preference is persisted per breakpoint (e.g., user may prefer expanded sidebar on tablet but it defaults to collapsed).
- Dashboard widget layouts are saved independently per breakpoint tier so desktop and tablet can have different arrangements.

---

## Appendix A: Animation Timing Reference

| Animation | Duration | Easing | Trigger |
|---|---|---|---|
| Sidebar collapse/expand | 200ms | ease-in-out | Toggle or breakpoint change |
| Drawer slide in/out | 250ms | ease-out / ease-in | Open/close action |
| Modal fade in/out | 150ms | ease-out / ease-in | Open/close action |
| Toast slide in | 300ms | ease-out | New notification |
| Toast slide out | 200ms | ease-in | Dismiss or auto-dismiss |
| Widget green flash | 300ms | ease-out | New call arrives |
| Widget fade out | 500ms | ease-in | Call ends (after 5s delay) |
| Status badge color | 200ms | ease-in-out | State change |
| Number count animation | 400ms | ease-out | Metric value change |
| Skeleton shimmer | 1500ms | linear (loop) | Loading state |
| Waveform progressive reveal | continuous | linear | Audio buffer loading |
| Banner slide down | 300ms | ease-out | Connection/alert state change |

## Appendix B: Color Token Reference

| Token | Hex | Usage |
|---|---|---|
| `--state-idle` | #4ADE80 | Agent idle state (per FRONTEND_UX_SPEC Section 4.2) |
| `--state-talking` | #3B82F6 | Agent talking / active call (per FRONTEND_UX_SPEC Section 4.2) |
| `--state-ringing` | #FBBF24 | Agent ringing (per FRONTEND_UX_SPEC Section 4.2) |
| `--state-hold` | #EF4444 | Call on hold (per FRONTEND_UX_SPEC Section 4.2) |
| `--state-acw` | #8B5CF6 | After call work (per FRONTEND_UX_SPEC Section 4.2) |
| `--state-dnd` | #DC2626 | Do not disturb (per FRONTEND_UX_SPEC Section 4.2) |
| `--state-logged-out` | #374151 | Agent logged out |
| `--toast-success` | #16A34A | Success notifications |
| `--toast-error` | #DC2626 | Error notifications |
| `--toast-warning` | #D97706 | Warning notifications |
| `--toast-info` | #2563EB | Info notifications |
| `--capacity-ok` | #22C55E | Storage <70% |
| `--capacity-warn` | #F59E0B | Storage 70-90% |
| `--capacity-critical` | #EF4444 | Storage >90% |
