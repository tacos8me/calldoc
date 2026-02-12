# Dependency Graph & Parallel Execution Validation

> Generated: 2026-02-10 | 26 tasks, 143 sub-tasks, 564h base estimate, 4 teams x 2 engineers

---

## 1. Circular Dependencies

**Result: NO CYCLES FOUND.** All 26 dependency chains terminate at root nodes.

All 9 deepest chains walked (T3.6->T3.4->T3.2->T3.1->T2.2->T1.1, T4.6->T4.1->T1.5->T1.3->T1.1, T3.7->T2.5->T2.3->T1.2->T1.1, etc.). Every chain terminates at a root node (T1.1, T2.1, or T1.4).

**Note:** T1.4 (Simulator) blocks T1.5 only for testing, not as a hard dependency. Correctly modeled as soft.

---

## 2. Critical Path Analysis

### 2.1 Stated Critical Path: 156h

```
T1.1(8h) -> T1.2(16h) -> T1.3(24h) -> T1.5(16h) -> T3.2(20h) -> T3.4(40h) -> T3.6(32h) = 156h
```

**ISSUE: T1.3 does not depend on T1.2.** Per the dependency matrix, T1.3 depends only on T1.1. T1.5 depends on BOTH T1.2 and T1.3. So T1.2 and T1.3 run in parallel after T1.1:

```
                 T1.2 (16h) ─┐
T1.1 (8h) ──┤                ├─> T1.5 (16h) -> T3.2 (20h) -> T3.4 (40h) -> T3.6 (32h)
                 T1.3 (24h) ─┘
```

The binding constraint is T1.3 (24h > 16h), so the real chain through this segment is:

```
T1.1(8h) -> T1.3(24h) -> T1.5(16h) -> T3.2(20h) -> T3.4(40h) -> T3.6(32h) = 140h
```

But T3.2 also depends on T3.1, and T3.1 depends on T1.1 + T2.2. Is T3.1's path longer?

```
T1.1(8h) -> T2.2(12h) -> T3.1(12h) = 32h  (T3.2 earliest start via T3.1 path)
T1.1(8h) -> T1.3(24h) -> T1.5(16h) = 48h  (T3.2 earliest start via T1.5 path)
```

T1.5 path (48h) governs. T3.2 cannot start until hour 48.

**Corrected Critical Path #1 (Realtime):**
```
T1.1(8) -> T1.3(24) -> T1.5(16) -> T3.2(20) -> T3.4(40) -> T3.6(32) = 140h
```

### 2.2 Secondary Critical Path Recheck

Stated: T1.1(8) -> T1.2(16) -> T1.5(16) -> T4.1(24) -> T4.2(40) -> T4.3(48) -> T4.5(16) = 168h

**ISSUE: T4.2 does NOT block T4.3.** The dependency matrix says T4.2 blocks `T4.3(filter reuse)` but T4.3 formally depends on `T1.2, T4.4` -- not T4.2. The "filter reuse" note is a soft dependency (code reuse convenience, not a hard block). Removing T4.2 from the chain:

```
Path A: T1.1(8) -> T1.2(16) -> T4.3(48) = 72h  (T4.3 via T1.2)
Path B: T1.1(8) -> T4.4(16) -> T4.3(48) = 72h  (T4.3 via T4.4, but T4.4 depends only on T1.1)
Actually T4.4 depends on T1.1, so: T1.1(8) -> T4.4(16) = 24h start for T4.3
vs T1.1(8) -> T1.2(16) = 24h start for T4.3
Both converge at hour 24. T4.3 runs 24-72h. T4.5 at 72-88h.
```

```
Path C (T4.2 chain): T1.1(8) -> T1.3(24) -> T1.5(16) -> T4.1(24) -> T4.2(40) = 112h
```

**Revised longest paths:**

| # | Path | Total Hours |
|---|------|------------|
| 1 | T1.1 -> T1.3 -> T1.5 -> T3.2 -> T3.4 -> T3.6 | **140h** |
| 2 | T1.1 -> T1.3 -> T1.5 -> T4.1 -> T4.2 | **112h** |
| 3 | T1.1 -> T1.3 -> T1.5 -> T4.1 -> T4.6 (needs T2.5 too) | **112h** (T4.6=40h but starts at max(T4.1 end, T2.5 end)) |
| 4 | T1.1 -> T1.2 -> T4.3 -> T4.5 | **88h** |
| 5 | T1.1 -> T1.3 -> T1.5 -> T3.2 -> T3.5 | **92h** |
| 6 | T1.1 -> T1.3 -> T1.5 -> T3.2 -> T3.7 (needs T2.5) | **88h** |

