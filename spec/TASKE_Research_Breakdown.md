# TASKE Technology - Comprehensive Product Research
## Contact Center Management & Reporting Software (taske.com)

---

## 1. COMPANY OVERVIEW

- **Founded**: 1989 (35+ years in business)
- **Installations**: 7,500+ customers across 15+ countries
- **Agents Covered**: 500,000+
- **Primary Market**: Small to mid-sized contact centers
- **Industries Served**: Legal, real estate, accounting, healthcare, banking, and other service-oriented industries
- **Headquarters**: Canada-based
- **Starting Price**: ~$7,500/year

---

## 2. PRODUCT SUITE & ARCHITECTURE

### Product Tiers (Hierarchical)

| Product | Base Features | Add-ons Available |
|---------|--------------|-------------------|
| **TASKE Contact** (Full) | Real-Time Monitoring, Historical Reports, Visualizer, Replay, Lex Bot Monitoring | Desktop Dashboard, DisplayCentral, Call Recording, Workforce Management |
| **TASKE Essential** (Mid) | Real-Time Monitoring, Historical Reports, Visualizer | Call Recording, Workforce Management |
| **TASKE Visualizer** (Entry) | Visualizer only | Desktop Dashboard, DisplayCentral, Call Recording |

### Platform-Specific Variants
- **TASKE Contact for Amazon Connect** (cloud-native, SaaS via AWS Marketplace)
- **TASKE Contact for Avaya** (on-premise, Avaya DevConnect partner)
- **TASKE Contact for Cisco** (on-premise, Cisco Select Developer Partner)
- **TASKE Cloud** (migration/implementation services)

### Technical Architecture
- **Server**: Windows server or virtual machine
- **Connection**: CTI (Computer Telephony Interface) or network link to telephone system
- **Client Access**: Web browser (Chrome, Edge, Firefox - HTML5)
- **Desktop Client**: Java-based desktop application (bundled with Microsoft build of OpenJDK)
- **Database**: Server-based (supports backup and migration)
- **File Paths**:
  - Application: `C:\Program Files (x86)\TASKE Technology Inc`
  - Data: `C:\ProgramData\TASKE Technology Inc`
  - Web apps: `C:\inetpub\wwwroot`
- **Framework**: .NET 8.0 (as of 2025 release), OpenSSL v3

---

## 3. CORE MODULES & FEATURES

### 3.1 Real-Time Monitoring (Web Portal)

**Purpose**: Second-by-second live view of contact center operations.

**Dashboard Features**:
- Customizable dashboard with data tables and charts
- Group-level summary view with drill-down to individual agent
- Dockable dashboard view (minimizes screen real estate usage)
- KPI display with threshold alerts (visual and audible)
- Service level target monitoring against configured thresholds

**Metrics Displayed in Real-Time**:
- Call volumes (inbound, outbound, internal)
- Queue sizes and wait times
- Longest waiting call
- Agent states (idle, on phone, available, unavailable)
- Agent talk time / duration comparisons
- Caller/participant information for active interactions
- Live chat and chatbot interaction counts
- Customer geographic origin
- Abandonment rates
- Service level percentages (TSF, ASF)
- Most frequently used contact center paths

**Views Available**:
- Group-level summaries
- Individual agent detail
- Real-time operational status
- Historical performance review (data tables and charts)
- Contact flow journey visualization

**Alert System**:
- Configurable performance targets per metric
- Threshold-based alerts (audible + visual)
- Notifications when KPIs fall below service objectives
- Alarms for specific events (e.g., longest wait exceeds threshold)

---

### 3.2 TASKE Desktop (Native Application)

**Purpose**: Desktop application giving agents and supervisors real-time and historical data on their personal computers.

**Key UI Components**:
- Dockable dashboard panel (KPI bar)
- Real-time queue depth indicator
- Agent status views
- Performance metric comparisons between resources
- Customizable layout (lockable for agents, passkey-protected for supervisors)

