# Chronicall by Xima Software -- Complete Product Analysis
## Competitive Intelligence for Avaya IP Office 11 Reporting Platform

---

## Key Competitive Advantages to Beat

1. **True Cradle-to-Grave**: Full event chronology (not just CDR summaries) - 60+ filter types
2. **DevLink3 via TCP:50797 / TLS:50796** - captures every event on every call in real-time
3. **14 HTML wallboard widget types** with drag-and-drop builder
4. **50+ standard reports** across 3 styles (Summary, Detailed, Time Interval)
5. **69 agent metrics** tracked across call volume, duration, performance, state, and recording

## Chronicall Weaknesses = Our Opportunities

1. **Java dependency** - we go fully web-native
2. **BlueDB (non-standard DB)** - we use PostgreSQL (open, queryable)
3. **Complex modular licensing** - we simplify
4. **No mobile** - our responsive UI works on tablets/phones
5. **2010s-era UI** - we use modern shadcn/ui design system
6. **Limited CRM** - only Salesforce native, we can do more via webhooks

## DevLink3 Connection Requirements (for IP Office)

- CTI Link Pro License required on IP Office
- Service User with DevLink3 rights group membership
- TCP port 50797 (plain) or TLS port 50796
- Max 3 concurrent DevLink3 connections per IP Office unit
- Enable in System Security > Unsecured Interfaces tab

## Events Captured via DevLink3

**Call Events:** Auto Attendant, Ringing, Queue entry/exit, Talking, Hold, Transfer Hold, Park, Transfer, Conference, Voicemail, Dialing, Disconnect, Mobile Twinning, Overflow

**Agent State Events:** Extension Login/Logout, Group Login/Logout, DND on/off, Ready/Not Ready, ACW, MCW, Idle time, Reason codes

**System Data:** Trunk usage, Caller ID, DNIS, Tags, Call direction, Multi-site SCN IDs

## Full Report Categories (50+ reports)

### Agent Reports
Agent Calls, Agent Call Summary, Agent Call Volume, Agent Inbound Calls/Summary, Agent Outbound Calls/Summary, Agent Event Summary, Agent Performance Summary, Agent Summary by Group, Agent Talking Summary, Agent Transfer Summary, Agent Call Cost/Summary

### Group Reports
Group Summary, Group Event Summary, Group Presented Calls, Group Summary by Agent, Group Abandoned Calls

### Queue Reports
Queued Calls by Group, Queued Call Volume, Queued Summary by Group

### Call Reports
Call Details, Call Details (Basic), Calls by Call Direction/Summary, Calls by Caller ID, Calls by External Party, Event Sequence Call List, Event Sequence Calls by Agent, Excessive Event by Agent/Group, Conference Calls, 911 Calls, Emergency Calls

### Trunk Reports
Trunk Usage by Time, Trunk Usage Summary

### Inbound Reports
Inbound Call Summary/Performance/Service Level, Inbound Caller ID Summary, Inbound Calls by Local Number, Inbound Group Summary

## 14 Wallboard Widget Types
Active Calls, Agent Box, Chart (6 sub-types), Gauge, Group Box, Image, Leaderboard, Line, Marquee, Pie Chart, Text, Title Value, Web Page, Widget Group

## Permission System
- 3 tiers: Administrator (full), Manager (all call data + user mgmt), User/Agent (granular)
- Per-feature: Cradle to Grave (Full/Partial/None), Reporting (Full/Partial/None), Recording (Listen/Download/Delete per extension), Wallboards (Create/Read-Write/Read-Only/Hidden)
- Unlimited user accounts at no extra license cost

## API Surface
Historical Call Data, Recording Data, Recording Pause/Resume, Realtime Data (REST), Realtime Data (WebSocket), Screen Pop Profile, WebService Integration, Chat JS API, Web Chat Cloud Service, Click-to-Dial