**ACTUAL CRITICAL PATH: 140 hours (not 156h).** The stated 156h path double-counted T1.2 in series with T1.3 when they actually run in parallel.

---

## 3. Team Workload Balance

| Team | Mission | Total Hours | % of Total | vs Avg (141h) | Status |
|------|---------|------------|-----------|--------------|--------|
| Team 1 | Pipeline & Protocol | 112h | 19.9% | -20.6% | LIGHT |
| Team 2 | Auth & Users | 104h | 18.4% | -26.2% | **LIGHT (>20% under)** |
| Team 3 | Realtime & Dashboards | 164h | 29.1% | +16.3% | OK |
| Team 4 | Historical & Recording | 184h | 32.6% | +30.5% | **HEAVY (>20% over)** |

**Average: 141h per team. Total: 564h.**

### Imbalance Flags

| Flag | Detail | Recommendation |
|------|--------|----------------|
| Team 4 is 30.5% over average | 184h vs 141h avg | Move T4.3 Tier 3 reports (16h) to Teams 1+2 during Week 6 (already planned) |
| Team 2 is 26.2% under average | 104h vs 141h avg | Planned cross-team assist in Weeks 4-6 absorbs this. No action needed. |
| Team 3 on critical path | 140h chain runs through T3.4+T3.6 | Split T3.4 (40h) across both engineers. Already planned. |

**Effective balance after cross-team weeks 5-6:**

| Team | Core Work | Cross-Team Assist | Effective Total |
|------|-----------|-------------------|-----------------|
| Team 1 | 112h | +30h (Tier 3 queries, load testing) | ~142h |
| Team 2 | 104h | +36h (Tier 3 reports, QA, permission audits) | ~140h |
| Team 3 | 164h | +0h (fully loaded) | ~164h |
| Team 4 | 184h | -16h (offloaded Tier 3 reports) | ~168h |

Teams 3 and 4 remain heavier but within acceptable range given their work is highly parallelizable internally (widgets are independent, reports are independent, filters are independent).

---

## 4. Day 1 Start Tasks (Per Team)

| Team | Task | Hours | What Can Be Built | Mock Strategy |
|------|------|-------|-------------------|---------------|
| **Team 1** | T1.1 Project Scaffolding | 8 | Docker, Next.js, configs | N/A - foundation |
| **Team 1** | T1.4 DevLink3 Simulator | 20 | Standalone TCP server | Self-contained |
| **Team 2** | T2.1 SAML Integration | 20 | Full SAML flow against MockSAML | MockSAML Docker container |
| **Team 3** | T3.3 Dashboard Layout System | 16 | Grid layout, drag-drop, save/load | Hardcoded mock widget data |
| **Team 4** | T4.4 Report Rendering Engine | 16 | PDF/CSV/HTML renderers | Sample report data objects |

**5 tasks, 80h of work, all independent, all 4 teams productive from hour zero.**

### Additional tasks unlockable on Day 2 (after T1.1 completes ~8h):

| Team | Task | Hours | Unlocked By |
|------|------|-------|-------------|
| Team 1 | T1.2 Database Schema | 16 | T1.1 |
| Team 1 | T1.3 DevLink3 Client | 24 | T1.1 |
| Team 2 | T2.2 Session Management | 12 | T1.1 |

**Total Day 1-2 parallelism: 8 tasks across 4 teams.**

---

## 5. Bottleneck Tasks

### Tasks Ranked by Downstream Blockage

| Task | Direct Blocks | Transitive Blocks | Recommendation |
|------|--------------|-------------------|----------------|
| **T1.1** Scaffolding (8h) | 9 tasks | ALL 25 others | Already minimal at 8h. Ship by end of Day 1. |
| **T1.2** DB Schema (16h) | 8 tasks | 20+ tasks | **SPLIT recommended** (see below) |
| **T1.5** Ingestion Pipeline (16h) | 5 tasks (T3.2, T4.1, T4.2, T4.3, T1.6-rec) | 15+ tasks | **SPLIT recommended** (see below) |
| **T1.3** DevLink3 Client (24h) | 2 tasks (T1.5, T2.4) | 12+ transitively | High risk. Simulator (T1.4) mitigates. |
| **T2.5** Permission Middleware (12h) | 5 tasks (T1.7, T1.8, T2.6, T3.7, T4.6) | 8+ tasks | Already compact at 12h. |
| **T3.1** WebSocket Server (12h) | 5 tasks (T3.2, T3.4, T3.5, T3.6, T3.7) | 10+ tasks | Already compact at 12h. |

### Split Recommendations

**T1.2 Database Schema (16h) -- split into 2 phases:**

