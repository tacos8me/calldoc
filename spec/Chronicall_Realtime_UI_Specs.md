# Chronicall Realtime UI Components -- Precise Replication Specs
## Wallboard Builder + Agent Timeline + Group Timeline

---

## Part 1: Wallboard Builder

### 1.1 Creating a Wallboard

**Entry Point**: Realtime section > "New Wallboard" > choose "Custom" (blank canvas) or select a pre-built template.

**Wallboard Parameters (set at creation)**:
- **Title**: Descriptive name for the wallboard
- **Background Color**: Hex code or color picker selection
- **Background Image**: Upload image file; optional "Background Position" dropdown for sizing
- **Licensing**: Requires Realtime licenses; metrics limited to licensed agents/groups

**Pre-Built Templates**: Hovering over a template shows a preview. Clicking the plus sign selects it. A "Template Configuration" window lets you choose which groups and agents to monitor. After selection, every widget's placement and metric are previewed on the Canvas Configuration via hover tooltips. Templates are fully editable post-creation.

### 1.2 Canvas / Grid System

The wallboard canvas is a free-form drag-and-drop surface:
- Widgets are selected from a widget list on the right side of the screen (HTML) or top bar (Java)
- Click to place at default size, or click-and-drag to set custom dimensions
- Widgets can be repositioned by dragging
- Widgets can be resized
- No documented snap-to-grid or explicit grid system -- placement is freeform
- "Save and Exit" from top-right persists layout

### 1.3 Widget Management (Per-Widget Context Menu)

Clicking the three-dot icon on any widget reveals:

| Action         | Description                                      |
|----------------|--------------------------------------------------|
| **Go To Data** | Configure the metric, time frame, calculation, and criteria |
| **Go To Design** | Customize fonts, colors, borders, container styling |
| **Duplicate**  | Clone the widget for quick variant creation       |
| **Delete**     | Remove the widget from the wallboard              |

### 1.4 Time Frame Options (Critical -- Three Modes)

Every metric widget supports one of three time frame modes:

| Mode      | Behavior                                              | Example                        |
|-----------|-------------------------------------------------------|--------------------------------|
| **Since** | Accumulates data since a specific time of day; resets every 24 hours | "Calls handled since 8:00 AM" |
| **Last**  | Rolling window of a specified duration                | "Calls in last 30 minutes"    |
| **Now**   | Live snapshot of current state                        | "Calls in queue right now"    |

### 1.5 Calculation Types

Calculation options vary by metric type. Common calculations:

**For Count metrics:**
- Count (total)
- Max Count (highest across monitored groups)
- Min Count (lowest across monitored groups)
- True/False (binary indicator, shown as checkmark in leaderboards)

**For Duration metrics:**
- Total duration
- Maximum duration
- Minimum duration
- Average duration
- Median duration

**For State metrics:**
- State (current state name, e.g., "Idle", "Talking", "DND: Restroom")
- State Duration (elapsed time in current state)

### 1.6 Criteria / Filters

Criteria define the data scope for each widget:
- **Criteria Type**: Group/Queue, Agent, Call Direction, Account Code
- Add filter lines with the plus (+) symbol
- Use the pencil tool to select specific groups/agents
- Multiple groups can be combined for aggregate totals

### 1.7 Design Configuration (Per-Widget)

Three styling sections per widget:

**Header** (metric label area):
- Font family, size, color
- Background color
- Alignment

**Metric** (the displayed value):
- Font family, size, color
- Background color
- Number formatting

**Container** (wrapper):
- Background color
- Border style, width, color
- Overall container dimensions

Click "Apply" in bottom-right after making design changes.

### 1.8 Value Configuration (Java Version -- Four Folders)

The Java version organizes metric selection into four folders:
1. **Count** -- numerical count values
2. **Duration** -- time-based metrics
3. **Miscellaneous** -- Contact Center / Multimedia values
4. **Formula** -- custom calculations (see Section 1.10)

### 1.9 Display & Refresh Behavior

- **No polling/refresh rate**: Wallboards use persistent WebSocket connections for true real-time push updates
- Wallboards can be displayed full-screen for office display
- Wallboards can loop throughout the day
- Data updates stream continuously without page refresh

