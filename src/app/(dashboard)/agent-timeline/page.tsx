'use client';

import * as React from 'react';
import {
  ChevronDown,
  ZoomIn,
  ZoomOut,
  ArrowUpDown,
  Check,
  Search,
  Loader2,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { EVENT_COLORS } from '@/lib/theme';
import { TimeRangeSelector, type TimeRange } from '@/components/shared/time-range-selector';
import { cn } from '@/lib/utils';
import { useAgentList, useAgentTimeline } from '@/hooks/use-agents';
import { useAgents as useAgentsFromStore } from '@/stores/agent-store';
import { useUIStore } from '@/stores/ui-store';
import { useAgentTimelineFilters } from '@/hooks/use-url-filters';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import type { Agent, AgentState, AgentTimelineEntry } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_STATE_COLORS: Record<AgentState, string> = {
  idle: EVENT_COLORS.idle,
  talking: EVENT_COLORS.talking,
  ringing: EVENT_COLORS.ringing,
  hold: EVENT_COLORS.hold,
  acw: EVENT_COLORS.acw,
  dnd: EVENT_COLORS.dnd,
  away: '#6B7280',
  'logged-out': '#374151',
  unknown: '#52525B',
};

const AGENT_STATE_LABELS: Record<AgentState, string> = {
  idle: 'Idle',
  talking: 'Talking',
  ringing: 'Ringing',
  hold: 'Hold',
  acw: 'After Call Work',
  dnd: 'Do Not Disturb',
  away: 'Away',
  'logged-out': 'Logged Out',
  unknown: 'Unknown',
};

const AGENT_NAME_COL_WIDTH = 200;
const MIN_ZOOM = 0.25; // 24h view
const MAX_ZOOM = 8; // ~15min view
const DEFAULT_ZOOM = 1; // ~3h view

// ---------------------------------------------------------------------------
// Mock data (fallback when API is not available)
// ---------------------------------------------------------------------------

interface MockAgent {
  agent: Agent;
  timeline: AgentTimelineEntry[];
}

function generateMockAgentTimeline(): MockAgent[] {
  const agentNames = [
    { name: 'Sarah Johnson', ext: '201' },
    { name: 'Mike Chen', ext: '202' },
    { name: 'Emma Wilson', ext: '203' },
    { name: 'James Brown', ext: '204' },
    { name: 'Lisa Davis', ext: '205' },
    { name: 'Robert Taylor', ext: '206' },
    { name: 'Amy Garcia', ext: '207' },
    { name: 'David Martinez', ext: '208' },
  ];

  const states: AgentState[] = ['idle', 'talking', 'ringing', 'hold', 'acw', 'dnd'];
  const stateWeights = [30, 35, 5, 8, 12, 10]; // probability weights

  function weightedRandomState(): AgentState {
    const total = stateWeights.reduce((s, w) => s + w, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < states.length; i++) {
      rand -= stateWeights[i];
      if (rand <= 0) return states[i];
    }
    return 'idle';
  }

  const now = new Date();
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  return agentNames.map(({ name, ext }, agentIdx) => {
    const agent: Agent = {
      id: `agent-${ext}`,
      extension: ext,
      name,
      state: 'idle',
      stateStartTime: new Date().toISOString(),
      stateDuration: 0,
      activeCallId: null,
      groups: [`group-${(agentIdx % 3) + 1}`],
      skills: [],
      loginTime: sixHoursAgo.toISOString(),
    };

    // Generate timeline entries for 6 hours
    const timeline: AgentTimelineEntry[] = [];
    let currentTime = sixHoursAgo.getTime();
    const endTime = now.getTime();

    while (currentTime < endTime) {
      const state = weightedRandomState();
      let durationSecs: number;

      switch (state) {
        case 'idle':
          durationSecs = 30 + Math.random() * 300;
          break;
        case 'talking':
          durationSecs = 60 + Math.random() * 600;
          break;
        case 'ringing':
          durationSecs = 5 + Math.random() * 20;
          break;
        case 'hold':
          durationSecs = 10 + Math.random() * 90;
          break;
        case 'acw':
          durationSecs = 15 + Math.random() * 120;
          break;
        case 'dnd':
          durationSecs = 60 + Math.random() * 600;
          break;
        default:
          durationSecs = 60;
      }

      const segStart = currentTime;
      const segEnd = Math.min(currentTime + durationSecs * 1000, endTime);

      timeline.push({
        agentId: agent.id,
        state,
        startTime: new Date(segStart).toISOString(),
        endTime: new Date(segEnd).toISOString(),
        duration: Math.round((segEnd - segStart) / 1000),
        callId: state === 'talking' || state === 'ringing' ? `call-${Math.floor(Math.random() * 999)}` : null,
        reason: state === 'dnd' ? 'Break' : null,
      });

      currentTime = segEnd;
    }

    // Update agent's current state
    const lastEntry = timeline[timeline.length - 1];
    if (lastEntry) {
      agent.state = lastEntry.state;
      agent.stateStartTime = lastEntry.startTime;
      agent.stateDuration = lastEntry.duration;
    }

    return { agent, timeline };
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTimeAxis(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ---------------------------------------------------------------------------
// Agent selector
// ---------------------------------------------------------------------------

function AgentSelector({
  agents,
  selected,
  onToggle,
}: {
  agents: Agent[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = agents.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.extension.includes(search)
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-body-sm text-content-primary hover:border-border-strong transition-colors"
      >
        <span>{selected.size === agents.length ? 'All Agents' : `${selected.size} Agents`}</span>
        <ChevronDown className="h-3.5 w-3.5 text-content-tertiary" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-border bg-surface-elevated shadow-lg animate-fade-in">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents..."
                className="w-full rounded-md border border-border bg-surface-base py-1.5 pl-8 pr-3 text-body-sm text-content-primary placeholder:text-content-tertiary focus:border-border-focus focus:outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto px-1 pb-2">
            {/* Select all */}
            <button
              onClick={() => {
                const allIds = agents.map((a) => a.id);
                if (selected.size === agents.length) {
                  allIds.forEach((id) => onToggle(id));
                } else {
                  allIds.filter((id) => !selected.has(id)).forEach((id) => onToggle(id));
                }
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-body-sm text-content-secondary hover:bg-surface-overlay transition-colors"
            >
              <span className={cn(
                'flex h-4 w-4 items-center justify-center rounded border',
                selected.size === agents.length
                  ? 'border-accent bg-accent'
                  : 'border-border'
              )}>
                {selected.size === agents.length && <Check className="h-3 w-3 text-white" />}
              </span>
              Select All
            </button>
            <div className="my-1 border-t border-border" />
            {filtered.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onToggle(agent.id)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-body-sm text-content-secondary hover:bg-surface-overlay transition-colors"
              >
                <span className={cn(
                  'flex h-4 w-4 items-center justify-center rounded border',
                  selected.has(agent.id)
                    ? 'border-accent bg-accent'
                    : 'border-border'
                )}>
                  {selected.has(agent.id) && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className="flex-1 text-left">{agent.name}</span>
                <span className="font-mono text-mono-sm text-content-tertiary">x{agent.extension}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline segment tooltip
// ---------------------------------------------------------------------------

function SegmentTooltip({
  entry,
  position,
}: {
  entry: AgentTimelineEntry;
  position: { x: number; y: number };
}) {
  const color = AGENT_STATE_COLORS[entry.state];
  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg border border-border bg-surface-overlay px-3 py-2 shadow-lg"
      style={{
        left: position.x,
        top: position.y - 80,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-caption font-semibold text-content-primary">
          {AGENT_STATE_LABELS[entry.state]}
        </span>
      </div>
      <div className="space-y-0.5 text-mono-sm text-content-secondary">
        <div>Duration: {formatDuration(entry.duration)}</div>
        <div>
          {new Date(entry.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          {' - '}
          {new Date(entry.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        {entry.callId && <div>Call: {entry.callId}</div>}
        {entry.reason && <div>Reason: {entry.reason}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Now Marker -- vertical line showing current time
// ---------------------------------------------------------------------------

function NowMarker({
  viewStart,
  viewEnd,
}: {
  viewStart: number;
  viewEnd: number;
}) {
  const [now, setNow] = React.useState(Date.now());

  // Update every 10 seconds so the line moves
  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  // Only show if "now" is within the visible range
  if (now < viewStart || now > viewEnd) return null;

  const viewDuration = viewEnd - viewStart;
  const leftPercent = ((now - viewStart) / viewDuration) * 100;

  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 z-20"
      style={{ left: `${leftPercent}%` }}
    >
      {/* Dashed red line */}
      <div className="h-full w-px border-l-2 border-dashed border-status-error opacity-70" />
      {/* "Now" label */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-status-error/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        Now
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Real-time state overlay -- shows current agent state extending from
// last known timeline entry to "now"
// ---------------------------------------------------------------------------

function RealtimeOverlay({
  agent,
  viewStart,
  viewEnd,
  timeline,
}: {
  agent: Agent;
  viewStart: number;
  viewEnd: number;
  timeline: AgentTimelineEntry[];
}) {
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  // Only render if "now" is within view range
  if (now < viewStart || now > viewEnd) return null;

  // Find the end of the last timeline entry for this agent
  const lastEntry = timeline.length > 0 ? timeline[timeline.length - 1] : null;
  const lastEndMs = lastEntry ? new Date(lastEntry.endTime).getTime() : viewStart;

  // Only render overlay if there's a gap between the last entry and now
  const overlayStart = Math.max(lastEndMs, viewStart);
  const overlayEnd = Math.min(now, viewEnd);

  if (overlayEnd <= overlayStart) return null;

  const viewDuration = viewEnd - viewStart;
  const leftPercent = ((overlayStart - viewStart) / viewDuration) * 100;
  const widthPercent = ((overlayEnd - overlayStart) / viewDuration) * 100;

  if (widthPercent < 0.1) return null;

  const color = AGENT_STATE_COLORS[agent.state];

  return (
    <div
      className="absolute top-1 bottom-1 rounded-sm opacity-60"
      style={{
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 0.2)}%`,
        backgroundColor: color,
        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)',
      }}
      title={`Current: ${AGENT_STATE_LABELS[agent.state]} (live)`}
    />
  );
}

// ---------------------------------------------------------------------------
// Timeline row
// ---------------------------------------------------------------------------

function TimelineRow({
  agent,
  timeline,
  viewStart,
  viewEnd,
  onSegmentClick,
  showRealtimeOverlay,
}: {
  agent: Agent;
  timeline: AgentTimelineEntry[];
  viewStart: number;
  viewEnd: number;
  onSegmentClick?: (entry: AgentTimelineEntry) => void;
  showRealtimeOverlay?: boolean;
}) {
  const [hoveredEntry, setHoveredEntry] = React.useState<AgentTimelineEntry | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

  const viewDuration = viewEnd - viewStart;

  // Filter entries to visible range
  const visible = timeline.filter((entry) => {
    const entryStart = new Date(entry.startTime).getTime();
    const entryEnd = new Date(entry.endTime).getTime();
    return entryEnd > viewStart && entryStart < viewEnd;
  });

  return (
    <div className="flex items-stretch border-b border-border hover:bg-surface-elevated/30 transition-colors">
      {/* Agent name column */}
      <div
        className="flex flex-shrink-0 items-center gap-2 border-r border-border px-4 py-2"
        style={{ width: AGENT_NAME_COL_WIDTH }}
      >
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: AGENT_STATE_COLORS[agent.state] }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-body-sm font-medium text-content-primary">
            {agent.name}
          </div>
          <div className="font-mono text-mono-sm text-content-tertiary">
            x{agent.extension}
          </div>
        </div>
      </div>

      {/* Timeline bar area */}
      <div className="relative flex flex-1 items-center py-1">
        <div className="flex h-8 w-full overflow-hidden">
          {visible.map((entry, i) => {
            const entryStart = Math.max(new Date(entry.startTime).getTime(), viewStart);
            const entryEnd = Math.min(new Date(entry.endTime).getTime(), viewEnd);
            const leftPercent = ((entryStart - viewStart) / viewDuration) * 100;
            const widthPercent = ((entryEnd - entryStart) / viewDuration) * 100;

            if (widthPercent < 0.1) return null;

            const color = AGENT_STATE_COLORS[entry.state];
            const isClickable = entry.state === 'talking' || entry.state === 'ringing';

            return (
              <div
                key={`${entry.agentId}-${entry.startTime}-${i}`}
                className={cn(
                  'absolute top-1 bottom-1 rounded-sm transition-all duration-fast',
                  isClickable ? 'cursor-pointer hover:brightness-125 hover:z-10' : ''
                )}
                style={{
                  left: `${leftPercent}%`,
                  width: `${Math.max(widthPercent, 0.2)}%`,
                  backgroundColor: color,
                }}
                onMouseMove={(e) => {
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                  setHoveredEntry(entry);
                }}
                onMouseLeave={() => setHoveredEntry(null)}
                onClick={() => isClickable && onSegmentClick?.(entry)}
                title={`${AGENT_STATE_LABELS[entry.state]}: ${formatDuration(entry.duration)}`}
              />
            );
          })}

          {/* Real-time overlay showing current state extending to now */}
          {showRealtimeOverlay && (
            <RealtimeOverlay
              agent={agent}
              viewStart={viewStart}
              viewEnd={viewEnd}
              timeline={timeline}
            />
          )}
        </div>

        {/* Tooltip */}
        {hoveredEntry && (
          <SegmentTooltip entry={hoveredEntry} position={tooltipPos} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Time axis
// ---------------------------------------------------------------------------

function TimeAxis({
  viewStart,
  viewEnd,
}: {
  viewStart: number;
  viewEnd: number;
}) {
  const viewDuration = viewEnd - viewStart;

  // Determine tick interval based on view duration
  let tickIntervalMs: number;
  if (viewDuration <= 30 * 60 * 1000) {
    tickIntervalMs = 5 * 60 * 1000; // 5min
  } else if (viewDuration <= 2 * 60 * 60 * 1000) {
    tickIntervalMs = 15 * 60 * 1000; // 15min
  } else if (viewDuration <= 6 * 60 * 60 * 1000) {
    tickIntervalMs = 30 * 60 * 1000; // 30min
  } else {
    tickIntervalMs = 60 * 60 * 1000; // 1hr
  }

  // Generate tick marks
  const firstTick = Math.ceil(viewStart / tickIntervalMs) * tickIntervalMs;
  const ticks: number[] = [];
  for (let t = firstTick; t <= viewEnd; t += tickIntervalMs) {
    ticks.push(t);
  }

  return (
    <div className="flex items-stretch border-b border-border">
      <div
        className="flex-shrink-0 border-r border-border px-4 py-2"
        style={{ width: AGENT_NAME_COL_WIDTH }}
      >
        <span className="text-overline uppercase text-content-tertiary">Agent</span>
      </div>
      <div className="relative flex-1 py-2">
        {ticks.map((tick) => {
          const leftPercent = ((tick - viewStart) / viewDuration) * 100;
          return (
            <div
              key={tick}
              className="absolute top-0 flex h-full flex-col items-center"
              style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}
            >
              <span className="font-mono text-[10px] text-content-tertiary">
                {formatTimeAxis(new Date(tick))}
              </span>
              <div className="mt-1 h-full w-px bg-border opacity-40" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Color legend
// ---------------------------------------------------------------------------

function ColorLegend() {
  const legendStates: AgentState[] = ['idle', 'talking', 'ringing', 'hold', 'acw', 'dnd', 'logged-out'];

  return (
    <div className="flex flex-wrap items-center gap-4 text-caption">
      {legendStates.map((state) => (
        <div key={state} className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: AGENT_STATE_COLORS[state] }}
          />
          <span className="text-content-secondary">{AGENT_STATE_LABELS[state]}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent Timeline Page
// ---------------------------------------------------------------------------

export default function AgentTimelinePage() {
  return (
    <React.Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-zinc-500" /></div>}>
      <AgentTimelinePageInner />
    </React.Suspense>
  );
}

function AgentTimelinePageInner() {
  // Generate mock data once (fallback)
  const mockData = React.useMemo(() => generateMockAgentTimeline(), []);

  // URL-synced filters
  const [urlFilters, urlSetters] = useAgentTimelineFilters();

  // Fetch agents from API
  const {
    data: apiAgents,
    isLoading: agentsLoading,
    isError: agentsError,
  } = useAgentList();

  // Real-time agents from Zustand store
  const storeAgents = useAgentsFromStore();

  // Connection status
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const isConnected = connectionStatus === 'connected';

  // Merge: prefer store agents (real-time) if available, fall back to API, then mock
  const allAgents = React.useMemo(() => {
    if (storeAgents.length > 0) return storeAgents;
    if (apiAgents && apiAgents.length > 0) return apiAgents;
    return mockData.map((d) => d.agent);
  }, [storeAgents, apiAgents, mockData]);

  const isUsingMock = storeAgents.length === 0 && (!apiAgents || apiAgents.length === 0);

  // Filter agents by group from URL filter
  const filteredByGroup = React.useMemo(() => {
    if (!urlFilters.groupId) return allAgents;
    return allAgents.filter((a) => a.groups.includes(urlFilters.groupId));
  }, [allAgents, urlFilters.groupId]);

  // State
  const [selectedAgents, setSelectedAgents] = React.useState<Set<string>>(
    () => new Set(filteredByGroup.map((a) => a.id))
  );
  const [zoom, setZoom] = React.useState(DEFAULT_ZOOM);
  const [sortBy, setSortBy] = React.useState<'name' | 'extension'>('name');
  const [showLegend, setShowLegend] = React.useState(true);
  const [timeRange, setTimeRange] = React.useState<TimeRange>(() => ({
    from: new Date(Date.now() - 6 * 60 * 60 * 1000),
    to: new Date(),
  }));

  // Ref for auto-scroll container
  const timelineScrollRef = React.useRef<HTMLDivElement>(null);

  // Sync URL agent filter to selected agents
  React.useEffect(() => {
    if (urlFilters.agentId.length > 0) {
      setSelectedAgents(new Set(urlFilters.agentId));
    } else {
      setSelectedAgents(new Set(filteredByGroup.map((a) => a.id)));
    }
  }, [filteredByGroup, urlFilters.agentId]);

  // Sync URL date filter to time range
  React.useEffect(() => {
    if (urlFilters.date) {
      const dateStr = urlFilters.date;
      const today = new Date().toISOString().slice(0, 10);
      if (dateStr === today) {
        // Today: show 6 hours ending at now
        setTimeRange({
          from: new Date(Date.now() - 6 * 60 * 60 * 1000),
          to: new Date(),
        });
      } else {
        // Historical date: show full day
        const dayStart = new Date(`${dateStr}T00:00:00`);
        const dayEnd = new Date(`${dateStr}T23:59:59`);
        setTimeRange({ from: dayStart, to: dayEnd });
      }
    }
  }, [urlFilters.date]);

  // Update selected agents when agent list changes (only if not URL-filtered)
  React.useEffect(() => {
    if (urlFilters.agentId.length === 0) {
      setSelectedAgents(new Set(filteredByGroup.map((a) => a.id)));
    }
  }, [filteredByGroup, urlFilters.agentId]);

  // Fetch timeline data for selected agent (first selected for now)
  // In production, you'd fetch for all selected or batch
  const firstSelectedId = React.useMemo(
    () => Array.from(selectedAgents)[0] ?? null,
    [selectedAgents],
  );

  const {
    data: apiTimeline,
    isLoading: timelineLoading,
  } = useAgentTimeline(
    firstSelectedId,
    timeRange.from.toISOString(),
    timeRange.to.toISOString(),
  );

  // Build timeline map: agentId -> entries
  // Use API data if available, otherwise mock
  const timelineMap = React.useMemo(() => {
    const map = new Map<string, AgentTimelineEntry[]>();

    // Always populate from mock as baseline fallback
    mockData.forEach((d) => map.set(d.agent.id, d.timeline));

    // Overlay API data if available
    if (apiTimeline && apiTimeline.length > 0 && firstSelectedId) {
      map.set(firstSelectedId, apiTimeline);
    }

    return map;
  }, [mockData, apiTimeline, firstSelectedId]);

  // Compute view window based on time range and zoom
  const viewStart = timeRange.from.getTime();
  const viewEnd = timeRange.to.getTime();

  // Auto-scroll to "now" position on initial load
  React.useEffect(() => {
    const container = timelineScrollRef.current;
    if (!container) return;

    const now = Date.now();
    if (now >= viewStart && now <= viewEnd) {
      const viewDuration = viewEnd - viewStart;
      const nowPercent = (now - viewStart) / viewDuration;
      // Scroll so "now" is roughly 75% from left
      const scrollTarget = (nowPercent * container.scrollWidth) - (container.clientWidth * 0.75);
      if (scrollTarget > 0) {
        container.scrollTo({ left: scrollTarget, behavior: 'smooth' });
      }
    }
    // Run once on mount and when time range changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewStart, viewEnd]);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    React.useMemo(
      () => [
        {
          key: 'L',
          eventKey: 'l',
          description: 'Toggle legend',
          category: 'Agent Timeline',
          handler: () => setShowLegend((prev) => !prev),
        },
        {
          key: '+',
          eventKey: '+',
          description: 'Zoom in',
          category: 'Agent Timeline',
          handler: () => setZoom((prev) => Math.min(prev * 1.5, MAX_ZOOM)),
        },
        {
          key: '-',
          eventKey: '-',
          description: 'Zoom out',
          category: 'Agent Timeline',
          handler: () => setZoom((prev) => Math.max(prev / 1.5, MIN_ZOOM)),
        },
        {
          key: 'N',
          eventKey: 'n',
          description: 'Jump to now',
          category: 'Agent Timeline',
          handler: () => {
            const duration = timeRange.to.getTime() - timeRange.from.getTime();
            setTimeRange({
              from: new Date(Date.now() - duration),
              to: new Date(),
            });
          },
        },
      ],
      [timeRange],
    ),
  );

  function toggleAgent(id: string) {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // Sync selection to URL
      urlSetters.setAgentId(Array.from(next));
      return next;
    });
  }

  function handleZoomIn() {
    setZoom((prev) => Math.min(prev * 1.5, MAX_ZOOM));
  }

  function handleZoomOut() {
    setZoom((prev) => Math.max(prev / 1.5, MIN_ZOOM));
  }

  function handleNow() {
    const duration = timeRange.to.getTime() - timeRange.from.getTime();
    setTimeRange({
      from: new Date(Date.now() - duration),
      to: new Date(),
    });
  }

  function handleSegmentClick(entry: AgentTimelineEntry) {
    if (entry.callId) {
      // In production, this would navigate to /calls?id=<callId>
      // eslint-disable-next-line no-console
      console.log(`[Navigate] Open call ${entry.callId} in C2G view`);
    }
  }

  // Filter and sort agents
  const visibleAgents = React.useMemo(() => {
    const filtered = filteredByGroup.filter((a) => selectedAgents.has(a.id));
    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return a.extension.localeCompare(b.extension);
    });
  }, [filteredByGroup, selectedAgents, sortBy]);

  const isLoading = agentsLoading || timelineLoading;

  // Compute agent state summary for the footer
  const stateSummary = React.useMemo(() => {
    const counts: Partial<Record<AgentState, number>> = {};
    for (const agent of visibleAgents) {
      counts[agent.state] = (counts[agent.state] ?? 0) + 1;
    }
    return counts;
  }, [visibleAgents]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-heading-xl text-content-primary">Agent Timeline</h1>
            <p className="text-body-sm text-content-secondary">
              Real-time agent state visualization
            </p>
          </div>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-content-tertiary" />
          )}
          {/* Connection / data mode indicators */}
          {isConnected && !isUsingMock ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </span>
          ) : agentsError ? (
            <span className="flex items-center gap-1.5 rounded-full bg-status-warning/10 px-2.5 py-0.5 text-[11px] font-semibold text-status-warning">
              <AlertTriangle className="h-3 w-3" />
              Demo Mode
            </span>
          ) : (
            <span className="rounded-full bg-zinc-500/10 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">
              Demo
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <AgentSelector
            agents={filteredByGroup}
            selected={selectedAgents}
            onToggle={toggleAgent}
          />

          <TimeRangeSelector
            value={timeRange}
            onChange={setTimeRange}
            showNowButton
            onNow={handleNow}
          />

          {/* Sort toggle */}
          <button
            onClick={() => setSortBy((prev) => (prev === 'name' ? 'extension' : 'name'))}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-3 py-2 text-body-sm text-content-secondary hover:text-content-primary transition-colors"
            title={`Sort by ${sortBy === 'name' ? 'extension' : 'name'}`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortBy === 'name' ? 'Name' : 'Ext'}
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface-elevated">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              className="p-2 text-content-tertiary hover:text-content-primary transition-colors disabled:opacity-40"
              title="Zoom out (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="px-2 font-mono text-mono-sm text-content-secondary">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="p-2 text-content-tertiary hover:text-content-primary transition-colors disabled:opacity-40"
              title="Zoom in (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Color legend */}
      {showLegend && (
        <div className="border-b border-border bg-surface-card px-6 py-2">
          <ColorLegend />
        </div>
      )}

      {/* Timeline area */}
      <div className="flex-1 overflow-auto" ref={timelineScrollRef}>
        <div className="relative" style={{ minWidth: '100%' }}>
          {/* Time axis */}
          <TimeAxis viewStart={viewStart} viewEnd={viewEnd} />

          {/* "Now" marker line spanning across all rows */}
          <div className="relative">
            {/* Now marker container -- positioned relative to the timeline area */}
            <div
              className="pointer-events-none absolute inset-0 z-20"
              style={{ left: AGENT_NAME_COL_WIDTH }}
            >
              <NowMarker viewStart={viewStart} viewEnd={viewEnd} />
            </div>

            {/* Agent rows */}
            {visibleAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-content-secondary">
                <p className="text-body-md">No agents selected</p>
                <p className="mt-1 text-body-sm text-content-tertiary">
                  Use the agent selector above to choose which agents to display.
                </p>
              </div>
            ) : (
              visibleAgents.map((agent) => (
                <TimelineRow
                  key={agent.id}
                  agent={agent}
                  timeline={timelineMap.get(agent.id) ?? []}
                  viewStart={viewStart}
                  viewEnd={viewEnd}
                  onSegmentClick={handleSegmentClick}
                  showRealtimeOverlay={isConnected && !isUsingMock}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer with summary */}
      <div className="flex items-center justify-between border-t border-border bg-surface-card px-6 py-2">
        <div className="flex items-center gap-6 text-body-sm text-content-tertiary">
          <span>
            Showing{' '}
            <span className="font-mono text-mono-sm text-content-primary">
              {visibleAgents.length}
            </span>{' '}
            of{' '}
            <span className="font-mono text-mono-sm text-content-primary">
              {filteredByGroup.length}
            </span>{' '}
            agents
          </span>
          <span>
            Time range:{' '}
            <span className="font-mono text-mono-sm text-content-secondary">
              {timeRange.from.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              {' - '}
              {timeRange.to.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </span>
          {/* Agent state summary */}
          {visibleAgents.length > 0 && (
            <span className="flex items-center gap-3">
              {stateSummary.idle != null && stateSummary.idle > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: AGENT_STATE_COLORS.idle }} />
                  <span className="font-mono text-mono-sm">{stateSummary.idle}</span>
                </span>
              )}
              {stateSummary.talking != null && stateSummary.talking > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: AGENT_STATE_COLORS.talking }} />
                  <span className="font-mono text-mono-sm">{stateSummary.talking}</span>
                </span>
              )}
              {stateSummary.acw != null && stateSummary.acw > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: AGENT_STATE_COLORS.acw }} />
                  <span className="font-mono text-mono-sm">{stateSummary.acw}</span>
                </span>
              )}
              {stateSummary.dnd != null && stateSummary.dnd > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: AGENT_STATE_COLORS.dnd }} />
                  <span className="font-mono text-mono-sm">{stateSummary.dnd}</span>
                </span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-caption text-content-tertiary">
            N = Jump to now
          </span>
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="text-caption text-content-tertiary hover:text-content-secondary transition-colors"
          >
            {showLegend ? 'Hide' : 'Show'} legend (L)
          </button>
        </div>
      </div>
    </div>
  );
}