| Phase | Sub-tasks | Hours | Unblocks |
|-------|-----------|-------|----------|
| T1.2-A: Core tables | T1.2.1-T1.2.4 (ORM + calls + agents + users) | 10h | T2.3, T2.4, T4.1, T4.3 immediately |
| T1.2-B: System + reporting tables | T1.2.5-T1.2.8 (system, reporting, recording, indexes) | 6h | T1.6, T1.8, T4.6 (can wait) |

This lets Team 2 and Team 4 start database-dependent work ~6 hours earlier.

**T1.5 Ingestion Pipeline (16h) -- split into 2 deliverables:**

| Phase | Sub-tasks | Hours | Unblocks |
|-------|-----------|-------|----------|
| T1.5-A: Redis publisher | T1.5.1 + T1.5.4 (connect + publish to Redis) | 8h | T3.2 (realtime team unblocked) |
| T1.5-B: PostgreSQL writer | T1.5.2 + T1.5.3 (transform + batch write) | 8h | T4.1, T4.2 (historical team unblocked) |

Ship Redis path first so Team 3 is unblocked before the full DB writer is done.

---

## 6. Cross-Team Interface Contracts

### Contract 1: T1.1 -> All Teams (Project Foundation)

| Item | Specification |
|------|--------------|
| **Producer** | Team 1 |
| **Consumers** | Teams 2, 3, 4 |
| **Delivery** | End of Day 1 |
| **Contract** | `docker compose up` boots app + postgres + redis. `.env.example` with all vars. `tsconfig.json` paths configured. shadcn/ui initialized. |

### Contract 2: T1.2 -> Teams 2, 3, 4 (Database Types)

| Item | Specification |
|------|--------------|
| **Producer** | Team 1 |
| **Consumers** | Teams 2, 3, 4 |
| **Delivery** | End of Day 3 |
| **Contract** | Drizzle ORM schema in `src/lib/db/schema/`. Exported TypeScript types: `Call`, `CallEvent`, `Agent`, `AgentState`, `User`, `UserRole`, `HuntGroup`, `Extension`. Migration runner: `pnpm db:migrate`. |

### Contract 3: T1.5 -> Team 3 (Redis Real-time Events)

| Item | Specification |
|------|--------------|
| **Producer** | Team 1 (Ingestion Pipeline) |
| **Consumer** | Team 3 (WebSocket Server + State Engine) |
| **Delivery** | End of Week 2 |
| **Contract** | Redis pub/sub channels: `ipo:calls`, `ipo:agents`, `ipo:groups`. Message format (JSON): |

```typescript
// Channel: ipo:calls
interface CallEventMessage {
  type: 'call:created' | 'call:updated' | 'call:ended';
  callId: string;
  data: Partial<Call>;
  timestamp: string; // ISO 8601
}

// Channel: ipo:agents
interface AgentStateMessage {
  type: 'agent:state_changed';
  agentId: string;
  extension: string;
  previousState: AgentState;
  newState: AgentState;
  timestamp: string;
  callId: string | null;
}

// Channel: ipo:groups
interface GroupStatsMessage {
  type: 'group:stats_updated';
  groupId: string;
  callsWaiting: number;
  longestWait: number; // seconds
  agentsAvailable: number;
  agentsBusy: number;
}
```

### Contract 4: T2.2 -> Team 3 (Session Middleware)

| Item | Specification |
|------|--------------|
| **Producer** | Team 2 |
| **Consumer** | Team 3 (WebSocket auth handshake) |
| **Delivery** | End of Week 1 |
| **Contract** | Exported function `validateSession(cookie: string): Promise<Session \| null>`. Session type includes `userId`, `roles`, `groupAccess[]`. Cookie name: `calldoc.sid`. |

### Contract 5: T2.5 -> Teams 1, 3, 4 (Permission Guards)

| Item | Specification |
|------|--------------|
| **Producer** | Team 2 |
| **Consumers** | Teams 1, 3, 4 |
| **Delivery** | End of Week 2 |
| **Contract** | Exported guards: `requireAuth()`, `requireRole(role: UserRole)`, `requirePermission(perm: Permission)`. React hook: `useAuth(): { user, hasRole, hasPermission, isLoading }`. Middleware auto-redirects to `/login` if unauthenticated. |

### Contract 6: T3.2 -> T3.4/T3.5/T3.6 (State Engine API)

| Item | Specification |
|------|--------------|
| **Producer** | Team 3 (State Engine) |
| **Consumer** | Team 3 (Widgets, Timeline, Wallboard) -- internal but critical |
| **Delivery** | End of Week 2 |
| **Contract** | Zustand stores: `callStore.getState().calls` (Map), `agentStore.getState().agents` (Map). Hooks: `useActiveCalls()`, `useAgentStates()`, `useQueueStats(groupId)`, `useMetric(metricName)`. |