### 1.10 Custom Formulas

**Access**: Widget value configuration > Formula tab > "New"

**Configuration**:
1. Create a formula title
2. Click "Add" to select Realtime values as operands
3. Choose format for result display
4. Combine multiple metrics with mathematical operations
5. Save with OK

**Use Case**: Building derived metrics like Service Level percentages by combining answered calls with presented calls.

---

## Part 2: Complete Widget Type Reference (14 HTML Widget Types)

### 2.1 Title Value Widget
- **Purpose**: Simple metric display -- title + count/duration total
- **Noted as "most popular widget"** due to straightforward setup
- **Shows**: Single realtime value for selected group(s)
- **Data config**: Metric, time frame (Since/Last/Now), calculation type, criteria

### 2.2 Text Widget
- **Purpose**: Display one or multiple metric values with labels
- **Shows**: Metric text labels alongside associated totals
- **Supports**: Multiple values simultaneously
- **Typical use**: Group totals dashboard

### 2.3 Active Calls Widget
- **Purpose**: Live call display with three-column layout
- **Layout**: Calling party (left) | Event + Duration (center) | Receiving party (right)
- **Shows**: All calls currently in progress for selected users/groups
- **Updates**: Real-time duration counter ticking live

### 2.4 Agent Box Widget
- **Purpose**: Individual agent status card
- **Shows**: Agent's current activity state
- **Shows**: Groups the agent belongs to
- **Shows**: Groups currently logged into (highlighted in blue)
- **Mirrors**: Agent Timeline functionality in widget form

### 2.5 Group Box Widget
- **Purpose**: Queue summary for selected groups
- **Four fixed metrics displayed**:
  1. Group Login Count (agents logged in)
  2. Calls in Queue (current queue depth)
  3. Max Duration (longest queued call)
  4. Avg Duration (average of all queued calls)

### 2.6 Chart Widget (Bar/Line/Area)
- **Purpose**: Visual comparison of multiple realtime values
- **Seven format options**:
  1. Line Chart
  2. Bar Chart
  3. Horizontal Bar
  4. Stacked Bar
  5. Horizontal Stacked Bar
  6. Area Chart
  7. Stacked Area
- **Data categories**: Agent, Group, Call Direction, Account Code*
- *Account Code requires Agent Dashboards license

### 2.7 Pie Chart Widget
- **Purpose**: Distribution visualization of a single metric
- **Interaction**: Hover over sections to see percentage breakdowns
- **Categories**: Same as Chart widget

### 2.8 Gauge Widget
- **Purpose**: Animated gauge needle representing metric value
- **Behavior**: Needle moves up as count/duration increases, down as it decreases
- **Typical use**: Group queue durations, call volumes, talking time
- **Shows**: Title + total value + animated gauge visualization

### 2.9 Leaderboard Widget
- **Purpose**: Ranked comparison table with dynamic leader tracking
- **Behavior**: Actively repositions leaders as agents/groups change rank
- **Data categories**: Agent, Group, Call Direction, Account Code*
- **Sorting**: Configurable (default: ascending alphabetical by name)
- **Column headers**: Clickable to re-sort by any column
- **Special**: True/False checkmark indicator available for binary metrics
- *Account Code requires Agent Dashboards license

### 2.10 Marquee Widget
- **Purpose**: Scrolling text ticker for space-efficient metric display
- **Shows**: One or multiple metric values scrolling across screen
- **Benefit**: Conserves screen space vs. static widgets
- **Optional**: Can include company logos

### 2.11 Image Widget
- **Purpose**: Static image display (logos, branding)
- **Config**: Upload image file
- **No data binding** -- purely decorative

### 2.12 Web Page Widget
- **Purpose**: Embed external web content via URL
- **Typical use**: Weather, clocks, third-party dashboards
- **Caveat**: "Not guaranteed that desired URL will work"
- **Config**: URL input field

### 2.13 Decorative Widgets (3 sub-types)
- **Generic Box**: Rectangular container for layout/styling
- **Ellipse**: Circular decorative element
- **Line**: Divider/separator for visual organization
- **Purpose**: All purely decorative for wallboard design

