'use client';

import * as React from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import type { SortingState, PaginationState } from '@tanstack/react-table';
import {
  PhoneIncoming,
  PhoneOutgoing,
  Phone,
  Mic,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Loader2,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import {
  FilterBuilder,
  ActiveFilterChips,
  type FilterSchema,
  type FilterState,
} from '@/components/shared/filter-builder';
import { EventBar, EventDetailList } from '@/components/shared/event-bar';
import { TimeRangeSelector, type TimeRange } from '@/components/shared/time-range-selector';
import { EVENT_COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useCalls, usePrefetchCalls, useCallEvents, type CallFilters } from '@/hooks/use-calls';
import { useActiveCalls } from '@/stores/call-store';
import { useUIStore } from '@/stores/ui-store';
import { useKeyboardShortcuts, type ShortcutDef } from '@/hooks/use-keyboard-shortcuts';
import type { Call, CallEvent, CallDirection, CallState, CallEventType } from '@/types';

// ---------------------------------------------------------------------------
// Mock data generator (kept as fallback for demo mode)
// ---------------------------------------------------------------------------

const AGENT_NAMES = [
  'Sarah Johnson', 'Mike Chen', 'Emma Wilson', 'James Brown',
  'Lisa Davis', 'Robert Taylor', 'Amy Garcia', 'David Martinez',
  'Jennifer Lee', 'Chris Anderson',
];

const QUEUE_NAMES = ['Sales', 'Support', 'Billing', 'Technical', 'General'];

function randomPhone(): string {
  const area = Math.floor(200 + Math.random() * 800);
  const pre = Math.floor(200 + Math.random() * 800);
  const line = Math.floor(1000 + Math.random() * 9000);
  return `(${area}) ${pre}-${line}`;
}

function randomExt(): string {
  return String(200 + Math.floor(Math.random() * 100));
}

function randomName(): string {
  const first = ['John', 'Jane', 'Bob', 'Alice', 'Tom', 'Mary', 'Sam', 'Kate', 'Dan', 'Lisa'];
  const last = ['Smith', 'Jones', 'Wilson', 'Brown', 'Davis', 'Clark', 'Hall', 'White', 'King', 'Green'];
  return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
}

const EVENT_SEQUENCES: { type: CallEventType; durationRange: [number, number] }[][] = [
  // Inbound answered
  [
    { type: 'initiated', durationRange: [1, 3] },
    { type: 'queued', durationRange: [5, 30] },
    { type: 'ringing', durationRange: [3, 15] },
    { type: 'answered', durationRange: [30, 300] },
    { type: 'completed', durationRange: [1, 2] },
  ],
  // Inbound with hold
  [
    { type: 'initiated', durationRange: [1, 3] },
    { type: 'ringing', durationRange: [5, 20] },
    { type: 'answered', durationRange: [60, 180] },
    { type: 'held', durationRange: [10, 60] },
    { type: 'retrieved', durationRange: [30, 120] },
    { type: 'completed', durationRange: [1, 2] },
  ],
  // Inbound transferred
  [
    { type: 'initiated', durationRange: [1, 3] },
    { type: 'queued', durationRange: [10, 45] },
    { type: 'ringing', durationRange: [5, 15] },
    { type: 'answered', durationRange: [20, 60] },
    { type: 'transferred', durationRange: [5, 15] },
    { type: 'ringing', durationRange: [3, 10] },
    { type: 'answered', durationRange: [60, 240] },
    { type: 'completed', durationRange: [1, 2] },
  ],
  // Abandoned
  [
    { type: 'initiated', durationRange: [1, 3] },
    { type: 'queued', durationRange: [30, 90] },
    { type: 'abandoned', durationRange: [1, 2] },
  ],
  // Outbound
  [
    { type: 'initiated', durationRange: [1, 3] },
    { type: 'ringing', durationRange: [5, 20] },
    { type: 'answered', durationRange: [60, 300] },
    { type: 'completed', durationRange: [1, 2] },
  ],
  // Voicemail
  [
    { type: 'initiated', durationRange: [1, 3] },
    { type: 'ringing', durationRange: [15, 30] },
    { type: 'voicemail', durationRange: [15, 60] },
    { type: 'completed', durationRange: [1, 2] },
  ],
];

function generateMockEvents(callId: string, baseTime: Date): CallEvent[] {
  const sequence = EVENT_SEQUENCES[Math.floor(Math.random() * EVENT_SEQUENCES.length)];
  const events: CallEvent[] = [];
  let currentTime = baseTime.getTime();

  sequence.forEach((template, index) => {
    const duration =
      template.durationRange[0] +
      Math.random() * (template.durationRange[1] - template.durationRange[0]);

    events.push({
      id: `${callId}-evt-${index}`,
      callId,
      type: template.type,
      timestamp: new Date(currentTime).toISOString(),
      duration: Math.round(duration),
      party: Math.random() > 0.5 ? randomExt() : null,
      details: {},
    });

    currentTime += duration * 1000;
  });

  return events;
}

function generateMockCalls(count: number): { calls: Call[]; eventsMap: Map<string, CallEvent[]> } {
  const calls: Call[] = [];
  const eventsMap = new Map<string, CallEvent[]>();
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const id = `call-${String(i + 1).padStart(4, '0')}`;
    const startOffset = Math.floor(Math.random() * 24 * 60 * 60 * 1000); // within last 24h
    const startTime = new Date(now - startOffset);
    const events = generateMockEvents(id, startTime);
    const totalDuration = events.reduce((sum, e) => sum + (e.duration ?? 0), 0);
    const endTime = new Date(startTime.getTime() + totalDuration * 1000);

    const directions: CallDirection[] = ['inbound', 'outbound', 'internal'];
    const direction = directions[Math.floor(Math.random() * 3)];
    const hasAbandoned = events.some((e) => e.type === 'abandoned');
    const hasAnswered = events.some((e) => e.type === 'answered');

    let state: CallState = 'completed';
    if (hasAbandoned) state = 'abandoned';

    const agentName = AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];
    const holdEvents = events.filter((e) => e.type === 'held');
    const holdDuration = holdEvents.reduce((s, e) => s + (e.duration ?? 0), 0);
    const transferEvents = events.filter((e) => e.type === 'transferred');

    const call: Call = {
      id,
      direction,
      state,
      callerNumber: direction === 'outbound' ? randomExt() : randomPhone(),
      callerName: direction === 'outbound' ? agentName : randomName(),
      calledNumber: direction === 'inbound' ? randomExt() : randomPhone(),
      calledName: direction === 'inbound' ? agentName : randomName(),
      queueName: Math.random() > 0.3 ? QUEUE_NAMES[Math.floor(Math.random() * QUEUE_NAMES.length)] : null,
      queueEntryTime: null,
      agentExtension: randomExt(),
      agentName,
      trunkId: `trunk-${Math.floor(Math.random() * 4) + 1}`,
      startTime: startTime.toISOString(),
      answerTime: hasAnswered
        ? new Date(startTime.getTime() + (events.find((e) => e.type === 'answered')?.duration ?? 5) * 1000).toISOString()
        : null,
      endTime: endTime.toISOString(),
      duration: totalDuration,
      holdCount: holdEvents.length,
      holdDuration,
      transferCount: transferEvents.length,
      recordingId: Math.random() > 0.4 ? `rec-${id}` : null,
      tags: [],
    };

    calls.push(call);
    eventsMap.set(id, events);
  }

  // Sort by start time descending
  calls.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  return { calls, eventsMap };
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function DirectionIcon({ direction }: { direction: CallDirection }) {
  switch (direction) {
    case 'inbound':
      return <PhoneIncoming className="h-4 w-4 text-status-success" />;
    case 'outbound':
      return <PhoneOutgoing className="h-4 w-4 text-status-info" />;
    case 'internal':
      return <Phone className="h-4 w-4 text-content-tertiary" />;
  }
}