### Contract 7: T4.4 -> T4.3 (Report Render Interface)

| Item | Specification |
|------|--------------|
| **Producer** | Team 4 (Render Engine) |
| **Consumer** | Team 4 (Report Templates) -- internal |
| **Delivery** | End of Week 1 |
| **Contract** | `renderReport(data: ReportData, format: 'html' \| 'pdf' \| 'csv'): Promise<Buffer \| string>`. `ReportData` includes `{ title, subtitle, dateRange, columns: ColumnDef[], rows: Record<string,any>[], summary: Record<string,number> }`. |

### Contract 8: T1.2 + T4.1 -> T4.6 (Call-Recording Link)

| Item | Specification |
|------|--------------|
| **Producer** | Teams 1 + 4 |
| **Consumer** | Team 4 (Recording) |
| **Delivery** | End of Week 3 |
| **Contract** | `call_recordings` table has `call_id FK` to `calls.id`. Matching strategy: primary = callId field in recording filename, fallback = timestamp window + extension match. |

---

## 7. Sprint Unlock Schedule

### Sprint 1 (Week 1): Foundation

| Task | Team | Hours | Status | Unlocks |
|------|------|-------|--------|---------|
| T1.1 Scaffolding | 1 | 8 | START Day 1 | T1.2, T1.3, T2.2, T3.3(already started), T4.4(already started) |
| T1.4 Simulator | 1 | 20 | START Day 1 | Testing aid for T1.5 |
| T2.1 SAML | 2 | 20 | START Day 1 | T2.3 |
| T3.3 Dashboard Layout | 3 | 16 | START Day 1 | T3.4, T3.6 |
| T4.4 Report Engine | 4 | 16 | START Day 1 | T4.3, T4.5 |
| T1.2 DB Schema | 1 | 16 | START Day 2 | T1.5, T1.6, T1.7, T2.3, T2.4, T4.1, T4.3 |
| T1.3 DevLink3 Client | 1 | 24 | START Day 2 | T1.5, T2.4(discovery) |
| T2.2 Sessions | 2 | 12 | START Day 2 | T2.5, T3.1 |

**Sprint 1 capacity: 132h across 8 engineers. All teams fully engaged.**

### Sprint 2 (Week 2): Core Services

| Task | Team | Hours | Unlocked By | Unlocks |
|------|------|-------|------------|---------|
| T1.5 Ingestion Pipeline | 1 | 16 | T1.2 + T1.3 | T3.2, T4.1, T4.2 |
| T1.6 SMDR Service | 1 | 16 | T1.2 | T4.1(SMDR data) |
| T2.3 User/Roles | 2 | 16 | T1.2 + T2.1 | T2.4, T2.5, T2.6 |
| T2.4 Agent Mapping | 2 | 12 | T1.2 + T2.3 | T2.6 |
| T2.5 Permissions | 2 | 12 | T2.2 + T2.3 | T1.7, T1.8, T2.6, T3.7, T4.6 |
| T3.1 WebSocket Server | 3 | 12 | T1.1 + T2.2 | T3.2, T3.4, T3.5, T3.7 |
| T3.2 State Engine | 3 | 20 | T1.5 + T3.1 | T3.4, T3.5, T3.6, T3.7 |
| T4.1 Cradle-to-Grave | 4 | 24 | T1.2 + T1.5 | T4.2, T4.6 |
| T4.3 Reports (start Tier 1) | 4 | 16 | T1.2 + T4.4 | T4.5 |

### Sprint 3 (Week 3): Feature Build 1

| Task | Team | Hours | Unlocked By |
|------|------|-------|------------|
| T1.7 Skills Config | 2 | 16 | T1.2 + T2.5 |
| T1.8 System Config API | 1 | 12 | T1.2 + T2.5 |
| T2.6 Settings Pages | 2 | 16 | T2.3 + T2.5 |
| T3.4 Widgets (first 7) | 3 | 20 | T3.2 + T3.3 |
| T3.5 Agent Timeline | 3 | 24 | T3.2 |
| T4.2 Search/Filters | 4 | 40 | T4.1 |
| T4.3 Reports (Tier 1+2) | 4 | 32 | T1.2 + T4.4 |
| T4.6 Recording (start) | 4 | 20 | T1.2 + T2.5 + T4.1 |

### Sprint 4 (Week 4): Feature Build 2