### 2.14 Widget Group
- **Purpose**: Groups multiple widgets into a container
- **Benefit**: Organizational structure, especially for Contact Center Agent Client
- **Note**: Contact Center Agent Client requires Contact Center module

---

## Part 3: Complete Realtime Metric Catalog

### 3.1 Call Volume Metrics

| Metric | Description | Calculations |
|--------|-------------|--------------|
| **Abandoned Calls** | Inbound calls ending without talking or voicemail event. Default threshold: 10 sec minimum call length | Count, Max, Min |
| **Abandoned Group Overflow** | Calls routed to overflow group then abandoned | Count, Duration |
| **Call Count** | Total calls matching criteria (filterable by direction, answer status, duration, hold events) | Count, Max, Min |
| **Connected Calls** | Outbound calls answered by receiving party | Count, Max, Min |
| **Direct Calls** | Calls bypassing auto attendant/queue to reach agent | Count, Max, Min |
| **Handled Calls** | Calls with talking event involving receiving agent(s) | Count, Max, Min |
| **Inbound Calls Answered** | Inbound calls with talking event | Count, Max, Min |
| **Inbound Calls Presented** | Inbound calls presented (including overflow) | Count, Max, Min |
| **Internal Calls** | Extension-to-extension calls | Count, Max, Min |
| **Internal Calls Answered** | Internal calls with talking event | Count, Max, Min |
| **Missed Calls** | Calls ringing but not answered by that extension | Count |
| **Outbound Call Attempts** | Outbound calls dialed regardless of answer | Count, Max, Min |
| **Outbound Calls Connected** | Outbound calls answered | Count, Max, Min |
| **Presented Calls** | Inbound calls where agent/group was initial recipient | Count, Max, Min |
| **Queued Calls** | Calls currently waiting in queue | Count, Max, Min |
| **Unanswered Calls** | Calls never answered by anyone (group level) | Count |
| **Calls Placed** | Calls made by agent(s) that were connected | Count, Max, Min |
| **Finished Call** | Completed calls only (excludes ongoing) | Count, Duration |

### 3.2 Duration Metrics

| Metric | Description | Calculations |
|--------|-------------|--------------|
| **Call Duration** | Entire call duration including all events | Total, Max, Min, Avg, Median |
| **Direct Call Duration** | Duration of direct (non-queue) calls | Total, Max, Min, Avg, Median |
| **Event Duration** | Duration of selected event type(s) | Total, Max, Min, Avg, Median |
| **Inbound Talking Duration** | Talking time on inbound calls | Total, Max, Min, Avg, Median |
| **Outbound Talking Duration** | Talking time on outbound calls | Total, Max, Min, Avg, Median |
| **Queue Duration** | Time calls spent in queue | Total, Max, Min, Avg, Median |
| **Ringing Duration** | Time calls spent ringing | Total, Max, Min, Avg, Median |
| **Talking Duration** | Only the talking events (excludes hold, etc.) | Total, Max, Min, Avg, Median |
| **Group Speed of Answer** | Ringing/queue time before first talking event | Total, Max, Min, Avg, Median |
| **Group Wait Time** | Duration waiting in queue before answer | Total, Max, Min, Avg, Median |

### 3.3 Agent State Metrics

| Metric | Description | Calculations |
|--------|-------------|--------------|
| **Agent State** | Current activity (Idle, Talking, DND, etc.) with reason codes if licensed | State, State Duration |
| **Agent Busy State** | When agent is busy; with Agent Dashboards shows reason (e.g., "DND: Restroom") | State, State Duration |
| **Current Call State** | Current call state (Idle/Talking) | State, State Duration |
| **Agent Current Caller ID** | Inbound Caller ID of person currently on call | Name, Number |
| **Agent Current Connected Party** | Outbound Caller ID of connected party | Name, Number |
| **Agent Line Appearance** | Total concurrent lines/calls agent is on | Count, Duration |
| **Active Time** | Any phone event involving agent (Dialing, Ringing, Hold, Talking) | Count, Duration, True/False |
| **Idle Count** | Agents in idle state (logged in, ready, not on phone) | Count |
| **Idle Duration** | Time spent in idle state | Total, Max, Min, Avg, Median |
| **Ready Count** | Agents logged in and available for calls | Count, True/False |
| **Ready Duration** | Time agents were ready/available | Total, Max, Min, Avg, Median |

