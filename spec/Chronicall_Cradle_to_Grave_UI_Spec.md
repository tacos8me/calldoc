# Chronicall Cradle-to-Grave: Complete UI Replication Specification
## Deep Research from Xima Software Official Documentation

---

## 1. Overall Interface Architecture

### Layout Structure
The Cradle-to-Grave (C2G) view is a **full-page tabular interface** accessed via a dedicated "Cradle to Grave" tab in the top-left corner of the Chronicall home page. The workflow is:

1. **Click "Cradle to Grave" tab** -> Opens **Configuration Window** (date range + filter selection)
2. **Select timeframe** -> Day/week/month or custom. An "Advanced" option allows specific times of day, shifts, and particular days
3. **Optionally add filters** -> Three-tier filter system (General, Event-level, Call-level)
4. **Click "Apply"** -> Populates the main data grid with matching calls sorted chronologically

From v4.4.1+, the filter window auto-populates calls/chats, agents, and skill fields as defaults.

### Main Grid View
- **Paginated/scrollable table** of call records, one row per call
- **Customizable columns** -- users can add, remove, reorder, and resize columns
- **Sortable** -- click column headers to sort ascending/descending
- **Quick Search** -- magnifying glass icon allows searching by Call ID or other criteria
- **Expandable rows** -- click any row to expand and reveal the full event timeline for that call

### Key UI Elements
- **Configuration/Filter button** at top to re-open the filter panel
- **"+" (plus) button** next to "Criteria" to add filter conditions
- **Ellipsis icon (...)** next to each row for context menu actions (e.g., "View Chat" for web chats, score a call, add notes)
- **Column header area** -- right-click or gear icon to manage column visibility/order
- **"C2G Notes" column** -- clickable to add notes directly inline

---

## 2. Exact Column List

### Default Columns (shown on first launch)
| Column | Data Type | Description |
|--------|-----------|-------------|
| **Call ID** | String | Unique identifier assigned by Chronicall's database |
| **Call Direction** | Enum | Inbound, Outbound, Internal, or Intersite |
| **Start Time** | DateTime | When the call began (format: "Oct 7, 2019 3:11:26 pm" or configurable) |
| **End Time** | DateTime | When the call ended |
| **Call Duration** | Duration | Total elapsed time start-to-end |
| **Calling Party** | String | Phone number/name of the originator |
| **Receiving Party** | String | Phone number/name of the receiver |
| **External Party** | String | External phone number involved |
| **Internal Party** | String | Internal extension involved |
| **Dialed Number** | String | The actual number dialed (DNIS) |
| **Is Answered** | Boolean | Checkmark if call had a talking event |
| **Is Recorded** | Boolean | Checkmark if recording exists |

