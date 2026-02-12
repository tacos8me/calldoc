# Build Readiness Audit
## CallDoc - 4-Team Parallel Build Validation
**Audit Date:** 2026-02-10
**Auditor:** Build-Readiness Validator
**Scope:** All 10 spec files + reference code + project scaffolding state

---

## Overall Verdict: 7.3 / 10 -- Buildable with Prep Work

The spec suite is unusually thorough for a pre-build project. Most teams can start coding
core logic within 1-2 days if the scaffolding blockers below are resolved first. The gaps
are concentrated in missing runnable project files (no package.json, no docker-compose.yml,
no config files exist yet) and a handful of under-specified integration seams.

---

## Team 1: Protocol & Data Pipeline -- Readiness Score: 8/10

The DevLink3 and SMDR specs are the strongest in the entire project. The C# reference
implementation plus the binary-level protocol spec give a developer everything needed.

### BLOCKER

1. **No project scaffolding files exist.** Zero of the files listed in PROJECT_ROADMAP.md
   Section "File Structure" have been created: no `package.json`, no `docker-compose.yml`,
   no `tsconfig.json`, no `.env.example`, no `Dockerfile`, no `drizzle.config.ts`, no
   `next.config.ts`, no `tailwind.config.ts`. Team 1 owns T1.1 and is blocked on Day 1
   until someone authors these. The specs describe what should be in them but do not provide
   copy-pasteable file contents.

2. **No Drizzle ORM schema file.** The DB schema in PROJECT_ROADMAP.md is described as
   table names with column comments (e.g., `calls -- Master call record`). There are no
   actual Drizzle `pgTable()` definitions with column types, constraints, defaults, indexes,
   or foreign keys. A developer must reverse-engineer ~35 tables from narrative descriptions
   and scattered TypeScript interfaces. Recording_Integration_Spec.md has raw SQL but uses
   generic types. This will consume 2-3 days of design work before migrations can run.

### GAP

3. **Redis pub/sub channel payload schemas undefined.** The specs name channels
   (`ipo:calls`, `ipo:agents`, `ipo:groups`, `agent-states`, `call-events`, `queue-stats`,
   `alerts`) but never define the exact JSON payload structure published to each channel.
   COMPONENT_ARCHITECTURE.md shows Socket.io events (`call:update`, `agent:state`) with
   partial shapes, but the Redis-layer payload (what the connector publishes vs. what
   Socket.io re-emits) is not specified. Developers will have to invent the schema.

4. **Socket.io room/namespace strategy ambiguous.** T3.1 says rooms are `agent:{id}` and
   `group:{id}`, but COMPONENT_ARCHITECTURE.md shows flat channels (`agent-states`,
   `call-events`). The spec does not clarify whether Socket.io uses namespaces, rooms, or
   both, nor how a client subscribes to a specific agent or group stream.

5. **Delta3 XML: missing sample payloads for CallLost, LinkLost, AttemptReject.** The spec
   provides one full `<Detail>` XML sample (excellent) but only names the other three record
   types without showing their XML structure. The C# reference code may help, but the spec
   should include samples for each type.

6. **3-byte length encoding for packets > 0x7FFF.** The spec mentions this exists but
   provides no details on the encoding format. The C# reference code will need to be
   reverse-engineered for this edge case.

7. **SMDR TCP push vs. pull mode ambiguity.** The spec says IP Office acts as TCP client
   (push) but also mentions "IP Office accepts inbound connections" (pull) when SMDR IP is
   0.0.0.0. The connector service needs to support both, but which mode is the default
   expectation for the simulator? Not specified.

8. **SMDR simulator not specified.** The DevLink3 simulator has detailed scenario
   descriptions (T1.4). There is no equivalent specification for the SMDR simulator beyond
   a one-line mention in the Docker Compose services list.

### MINOR

9. **DevLink3 TLS certificate handling not detailed.** The spec says TLS port 50796
   requires a certificate "of at least medium security" but does not specify whether the
   client needs to present a cert, accept self-signed certs, or how to configure the TLS
   context in Node.js.

10. **Keepalive interval not specified.** Test packets are described but no recommended
    interval (e.g., every 30s, 60s) is given.