### 3.4 Agent Feature Metrics

| Metric | Description | Calculations |
|--------|-------------|--------------|
| **Do Not Disturb Count** | Times agents entered DND/Busy state | Count |
| **Do Not Disturb Duration** | Time spent in DND/Busy | Total, Max, Min, Avg, Median |
| **Extension Login Count** | Agents logged into extensions | Count (typically "Now") |
| **Extension Login Duration** | Time logged into extension | Total, Max, Min, Avg, Median |
| **Group Login Count** | Agents logged into selected group(s) | Count |
| **Group Login Duration** | Logged-in duration per group | Total, Max, Min, Avg, Median |
| **Feature Count** | Instances of selected feature(s) used | Count |
| **Feature Duration** | Duration of feature application | Total, Max, Min, Avg, Median |
| **Advanced Feature** | Login, DND, ACW monitoring with flexible calculations | Count, Duration, Max, Min, Avg, Median |

### 3.5 Event-Level Metrics

| Metric | Description | Calculations |
|--------|-------------|--------------|
| **Event Count** | Count of selected event instances (counts each instance) | Count, Max, Min |
| **Event Count Per Call** | Calls containing selected event (counts call once) | Count, Max, Min |
| **Calling Agent Event** | Calls made by agent with specific events (e.g., transfer) | Count, Duration |
| **Combined Call Event** | Calls containing combination of multiple events | Count, Duration |
| **Directed Call Event** | Direction/offering events (ringing, dialing, transfer) | Count, Duration |
| **Advanced Finished Call** | Highly flexible metric with multiple filter criteria (direction, event type, duration, speed of answer) | Count, Duration |
| **Advanced Finished Call Event** | Same as above + VDN selection (Avaya CM only) | Count, Duration |

### 3.6 Overflow Metrics

| Metric | Description | Calculations |
|--------|-------------|--------------|
| **Generic Group Overflow** | All calls overflowing to a group, optionally filtered by origin | Count, Duration |
| **Group Overflow - Answered** | Overflow calls answered | Count |
| **Group Overflow - Presented** | Overflow calls presented | Count |
| **Group Overflow - Voicemail** | Overflow calls reaching voicemail | Count |

### 3.7 Service Level & Performance

| Metric | Description | Calculations |
|--------|-------------|--------------|
| **Service Level** | Percentage of inbound calls answered within specified threshold | Percentage |
| **Speed of Answer** | How quickly calls were answered | Total, Max, Min, Avg, Median |
| **Missed Call Count** | Calls ringing but not answered (agent-level) | Count |
| **Missed Call Duration** | Duration of missed calls | Total, Max, Min, Avg, Median |

### 3.8 Multimedia / Contact Center Metrics (Require Licensing)

| Metric | Description | Calculations |
|--------|-------------|--------------|
| **Chat Count** | Web chat instances presented | Count |
| **Chat Duration** | Duration of web chats | Total, Max, Min, Avg, Median |
| **Chat Queue Count** | Web chats in queue | Count |
| **Chat State** | Current chat state (Not Logged In/Not Ready/Ready/Chatting) | State, State Duration |
| **Chat Time In Queue** | Duration chats waited | Total, Max, Min, Avg, Median |
| **Chats Answered** | Web chats answered | Count |
| **Chats Missed** | Web chats not accepted | Count |
| **Agents Logged Into Multimedia** | Agents active in multimedia skills | Count, Duration |
| **Agents With Skill Enabled** | Multimedia users logged in and ready | Count |
| **Multimedia Active Channel** | Current multimedia activity/state | State, State Duration |
| **Multimedia ACW Count** | After Call Work instances | Count |
| **Multimedia ACW Duration** | After Call Work duration | Total, Max, Min, Avg, Median |
| **Multimedia MCW Count** | Missed Call Work instances | Count |
| **Multimedia MCW Duration** | Missed Call Work duration | Total, Max, Min, Avg, Median |
| **Multimedia Login Duration** | Skill group login duration | Total, Max, Min, Median |
| **Multimedia User Ready Duration** | Time ready for selected skills | Total, Max, Min, Median |
| **Ready for Multimedia Call** | Agents ready for multimedia | Count, Duration, True/False |