function StateBadge({ state }: { state: CallState }) {
  const styles: Record<string, string> = {
    completed: 'bg-status-success/10 text-status-success',
    abandoned: 'bg-status-danger/10 text-status-danger',
    ringing: 'bg-event-ringing/10 text-event-ringing',
    connected: 'bg-event-talking/10 text-event-talking',
    hold: 'bg-event-hold/10 text-event-hold',
    queued: 'bg-event-queue/10 text-event-queue',
    voicemail: 'bg-event-voicemail/10 text-event-voicemail',
    idle: 'bg-content-tertiary/10 text-content-tertiary',
    transferring: 'bg-event-transfer/10 text-event-transfer',
    conferencing: 'bg-event-conference/10 text-event-conference',
    parked: 'bg-event-park/10 text-event-park',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
        styles[state] ?? 'bg-surface-elevated text-content-secondary'
      )}
    >
      {state}
    </span>
  );
}

const columnHelper = createColumnHelper<Call>();

function buildColumns(eventsMap: Map<string, CallEvent[]>) {
  return [
    columnHelper.accessor('startTime', {
      header: 'Start Time',
      cell: (info) => {
        const d = new Date(info.getValue());
        return (
          <span className="font-mono text-mono-sm">
            {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
            {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        );
      },
      size: 180,
    }),
    columnHelper.accessor('duration', {
      header: 'Duration',
      cell: (info) => (
        <span className="font-mono text-mono-sm">{formatDuration(info.getValue())}</span>
      ),
      size: 90,
    }),
    columnHelper.accessor('direction', {
      header: 'Dir',
      cell: (info) => <DirectionIcon direction={info.getValue()} />,
      size: 50,
      enableSorting: false,
    }),
    columnHelper.accessor('callerNumber', {
      header: 'Caller Number',
      cell: (info) => <span className="font-mono text-mono-sm">{info.getValue()}</span>,
      size: 150,
    }),
    columnHelper.accessor('callerName', {
      header: 'Caller Name',
      cell: (info) => <span className="truncate">{info.getValue() ?? '--'}</span>,
      size: 140,
    }),
    columnHelper.accessor('calledNumber', {
      header: 'Called Number',
      cell: (info) => <span className="font-mono text-mono-sm">{info.getValue()}</span>,
      size: 150,
    }),
    columnHelper.accessor('calledName', {
      header: 'Called Name',
      cell: (info) => <span className="truncate">{info.getValue() ?? '--'}</span>,
      size: 140,
    }),
    columnHelper.accessor('agentName', {
      header: 'Agent',
      cell: (info) => <span className="truncate">{info.getValue() ?? '--'}</span>,
      size: 130,
    }),
    columnHelper.accessor('queueName', {
      header: 'Queue',
      cell: (info) => (
        <span className="text-content-secondary">{info.getValue() ?? '--'}</span>
      ),
      size: 100,
    }),
    columnHelper.accessor('state', {
      header: 'State',
      cell: (info) => <StateBadge state={info.getValue()} />,
      size: 110,
    }),
    columnHelper.accessor('recordingId', {
      header: 'Rec',
      cell: (info) =>
        info.getValue() ? (
          <Mic className="h-4 w-4 text-status-info" />
        ) : (
          <span className="text-content-tertiary">--</span>
        ),
      size: 50,
      enableSorting: false,
    }),
    columnHelper.display({
      id: 'events',
      header: 'Events',
      cell: (info) => {
        const events = eventsMap.get(info.row.original.id);
        return (
          <span className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-mono-sm text-content-secondary">
            {events?.length ?? 0}
          </span>
        );
      },
      size: 70,
    }),
  ];
}

// ---------------------------------------------------------------------------
// Filter schema
// ---------------------------------------------------------------------------

const filterSchema: FilterSchema = {
  fields: [
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'daterange',
      category: 'Time',
    },
    {
      key: 'caller',
      label: 'Caller Number',
      type: 'text',
      category: 'Caller',
      placeholder: 'Search caller...',
    },
    {
      key: 'callerName',
      label: 'Caller Name',
      type: 'text',
      category: 'Caller',
      placeholder: 'Search name...',
    },
    {
      key: 'calledNumber',
      label: 'Called Number',
      type: 'text',
      category: 'Called',
      placeholder: 'Search called...',
    },
    {
      key: 'agent',
      label: 'Agent',
      type: 'multiselect',
      category: 'Agent',
      options: AGENT_NAMES.map((n) => ({ label: n, value: n })),
    },
    {
      key: 'group',
      label: 'Queue / Group',
      type: 'multiselect',
      category: 'Group',
      options: QUEUE_NAMES.map((n) => ({ label: n, value: n })),
    },
    {
      key: 'direction',
      label: 'Direction',
      type: 'multiselect',
      category: 'Direction',
      options: [
        { label: 'Inbound', value: 'inbound' },
        { label: 'Outbound', value: 'outbound' },
        { label: 'Internal', value: 'internal' },
      ],
    },
    {
      key: 'state',
      label: 'State',
      type: 'multiselect',
      category: 'State',
      options: [
        { label: 'Completed', value: 'completed' },
        { label: 'Abandoned', value: 'abandoned' },
        { label: 'Ringing', value: 'ringing' },
        { label: 'Queued', value: 'queued' },
      ],
    },
    {
      key: 'durationRange',
      label: 'Duration (seconds)',
      type: 'number-range',
      category: 'Duration',
    },
    {
      key: 'hasRecording',
      label: 'Has Recording',
      type: 'boolean',
      category: 'Recording',
    },
  ],
};

// ---------------------------------------------------------------------------
// Export dropdown
// ---------------------------------------------------------------------------

function ExportDropdown() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function stub(format: string) {
    // eslint-disable-next-line no-console
    console.log(`[Export] ${format} export triggered (stub)`);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-body-sm text-content-primary hover:bg-surface-overlay transition-colors"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className="h-3.5 w-3.5 text-content-tertiary" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-surface-elevated shadow-lg animate-fade-in">
          <button
            onClick={() => stub('CSV')}
            className="flex w-full items-center gap-2 px-3 py-2 text-body-sm text-content-secondary hover:bg-surface-overlay hover:text-content-primary transition-colors"
          >
            <FileText className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => stub('Excel')}
            className="flex w-full items-center gap-2 px-3 py-2 text-body-sm text-content-secondary hover:bg-surface-overlay hover:text-content-primary transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <button
            onClick={() => stub('PDF')}
            className="flex w-full items-center gap-2 px-3 py-2 text-body-sm text-content-secondary hover:bg-surface-overlay hover:text-content-primary transition-colors"
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton for the table area
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <div className="h-10 w-full animate-shimmer rounded bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]" />
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="h-12 w-full animate-shimmer rounded bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error banner
// ---------------------------------------------------------------------------

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-6 mt-4 flex items-center gap-3 rounded-lg border border-status-danger/30 bg-status-danger/10 px-4 py-3">
      <AlertTriangle className="h-5 w-5 text-status-danger shrink-0" />
      <div className="flex-1">
        <p className="text-body-sm font-medium text-status-danger">Failed to load calls</p>
        <p className="text-caption text-content-tertiary">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md border border-status-danger/30 px-3 py-1 text-caption font-medium text-status-danger hover:bg-status-danger/20 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expanded row content -- fetches real events via useCallEvents
// ---------------------------------------------------------------------------

function ExpandedCallContent({
  call,
  fallbackEvents,
}: {
  call: Call;
  fallbackEvents: CallEvent[];
}) {
  // Attempt to fetch real events from API
  const { data: apiEvents, isLoading } = useCallEvents(call.id);
  const events = apiEvents && apiEvents.length > 0 ? apiEvents : fallbackEvents;

  const startTime = new Date(call.startTime);
  const endTime = call.endTime ? new Date(call.endTime) : new Date();

  return (
    <div className="space-y-4">
      {/* Timeline bar */}
      <div>
        <div className="mb-2 flex items-center justify-between text-caption text-content-tertiary">
          <span>
            {startTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
          <span className="font-mono">{formatDuration(call.duration)}</span>
          <span>
            {endTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>
        {isLoading ? (
          <div className="h-9 w-full animate-shimmer rounded bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]" />
        ) : (
          <EventBar
            events={events}
            startTime={startTime}
            endTime={endTime}
            height={36}
            showTooltip
          />
        )}
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-3 text-caption">
        {[
          { key: 'ringing', label: 'Ringing' },
          { key: 'talking', label: 'Talking' },
          { key: 'hold', label: 'Hold' },
          { key: 'queue', label: 'Queue' },
          { key: 'transfer', label: 'Transfer' },
          { key: 'voicemail', label: 'Voicemail' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: EVENT_COLORS[key as keyof typeof EVENT_COLORS] }}
            />
            <span className="text-content-secondary">{label}</span>
          </div>
        ))}
      </div>

      {/* Event detail list */}
      <div className="rounded-lg border border-border bg-surface-base p-3">
        <h4 className="mb-2 text-heading-sm text-content-primary">Event Details</h4>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-full animate-shimmer rounded bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]"
              />
            ))}
          </div>
        ) : (
          <EventDetailList events={events} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calls Page
// ---------------------------------------------------------------------------

export default function CallsPage() {
  // Generate mock data once (fallback for demo mode)
  const { calls: mockCalls, eventsMap: mockEventsMap } = React.useMemo(
    () => generateMockCalls(50),
    [],
  );

  // Real-time active calls from Zustand store
  const liveCalls = useActiveCalls();
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const isSocketConnected = connectionStatus === 'connected';

  // State
  const [filterCollapsed, setFilterCollapsed] = React.useState(false);
  const [filters, setFilters] = React.useState<FilterState>({});
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'startTime', desc: true },
  ]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [searchQuery, setSearchQuery] = React.useState('');
  const [timeRange, setTimeRange] = React.useState<TimeRange>({
    from: new Date(Date.now() - 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Track newly arrived live calls for highlight animation
  const prevLiveIdsRef = React.useRef<Set<string>>(new Set());
  const [newCallIds, setNewCallIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const currentIds = new Set(liveCalls.map((c) => c.id));
    const fresh = new Set<string>();
    for (const id of currentIds) {
      if (!prevLiveIdsRef.current.has(id)) {
        fresh.add(id);
      }
    }
    prevLiveIdsRef.current = currentIds;
    if (fresh.size > 0) {
      setNewCallIds(fresh);
      const timer = setTimeout(() => setNewCallIds(new Set()), 2000);
      return () => clearTimeout(timer);
    }
  }, [liveCalls]);

  // Build API filter params from UI state
  const apiFilters: CallFilters = React.useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      sortBy: sorting[0]?.id ?? 'startTime',
      sortDir: sorting[0]?.desc ? 'desc' : 'asc',
      search: searchQuery || undefined,
      caller: (filters.caller as string) || undefined,
      callerName: (filters.callerName as string) || undefined,
      calledNumber: (filters.calledNumber as string) || undefined,
      agent: (filters.agent as string[])?.length ? (filters.agent as string[]) : undefined,
      group: (filters.group as string[])?.length ? (filters.group as string[]) : undefined,
      direction: (filters.direction as string[])?.length ? (filters.direction as string[]) : undefined,
      state: (filters.state as string[])?.length ? (filters.state as string[]) : undefined,
      durationRange: filters.durationRange as { min?: number; max?: number } | undefined,
      dateRange: {
        from: timeRange.from.toISOString(),
        to: timeRange.to.toISOString(),
      },
      hasRecording: filters.hasRecording as boolean | undefined,
    }),
    [filters, sorting, pagination, searchQuery, timeRange],
  );

  // Fetch calls from API
  const {
    data: apiData,
    isLoading,
    isError,
    error,
    refetch,
  } = useCalls(apiFilters);

  // Prefetch helper
  const prefetchCalls = usePrefetchCalls();

  // Determine which data to use: merge live calls + API data, or mock fallback
  const apiCalls = apiData?.data;
  const useMock = !apiCalls || apiCalls.length === 0;

  // Merge live calls at the top of the list when connected
  const displayCalls = React.useMemo(() => {
    if (useMock) {
      // In demo mode, merge live calls on top of mock data
      if (liveCalls.length > 0) {
        const liveIds = new Set(liveCalls.map((c) => c.id));
        const deduped = mockCalls.filter((c) => !liveIds.has(c.id));
        return [...liveCalls, ...deduped];
      }
      return mockCalls;
    }
    // In API mode, merge live calls on top
    if (liveCalls.length > 0) {
      const liveIds = new Set(liveCalls.map((c) => c.id));
      const deduped = apiCalls.filter((c) => !liveIds.has(c.id));
      return [...liveCalls, ...deduped];
    }
    return apiCalls;
  }, [useMock, mockCalls, apiCalls, liveCalls]);

  const eventsMap = useMock ? mockEventsMap : new Map<string, CallEvent[]>();

  // For mock mode, apply client-side filtering
  const filteredCalls = React.useMemo(() => {
    if (!useMock) return displayCalls;

    let result = displayCalls;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.callerNumber.toLowerCase().includes(q) ||
          c.calledNumber.toLowerCase().includes(q) ||
          (c.callerName?.toLowerCase().includes(q) ?? false) ||
          (c.calledName?.toLowerCase().includes(q) ?? false) ||
          (c.agentName?.toLowerCase().includes(q) ?? false) ||
          c.id.toLowerCase().includes(q)
      );
    }

    // Apply filters
    if (filters.caller) {
      result = result.filter((c) =>
        c.callerNumber.toLowerCase().includes((filters.caller as string).toLowerCase())
      );
    }
    if (filters.callerName) {
      result = result.filter((c) =>
        c.callerName?.toLowerCase().includes((filters.callerName as string).toLowerCase())
      );
    }
    if (filters.calledNumber) {
      result = result.filter((c) =>
        c.calledNumber.toLowerCase().includes((filters.calledNumber as string).toLowerCase())
      );
    }
    if (filters.agent && (filters.agent as string[]).length > 0) {
      result = result.filter((c) =>
        (filters.agent as string[]).includes(c.agentName ?? '')
      );
    }
    if (filters.group && (filters.group as string[]).length > 0) {
      result = result.filter((c) =>
        (filters.group as string[]).includes(c.queueName ?? '')
      );
    }
    if (filters.direction && (filters.direction as string[]).length > 0) {
      result = result.filter((c) =>
        (filters.direction as string[]).includes(c.direction)
      );
    }
    if (filters.state && (filters.state as string[]).length > 0) {
      result = result.filter((c) =>
        (filters.state as string[]).includes(c.state)
      );
    }
    if (filters.durationRange) {
      const dr = filters.durationRange as { min?: number; max?: number };
      if (dr.min !== undefined) result = result.filter((c) => c.duration >= dr.min!);
      if (dr.max !== undefined) result = result.filter((c) => c.duration <= dr.max!);
    }
    if (filters.hasRecording) {
      result = result.filter((c) => c.recordingId !== null);
    }

    return result;
  }, [useMock, displayCalls, searchQuery, filters]);

  const totalCount = useMock
    ? filteredCalls.length
    : apiData?.meta?.total ?? filteredCalls.length;

  // Keyboard shortcuts
  useKeyboardShortcuts(
    React.useMemo<ShortcutDef[]>(
      () => [
        {
          key: 'F',
          eventKey: 'f',
          description: 'Toggle filter panel',
          category: 'Table Navigation',
          handler: () => setFilterCollapsed((prev) => !prev),
        },
        {
          key: 'R',
          eventKey: 'r',
          description: 'Refresh data',
          category: 'Table Navigation',
          handler: () => { refetch(); },
        },
        {
          key: 'Cmd+/',
          eventKey: '/',
          meta: true,
          description: 'Focus search',
          category: 'Table Navigation',
          global: true,
          handler: () => searchRef.current?.focus(),
        },
      ],
      [refetch],
    ),
  );

  // Prefetch next page on hover
  const handlePrefetchNextPage = React.useCallback(() => {
    if (!useMock && apiData?.meta) {
      const nextPage = (apiData.meta.page ?? 0) + 1;
      if (nextPage <= (apiData.meta.pageCount ?? 1)) {
        prefetchCalls({ ...apiFilters, page: nextPage });
      }
    }
  }, [useMock, apiData, apiFilters, prefetchCalls]);

  const columns = React.useMemo(() => buildColumns(eventsMap), [eventsMap]);

  return (
    <div className="flex h-full">
      {/* Filter sidebar */}
      <FilterBuilder
        schema={filterSchema}
        value={filters}
        onChange={setFilters}
        onReset={() => setFilters({})}
        collapsed={filterCollapsed}
        onToggleCollapsed={() => setFilterCollapsed(!filterCollapsed)}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFilterCollapsed(!filterCollapsed)}
              className="rounded-md p-1.5 text-content-tertiary hover:bg-surface-elevated hover:text-content-secondary transition-colors"
              title={filterCollapsed ? 'Show filters (F)' : 'Hide filters (F)'}
              aria-label={filterCollapsed ? 'Show filter panel' : 'Hide filter panel'}
              aria-expanded={!filterCollapsed}
            >
              {filterCollapsed ? (
                <PanelLeft className="h-5 w-5" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <div>
              <h1 className="text-heading-xl text-content-primary">Calls</h1>
              <p className="text-body-sm text-content-secondary">
                Cradle-to-grave call history and search
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-content-tertiary" />
            )}
            {isSocketConnected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-status-success/10 px-2 py-0.5 text-[11px] font-semibold text-status-success">
                <Radio className="h-3 w-3" />
                Live updating
              </span>
            )}
            {useMock && !isLoading && !isSocketConnected && (
              <span className="rounded-full bg-status-warning/10 px-2 py-0.5 text-[11px] font-semibold text-status-warning">
                Demo Mode
              </span>
            )}
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <ExportDropdown />
          </div>
        </div>

        {/* Error banner */}
        {isError && (
          <ErrorBanner
            message={(error as { message?: string })?.message ?? 'An unexpected error occurred'}
            onRetry={() => refetch()}
          />
        )}

        {/* Search bar + active filters */}
        <div className="border-b border-border">
          <div className="flex items-center gap-3 px-6 py-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quick search calls... (Cmd+/)"
                className="w-full rounded-md border border-border bg-surface-elevated py-2 pl-9 pr-3 text-body-sm text-content-primary placeholder:text-content-tertiary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>
            <div className="text-body-sm text-content-tertiary">
              {totalCount.toLocaleString()} calls
            </div>
          </div>
          <ActiveFilterChips
            schema={filterSchema}
            value={filters}
            onChange={setFilters}
            onReset={() => setFilters({})}
          />
        </div>

        {/* Summary metrics bar */}
        <div className="flex items-center gap-6 border-b border-border bg-surface-elevated px-6 py-2">
          {[
            {
              label: 'Total Calls',
              value: totalCount.toString(),
            },
            {
              label: 'Answered',
              value: filteredCalls.filter((c) => c.state === 'completed').length.toString(),
            },
            {
              label: 'Abandoned',
              value: filteredCalls.filter((c) => c.state === 'abandoned').length.toString(),
            },
            {
              label: 'Avg Duration',
              value: formatDuration(
                filteredCalls.length > 0
                  ? filteredCalls.reduce((s, c) => s + c.duration, 0) / filteredCalls.length
                  : 0
              ),
            },
            {
              label: 'Avg Hold',
              value: formatDuration(
                filteredCalls.length > 0
                  ? filteredCalls.reduce((s, c) => s + c.holdDuration, 0) / filteredCalls.length
                  : 0
              ),
            },
          ].map((metric) => (
            <div key={metric.label} className="flex items-center gap-2">
              <span className="text-body-sm text-content-tertiary">{metric.label}</span>
              <span className="font-mono text-mono-md font-semibold text-content-primary">
                {metric.value}
              </span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div
          className="flex-1 overflow-hidden px-6 py-4"
          onMouseEnter={handlePrefetchNextPage}
        >
          {isLoading && !useMock ? (
            <TableSkeleton />
          ) : (
            <DataTable
              columns={columns}
              data={filteredCalls}
              sorting={sorting}
              onSortingChange={setSorting}
              pagination={pagination}
              onPaginationChange={setPagination}
              expandable
              renderExpanded={(call) => (
                <ExpandedCallContent
                  call={call}
                  fallbackEvents={eventsMap.get(call.id) ?? []}
                />
              )}
              loading={isLoading}
              virtualized={filteredCalls.length > 500}
              stickyHeader
            />
          )}
        </div>
      </div>
    </div>
  );
}