### Available Hidden Fields (can be added to the grid)
| Column | Data Type | Description |
|--------|-----------|-------------|
| **Call Key** | Composite | Start/end times + Call ID (for API use) |
| **Calling Agent** | String | First agent who dialed (outbound/internal) |
| **Receiving Agent** | String | First agent who was a receiving party |
| **Initial Agent** | String | First agent who participated in the call |
| **Final Agent** | String | Last agent associated with the call |
| **Initial Group** | String | First hunt group involved |
| **Final Group** | String | Last hunt group involved |
| **Caller ID** | String | Name associated with inbound caller by the phone system |
| **Calling Party Number** | String | Caller's extension or external number |
| **Dialed Party Number** | String | First number dialed (DNIS) |
| **Talking Duration** | Duration | Total/max/min/avg of all talking events |
| **Hold Duration** | Duration | Total/max/min/avg of all hold events |
| **Ringing Duration** | Duration | Total/max/min/avg of all ringing events |
| **Queue Duration** | Duration | Total/max/min/avg of all queue events |
| **Dialing Duration** | Duration | Total dialing event time |
| **Auto Attendant Duration** | Duration | Total/max/min/avg of AA events |
| **Park Duration** | Duration | Total/max/min/avg of park events |
| **Transfer Hold Duration** | Duration | Total/max/min/avg of transfer hold events |
| **Voicemail Duration** | Duration | Duration of voicemail event |
| **Agent Speed of Answer** | Duration | Time agent took to answer (ringing to pickup) |
| **Group Speed of Answer** | Duration | Time for group agents to answer (includes ringing + queue before first talk) |
| **Time to Answer** | Duration | Time between call reaching phone system and first talking event |
| **Event Count** | Integer | Total number of events in the call |
| **Final Event** | String | Last event type (excluding drop events) |
| **Is Unanswered** | Boolean | Checkmark if no talking event occurred |
| **Is Abandoned** | Boolean | Checkmark if call ended in non-talking/non-voicemail event |
| **In Conference** | Boolean | Checkmark if conference occurred |
| **Account Code** | String | Cost allocation code (requires Agent Dashboards license) |
| **Initial Tag** | String | First IP Office tag on an event |
| **Final Tag** | String | Last IP Office tag |
| **Is Recorded** | Boolean | Recording exists (requires Recording Library) |
| **Recording Listen Link** | Hyperlink | Clickable link to play recording inline |
| **Recording Details** | JSON | Full recording metadata JSON |
| **Recording Hash Value** | String | MD5 hash for recording authenticity |
| **Question Score** | Numeric | Scorecard question score |
| **Expanded Question Score** | Composite | All campaign scorecard questions in separate columns |
| **Composite Score** | Numeric | Combined average for all question scores |
| **Scorecards Scored** | Integer | Count of scored scorecards |
| **Call Cost** | Currency | Total call cost (requires Call Cost Profile) |
| **Call Event Cost** | Currency | Cost based on selected event duration |
| **Rate Label** | String | Rate category ("Local", etc.) |
| **Rate per Minute** | Currency | Rate per minute based on cost profile |
| **U.S. State** | String | State from external party's area code |
| **U.S. City** | String | City from external party's area code |
| **U.S. City, State** | String | Combined city/state |
| **Trunks Used on Call** | String | Trunk(s) utilized |
| **System ID** | String | Phone system identifier (for SCN configs) |
| **Note Author** | String | Agent who left a note |
| **Note Creation Time** | DateTime | When the note was added |
| **Note Text** | String | Content of the note |
| **C2G Notes** | Interactive | Clickable column to add/edit notes |
| **Includes Event Sequence** | Boolean | Checkmark if call matches a defined event sequence |
| **Finalized Event Count** | Integer | Count of completed events matching criteria |
| **QCB Port Not Available Time** | Duration | Queue Callback port unavailability time |

### Column Management
- **Add columns**: Right-click column header area or use settings to add from available metrics
- **Remove columns**: Right-click column > remove, or via settings panel
- **Reorder columns**: Drag-and-drop column headers to rearrange
- **Resize columns**: Drag column border to resize width
- **Sort**: Click column header for ascending, click again for descending
- **Duration fields** support configuration for: Total, Maximum, Minimum, or Average aggregation
- **DateTime fields** support configurable display format

---

## 3. Expandable Event Timeline (Row Expansion)

### Trigger
Click any call row to expand it. The expanded section appears below the row, pushing subsequent rows down.

### Expanded View Contents
When expanded, each call shows its **complete event sequence** from beginning to end:

#### Event Types Displayed
| Event | Description | Visual Representation |
|-------|-------------|----------------------|
| **Auto Attendant** | Initial IVR/greeting event on inbound calls | Colored bar segment |
| **Busy** | Agent not logged in, voicemail disabled | Colored bar segment |
| **Calling Drop** | Caller hung up first | End marker |
| **Conference** | 3+ parties talking together (expandable to show internal talking events) | Colored bar segment |
| **Consolidated** | Too many events for display (system issue indicator) | Special marker |
| **Dialing** | Agent dialing outbound/internal number | Colored bar segment |
| **Hold** | Caller placed on hold (only initiating agent can retrieve) | Colored bar segment |
| **Listen** | Supervisor live-listening to a call | Colored bar segment |
| **Overflow** | Call redirected to another hunt group due to unavailability | Colored bar segment |
| **Park** | Like hold, but any agent in the group can retrieve | Colored bar segment |
| **Queue** | Caller waiting in hunt group queue | Colored bar segment |
| **Receiving Drop** | Agent/receiver hung up first | End marker |
| **Ringing** | Agent's phone ringing | Colored bar segment |
| **Talking** | Active conversation with external party or another agent | Colored bar segment |
| **Transfer** | Transfer completed from one agent to another | Colored bar segment |
| **Transfer Hold** | Hold event during an active transfer process | Colored bar segment |
| **Voicemail** | Caller in voicemail box | Colored bar segment |
| **Voicemail Collect** | Agent collecting voicemail (Cisco only) | Colored bar segment |
| **Voicemail Leave** | Agent leaving voicemail (Cisco only) | Colored bar segment |