11. **Reconnection backoff parameters not defined.** "Exponential backoff" is mentioned but
    no concrete values (initial delay, max delay, jitter, max retries).

---

## Team 2: Core UI & Real-time -- Readiness Score: 7/10

The UI specs (FRONTEND_UX_SPEC.md) are exceptionally detailed for visual design -- colors,
typography, spacing, animations, and all 14 widget types are pixel-specified. The gap is in
executable configuration and component wiring.

### BLOCKER

12. **No package.json with dependency list.** The specs reference ~20 npm packages
    (next, react, typescript, tailwindcss, @shadcn/ui, zustand, @tanstack/react-query,
    @tanstack/react-table, @tanstack/react-virtual, socket.io-client, recharts,
    react-grid-layout, nuqs, wavesurfer.js, framer-motion, lucide-react, drizzle-orm,
    @react-pdf/renderer, exceljs, nodemailer, etc.) but no package.json exists with pinned
    versions. Developers will waste time guessing compatible version combinations.

13. **No tailwind.config.ts with design token mapping.** FRONTEND_UX_SPEC.md defines 50+
    CSS custom properties and design tokens (--bg-base, --text-primary, --status-success,
    etc.) but there is no tailwind.config.ts that maps these into Tailwind's `extend` config.
    The spec shows raw hex values but not the Tailwind utility class names to use.

### GAP

14. **react-grid-layout breakpoint configuration incomplete.** The spec says 12 columns,
    80px row height, 16px margin, and responsive breakpoints at 1920, 1280, 768. But the
    actual `breakpoints` and `cols` objects for react-grid-layout (e.g.,
    `{ lg: 1280, md: 768, sm: 480 }` with `{ lg: 12, md: 8, sm: 6 }`) are not provided.

15. **Zustand store definitions are illustrative, not copy-pasteable.** The store code in
    COMPONENT_ARCHITECTURE.md uses pseudo-TypeScript (`create({ calls: Map<string, Call> })`)
    not real Zustand API calls (`create<State>()((set) => ({...}))`). A developer must
    rewrite these from scratch.

16. **Sidebar nav links: icon names not specified.** The sidebar wireframe in
    FRONTEND_UX_SPEC.md shows `[icon] Dashboard`, `[icon] Agent Timeline`, etc., but does
    not name the specific Lucide icon for each nav item (e.g., `LayoutDashboard`, `Users`,
    `Phone`, `BarChart3`).

17. **Badge logic for sidebar items undefined.** INTERACTION_DESIGN_SPEC.md says Recordings
    shows unscored count and Admin shows pending items, but does not specify the API endpoint
    or Socket.io event that provides these counts.

18. **Default dashboard layouts per role not defined.** The spec says "default layouts per
    role (supervisor default, agent default)" but never specifies which widgets go where in
    the default layouts. A developer has no guidance on what a new supervisor sees.

19. **Widget data binding: metric key catalog missing.** Widgets reference `metric` as a
    string config key (e.g., "calls in queue") but there is no enumeration of valid metric
    keys and their data sources. The 70+ realtime metrics from Chronicall_Realtime_UI_Specs
    are listed but not mapped to a machine-readable key system.

### MINOR

20. **Next.js custom server setup for Socket.io not detailed.** The spec says "Socket.io
    server integrated with Next.js custom server" but Next.js App Router does not natively
    support custom servers well. No guidance on whether to use `instrumentation.ts`,
    `server.ts`, or a separate process.

21. **nuqs version compatibility.** The URL state examples use nuqs API (`useQueryState`)
    but do not specify which nuqs version (v1 vs v2 have different APIs).

---

## Team 3: Historical & Analytics -- Readiness Score: 7/10

The Cradle-to-Grave column list (40+) and filter definitions (83) are extremely well
documented in the Chronicall research specs. The report templates are listed with tier
priorities. The gaps are in aggregation SQL and filter operator semantics.

### BLOCKER

22. **Report SQL aggregation logic not specified.** 32 report templates are listed with
    names and brief descriptions, but zero reports include the actual SQL query, Drizzle
    query builder code, or pseudocode for their aggregation logic. For example, "Agent
    Performance Summary" says "calls handled, talk time, answer rate, idle time, SL" but
    does not define: which tables to join, how to compute "answer rate" (numerator/
    denominator), what "SL" means mathematically (threshold, time window), or how to group
    by time interval. The metric definitions in chronicall-metric-definitions.md provide
    English definitions but not SQL. This is 48 hours of estimation for Team 4 alone.