**Rules Engine**:
- Configure automated actions based on contact center behavior/events
- Notification programming for specific events:
  - Agent login/logout
  - Threshold breaches (e.g., average talk time exceeds limit)
  - Queue depth exceeds threshold
  - Specific caller events
- Automated action triggers:
  - Send alerts
  - Pass data to external applications (phone numbers, wait times)
  - Open CRM database when agent answers call
  - Pop-up notifications

**Skill Management** (optional module):
- Supervisors manage agent skill assignments on the fly
- Skill assignment cloning (Avaya)
- Skill changes configured via Administration Console

**Dark Mode**: Added in 2025 release with additional theme options.

---

### 3.3 Agent Assist (Desktop Add-on Module)

**Purpose**: Call coding and logging tool - pops a dialog whenever an agent answers an incoming call.

**Features**:
- Automatic popup dialog on call answer
- Up to 10 configurable information levels
- Levels can be interdependent or independent
- Entry can terminate after specific selections
- Supports: select lists, text fields, free-form comment fields
- Queue-specific call codes (e.g., Sales vs. Support have different code trees)

**Reports Generated by Agent Assist**:
- **Agent Compliance Reports**: Which agents are coding calls, compliance rates
- **Call Volume Reports**: Call counts per code combination, duration
- **Detailed Code Reports**: Caller ANI, duration, agent comments per code

---

### 3.4 TASKE Visualizer / Contact Flow Visualizer (Cradle-to-Grave)

**Purpose**: Browser-based advanced search and drill-down tool for individual call/contact analysis.

**Search/Filter Criteria**:
- Date and time ranges
- Call types and activity categories
- Call information: telephone numbers (ANI), account codes
- Resource participation: agents, extensions, queues, trunks
- Answering extension (added 2023)
- Sentiment-based filtering (Amazon Connect)

**Call Detail Display (Cradle-to-Grave View)**:
- Visual timeline of every event in the lifecycle of a call/contact
- Hold times and duration
- Number of transfers and transfer details
- Agent participation and duration of involvement
- Customer wait times before agent assistance
- Who terminated the call/chat
- Conversation content (voice transcripts, chat logs - both parties)
- For abandoned calls: start time, time to abandon, caller ANI (phone number, name, city if available)
- Non-answering extensions can be suppressed from details (2025 feature)

**Access**: Browser-based, accessible from any internet-connected computer.

---

### 3.5 TASKE Replay (Historical Playback)

**Purpose**: Second-by-second historical playback of contact center operations as they appeared in real-time.

**Playback Controls**:
- Play, pause, stop
- Rewind and fast-forward
- Adjustable playback speed
- Trigger: auto-stop at configured performance thresholds (e.g., customer abandoned)

**Data Displayed During Replay**:
- Call volumes
- Queue states
- Live chat activity
- Agent status and activity
- What agents were doing at any given moment

**Use Cases**:
- Root cause analysis for incidents
- Workforce planning and staffing optimization
- Agent training and performance coaching
- Understanding why customers weren't served

---

### 3.6 DisplayCentral (Wallboard / Readerboard)

**Purpose**: Real-time statistics and messaging displayed on large screens (LCD TVs, projectors) visible to the entire contact center floor.

**Display Types**:
- Scrolling tickers
- Sequencers (rotating views of live statistics)
- Multi-screen targeted displays (different data for different teams)
- Full-screen layouts

**Content Types**:
- Real-time call center metrics and statistics
- External business data (Internet news feeds, sales figures)
- Custom motivational messaging
- Ad-hoc announcements
- Threshold alert indicators

**Customization**:
- Drag-and-drop user interface for layout design
- Preview, save, and publish workflows
- No technical expertise required
- Automatic content resizing to assigned display space
- Different layouts for different rotating shifts
- Ad-hoc updates deployable in seconds without display restart

**Alerts**:
- Threshold alerts (audible and visual)
- Color changes when service objectives not met
- Highlight critical metrics

---

### 3.7 TASKE Console (Administration)

