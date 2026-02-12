# Chronicall Report Metric Definitions -- Complete Specification

> Extracted from Xima Chronicall documentation (guide.ximasoftware.com)
> Date: 2026-02-10
> Purpose: Specification for building report templates

---

## TABLE OF CONTENTS

1. [Agent Report Metrics](#1-agent-report-value-definitions)
2. [Call Report Metrics](#2-call-report-value-definitions)
3. [Time Report Metrics](#3-time-report-value-definitions)
4. [Cradle to Grave Filter Definitions](#4-cradle-to-grave-filter-definitions)
5. [Standard Reports List](#5-list-of-standard-reports)
6. [Report Styles](#6-report-styles)
7. [Dashboard / Realtime Values](#7-dashboard--realtime-values)
8. [Wallboard Widget Types](#8-realtime-wallboard-widgets)

---

## 1. AGENT REPORT VALUE DEFINITIONS

Source: https://guide.ximasoftware.com/docs/agent-report-value-definitions

These metrics are available in any report where the row type is an Agent. All duration metrics support total, maximum, minimum, and average aggregation unless otherwise noted.

| # | Metric Name | Definition | Data / Formula | Required Module | Report Types |
|---|-------------|-----------|----------------|-----------------|--------------|
| 1 | Abandoned Calls | Number of inbound calls associated with the given agent that did not end in a talking or voicemail event. | Counts calls ending in hold, queue, ringing, park events. Includes calls that were answered but ended in non-talking states (e.g., placed on hold then caller hung up). | Base | Agent Summary, Agent Detail |
| 2 | Abandoned Chat Count | Total count of external chats that were abandoned by the given agent(s). | Chat ends in any event other than "chatting." | Multimedia Web Chat | Agent Chat reports |
| 3 | Accepted Chat Count | Total count of how many inbound external web chats each selected agent has accepted. | Count of accepted inbound web chats. | Multimedia Web Chat | Agent Chat reports |
| 4 | Agent ACW Duration | Total, max, avg, or min duration an agent spends in the After Call Work state. | Default 30 seconds; agent can "snooze" for additional time. | Multimedia (Voice Agent license) | Agent Summary, Performance |
| 5 | Agent Do Not Disturb Duration | Total, max, avg, or min duration an agent spends in a Do Not Disturb state. | Named differently by system: Avaya IP Office = DND; Cisco = DND; ShoreTel = Release; Avaya CM = Aux; Voice Agent = Not Ready. | Realtime Agent Seat | Agent Summary, Performance |
| 6 | Agent Idle Duration | Total, max, min, or avg amount of time that the agent spends in an idle state. | Agent is logged in and waiting for calls. DND status and Group Login not factored into result. | Base | Agent Summary, Performance |
| 7 | Agent MCW Duration | Total, max, avg, or min duration that the given agent spent in Missed Call Work state. | Triggered when agent is presented a call in a skill and does not answer. | Multimedia | Agent Performance |
| 8 | Agent Ready Duration | Total, max, min, or avg block of time the given agent spent in a Ready state. | Agent not in DND, not in call, and logged into group. | Realtime Agent Seat | Agent Summary, Performance |
| 9 | Answered Calls | Number of inbound calls that included at least one talking event with the given agent. | Count of inbound calls with >= 1 talking event. | Base | Agent Summary, Detail |
| 10 | Average Calls Per Hour | Average number of calls in which the agent participates every hour over the selected time frame. | Total calls / total hours in time frame. | Base | Agent Summary |
| 11 | Call Count | Total number of calls (inbound, outbound, and internal) associated with the given agent. | All call directions combined. | Base | Agent Summary, Detail |
| 12 | Call Duration | Total, max, min, or avg duration of all calls associated with the given agent. | Includes any call where agent was calling or receiving party in at least one event. | Base | Agent Summary, Detail |
| 13 | Call Event Cost | Total event cost of the call, as defined by the selected Call Cost Profile. | Total seconds x (rate per minute / 60). Event-specific duration, not full call duration. | Base (requires Call Cost Profile) | Agent Cost reports |
| 14 | Calls Transferred by Agent | Total number of calls that were transferred by the given agent to another agent. | Count of outgoing transfers. | Base | Agent Transfer Summary |
| 15 | Calls Transferred to Agent | Total number of calls that were transferred to the given agent by another agent. | Count of incoming transfers. | Base | Agent Transfer Summary |
| 16 | CDR Column Value | Additional CDR metadata pulled from the Cisco phone system. | Cisco-specific metadata field. | Cisco integration | Agent Detail (Cisco only) |
| 17 | Chat Count | Total number of inbound chats associated with the selected agent(s). | Count of all inbound chat sessions. | Multimedia Web Chat | Agent Chat reports |
| 18 | Chat Duration | Total, max, min, or avg duration of the chats associated with the selected agent(s). | Duration of chat sessions. | Multimedia Web Chat | Agent Chat reports |
| 19 | Chat Queue Accept Count | Total number of inbound chats that were accepted from the queue by the selected agent(s). | Chats accepted from queue specifically. | Multimedia Web Chat | Agent Chat reports |
| 20 | Chat Queue Duration | Total, max, min, or avg duration that a client waited in the chat queue before the chat was accepted. | Queue wait time before agent acceptance. | Multimedia Web Chat | Agent Chat reports |
| 21 | Chat Queue Missed Count | Total number of inbound chat offers from the queue that were missed by the selected agent(s). | Declined or timed-out queue chat offers. | Multimedia Web Chat | Agent Chat reports |
| 22 | Chat Speed of Answer | Total, max, min, or avg amount of time that it took the selected agent(s) to answer the chat when it was presented. | Time from chat presentation to agent acceptance. | Multimedia Web Chat | Agent Chat reports |
| 23 | Chats with Phrase (Percent) | Percent of instances in which a specific keyword or key phrase is used or said during the chat sessions. | Keyword/phrase established during report setup. | Multimedia Web Chat | Agent Chat reports |
| 24 | Composite Score | Composite score of all questions on the scorecard for the selected agent(s). | Based on Recording Library scorecards; combined average of all question scores. | Recording Library | Campaign/Scorecard reports |
| 25 | Daily Average Count | Total number of calls associated with the given agent divided by the total number of days in the time frame. | Call count / number of days. | Base | Agent Summary |
| 26 | Dialing Duration | Total, max, min, or avg duration of all dialing events associated with the given agent. | Duration of outbound dialing state. | Base | Agent Summary, Detail |
| 27 | Discretionary Not Ready Time | Total length of time that an agent, by their own doing, placed themselves in a state of Not Ready. | Self-initiated; prevents calls from being routed to agent. | Multimedia Web Chat | Agent Performance |
| 28 | Event Count | Total number of specified events associated with the given agent. | Desired event(s) selected during report setup. | Base | Agent Summary, Detail |
| 29 | Event Duration | Total, max, min, or avg duration of all events of the specified type associated with the given agent. | Event type(s) selected during setup. | Base | Agent Summary, Detail |
| 30 | Expanded Question Score | Allows adding a single column that displays all campaign questions automatically; each question in its own column. | Expands to multiple columns at runtime. | Recording Library | Campaign/Scorecard reports |
| 31 | Extension Login Duration | Total, max, min, or avg block of time the given agent spent logged in to their extension. | Extension login/logout timestamps. | Base | Agent Summary, Time Card |
| 32 | Feature Count | Total number of features that this agent was associated with that fit the selected criteria. | Features: Extension/Group login, DND, ACW, etc. | Base | Agent Feature reports |
| 33 | Feature Duration | Total, max, min, or avg block of time the given agent spent with the specified feature enabled. | Duration of feature activation. | Base | Agent Feature reports |
| 34 | Final Agent Call Count | Number of times the given agent was the final agent (last agent associated with an event during a call). | Respects other event-level filters. | Base | Agent Summary |
| 35 | Group Login Duration | Total, max, min, or avg block of time the given agent spent logged in to the specified group. | Group login/logout timestamps. | Base | Agent Summary, Performance |
| 36 | Handled Calls | Total number of inbound calls in which the given agent had a talking event. | Inbound calls with agent talking event. | Base | Agent Summary, Performance |
| 37 | Hold Duration | Total, max, min, or avg duration of all hold events associated with the given agent. | Time caller was on hold. | Base | Agent Summary, Detail |
| 38 | Inbound Call Count | Total number of inbound calls that contained at least one event associated with the given agent. | Includes calls agent may not have actively participated in (e.g., voicemail). | Base | Agent Summary, Detail |
| 39 | Initial Agent Call Count | Number of times the given agent was the initial agent (first agent associated with an event during a call). | Respects event-level filters. | Base | Agent Summary |
| 40 | Internal Call Count | Total number of internal (extension to extension) calls that involved the given agent. | Extension-to-extension calls only. | Base | Agent Summary, Detail |
| 41 | Missed Calls | Total number of calls where the given agent was involved in at least one ringing event, but no talking events. | Default: inbound calls only (configurable). Multiple rings count as one missed call if answered once. Calls missed by first agent still count as missed even if another agent answers. | Base | Agent Summary, Performance |
| 42 | Missed Chat Offer Count | Total number of inbound chat offers that were missed by the selected agent(s). | Declined or timed-out chat offers. | Multimedia Web Chat | Agent Chat reports |
| 43 | Multimedia ACW Duration | Total, max, min, or avg amount of time that the given agent was in a state of ACW. | Screen pop appears with countdown; agent can "snooze" for additional time. | Multimedia Web Chat | Agent Performance |
| 44 | Multimedia Login Duration | Total, max, min, or avg block of time the given agent spent logged in to the specified Multimedia skill. | Multimedia skill login timestamps. | Multimedia (Voice Agent license) | Agent Performance |
| 45 | Multimedia Snooze Count | Total number of times that an agent snoozed the ACW state. | Extends After Call Work period. | Multimedia (Voice Agent license) | Agent Performance |
| 46 | Multimedia User Ready Duration | Total, max, min, or avg block of time the given Multimedia Voice agent spent in a Ready state. | Ready = able to receive skill calls, not "Not Ready", not in call, logged in. | Multimedia (Voice Agent license) | Agent Performance |
| 47 | Outbound Call Count | Total number of outbound calls that involved the specified agent. | Calls originated within system dialed to external numbers. | Base | Agent Summary, Detail |
| 48 | Park Duration | Total, max, min, or avg duration of all park events associated with the given agent. | Park: any group member can retrieve (unlike hold, which only originating agent can retrieve). | Base | Agent Summary, Detail |
| 49 | Percent of Calls Abandoned | Percentage of the given agent's presented calls where the agent's final involvement was not a talking, voicemail, transfer, or transfer hold event. | Default: inbound only. Calls handled by multiple agents before abandonment count as abandoned for final agent only. | Base | Agent Summary, Performance |
| 50 | Percent of Calls Answered | Percentage of the given agent's presented calls that include at least one talking event with the agent. | Default: inbound only. Multi-agent rings: answered for answering agent, missed for others. | Base | Agent Summary, Performance |
| 51 | Percent of Calls Missed | Percentage of the given agent's presented calls where the agent was involved in one or more ringing events, but no talking events. | Default: inbound only. Multiple rings = one missed if answered once. | Base | Agent Summary, Performance |
| 52 | Presented Calls | Total number of calls in which the given agent was involved in at least one ringing event. | Default: inbound only. Does not require talking event. Voicemail-only calls not counted. | Base | Agent Summary, Performance |
| 53 | Question Score | Score the agent received for the question(s) on the scorecard for the selected agent(s). | Individual scorecard question results. | Recording Library | Campaign/Scorecard reports |
| 54 | Reason Count | Number of times a reason code was used by a given agent. | Reason codes applied to DND, Group Login, Extension Login via Agent Dashboards. | Agent Dashboards | Agent Reason Code reports |
| 55 | Reason Duration | Total, max, min, or avg duration that an agent spent in a specific reason code. | Time spent in reason code state. | Agent Dashboards | Agent Reason Code reports |
| 56 | Ringing Duration | Total, max, min, or avg duration of all ringing events associated with the given agent. | Time phone was ringing. | Base | Agent Summary, Detail |
| 57 | Scorecards Scored | Count of how many scorecards have been scored for the given agent. | Recording Library scorecard completion. | Recording Library | Campaign/Scorecard reports |
| 58 | Skill Enabled Duration | Total, max, min, or avg duration that a Multimedia Voice agent is enabled (logged into) a Multimedia skill. | Multimedia skill login duration. | Multimedia (Voice Agent license) | Agent Performance |
| 59 | Skill Handled Duration | Total duration of inbound calls with a talking event for the given agent while logged into a Multimedia skill. | Talking time specifically while in skill. | Multimedia (Voice Agent license) | Agent Performance |
| 60 | Speed of Answer | Total, max, min, or avg time it took for the given agent to answer their phone when it started to ring. | Total ringing duration before first talking event. Inbound calls only. Agent-associated events only. Excludes Auto Attendant events. | Base | Agent Summary, Performance |
| 61 | Talking Duration | Total, max, min, or avg duration of all talking events associated with the given agent. | Combines all call directions (inbound, outbound, internal). | Base | Agent Summary, Detail |
| 62 | Time to Answer | Time between the call reaching the phone system and the first talking event of the call. | Only agent-associated events included. Inbound calls only. Excludes Auto Attendant events. Similar to Speed of Answer in Agent reports. | Base | Agent Summary, Performance |
| 63 | Transfer Hold Duration | Total, max, min, or avg duration of all transfer hold events associated with the given agent. | Transfer hold: created while agent is transferring caller to another agent. | Base | Agent Summary, Detail |
| 64 | User Ready Duration | Total, max, min, or avg duration of time that the given user(s) are in a state of ready. | Ready state across all contexts. | Base | Agent Summary, Performance |
| 65 | Voicemail Check Count | Total number of times the given agent checked their voicemail box. | Voicemail access events. | Base | Agent Summary |
| 66 | Voicemail Check Duration | Approximate total, max, min, or avg amount of time the given agent spent checking their voicemail box. | Duration of voicemail checking sessions. | Base | Agent Summary |
| 67 | Voicemail Duration | Total, max, min, or avg duration of all voicemail events associated with the given agent. | Voicemail message durations. | Base | Agent Summary, Detail |
| 68 | Voicemail Leave Count | Total number of times callers left voicemail messages for the given agent. | Count of voicemails received. | Base | Agent Summary |
| 69 | Voicemail Leave Duration | Approximate total, max, min, or avg duration of all voicemail messages left for the given agent. | Duration of voicemail messages left. | Base | Agent Summary |

---

## 2. CALL REPORT VALUE DEFINITIONS

Source: https://guide.ximasoftware.com/docs/call-report-value-definitions

These metrics are available in any report where the row type is a Call (detail-level reports). Each row represents a single call.

| # | Metric Name | Definition | Data / Formula | Required Module |
|---|-------------|-----------|----------------|-----------------|
| 1 | Account Code | Displays the account code associated with the given call. Allows reporting on reasons for calling or being called. | Account code tag from agent dashboard. | Agent Dashboards |
| 2 | Agent Speed of Answer | Total time for agents to answer phones when a call reaches them. | Total duration of ringing events associated with an agent before first talking event. Inbound only. Excludes Auto Attendant events without agent association. | Base |
| 3 | Auto Attendant Duration | Total, max, min, or avg duration of all Auto Attendant events in a call. | Auto Attendant event durations. | Base |
| 4 | CDR Column Value | Shows all of the unique values of the specified Cisco CDR Field for the given call. | Cisco CDR field selected during configuration. | Cisco integration |
| 5 | Call Cost | Total call cost per selected Call Cost Profile. | Total seconds in call x (rate per minute / 60). Requires pre-created Call Cost Profile. | Base (requires Call Cost Profile) |
| 6 | Call Direction | Shows whether the given call was an inbound, outbound, internal, or intersite call. | Call type categorization. | Base |
| 7 | Call Duration | Entire amount of time between when the call started and ended. | Complete call length start to end. | Base |
| 8 | Call Event Cost | Total cost based on selected event durations only. | Total seconds in selected events x (rate per minute / 60). Differs from Call Cost: event-specific vs. full call duration. | Base (requires Call Cost Profile) |
| 9 | Call ID | Unique ID that Chronicall assigned to the given call. | Database ID number. | Base |
| 10 | Call Key | Database information for a call: start time, end time, and Call ID combined. | Used exclusively with Historical Call Data API. | Base |
| 11 | Caller ID | Caller ID that the phone system associated with this call. | Name of person calling; primarily inbound calls. | Base |
| 12 | Calling Agent | First agent who dialed on an internal, outbound, or intersite call. | Agent who initiated the call. | Base |
| 13 | Calling Party Number | Phone number associated with whoever initiated the call. | Agent extension for outbound/internal/intersite; external number for inbound. | Base |
| 14 | Composite Score | Combined average for all question scores for the campaign. | Scorecard value. Empty without module. | Recording Library |
| 15 | Dialed Party Number | First phone number that was dialed to initiate the phone call. | Extension for internal; dialed number for inbound; target number for outbound. | Base |
| 16 | Dialing Duration | Total amount of time that the given call spent in dialing events. | Dialing state duration. | Base |
| 17 | End Time | Date and time that the given call ended. | Customizable format (e.g., Oct 7, 2019 3:11:26 pm). | Base |
| 18 | Event Count | Total number of events that the phone system reported for this call. | Can filter to specific event types during setup. | Base |
| 19 | Event Duration | Total, max, min, or avg duration of all events in the given call. | Specify event types to include only those events. | Base |
| 20 | Expanded Question Score | Displays one column that automatically expands to show all scorecard questions. | Multi-question scorecard expansion. Empty without module. | Recording Library |
| 21 | External Party | Phone number of the External Party associated with the given phone call. | Inbound: caller number. Outbound: dialed number. Internal: blank. | Base |
| 22 | Final Agent | Last agent that was associated with an event in the given call. | Final agent involvement. | Base |
| 23 | Final Event | Last event that was associated with the given call (excludes Drop events). | Final non-Drop event. | Base |
| 24 | Final Group | Last hunt group that was associated with the given call. | Last group involvement. | Base |
| 25 | Final Tag | Last tag that was associated with an event in the given call. | Tags configured in IP Office Manager. | Base (Avaya) |
| 26 | Finalized Event Count | Total count of finalized events that match the event criteria. | Completed events only; excludes in-progress calls. | Base |
| 27 | Group Speed of Answer | Time for agents in selected hunt groups to answer phones. | Total duration of ringing and queue events before first talking event. Inbound only. Excludes unaffiliated events. | Base |
| 28 | Hold Duration | Total, max, min, or avg duration of all hold events. | Time caller spent on hold. | Base |
| 29 | In Conference | Check-mark if the given call included a conference. | Boolean: conference participation indicator. | Base |
| 30 | Includes Event Sequence | Specifies a sequence of events; shows check mark if call contains the sequence. | E.g., Ringing -> Talking -> Hold sequence detection. | Base |
| 31 | Initial Agent | First (initial) agent that participated in the given call. | First agent involvement. | Base |
| 32 | Initial Group | First (initial) hunt group that participated in the given call. | First group involvement. | Base |
| 33 | Initial Tag | Initial tag that was associated with an event in the given call. | Tags configured in IP Office Manager. | Base (Avaya) |
| 34 | Internal Party | Phone number of the internal party associated with this call. | Dialed number for inbound; calling number for outbound; blank for internal. | Base |
| 35 | Is Abandoned | Check mark if the given call was abandoned. | Abandoned = ending in event other than talking or voicemail. Includes answered calls where caller hung up during hold. | Base |
| 36 | Is Answered | Check mark if the given call was answered. | Requires talking event between caller and agent. | Base |
| 37 | Is Recorded | Check mark if the given call was recorded. | Boolean recording indicator. Empty without module. | Recording Library |
| 38 | Is Unanswered | Check mark if the call was unanswered. | Did NOT contain at least one Talking event; never answered by live agent. | Base |
| 39 | Note Author | Name and/or extension of the agent that left a note. | Added in Cradle to Grave or through call screen pop. | Base |
| 40 | Note Creation Time | When a note was created for the given call. | Timestamp from Cradle to Grave or call screen pop. | Base |
| 41 | Note Text | Text of the note that was added for the given call. | From Cradle to Grave or call screen pop. | Base |
| 42 | Park Duration | Total, max, min, or avg duration of all park events. | Park: anyone in agent's group can retrieve (unlike hold). | Base |
| 43 | QCB Port Not Available Time | Total time Queue Callback port was not available during call. | Indicates when callers could not select callback option. | Multimedia + Queue Callback |
| 44 | Question Score | Score(s) the agent/group received for the question(s) on the scorecard. | Individual scorecard question results. Empty without module. | Recording Library |
| 45 | Queue Duration | Total, max, min, or avg duration of all queue events. | Time spent in queue state. | Base |
| 46 | Rate Label | Rate label that this call falls into, based on the selected Call Cost Profile settings. | E.g., "Local" label for specific area codes. Categorizes calls by cost tier. | Base (requires Call Cost Profile) |
| 47 | Rate by Call Duration | Dollar amount based on the call's duration in minutes x specified rate. | Total call minutes x configured rate. | Base (requires Call Cost Profile) |
| 48 | Rate by Event Duration | Dollar amount based on the duration of the specified event types x specified rate. | E.g., Talking duration at $0.10/min = dollar amount. | Base (requires Call Cost Profile) |
| 49 | Rate per Minute | Rate per minute for the given call based on the selected Call Cost Profile. | Based on external number; varies by rate label. | Base (requires Call Cost Profile) |
| 50 | Receiving Agent | First agent that was a receiving party of an event in the given call. | Initial receiving agent. | Base |
| 51 | Recording Details | JSON string of all recording details. | Includes: Recording Key, Call Key, Start Time, Duration, Pool ID, Size, Event ID, Type, System ID, Status, Calling/Receiving Party. Recording Data API only. | Recording Library |
| 52 | Recording Hash Value | MD5 hash for verification of recording authenticity. | Verifies recording audio has not been tampered with. Rare use cases. | Recording Library |
| 53 | Recording Listen Link | Link to the recording associated with the call. | Clicking link allows listening to recorded call. Empty without module. | Recording Library |
| 54 | Recording Question Text | Any text from text questions associated with the given call. | Scorecard text question responses. Empty without module. | Recording Library |
| 55 | Ringing Duration | Total, max, min, or avg duration of all ringing events. | Time spent ringing. | Base |
| 56 | Scorecards Scored | How many scorecards associated with the given call have been scored. | Typically 0 or 1; may exceed 1 with multiple campaigns. | Recording Library |
| 57 | Start Time | Date and time that the given call started. | Customizable format. | Base |
| 58 | System ID | Unique ID associated with the local phone system. | Valuable for SCN (Small Community Network) configurations. | Base |
| 59 | Talking Duration | Total, max, min, or avg duration of all talking events. | Agent-customer conversation time. | Base |
| 60 | Time to Answer | Time it took for the given call to be answered. | Time between call reaching system and first talking event. Inbound only. Includes Auto Attendant and unaffiliated events by default. | Base |
| 61 | Transfer Hold Duration | Total, max, min, or avg duration of all transfer hold events. | Time agent holds caller during transfer process. | Base |
| 62 | Trunks Used on Call | Trunk(s) that the given call used. | Trunk identification for call routing. | Base |
| 63 | U.S. City | Name of the city from which the external party is calling or receiving. | Based on central office code (first six digits of ten-digit number). Works internationally. Blank for internal calls. | Base |
| 64 | U.S. City, State | City and state/province/country for external party. | Based on central office code. Works internationally. Blank for internal calls. | Base |
| 65 | U.S. State | Name of the state/province/country from which the external party is calling. | Based on central office code. Works internationally. Blank for internal calls. | Base |
| 66 | Voicemail Duration | Duration of the voicemail event associated with the given call. | Time spent in voicemail. | Base |

---

## 3. TIME REPORT VALUE DEFINITIONS

Source: https://guide.ximasoftware.com/docs/time-report-value-definitions

These metrics are available in Time Interval reports, where each row represents a time period (hour, day, week, month, etc.).

| # | Metric Name | Definition | Data / Formula | Required Module |
|---|-------------|-----------|----------------|-----------------|
| 1 | % Calls Answered within SLA (Formula) | Percent of inbound calls that were answered within the set service level agreement (SLA). | Calls answered within SLA / total answered calls. Custom formula. SLA adjustable via "Speed of Answer" filter. Default SLA: calls answered within less than 10 seconds. | Base |
| 2 | Abandoned Calls | Number of inbound calls associated with the given agent that did not end in a talking or voicemail event. | Calls ending in hold, queue, ringing, or park events. | Base |
| 3 | Abandoned Chat Count | Total count of external chats that were abandoned by the selected group(s) during the given time interval. | Chat abandoned = ending in event other than "chatting." | Multimedia Web Chat |
| 4 | Accepted Callback Count | Total number of scheduled queue callbacks accepted during the given time interval. | Count of accepted callbacks. | Multimedia Queue Callback |
| 5 | Accepted Callback Percent | Percent of scheduled queue callbacks accepted during the given time interval. | Accepted callbacks / total scheduled callbacks. | Multimedia Queue Callback |
| 6 | Agent Do Not Disturb Duration | Total, max, avg, or min duration an agent spends in a Do Not Disturb state during the given time interval. | DND state duration. | Realtime Agent Seat |
| 7 | Agent Idle Duration | Total, max, min, or avg amount of time that the agent spends in an idle state while logged in but not on calls. | DND status and Group Login not factored into calculation. | Base |
| 8 | Agent Ready Duration | Total, max, min, or avg block of time the given agent spent in a Ready state. | Ready = not in DND, not on call, logged into group. | Realtime Agent Seat |
| 9 | Agent Speed of Answer | Total, max, min, or avg time it took for agents to answer their phones when an Inbound call came in. | Total duration of ringing events before first talking event. Inbound only. Agent-specific events only, excludes Auto Attendant. | Base |
| 10 | Answered Calls | Number of inbound calls that included at least one Talking event with the given agent. | Count of answered inbound calls. | Base |
| 11 | Auto Attendant Duration | Total, max, min, or avg duration of all Auto Attendant events. | Auto Attendant event durations. | Base |
| 12 | Call Count | Total number of calls (inbound, outbound, and internal) associated with the given time interval. | All call directions combined. | Base |
| 13 | Call Duration | Total, max, min, or avg duration of all calls associated within the given time interval. | Overall call length. | Base |
| 14 | Callbacks Scheduled | Total number of Queue Callbacks that were scheduled for the selected skill(s) during the given time interval. | Count of scheduled callbacks. | Multimedia Queue Callback |
| 15 | Caller Wait Time | Total, max, min, or avg amount of time callers spent waiting during calls. | Total duration of all events except talking, voicemail, or dialing. | Base |
| 16 | Calls Answered after Service Level (Formula) | Total number of inbound calls that were answered after the set service level agreement (SLA). | Custom formula. SLA adjustable via report filters. | Base |
| 17 | CDR Column Value | Additional CDR metadata pulled from the Cisco phone system during the given time interval. | Cisco-specific metadata. | Cisco integration |
| 18 | Chat Count | Total number of inbound chats associated with the selected agent(s) during the given time interval. | Count of inbound chats. | Multimedia Web Chat |
| 19 | Chat Duration | Total, max, min, or avg duration of the chats associated with the selected agent(s). | Chat session duration. | Multimedia Web Chat |
| 20 | Chat Queue Duration | Total, max, min, or avg duration that a client waited in the chat queue before the chat was accepted by an agent. | Queue wait time before agent acceptance. | Multimedia Web Chat |
| 21 | Chat Queue Accept Count | Total number of inbound external chats that were accepted from the queue by the given group during the selected time interval. | Queue chat acceptance count. | Multimedia Web Chat |
| 22 | Chat Queue Missed Count | Total number of inbound external chat offers from the queue that were missed by the selected group(s) during the given time interval. | Missed queue chat offers. | Multimedia Web Chat |
| 23 | Chats With Phrase (Percent) | Percent of instances in which a specific keyword or key phrase is used or said during the chat sessions. | Keyword/phrase configured during setup. | Multimedia Web Chat |
| 24 | Connected Calls | Total number of outbound calls that were connected during the given time interval. | Connected = recipient answered (contains talking event). | Base |
| 25 | Day of Week | When using a time interval representing a date (such as days of month), shows the day of the week that the date falls on. | E.g., "If January 1st falls on a Wednesday, this column would display 'Wednesday'." | Base |
| 26 | Dialing Duration | Total, max, min, or avg duration of all Dialing events. | Time spent in dialing state. | Base |
| 27 | Discretionary Not Ready Time | Total length of time that an agent, by their own doing, placed themselves in a state of "Not Ready" (prevents inbound calls). | Self-initiated not-ready state. | Multimedia Web Chat |
| 28 | Event Duration | Total, max, min, or avg duration of all events of the specified type during the given time interval. | Event type selected during setup. | Base |
| 29 | Extension Login Duration | Total, max, min, or avg block of time the agent(s) spent logged in to their extension. | Extension login timestamps. | Base |
| 30 | Feature Count | Total number of features that this agent was associated with that fit the selected criteria. | Features: Extension/Group login, DND, ACW. | Base |
| 31 | Feature Duration | Total, max, min, or avg block of time the agent(s) spent with the specified feature enabled. | E.g., time spent in DND when feature enabled = true. | Base |
| 32 | Group Abandoned Wait Time | Total time calls waited in queue during the given time interval before abandoning the call. | Abandoned calls = did not end in talking or voicemail event. | Base |
| 33 | Group Login Duration | Total, max, min, or avg block of time the agent(s) spent logged in to the specified group. | Group login timestamps. | Base |
| 34 | Group Speed of Answer | Total, max, min, or avg time it took for the agents in hunt groups to answer their phones. | Total duration of Ringing and Queue events before first Talking event. Inbound by default. Group/agent-associated events only. | Base |
| 35 | Hold Duration | Total, max, min, or avg of all Hold events during the given time interval. | Time calls on hold. | Base |
| 36 | Inbound Calls | Total number of inbound calls associated with the selected group/agent during the given time interval. | Inbound = originated outside system. | Base |
| 37 | Inbound Trunk Call Count | Total number of inbound calls for the selected trunk(s) during the given time interval. | Trunk-specific inbound volume. | Base |
| 38 | Inbound Trunk Duration | Total amount of time that the selected trunk(s) or channel(s) was used by inbound calls during the given time interval. | Trunk usage by inbound calls. | Base |
| 39 | Internal Calls | Total number of internal calls associated with the given time interval. | Internal = originated and terminated inside system. | Base |
| 40 | Max Agents Logged into Group | Largest number of agents simultaneously logged in to the selected group(s) during the given time interval. | Peak concurrent group logins. | Realtime Agent Seat |
| 41 | Max Agents Logged into Extension | Largest number of agents simultaneously logged in to their extension during the given time interval. | Peak concurrent extension logins. | Realtime Agent Seat |
| 42 | Max Agents Logged into Multimedia | Largest number of agents simultaneously logged in to the selected Multimedia Skill group during the given time interval. | Peak concurrent multimedia logins. | Multimedia |
| 43 | Max Agents Ready | Largest number of agents that were ready to take a call during the given time interval. | Peak agents in ready state. | Realtime Agent Seat |
| 44 | Max Agents with Feature Enabled | Largest number of agents with the selected feature enabled. | Peak concurrent feature activation. Features: Extension/Group login, DND, etc. | Realtime Agent Seat |
| 45 | Max Agents with Skill Enabled | Largest number of Multimedia Voice agents that were enabled (logged into) a Multimedia skill. | Peak multimedia skill logins. | Multimedia (Voice Agent license) |
| 46 | Max Calls in Queue | Largest number of calls associated with the given group that were simultaneously waiting in queue. | Peak concurrent queued calls. | Base |
| 47 | Max Calls in Queue Callback | Largest number of scheduled callbacks associated with the given group that were simultaneously waiting to receive a callback. | Peak concurrent callback queue. | Multimedia Queue Callback |
| 48 | Max Channel Usage | Highest usage of the channels within a selected trunk during the given time interval. | Peak trunk channel utilization. | Base |
| 49 | Max Trunk Saturation | Maximum percentage of channels in the given trunk that were used simultaneously. | Max Simultaneous Calls / total trunk channels. | Base |
| 50 | Multimedia ACW Duration | Total, max, min, or avg amount of time that the given group was in a state of ACW. | ACW allows agents to complete work before receiving new calls. | Multimedia |
| 51 | Multimedia Login Duration | Total, max, min, or avg block of time the given agent spent logged in to the specified Multimedia skill. | Multimedia skill login duration. | Multimedia (Voice Agent license) |
| 52 | Multimedia MCW Duration | Total, max, avg, or min duration that the given group spent in a state of MCW (Missed Call Work). | MCW = state when agent presented call in skill but did not answer. | Multimedia |
| 53 | Multimedia Snooze Count | Total number of times a caller does not answer a Queue Callback call or chooses to snooze the call. | Snooze and unanswered callback count. | Multimedia Queue Callback |
| 54 | Multimedia User Ready Duration | Total, max, min, or avg block of time a given Multimedia user spent in a ready state. | Multimedia ready state duration. | Multimedia |
| 55 | Outbound Calls | Total number of outbound calls associated with the given time interval. | Outbound = originated inside system, dialed outside. | Base |
| 56 | Outbound Trunk Call Count | Total number of outbound calls associated with a specific trunk during the given time interval. | Trunk-specific outbound volume. | Base |
| 57 | Outbound Trunk Duration | Total amount of time that the given trunk or channel was used by outbound calls during the report time interval. | Trunk usage by outbound calls. | Base |
| 58 | Park Duration | Total, max, min, or avg duration of all park events. | Park event durations. | Base |
| 59 | Percent of Calls Abandoned | Percentage of the selected hunt group's total calls where the group's final involvement was not a talking, voicemail, or transfer hold event. | Inbound by default. Multi-group calls count once per group. | Base |
| 60 | Percent of Calls Answered | Percentage of the given hunt group's total calls that include at least one talking event with an agent in the hunt group. | Inbound by default. Multi-group calls count once per group (only group that answered). | Base |
| 61 | Percent of Calls Lost in Queue | Percentage of inbound calls associated with the given group where the caller reached a queue and hung up before being answered by an agent. | Queue abandonment rate. | Base |
| 62 | Percent of Calls Scheduling Callback | Percent of calls for a group that scheduled a callback when the callback option was offered. | Callback scheduling rate. | Multimedia Queue Callback |
| 63 | Presented Calls | Total number of calls in which the specified group was involved in at least one ringing or queue event. | Inbound by default. Includes missed calls. Excludes direct voicemail. | Base |
| 64 | Queue Duration | Total, max, min, or avg duration of all queue events. | Time calls in queue. | Base |
| 65 | Reason Count | Number of times a reason code was used by a given agent during the given time interval. | Requires Agent Dashboards module. Applies to DND, Group Login, Extension Login. | Agent Dashboards |
| 66 | Reason Duration | Total, max, min, or avg duration that an agent spent in a specific reason code. | Reason code state duration. | Agent Dashboards |
| 67 | Ringing Duration | Total, max, min, or avg duration of all ringing events associated with the agent(s). | Phone ringing event duration. | Base |
| 68 | Skill Enabled Duration | Total, max, min, or avg duration that a Multimedia Voice agent is enabled (logged into) a Multimedia skill. | Multimedia skill login duration. | Multimedia (Voice Agent license) |
| 69 | Skill Handled Duration | Total duration of inbound calls with a talking event for the agent(s) while logged into a Multimedia skill. | Talking time while in multimedia skill. | Multimedia (Voice Agent license) |
| 70 | Talking Duration | Total, max, min, or avg duration of all talking events associated with agents. | Combines all call directions (inbound, outbound, internal). | Base |
| 71 | Time to Accepted Callback | Total, max, min, or avg time that it took for scheduled callbacks to accept the callback. | Callback acceptance latency. | Multimedia Queue Callback |
| 72 | Time to First Callback | Total, max, min, or avg time that it took for Chronicall to make the first attempt to call the scheduled callbacks. | Callback attempt latency. | Multimedia Queue Callback |
| 73 | Transfer Hold Duration | Total, max, min, or avg duration of all transfer hold events. | Transfer-related hold event duration. | Base |
| 74 | Trunk Call Count | Total number of calls that passed through the selected trunk during the given time interval. | Regardless of call direction. | Base |
| 75 | Trunk Duration | Total amount of time that the given trunk or channel was used during the given report time interval. | Total trunk usage time. | Base |
| 76 | Unaccepted Callback Count | Total number of scheduled callbacks that went unaccepted by the client when Chronicall made the attempt to call them back. | Client rejected callbacks. | Multimedia Queue Callback |
| 77 | Unaccepted Callback Percent | Percent of scheduled callbacks that went unaccepted by the client when Chronicall made the attempt to call them back. | Client callback rejection rate. | Multimedia Queue Callback |
| 78 | Unanswered Calls | Total number of incoming calls associated with the given group that did not contain at least one talking event. | Inbound calls not handled by agent. | Base |
| 79 | User Ready Duration | Total, max, min, or avg duration of time that the selected user(s) are in a state of "ready." | Ready = prepared to take calls. | Realtime Agent Seat |
| 80 | Voicemail Duration | Approximate total, max, min, or avg duration of all voicemail messages left for the selected agents. | Voicemail message length. | Base |

---

## 4. CRADLE TO GRAVE FILTER DEFINITIONS

Source: https://guide.ximasoftware.com/docs/cradle-to-grave-filter-definitions

Filters are used across Cradle to Grave, custom reports, and standard reports to narrow data sets. They support mathematical inequalities and range notation using brackets: `[` inclusive, `(` exclusive.

### Call-Level Filters

| # | Filter Name | Definition | Configuration |
|---|------------|-----------|---------------|
| 1 | Account Codes Contain | Includes calls tagged with ANY of the selected account codes. | Select one or more account codes. |
| 2 | Account Codes Contain All | Includes calls tagged with ALL of the selected account codes. | Select multiple account codes. |
| 3 | Account Codes Do Not Contain | Excludes calls tagged with ANY of the selected account codes. | Select one or more account codes. |
| 4 | Agent | Includes ALL calls associated with the selected agent(s). | Select one or more agents. |
| 5 | Agent Does Not Equal | Excludes ALL calls associated with the selected agent(s). | Select agents to exclude. |
| 6 | Agent Speed of Answer | Filters by time for agent to answer when ringing started, excluding talking/transfers. | Set value with inequality/range notation: [..], (..), [..), or (..]  |
| 7 | Call Direction | Filters by direction: Inbound, Outbound, Internal, or Intersite. | Select one or more directions. |
| 8 | Call Direction Does Not Equal | Excludes specified call directions. | Select directions to exclude. |
| 9 | Call Does Not Include All Events | Excludes calls containing ALL specified events. | Select multiple events. |
| 10 | Call Does Not Include Calling Party | Excludes calls with specified calling party. | Specify phone numbers or area codes. |
| 11 | Call Does Not Include Event | Excludes calls with ANY of specified events. | Select one or more event types. |
| 12 | Call Does Not Include External Party | Excludes calls with specified external parties. | Select external numbers/businesses. |
| 13 | Call Does Not Include Group | Excludes calls associated with specified group(s). | Select one or more groups. |
| 14 | Call Does Not Include Local Party | Excludes calls involving specified agent(s). | Select agents to exclude. |
| 15 | Call Does Not Include Receiving Party | Excludes calls with specified receiving parties. | Select agents/receiving parties. |
| 16 | Call Does Not Include Tag | Excludes calls with specified tags. Tags configured in Avaya IP Office. | Select tags to exclude. |
| 17 | Call Duration | Filters by total call length from start to end. | Set value with inequality/range notation. |
| 18 | Call Has Note | Includes calls containing notes added by account owner or agent. | Boolean: True/False. |
| 19 | Call Has Survey | Includes calls with post-call survey (Avaya IP Office clients only). | Boolean: True/False. |
| 20 | Call ID Equals | Includes call matching exact Call ID number. | Specify precise Call ID. |
| 21 | Call ID Range | Includes calls within specified Call ID range. | Set minimum and maximum Call ID. |
| 22 | Call Includes All Events | Includes only calls with ALL specified events. | Select multiple event types. |
| 23 | Call Includes Any Event | Includes calls with ONE OR MORE of specified events. | Select one or more events. |
| 24 | Call Includes Calling Party | Includes calls with specified calling party. | Specify phone numbers or area codes. |
| 25 | Call Includes External Party | Includes calls with specified external parties. | Select external numbers/businesses. |
| 26 | Call Includes Group | Includes calls with events associated with selected group(s)/skill(s). | Select one or more groups. |
| 27 | Call Includes Local Party | Includes calls involving specified agent(s). | Select one or more agents. |
| 28 | Call Includes Receiving Party | Includes calls with specified receiving parties. | Select receiving agents/parties. |
| 29 | Call Includes Tag | Includes calls with specified tags. Tags configured in Avaya IP Office. | Select one or more tags. |
| 30 | Caller ID | Filters by caller ID (name/business or city/state). Inbound calls only. | Select one or more Caller IDs. |
| 31 | Calling Agent | Includes calls where selected agent initiated the call. | Select agent(s). |
| 32 | Calling Party Number | Filters by phone number of calling party. Inbound calls only; excludes outbound/internal. | Specify phone number. |
| 33 | Calls / Chats | Filters to show calls only, chats only, or both. | Select Calls, Chats, or Both. Requires Web Chat license. |
| 34 | Days of Week | Displays calls only for selected days within timeframe. | Select specific days (Monday, Friday, etc.). |
| 35 | Dialed Party Number | Filters by DNIS (number caller dialed). | Specify dialed number. |
| 36 | Event Duration | Filters individual event duration using inequalities/ranges. | Set value with bracket notation. E.g., Talking events > 3 minutes. |
| 37 | Event Sequence Does Not Match | Excludes calls with events in specified order. Events can be separated by other events. | Select event sequence. |
| 38 | Event Sequence Matches | Includes only calls with events in specified order. Events can be separated by other events. | Select event sequence. |
| 39 | Event Type | Filters by event type: Auto Attendant, Conference, Dialing, Hold, Park, Overflow, Queue, Ringing, Talking, Transfer, Transfer Hold, Voicemail. | Select one or more event types. |
| 40 | Event Type Does Not Equal | Excludes specified event types. | Select event types to exclude. |
| 41 | Filtered Call Does Not Include All Events | Advanced: Excludes calls with ALL specified events after event-level filtering. Extremely uncommon. | Select events. |
| 42 | Filtered Call Does Not Include Any Events | Advanced: Excludes calls with ANY specified events after event-level filtering. Extremely uncommon. | Select events. |
| 43 | Filtered Call Includes All Events | Advanced: Includes calls with ALL specified events after event-level filtering. Extremely uncommon. | Select events. |
| 44 | Filtered Call Includes Any Events | Advanced: Includes calls with ANY specified events after event-level filtering. Extremely uncommon. | Select events. |
| 45 | Final Agent | Includes calls with specified agent as last agent associated. | Select agent(s). |
| 46 | Final Agent Does Not Equal | Excludes calls with specified agent as final agent. | Select agent(s) to exclude. |
| 47 | Final Event | Includes calls with specified event as last event before drop. | Select final event type. |
| 48 | Final Event Does Not Equal | Excludes calls with specified event as final event. | Select event to exclude. |
| 49 | Final Group | Includes calls whose last group interaction was with selected group(s). Determined by last event associated with any group. | Select one or more groups. |
| 50 | Final Group Does Not Equal | Excludes calls with specified group as final group. | Select group(s) to exclude. |
| 51 | Group | Includes calls with events associated with selected group(s). | Select one or more groups. |
| 52 | Group Does Not Equal | Excludes calls with events associated with selected group(s). | Select group(s) to exclude. |
| 53 | Group Speed of Answer | Filters by total duration of Ringing and Queue events before first Talking event. | Select groups and set value with bracket notation. |
| 54 | Individual Event Duration | Filters individual event duration with inequalities/ranges. | Set value with bracket notation. |
| 55 | Initial Agent | Includes calls with specified agent as first agent. | Select agent(s). |
| 56 | Initial Agent Does Not Equal | Excludes calls with specified agent as first agent. | Select agent(s) to exclude. |
| 57 | Initial Group | Includes calls whose first group interaction was with selected group(s). Determined by first event associated with any group. | Select one or more groups. |
| 58 | Initial Group Does Not Equal | Excludes calls with specified group as initial group. | Select group(s) to exclude. |

### Boolean / Status Filters

| # | Filter Name | Definition | Configuration |
|---|------------|-----------|---------------|
| 59 | Is Call Abandoned | True = inbound calls with final event NOT Talking/Voicemail. "Likely means the caller dropped the call while waiting in queue or on hold." | Boolean: True/False. |
| 60 | Is Call Answered | True = inbound calls including Talking event. Agent picked up and spoke to caller. | Boolean: True/False. |
| 61 | Is Call Conferenced | True = calls involving multiple agents simultaneously. | Boolean: True/False. |
| 62 | Is Call Part of Campaign | True = calls with recording associated with Scorecard Campaign. | Boolean: True/False. |
| 63 | Is Call Recorded | True = calls with at least one recording attachment. | Boolean: True/False. |
| 64 | Is Call Scored | True = calls with recording in Scorecard Campaign that has been scored. | Boolean: True/False. |
| 65 | Is Call Scored in Campaign | True = calls with recording in specific Scorecard Campaign that has been scored. | Boolean: True/False; select specific campaign. |
| 66 | Is Call Unscored in Campaign | True = calls with recording in specific Scorecard Campaign NOT yet scored. | Boolean: True/False; select specific campaign. |

### Metadata / Context Filters

| # | Filter Name | Definition | Configuration |
|---|------------|-----------|---------------|
| 67 | Note Authored By | Includes calls with notes authored by selected agent(s). From Cradle to Grave or Agent Dashboard. | Select one or more agents. |
| 68 | Note Contains Text | Includes calls with notes containing specified text. | Enter text string. |
| 69 | Rate Label | Includes calls matching selected rate label(s) from Call Cost Profile. | Select rate labels. |
| 70 | Receiving Agent | Includes calls where selected agent was receiving agent (first receiving party). | Select agent(s). |
| 71 | Role | Includes calls associated with users/agents in specified Chronicall Roles. Separate from phone system Groups/Skills. | Select one or more roles. |
| 72 | Scorecard Campaign Name | Includes calls associated with specified scorecard campaigns. | Select one or more campaigns. |
| 73 | Shift | Includes calls belonging to agents/groups in specified shift. Purpose: "quickly and easily report on that specific timeframe." | Select shift. |
| 74 | State/Province | Includes calls associated with specified State/Province. Based on central office code (first six digits of ten-digit number). Blank for internal calls. | Select state/province. |
| 75 | System ID | Includes calls containing unique ID of local phone system. For SCN configurations. | Specify System ID. |
| 76 | System ID Does Not Equal | Excludes calls with specified System ID. For SCN configurations. | Specify System ID to exclude. |
| 77 | Tag | Includes calls with specified IP Office tag. Tags configured in Avaya IP Office. | Select one or more tags. |
| 78 | Time Intervals | Includes calls in selected time interval. Adjustable to specific days of week, days of month, or months. | Select time intervals. |
| 79 | Time of Day | Includes calls during specified time of day. Default: 24 hours (12:00 am to 11:59:59 pm). | Set start and end times. E.g., 8:00 am to 5:00 pm. |
| 80 | Time to Answer | Filters by time to answer including ringing, queue, and auto attendant time. | Set value with inequality/range notation. |
| 81 | Total Event Count | Includes calls with total event count matching criteria. Can filter count of specific selected events. | Select event type(s), then set count value with bracket notation. |
| 82 | Transfer Count | Includes calls with total transfer event count matching criteria. | Set value with bracket notation. E.g., > 2 transfers. |
| 83 | Trunk | Includes calls using specified trunk or channel. Trunk = external line containing multiple channels. | Specify trunk number (e.g., 1 or 2) or trunk.channel (e.g., 1.3). |

---

## 5. LIST OF STANDARD REPORTS

Source: https://guide.ximasoftware.com/docs/list-of-standard-reports

### Base Standard Reports (No Additional Licensing)

| # | Report Name | Description |
|---|------------|-------------|
| 1 | 911 Calls | Tracks emergency call activity |
| 2 | Abandoned Calls | Monitors calls that were abandoned without being answered |
| 3 | Agent Call Cost | Details individual agent call expenditures |
| 4 | Agent Call Cost Summary | Aggregated cost data by agent |
| 5 | Agent Calls | Complete agent call records |
| 6 | Agent Call Summary | Summarized agent call statistics |
| 7 | Agent Call Volume | Measures call quantity by agent |
| 8 | Agent Event Summary | Tracks agent system events |
| 9 | Agent Inbound Calls | Incoming calls handled by agents |
| 10 | Agent Inbound Summary | Aggregated inbound metrics by agent |
| 11 | Agent Outbound Calls | Outgoing calls made by agents |
| 12 | Agent Outbound Summary | Aggregated outbound metrics by agent |
| 13 | Agent Performance Summary | Overall agent metrics (some columns require additional licensing) |
| 14 | Agent Summary by Group | Agent data organized by group (some columns require additional licensing) |
| 15 | Agent Talking Summary | Duration agents spent talking |
| 16 | Agent Transfer Summary | Call transfer activity by agent |
| 17 | Base System Totals | System-wide aggregate statistics |
| 18 | Call Details | Comprehensive call information (some columns require additional licensing) |
| 19 | Call Details (Basic) | Simplified call records |
| 20 | Call Direction Summary | Inbound/outbound call breakdowns |
| 21 | Calls by Call Direction | Detailed call direction analysis |
| 22 | Calls by Caller ID | Calls organized by caller identification |
| 23 | Calls by External Party | Calls categorized by external numbers |
| 24 | Conference Calls | Multi-party call records |
| 25 | Contact Center Agent Reason Code Trace | Agent activity codes in contact center |
| 26 | Contact Center Agent Performance Summary | Contact center agent metrics |
| 27 | Emergency Calls | Emergency call tracking |
| 28 | Event Sequence Call List | Call events in chronological order (some columns require additional licensing) |
| 29 | Event Sequence Calls by Agent | Agent event sequencing |
| 30 | Excessive (Event Type) by Agent | Anomalous agent event patterns (some columns require additional licensing) |
| 31 | Excessive (Event Type) by Group | Anomalous group event patterns (some columns require additional licensing) |
| 32 | External Number Summary | Statistics by external phone numbers |
| 33 | Group Abandoned Calls | Group-level abandoned call metrics |
| 34 | Group Event Summary | Group system event tracking |
| 35 | Group Presented Calls | Incoming calls presented to groups (some columns require additional licensing) |
| 36 | Group Summary | Overall group statistics |
| 37 | Group Summary by Agent | Group data broken down by agent (some columns require additional licensing) |
| 38 | Inbound Caller ID Summary | Incoming caller identification patterns |
| 39 | Inbound Call Performance | Inbound call quality metrics |
| 40 | Inbound Calls by Local Number | Inbound activity by local phone numbers |
| 41 | Inbound Call Service Level | Inbound call service quality measurements |
| 42 | Inbound Call Summary | Overall inbound call statistics |
| 43 | Inbound Group Summary | Inbound metrics by group |
| 44 | Local Number Inbound Summary | Inbound activity aggregated by local numbers |
| 45 | Lost Call Summary | Calls that were lost or disconnected |
| 46 | Outbound Calls by External Party | Outbound calls categorized by recipient |
| 47 | Outbound Call Summary | Overall outbound call statistics |
| 48 | Queued Calls by Group | Calls in queue organized by group |
| 49 | Queued Call Volume | Total queued call quantities |
| 50 | Queued Summary by Group | Group queue metrics |
| 51 | Roles Call Cost | Call costs by user roles |
| 52 | Roles Call Cost Summary | Aggregated role-based costs |
| 53 | Tag Summary | Call tagging statistics |
| 54 | Trunk Usage by Time | Trunk utilization organized by time period |
| 55 | Trunk Usage Summary | Overall trunk usage metrics |
| 56 | User Call Cost | Individual user call costs |
| 57 | User Call Cost Summary | Aggregated user cost data |
| 58 | User Calls | Complete user call records |
| 59 | User Call Summary | User call statistics |
| 60 | User Call Volume | User call quantity metrics |
| 61 | User Event Summary | User system events |
| 62 | User Inbound Calls | User-handled incoming calls |
| 63 | User Inbound Summary | User inbound metrics |
| 64 | User Outbound Calls | User-made outgoing calls |
| 65 | User Outbound Summary | User outbound metrics |
| 66 | User Performance Summary | Overall user performance data |
| 67 | User Summary by Group | User data organized by group |
| 68 | User Talking Summary | User talk time metrics |
| 69 | User Transfer Summary | User transfer activity |

### Campaign Reports (Requires Recording Library License)

| # | Report Name | Description |
|---|------------|-------------|
| 1 | Agent Scorecard Summary - {Campaign} | Agent quality scores per campaign |
| 2 | Calls by Campaign - {Campaign} | Calls organized by campaign |
| 3 | Campaign Summary - {Campaign} | Overall campaign statistics |
| 4 | Group Scorecard Summary - {Campaign} | Group quality scores per campaign |
| 5 | Scores by Agent - {Campaign} | Campaign scores broken down by agent |
| 6 | Scores by Group - {Campaign} | Campaign scores broken down by group |

### Account Code Reports (Requires Agent Dashboards License)

| # | Report Name | Description |
|---|------------|-------------|
| 1 | Account Code Summary | Statistics organized by account codes |
| 2 | Calls by Account Code | Calls categorized by account codes |
| 3 | Agent Reason Code Trace | Detailed agent activity code records |

### Realtime Reports (Requires Realtime License)

| # | Report Name | Description |
|---|------------|-------------|
| 1 | Agent Realtime Feature Trace | Real-time agent feature usage tracking |
| 2 | Agent Reason Code Trace | Real-time agent activity codes (some columns require additional licensing) |
| 3 | Agent Time Card | Real-time agent time and availability tracking |

### Queue Callback Reports (Requires Skills-Based Agent + Queue Callback Licenses)

| # | Report Name | Description |
|---|------------|-------------|
| 1 | Callback Details | Detailed callback request information |
| 2 | Skill Queue Callback Summary | Callback metrics by skill queue |
| 3 | Skill Queue Call Volume | Callback volume by skill queue |

### Web Chat Reports (Requires Skills-Based Agent + Web Chat Licenses)

| # | Report Name | Description |
|---|------------|-------------|
| 1 | Agent Call and Chat Performance Summary | Combined voice and chat agent metrics |
| 2 | Agent Chat Summary | Agent chat session statistics |
| 3 | Chat Volume | Overall chat activity quantities |
| 4 | Group Chat Queue Summary | Group chat queue metrics |
| 5 | Group Chat Summary | Group chat statistics |

---

## 6. REPORT STYLES

Source: https://guide.ximasoftware.com/docs/report-styles

Chronicall provides three report styles. The style determines how data is aggregated and displayed.

### Style 1: Summary Reports

- **Description:** Aggregated totals for specified entities.
- **Row Types:** Agent Name, Group Name, Caller ID, Phone Number (External, Local, etc.), Call Direction, Account Code, Reason Code, Role, Scorecard Campaign, System, Tag, Trunk.
- **Use Case:** Understanding collective performance and metrics across defined categories.
- **Examples:** User Call Summary, Inbound Call Summary, Group Summary.

### Style 2: Detailed Reports

- **Description:** Granular information at the individual call, event, or feature level.
- **Row Types:** Call (Call ID), Event (Event ID), Feature (Feature ID). Each row represents a distinct entity rather than aggregated data.
- **Use Case:** Analyzing specific incidents or comprehensive call-by-call examination.
- **Examples:** Abandoned Calls, User Inbound Calls, Agent Realtime Feature Trace.

### Style 3: Time Interval Reports

- **Description:** Summary reports structured around temporal dimensions.
- **Row Types:** Hour of Day, Days of Week, Weeks of Month, Months of Year, and other time intervals.
- **Use Case:** Identifying patterns, staffing needs, and operational trends across specific timeframes.
- **Examples:** Inbound Call Performance, Inbound Call Service Level.

### Metric Availability by Report Style

| Metric Category | Summary | Detailed | Time Interval |
|----------------|---------|----------|---------------|
| Agent Report Values | Yes | -- | -- |
| Call Report Values | -- | Yes | -- |
| Time Report Values | -- | -- | Yes |
| Cradle to Grave Filters | Yes | Yes | Yes |

---

## 7. DASHBOARD / REALTIME VALUES

Source: https://guide.ximasoftware.com/docs/dashboard-values

### Value Categories

Realtime dashboard values are organized into four folders:

| Category | Description |
|----------|-------------|
| Count Metrics | Values that display actual numeric counts during given timeframes (e.g., Missed Calls, Call Count) |
| Duration Metrics | Time-based performance indicators (e.g., Queue Duration, Talking Duration, Hold Duration) |
| Miscellaneous Metrics | Additional tracking values for dashboard display |
| Formula | Custom calculated values created by administrators |

### Metric Scope Types

| Scope | Description |
|-------|-------------|
| Agent Values | Exclusive to the agent signed into the Desktop; shows individual agent metrics |
| General Values | Group collective totals; shows aggregate metrics for all agents in selected groups |

### Configuration Parameters

Each dashboard metric supports the following configuration options:

| Parameter | Options | Description |
|-----------|---------|-------------|
| Time Frame: "Since" | Specific time of day | Displays metric since a specific time; resets every 24 hours |
| Time Frame: "Last" | Duration value | Shows metric within a rolling time window |
| Calculation Type | Count, Duration, True/False | Determines how the metric is presented |
| Group/Queue Selection | Single or multiple Hunt/Work groups | Which groups are monitored |
| Call Direction | Inbound (default), Outbound, Internal, All | Which call directions to include |

### Wallboard Widget Display Types

| Display Type | Description |
|-------------|-------------|
| Single Widget | Cycles through values sequentially; freely moveable on screen |
| Floating Widget | Displays all values simultaneously; freely moveable on screen |
| Docked Widget | Affixes to screen edges; shifts other applications to make room |

---

## 8. REALTIME WALLBOARD WIDGETS

Source: https://guide.ximasoftware.com/docs/realtime-wallboard-widgets-html

### Widget Types

| # | Widget Type | Description | Configurable Metrics / Data | Use Case |
|---|------------|-------------|---------------------------|----------|
| 1 | Active Calls | Displays current calls involving selected users/groups. | Shows calling party, current event with duration, receiving party in real time. | Monitor live call activity |
| 2 | Agent Box | Displays agent's current activity and logged-in groups. | Agent status, group membership (highlighted when logged in). Similar to Agent Timeline. | Individual agent monitoring |
| 3 | Chart | Creates visual comparisons of multiple realtime values. | Format options: Line Chart, Bar Chart, Horizontal Bar, Stacked Bar, Horizontal Stacked Bar, Area Chart, Stacked Area. Categories: Agent, Group, Call Direction, Account Code (requires Agent Dashboards). | Trend visualization and comparison |
| 4 | Gauge | Displays title and total of selected value with animated gauge indicator. | Best for group durations (queue, call, talking). Moves up/down based on value changes. | Visual threshold monitoring |
| 5 | Group Box | Displays queue totals for selected group. | Group Login Count, Calls in Queue, Max Duration, Avg Duration. | Queue management |
| 6 | Image | Allows adding images to wallboard. | Image file upload (e.g., company logos). | Branding / visual design |
| 7 | Leaderboard | Creates visual comparison and identifies leader for focus column. | Categories: Agent, Group, Call Direction, Account Code (requires Agent Dashboards). Dynamically updates. Sortable. | Gamification / performance ranking |
| 8 | Line | Decorative widget for design purposes. | None (styling only). | Visual layout design |
| 9 | Marquee | Scrolls selected values across screen with animation. | One or multiple realtime values. Saves space through scrolling. | Space-efficient metric display |
| 10 | Pie Chart | Visual representation of realtime data distribution. | Any realtime count or duration value. | Proportional data display |
| 11 | Text | Simple display of values and totals. | One or multiple values. Typically group totals. | Basic numeric display |
| 12 | Title Value | Displays value title with count or duration. | Single value with label. Popular due to simple configuration. Typically group totals. | Quick single-metric display |
| 13 | Web Page | Embeds external web content via URL. | URL to external page. Typical uses: weather, web clocks. No compatibility guarantee. | External content integration |
| 14 | Widget Group | Groups multiple widgets together. | Collection of other widgets. Beneficial for Contact Center Agent Client use. | Organizational grouping |

### Widget-to-Metric Mapping

All widgets that display data (Chart, Gauge, Group Box, Leaderboard, Marquee, Pie Chart, Text, Title Value) can be configured with any of the realtime value categories:

- **Count Metrics:** Abandoned Calls, Answered Calls, Call Count, Inbound Calls, Missed Calls, Outbound Calls, Presented Calls, etc.
- **Duration Metrics:** Queue Duration, Hold Duration, Talking Duration, Ringing Duration, Speed of Answer, etc.
- **Formula Metrics:** Any custom-defined formula combining available metrics.
- **Group Box Fixed Metrics:** Group Login Count, Calls in Queue, Max Queue Duration, Avg Queue Duration.

---

## APPENDIX: CROSS-REFERENCE -- METRICS BY MODULE REQUIREMENT

### Base (No Additional License)

All call count/duration metrics, Speed of Answer, Time to Answer, Hold/Park/Ringing/Talking/Dialing/Queue/Voicemail Durations, Call Cost metrics, Call Direction, Caller ID, External/Internal Party, Initial/Final Agent/Group, Is Abandoned/Answered/Unanswered, Note fields, Start/End Time, Transfer Hold Duration, Trunk metrics, U.S. City/State, Event Count/Duration, Feature Count/Duration, Extension/Group Login Duration, Presented/Handled/Missed/Answered/Abandoned Calls and their percentages, Max Calls in Queue, Max Channel/Trunk metrics.

### Realtime Agent Seat Module

Agent DND Duration, Agent Ready Duration, Max Agents Logged into Group/Extension, Max Agents Ready, Max Agents with Feature Enabled.

### Multimedia Module

Agent ACW Duration, Agent MCW Duration, Multimedia Login Duration, Multimedia Snooze Count, Multimedia User Ready Duration, Skill Enabled Duration, Skill Handled Duration, Max Agents Logged into Multimedia, Max Agents with Skill Enabled, Multimedia ACW/MCW Duration.

### Multimedia Web Chat Module

Abandoned Chat Count, Accepted Chat Count, Chat Count, Chat Duration, Chat Queue Accept/Missed Count, Chat Queue Duration, Chat Speed of Answer, Chats with Phrase (Percent), Missed Chat Offer Count, Discretionary Not Ready Time.

### Multimedia Queue Callback Module

Accepted Callback Count/Percent, Callbacks Scheduled, Max Calls in Queue Callback, Multimedia Snooze Count (callback context), Time to Accepted/First Callback, Unaccepted Callback Count/Percent, Percent of Calls Scheduling Callback, QCB Port Not Available Time.

### Recording Library Module

Composite Score, Expanded Question Score, Question Score, Scorecards Scored, Is Recorded, Recording Details, Recording Hash Value, Recording Listen Link, Recording Question Text.

### Agent Dashboards Module

Account Code, Reason Count, Reason Duration.

### Cisco Integration

CDR Column Value.

---

*End of Chronicall Metric Definitions Specification*
