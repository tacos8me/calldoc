# Cross-Specification Consistency Report

**Audited Documents:**
1. `PROJECT_ROADMAP.md` (ROADMAP)
2. `COMPONENT_ARCHITECTURE.md` (ARCH)
3. `FRONTEND_UX_SPEC.md` (UX)
4. `INTERACTION_DESIGN_SPEC.md` (IDS)
5. `TASK_OPTIMIZATION.md` (TASK)
6. `DevLink3_Protocol_Spec.md` (DL3)
7. `Recording_Integration_Spec.md` (REC)
8. `Avaya_SMDR_Format_Spec.md` (SMDR)

**Audit Date:** 2026-02-10

---

## Critical Issues (must fix before build)

### C1. Agent State Color Conflicts Across Three Documents

The agent timeline event colors differ in **three separate definitions**, which will cause visual inconsistency.

| State | UX Spec (Section 4.2 palette) | IDS (Section 1.4, Appendix B) | ROADMAP (T3.5) |
|-------|------|-----|---------|
| **Idle** | `#4ADE80` (soft green) | `#9CA3AF` (gray-400) | green (unspecified) |
| **Hold** | `#EF4444` (red) | `#F97316` (orange) | yellow (unspecified) |
| **Talking** | `#3B82F6` (blue) | `#22C55E` (green) | blue (unspecified) |
| **ACW** | `#8B5CF6` (violet) | `#3B82F6` (blue) | purple (unspecified) |
| **DND** | `#DC2626` (deep red) | `#EF4444` (red) | red (unspecified) |
| **Ringing** | `#FBBF24` (amber) | `#EAB308` (yellow) | orange (unspecified) |

- **UX**: Section 4.2 defines 19 event-type colors, also encoded in `tailwind.config.ts` Section 9 as `event.*` tokens.
- **IDS**: Section 1.4 defines 7 agent state colors inline, and Appendix B defines CSS tokens `--state-idle`, `--state-talking`, etc. with different values.
- **ROADMAP**: T3.5 defines a color list inline (e.g., `Idle(green), Talking(blue), Hold(yellow)`) that partially matches UX but contradicts IDS.

**Impact:** Any component using these colors will render differently depending on which spec the developer references. Hold = red vs. orange vs. yellow is the most severe conflict.

**Resolution:** Canonicalize to the UX Spec's `event.*` tailwind tokens (Section 9) and update IDS Appendix B and ROADMAP T3.5 to reference the UX palette by token name.

---

### C2. Agent State Enum Values Conflict Between ARCH and UX

- **ARCH** (Section 7, `AgentState` type): `'available' | 'busy' | 'wrap' | 'away' | 'dnd' | 'ringing' | 'logged-out' | 'unknown'`
- **ROADMAP** (T3.5): Uses `Idle`, `Talking`, `Hold`, `DND`, `ACW` as display states on the timeline.
- **UX** (Section 4.2): Uses 19 event-type values including `Idle`, `Ringing`, `Talking`, `Hold`, `Park`, `Queue`, `Transfer`, `Dialing`, `Conference`, `Voicemail`, `ACW`, `DND`, `Overflow`, etc.

Conflicts:
- `available` (ARCH) vs. `Idle` (UX/ROADMAP) -- same concept, different name.
- `busy` (ARCH) vs. `Talking` (UX) -- ambiguous: `busy` could mean on-call OR DND.
- `wrap` (ARCH) vs. `ACW` (UX/ROADMAP) -- same concept, different abbreviation.
- `away` (ARCH) -- not present in UX at all.
- UX has 19 event types; ARCH has 8 agent states. No mapping provided.

**Impact:** Zustand `agentStore` and `StatusBadge` component both reference the ARCH enum, but timeline rendering uses the UX's richer set. Developers will be uncertain which type to use.

**Resolution:** Define agent states (for presence) and call event types (for timeline bars) as two separate enums. Document the mapping between them.

---

### C3. Cradle-to-Grave Event Color Conflicts

