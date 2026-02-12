# CallDoc Frontend UI/UX Specification
## Comprehensive Design System & Component Architecture

**Version**: 1.0
**Stack**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
**Design Philosophy**: Data-dense, minimal, elegant. Inspired by Linear, Vercel Dashboard, and Raycast -- dark-first, crisp typography, purposeful motion, zero visual noise.

---

## 1. Design System Foundation

### 1.1 Color Palette

#### Dark Theme (Primary -- Default)

```
Background Layers:
  --bg-base:          #09090B    (zinc-950 -- deepest background, page body)
  --bg-surface:       #18181B    (zinc-900 -- card surfaces, sidebars)
  --bg-elevated:      #27272A    (zinc-800 -- hover states, elevated cards)
  --bg-overlay:       #3F3F46    (zinc-700 -- modals overlay, dropdown bg)

Borders:
  --border-default:   #27272A    (zinc-800 -- subtle dividers)
  --border-strong:    #3F3F46    (zinc-700 -- input borders, focused elements)
  --border-focus:     #6366F1    (indigo-500 -- focus rings)

Text:
  --text-primary:     #FAFAFA    (zinc-50 -- headings, primary content)
  --text-secondary:   #A1A1AA    (zinc-400 -- labels, descriptions, metadata)
  --text-tertiary:    #71717A    (zinc-500 -- placeholders, disabled text)
  --text-inverse:     #09090B    (zinc-950 -- text on bright backgrounds)

Brand Accent:
  --accent-primary:   #6366F1    (indigo-500 -- primary buttons, links, active states)
  --accent-hover:     #818CF8    (indigo-400 -- hover on accent elements)
  --accent-subtle:    #6366F114  (indigo-500 at 8% -- accent bg tints)
  --accent-ring:      #6366F140  (indigo-500 at 25% -- focus ring glow)
```

#### Light Theme (Secondary -- User Toggle)

```
Background Layers:
  --bg-base:          #FFFFFF
  --bg-surface:       #FAFAFA    (zinc-50)
  --bg-elevated:      #F4F4F5    (zinc-100)
  --bg-overlay:       #E4E4E7    (zinc-200)

Borders:
  --border-default:   #E4E4E7    (zinc-200)
  --border-strong:    #D4D4D8    (zinc-300)
  --border-focus:     #6366F1    (indigo-500)

Text:
  --text-primary:     #09090B    (zinc-950)
  --text-secondary:   #52525B    (zinc-600)
  --text-tertiary:    #A1A1AA    (zinc-400)
  --text-inverse:     #FAFAFA    (zinc-50)
```

#### Status Color System

These colors are used for agent states, call events, alerts, thresholds, and system health. Each color has a base (for fills/bars), a muted variant (for background tints), and a text-safe variant.

```
Semantic Status:
  --status-success:       #22C55E    (green-500 -- healthy, connected, answered)
  --status-success-muted: #22C55E1A  (green-500 at 10%)
  --status-warning:       #EAB308    (yellow-500 -- caution, approaching threshold)
  --status-warning-muted: #EAB3081A  (yellow-500 at 10%)
  --status-danger:        #EF4444    (red-500 -- critical, down, abandoned)
  --status-danger-muted:  #EF44441A  (red-500 at 10%)
  --status-info:          #3B82F6    (blue-500 -- informational)
  --status-info-muted:    #3B82F61A  (blue-500 at 10%)
```

### 1.2 Typography

**Font Stack**:
- **Sans-serif (UI)**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Monospace (Data/Durations)**: `"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace`

Load Inter via `next/font/google` for optimal performance. Load JetBrains Mono as a secondary font for data displays.

**Type Scale** (based on a 1.250 ratio, rounded to clean values):

| Token            | Size   | Weight | Line Height | Letter Spacing | Usage                          |
|------------------|--------|--------|-------------|----------------|--------------------------------|
| `display-lg`     | 48px   | 700    | 1.1         | -0.025em       | Wallboard hero numbers         |
| `display-md`     | 36px   | 700    | 1.15        | -0.02em        | Wallboard widget values        |
| `display-sm`     | 28px   | 600    | 1.2         | -0.015em       | Dashboard KPI numbers          |
| `heading-xl`     | 24px   | 600    | 1.25        | -0.01em        | Page titles                    |
| `heading-lg`     | 20px   | 600    | 1.3         | -0.01em        | Section headings               |
| `heading-md`     | 16px   | 600    | 1.4         | -0.005em       | Card titles, widget headers    |
| `heading-sm`     | 14px   | 600    | 1.4         | 0              | Sidebar section labels         |
| `body-lg`        | 16px   | 400    | 1.5         | 0              | Primary body text              |
| `body-md`        | 14px   | 400    | 1.5         | 0              | Default UI text, table cells   |
| `body-sm`        | 13px   | 400    | 1.45        | 0              | Compact table cells, metadata  |
| `caption`        | 12px   | 500    | 1.4         | 0.01em         | Labels, badges, timestamps     |
| `overline`       | 11px   | 600    | 1.4         | 0.06em         | Uppercase section labels       |
| `mono-lg`        | 16px   | 500    | 1.5         | 0              | Duration displays              |
| `mono-md`        | 14px   | 500    | 1.5         | 0              | Table data, call IDs           |
| `mono-sm`        | 12px   | 500    | 1.4         | 0              | Timestamps, technical data     |

### 1.3 Spacing System

Base unit: **4px**. All spacing values are multiples of 4.

| Token    | Value | Usage                                        |
|----------|-------|----------------------------------------------|
| `space-0`  | 0px   | --                                           |
| `space-0.5`| 2px   | Tight icon gaps                              |
| `space-1`  | 4px   | Inline element gaps, tight padding           |
| `space-1.5`| 6px   | Badge padding, compact button padding        |
| `space-2`  | 8px   | Default element spacing, input padding-x     |
| `space-3`  | 12px  | Card inner padding, section gaps             |
| `space-4`  | 16px  | Standard card padding, column gaps           |
| `space-5`  | 20px  | Section padding                              |
| `space-6`  | 24px  | Page margin, large gaps                      |
| `space-8`  | 32px  | Section separators                           |
| `space-10` | 40px  | Page header height padding                   |
| `space-12` | 48px  | Large section breaks                         |
| `space-16` | 64px  | Sidebar width collapsed                      |
| `space-64` | 256px | Sidebar width expanded                       |

**Grid System**:
- Page layout: CSS Grid with `grid-template-columns`
- Dashboard grid: `react-grid-layout` with 12-column grid, `rowHeight: 80px`, `margin: [16, 16]`
- Wallboard grid: freeform absolute positioning (no grid snap) with optional snap-to-grid at 8px increments
- Content max-width: `1440px` for settings/form pages, full-width for dashboards and data tables

### 1.4 Elevation / Shadow System

Shadows are used sparingly in dark mode. The primary elevation mechanism is background color stepping (base -> surface -> elevated -> overlay). Shadows supplement for floating elements.

| Token           | Value                                                   | Usage                          |
|-----------------|---------------------------------------------------------|--------------------------------|
| `shadow-none`   | `none`                                                  | Flat inline elements           |
| `shadow-sm`     | `0 1px 2px rgba(0,0,0,0.3)`                            | Buttons, input fields          |
| `shadow-md`     | `0 4px 12px rgba(0,0,0,0.4)`                           | Cards, dropdowns               |
| `shadow-lg`     | `0 8px 24px rgba(0,0,0,0.5)`                           | Modals, popovers               |
| `shadow-xl`     | `0 16px 48px rgba(0,0,0,0.6)`                          | Command palette, full overlays |
| `shadow-glow`   | `0 0 0 1px var(--accent-primary), 0 0 16px var(--accent-ring)` | Focus ring accent glow   |

Light mode shadows use `rgba(0,0,0,0.08)`, `0.12`, `0.16`, `0.2` respectively.

### 1.5 Border Radius

| Token          | Value | Usage                                  |
|----------------|-------|----------------------------------------|
| `radius-none`  | 0px   | Full-width elements, tables            |
| `radius-sm`    | 4px   | Badges, tags, inline chips             |
| `radius-md`    | 6px   | Buttons, inputs, small cards           |
| `radius-lg`    | 8px   | Cards, dropdowns, tooltips             |
| `radius-xl`    | 12px  | Modals, large panels                   |
| `radius-2xl`   | 16px  | Feature cards, empty state boxes       |
| `radius-full`  | 9999px| Avatar circles, status dots, pills     |

### 1.6 Motion & Animation Principles

**Guiding Rules**:
1. All animation is purposeful -- it communicates state change, not decoration
2. Prefer opacity + transform (translate/scale) -- GPU-accelerated, never animate layout properties
3. Reduce motion when `prefers-reduced-motion: reduce` is set -- collapse all transitions to instant
4. Real-time data updates use spring-like easing for organic feel; UI interactions use ease-out

**Duration Scale**:

| Token              | Value  | Easing                          | Usage                                     |
|--------------------|--------|---------------------------------|-------------------------------------------|
| `duration-instant`   | 0ms    | --                              | Immediate feedback (active states)        |
| `duration-fast`      | 100ms  | `ease-out`                      | Button press, checkbox toggle, hover      |
| `duration-normal`    | 200ms  | `cubic-bezier(0.4, 0, 0.2, 1)` | Dropdowns, tooltips, tab switches         |
| `duration-smooth`    | 300ms  | `cubic-bezier(0.4, 0, 0.2, 1)` | Sidebar collapse, panel slide, card expand|
| `duration-slow`      | 500ms  | `cubic-bezier(0.4, 0, 0.2, 1)` | Page transitions, modal open/close        |
| `duration-counter`   | 800ms  | `cubic-bezier(0.16, 1, 0.3, 1)`| Numeric counter animations (spring)       |
| `duration-chart`     | 600ms  | `cubic-bezier(0.4, 0, 0.2, 1)` | Chart bar/line transitions                |

**Specific Animation Patterns**:
- **Page enter**: Fade in (opacity 0->1) + slide up (translateY 8px->0) at `duration-smooth`
- **Modal open**: Fade in + scale (0.97->1) at `duration-smooth`; backdrop fade 0->1 at `duration-normal`
- **Sidebar collapse**: Width transition at `duration-smooth` with content opacity crossfade
- **Row expand**: Max-height transition from 0 to auto (use `grid-template-rows: 0fr -> 1fr` trick) at `duration-smooth`
- **Number counter**: Animate from previous value to new value at `duration-counter` using spring easing. Use `requestAnimationFrame` with interpolation, not CSS transitions
- **Chart data update**: Bars/lines morph to new positions at `duration-chart` with ease-out
- **Toast enter**: Slide in from right (translateX 100%->0) at `duration-smooth`; exit slide out + fade
- **Skeleton pulse**: Infinite `@keyframes pulse` -- opacity 0.4->1->0.4 over 2s

