'use client';

import * as React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Play,
  Star,
  StarOff,
  BarChart3,
  Table2,
  Users,
  Phone,
  Radio,
  Layers,
  PhoneIncoming,
  Gauge,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  EVENT_COLORS,
  CHART_COLORS,
  SURFACES,
  TEXT_COLORS,
  chartAxisStyle,
  chartTooltipStyle,
} from '@/lib/theme';
import { TimeRangeSelector, type TimeRange } from '@/components/shared/time-range-selector';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useReportTemplates,
  useGenerateReport,
  useExportReport,
  type ReportTemplate as ApiReportTemplate,
} from '@/hooks/use-reports';

// ---------------------------------------------------------------------------
// Report template definitions
// ---------------------------------------------------------------------------

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'agent' | 'group' | 'queue' | 'call' | 'trunk' | 'inbound';
  icon: React.ReactNode;
  chartType: 'table' | 'bar' | 'gauge';
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'agent-performance',
    name: 'Agent Performance Summary',
    description: 'Calls handled, talk time, hold time per agent',
    category: 'agent',
    icon: <Users className="h-4 w-4" />,
    chartType: 'table',
  },
  {
    id: 'agent-activity',
    name: 'Agent Activity Detail',
    description: 'Detailed activity log with state changes',
    category: 'agent',
    icon: <Users className="h-4 w-4" />,
    chartType: 'table',
  },
  {
    id: 'agent-availability',
    name: 'Agent Availability',
    description: 'Login hours and availability percentage',
    category: 'agent',
    icon: <Users className="h-4 w-4" />,
    chartType: 'bar',
  },
  {
    id: 'call-volume-hour',
    name: 'Call Volume by Hour',
    description: 'Call distribution across hours of the day',
    category: 'call',
    icon: <Phone className="h-4 w-4" />,
    chartType: 'bar',
  },
  {
    id: 'call-detail',
    name: 'Call Detail Report',
    description: 'Individual call records with full metadata',
    category: 'call',
    icon: <Phone className="h-4 w-4" />,
    chartType: 'table',
  },
  {
    id: 'call-summary-day',
    name: 'Call Summary by Day',
    description: 'Daily call volume and average metrics',
    category: 'call',
    icon: <Phone className="h-4 w-4" />,
    chartType: 'bar',
  },
  {
    id: 'group-summary',
    name: 'Group Summary',
    description: 'Hunt group call distribution and service levels',
    category: 'group',
    icon: <Layers className="h-4 w-4" />,
    chartType: 'table',
  },
  {
    id: 'group-service-level',
    name: 'Group Service Level',
    description: 'SLA compliance by group',
    category: 'group',
    icon: <Layers className="h-4 w-4" />,
    chartType: 'gauge',
  },
  {
    id: 'queue-performance',
    name: 'Queue Performance',
    description: 'Wait times, abandon rates, service levels per queue',
    category: 'queue',
    icon: <Radio className="h-4 w-4" />,
    chartType: 'table',
  },
  {
    id: 'queue-service-level',
    name: 'Queue Service Level',
    description: 'SLA gauge for each queue',
    category: 'queue',
    icon: <Radio className="h-4 w-4" />,
    chartType: 'gauge',
  },
  {
    id: 'trunk-utilization',
    name: 'Trunk Utilization',
    description: 'Trunk usage percentage and peak concurrent calls',
    category: 'trunk',
    icon: <BarChart3 className="h-4 w-4" />,
    chartType: 'bar',
  },
  {
    id: 'inbound-summary',
    name: 'Inbound Summary',
    description: 'Inbound call metrics by DNIS/DID',
    category: 'inbound',
    icon: <PhoneIncoming className="h-4 w-4" />,
    chartType: 'table',
  },
  {
    id: 'inbound-by-dnis',
    name: 'Inbound by DNIS',
    description: 'Call volume and answer rates per DNIS',
    category: 'inbound',
    icon: <PhoneIncoming className="h-4 w-4" />,
    chartType: 'bar',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  agent: 'Agent',
  group: 'Group',
  queue: 'Queue',
  call: 'Call',
  trunk: 'Trunk',
  inbound: 'Inbound',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  agent: <Users className="h-4 w-4" />,
  group: <Layers className="h-4 w-4" />,
  queue: <Radio className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  trunk: <BarChart3 className="h-4 w-4" />,
  inbound: <PhoneIncoming className="h-4 w-4" />,
};

// ---------------------------------------------------------------------------
// Mock report data
// ---------------------------------------------------------------------------