| Task | Team | Hours | Unlocked By |
|------|------|-------|------------|
| T3.4 Widgets (remaining 7) | 3 | 20 | continuing |
| T3.6 Wallboard Builder | 3 | 32 | T3.3 + T3.4 |
| T3.7 Alerts Engine | 3 | 20 | T3.2 + T2.5 |
| T4.2 Filters (remaining) | 4 | -- | continuing |
| T4.6 Recording (playback) | 4 | 20 | continuing |
| T4.5 Report Scheduler | 4 | 16 | T4.3 + T4.4 |
| Team 1 | 1 | 40 | Integration testing, perf tuning |
| Team 2 | 2 | 40 | Cross-team auth/perm integration |

### Sprint 5-6 (Weeks 5-6): Completion, Polish & Release

| Activity | Teams | Key Deliverables |
|----------|-------|-----------------|
| Wallboard finish (templates, rotation) | 3 | T3.6 complete |
| Reports Tier 3 + recording finish | 1,2,4 | T4.3 Tier 3, T4.6 PCI/rules/scorecards |
| Cross-team integration + QA per role | All | End-to-end testing, security audit |
| Performance + production Docker | 1,3 | Load testing, optimized images |
| UI polish (error/empty/loading states) | 3 | All realtime views polished |

---

## 8. Risk Assessment

### Tier 1: High Impact, High Probability

| Risk | Task | Impact | Mitigation | Contingency |
|------|------|--------|------------|-------------|
| DevLink3 binary protocol parsing errors | T1.3 (24h) | **Blocks all live data** -- T1.5, T3.2, T4.1 all stall | C# reference code available. Simulator (T1.4) built in parallel for offline testing. 30% buffer. | Teams 3+4 continue with mock/static data indefinitely. Simulator emits events without needing real client. |
| 83 filters underestimated | T4.2 (40h) | Delays search functionality | Build 5 generic filter UI patterns first (multi-select, range, boolean, text, date). Most of 83 filters reuse these. | Ship with 25 Tier 1 filters for MVP. Add rest post-launch. |

### Tier 2: High Impact, Medium Probability

| Risk | Task | Impact | Mitigation | Contingency |
|------|------|--------|------------|-------------|
| T3.4 widget volume (14 types x 3h avg) | T3.4 (40h) | Delays wallboard builder (T3.6) which is on critical path | Split across both engineers. Many widgets share patterns (gauge, chart, table). | Ship with 8 core widgets. Add pie/marquee/clock/container later. |
| Recording compression (ffmpeg in Docker) | T4.6.4 | Audio pipeline failures | Test Opus encoding in Sprint 1 as a spike. Use pre-built ffmpeg static binary. | Serve uncompressed WAV (10x storage but functional). |
| SAML IdP-specific quirks | T2.1 | Login failures with customer IdP | MockSAML covers happy path. Document known Okta/AzureAD/OneLogin differences. | Budget 2-3 days of IdP debugging per customer deployment. |

### Tier 3: Medium Impact, Low Probability

WebSocket scale (T3.1/T3.2), call_events table growth (T1.2), and report template volume (T4.3) are all mitigated by existing design: Redis adapter + 100ms batching, monthly partitioning, and tiered report priority respectively.

### Cross-Team Risk Matrix

| If This Slips... | These Teams Are Blocked... | Max Wait Before Mock Workaround |
|---|---|---|
| T1.1 (Day 1) | All teams | 0 days -- cannot proceed without scaffolding |
| T1.2 (Day 3) | Teams 2, 3, 4 | 1 day -- can mock DB types temporarily |
| T1.5 (Week 2) | Team 3 (live data), Team 4 (historical queries) | 3 days -- mock Redis events / seed DB |
| T2.2 (Week 1) | Team 3 (WebSocket auth) | 2 days -- skip auth on WS in dev mode |
| T2.5 (Week 2) | Teams 1, 3, 4 (guarded routes) | 3 days -- stub `requireAuth` to pass-through |

---

## Summary

| Metric | Stated | Validated |
|--------|--------|-----------|
| Critical path | 156h | **140h** (T1.2 and T1.3 parallel, not serial) |
| Secondary critical path | 168h | **112h** (T4.2 -> T4.3 is soft dep, not hard) |
| Circular dependencies | None claimed | **Confirmed: zero cycles** |
| Day 1 start tasks | 5 | **Confirmed: 5 tasks, 80h** |
| Worst team imbalance | Not stated | **Team 4 at +30.5%** (mitigated by cross-team help) |
| Highest-risk task | T1.3 DevLink3 | **Confirmed** -- blocks 12+ downstream tasks |
| Cross-team contracts | 8 hand-offs | **8 contracts defined with typed interfaces** |