**Purpose**: Centralized administration interface for all TASKE server components.

**Status View**:
- Visual status of all TASKE server-based applications
- Service health monitoring
- Utility status

**Tools View**:
- Database management
- TASKE Contact configuration
- Network Settings (IP Address Configuration Wizard)
- Support Packager (diagnostics)
- License management (License tab shows current usage and allocations)
- Desktop upgrade configuration
- Skill change options

**Administration Console** (Web-based, since 2021):
- Replaced legacy desktop admin application
- User management
- Resource access control (agents, groups, queues)
- Active Directory integration with Single Sign-On (SSO)

---

### 3.8 TASKE Enterprise (Multi-Site Module)

**Purpose**: Manage multiple contact center locations from a single desktop.

**Features**:
- Simultaneous real-time monitoring of remote locations
- Consolidated reporting across sites
- Uses Internet/TCP/IP (no private network required)
- Cross-site performance comparison

---

## 4. REPORTING SYSTEM

### 4.1 Report Volume & Delivery
- **150+ standard report templates**
- **Time Intervals**: 15-minute granularity, summarizable by day, week, month, or year
- **Dynamic range reporting** (added 2021)
- **Export Formats**: HTML, PDF, text
- **Distribution**: Scheduled automatic email delivery at any time of day
- **Sharing**: Online sharing, exports to common formats
- **Custom Reports**: TASKE services team can create custom report types beyond standard 150+

### 4.2 Report Categories

| Category | Description |
|----------|-------------|
| **Abandoned Call Reports** | Calls not answered - time to abandon, caller ANI, queue |
| **Agent Reports** | Individual agent activity, talk time, idle time, states |
| **Agent Group Reports** | Group-level performance aggregation |
| **Extension Reports** | Extension-level activity tracking |
| **Trunk Reports** | Trunk utilization and performance |
| **Trunk Group Reports** | Trunk group level aggregation |
| **Queue Reports** | Queue performance, service levels, wait times |
| **Queue Group Reports** | Queue group level aggregation |
| **Queue by Day Reports** | Daily TSF/service level percentages per queue |
| **Activity Code Reports** | Call coding/categorization analysis |
| **Forecast Reports** | Staffing predictions, call volume forecasting by shift |
| **Agent Compliance Reports** | Call coding compliance (Agent Assist) |
| **Call Volume Reports** | Volume by code combination and duration |
| **Detailed Code Reports** | ANI, duration, comments per call code |
| **Daily/Weekly/Monthly/Yearly Reports** | Time-period aggregations |
| **Pilot/Pilot Group Reports** | Hunt group performance |
| **Live Chat & Chatbot Reports** | Chat performance analysis (Amazon Connect) |

### 4.3 Key Metrics Tracked Across Reports

**Service Level Metrics**:
- **TSF (Telephone Service Factor)**: Percentage of calls answered within a defined time threshold (e.g., 80% within 20 seconds)
- **ASF (Answer Service Factor)**: Percentage of total calls offered that are answered by agents (excludes short abandons and interflows)
- Service level percentages per queue per day

**Agent Metrics**:
- Login/logout times
- Idle duration / idle time
- Talk time / average talk time
- Wrap-up time / after-call work
- Agent states over time
- Calls handled count
- Transfer counts
- Do Not Disturb time
- Work Time state durations

**Queue Metrics**:
- Calls offered
- Calls answered
- Calls abandoned
- Average speed of answer
- Average wait time
- Longest waiting call
- Queue depth over time
- Interflow counts and timing

**Call Metrics**:
- Inbound, outbound, internal call counts
- Call duration
- Hold time and count
- Transfer count
- Caller ANI (phone number, name, city)
- Account codes
- DNIS information
- Call start/end times

**Trunk Metrics**:
- Trunk utilization
- Trunk group performance
- Busy/idle periods

---

## 5. AGENT MANAGEMENT