### GAP

23. **C2G table column definitions missing data types and sort rules.** The
    Chronicall_Cradle_to_Grave_UI_Spec.md lists 40+ columns with descriptions, but many
    lack explicit data types. Duration columns say "Duration" without specifying whether
    stored as integer seconds, interval, or formatted string. Sort behavior for composite
    columns (e.g., "Call Key" = start/end + Call ID) is not defined.

24. **Filter operator semantics for bracket notation.** T4.2.4 mentions "range bracket
    notation [a..b], (a..b)" for duration filters but does not define what `[` vs `(`
    means (inclusive vs exclusive) or how the UI renders this. This is a novel interaction
    pattern not explained anywhere.

25. **83 filters listed but valid option values missing for select-type filters.** Filters
    like "Call Direction" (select) are clear, but "Event Type" (select from what list?),
    "Final Event" (which event types are valid?), and "Role" (what roles exist?) do not
    enumerate their option sets. The 19 base + 14 contact center event types are listed in
    PROJECT_ROADMAP.md T1.3 but not cross-referenced to the filter spec.

26. **Report scheduling cron expression format.** T4.5 says "daily, weekly, monthly" with
    time of delivery but does not specify whether node-cron receives a standard cron string
    or a custom schedule object. The ReportSchedule TypeScript interface uses
    `frequency`/`time`/`dayOfWeek` fields which is clear enough, but the cron translation
    layer is not documented.

27. **Email template for scheduled reports.** The spec says "email delivery via SMTP" but
    provides no email template design (subject line format, body content, branding). The
    FRONTEND_UX_SPEC.md covers every pixel of the web UI but zero email templates.

28. **Report chart type mapping to report templates.** Each report "supports chart
    visualization (bar, line, pie where appropriate)" but the spec never states which chart
    type is appropriate for which report. Is "Agent Performance Summary" a bar chart or
    a table-only report? Developer must guess.

### MINOR

29. **Export format details for XLSX.** The spec mentions "exceljs" for Excel export but
    does not specify sheet naming, cell formatting rules, or whether charts are embedded.

30. **Pagination cursor vs offset.** API routes return `{ data, meta: { total, page, limit,
    pageCount } }` which implies offset pagination. For C2G with potentially millions of
    rows, cursor-based pagination would be more performant. Not discussed.

---

## Team 4: Recording & Admin -- Readiness Score: 6/10

The recording pipeline has the most gaps. The spec describes the desired end state well but
leaves critical implementation details unspecified. Admin pages are described at a high
level but lack form-level field specifications.

### BLOCKER

31. **Waveform peak generation algorithm not specified.** The spec says wavesurfer.js should
    fetch peaks from `/api/recordings/:id?peaks=true` for fast initial render, but never
    describes how peaks are generated: sample window size, samples per pixel, max/min/RMS
    calculation, number of peaks to generate, when generation happens (on ingest? on first
    request?), or where peaks are stored (DB JSON column? separate file?).

32. **Recording compression pipeline tooling.** T4.6.4 says "WAV -> Opus (OGG container,
    ~100KB/min), ffmpeg or @FFmpeg/ffmpeg" but does not specify: which approach to use
    (spawn ffmpeg binary vs. WASM @FFmpeg/ffmpeg), the exact ffmpeg command line arguments
    (bitrate, sample rate, channels, codec params), or whether ffmpeg is included in the
    Docker image. The Dockerfile does not exist yet.

33. **FTP/SFTP polling configuration not specified.** T4.6.1 says "poll Avaya VM Pro VRL
    directory" but does not specify: polling interval, file naming pattern to match, how to
    detect new vs. already-ingested files (filename tracking? modification time?), what
    happens to files after download (delete source? rename?), or how to handle partial
    writes from the Avaya side.

### GAP