// Agent Performance
const MOCK_AGENT_PERFORMANCE = [
  { agent: 'Sarah Johnson', callsHandled: 47, avgTalkTime: 234, avgHoldTime: 18, answerRate: 96 },
  { agent: 'Mike Chen', callsHandled: 52, avgTalkTime: 198, avgHoldTime: 22, answerRate: 94 },
  { agent: 'Emma Wilson', callsHandled: 38, avgTalkTime: 312, avgHoldTime: 31, answerRate: 92 },
  { agent: 'James Brown', callsHandled: 61, avgTalkTime: 156, avgHoldTime: 12, answerRate: 98 },
  { agent: 'Lisa Davis', callsHandled: 43, avgTalkTime: 267, avgHoldTime: 25, answerRate: 91 },
  { agent: 'Robert Taylor', callsHandled: 55, avgTalkTime: 189, avgHoldTime: 15, answerRate: 97 },
  { agent: 'Amy Garcia', callsHandled: 36, avgTalkTime: 345, avgHoldTime: 38, answerRate: 88 },
  { agent: 'David Martinez', callsHandled: 49, avgTalkTime: 211, avgHoldTime: 20, answerRate: 95 },
];

// Call Volume by Hour
const MOCK_CALL_VOLUME = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const label = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${hour < 12 ? 'AM' : 'PM'}`;
  // Simulate realistic call volume curve
  let calls = 0;
  if (hour >= 8 && hour <= 17) {
    calls = Math.round(15 + Math.random() * 30 + (hour >= 10 && hour <= 14 ? 20 : 0));
  } else if (hour >= 6 && hour < 8) {
    calls = Math.round(5 + Math.random() * 10);
  } else if (hour > 17 && hour <= 20) {
    calls = Math.round(8 + Math.random() * 15);
  } else {
    calls = Math.round(Math.random() * 5);
  }
  return { hour: label, calls, inbound: Math.round(calls * 0.65), outbound: Math.round(calls * 0.35) };
});

// Queue Service Levels
const MOCK_QUEUE_SLA = [
  { queue: 'Sales', sla: 94, target: 90, totalCalls: 312, abandoned: 8 },
  { queue: 'Support', sla: 87, target: 90, totalCalls: 456, abandoned: 23 },
  { queue: 'Billing', sla: 91, target: 85, totalCalls: 198, abandoned: 11 },
  { queue: 'Technical', sla: 78, target: 90, totalCalls: 267, abandoned: 34 },
  { queue: 'General', sla: 96, target: 80, totalCalls: 145, abandoned: 3 },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Report content renderers
// ---------------------------------------------------------------------------

function AgentPerformanceTable() {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left">
        <thead className="bg-surface-card">
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-caption font-semibold uppercase text-content-secondary">Agent</th>
            <th className="px-4 py-3 text-caption font-semibold uppercase text-content-secondary text-right">Calls Handled</th>
            <th className="px-4 py-3 text-caption font-semibold uppercase text-content-secondary text-right">Avg Talk Time</th>
            <th className="px-4 py-3 text-caption font-semibold uppercase text-content-secondary text-right">Avg Hold Time</th>
            <th className="px-4 py-3 text-caption font-semibold uppercase text-content-secondary text-right">Answer Rate</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_AGENT_PERFORMANCE.map((row) => (
            <tr key={row.agent} className="border-b border-border hover:bg-surface-elevated/50 transition-colors">
              <td className="px-4 py-3 text-body-sm text-content-primary font-medium">{row.agent}</td>
              <td className="px-4 py-3 text-right font-mono text-mono-sm text-content-primary">{row.callsHandled}</td>
              <td className="px-4 py-3 text-right font-mono text-mono-sm text-content-secondary">{formatDuration(row.avgTalkTime)}</td>
              <td className="px-4 py-3 text-right font-mono text-mono-sm text-content-secondary">{formatDuration(row.avgHoldTime)}</td>
              <td className="px-4 py-3 text-right">
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  row.answerRate >= 95
                    ? 'bg-status-success/10 text-status-success'
                    : row.answerRate >= 90
                      ? 'bg-status-warning/10 text-status-warning'
                      : 'bg-status-danger/10 text-status-danger'
                )}>
                  {row.answerRate}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        {/* Summary row */}
        <tfoot className="bg-surface-elevated">
          <tr className="border-t-2 border-border">
            <td className="px-4 py-3 text-body-sm font-semibold text-content-primary">Total / Average</td>
            <td className="px-4 py-3 text-right font-mono text-mono-sm font-semibold text-content-primary">
              {MOCK_AGENT_PERFORMANCE.reduce((s, r) => s + r.callsHandled, 0)}
            </td>
            <td className="px-4 py-3 text-right font-mono text-mono-sm text-content-secondary">
              {formatDuration(Math.round(MOCK_AGENT_PERFORMANCE.reduce((s, r) => s + r.avgTalkTime, 0) / MOCK_AGENT_PERFORMANCE.length))}
            </td>
            <td className="px-4 py-3 text-right font-mono text-mono-sm text-content-secondary">
              {formatDuration(Math.round(MOCK_AGENT_PERFORMANCE.reduce((s, r) => s + r.avgHoldTime, 0) / MOCK_AGENT_PERFORMANCE.length))}
            </td>
            <td className="px-4 py-3 text-right font-mono text-mono-sm font-semibold text-content-primary">
              {Math.round(MOCK_AGENT_PERFORMANCE.reduce((s, r) => s + r.answerRate, 0) / MOCK_AGENT_PERFORMANCE.length)}%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CallVolumeChart() {
  const tooltipStyles = chartTooltipStyle();
  const axisStyles = chartAxisStyle();

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={MOCK_CALL_VOLUME} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={SURFACES.elevated} vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ ...axisStyles }}
            tickLine={false}
            axisLine={{ stroke: SURFACES.elevated }}
          />
          <YAxis
            tick={{ ...axisStyles }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            {...tooltipStyles}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="inbound" stackId="a" fill={CHART_COLORS[5]} radius={[0, 0, 0, 0]} name="Inbound" />
          <Bar dataKey="outbound" stackId="a" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} name="Outbound" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function QueueServiceLevelDisplay() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {MOCK_QUEUE_SLA.map((queue) => {
        const isAboveTarget = queue.sla >= queue.target;
        const color = queue.sla >= 90
          ? '#22C55E'
          : queue.sla >= 80
            ? '#EAB308'
            : '#EF4444';

        // Gauge calculation
        const angle = (queue.sla / 100) * 180;
        const radius = 60;
        const cx = 80;
        const cy = 70;

        // Arc path
        const startAngle = Math.PI;
        const endAngle = Math.PI - (angle * Math.PI) / 180;
        const startX = cx + radius * Math.cos(startAngle);
        const startY = cy - radius * Math.sin(startAngle);
        const endX = cx + radius * Math.cos(endAngle);
        const endY = cy - radius * Math.sin(endAngle);
        const largeArc = angle > 90 ? 1 : 0;

        return (
          <div
            key={queue.queue}
            className="rounded-lg border border-border bg-surface-card p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-heading-sm text-content-primary">{queue.queue}</h4>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                isAboveTarget
                  ? 'bg-status-success/10 text-status-success'
                  : 'bg-status-danger/10 text-status-danger'
              )}>
                Target: {queue.target}%
              </span>
            </div>

            {/* Gauge */}
            <div className="flex justify-center">
              <svg width="160" height="90" viewBox="0 0 160 90">
                {/* Background arc */}
                <path
                  d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
                  fill="none"
                  stroke={SURFACES.elevated}
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                {/* Value arc */}
                <path
                  d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                {/* Value text */}
                <text
                  x={cx}
                  y={cy - 8}
                  textAnchor="middle"
                  className="font-mono"
                  style={{ fill: color, fontSize: 28, fontWeight: 700 }}
                >
                  {queue.sla}%
                </text>
                <text
                  x={cx}
                  y={cy + 10}
                  textAnchor="middle"
                  style={{ fill: TEXT_COLORS.tertiary, fontSize: 11 }}
                >
                  Service Level
                </text>
              </svg>
            </div>

            {/* Metrics */}
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="font-mono text-mono-md font-semibold text-content-primary">
                  {queue.totalCalls}
                </div>
                <div className="text-caption text-content-tertiary">Total Calls</div>
              </div>
              <div>
                <div className="font-mono text-mono-md font-semibold text-status-danger">
                  {queue.abandoned}
                </div>
                <div className="text-caption text-content-tertiary">Abandoned</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export toolbar
// ---------------------------------------------------------------------------

function ExportToolbar({ onExport }: { onExport: (format: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onExport('csv')}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-caption text-content-secondary hover:bg-surface-elevated hover:text-content-primary transition-colors"
      >
        <FileText className="h-3.5 w-3.5" />
        CSV
      </button>
      <button
        onClick={() => onExport('pdf')}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-caption text-content-secondary hover:bg-surface-elevated hover:text-content-primary transition-colors"
      >
        <FileText className="h-3.5 w-3.5" />
        PDF
      </button>
      <button
        onClick={() => onExport('xlsx')}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-caption text-content-secondary hover:bg-surface-elevated hover:text-content-primary transition-colors"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Excel
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ReportSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {/* Title skeleton */}
      <div className="h-6 w-64 animate-shimmer rounded bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]" />
      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-10 w-full animate-shimmer rounded bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-full animate-shimmer rounded bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports Page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = React.useState<ReportTemplate | null>(null);
  const [viewMode, setViewMode] = React.useState<'table' | 'chart'>('table');
  const [loading, setLoading] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = React.useState<TimeRange>({
    from: new Date(Date.now() - 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  // Fetch report templates from API (fallback to static REPORT_TEMPLATES)
  const { data: apiTemplates } = useReportTemplates();

  // Generate report mutation
  const generateMutation = useGenerateReport();

  // Export report mutation
  const exportMutation = useExportReport();

  // Use API templates if available, otherwise fallback to static mock templates
  const templates = React.useMemo(() => {
    if (apiTemplates && apiTemplates.length > 0) {
      // Merge API templates into the UI-enriched format
      return apiTemplates.map((t) => {
        const existing = REPORT_TEMPLATES.find((r) => r.id === t.id);
        if (existing) return existing;
        // Build a template from API data
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category as ReportTemplate['category'],
          icon: CATEGORY_ICONS[t.category] ?? <FileText className="h-4 w-4" />,
          chartType: (t.chartType ?? 'table') as ReportTemplate['chartType'],
        };
      });
    }
    return REPORT_TEMPLATES;
  }, [apiTemplates]);

  // Group templates by category
  const grouped = React.useMemo(() => {
    const map = new Map<string, ReportTemplate[]>();
    templates.forEach((t) => {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    });
    return map;
  }, [templates]);

  // Keyboard shortcut: Cmd+Enter to generate
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (selectedReport) handleGenerate();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReport]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleGenerate() {
    if (!selectedReport) return;
    setLoading(true);
    setGenerated(false);

    // Try API first
    generateMutation.mutate(
      {
        templateId: selectedReport.id,
        filters: {
          dateRange: {
            from: timeRange.from.toISOString(),
            to: timeRange.to.toISOString(),
          },
          groups: [],
          agents: [],
          trunks: [],
          direction: [],
          minDuration: null,
          maxDuration: null,
          dispositions: [],
        },
      },
      {
        onSuccess: () => {
          setLoading(false);
          setGenerated(true);
        },
        onError: () => {
          // Fallback: simulate report generation (demo mode)
          setTimeout(() => {
            setLoading(false);
            setGenerated(true);
          }, 1200);
        },
      },
    );
  }

  function handleExport(format: string) {
    if (!selectedReport) return;
    exportMutation.mutate(
      {
        reportId: selectedReport.id,
        format: format as 'csv' | 'pdf' | 'xlsx',
      },
      {
        onSuccess: () => {
          toast.success(`${format.toUpperCase()} export started`);
        },
        onError: () => {
          // eslint-disable-next-line no-console
          console.log(`[Export] ${format} export triggered for ${selectedReport.id} (stub -- API unavailable)`);
          toast.info(`Export is not available in demo mode`);
        },
      },
    );
  }

  function renderReportContent() {
    if (!selectedReport || !generated) return null;

    switch (selectedReport.id) {
      case 'agent-performance':
        return <AgentPerformanceTable />;
      case 'call-volume-hour':
        return <CallVolumeChart />;
      case 'queue-service-level':
        return <QueueServiceLevelDisplay />;
      default:
        // For unimplemented reports, show the agent performance table as fallback
        return <AgentPerformanceTable />;
    }
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar: report templates */}
      <div className="flex w-72 flex-shrink-0 flex-col border-r border-border bg-surface-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-heading-sm text-content-primary">Report Templates</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Favorites */}
          {favorites.size > 0 && (
            <div className="border-b border-border pb-2">
              <div className="px-4 py-2 text-overline uppercase text-content-tertiary">
                Favorites
              </div>
              {templates.filter((t) => favorites.has(t.id)).map((template) => (
                <ReportTemplateItem
                  key={template.id}
                  template={template}
                  selected={selectedReport?.id === template.id}
                  favorited={true}
                  onSelect={() => {
                    setSelectedReport(template);
                    setGenerated(false);
                  }}
                  onToggleFavorite={() => toggleFavorite(template.id)}
                />
              ))}
            </div>
          )}

          {/* Categories */}
          {Array.from(grouped.entries()).map(([category, templates]) => (
            <div key={category} className="border-b border-border">
              <div className="flex items-center gap-2 px-4 py-2 text-overline uppercase text-content-tertiary">
                {CATEGORY_ICONS[category]}
                {CATEGORY_LABELS[category]}
              </div>
              {templates.map((template) => (
                <ReportTemplateItem
                  key={template.id}
                  template={template}
                  selected={selectedReport?.id === template.id}
                  favorited={favorites.has(template.id)}
                  onSelect={() => {
                    setSelectedReport(template);
                    setGenerated(false);
                  }}
                  onToggleFavorite={() => toggleFavorite(template.id)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="text-heading-xl text-content-primary">Reports</h1>
            <p className="text-body-sm text-content-secondary">
              Standard and custom report templates
            </p>
          </div>
        </div>

        {selectedReport ? (
          <>
            {/* Filter configuration panel */}
            <div className="flex items-center justify-between border-b border-border bg-surface-card px-6 py-3">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-heading-md text-content-primary">{selectedReport.name}</h3>
                  <p className="text-body-sm text-content-tertiary">{selectedReport.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-body-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Generate
                  <kbd className="ml-1 rounded border border-white/20 px-1 py-0.5 text-[10px] text-white/60">
                    {'\u2318'}Enter
                  </kbd>
                </button>
              </div>
            </div>

            {/* View toggle + export */}
            {generated && (
              <div className="flex items-center justify-between border-b border-border px-6 py-2">
                <div className="flex items-center gap-1 rounded-md border border-border bg-surface-elevated p-0.5">
                  <button
                    onClick={() => setViewMode('table')}
                    className={cn(
                      'flex items-center gap-1.5 rounded px-3 py-1 text-caption transition-colors',
                      viewMode === 'table'
                        ? 'bg-surface-overlay text-content-primary'
                        : 'text-content-tertiary hover:text-content-secondary'
                    )}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('chart')}
                    className={cn(
                      'flex items-center gap-1.5 rounded px-3 py-1 text-caption transition-colors',
                      viewMode === 'chart'
                        ? 'bg-surface-overlay text-content-primary'
                        : 'text-content-tertiary hover:text-content-secondary'
                    )}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    Chart
                  </button>
                </div>
                <ExportToolbar onExport={handleExport} />
              </div>
            )}

            {/* Report results */}
            <div className="flex-1 overflow-auto p-6">
              {loading ? (
                <ReportSkeleton />
              ) : generated ? (
                <div className="animate-slide-up">
                  {viewMode === 'chart' && selectedReport.chartType === 'bar' ? (
                    <CallVolumeChart />
                  ) : viewMode === 'chart' && selectedReport.chartType === 'gauge' ? (
                    <QueueServiceLevelDisplay />
                  ) : (
                    renderReportContent()
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-content-secondary">
                  <div className="mb-4 rounded-full bg-surface-elevated p-4">
                    <BarChart3 className="h-8 w-8 text-content-tertiary" />
                  </div>
                  <p className="text-body-md font-medium">Configure and generate your report</p>
                  <p className="mt-1 text-body-sm text-content-tertiary">
                    Select a date range and click Generate to view results.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          // No report selected
          <div className="flex flex-1 flex-col items-center justify-center py-20 text-content-secondary">
            <div className="mb-4 rounded-full bg-surface-elevated p-4">
              <FileText className="h-8 w-8 text-content-tertiary" />
            </div>
            <p className="text-body-md font-medium">Select a report template</p>
            <p className="mt-1 text-body-sm text-content-tertiary">
              Choose a report from the sidebar to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report template list item
// ---------------------------------------------------------------------------

function ReportTemplateItem({
  template,
  selected,
  favorited,
  onSelect,
  onToggleFavorite,
}: {
  template: ReportTemplate;
  selected: boolean;
  favorited: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors',
        selected
          ? 'bg-accent-subtle border-l-2 border-l-accent'
          : 'hover:bg-surface-elevated border-l-2 border-l-transparent'
      )}
      onClick={onSelect}
    >
      <span className={cn(
        'text-content-tertiary',
        selected && 'text-accent'
      )}>
        {template.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn(
          'truncate text-body-sm',
          selected ? 'text-accent font-medium' : 'text-content-primary'
        )}>
          {template.name}
        </div>
        <div className="truncate text-caption text-content-tertiary">
          {template.description}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-overlay"
      >
        {favorited ? (
          <Star className="h-3.5 w-3.5 text-status-warning fill-status-warning" />
        ) : (
          <StarOff className="h-3.5 w-3.5 text-content-tertiary" />
        )}
      </button>
      {selected && <ChevronRight className="h-3.5 w-3.5 text-accent" />}
    </div>
  );
}