The event bar colors in the C2G expanded row differ between UX and IDS:

| Event | UX (Section 5.3, same as 4.2) | IDS (Section 1.3, C2G row expansion) | ARCH (Section 2.2) |
|-------|------|-----|------|
| **Ringing** | `#FBBF24` (amber) | yellow | yellow |
| **Talking/Connected** | `#3B82F6` (blue) | green | green |
| **Hold** | `#EF4444` (red) | orange | orange |
| **Transfer** | `#38BDF8` (sky blue) | purple | blue |
| **IVR** | (not defined) | teal | purple |
| **Queued** | `#F97316` (orange) | gray | (not listed) |
| **ACW** | `#8B5CF6` (violet) | blue | (not listed) |

- **IDS Section 1.3**: `Ringing (yellow), Talking (green), Hold (orange), Transfer (purple), IVR (teal), Queued (gray), ACW (blue)`
- **ARCH Section 2.2**: `ringing=yellow, connected=green, hold=orange, transfer=blue, IVR=purple, voicemail=gray`

**Impact:** C2G expanded row and agent timeline will show different colors for the same event type if developers follow different docs.

**Resolution:** UX Section 4.2 should be the single source of truth. Update IDS Section 1.3 and ARCH Section 2.2 to reference UX event tokens.

---

### C4. User Role Name Conflicts

| Source | Role Names |
|--------|-----------|
| **ROADMAP** (T2.3) | `system_admin`, `supervisor`, `agent`, `wallboard_viewer` |
| **ARCH** (Section 7, `UserRole` type) | `'admin'`, `'supervisor'`, `'agent'`, `'wallboard-only'` |
| **IDS** (Section 1.1, login) | `Admin`, `Manager`, `Agent` |
| **IDS** (Section 1.7.1, user management) | `Admin`, `Manager`, `Agent` |

Conflicts:
- `system_admin` vs. `admin` vs. `Admin` -- three different names for the same role.
- `supervisor` (ROADMAP/ARCH) vs. `Manager` (IDS) -- unclear if the same role.
- `wallboard_viewer` vs. `wallboard-only` -- underscore vs. hyphen, different suffix.
- IDS omits `wallboard_viewer/wallboard-only` entirely.

**Impact:** Database `user_roles` table values and TypeScript `UserRole` enum won't match, causing role-check bugs.

**Resolution:** Standardize to the ARCH `UserRole` type (`admin | supervisor | agent | wallboard-only`) and update all other docs.

---

### C5. Widget Type Count Conflict

| Source | Widget Count | Widget Types Listed |
|--------|-------------|---------------------|
| **ROADMAP** (Research Index) | 14 widgets (from Chronicall) | (reference only) |
| **ROADMAP** (T3.4) | 10 widgets listed in table | Agent Status Grid, Queue Summary, Active Calls, SL Gauge, Call Volume Chart, Leaderboard, Queue Depth, Trunk Util, KPI Ticker, Clock |
| **ROADMAP** (Week 4-5) | "remaining 14 widget types" | Implies 14+ total |
| **ARCH** (Section 2.1) | 14 widgets listed | ActiveCalls, AgentBox, Gauge, Chart, GroupBox, TitleValue, Leaderboard, PieChart, Marquee, Image, WebPage, Text, Line, WidgetGroup |
| **ARCH** (Section 7, `WidgetType`) | 14 enum values | active-calls, agent-box, gauge, chart, group-box, title-value, leaderboard, pie-chart, marquee, image, web-page, text, line, widget-group |
| **TASK** (T3.4) | 14 sub-tasks | Matches ARCH list |
| **UX** (Section 3.5) | 14+ types (includes decorative: Box, Ellipse, Line) | 14 named + box/ellipse decorative shapes |
| **IDS** (Section 1.2, Add Widget modal) | 14 types, **different categorization** | Real-time (4), Metrics (4), Charts (4), Status (2) |