### 3.9 Queue Callback Metrics (Require Licensing)

| Metric | Description | Calculations |
|--------|-------------|--------------|
| **Accepted Callback Count** | Callbacks accepted after queue | Count, Max, Min |
| **Callbacks Scheduled** | Calls selecting callback option | Count, Max, Min |

### 3.10 Special / Miscellaneous Metrics

| Metric | Description | Calculations |
|--------|-------------|--------------|
| **Account Code** | Calls involving selected account codes (requires Agent Dashboards) | Count, Duration |
| **Custom External Data** | External sources (clocks, weather, etc.) | Varies |
| **Voicemail** | Calls reaching voicemail | Count, Duration |
| **Transfers** | Calls involving transfer events | Count, Duration |
| **No X-Event Before Y-Event** | Calls where event X does NOT precede event Y (e.g., answered without auto attendant) | Count, Duration |

---

## Part 4: Agent Timeline -- Complete Specification

### 4.1 Primary Layout

The Agent Timeline is a horizontal timeline view with one row per agent:

```
[Filter] [Column View] [Color Legend] [Sort] [Date/Time Picker]
+-------------------------------------------------------------------+
|  Agent Row  |  <-- past events (colored bars) --> | NOW           |
|-------------|---------------------------------------------|---------|
| [Photo]     | [Idle][Ring][Talk][Hold][Talk][Idle][Ring]...| TALKING |
| Agent Name  |                                             | 2:35    |
| Ext: 481    |                                             |         |
| Groups: ... |                                             |         |
+-------------------------------------------------------------------+
| [Photo]     | [Idle][DND][Idle][Ring][Talk][Idle]...       | IDLE    |
| Agent Name  |                                             | 0:45    |
| Ext: 482    |                                             |         |
+-------------------------------------------------------------------+
     TIME AXIS ---->                         [drag to scroll history]
```

### 4.2 Agent Profile Card (Left Column)

Each agent row displays:
- **Agent photograph** (optional)
- **Agent name**
- **Extension number**
- **Current state** (Idle, Ringing, Dialing, Talking, Hold, etc.)
- **Caller ID** when on active call
- **Group login status**: Dot icon = logged out; Checkmark icon = logged in
- Only agents with assigned Realtime Agent Seat licenses appear

### 4.3 Colored Bar System (Event Representation)

Each colored bar on the timeline represents an event that occurred or is occurring:

**Bar properties**:
- Width = proportional to event duration on time axis
- Color = mapped to event type via Color Legend
- Current/ongoing event bar grows in real-time

**Hover Tooltip Data** (shown when hovering over any bar):
- Event type identification (e.g., "Talking", "Hold", "Queue")
- Call direction (Inbound, Outbound, Internal)
- Event duration
- Associated group
- Caller ID data

### 4.4 Call Event Types Shown on Timeline

These are the Cradle-to-Grave events that appear as colored bars:

| Event | Description |
|-------|-------------|
| **Auto Attendant** | Caller interacting with initial IVR message |
| **Ringing** | Agent's phone is ringing |
| **Queue** | Caller waiting for available agent |
| **Talking** | Agent talking to external/internal party |
| **Hold** | Caller placed on hold (only placing agent can retrieve) |
| **Park** | Like hold, but any agent can pick up |
| **Transfer Hold** | Hold during transfer process |
| **Transfer** | Transfer from one agent to another |
| **Conference** | Three or more parties talking together |
| **Dialing** | Agent picking up phone (outbound/internal only) |
| **Voicemail** | Caller in voicemail box |
| **Overflow** | Call redirected when no agents available |
| **Calling Drop** | Caller hung up first |
| **Receiving Drop** | Receiver hung up first |
| **DND / Busy** | Agent in Do Not Disturb state |
| **Idle** | Agent logged in, ready, not on phone |
| **Listen** | Supervisor live-listening to agent call |