### 5.1 Agent States Tracked
Based on the glossary, release notes, and feature descriptions:
- **Available/Idle**: Agent ready to take calls
- **On Call/Talking**: Agent actively on a call
- **Unavailable**: Agent not accepting calls
- **Do Not Disturb (DND)**: Agent in DND state
- **Work Time / Wrap-Up**: After-call work state
- **Logged In / Logged Out**: Session states
- **Unknown**: Error state (can occur during configuration changes)

### 5.2 Agent Configuration
- **Agent Identifier**: Unique agent ID
- **Agent Groups**: Logical grouping of agents for management and reporting
- **Skills**: Assigned via EAS (Expert Agent Selection) on Avaya
- **Splits**: Hunt groups without EAS (Avaya-specific terminology)
- **Skill Assignment Management**: Supervisors can change skills on the fly
- **Skill Assignment Cloning**: Copy skill sets between agents (Avaya, added 2024)

### 5.3 Agent Monitoring
- Real-time state visibility for supervisors
- Second-by-second activity tracking
- Performance comparison between agents
- Talk time duration monitoring
- Caller information display during active calls
- Historical agent activity reporting

---

## 6. QUEUE MANAGEMENT

### 6.1 Queue Terminology
- **Queue**: Generic term (what TASKE calls all ACD routing groups)
- **Split**: Avaya term for hunt group with ACD enabled but EAS disabled
- **Skill**: Avaya term for hunt group with both ACD and EAS enabled
- **Queue Group**: Logical grouping of queues for management and reporting
- **Pilot / Pilot Group**: Alternative grouping concept

### 6.2 Queue Metrics (Real-Time)
- Number of calls waiting
- Longest waiting call
- Current service level
- Agent availability per queue
- Abandonment rate
- Average wait time

### 6.3 Queue Configuration
- Queue-specific call codes (Agent Assist)
- Interflow settings (redirect to alternate queue after wait threshold)
- Service level targets per queue
- Threshold alerts per queue

---

## 7. INTEGRATIONS

### 7.1 Supported Phone Systems

| System | Integration Method | Status |
|--------|-------------------|--------|
| **Avaya Aura / Communication Manager** | CTI via TSAPI (Avaya TSAPI Service) | DevConnect Partner |
| **Cisco UCCX / Unified Communications Manager** | CTI/Network link | Select Developer Partner |
| **Amazon Connect** | Cloud-native integration (AWS) | AWS Marketplace listing |
| **Mitel/Iwatsu** (legacy) | Historical support | Legacy |
| **Toshiba** (legacy) | Historical support | Legacy |

### 7.2 Technology Partners
- **AWS**: Cloud platform, AWS Marketplace distribution
- **Avaya**: DevConnect technology partner
- **Cisco**: Select Developer Partner

### 7.3 Workforce Management Integrations
- **Uptivity (formerly CallCopy)**: Clarity WFM integration for forecasting and scheduling
- **Blue Pumpkin Software**: PrimeTime WFM (historical partner, shipped as TASKE add-on)
- Generic WFM integration support

### 7.4 Distribution Partners
- Ingram Micro Cloud (AWS channel)
- Arrow S3
- ConvergeOne
- NWN Carousel
- Presidio

### 7.5 Additional Integrations
- **CRM Integration**: Rules engine can open CRM on call answer, pass caller data
- **External Applications**: Rules engine passes phone numbers, wait times, and other data
- **Active Directory**: SSO integration for user authentication
- **Amazon Lex**: Bot performance monitoring and analytics
- **SFTP**: Supported for data transfer (added 2021)

---

## 8. USER ROLES & PERMISSIONS

### 8.1 Role Hierarchy

| Role | Access Level | Key Capabilities |
|------|-------------|-----------------|
| **Administrator** | Full system access | TASKE Console, database management, user management, license management, network configuration, resource access control |
| **Supervisor** | Management access | Real-time monitoring (all views), historical reports, Visualizer, Replay, DisplayCentral management, Desktop customization (with passkey), skill management, agent monitoring |
| **Agent** | Restricted access | Desktop view (locked configuration), own queue/performance data, Agent Assist call coding (if enabled) |