#### Contact Center Events (with Contact Center license)
| Event | Description |
|-------|-------------|
| **Callback Abort** | Callback reached max retry attempts |
| **Callback Accepted** | Recipient accepted the callback |
| **Callback Attempt** | System attempted a callback |
| **Callback Audio** | Recipient back in queue waiting for agent |
| **Callback Cancelled** | Recipient cancelled the callback |
| **Callback Missed** | Recipient didn't answer callback |
| **Callback Offer** | Callback ringing to an agent |
| **Callback Prompt** | Recipient answered, hearing options |
| **Callback Scheduled** | Caller confirmed callback number |
| **Callback Snoozed** | Recipient snoozed the callback |
| **Queue Audio** | Queue music/announcements playing while caller waits |
| **Queue Callback Port Acquired** | Callback port became available |
| **Queue Callback Port Not Available** | Insufficient callback ports |
| **Queue Callback Entry** | Caller pressed key to schedule callback |
| **Queue Offer** | Call offered/ringing to available agent in skill group |

### Event Timeline Visualization
Each event is rendered as a **horizontal colored bar segment** proportional to its duration. The bars are laid out left-to-right chronologically, forming a continuous timeline of the call's life.

Each event segment shows:
- **Event type** (via color coding)
- **Duration** of that specific event
- **Agent/extension** involved in that event
- **Hunt group** (if applicable)
- **External party** (caller ID, phone number)