**Contact Center additional events**: Callback Scheduled, Callback Attempt, Callback Accepted, Callback Missed, Callback Abort, Callback Offer, Callback Prompt, Callback Audio, Callback Snoozed, Callback Cancelled, Queue Offer, Queue Audio, Queue Callback Entry, Queue Callback Port Acquired/Not Available

### 4.5 Toolbar Icons (Top-Left)

| Icon | Function | Details |
|------|----------|---------|
| **Filter Displaying Agents** | Select which agents appear | Only shows Realtime-licensed agents |
| **Live Column View Toggle** | Switch between timeline and column layout | See Section 4.7 |
| **Realtime Color Legend** | View and customize event-to-color mappings | See Part 6 |
| **Sort Dropdown** | Change agent row ordering | See Section 4.6 |
| **Date/Time Picker** | Navigate to historical time periods | See Section 4.8 |

### 4.6 Sorting Options

Four sort methods via dropdown selector:

1. **Sort by Name** (default) -- A-Z alphabetical
2. **Sort by Name (Descending)** -- Z-A
3. **Sort by Extension** -- Numerical ascending (1-10)
4. **Sort by Extension (Descending)** -- Numerical descending (10-1)

### 4.7 Live Column View

An alternative layout toggled via the column view icon:

```
+-----------+-----------+-----------+-----------+-----------+
|   IDLE    |  RINGING  |  TALKING  |   HOLD    |    DND    |
+-----------+-----------+-----------+-----------+-----------+
| [Agent A] | [Agent C] | [Agent B] |           | [Agent F] |
| [Agent D] |           | [Agent E] |           |           |
| [Agent G] |           |           |           |           |
+-----------+-----------+-----------+-----------+-----------+
```

- Each column represents a different event/state
- Agent profile cards appear under their current state column
- As agents change state, their profile card migrates to the new column automatically
- Provides at-a-glance view of workforce distribution across states

### 4.8 Historical Timeline Access

**Short timeframes (same day)**:
- Click-and-drag across the timeline to scroll backward through the day's events
- All events for the current day are preserved and navigable

**Longer timeframes (past days)**:
- Click the timeline time bar to open a calendar/date picker
- Select any previous date and time to view historical timeline data
- A "Play" button returns to current/live time

### 4.9 Filtering

- Filter by specific agents (checkbox selection)
- Only agents with Realtime Agent Seat licenses appear in filter options
- Filter persists until changed

---

## Part 5: Group Timeline -- Complete Specification

### 5.1 Layout Structure

The Group Timeline monitors hunt group queued calls in real-time:

```
+------------------+--------------------------------------------+
| GROUP BOX        |            TIMELINE AREA                   |
| [Group Image]    | +----------------------------------------+ |
| Group Name  v    | | HISTOGRAM (top third)                  | |
|                  | | [bar graph: calls in queue over time]  | |
| Queue: 3         | +----------------------------------------+ |
| Max: 4:32        | | AREA CHART (bottom section)            | |
| Avg: 2:15        | | [avg + max queue times overlaid]       | |
|                  | +----------------------------------------+ |
|--AGENT TABS------|         <-- time axis -->                  |
| [Group Agents]   |                                            |
| [Queued Calls]   |                                            |
+------------------+--------------------------------------------+
```

### 5.2 Group Box (Top-Left)

- **Group dropdown selector**: Choose which hunt group to monitor
- **Group image**: Customizable via right-click > "Change Group Image"
- **Three live metrics**:
  1. Total calls in queue
  2. Maximum call duration in queue
  3. Average call duration in queue

### 5.3 Agent Tabs (Below Group Box)

**Group Agents Tab**:
- Lists all agents in two categories: "Logged In" and "Logged Out"
- Shows status icons per agent
- Shows DND (Do Not Disturb) indicators

**Queued Calls Tab**:
- Displays currently queued calls in real-time
- Calls appear immediately upon arrival
- Calls disappear when answered, sent to voicemail, or disconnected