---

## 2. Navigation & Layout

### 2.1 Sidebar Navigation

**Structure**: Fixed left sidebar, collapsible between expanded (256px) and collapsed (64px) states.

```
Expanded (256px):                    Collapsed (64px):
+----------------------------------+ +--------+
| [CallDoc Logo]  [Collapse <<]    | | [Logo] |
|                                  | |        |
| OVERVIEW                         | | [icon] |  <- Dashboard
|   [icon] Dashboard               | | [icon] |  <- Real-time
|                                  | | [icon] |  <- Calls
| REAL-TIME                        | | [icon] |  <- Reports
|   [icon] Agent Timeline          | | [icon] |  <- Wallboards
|   [icon] Group Timeline          | | [icon] |  <- Recordings
|                                  | |        |
| DATA                             | |--------|
|   [icon] Calls (C2G)            | | [icon] |  <- Settings
|   [icon] Reports                 | | [icon] |  <- Profile
|   [icon] Recordings             | |        |
|                                  | |        |
| WALLBOARDS                       | |        |
|   [icon] Wallboard Builder       | |        |
|                                  | |        |
|----------------------------------| |--------|
| SYSTEM (admin only)              | |        |
|   [icon] Settings                | |        |
|   [icon] Alerts                  | |        |
|                                  | |        |
|----------------------------------| |--------|
| [Avatar] John Smith              | | [Avtr] |
|   supervisor                     | |        |
+----------------------------------+ +--------+
```