Specific conflicts:
- ROADMAP T3.4 table lists only 10 widgets, but T3.4 description says 14, creating ambiguity.
- IDS Section 1.2 lists widget types by function (e.g., "Answer Rate", "Abandon Rate", "Average Wait Time") that don't map to any widget *type* in ARCH. These are metric *bindings* on a TitleValue or Gauge widget, not separate widget types.
- UX Section 3.5.13 adds Box and Ellipse as decorative types not present in ARCH's `WidgetType` enum.

**Impact:** The `WidgetType` enum in code won't cover all cases if UX decorative types are implemented but not in the type union.

**Resolution:** Treat ARCH `WidgetType` enum as canonical. Add `box` and `ellipse` from UX if decorative shapes are in scope. Clarify that IDS's widget list describes *metric bindings* on generic widget types.

---

### C6. API Route Path Conflicts

| Endpoint | ROADMAP | ARCH |
|----------|---------|------|
| **System connections** | `POST/GET/PUT/DELETE /api/system/connections` | Not present (has `/api/admin/settings` and `/api/devlink3/status`) |
| **User management** | `GET/PUT/DELETE /api/users/:id` | `GET/POST/PUT/DELETE /api/admin/users` |
| **SAML routes** | `/auth/saml/login`, `/auth/saml/callback`, `/auth/saml/metadata`, `/auth/saml/logout`, `/auth/saml/slo` | `/api/auth/[...saml]` (catch-all) |
| **System status** | `GET /api/system/status` | `GET /api/devlink3/status` |
| **Settings pages** | `/settings/profile`, `/settings/users`, `/settings/roles`, `/settings/saml`, `/settings/system` | `/admin/users`, `/admin/settings`, `/admin/recording-rules`, `/admin/storage-pools` |

- ROADMAP uses `/api/users/:id` for user management; ARCH nests it under `/api/admin/users`.
- ROADMAP uses `/api/system/connections` for IPO config; ARCH has no such route.
- ROADMAP has 5 explicit SAML routes; ARCH uses a catch-all `[...saml]` pattern.
- ROADMAP UI settings pages use `/settings/*`; ARCH uses `/admin/*`.

**Impact:** Engineers will implement conflicting URL structures depending on which doc they reference.

**Resolution:** Adopt ARCH route definitions as canonical (it is more detailed). Update ROADMAP route references to match.

---

### C7. PCI Audit Table Name Conflict

- **ROADMAP** (DB Schema): `recording_pause_events`
- **REC** (Section 8): References `recording_events` table for PCI audit trail
- **REC** (Section 9, SQL): Defines `recording_pause_events` (matches ROADMAP)

**Impact:** A developer reading REC Section 8 will look for `recording_events`; the schema uses `recording_pause_events`.

**Resolution:** Update REC Section 8 to reference `recording_pause_events` consistently with Section 9 and ROADMAP.

---

## Warnings (should fix but non-blocking)

### W1. Toast Notification Position Conflict

- **UX** (Section 7.4): "Bottom-right corner, 16px from edges. Stack upward (newest at bottom)."
- **IDS** (Section 6.1): "Bottom-right corner of the viewport, stacked vertically (newest on top)."

Stacking order is reversed: UX says newest at bottom, IDS says newest on top.

### W2. Sidebar Toggle Keyboard Shortcut Conflict

- **UX** (Section 2.5): `[` key toggles sidebar collapse.
- **IDS** (Section 2.1): `Cmd/Ctrl + /` toggles sidebar collapsed/expanded.
- **IDS** (Section 2.4): `[` is listed as "Set snippet start" in recording player.

All three shortcuts are defined; `[` has a dual binding (sidebar toggle AND snippet start).

### W3. Toast Auto-Dismiss Timing Conflict

- **UX** (Section 7.4): "5 seconds for success/info, 8 seconds for warning, manual dismiss only for errors."
- **IDS** (Section 6.1): "5 seconds for success and info toasts. 8 seconds for warnings and errors."

UX says errors are manual-dismiss only; IDS says errors auto-dismiss at 8 seconds.

### W4. Max Visible Toast Conflict