### 5.4 Timeline Visualization (Main Area)

**Histogram (top third)**:
- Vertical bar representation of calls in queue over time
- Expands dynamically as queue volume increases
- Time axis scrolls left as new data appears on the right

**Area Chart (bottom section)**:
- Average queue time (line/area)
- Maximum queue time (line/area)
- Both values overlaid; when equal, only one line displays

### 5.5 Timeline Controls

- **Click-and-drag**: Navigate backward/forward in time
- **Zoom**: Zoom in/out on time axis
- **Date/Time picker**: Jump to specific historical date/time
- **Play button**: Return to live/current time
- **Auto-scroll**: New data appears on right, scrolls left continuously

---

## Part 6: Color Legend Configuration

### 6.1 Access

- Click the "Realtime Color Legend" icon in the top-left toolbar of Agent Timeline
- Available from within the timeline views

### 6.2 Features

- **Displays**: Complete mapping of every event type to its assigned color
- **Customization**: Click any event color to open a color selector
- **Per-user**: Each user can set personal color preferences
- **Event types covered**: All Cradle-to-Grave events listed in Section 4.4

### 6.3 Default Color Assignments

The documentation does not publish specific hex codes for default colors. However, based on common Chronicall installations and the event types, the standard default palette typically follows telephony conventions:

| Event | Typical Default Color |
|-------|----------------------|
| Idle | Green / Light Green |
| Ringing | Yellow / Orange |
| Talking | Blue / Dark Blue |
| Hold | Red / Dark Red |
| Park | Purple |
| Queue | Orange / Amber |
| DND / Busy | Red / Gray |
| Voicemail | Pink / Magenta |
| Transfer | Light Blue |
| Conference | Teal |
| Dialing | Yellow |
| Auto Attendant | Gray |

**Important**: All colors are user-customizable. The exact defaults should be confirmed during implementation by referencing a live Chronicall instance.

---

## Part 7: Alerts & Triggers System (Wallboard Integration)

### 7.1 Threshold Configuration

- **Comparison operators**: >, >=, <, <=, =
- **Value**: Any numeric threshold
- **Example**: Notify when calls in queue >= 5

### 7.2 Three Alert Levels (Desktop Screen Pop)

| Level | Visual | Trigger |
|-------|--------|---------|
| **Normal** | Gray box | First threshold hit |
| **Warning** | Red box | Second threshold hit |
| **Emergency** | Flashing red/gray | Third threshold hit |

Three separate alerts can be configured for the same metric at different thresholds.

### 7.3 Notification Methods

1. **Desktop Screen Pop**: Sent to agents with Realtime licenses via Chronicall Desktop app
2. **Email**: Multiple addresses (comma-separated), customizable subject and body
3. **Text Message**: Via cell provider gateways (AT&T, Verizon, etc.), uses email gateway addresses

### 7.4 Trigger Types

1. **Standard Triggers** -- basic threshold-based
2. **Custom Daily Triggers** -- time-specific daily thresholds
3. **Realtime Triggers** -- continuous metric monitoring

---

## Part 8: WebSocket API (Technical Integration Layer)

### 8.1 Connection

```
ws://{ChronicallServerPath}/rest/api/v1/realtime-metric-subscription?id={MetricId}&auth_token={AuthenticationKey}
```

- Persistent WebSocket connection -- no polling
- Requires Chronicall version 4.0.9+
- Authentication via Service User API key

### 8.2 Multiple Subscriptions

Single connection supports multiple metric IDs:
```
?id={MetricId_1}&id={MetricId_2}&id={MetricId_3}&auth_token={key}
```

### 8.3 Message Format (Server Push)

```json
{
  "key": {
    "metricId": "K0FLAEB6",
    "categoryValue": "John Doe(481)"
  },
  "value": {
    "lastUpdateTime": "2019-10-01T10:17:56.496-06:00",
    "count": 15,
    "type": "COUNT"
  }
}
```