### 8.2 Permission Controls
- **Interface Locking**: Administrators configure what agents see, then lock the interface
- **Passkey Protection**: Supervisors given passkey to modify the customizable Desktop application
- **Resource Access Control**: Administrators control access to specific agents, groups, and queues
- **SSO Groups**: Active Directory groups mapped to TASKE access levels
- **Report Access**: Selected users access reporting features; can be restricted by role

### 8.3 Authentication
- Local TASKE authentication (username/password)
- Active Directory integration with Single Sign-On (SSO) (since 2021)
- SSO username change recognition

---

## 9. UI SCREENS & VIEWS INVENTORY

### 9.1 Web Portal Screens
1. **Real-Time Dashboard** - Main monitoring view with customizable widgets/panels
2. **Agent Detail View** - Individual agent status and performance
3. **Group Summary View** - Aggregate group-level metrics
4. **Queue View** - Queue depth, wait times, service levels
5. **Reports Library** - 150+ report templates with filter/schedule options
6. **Report Viewer** - Generated report display with print/export
7. **Visualizer Search** - Filter builder for call record searches
8. **Visualizer Detail / Cradle-to-Grave** - Timeline view of individual call lifecycle
9. **Replay Player** - Historical playback with transport controls
10. **Administration Console** - User management, resource access, system config

### 9.2 Desktop Application Screens
1. **Dockable Dashboard Panel** - KPI bar overlay
2. **Real-Time Monitor** - Agent states, queue depths, statistics
3. **Rules Configuration** - Event-action rule builder
4. **Agent Assist Dialog** - Call coding popup (on call answer)
5. **Skill Management** - Agent skill assignment interface
6. **Settings/Preferences** - Theme selection (dark mode + others)

### 9.3 DisplayCentral Screens
1. **Layout Designer** - Drag-and-drop display builder
2. **Preview Mode** - Pre-publish review
3. **Published Display** - Live wallboard output (scrolling ticker, sequencer, full-screen)

### 9.4 TASKE Console Screens
1. **Status View** - Server application/service status dashboard
2. **Tools View** - Database management, configuration tools
3. **License Tab** - Usage and allocation display
4. **Network Settings Wizard** - IP configuration
5. **Support Packager** - Diagnostic tool

---

## 10. DATA MODEL CONCEPTS

### 10.1 Core Entities

```
Agent
  - Agent ID (unique identifier)
  - Agent Name
  - Agent State (available, talking, idle, unavailable, DND, wrap-up, logged out)
  - Skills (many-to-many with Queue/Skill)
  - Agent Group membership
  - Extension assignment
  - Login/Logout timestamps

Queue (also: Split, Skill)
  - Queue ID
  - Queue Name
  - Queue Type (split vs. skill)
  - Queue Group membership
  - Service Level Target
  - Interflow configuration (time, destination)
  - Associated Call Codes (Agent Assist)

Extension
  - Extension Number
  - Extension Group membership
  - Associated Agent (when logged in)

Trunk
  - Trunk ID
  - Trunk Group membership
  - Status (busy/idle)

Call/Contact Record
  - Call ID
  - Start Time / End Time
  - Call Type (inbound, outbound, internal)
  - Channel (voice, chat, chatbot)
  - Caller ANI (phone number, name, city)
  - DNIS
  - Account Code
  - Queue(s) traversed
  - Agent(s) involved
  - Extension(s) involved
  - Trunk(s) used
  - Hold events (count, duration)
  - Transfer events (count, destinations)
  - Wait time before answer
  - Talk time
  - Wrap-up time
  - Outcome (answered, abandoned, interflowed)
  - Time to abandon (if abandoned)
  - Sentiment (Amazon Connect)
  - Call codes (Agent Assist - up to 10 levels)
  - Agent comments (Agent Assist)
  - Transcript (voice/chat)
  - Recording reference

Call Event (timeline entries within a Call Record)
  - Timestamp
  - Event Type (ring, answer, hold, unhold, transfer, conference, disconnect, queue, dequeue)
  - Source resource
  - Destination resource
  - Duration

Agent Group
  - Group ID
  - Group Name
  - Member Agents

Queue Group
  - Group ID
  - Group Name
  - Member Queues

Extension Group
  - Group ID
  - Group Name
  - Member Extensions

Trunk Group
  - Group ID
  - Group Name
  - Member Trunks

Pilot / Pilot Group
  - Pilot ID
  - Associated Queue/Routing

User (TASKE Application User)
  - Username
  - Role (Admin, Supervisor, Agent)
  - SSO / Active Directory mapping
  - Resource access permissions (which agents, queues, groups they can see)
  - Desktop configuration (locked vs. unlocked)
  - Passkey (supervisor)

Activity Code
  - Code ID
  - Code Levels (up to 10 hierarchical levels)
  - Queue association
  - Code values per level

Report Schedule
  - Report Template
  - Time Range
  - Interval (15min, hourly, daily, weekly, monthly, yearly)
  - Delivery method (email)
  - Format (HTML, PDF, text)
  - Recipients

Threshold / Alert Configuration
  - Metric type
  - Target value
  - Alert type (visual, audible)
  - Associated resource (queue, agent group, etc.)

DisplayCentral Layout
  - Layout ID
  - Target screen(s)
  - Shift assignment
  - Content blocks (metrics, external data, messaging)
  - Ticker/sequencer configuration
```