34. **Scorecard template builder: question schema not defined.** The spec says
    `questions_json` in the DB and mentions Yes/No, Scale 1-10, and Free-form text question
    types. But the JSON schema for `questions_json` is not defined. What does a question
    object look like? Fields? Ordering? Grouping into categories? Weights? The ScoreCategory
    interface in COMPONENT_ARCHITECTURE.md shows weight + criteria, but the template builder
    that creates these structures is not specified.

35. **SAML attribute mapping details.** T2.1 says "Attribute mapping: email, firstName,
    lastName, groups" but does not specify the exact SAML assertion attribute names (e.g.,
    `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` vs. `email` vs.
    `urn:oid:0.9.2342.19200300.100.1.3`). Real SAML implementations break on this. The
    spec should provide the expected attribute names for Okta specifically.

36. **SAML SP metadata generation.** The spec mentions GET `/auth/saml/metadata` but does
    not define the SP entity ID format, assertion consumer service URL pattern, or
    NameID format to request. These are required before Okta IdP can be configured.

37. **Admin CRUD form field specifications missing.** The INTERACTION_DESIGN_SPEC.md
    describes admin pages at workflow level (e.g., "Add User form: name, email, role,
    mapped extension, initial password") but does not provide: field validation rules
    (email regex, password complexity, name max length), required vs. optional fields,
    dropdown option sources, or error message text. The SystemSettings page lists
    DevLinkConfigForm fields (host, port, username, password) but no validation (port
    range? host format?).

38. **Recording rules engine: rule evaluation order and conflict resolution.** The spec
    says rules have "priority" and 7 types, but does not specify: does a higher priority
    number mean more important or less? What happens when two rules conflict (e.g., "Record
    all inbound" at 100% and "Record Agent X" at 50%)? First match wins? Most specific
    wins? Highest recording percentage wins?

39. **PCI auto-resume timeout value.** The spec says "auto-resume timeout (configurable,
    e.g., 3 minutes)" but does not specify a default value or valid range.

40. **External listen link JWT structure.** The spec says "HMAC-signed JWT with TTL" but
    does not define the JWT claims (sub, aud, iat, exp, recording_id, snippet_start,
    snippet_end?), the HMAC secret management (env var? per-installation?), or the
    verification endpoint.

41. **MockSAML Docker image name.** T2.1.5 says "boxyhq/mock-saml" but this is a real
    product (BoxyHQ SAML Jackson). The spec does not clarify the Docker image tag, required
    env vars, or initial configuration to make it work with CallDoc.

### MINOR

42. **Storage pool migration ("Migrate" action).** The spec describes migrating recordings
    between pools as a background job with progress, but the job system (bull? pg-boss?
    simple setInterval?) is not specified.

43. **Recording file naming convention.** No specification for how compressed files are
    named or organized in storage (e.g., `{year}/{month}/{day}/{recording_id}.opus`?).

44. **Local admin fallback auth.** The login flow mentions a "Collapsible Admin Login
    section" with username/password, but the password hashing algorithm (bcrypt? argon2?),
    default admin account seeding, and password reset flow are not specified.

---

## Missing Project Scaffolding

None of the following files exist in the repository. All are required before any team can
run `docker compose up` or `npm run dev`:

| File | Status | Notes |
|------|--------|-------|
| `package.json` | MISSING | ~20 dependencies referenced in specs but no versions pinned |
| `tsconfig.json` | MISSING | Strict mode mentioned, paths aliases defined in spec |
| `next.config.ts` | MISSING | Custom server for Socket.io, env vars, redirects |
| `tailwind.config.ts` | MISSING | 50+ design tokens need mapping to Tailwind extend |
| `docker-compose.yml` | MISSING | 7 services defined in spec but no YAML exists |
| `docker-compose.dev.yml` | MISSING | Dev overrides for simulator, MockSAML, MinIO |
| `Dockerfile` | MISSING | Multi-stage build referenced but not authored |
| `.env.example` | MISSING | Env schema referenced but not documented |
| `drizzle.config.ts` | MISSING | ORM config for PostgreSQL connection |
| `postcss.config.js` | MISSING | Required by Tailwind CSS |
| `components.json` | MISSING | Required by shadcn/ui CLI |
| `src/` directory | MISSING | Entire source tree does not exist |

---

## Recommended Pre-Build Actions

Complete these in order before the 4-team build begins. Estimated: 1-2 days for one
senior engineer, or 4-6 hours if split across Team 1 lead + UI lead.

### P0 -- Do Before Anything Else (Day 0)

1. **Create `package.json` with all dependencies and pinned versions.** Include: next@14,
   react@18, typescript@5, tailwindcss@3, @shadcn/ui (init), zustand, @tanstack/react-query,
   @tanstack/react-table, @tanstack/react-virtual, socket.io + socket.io-client,
   recharts, react-grid-layout, nuqs, wavesurfer.js, framer-motion, lucide-react,
   drizzle-orm + drizzle-kit + @drizzle-team/pg, @node-saml/passport-saml,
   @react-pdf/renderer, exceljs, nodemailer, node-cron, ssh2-sftp-client, ioredis, nuqs.

2. **Create `docker-compose.yml` + `docker-compose.dev.yml`** from the service definitions
   in PROJECT_ROADMAP.md. Include health checks, volume mounts, network definitions, and
   env var references.

3. **Create `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `drizzle.config.ts`,
   `.env.example`, `Dockerfile`** as runnable files. The tailwind config must map all 50+
   design tokens from FRONTEND_UX_SPEC.md Section 1.1.

4. **Run `npx shadcn@latest init`** and configure the base component library.

5. **Create the `src/` directory structure** as specified in PROJECT_ROADMAP.md.

### P1 -- Do During Day 1 (Parallel with Team Ramp-up)

6. **Author complete Drizzle ORM schema files** for all ~35 tables. Use the table lists
   from PROJECT_ROADMAP.md, column names from Chronicall_Cradle_to_Grave_UI_Spec.md, and
   TypeScript interfaces from COMPONENT_ARCHITECTURE.md Section 7 to derive column types,
   constraints, and foreign keys. This is the highest-effort pre-build task.

7. **Define Redis pub/sub payload schemas** as TypeScript interfaces. Create a shared
   `types/events.ts` file that both the connector (publisher) and Socket.io server
   (subscriber) import. Document channel names and their payloads.

8. **Define Socket.io event contract** -- a single file listing every event name, its
   direction (server->client, client->server), its payload type, and the room/namespace
   strategy. Resolve the ambiguity between `ipo:calls` Redis channels and `call:update`
   Socket.io events.

9. **Create SMDR simulator spec** parallel to the DevLink3 simulator spec. Define at
   minimum: sample CSV records for each scenario, TCP push behavior, continuation record
   sequences.

### P2 -- Do During Week 1 (As Teams Build)

10. **Write SQL pseudocode for the top 8 MVP reports.** For each report in T4.3 Tier 1,
    provide: the Drizzle query pattern, the tables joined, the aggregation formula, and
    sample output rows. This unblocks Team 4's report work by 2+ weeks.

11. **Define the scorecard template JSON schema** and provide 2-3 example templates in the
    seed data.

12. **Specify the ffmpeg compression command** for WAV-to-Opus transcoding, including
    bitrate (e.g., 24kbps mono), sample rate (16kHz or 48kHz), and whether to add ffmpeg
    to the Dockerfile via `apt-get` or use the WASM build.

13. **Document SAML attribute names for Okta** and provide a working MockSAML
    docker-compose snippet with pre-configured users.

14. **Specify default dashboard widget layouts** for supervisor and agent roles -- which
    widgets, which grid positions, which default metrics bound.

---

## Summary Scores

| Team | Score | Verdict |
|------|-------|---------|
| Team 1: Protocol & Pipeline | 8/10 | Strong. Protocol specs are production-grade. Blocked only by missing scaffolding (fixable in hours). |
| Team 2: Core UI & Real-time | 7/10 | Good. Visual design spec is best-in-class. Needs executable config files and clearer component wiring. |
| Team 3: Historical & Analytics | 7/10 | Good. Column and filter specs are comprehensive. Report aggregation logic is the critical gap. |
| Team 4: Recording & Admin | 6/10 | Adequate. End state described well but implementation pipeline details (peaks, ffmpeg, FTP, scorecards) have multiple holes. |
| **Weighted Average** | **7.3/10** | **Buildable after 1-2 days of pre-build prep.** |