**Fields**:
- `key.metricId`: The subscription metric identifier
- `key.categoryValue`: Agent/group/entity the value applies to
- `value.lastUpdateTime`: ISO 8601 timestamp of last update
- `value.count`: The metric value (numeric)
- `value.type`: Value type indicator (COUNT, DURATION, etc.)

### 8.4 Error Codes

| Code | Meaning |
|------|---------|
| 400 | Malformed or missing query parameters |
| 401 | Invalid authentication key |
| 403 | Metrics don't exist or aren't assigned to authenticated user |

### 8.5 Setup Requirements

1. Create a Service User in User Management > User Accounts
2. Retrieve API key from API Enablement > Service Users
3. Configure metric access in API Enablement > Realtime Metric Access
4. Assign metric name, category, specific metric, and service account
5. Record generated Metric ID string for WebSocket subscription

---

## Part 9: Implementation Priority Matrix

### Must-Have for MVP (Core Wallboard)

1. **Title Value Widget** -- most used, simplest
2. **Active Calls Widget** -- essential for call centers
3. **Group Box Widget** -- queue monitoring fundamental
4. **Agent Box Widget** -- agent status cards
5. **Leaderboard Widget** -- competitive ranking
6. **Chart Widget** -- data visualization (start with bar + line)
7. **Since/Last/Now time frames** -- all three required
8. **All calculation types** -- Count, Max, Min, Avg, Median, State, True/False
9. **WebSocket push updates** -- no polling

### Must-Have for MVP (Agent Timeline)

1. **Horizontal timeline with colored bars** -- core visualization
2. **Agent profile cards** -- name, extension, state, caller ID, group status
3. **Hover tooltips** -- event type, direction, duration, group, caller ID
4. **Color Legend** -- customizable event-to-color mapping
5. **Four sort options** -- name/extension, ascending/descending
6. **Agent filtering** -- checkbox selection
7. **Live Column View** -- state-column layout toggle
8. **Historical navigation** -- drag to scroll, date picker for past days

### Must-Have for MVP (Group Timeline)

1. **Group Box with three metrics** -- queue count, max duration, avg duration
2. **Histogram** -- calls in queue over time
3. **Area chart** -- avg/max queue times overlaid
4. **Agent tabs** -- logged in/out with DND indicators
5. **Queued Calls tab** -- live queue display
6. **Timeline navigation** -- drag, zoom, date picker, play button

### Phase 2 Enhancements

1. Gauge Widget
2. Pie Chart Widget
3. Marquee Widget
4. Web Page Widget
5. Widget Group containers
6. Image Widget
7. Decorative widgets (Box, Ellipse, Line)
8. Custom Formula builder
9. Alerts & Triggers with three severity levels
10. Email/SMS notifications
11. Pre-built template gallery

---

## Appendix A: Key Differences -- HTML vs. Java Versions

| Aspect | HTML Version | Java Version |
|--------|-------------|-------------|
| Widget panel | Right side of screen | Top bar |
| Value folders | Flat metric list | Four folders (Count, Duration, Misc, Formula) |
| Deployment | Browser-based | Requires Java runtime |
| Widget types | 14 types (includes Widget Group) | Similar set, slightly different organization |
| Metric search | Alphabetical + type-to-filter | Folder-based navigation |

The HTML version is the current/modern version; Java is legacy. Our implementation should follow the HTML version's UX patterns while improving on them.

---

## Appendix B: Licensing Model Reference

| License | Unlocks |
|---------|---------|
| **Realtime** | Wallboard builder, Agent Timeline, Group Timeline, all base metrics |
| **Realtime Agent Seat** | Per-agent: makes agent visible in Timeline, filterable in widgets |
| **Agent Dashboards** | Account Code metrics, reason codes in Agent State |
| **Contact Center (Multimedia)** | Chat metrics, Multimedia ACW/MCW, Queue Callbacks, Queue Offer events |
| **Web Chat** | Chat Count/Duration/State, Chats Answered/Missed |
| **Queue Callback** | Accepted Callback Count, Callbacks Scheduled |

---

*Document compiled from Xima Software Chronicall Guide (guide.ximasoftware.com) and supplementary research. All specifications reflect Chronicall v4.x HTML version unless noted.*