**Sidebar Styling**:
- Background: `--bg-surface` (#18181B)
- Right border: 1px solid `--border-default` (#27272A)
- Section labels: `overline` type, `--text-tertiary` color, 12px top margin
- Nav items: `body-md` type, 36px height, `radius-md` (6px), 8px horizontal padding
- Nav item default: `--text-secondary` text, transparent background
- Nav item hover: `--bg-elevated` background, `--text-primary` text
- Nav item active: `--accent-subtle` background, `--accent-primary` text, left 2px accent border
- Icons: 20x20px Lucide icons, 12px gap to label text
- Collapse animation: 200ms ease-in-out, icon-only mode shows tooltip on hover with item labels
- User section at bottom: 56px height, separated by `--border-default` top border

**Collapse Behavior**:
- Click collapse button or press `[` key
- In collapsed mode, hovering a nav item shows a tooltip flyout (label + sub-items if any)
- Sidebar state persisted in `localStorage`

### 2.2 Top Bar

**Structure**: Fixed horizontal bar across the top, right of the sidebar. Height: 56px.

```
+--[Breadcrumbs]--------------------[Connection]--[Alerts]--[Theme]--[Avatar]--+
| Real-time > Agent Timeline           [*] Live    [bell 3]  [moon]  [JD]     |
+----------------------------------------------------------------------------+
```

**Elements (left to right)**:
1. **Breadcrumbs**: `caption` type, `--text-tertiary` for separators (`>`), `--text-secondary` for parent paths, `--text-primary` for current page. Max 3 levels. Clickable ancestors.
2. **Spacer**: flex-grow
3. **System Status Indicator**: Small colored dot + label.
   - Green dot + "Live" = DevLink3 connected, events flowing
   - Yellow dot + "Degraded" = Partial connectivity (e.g., SMDR connected but DevLink3 down)
   - Red dot + "Disconnected" = No connection to IP Office
   - Dot: 8px circle with matching color glow (box-shadow `0 0 6px` at 50% opacity)
   - Label: `caption` type, `--text-secondary`
4. **Notification Bell**: Lucide `Bell` icon, 20px. Badge count (if > 0) as red circle (18px, `--status-danger` bg, white text, `caption` type) overlapping top-right of icon. Click opens notification drawer (see Section 7.5).
5. **Theme Toggle**: Lucide `Moon` / `Sun` icon, 20px. Click toggles dark/light theme. Persisted in `localStorage` and `user_preferences` table.
6. **User Avatar**: 32px circle, initials on `--accent-primary` background or user photo. Click opens dropdown: Profile, Keyboard Shortcuts, Logout.

**Top Bar Styling**:
- Background: `--bg-surface`
- Bottom border: 1px solid `--border-default`
- Horizontal padding: 24px
- Items vertically centered

### 2.3 Page Layout Templates

#### Template A: Dashboard Grid
Used by: `/dashboard`, `/agent-timeline` (Live Column View)

```
+--------+--------------------------------------------------------+
|        | [Top Bar]                                              |
|  Side  |------------------------------------------------------|
|  bar   | [Page Header: Title + Actions]                        |
|        |------------------------------------------------------|
|        | +----------+ +----------+ +----------+ +----------+   |
|        | | Widget 1 | | Widget 2 | | Widget 3 | | Widget 4 |   |
|        | +----------+ +----------+ +----------+ +----------+   |
|        | +--------------------+ +----------------------------+ |
|        | | Widget 5 (2-col)   | | Widget 6 (2-col)           | |
|        | +--------------------+ +----------------------------+ |
|        | +-----------------------------------------------+     |
|        | | Widget 7 (full-width)                          |     |
|        | +-----------------------------------------------+     |
+--------+--------------------------------------------------------+
```

- Grid: `react-grid-layout`, 12 columns, 80px row height, 16px margin
- Page header: 48px height, contains page title (`heading-xl`) + action buttons (right-aligned)
- Content area: scrollable, 24px padding all sides
- Widgets are drag-and-drop repositionable when in edit mode

#### Template B: Data Table
Used by: `/calls` (Cradle-to-Grave), `/reports`, `/settings/users`

```
+--------+--------------------------------------------------------+
|        | [Top Bar]                                              |
|  Side  |------------------------------------------------------|
|  bar   | [Page Header: Title + Actions]                        |
|        | [Filter Bar / Search]                                 |
|        | [Summary Metrics Bar]                                 |
|        |------------------------------------------------------|
|        | [Table Header Row]                                    |
|        | [Table Row 1]                                         |
|        | [Table Row 2]                                         |
|        |   [Expanded Content]                                  |
|        | [Table Row 3]                                         |
|        | ...                                                    |
|        |------------------------------------------------------|
|        | [Pagination: Showing 1-50 of 2,341  < 1 2 3 ... 47 >]|
+--------+--------------------------------------------------------+
```

- Table container: full-width, no horizontal margin, 1px border-top and border-bottom
- Filter bar: 48px height, horizontal scroll if needed
- Summary bar: 44px height, `--bg-elevated` background, `body-sm` metrics with `mono-md` values
- Table: See Section 5.1 for full table design

#### Template C: Settings / Form
Used by: `/settings/*`, `/reports/schedules/new`

```
+--------+--------------------------------------------------------+
|        | [Top Bar]                                              |
|  Side  |------------------------------------------------------|
|  bar   | [Page Header: Title + Save Button]                    |
|        |------------------------------------------------------|
|        | +--Sidebar Nav--+ +------Content-----------------+    |
|        | | General       | | Section Heading              |    |
|        | | Connection    | | [Form fields...]             |    |
|        | | Alerts        | |                              |    |
|        | | Users         | | Section Heading              |    |
|        | | SAML          | | [Form fields...]             |    |
|        | +---------------+ +------------------------------+    |
+--------+--------------------------------------------------------+
```

- Two-column layout: 220px settings sidebar + flexible content area
- Settings sidebar: Vertical tabs, same styling as main sidebar nav items
- Content max-width: 720px for form fields
- Form sections separated by 32px gap + 1px `--border-default` divider
- Form labels: `body-sm` type, `--text-secondary`, 4px bottom margin
- Form inputs: 40px height, `--bg-elevated` background, 1px `--border-strong` border, `radius-md`

#### Template D: Fullscreen Wallboard
Used by: `/wallboards/:id/view`

```
+---------------------------------------------------------------+
| [Wallboard content fills entire viewport]                     |
|                                                               |
|   +--Widget--+  +--Widget--+  +--Widget--+                   |
|   |          |  |          |  |          |                    |
|   +----------+  +----------+  +----------+                    |
|                                                               |
|   +--Widget (large)-------+  +--Widget--+                    |
|   |                       |  |          |                    |
|   |                       |  +----------+                    |
|   +-----------------------+                                   |
|                                                               |
+---------------------------------------------------------------+
| [ESC to exit] [Auto-rotate: 30s] [Edit]        [timestamp]   |
+---------------------------------------------------------------+
```

- True fullscreen via `document.requestFullscreen()` or F11 mode
- No sidebar, no top bar
- Floating control bar at bottom: opacity 0 by default, opacity 1 on mouse movement, fades after 3s of inactivity
- Background: configurable per wallboard (solid color or uploaded image)
- Wallboard rotation: cycle through multiple wallboards at configurable interval (15s, 30s, 60s, 120s)

### 2.4 Responsive Breakpoints

| Breakpoint   | Width           | Layout Behavior                                     |
|--------------|-----------------|-----------------------------------------------------|
| `desktop-xl` | >= 1920px       | Full layout, sidebar expanded default               |
| `desktop`    | 1280px - 1919px | Full layout, sidebar collapsed default              |
| `tablet`     | 768px - 1279px  | Sidebar overlay (slide over content), simplified grid|
| `wallboard`  | Any (fullscreen)| No chrome, optimized font scaling, high contrast    |

**Tablet Adjustments**:
- Sidebar becomes an overlay drawer (slides in from left, 256px wide, semi-transparent backdrop)
- Dashboard grid: reduce to 8 columns
- Data tables: hide columns beyond the first 6, add horizontal scroll
- Navigation: hamburger menu icon in top-left of top bar

**Wallboard TV Mode** (designed for 1080p/4K wall-mounted displays):
- All font sizes scale up by 1.5x-2x based on viewport width using `clamp()`
- Widget values use `display-lg` (48px) minimum
- High-contrast colors -- text is pure white (#FFFFFF) on dark backgrounds
- No interactive elements visible (no hover states, no cursors needed)
- Status colors are brighter/more saturated for visibility at distance

### 2.5 Keyboard Shortcuts

Global shortcuts (work from any page):

| Shortcut       | Action                      |
|----------------|-----------------------------|
| `[`            | Toggle sidebar collapse (only when NOT in recording player; in recording player, `[` sets snippet start) |
| `Cmd/Ctrl + K` | Open command palette (search)|
| `Cmd/Ctrl + /` | Show keyboard shortcuts modal|
| `G then D`     | Go to Dashboard              |
| `G then A`     | Go to Agent Timeline         |
| `G then C`     | Go to Calls (C2G)           |
| `G then R`     | Go to Reports                |
| `G then W`     | Go to Wallboards             |
| `G then S`     | Go to Settings               |
| `Esc`          | Close modal/drawer/dropdown  |
| `?`            | Open shortcut reference      |

Page-specific shortcuts:

| Page           | Shortcut        | Action                        |
|----------------|-----------------|-------------------------------|
| Calls (C2G)    | `F`             | Toggle filter panel           |
| Calls (C2G)    | `/`             | Focus quick search            |
| Calls (C2G)    | `E`             | Export current view            |
| Agent Timeline  | `C`             | Toggle Column View            |
| Agent Timeline  | `L`             | Toggle Color Legend            |
| Dashboard       | `Shift + E`     | Toggle edit/layout mode       |
| Any Table       | `J` / `K`       | Move selection down/up        |
| Any Table       | `Enter`         | Expand selected row           |
| Any Table       | `Esc`           | Collapse expanded row         |

**Command Palette** (`Cmd+K`):
- Centered modal, 560px wide, 400px max height
- Search input at top (autofocused)
- Results grouped: Pages, Recent Calls, Agents, Reports, Actions
- Arrow keys to navigate, Enter to select, Esc to close
- Styling: `--bg-surface` background, `shadow-xl`, `radius-xl`

---

## 3. Dashboard & Wallboard Widget Design

### 3.1 Widget Card Design

**Style: Clean Cards with Subtle Depth** -- not glassmorphism (too decorative for data apps), not flat (needs visual hierarchy). Cards use background color stepping + thin borders for clean separation.

**Widget Card Anatomy**:
```
+--------------------------------------------------+
| [Drag Handle ::::] Widget Title     [... menu]   |  <- Header: 40px
|--------------------------------------------------|
|                                                  |
|                 Widget Content                   |  <- Body: flexible
|              (chart, number, table)              |
|                                                  |
|--------------------------------------------------|
| Last updated: 2s ago                   [i] info  |  <- Footer: 28px (optional)
+--------------------------------------------------+
```

**Card Styling**:
- Background: `--bg-surface` (#18181B)
- Border: 1px solid `--border-default` (#27272A)
- Border radius: `radius-lg` (8px)
- Shadow: `shadow-sm` on hover only (appears with `duration-fast` transition)
- Header: 40px height, 16px horizontal padding, bottom border 1px `--border-default`
- Header title: `heading-md` (16px, 600 weight), `--text-primary`
- Drag handle: 6 dots (2x3) icon in `--text-tertiary`, only visible in edit mode
- Three-dot menu: Lucide `MoreHorizontal`, opens dropdown with: Configure, Duplicate, Remove
- Footer (optional): 28px height, `caption` type, `--text-tertiary`, top border
- Body padding: 16px all sides

**Edit Mode vs. View Mode**:
- View mode: Cards are static, no drag handles, no resize handles. Three-dot menu hidden (appears on card hover).
- Edit mode: Blue dashed border on all cards (`--accent-primary`, 2px dashed), drag handles visible, resize handles (8px corner squares) visible, "Add Widget" floating button appears in empty grid areas.

### 3.2 Real-Time Widget Animations

**Numeric Counter Animation**:
When a metric value changes (e.g., calls in queue goes from 5 to 8):
1. Previous value starts animating toward new value using `requestAnimationFrame`
2. Duration: 400ms with ease-out easing
3. Numbers increment/decrement smoothly through intermediate values
4. Color flash: brief `--accent-subtle` background pulse if value increased, `--status-danger-muted` if threshold exceeded
5. Implementation: Custom `useAnimatedCounter(value)` hook using `useRef` for previous value tracking

**Chart Transitions**:
- Bar charts: bars grow/shrink to new heights at `duration-chart` (600ms)
- Line charts: points morph to new positions (use Recharts' `isAnimationActive` with 600ms duration)
- Pie charts: segments animate arc angles at `duration-chart`
- New data points slide in from the right edge

**Status Color Transitions**:
- When an agent state changes (e.g., Idle -> Talking), the status color transitions over `duration-normal` (200ms)
- A brief scale pulse (1.0 -> 1.02 -> 1.0) at `duration-fast` draws attention

**Connection Status Animation**:
- Green "Live" dot: subtle 3s infinite pulse animation (opacity 0.6 -> 1.0 -> 0.6)
- Red "Disconnected": faster pulse (1.5s) with higher contrast

### 3.3 Wallboard Builder Canvas

**Interaction Model**:

The wallboard editor is a freeform canvas (not grid-based like the dashboard). Widgets float at absolute positions.

```
+--[Toolbar]--------------------------------------------------+
| [Save] [Preview] [Undo] [Redo] | Snap: [8px v] | Zoom: 75% |
+----+----------------------------------------------------+---+
|    |                                                    | W |
| R  |          CANVAS (scrollable, zoomable)             | I |
| U  |                                                    | D |
| L  |     +--Widget--+                                   | G |
| E  |     |          |                                   | E |
| R  |     +----------+                                   | T |
| S  |                    +--Widget (selected)--+          |   |
|    |                    | [resize handles]     |         | P |
|    |                    +---------------------+          | A |
|    |                                                    | L |
|    |    [Align guides appear as blue dashed lines]      | E |
|    |                                                    | T |
|    |                                                    | T |
+----+----------------------------------------------------+ E |
                                                          +---+
```

**Canvas Behaviors**:
- **Zoom**: Ctrl + scroll wheel, or zoom dropdown (50%, 75%, 100%, 125%, 150%). Canvas renders at zoom level.
- **Pan**: Hold Space + drag, or scroll within the canvas viewport.
- **Snap to grid**: Configurable grid (8px, 16px, 32px, none). When enabled, widget positions and sizes snap to nearest grid point. Grid dots rendered at 6% opacity on canvas.
- **Alignment guides**: When dragging a widget near another widget's edge or center, a blue dashed guide line (#6366F1, 1px dashed) appears to aid alignment. Snaps at 4px proximity.
- **Multi-select**: Shift+click to select multiple widgets. Rubber-band selection by clicking empty canvas and dragging.
- **Keyboard**: Arrow keys nudge selected widget by 1px (or grid increment if snap enabled). Delete/Backspace removes selected. Cmd+D duplicates. Cmd+Z undo, Cmd+Shift+Z redo.

**Widget Palette** (right sidebar, 280px wide):
- Searchable list of widget types
- Each type shows: icon + name + brief description
- Drag from palette onto canvas to add (shows ghost preview while dragging)
- Categories: Data, Charts, Status, Decorative

**Widget Resize**:
- 8 resize handles: 4 corners (8x8px squares) + 4 edge midpoints (8x4 or 4x8 rectangles)
- Handles are `--accent-primary` fill, only visible when widget is selected
- Min size: 120px x 80px
- Max size: canvas bounds

**Ruler/Grid**:
- Optional pixel rulers along top and left edges (toggle in View menu)
- Grid overlay: dot pattern at every grid increment, very low opacity

### 3.4 Threshold Color Visualization

Widgets that display metrics with thresholds use a three-tier color system:

| Tier     | Color                  | Hex       | Condition Example          |
|----------|------------------------|-----------|----------------------------|
| Normal   | `--status-success`     | `#22C55E` | Calls in queue < 3         |
| Warning  | `--status-warning`     | `#EAB308` | Calls in queue 3-7         |
| Critical | `--status-danger`      | `#EF4444` | Calls in queue >= 8        |

**Color Transition Behavior**:
- When crossing a threshold, the value color transitions over `duration-normal` (200ms)
- Background tint changes: `--status-success-muted` -> `--status-warning-muted` -> `--status-danger-muted`
- At critical level: optional CSS animation -- slow pulse of background opacity (2s infinite)
- Gauge widgets: the gauge arc is segmented with gradient stops at threshold boundaries (green section -> yellow section -> red section)
- In wallboard fullscreen mode: widget border color also changes to match threshold tier

**Threshold Configuration UI** (in widget settings):
```
Thresholds:
  Warning when value  [>=]  [  5  ]    Color: [yellow swatch]
  Critical when value [>=]  [ 10  ]    Color: [red swatch]
  [ ] Enable pulsing animation at critical level
```

### 3.5 Widget Type Designs (All 14 Types)

#### 3.5.1 Title Value Widget
The most-used widget. Displays a single metric with its label.

```
+------------------------------------------+
| Calls in Queue                    [...] |  <- Header
|------------------------------------------|
|                                          |
|              12                          |  <- display-md, centered
|         Since 8:00 AM                    |  <- caption, --text-tertiary
|                                          |
+------------------------------------------+
```

- Value: `display-md` (36px) in wallboard, `display-sm` (28px) on dashboard
- Value color: dynamic based on threshold tier
- Time frame label: `caption`, `--text-tertiary`, centered below value
- Padding: 16px horizontal, 12px vertical in body

#### 3.5.2 Text Widget
Multiple metrics in a compact list format.

```
+------------------------------------------+
| Group Summary                     [...] |
|------------------------------------------|
| Calls Handled          47               |
| Avg Talk Time          3:42             |
| Service Level          94%              |
| Agents Online          12               |
+------------------------------------------+
```

- Each row: 32px height, label left-aligned (`body-sm`, `--text-secondary`), value right-aligned (`mono-md`, `--text-primary`)
- Alternate row backgrounds: transparent / `--bg-elevated` at 50% opacity
- Dividers: none (alternating backgrounds provide sufficient separation)

#### 3.5.3 Active Calls Widget
Live call list with three-column layout.

```
+------------------------------------------------------+
| Active Calls (8)                              [...] |
|------------------------------------------------------|
| John Smith (x481)  Talking 2:35  +1(555)123-4567    |
| Jane Doe (x482)    Ringing 0:12  +1(555)987-6543    |
| Bob Wilson (x485)  Hold    1:48  +1(555)456-7890    |
| Alice Chen (x490)  Talking 5:21  +1(555)321-0987    |
+------------------------------------------------------+
```

- Three columns: Agent (left), Event+Duration (center), External Party (right)
- Event column: colored dot (8px) matching event type color + event name + duration in `mono-sm`
- Duration: live-counting ticker (updates every second)
- Row height: 36px
- Scrollable if calls exceed widget height
- Empty state: centered "No active calls" in `--text-tertiary`

#### 3.5.4 Agent Box Widget
Individual agent status card.

```
+------------------------------------------+
| [Avatar] Sarah Johnson           [...] |
| Ext: 481  |  Sales, Support              |
|------------------------------------------|
|                                          |
|    [GREEN DOT]  Talking  2:35            |
|    +1(555)123-4567                       |
|                                          |
| Groups:                                  |
|   [*] Sales  [*] Support  [ ] Billing   |
+------------------------------------------+
```

- Avatar: 36px circle, top-left
- Agent name: `heading-md`, `--text-primary`
- Extension + groups: `body-sm`, `--text-secondary`
- Current state: Large colored dot (12px) + state name (`heading-lg`) + duration (`mono-md`)
- State color fills the dot and applies as subtle background tint
- Group list: checkmark = logged in (green), empty circle = logged out (gray)

#### 3.5.5 Group Box Widget
Queue summary with four fixed metrics.

```
+------------------------------------------+
| Sales Queue                       [...] |
|------------------------------------------|
|  Agents    Queued    Max Wait   Avg Wait |
|    12        3        4:32       2:15    |
|                                          |
|  [||||||||----]  SL: 87%                 |
+------------------------------------------+
```

- Four metrics in a 4-column row: each metric has label (`caption`, `--text-tertiary`) above value (`display-sm` / `mono-md`)
- Optional service level bar at bottom: horizontal bar, filled portion colored by threshold tier
- Queued count: threshold-colored

#### 3.5.6 Chart Widget (Bar / Line / Area)
Seven sub-types rendered with Recharts.

```
+------------------------------------------+
| Call Volume by Group              [...] |
|------------------------------------------|
|  50 |     ___                            |
|  40 |    |   |  ___                      |
|  30 | ___|   | |   |  ___               |
|  20 ||   |   | |   | |   |              |
|  10 ||   |   | |   | |   |              |
|   0 |Sales Support  Billing  Tech        |
+------------------------------------------+
```

- Chart area: full widget body, 16px padding
- Axis labels: `mono-sm`, `--text-tertiary`
- Grid lines: 1px `--border-default` (very subtle)
- Bar fill: `--accent-primary` (#6366F1) for single series, categorical colors for multi-series
- Categorical palette: `#6366F1`, `#8B5CF6`, `#EC4899`, `#F59E0B`, `#10B981`, `#3B82F6`, `#EF4444`, `#06B6D4`
- Line: 2px stroke, dots at data points (4px radius)
- Area: line + fill at 10% opacity
- Tooltip on hover: `--bg-overlay` background, `radius-md`, `shadow-md`, shows metric name + value
- Animation: `duration-chart` (600ms) for data transitions

#### 3.5.7 Pie Chart Widget

```
+------------------------------------------+
| Call Direction Split              [...] |
|------------------------------------------|
|                                          |
|        [PIE CHART]    Inbound   62%     |
|       /   ____   \    Outbound  28%     |
|      |  /      \  |   Internal  10%     |
|       \  \____/  /                       |
|        \_______/                         |
+------------------------------------------+
```

- Donut style (inner radius 60% of outer) for modern aesthetic
- Legend: right side or below (auto-layout based on widget aspect ratio)
- Legend items: colored circle (8px) + label (`body-sm`) + percentage (`mono-sm`, `--text-primary`)
- Hover: segment expands slightly (2px outward), tooltip shows value + percentage
- Colors: same categorical palette as Chart widget

#### 3.5.8 Gauge Widget

```
+------------------------------------------+
| Service Level                     [...] |
|------------------------------------------|
|                                          |
|          ___________                     |
|        /   \   /    \                    |
|       / green|yellow \                   |
|      |   \   |   /    |                  |
|       \    \ | /  red /                  |
|        \_____V______/                    |
|             87%                          |
|                                          |
+------------------------------------------+
```

- SVG-based semi-circular gauge (180-degree arc)
- Arc segmented into three color zones based on configured thresholds
- Needle: 2px line from center, `--text-primary` color, with small circle at pivot point
- Needle animation: spring easing (`duration-counter`, 800ms) when value changes
- Value below gauge: `display-sm`, threshold-colored
- Arc track background: `--bg-elevated`
- Arc segments: green (#22C55E) / yellow (#EAB308) / red (#EF4444)

#### 3.5.9 Leaderboard Widget

```
+------------------------------------------+
| Agent Leaderboard                 [...] |
|------------------------------------------|
| #  Agent           Calls  Talk   Idle   |
| 1  Sarah Johnson    47    3:22   0:15   |
| 2  John Smith       42    3:45   0:22   |
| 3  Jane Doe         38    2:58   0:31   |
| 4  Bob Wilson       35    4:12   0:18   |
| 5  Alice Chen       31    3:15   0:45   |
+------------------------------------------+
```

- Table layout: rank number, agent name, then configurable metric columns
- Top 3 rows: subtle background tint (#6366F114) to highlight leaders
- Rank column: 32px wide, `mono-md`, `--text-tertiary`
- Agent name: `body-md`, `--text-primary`
- Metric values: `mono-md`, `--text-secondary`
- Sort indicator: small arrow icon on active sort column header
- Row reorder animation: rows animate position when ranks change using `layout` animation (Framer Motion) at `duration-smooth`
- True/False display: green checkmark or red X icon

#### 3.5.10 Marquee Widget

```
+-------------------------------------------------------+
| >>> Calls Handled: 247 | SL: 94% | Avg Wait: 1:23 <<<|
+-------------------------------------------------------+
```

- CSS `@keyframes marquee` scrolling text, infinite loop
- Speed configurable: slow (60s per loop), medium (30s), fast (15s)
- Content: repeating sequence of label + value pairs separated by `|` dividers
- Background: `--bg-surface`
- Text: `heading-lg`, `--text-primary`
- Dividers: `--text-tertiary`
- Pauses scrolling on hover to allow reading

#### 3.5.11 Image Widget

```
+------------------------------------------+
|                                          |
|         [Uploaded Image]                 |
|                                          |
+------------------------------------------+
```

- No header, full-bleed image
- `object-fit: contain` (preserve aspect ratio) or `cover` (fill, crop edges) -- configurable
- Border: none in view mode, standard card border in edit mode
- Upload: click to upload, drag-and-drop supported, max 5MB, formats: PNG, JPG, SVG, WebP

#### 3.5.12 Web Page Widget

```
+------------------------------------------+
| External: weather.com             [...] |
|------------------------------------------|
| [iframe content]                         |
|                                          |
|                                          |
+------------------------------------------+
```

- `<iframe>` with `sandbox` attribute for security
- URL configurable in widget settings
- Loading state: skeleton screen within iframe area
- Error state: "Unable to load external content" message with retry button

#### 3.5.13 Decorative Widgets (Box, Ellipse, Line)

- **Box**: Rounded rectangle, configurable fill color, border, opacity. For visual grouping.
- **Ellipse**: Circle/oval shape, same styling options. For accents.
- **Line**: Horizontal or vertical divider, configurable color, thickness (1-4px), dashed/solid style.
- All are z-index below data widgets (rendered behind)
- No header, no body padding, pure decorative

#### 3.5.14 Widget Group

- Container that holds multiple child widgets
- Visual: slightly thicker border (2px) or subtle background color difference
- Drag the group to move all children together
- Resize the group to scale/reflow children
- Collapse/expand toggle in group header

---

## 4. Agent Timeline Design

### 4.1 Timeline Bar Rendering Approach

**Technology: CSS (flexbox + percentage widths) with SVG overlay for tooltips and fine details.**

Rationale: CSS renders fastest for rectangular bars and handles thousands of elements well. SVG is used only for the time axis ruler and tooltip pointer arrows. Canvas is avoided because it doesn't support per-element hover detection without manual hit-testing, and the bar count per agent (typically 20-100 per day) doesn't require Canvas performance.

**Implementation**:
- Each agent row contains a `<div>` flex container for bars
- Each event bar is a `<div>` with:
  - `flex: none` and explicit `width` calculated as: `(event_duration_ms / visible_time_range_ms) * 100%`
  - `background-color`: mapped from event type
  - `height: 100%` (fills the 48px row height)
  - `min-width: 2px` (so very short events remain visible)
  - `border-right: 1px solid` `--bg-base` (tiny gap between adjacent bars for visual separation)
- The currently active (live) event's bar uses a CSS animation to grow width smoothly in sync with elapsed time. Use `requestAnimationFrame` to update width every frame, or a CSS `transition: width 1s linear` that re-triggers every second.
- Time axis: SVG element below the agent rows showing time labels at regular intervals (auto-scaled: every 5min, 15min, 30min, 1hr based on zoom level).

### 4.2 Event Color Palette

Each event type has a specific assigned hex color. These are the CallDoc defaults, designed for maximum distinguishability on dark backgrounds. Users can customize per-user via the Color Legend.

| Event Type           | Color Name    | Hex       | Dark Theme Variant | Swatch |
|----------------------|---------------|-----------|--------------------|--------|
| **Idle / Available** | Soft Green    | `#4ADE80` | Full               | ------  |
| **Ringing**          | Amber         | `#FBBF24` | Full               | ------  |
| **Talking**          | Bright Blue   | `#3B82F6` | Full               | ------  |
| **Hold**             | Red           | `#EF4444` | Full               | ------  |
| **Park**             | Warm Brown    | `#D97706` | Full               | ------  |
| **Queue**            | Orange        | `#F97316` | Full               | ------  |
| **Transfer**         | Sky Blue      | `#38BDF8` | Full               | ------  |
| **Transfer Hold**    | Rose          | `#FB7185` | Full               | ------  |
| **Dialing**          | Teal          | `#2DD4BF` | Full               | ------  |
| **Conference**       | Indigo        | `#818CF8` | Full               | ------  |
| **Voicemail**        | Purple        | `#A78BFA` | Full               | ------  |
| **Auto Attendant**   | Slate         | `#94A3B8` | Full               | ------  |
| **Overflow**         | Cool Gray     | `#6B7280` | Full               | ------  |
| **DND / Busy**       | Deep Red      | `#DC2626` | Full               | ------  |
| **ACW (After Call)** | Violet        | `#8B5CF6` | Full               | ------  |
| **Listen**           | Cyan          | `#06B6D4` | Full               | ------  |
| **Calling Drop**     | Muted Red     | `#F87171` | 50% opacity        | ------  |
| **Receiving Drop**   | Muted Orange  | `#FB923C` | 50% opacity        | ------  |
| **Busy (not logged)**| Dark Gray     | `#52525B` | Full               | ------  |

**Color Legend Panel**:
- Toggle via `L` key or toolbar icon
- Floating panel, 300px wide, anchored to top-left below toolbar
- Grid layout: 2 columns, each showing colored circle (16px) + event name (`body-sm`)
- Click any color circle -> opens inline color picker (hue wheel + saturation/lightness square)
- "Reset to Defaults" link at bottom
- Changes are persisted to `user_preferences` table and take effect immediately across all views

### 4.3 Hover Tooltip Design

```
+----------------------------------+
| Talking                          |  <- Event type, bold, event color
| Inbound Call                     |  <- Direction
|----------------------------------|
| Duration:  4:32                  |  <- mono-sm
| Group:     Sales Queue           |
| Caller ID: +1(555)123-4567      |
|            John Smith            |
| Agent:     Sarah Johnson (x481) |
+----------------------------------+
         \
          \ (pointer arrow pointing to hovered bar)
```

**Styling**:
- Background: `--bg-overlay` (#3F3F46)
- Border: 1px solid `--border-strong` (#3F3F46 -- same as bg but on light theme this differs)
- Border radius: `radius-lg` (8px)
- Shadow: `shadow-lg`
- Padding: 12px
- Width: auto (min 200px, max 320px)
- Event type header: `heading-sm` weight, colored with the event's assigned color
- Data rows: `body-sm` for labels (`--text-secondary`), `mono-sm` for values (`--text-primary`)
- Pointer arrow: 8px CSS triangle pointing toward the hovered bar
- Positioning: above the bar by default, flips below if insufficient space
- Appear delay: 150ms (prevents flicker during fast mouse movement)
- Disappear: immediate on mouse leave

### 4.4 Agent Profile Card (Left Column)

```
+-------------------------------+
| [Avatar]  Sarah Johnson       |  <- 36px avatar, heading-md name
|           Ext: 481            |  <- body-sm, --text-secondary
|           [*] Sales           |  <- green checkmark = logged in
|           [*] Support         |
|           [ ] Billing         |  <- gray circle = logged out
|                               |
|  [GREEN DOT] Talking  2:35   |  <- 10px dot, body-sm state, mono-sm duration
|  +1(555)123-4567              |  <- mono-sm, --text-tertiary
+-------------------------------+
```

**Layout**:
- Card width: 240px (fixed)
- Card height: matches the timeline row height (min 64px, expandable for many groups)
- Background: `--bg-surface`
- Right border: 1px solid `--border-default` (separates from timeline bars)
- Avatar: 36px circle, positioned top-left with 12px padding
- If no photo: initials on `--accent-primary` background, white text
- Name: `heading-md`, `--text-primary`, truncate with ellipsis if needed
- Extension: `body-sm`, `--text-secondary`
- Group login indicators: 8px circle + group name (`body-sm`). Green filled = logged in, hollow gray = logged out.
- Current state: state name + colored dot + live-counting duration
- Active caller ID: `mono-sm`, `--text-tertiary`
- Click on agent card: navigates to agent detail view (`/agent-timeline/:id`)

### 4.5 Live Column View

When toggled (via `C` key or toolbar button), the timeline switches to a column layout grouping agents by their current state.

```
+----------+-----------+-----------+-----------+-----------+-----------+
|  IDLE    | RINGING   | TALKING   |  HOLD     |   DND     | LOGGED   |
|  (5)     |  (1)      |  (4)      |  (1)      |  (2)      |  OUT (3) |
+----------+-----------+-----------+-----------+-----------+-----------+
| [Card]   | [Card]    | [Card]    | [Card]    | [Card]    | [Card]   |
| [Card]   |           | [Card]    |           | [Card]    | [Card]   |
| [Card]   |           | [Card]    |           |           | [Card]   |
| [Card]   |           | [Card]    |           |           |          |
| [Card]   |           |           |           |           |          |
+----------+-----------+-----------+-----------+-----------+-----------+
```

**Column Styling**:
- Column header: state name (`heading-sm`, state color), count in parentheses (`caption`, `--text-tertiary`)
- Header background: state color at 10% opacity
- Header height: 40px
- Columns: equal width (flex: 1), 8px gap between columns
- Agent cards within columns: compact version of the profile card (no group list, just avatar + name + extension + duration)
- Compact card: 52px height, `--bg-surface` bg, `radius-md`, 8px padding, 4px bottom margin

**Animation**:
- When an agent changes state, their card animates from the old column to the new column using Framer Motion's `layoutId` animation
- Duration: `duration-smooth` (300ms)
- The card scales down slightly (0.95), moves to new position, then scales back up (1.0)
- Column counts update with counter animation

### 4.6 Real-Time Timeline Animation

**Active Event Bar Growth**:
- The rightmost bar (current event) continuously grows in width
- Update approach: `requestAnimationFrame` loop that calculates `(now - event_start) / visible_time_range * container_width`
- The timeline auto-scrolls to keep the current time visible at the right edge
- Smooth scroll using `scrollLeft` animation at 60fps

**State Transition Animation**:
- When an agent's state changes:
  1. The current (growing) bar stops growing and gets its final width set
  2. A new bar with the new state's color appears at width 0 and begins growing
  3. The agent profile card's state indicator updates with a brief color transition (`duration-normal`, 200ms)
  4. In Column View, the card animates to its new column

**Historical Playback**:
- Drag the timeline backward by click-and-drag on the time axis
- Scroll speed: 1px drag = 1 minute of history (configurable)
- During historical viewing, a "Return to Live" button appears (pulsing green, top-right of timeline)
- Click "Return to Live" or press `P` to snap back to current time with a smooth scroll animation

---

## 5. Cradle-to-Grave Design

### 5.1 Data Table Design

**Table Modes**:
- **Comfortable mode** (default): 44px row height, `body-md` text, generous padding
- **Compact mode**: 32px row height, `body-sm` text, tighter padding (toggle via density icon in table toolbar)

**Table Structure**:
```
+------+-------+---------+---------+----------+--------+----------+---------+
|  ID  | Dir   | Start   | End     | Duration | Caller | Receiver | Answered|
+------+-------+---------+---------+----------+--------+----------+---------+
| 4521 | [->]  | 10:14a  | 10:22a  | 8:12     | +1555  | x481     |   [*]   |  <- even row
|------|-------|---------|---------|----------|--------|----------|---------|
| 4520 | [<-]  | 10:11a  | 10:15a  | 3:44     | x482   | +1555    |   [*]   |  <- odd row
|------|-------|---------|---------|----------|--------|----------|---------|
| 4519 | [->]  | 10:08a  | 10:08a  | 0:23     | +1555  | x485     |   [ ]   |  <- abandoned
+------+-------+---------+---------+----------+--------+----------+---------+
```

**Row Styling**:
- Even rows: `--bg-base` (#09090B)
- Odd rows: `--bg-surface` (#18181B) -- very subtle alternation
- Hover row: `--bg-elevated` (#27272A) with `duration-fast` transition
- Selected row (keyboard): 2px left border `--accent-primary`, `--accent-subtle` background
- Expanded row: same as selected styling, bottom border removed (connected to expansion panel)
- Abandoned call rows: `--text-secondary` text (slightly dimmed) instead of `--text-primary`
- Direction icons: Inbound = green down-arrow, Outbound = blue up-arrow, Internal = gray double-arrow. 16px Lucide icons.
- Boolean checkmark cells: green checkmark icon (#22C55E) for true, empty for false
- Duration columns: `mono-md` font
- Date/time columns: `mono-sm` font, format "Oct 7, 10:14 AM" (relative date) or full format
- Truncation: cells truncate with ellipsis, full value shown on hover tooltip

**Column Headers**:
- Height: 40px
- Background: `--bg-surface`
- Text: `caption` type, `--text-secondary`, uppercase
- Bottom border: 2px solid `--border-default`
- Sort indicator: up/down chevron icon (8px), `--accent-primary` color when active
- Click to sort: first click = ascending, second = descending, third = remove sort
- Right-click header: context menu with "Hide Column", "Insert Column", "Reset Columns"
- Drag column headers to reorder (ghost preview of header during drag)
- Drag column border to resize (cursor: col-resize, min width 60px)

**Column Configuration Menu** (gear icon in table toolbar):
- Slide-out panel (360px) from right side
- All available columns listed with checkboxes
- Drag handles to reorder
- Search field at top to find columns by name
- "Reset to Default" button
- Changes are persisted to `user_preferences`

### 5.2 Expandable Row Animation

**Trigger**: Click anywhere on a row (or press Enter on selected row).

**Expand Animation**:
1. Row background transitions to `--accent-subtle` (immediate)
2. Expansion panel appears below the row
3. Uses CSS `grid-template-rows: 0fr` -> `1fr` transition at `duration-smooth` (300ms)
4. Content within the panel has `opacity: 0` -> `1` at `duration-smooth` with 50ms delay (content fades in after container starts expanding)
5. The event timeline within loads immediately (no separate loading state -- data is already fetched with the call record)

**Collapse Animation**: Reverse of expand -- opacity 0 first, then grid-rows to 0fr.

**Expanded Row Content**:
```
| 4521 | [->] | 10:14a | 10:22a | 8:12 | +1(555)123-4567 | x481 | [*] |
+----------------------------------------------------------------------+
| Call Event Timeline                                                   |
|                                                                       |
| [Ring  0:12][Queue  1:05][Ring  0:08][Talking     4:32][Hold 0:45]...|
|  x481       Sales Queue   x482       x482 Sarah J.     x482         |
|                                                                       |
| [Play Recording]  [Add Note]  [View Details]  [Score Call]           |
+----------------------------------------------------------------------+
```

### 5.3 Event Timeline Within Expanded Row

**Rendering**: Horizontal bar chart using CSS flexbox, same approach as Agent Timeline bars.

Each event segment:
- Width: proportional to `(event_duration / total_call_duration) * 100%`
- Min-width: 24px (so short events are clickable/hoverable; label truncates or shows icon only)
- Height: 40px
- Background-color: mapped from event type using the same palette as Section 4.2
- Border-radius: 3px (slight rounding on each segment)
- Gap between segments: 2px (using `gap` on flex container)
- Text inside bar (if width > 80px): event name + duration in `caption` type, white text with subtle text-shadow for readability
- Text inside bar (if width 40-80px): just duration
- Text inside bar (if width < 40px): no text, icon only or empty (tooltip on hover)
- Below each bar segment (in a second row): agent/extension name in `caption`, `--text-tertiary`

**Hover on event segment**: Shows same tooltip design as Agent Timeline (Section 4.3)
**Click on event segment**: Highlights the segment (white border 2px), shows detail panel below with extended info

**Action Buttons Below Timeline** (horizontal row):
- [Play Recording] -- primary ghost button, appears only if `is_recorded = true`
- [Add Note] -- ghost button
- [View Details] -- ghost button, opens full call detail drawer
- [Score Call] -- ghost button, opens scorecard

Button styling: `body-sm`, `--text-secondary`, transparent background, 1px `--border-default` border, `radius-md`, 32px height, 12px horizontal padding. Hover: `--bg-elevated` background.

### 5.4 Filter Panel Design

**Layout**: Collapsible sidebar on the left side of the page, 320px wide.

```
+----Filter Panel (320px)----+----Table Content---...
| [X Close] Filters  [Reset] |
|-----------------------------|
| [Search filters...]        |
|                             |
| v Date Range                |  <- Accordion section (expanded)
|   [Today v]                 |
|   [Oct 7, 2025] - [Oct 7]  |
|   [ ] Specific time range   |
|   [8:00 AM] - [5:00 PM]    |
|                             |
| > Agent                     |  <- Accordion section (collapsed)
| > Direction                 |
| > Duration                  |
| > Events                    |
| > Groups                    |
| > Parties                   |
| > Status                    |
| > Recording                 |
| > Notes                     |
| > Tags                      |
| > System                    |
|                             |
|-----------------------------|
| Active Filters:             |
| [Agent: Sarah J. x]        |  <- Active filter chip
| [Direction: Inbound x]     |
| [Duration: > 2:00 x]       |
|                             |
| [Apply Filters]             |  <- Primary button
| [Save as Preset v]          |  <- Secondary button with dropdown
+-----------------------------+
```

**Panel Behavior**:
- Toggle: `F` key, or "Filters" button in page header
- Slide-in animation: translateX(-320px) -> 0 at `duration-smooth`
- Pushes table content to the right (content width shrinks)
- Persistent open state saved per user

**Accordion Sections**:
- Each filter category is a collapsible accordion
- Header: `heading-sm`, `--text-primary`, 40px height, click to expand/collapse
- Chevron icon rotates 90 degrees on expand/collapse at `duration-fast`
- Expanded content: 12px padding, specific filter controls per category
- Badge on collapsed sections showing count of active filters in that category (small `--accent-primary` circle with white number)

**Filter Controls by Type**:
- **Multi-select (Agents, Groups)**: Searchable dropdown with checkboxes. Max height 240px, scrollable. Selected items show as chips below.
- **Boolean (Is Answered, Is Recorded)**: Toggle switch or radio buttons (Yes / No / Any)
- **Duration range**: Two inputs (min/max) with format `HH:MM:SS`, plus operator dropdown (>, <, =, range)
- **Date range**: Calendar date pickers (start/end) with quick presets (Today, Yesterday, This Week, This Month, Last 7 Days, Last 30 Days, Custom)
- **Text search (Caller ID, Notes)**: Text input with "Contains" / "Equals" / "Starts With" operator

**Active Filter Chips**:
- Displayed at bottom of filter panel AND above the table (horizontal scrolling row, 36px height)
- Chip: `radius-full`, `--bg-elevated` background, `body-sm` text, `--text-primary`, 28px height, 12px horizontal padding
- X button on each chip to remove that filter
- Click chip to scroll to and highlight its section in the filter panel
- "Clear All" link at the end of the chips row

### 5.5 Quick Search Design

**Location**: Inline search in the page header, right side.

```
+-------------------------------------+
| [magnifier icon] Search calls...    |  <- 40px height, 280px width
+-------------------------------------+
```

- Input: `--bg-elevated` background, 1px `--border-strong` border, `radius-md`
- Placeholder: "Search by phone number, call ID, or agent..." in `--text-tertiary`
- Icon: Lucide `Search`, 16px, `--text-tertiary`
- Focus: border changes to `--border-focus` (#6366F1), `shadow-glow`
- Keyboard shortcut: `/` focuses the search input
- Search behavior: debounced (300ms), searches across call_id, calling_party_number, called_party_number, agent names
- Results: real-time filtering of the table (progressive filter, not separate results dropdown)
- Clear: X button appears when input has value

### 5.6 Call Detail Drawer

**Trigger**: "View Details" button in expanded row, or double-click a row.

**Layout**: Right-side drawer, 560px wide, slides in from the right at `duration-smooth`.

```
+------Table Content------+----Call Detail Drawer (560px)----+
|                          | [<- Back] Call #4521             |
|                          |----------------------------------|
|                          | OVERVIEW                         |
|                          | Direction: Inbound               |
|                          | Start: Oct 7, 2025 10:14:32 AM  |
|                          | End:   Oct 7, 2025 10:22:44 AM  |
|                          | Duration: 8:12                   |
|                          | Status: Answered                 |
|                          |----------------------------------|
|                          | PARTIES                          |
|                          | Caller: +1(555)123-4567         |
|                          |         John Smith               |
|                          | Receiver: x481 Sarah Johnson    |
|                          | Final Agent: x482 Jane Doe      |
|                          |----------------------------------|
|                          | EVENT TIMELINE                   |
|                          | [full timeline visualization]    |
|                          |----------------------------------|
|                          | RECORDING                        |
|                          | [waveform player]               |
|                          |----------------------------------|
|                          | NOTES (2)                        |
|                          | [note entries]                   |
|                          | [+ Add Note]                     |
|                          |----------------------------------|
|                          | SCORECARD                        |
|                          | [scorecard if scored]           |
+--------------------------+---------------------------------+
```

**Drawer Styling**:
- Background: `--bg-surface`
- Left border: 1px solid `--border-default`
- Shadow: `shadow-xl` on the left edge
- Backdrop: semi-transparent overlay on the table area (`--bg-base` at 40% opacity)
- Close: `Esc` key, click backdrop, or back button
- Sections: separated by 1px `--border-default` dividers, 24px vertical padding per section
- Section headings: `overline` type, `--text-tertiary`

---

## 6. Report Viewer Design

### 6.1 Report Header / Controls Layout

```
+----------------------------------------------------------------------+
| [< Back to Reports]                                                   |
|                                                                       |
| Agent Performance Summary                                heading-xl  |
| Oct 1 - Oct 7, 2025  |  Sales Queue  |  Daily Interval    body-sm   |
|                                                                       |
| [Date Range Picker]  [Filters v]  [Interval: Daily v]     controls   |
|                                                                       |
| [Refresh]  [Print]  [Export v]  [Schedule]          action buttons   |
+----------------------------------------------------------------------+
| [Table View]  [Chart View]  [Split View]                  tab bar    |
+----------------------------------------------------------------------+
```

**Layout**:
- Report title: `heading-xl`, `--text-primary`
- Metadata line: `body-sm`, `--text-secondary` -- date range, filters, interval
- Controls row: horizontal flex, 8px gaps, vertically centered
- Action buttons: ghost buttons (`body-sm`, icon + label)
- Tab bar: underline-style tabs (active tab has 2px bottom border in `--accent-primary`)

### 6.2 Chart Types & Styling

All charts use Recharts with the CallDoc design system tokens applied.

**Common Chart Styling**:
- Background: transparent (inherits card/page background)
- Grid lines: 1px `--border-default`, dashed for horizontal, none for vertical
- Axis labels: `mono-sm`, `--text-tertiary`
- Axis lines: 1px `--border-strong`
- Legend: bottom-aligned, `body-sm`, horizontal layout with colored circles
- Tooltip: `--bg-overlay` bg, `radius-lg`, `shadow-lg`, 12px padding, `body-sm` text

**Chart Types Available**:

| Chart    | Usage                                   | Styling Notes                          |
|----------|-----------------------------------------|----------------------------------------|
| Bar      | Call volumes, agent comparisons         | 4px radius top corners, 4px gap between bars |
| Stacked Bar | Breakdown by event type / direction | Same bars, segmented with distinct colors |
| Line     | Trends over time (call volume, SL%)    | 2px stroke, 6px dot on hover, area fill at 8% opacity |
| Area     | Queue depth over time                   | Gradient fill from line color at 20% to 0% at baseline |
| Pie/Donut| Distribution (direction split, by group)| Donut with 60% inner radius, 2px gap between slices |
| Horizontal Bar | Agent rankings, duration comparisons | Left-aligned labels, bars grow rightward |
| Heatmap  | Call volume by hour/day                 | Cell grid, color intensity maps to value. Uses `--accent-primary` at varying opacities (10%-100%) |

**Color Palette for Charts** (multi-series, up to 8 series):
```
Series 1: #6366F1  (Indigo)
Series 2: #8B5CF6  (Violet)
Series 3: #EC4899  (Pink)
Series 4: #F59E0B  (Amber)
Series 5: #10B981  (Emerald)
Series 6: #3B82F6  (Blue)
Series 7: #EF4444  (Red)
Series 8: #06B6D4  (Cyan)
```

### 6.3 Print Layout

When printing (Cmd+P or "Print" button):
- Apply `@media print` stylesheet
- Switch to light theme (white background, dark text) regardless of current theme
- Hide: sidebar, top bar, filter panel, action buttons, interactive controls
- Show: report title, date range, filters applied, generation timestamp
- Table: `body-sm` text, tighter row height (28px), visible borders on all cells
- Charts: rendered at 100% width, static (no tooltips/hover)
- Footer: page number ("Page X of Y"), system name, generation timestamp
- Page size: Letter (8.5" x 11") portrait, 0.75" margins
- Page breaks: between sections (avoid breaking mid-table or mid-chart)

### 6.4 Export Controls

**Export Dropdown Button**:
```
+-----------------+
| [Export v]      |
+-----------------+
| CSV (.csv)      |
| Excel (.xlsx)   |
| PDF (.pdf)      |
+-----------------+
```

- CSV: comma-separated values, UTF-8 BOM for Excel compatibility, respects current filters and sort
- Excel: xlsx format via SheetJS, includes formatting (bold headers, column widths, number formats)
- PDF: server-side render via `@react-pdf/renderer`, matches print layout
- All exports: show brief toast "Exporting report..." then "Report exported" with download link

### 6.5 Report Schedule Builder Wizard

**Step-by-step wizard in a modal** (640px wide):

```
Step 1: Report                    [1]--[2]--[3]--[4]--[5]
+------------------------------------------+
| Select Report Template                    |
| [Agent Performance Summary     v]        |
|                                          |
| Date Range Logic:                        |
| ( ) Previous Day                         |
| (*) Previous Week                        |
| ( ) Previous Month                       |
| ( ) Custom Rolling Window: [ 7 ] days   |
+------------------------------------------+
|                          [Cancel] [Next >]|
+------------------------------------------+

Step 2: Filters
+------------------------------------------+
| Agent/Group Selection                     |
| [Sales Queue checkbox checked]           |
| [Support Queue checkbox checked]         |
|                                          |
| Additional Filters:                       |
| [+ Add Filter]                           |
+------------------------------------------+
|                     [< Back] [Next >]     |
+------------------------------------------+

Step 3: Delivery
+------------------------------------------+
| Frequency:                                |
| (*) Daily   ( ) Weekly   ( ) Monthly     |
|                                          |
| Time: [7:00 AM v]                        |
|                                          |
| Day (weekly): [Monday v]                 |
| Day (monthly): [1st v]                   |
+------------------------------------------+
|                     [< Back] [Next >]     |
+------------------------------------------+

Step 4: Recipients
+------------------------------------------+
| Format: (*) PDF  ( ) CSV                  |
|                                          |
| Email Recipients:                         |
| [john@company.com]                [x]    |
| [jane@company.com]                [x]    |
| [+ Add recipient]                        |
+------------------------------------------+
|                     [< Back] [Next >]     |
+------------------------------------------+

Step 5: Review & Confirm
+------------------------------------------+
| Report: Agent Performance Summary         |
| Date Range: Previous Week                 |
| Filters: Sales Queue, Support Queue       |
| Frequency: Weekly, Monday at 7:00 AM     |
| Format: PDF                               |
| Recipients: john@, jane@                  |
|                                          |
| [< Back]                [Create Schedule]|
+------------------------------------------+
```

**Wizard Styling**:
- Step indicator: horizontal dots connected by lines, active step = `--accent-primary` filled circle, future = `--border-strong` hollow, past = `--status-success` filled with checkmark
- Modal: `radius-xl`, `shadow-xl`, `--bg-surface` background
- Step transition: content crossfades at `duration-normal`

---

## 7. Micro-interactions & Polish

### 7.1 Loading States (Skeleton Screens)

**Never use spinners for content loading.** Use skeleton screens that mirror the actual layout.

**Skeleton Styling**:
- Shape: matches the layout of the expected content (rectangles for text, squares for avatars, bars for charts)
- Background: `--bg-elevated` (#27272A)
- Animation: subtle shimmer effect -- linear gradient moving left to right
  - Gradient: `--bg-elevated` -> `--bg-overlay` (#3F3F46) -> `--bg-elevated`
  - Animation: `@keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }`
  - Duration: 1.5s infinite linear
  - Background-size: 200% 100%
- Border radius: matches the element it represents (`radius-sm` for text lines, `radius-full` for avatars, `radius-md` for cards)

**Skeleton Variants**:
- **Table skeleton**: Header row (full height, no animation) + 8 body rows with shimmer rectangles at varying widths (100%, 80%, 60%, 90%, etc.) for visual diversity
- **Dashboard skeleton**: Card outlines with shimmer rectangles inside (one large for value, one small for label)
- **Timeline skeleton**: Profile card skeleton on left + horizontal shimmer bars at varying widths on right
- **Chart skeleton**: Axes drawn (static), chart area filled with multiple vertical shimmer bars of varying heights

### 7.2 Empty States

**Design**: Centered in the content area, light illustration + descriptive text + primary CTA.

```
+------------------------------------------+
|                                          |
|        [Illustration: inbox/phone]       |  <- 120px max height, muted colors
|                                          |
|          No calls found                  |  <- heading-lg, --text-primary
|                                          |
|    Adjust your date range or filters     |  <- body-md, --text-secondary
|    to find call records.                 |
|                                          |
|       [Adjust Filters]  [Clear All]     |  <- Primary + ghost buttons
|                                          |
+------------------------------------------+
```

**Empty State Variants**:

| Context             | Illustration        | Heading                  | Body                                        | CTA                |
|---------------------|---------------------|--------------------------|---------------------------------------------|--------------------|
| No calls found      | Phone with X        | No calls found           | Adjust your date range or filters to find call records. | Adjust Filters     |
| No agents online    | Users offline        | No agents online         | All agents are currently logged out.        | --                 |
| No wallboards       | Grid/canvas          | No wallboards yet        | Create your first wallboard to display real-time metrics. | Create Wallboard   |
| No reports          | Chart bars           | No report data           | Select a report template and date range to generate data. | Run Report         |
| No recordings       | Waveform             | No recordings available  | Recordings will appear here once configured. | Configure Recording|
| No alerts           | Bell                 | No alerts configured     | Set up threshold alerts to monitor your call center. | Create Alert       |
| Search no results   | Magnifier with X     | No results for "query"   | Try a different search term or broaden your filters. | Clear Search       |

**Illustration Style**: Simple line art using `--text-tertiary` color for strokes, `--bg-elevated` for fills. Max 120x120px. No color (monochromatic). Alternatively, use Lucide icons at 48px size as minimal illustrations.

### 7.3 Error States

**Inline Errors** (form validation):
- Red border on input (`--status-danger`)
- Error message below input: `caption` type, `--status-danger` text, 4px top margin
- Icon: Lucide `AlertCircle` (14px) inline with error text

**Page-Level Errors** (API failures):
```
+------------------------------------------+
|                                          |
|     [!] Something went wrong             |  <- heading-lg, --status-danger
|                                          |
|     Failed to load call data.            |  <- body-md, --text-secondary
|     Error: Connection timeout (504)      |  <- mono-sm, --text-tertiary
|                                          |
|     [Retry]  [Go to Dashboard]          |
|                                          |
+------------------------------------------+
```

**Connection Loss Banner** (persistent, top of content area):
```
+----------------------------------------------------------------------+
| [!] Connection to IP Office lost. Attempting to reconnect...   [x]   |
+----------------------------------------------------------------------+
```
- Background: `--status-danger-muted`
- Border-bottom: 2px solid `--status-danger`
- Text: `body-sm`, `--status-danger`
- Height: 40px
- Dismiss: X button hides for 5 minutes, then reappears if still disconnected
- On reconnect: banner changes to green "Connection restored" for 5 seconds, then auto-dismisses

### 7.4 Toast Notifications

**Position**: Bottom-right corner, 16px from edges. Stack upward (newest on top).

```
+------------------------------------------+
| [checkmark]  Report exported             |  <- Success toast
|              agent_performance.pdf       |
|              [Download]           [x]    |
+------------------------------------------+
```

**Toast Variants**:

| Type    | Icon                | Left Border Color     | Icon Color          |
|---------|---------------------|-----------------------|---------------------|
| Success | `CheckCircle`       | `--status-success`    | `--status-success`  |
| Error   | `XCircle`           | `--status-danger`     | `--status-danger`   |
| Warning | `AlertTriangle`     | `--status-warning`    | `--status-warning`  |
| Info    | `Info`              | `--status-info`       | `--status-info`     |

**Toast Styling**:
- Width: 380px
- Background: `--bg-surface`
- Border: 1px `--border-default`
- Left border: 3px solid (variant color)
- Border radius: `radius-lg`
- Shadow: `shadow-lg`
- Padding: 12px 16px
- Title: `heading-sm`, `--text-primary`
- Body: `body-sm`, `--text-secondary`
- Enter animation: slide up (translateY 16px -> 0) + fade in, `duration-smooth`
- Exit animation: slide right (translateX 0 -> 100%) + fade out, `duration-normal`
- Auto-dismiss: 5 seconds for success/info, 8 seconds for warnings and errors
- Max stack: 3 visible (older toasts queue and appear as others dismiss)

### 7.5 Real-Time Connection Indicator

**System Status Badge** (in top bar, as described in Section 2.2):

Three states:
1. **Live** (green): DevLink3 connected, events flowing normally
   - Green dot (#22C55E) with soft pulse animation
   - Label: "Live" in `--text-secondary`

2. **Degraded** (yellow): Partial connectivity
   - Yellow dot (#EAB308) with steady glow (no pulse)
   - Label: "Degraded" in `--text-secondary`
   - Click to expand: shows which services are up/down

3. **Disconnected** (red): No connection
   - Red dot (#EF4444) with fast pulse (1s)
   - Label: "Disconnected" in `--status-danger`
   - Shows reconnection attempt counter
   - Connection loss banner appears (Section 7.3)

**Hover Tooltip on Status Badge**:
```
+----------------------------------+
| System Status                    |
|----------------------------------|
| DevLink3:  [*] Connected         |
| SMDR:      [*] Connected         |
| Database:  [*] Healthy           |
| Redis:     [!] Degraded          |
|----------------------------------|
| Last event: 2s ago               |
| Uptime: 14h 32m                  |
+----------------------------------+
```

### 7.6 Page Transition Animations

**Between pages** (Next.js App Router transitions):
- Outgoing page: fade out (opacity 1 -> 0) at `duration-fast` (100ms)
- Incoming page: fade in (opacity 0 -> 1) + slide up (translateY 8px -> 0) at `duration-smooth` (300ms) with 50ms delay
- Sidebar: no transition (persists across pages)
- Top bar: breadcrumbs crossfade at `duration-normal`

**Implementation**: Use Framer Motion's `AnimatePresence` wrapping the `{children}` in the root layout, or Next.js View Transitions API when available.

---

## 8. Recording Player Design

### 8.1 Waveform Player Layout

The recording player appears in two contexts:
1. **Inline** within the Cradle-to-Grave expanded row (compact mode, 80px height)
2. **In drawer** within the Call Detail Drawer (full mode, 160px height)

**Full Mode Layout**:
```
+----------------------------------------------------------------------+
| Recording: Call #4521                                     Oct 7, 2025|
|----------------------------------------------------------------------|
|                                                                       |
| [waveform visualization ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~]    |
| [note markers                  *           *                    ]    |
|                                                                       |
| 2:34 [progress bar =============================----------------] 8:12|
|                                                                       |
| [|<] [<<] [ PLAY ] [>>] [>|]     [1.0x v]    [snippet] [download]  |
|                                                                       |
| Notes:                                                                |
| [2:15] Sarah: "Customer requested callback"                         |
| [5:42] Sarah: "Escalated to tier 2"                                 |
| [+ Add Note at current time]                                        |
+----------------------------------------------------------------------+
```

### 8.2 Waveform Visualization

**Technology**: wavesurfer.js

**Styling**:
- Waveform color (unplayed): `--text-tertiary` (#71717A)
- Waveform color (played/progress): `--accent-primary` (#6366F1)
- Cursor line: 2px solid `--accent-primary`, full height of waveform
- Background: `--bg-base`
- Height: 80px (compact) / 120px (full)
- Bar width: 2px
- Bar gap: 1px
- Bar radius: 1px (slightly rounded tops)

### 8.3 Playback Controls

**Transport Controls** (centered below waveform):

| Button | Icon            | Size  | Action              |
|--------|-----------------|-------|---------------------|
| Skip back | `SkipBack`   | 20px  | Jump to start       |
| Rewind   | `Rewind`      | 20px  | Skip back 10s       |
| Play/Pause | `Play`/`Pause` | 28px  | Toggle playback  |
| Forward  | `FastForward`  | 20px  | Skip forward 10s    |
| Skip end | `SkipForward`  | 20px  | Jump to end         |

- Play/Pause button: `--accent-primary` filled circle (44px), white icon centered
- Other buttons: ghost style, `--text-secondary`, `radius-full`, 36px
- Hover: `--bg-elevated` background
- Active (pressed): scale(0.95) at `duration-instant`

**Progress Bar** (below waveform, above controls):
- Height: 4px (expands to 8px on hover)
- Track: `--bg-elevated`
- Fill: `--accent-primary`
- Thumb: 12px circle, `--accent-primary`, appears on hover
- Time labels: `mono-sm`, `--text-secondary` (current time left, total duration right)
- Click anywhere on bar to seek
- Drag thumb to scrub

### 8.4 Note Markers on Timeline

- Markers: small triangles (8px) below the waveform at the corresponding timestamp position
- Color: `--status-warning` (#EAB308) -- visually distinct from waveform
- Hover marker: tooltip with note preview (first 50 characters + author)
- Click marker: scrolls to note in the notes list below player
- Add note: "+" button appears at cursor position on hover over waveform

**Note Entry**:
- Timestamp: `mono-sm`, `--text-tertiary`, left-aligned (auto-filled with current playback position)
- Author: `body-sm`, `--text-secondary`
- Text: `body-md`, `--text-primary`
- Add note form: single-line text input + "Add" button, 40px height

### 8.5 Snippet Selection UI

**Activation**: Click "Snippet" button in transport controls area.

**Selection Mode**:
- Cursor changes to crosshair on the waveform
- Click-and-drag on waveform to select a region
- Selected region: highlighted with `--accent-primary` at 20% opacity overlay
- Region handles (left/right edges): 4px wide `--accent-primary` bars, draggable to adjust selection
- Duration of selection shown above the region: `mono-sm`, `--accent-primary`

**Snippet Actions** (appear after selection):
```
Selection: 2:15 - 4:30 (2:15)    [Play Snippet] [Download Snippet] [Email Snippet] [Cancel]
```

- Buttons appear in a floating bar above the selected region
- Play Snippet: plays only the selected portion, loops if toggle is on
- Download: exports the snippet as WAV
- Email: opens email compose with snippet attachment (uses recording share link mechanism)

### 8.6 Speed Control

**Dropdown button**: Shows current speed, click to expand.

```
+----------+
|  1.0x  v |
+----------+
|   0.5x   |
|   0.75x  |
|  *1.0x*  |  <- current (bold, accent color)
|   1.25x  |
|   1.5x   |
|   2.0x   |
+----------+
```

- Pitch preservation: enabled by default (uses Web Audio API `playbackRate` with pitch correction)
- Current speed: `--accent-primary` text, bold
- Dropdown: `--bg-overlay` background, `radius-md`, `shadow-md`
- Keyboard shortcut: `+` / `-` to increase/decrease speed by 0.25x steps

---

## 9. Tailwind CSS Configuration

This section provides the concrete Tailwind config mapping for all design tokens.

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "SF Mono", "Consolas", "monospace"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "700" }],
        "display-md": ["36px", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-sm": ["28px", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "600" }],
        "heading-xl": ["24px", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" }],
        "heading-lg": ["20px", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        "heading-md": ["16px", { lineHeight: "1.4", letterSpacing: "-0.005em", fontWeight: "600" }],
        "heading-sm": ["14px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg":    ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-md":    ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm":    ["13px", { lineHeight: "1.45", fontWeight: "400" }],
        caption:      ["12px", { lineHeight: "1.4", letterSpacing: "0.01em", fontWeight: "500" }],
        overline:     ["11px", { lineHeight: "1.4", letterSpacing: "0.06em", fontWeight: "600" }],
      },
      colors: {
        surface: {
          base:     "var(--bg-base)",
          card:     "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
          overlay:  "var(--bg-overlay)",
        },
        border: {
          DEFAULT:  "var(--border-default)",
          strong:   "var(--border-strong)",
          focus:    "var(--border-focus)",
        },
        content: {
          primary:   "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary:  "var(--text-tertiary)",
          inverse:   "var(--text-inverse)",
        },
        accent: {
          DEFAULT: "var(--accent-primary)",
          hover:   "var(--accent-hover)",
          subtle:  "var(--accent-subtle)",
        },
        status: {
          success:       "#22C55E",
          "success-muted": "#22C55E1A",
          warning:       "#EAB308",
          "warning-muted": "#EAB3081A",
          danger:        "#EF4444",
          "danger-muted": "#EF44441A",
          info:          "#3B82F6",
          "info-muted":  "#3B82F61A",
        },
        // Event colors (for timeline bars)
        event: {
          idle:          "#4ADE80",
          ringing:       "#FBBF24",
          talking:       "#3B82F6",
          hold:          "#EF4444",
          park:          "#D97706",
          queue:         "#F97316",
          transfer:      "#38BDF8",
          "transfer-hold": "#FB7185",
          dialing:       "#2DD4BF",
          conference:    "#818CF8",
          voicemail:     "#A78BFA",
          "auto-attendant": "#94A3B8",
          overflow:      "#6B7280",
          dnd:           "#DC2626",
          acw:           "#8B5CF6",
          listen:        "#06B6D4",
          "calling-drop": "#F87171",
          "receiving-drop": "#FB923C",
          busy:          "#52525B",
        },
        // Chart series colors
        chart: {
          1: "#6366F1",
          2: "#8B5CF6",
          3: "#EC4899",
          4: "#F59E0B",
          5: "#10B981",
          6: "#3B82F6",
          7: "#EF4444",
          8: "#06B6D4",
        },
      },
      borderRadius: {
        sm:   "4px",
        md:   "6px",
        lg:   "8px",
        xl:   "12px",
        "2xl": "16px",
      },
      boxShadow: {
        sm:   "0 1px 2px rgba(0,0,0,0.3)",
        md:   "0 4px 12px rgba(0,0,0,0.4)",
        lg:   "0 8px 24px rgba(0,0,0,0.5)",
        xl:   "0 16px 48px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px var(--accent-primary), 0 0 16px var(--accent-ring)",
      },
      transitionDuration: {
        fast:    "100ms",
        normal:  "200ms",
        smooth:  "300ms",
        slow:    "500ms",
        counter: "800ms",
        chart:   "600ms",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "0.6" },
          "50%":      { opacity: "1" },
        },
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-right-out": {
          "0%":   { opacity: "1", transform: "translateX(0)" },
          "100%": { opacity: "0", transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer:    "shimmer 1.5s infinite linear",
        pulse:      "pulse 3s infinite ease-in-out",
        "pulse-fast": "pulse 1.5s infinite ease-in-out",
        "slide-up": "slide-up 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-out": "slide-right-out 200ms cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

## 10. CSS Custom Properties (Root Variables)

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light theme */
    --bg-base: #FFFFFF;
    --bg-surface: #FAFAFA;
    --bg-elevated: #F4F4F5;
    --bg-overlay: #E4E4E7;
    --border-default: #E4E4E7;
    --border-strong: #D4D4D8;
    --border-focus: #6366F1;
    --text-primary: #09090B;
    --text-secondary: #52525B;
    --text-tertiary: #A1A1AA;
    --text-inverse: #FAFAFA;
    --accent-primary: #6366F1;
    --accent-hover: #818CF8;
    --accent-subtle: rgba(99, 102, 241, 0.08);
    --accent-ring: rgba(99, 102, 241, 0.25);
  }

  .dark {
    --bg-base: #09090B;
    --bg-surface: #18181B;
    --bg-elevated: #27272A;
    --bg-overlay: #3F3F46;
    --border-default: #27272A;
    --border-strong: #3F3F46;
    --border-focus: #6366F1;
    --text-primary: #FAFAFA;
    --text-secondary: #A1A1AA;
    --text-tertiary: #71717A;
    --text-inverse: #09090B;
    --accent-primary: #6366F1;
    --accent-hover: #818CF8;
    --accent-subtle: rgba(99, 102, 241, 0.08);
    --accent-ring: rgba(99, 102, 241, 0.25);
  }
}
```

---

## 11. Component Naming Conventions

All shadcn/ui components are used as the base. Custom CallDoc components follow this naming pattern:

| Component Category | Prefix     | Example                    | Location                          |
|--------------------|------------|----------------------------|-----------------------------------|
| Layout             | `Layout`   | `LayoutSidebar`            | `src/components/shared/`          |
| Dashboard widgets  | `Widget`   | `WidgetTitleValue`         | `src/components/dashboard/`       |
| Wallboard          | `Wb`       | `WbCanvas`, `WbPalette`    | `src/components/wallboards/`      |
| Timeline           | `Timeline` | `TimelineBar`, `TimelineAgent` | `src/components/realtime/`    |
| Calls / C2G        | `C2G`      | `C2GTable`, `C2GFilterPanel` | `src/components/calls/`        |
| Reports            | `Report`   | `ReportViewer`, `ReportChart` | `src/components/reports/`      |
| Recording          | `Rec`      | `RecPlayer`, `RecWaveform`  | `src/components/recordings/`     |
| Shared / Generic   | --         | `DataTable`, `FilterChip`   | `src/components/shared/`         |

---

## 12. Accessibility Requirements

| Requirement                    | Implementation                                                |
|--------------------------------|---------------------------------------------------------------|
| Color contrast                 | All text meets WCAG 2.1 AA (4.5:1 for body, 3:1 for large). Event colors tested against both dark and light backgrounds. |
| Keyboard navigation            | All interactive elements focusable via Tab. Focus ring: 2px `--border-focus` with `shadow-glow`. |
| Screen reader support          | All charts have `aria-label` with textual data summary. Timeline bars have `role="img"` with `aria-label` describing the event. |
| Motion sensitivity             | All animations respect `prefers-reduced-motion: reduce`. Animated counters switch to instant value swap. |
| Focus management               | Modals trap focus. Drawers return focus to trigger on close. |
| Color-blind support            | Event bars include pattern fills (optional toggle): dots, stripes, crosshatch in addition to color. Status uses icons alongside color (checkmark for success, X for error). |
| Text scaling                   | All text uses relative units (rem). Layout does not break at 200% browser zoom. |
| ARIA landmarks                 | `<nav>` for sidebar, `<main>` for content, `<header>` for top bar, `role="complementary"` for filter panels. |

---

*This specification provides the complete design foundation for implementing CallDoc's frontend. All values are concrete and directly mappable to Tailwind CSS classes, CSS custom properties, and React component props. The design system ensures visual consistency across all 6+ page templates and 14+ widget types while maintaining the data-density required for a professional call center reporting platform.*