- **UX** (Section 7.4): Max 5 visible toasts.
- **IDS** (Section 6.1): Max 3 visible toasts.

### W5. Number Counter Animation Duration Conflict

- **UX** (Section 3.2): `duration-counter` (800ms) with spring easing.
- **IDS** (Section 3.3): 400ms with ease-out for numeric counting animation.

### W6. Sidebar Collapse Animation Duration Conflict

- **UX** (Section 2.1): `duration-smooth` (300ms).
- **IDS** (Appendix A): 200ms with ease-in-out.

### W7. Dashboard Grid Columns for Tablet Conflict

- **UX** (Section 2.4): Reduce to 6 columns on tablet.
- **IDS** (Section 7.2): Uses 8 columns on tablet.

### W8. Agent Timeline Page Route Conflict

- **ROADMAP** (T3.5): `/realtime/agents`
- **ARCH** (Section 1): `(dashboard)/agent-timeline/page.tsx`
- **IDS** (Section 1.4): `/agents/timeline`
- **UX** (Section 4.4): Click navigates to `/realtime/agents/:id`

Three different route patterns for the same page. ARCH's file path implies `/agent-timeline`.

### W9. C2G Page Route Conflict

- **ROADMAP**: `/calls`
- **ARCH**: `(dashboard)/cradle-to-grave/page.tsx` (implies `/cradle-to-grave`)
- **IDS** (Section 1.3): `/calls`

ARCH implies a different URL slug than ROADMAP and IDS.

### W10. Socket.io Authentication Method Conflict

- **ARCH** (Section 3.3): "authenticates client sockets via JWT"
- **ROADMAP** (T3.1): "validate session cookie on WebSocket handshake"

JWT vs. session cookie -- different auth mechanisms.

### W11. Recording Format in ARCH vs. REC

- **ARCH** (Section 7, `Recording` interface): `format: 'wav' | 'mp3' | 'opus'`
- **REC** (Section 3): Only mentions WAV (source) and Opus (target). MP3 never mentioned anywhere.
- **ROADMAP** (T4.6): Only WAV and Opus mentioned.

MP3 in the ARCH type union is unsupported by the rest of the spec.

### W12. Recording Score Scale Conflict

- **REC** (Section 7): "Scale 1-10: Points = selected"
- **ARCH** (Section 7): `ScoreCriterion.score: number // 0-100` and `ScoreCategory.score: number // 0-100`
- **ROADMAP** (T4.6): "yes/no, scale 1-10, text"

REC uses a 1-10 scale per question; ARCH normalizes everything to 0-100. No mapping documented.

### W13. Filter Count Discrepancy

- **ROADMAP** (T4.2): "80+ filters" in section title, but task description says "matching Chronicall's 60+ filters."
- **TASK** (T4.2): "83 filters" in header, with breakdown totaling 83.
- **IDS** (Section 1.3): "60+ filter options"

60+ vs. 80+ vs. 83 across three documents.

---

## Recommendations (nice to have)

### R1. Define a Canonical Type Dictionary

Create a shared `types/` reference that all docs point to. Currently, the `Call`, `Agent`, `Recording`, `Report`, and `ScoreCard` interfaces are only defined in ARCH. Other docs use prose descriptions that sometimes conflict with the typed definitions.

### R2. Standardize "Hunt Group" vs. "Queue" Terminology