### 10.2 Key Relationships
- Agents belong to Agent Groups (many-to-many)
- Agents have Skills that map to Queues (many-to-many)
- Queues belong to Queue Groups (many-to-many)
- Extensions belong to Extension Groups
- Trunks belong to Trunk Groups
- Calls traverse multiple Queues, Agents, Extensions, Trunks (many-to-many through Call Events)
- Activity Codes are assigned per Queue (different code trees per queue)
- Users have role-based access to specific Agents, Groups, and Queues

---

## 11. LICENSING MODEL

### Subscription License
- Annual fee based on number of agents/extensions monitored
- Includes: technical support, free upgrades/updates/fixes
- Access continues as long as subscription is active

### Perpetual License
- Upfront payment based on agent count + features selected
- Total Care support plan (annual fee) for support and upgrades
- License never expires

### AWS Marketplace (Amazon Connect)
- 12-month or 36-month contracts
- Usage-based: $0.006/minute (up to 500K minutes/month), $0.004/minute for overages
- Non-cancellable; fees non-refundable

---

## 12. RECENT RELEASE HIGHLIGHTS (Feature Evolution)

| Version | Date | Notable Features |
|---------|------|-----------------|
| 2025.03 | Nov 2025 | Dark mode + themes for Desktop, suppress non-answering extensions in Visualizer, SMS retry |
| 2024.08 | Jan 2025 | OpenSSL v3, .NET 8, skill assignment cloning (Avaya), dequeue event in Cisco Visualizer |
| 2023.1 | May 2024 | .NET 6, Visualizer filtering by answering extension, Desktop statistics thresholds, web portal disconnect |
| 2021.1 | Aug 2021 | Active Directory SSO, web-based Administration Console, dynamic range reporting, SFTP support |

---

## 13. KNOWN LIMITATIONS & USER FEEDBACK

**From User Reviews**:
- Reportedly "buggy" with occasional unscheduled maintenance shutdowns
- Steep learning curve without formal training
- Data export and deep data analysis can be limited
- Not all features available across all phone system platforms
- Real-time extension monitoring not supported in TASKE Contact (requires TASKE Essential)
- G2/ITQlick rating: ~3/5 stars (62/100)
- Difficulty verifying data accuracy reported by some users

**Platform Limitations**:
- Agent Assist is exclusively a Desktop add-on (not web-only)
- Not all features/modules available for all telephone systems
- DisplayCentral limited to Avaya and Cisco
- Lex Bot Monitoring only for Amazon Connect