### Conference Call Display
Internal conferences involving 2+ agents appear on **multiple rows** in the grid (one row per agent's perspective). When expanded, the Conference event is itself expandable to reveal the internal talking events between participants.

---

## 4. Color Coding Scheme

### Color System
Chronicall uses a **customizable color legend** where each event type is assigned a distinct color. The system ships with default colors but allows full personalization.

### How Colors Work
- Each event type has a **dedicated color** in the Realtime Color Legend
- Colors are consistent across: Agent Timeline, Group Timeline, and Cradle-to-Grave event expansion
- The **Realtime Color Legend** is accessible via an icon in the top-left corner
- Colors can be changed per-user: click the color swatch in the legend -> color picker appears -> select new color -> click "OK"
- Changes take effect immediately across all views

### Default Color Assignments (Standard Convention)
Based on the Agent Timeline documentation and typical Chronicall deployments:

| Event Type | Typical Default Color | Hex (approximate) |
|------------|----------------------|-------------------|
| **Ringing** | Orange | `#FF8C00` |
| **Talking** | Green | `#4CAF50` |
| **Hold** | Red | `#F44336` |
| **Queue** | Yellow/Amber | `#FFC107` |
| **Transfer** | Blue | `#2196F3` |
| **Transfer Hold** | Light Red/Pink | `#E91E63` |
| **Dialing** | Light Blue | `#03A9F4` |
| **Voicemail** | Purple | `#9C27B0` |
| **Auto Attendant** | Teal | `#009688` |
| **Park** | Brown/Tan | `#795548` |
| **Conference** | Dark Blue | `#3F51B5` |
| **Idle/Available** | Light Green | `#8BC34A` |
| **DND** | Dark Red | `#B71C1C` |
| **ACW (After Call Work)** | Purple/Violet | `#7B1FA2` |
| **Overflow** | Gray | `#9E9E9E` |
| **Busy** | Red/Dark | `#D32F2F` |

> **Note**: Exact default hex values are not published in official docs. The system is designed to be user-customizable. The above are based on common observed deployments and the project roadmap's own color assignments. Our implementation should ship with sensible defaults and allow customization.

### Hover/Tooltip Behavior
When hovering over any colored bar segment in the timeline:
- **Event type name** (e.g., "Talking", "Hold", "Queue")
- **Call Direction** of the overall call
- **Event Duration** (formatted as HH:MM:SS)
- **Associated Group** (hunt group name if applicable)
- **Caller ID** (name and/or number)
- **Agent/Extension** handling this event segment

---

## 5. Filtering System (Complete)

### Three-Tier Filter Architecture

**Tier 1 - General Criteria** (broadest scope):
- Select Agents and/or Groups to include
- Toggle between Calls and/or Chats (chats require Web Chat license)
- v4.4.1+ auto-populates calls/chats, agents, and skill fields

**Tier 2 - Event Level** (basic/common filters):
- Filter by specific agents or groups
- Filter by event types: Ringing, Queue, Talking, Hold, Transfer

**Tier 3 - Call Level** (advanced filters):
- Call direction, duration, event duration
- Specific phone numbers (external party)
- Call status (answered, abandoned, recorded, etc.)

### AND/OR Logic

- **Between filter categories**: AND logic (all criteria must match)
- **Within multi-select filters**: OR logic (any selected option matches)
- **Exclusion filters** ("Does Not Equal", "Does Not Contain"): Negative AND logic

Specific OR-logic filters:
- Account Codes Contain (any selected code matches)
- Call Includes Any Event (any selected event matches)
- Agent selection (any selected agent matches)
- Group selection (any selected group matches)
- Event Type multi-select (any selected type matches)

### Complete Filter Catalog (80+ filters)

#### Account Code Filters
| Filter | Logic | Description |
|--------|-------|-------------|
| Account Codes Contain | OR | Calls tagged with any selected account code |
| Account Codes Contain All | AND | Calls tagged with all selected account codes |
| Account Codes Do Not Contain | Exclude | Excludes calls with any selected account codes |

#### Agent Filters
| Filter | Logic | Description |
|--------|-------|-------------|
| Agent | OR | Calls associated with any selected agent |
| Agent Does Not Equal | Exclude | Excludes calls with selected agents |
| Agent Speed of Answer | Range | Time agent took to answer (ringing to pickup) |
| Initial Agent | Match | First agent on the call |
| Initial Agent Does Not Equal | Exclude | Excludes calls where agent was first |
| Final Agent | Match | Last agent on the call |
| Final Agent Does Not Equal | Exclude | Excludes calls where agent was last |
| Calling Agent | Match | Agent who initiated the call |
| Receiving Agent | Match | Agent who received the call |

#### Call Direction & Type
| Filter | Logic | Description |
|--------|-------|-------------|
| Call Direction | OR | Inbound / Outbound / Internal / Intersite |
| Call Direction Does Not Equal | Exclude | Excludes selected directions |
| Calls / Chats | Toggle | Show calls only or chats only |

#### Duration & Timing
| Filter | Logic | Description |
|--------|-------|-------------|
| Call Duration | Range | Total call length with inequality/range operators |
| Time to Answer | Range | Duration from call creation to first answer |
| Agent Speed of Answer | Range | Agent-specific answer time |
| Group Speed of Answer | Range | Group ringing/queue duration before first talk |
| Event Duration | Range | Individual event duration |
| Individual Event Duration | Range | Single specific event duration comparison |

**Range Operator Syntax**:
- `[a..b]` = inclusive both ends (a <= x <= b)
- `(a..b)` = exclusive both ends (a < x < b)
- `[a..b)` = inclusive start, exclusive end
- `(a..b]` = exclusive start, inclusive end

#### Event Filters
| Filter | Logic | Description |
|--------|-------|-------------|
| Call Includes Any Event | OR | Calls with any of the selected event types |
| Call Includes All Events | AND | Calls with all of the selected event types |
| Call Does Not Include Event | Exclude | Excludes calls with any selected events |
| Call Does Not Include All Events | Exclude | Excludes calls with all selected events |
| Event Type | OR | Filter by: Auto Attendant, Conference, Dialing, Hold, Park, Overflow, Queue, Ringing, Talking, Transfer, Transfer Hold, Voicemail |
| Event Type Does Not Equal | Exclude | Excludes selected event types |
| Final Event | Match | Calls ending with specified event type |
| Final Event Does Not Equal | Exclude | Excludes calls ending with specified event |
| Event Sequence Matches | Ordered | Calls where specified events appear in order (other events may exist between them) |
| Event Sequence Does Not Match | Exclude | Excludes calls with specified event sequence |
| Total Event Count | Range | Filter by total number of events per call |

#### Party Filters
| Filter | Logic | Description |
|--------|-------|-------------|
| Call Includes Calling Party | Match | Calls from specified number/name |
| Call Does Not Include Calling Party | Exclude | Excludes calls from specified number/name |
| Calling Party Number | Match | Filter by caller's phone number (inbound only) |
| Call Includes External Party | Match/Contains | Calls involving specified external number (enter digits only, no symbols) |
| Call Does Not Include External Party | Exclude | Excludes calls with specified external party |
| Call Includes Receiving Party | Match | Calls with specified receiving agent |
| Call Does Not Include Receiving Party | Exclude | Excludes calls with specified receiving agent |
| Call Includes Local Party | Match | Calls involving specified agent (answered, transferred, or missed) |
| Call Does Not Include Local Party | Exclude | Excludes calls involving specified agent |

#### Group & Skill Filters
| Filter | Logic | Description |
|--------|-------|-------------|
| Group | OR | Calls with events in selected groups |
| Group Does Not Equal | Exclude | Excludes calls in selected groups |
| Call Includes Group | Match | Calls with group events |
| Call Does Not Include Group | Exclude | Excludes calls with group events |
| Initial Group | Match | First group interaction |
| Initial Group Does Not Equal | Exclude | Excludes calls starting with specified group |
| Final Group | Match | Last group interaction |
| Final Group Does Not Equal | Exclude | Excludes calls ending with specified group |
| Group Speed of Answer | Range | Group answer time filter |

#### Call Identification
| Filter | Logic | Description |
|--------|-------|-------------|
| Call ID Equals | Exact | Specific call by exact ID |
| Call ID Range | Range | Calls between specified ID range |
| Caller ID | Match | Filter by caller ID name/business/city-state |
| Dialed Party Number | Match | Filter by DNIS (number caller dialed) |

#### Call Status
| Filter | Logic | Description |
|--------|-------|-------------|
| Is Call Answered | Boolean | true = has talking event |
| Is Call Abandoned | Boolean | true = final event is NOT talking or voicemail |
| Is Call Conferenced | Boolean | true = multiple agents involved |
| Is Call Recorded | Boolean | true = recording exists |
| Call Has Note | Boolean | Calls with notes attached |
| Call Has Survey | Boolean | Calls with post-call survey (IP Office only) |

#### Scorecard & Campaign
| Filter | Logic | Description |
|--------|-------|-------------|
| Is Call Part of Campaign | Boolean | Associated with scorecard campaign |
| Is Call Scored | Boolean | Has been scored |
| Is Call Scored in Campaign | Boolean | Scored in specific campaign |
| Is Call Unscored in Campaign | Boolean | Unscored in specific campaign |
| Scorecard Campaign Name | Match | Filter by specific campaign name |

#### Notes & Comments
| Filter | Logic | Description |
|--------|-------|-------------|
| Note Authored By | Match | Notes written by specified agent(s) |
| Note Contains Text | Search | Notes containing specified text string |

#### Time-Based
| Filter | Logic | Description |
|--------|-------|-------------|
| Time of Day | Range | Calls during specified hours (default: 24hr) |
| Days of Week | OR | Calls from selected days only |
| Time Intervals | Match | Day of week, day of month, or month matching |
| Shift | Match | Calls from agents/groups in specified shift |

#### System & Infrastructure
| Filter | Logic | Description |
|--------|-------|-------------|
| Trunk | Match | Filter by trunk/channel used |
| System ID | Match | Calls with specified system ID (SCN configs) |
| System ID Does Not Equal | Exclude | Excludes calls with specified system ID |
| State/Province | Match | Geographic filter based on first 6 digits of phone number |

#### Tag Filters
| Filter | Logic | Description |
|--------|-------|-------------|
| Call Includes Tag | Match | Calls with specified IP Office tags |
| Call Does Not Include Tag | Exclude | Excludes calls with specified tags |
| Tag | Match | Calls with specified tag |

#### Role & Cost
| Filter | Logic | Description |
|--------|-------|-------------|
| Role | Match | Calls from users in specified Chronicall role |
| Rate Label | Match | Calls matching specified rate label |

#### Post-Filter Criteria (applied after initial filtering)
| Filter | Logic | Description |
|--------|-------|-------------|
| Filtered Call Includes All Events | AND | Post-filter: all specified events present |
| Filtered Call Includes Any Events | OR | Post-filter: any specified event present |
| Filtered Call Does Not Include All Events | Exclude | Post-filter: excludes if all events present |
| Filtered Call Does Not Include Any Events | Exclude | Post-filter: excludes if any event present |

### Filter Execution Order
1. **Call-level filtering** (agent, direction, call ID, status)
2. **Event-level filtering** (event type, duration)
3. **Filtered-level criteria** (applied to already-filtered results)

### Saving Filters
- Users can save frequently-used filter combinations as named presets
- Saved via "Cradle to Grave - Saving Filters" functionality
- Process: Navigate to Reports > Cradle to Grave > click "+" next to Criteria > configure filters > save
- Saved filters persist per-user and can be reloaded quickly

---

## 6. Export Functionality

### Supported Export Formats
| Format | Extension | Use Case |
|--------|-----------|----------|
| Adobe PDF | .pdf | Print-ready reports, email distribution |
| Microsoft Excel | .xls/.xlsx | Spreadsheet analysis |
| CSV | .csv | Data import, further analysis |
| OpenDocument | .odt | Open-source office suites |
| HTML | .html | Browser viewing (IE/Firefox/Chrome) |

### Export Methods

**Method 1 - Direct Export from Cradle-to-Grave**:
- Tabular data can be exported directly to a spreadsheet program
- Respects current filter/sort state (exports what you see)

**Method 2 - From Standard Reports Menu**:
1. Open "Run Reports" from the Reports section
2. Right-click on desired report(s)
3. Select "Export Report(s)"
4. Choose save location
5. Hold Ctrl to select multiple reports for batch export

**Method 3 - Import/Export Reports**:
1. Access "Import/Export Report" in the Reports section
2. Select desired reports
3. Right-click -> "Export Report(s)" or use "Add Report" button
4. Click "Export" and select save location
5. Exported reports can be shared with other Chronicall instances

### Automated Export (Report Scheduler)
- Schedule reports to run automatically: hourly, daily, weekly, or monthly
- Delivery: email recipients (SMTP) or save to file path
- Format: PDF or CSV
- Includes: Report Scheduler management UI for scheduling, monitoring last/next run, success/failure logs

---

## 7. UI Interaction Patterns

### Click Interactions
| Action | Result |
|--------|--------|
| Click column header | Sort ascending; click again for descending |
| Click call row | Expand to show full event timeline |
| Click expanded row again | Collapse the event timeline |
| Click "+" next to Criteria | Open filter addition dropdown |
| Click "Apply" button | Execute filters and refresh data grid |
| Click magnifying glass icon | Open Quick Search (search by Call ID) |
| Click ellipsis (...) icon | Context menu: View Chat, Add Note, Score Call |
| Click "C2G Notes" column cell | Inline note editing for that call |
| Click Recording Listen Link | Play recording in inline audio player |
| Click color in legend | Open color picker for customization |

### Drag Interactions
| Action | Result |
|--------|--------|
| Drag column header | Reorder columns |
| Drag column border | Resize column width |
| Click-and-drag on timeline (Agent Timeline) | Scroll through time (recent same-day) |

### Hover/Tooltip Interactions
| Element | Tooltip Content |
|---------|----------------|
| Event bar segment | Event type, call direction, event duration, associated group, caller ID |
| Column header | Full column name (if truncated) |
| Boolean checkmark cells | Field name and value |

### Keyboard Interactions
- Standard browser text selection in cells
- Ctrl+Click for multi-select in filter dropdowns
- Tab navigation through filter fields

### Phone Number Search Pattern
1. Open Cradle-to-Grave configuration
2. Select timeframe
3. In filters, choose "Call Includes External Party"
4. Select "Contains" operator
5. Enter phone number as **plain digits only** (no parentheses, spaces, dashes)
6. Click Apply

### Chat Viewing (v4.4.1+)
1. Click ellipsis icon (...) next to a chat entry
2. Select "View Chat"
3. Chat displays as the Contact Center agent would see it
4. Full chat conversation visible with customer details
5. Users can add notes and account codes to chats

### Cross-Reference Pattern
- Copy a Call ID from any report
- Navigate to Cradle-to-Grave for the same timeframe
- Paste Call ID in the Quick Search tool
- System navigates directly to that call

---

## 8. Summary Metrics Bar

At the top of the grid, Chronicall displays **summary statistics** showing:
- Total and average statistics across all listed/filtered calls
- Aggregate insights alongside individual call details
- Summary updates when filters are applied

---

## 9. Implementation Recommendations for Our Replication

### Critical Features to Match
1. **Three-tier filter architecture** with AND/OR logic
2. **Expandable row event timeline** with proportional colored bars
3. **80+ filter types** organized by category
4. **Customizable column layout** with show/hide/reorder
5. **Quick Search** by Call ID
6. **Inline note editing** via C2G Notes column
7. **Recording playback** integration
8. **Multi-format export** (CSV, PDF, Excel at minimum)
9. **Saved filter presets** per user
10. **Summary statistics bar** above the data grid

### Color System
- Ship with sensible defaults matching the roadmap's palette
- Provide a color legend component with live preview
- Allow per-user color customization stored in user preferences
- Use the same palette across Agent Timeline, Group Timeline, and C2G event expansion

### Filter UI Design
- Collapsible filter panel (sidebar or header)
- Category-organized filter selection
- Visual indicators for active filters (badges/chips)
- Clear "Reset Filters" action
- Filter preset save/load functionality

### Event Timeline Design
- Horizontal bar chart within the expanded row
- Each segment proportional to event duration relative to total call duration
- Color-coded by event type
- Hover tooltip with: event type, duration, agent, group, caller ID
- Click segment for additional detail (optional enhancement)

---

## Sources

- [Cradle to Grave Overview](https://guide.ximasoftware.com/docs/cradle-to-grave)
- [Cradle to Grave Quick Start Guide](https://guide.ximasoftware.com/docs/cradle-to-grave-quick-start-guide-1)
- [Call Details Report](https://guide.ximasoftware.com/docs/call-details)
- [Cradle to Grave Filter Definitions](https://guide.ximasoftware.com/docs/cradle-to-grave-filter-definitions)
- [Cradle to Grave Event Definitions](https://guide.ximasoftware.com/docs/cradle-to-grave-event-definitions)
- [Call Report Value Definitions](https://guide.ximasoftware.com/docs/call-report-value-definitions)
- [Agent Timeline](https://guide.ximasoftware.com/docs/agent-timeline)
- [Event Sequence Calls by Agent](https://guide.ximasoftware.com/docs/event-sequence-calls-by-agent)
- [How to Export a Report](https://guide.ximasoftware.com/docs/how-to-export-a-report)
- [Saving Filters](https://guide.ximasoftware.com/docs/cradle-to-grave-saving-filters)
- [Phone Number Search](https://guide.ximasoftware.com/docs/search-for-a-specific-phone-number)
- [Conference Calls](https://guide.ximasoftware.com/docs/conference-calls)
- [Xima Cloud Cradle to Grave](https://guide.xima.cloud/docs/cradle-to-grave)
- [Xima Cloud Call Details](https://guide.xima.cloud/docs/call-details)