ROADMAP and DL3 use "hunt group" (Avaya's term). IDS, UX, and ARCH sometimes use "queue" interchangeably. Since both terms appear in the DB schema (`hunt_groups` table) and UI labels (`Sales Queue`), document which term is used where: "hunt group" for the system entity, "queue" for the user-facing label.

### R3. Document the DevLink3 Call State to App State Mapping

DL3 Section 10 defines 14 numeric call states (0=Idle through 13=Redialling). ARCH defines `CallState` as 9 string values. UX Section 4.2 defines 19 event types for timeline rendering. No mapping exists between these three enumerations.

### R4. Unify the Report Template Count

- ROADMAP T4.3: "12+ standard report templates"
- TASK T4.3: 32 reports across 3 tiers (8 MVP + 8 Standard + 16 Extended)
- IDS Section 1.5: Lists 18 report types by name

The 32-report breakdown in TASK is the most detailed and should be treated as canonical. Update ROADMAP and IDS accordingly.

### R5. Clarify SMDR Port Configuration

- ROADMAP: "TCP:1150" (single port)
- SMDR Spec Section 2: "1150 (first site), 1151 (second), 1152 (third)"

ROADMAP should note that multi-site deployments use incrementing ports.

### R6. Speed Control Options

- **UX** (Section 8.6): `0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x` (6 options)
- **ROADMAP** (T4.6): `0.5x, 1x, 1.5x, 2x` (4 options)
- **REC** (Section 5): `0.5x, 1x, 1.5x, 2x` (4 options)

UX adds 0.75x and 1.25x. Non-blocking but should be reconciled.

---

## Verified Consistent (things that checked out)

### V1. DevLink3 Protocol Parameters
TCP port 50797 and TLS port 50796 are consistent across ROADMAP, DL3, and ARCH.

### V2. Binary Framing
The `0x49` magic byte, 2-byte big-endian length, and packet type hex codes (`002A0001`, `00300001`, `00300011`, `10300011`) are consistent between ROADMAP T1.3 and DL3 Sections 2-3.

### V3. SHA1 Authentication
The challenge-response flow (Phase 1 username, Phase 2 SHA1(challenge + 16-byte padded password)) is consistent between ROADMAP T1.3 and DL3 Section 5.

### V4. SMDR Default Port
Port 1150 is consistent across ROADMAP, SMDR Section 2, and TASK T1.6.

### V5. SMDR Buffer Size
3,000-record buffer is consistent across ROADMAP T1.6, SMDR Section 2, and TASK T1.6.

### V6. Database Table Names
Core table names (`calls`, `call_events`, `agents`, `agent_states`, `hunt_groups`, `recording_storage_pools`, `recording_rules`, `scorecard_templates`, `scorecard_responses`, `recording_share_links`) are consistent between ROADMAP and REC Section 9.

### V7. Docker Compose Services
The 7 services (app, postgres, redis, devlink3-sim, smdr-sim, mocksaml, minio) are consistent between ROADMAP and TASK.

### V8. Tech Stack
Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui + PostgreSQL 16 + Redis 7 + Socket.io + Drizzle ORM is consistent across ROADMAP, ARCH, UX, and TASK.

### V9. Opus Codec Choice
WAV-to-Opus compression at ~100KB/min is consistent across ROADMAP, REC, and ARCH.

### V10. wavesurfer.js for Playback
Consistent across ROADMAP, ARCH, REC, and UX.

### V11. SAML Library
`@node-saml/passport-saml` is consistent between ROADMAP and TASK.

### V12. Recording Rule Types
7 rule types are consistent between ROADMAP T4.6, REC Section 6, and IDS Section 1.7.3.

### V13. Skills Expertise Ranking
1-10 scale for agent skill expertise is consistent between ROADMAP T1.7 and TASK T1.7.

### V14. Session Timeouts
12-hour absolute timeout and 30-minute idle timeout are consistent between ROADMAP T2.2 and TASK T2.2.

### V15. Design Token Values (UX Internal Consistency)
The CSS custom properties in Section 10, the Tailwind config in Section 9, and the prose definitions in Section 1.1 of UX are all internally consistent with each other.

### V16. Delta3 XML Structure
The Detail record structure with Call, Party, and Target sections is consistent between DL3 Section 9 and ROADMAP T1.3 (18 Call fields, 26 Party fields, 14 Target fields).

---

**Summary:** 7 critical issues, 13 warnings, 6 recommendations, 16 verified-consistent items. The most urgent fixes are the agent state color palette (C1/C3), role naming (C4), and route paths (C6) -- these will cause implementation bugs if not resolved before coding begins.
