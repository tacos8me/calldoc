'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import {
  Pencil,
  Save,
  Plus,
  X,
  BarChart3,
  Gauge,
  Users,
  Phone,
  Hash,
  AreaChart,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboard-store';
import { useActiveCallCount } from '@/stores/call-store';
import { useUIStore } from '@/stores/ui-store';
import { GRID_CONFIG } from '@/lib/theme';
import { WidgetContainer } from '@/components/dashboard/widget-container';
import { TitleValueWidget } from '@/components/dashboard/widget-title-value';
import { ActiveCallsWidget } from '@/components/dashboard/widget-active-calls';
import { AgentBoxWidget } from '@/components/dashboard/widget-agent-box';
import { GaugeWidget } from '@/components/dashboard/widget-gauge';
import { ChartWidget } from '@/components/dashboard/widget-chart';
import { GroupBoxWidget, DEMO_GROUP_DATA, type GroupBoxData } from '@/components/dashboard/widget-group-box';
import { LeaderboardWidget, DEMO_LEADERBOARD_ENTRIES } from '@/components/dashboard/widget-leaderboard';
import { PieChartWidget, DEMO_PIE_DATA } from '@/components/dashboard/widget-pie-chart';
import {
  useDashboardMetrics,
  getMetricValue,
  type DashboardMetrics,
  type TimeSeriesPoint,
} from '@/lib/socket/dashboard-bridge';
import { useGroupStats } from '@/stores/group-store';
import type { Widget, WidgetType, LayoutItem } from '@/types';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// ---------------------------------------------------------------------------
// ResponsiveGridLayout (width provider)
// ---------------------------------------------------------------------------
const ResponsiveGridLayout = WidthProvider(Responsive);

// ---------------------------------------------------------------------------
// Widget type picker options
// ---------------------------------------------------------------------------
interface WidgetTypeOption {
  type: WidgetType;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultW: number;
  defaultH: number;
}

const WIDGET_TYPE_OPTIONS: WidgetTypeOption[] = [
  {
    type: 'title-value',
    label: 'Title / Value',
    description: 'Single large KPI metric',
    icon: <Hash className="h-5 w-5" />,
    defaultW: 3,
    defaultH: 2,
  },
  {
    type: 'active-calls',
    label: 'Active Calls',
    description: 'Live call list',
    icon: <Phone className="h-5 w-5" />,
    defaultW: 6,
    defaultH: 4,
  },
  {
    type: 'agent-box',
    label: 'Agent Status',
    description: 'Agent state grid',
    icon: <Users className="h-5 w-5" />,
    defaultW: 4,
    defaultH: 4,
  },
  {
    type: 'gauge',
    label: 'Gauge',
    description: 'Circular progress indicator',
    icon: <Gauge className="h-5 w-5" />,
    defaultW: 3,
    defaultH: 3,
  },
  {
    type: 'chart',
    label: 'Chart',
    description: 'Time-series area/bar/line',
    icon: <AreaChart className="h-5 w-5" />,
    defaultW: 6,
    defaultH: 3,
  },
];

// ---------------------------------------------------------------------------
// Format helpers for metric display
// ---------------------------------------------------------------------------

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getMetricFormat(metricName: string): ((v: number) => string) | undefined {
  const timeMetrics = ['avg_wait_time', 'avgWaitTime', 'avg_talk_time', 'avgTalkTime', 'longest_wait', 'longestCurrentWait'];
  if (timeMetrics.includes(metricName)) {
    return formatSeconds;
  }
  const percentMetrics = ['service_level', 'serviceLevelPercent'];
  if (percentMetrics.includes(metricName)) {
    return (v: number) => `${v}%`;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Data mode indicator
// ---------------------------------------------------------------------------

function DataModeIndicator({ isLive }: { isLive: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        isLive
          ? 'bg-status-success/10 text-status-success'
          : 'bg-status-warning/10 text-status-warning',
      )}
    >
      {isLive ? (
        <>
          <Radio className="h-3 w-3" />
          Live
        </>
      ) : (
        'Demo'
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// GroupBoxBridge -- reads from group store for a specific group widget
// ---------------------------------------------------------------------------

function GroupBoxBridge({ groupId, demoMode }: { groupId?: string; demoMode: boolean }) {
  const stats = useGroupStats(groupId ?? '');

  if (!stats) {
    return <GroupBoxWidget data={demoMode ? DEMO_GROUP_DATA : undefined} />;
  }

  const data: GroupBoxData = {
    groupName: stats.name,
    agentsAvailable: stats.agentsAvailable,
    agentsBusy: stats.agentsBusy,
    agentsTotal: stats.agentsAvailable + stats.agentsBusy + stats.agentsAway,
    callsWaiting: stats.callsWaiting,
    longestWaitSeconds: stats.longestWait,
    serviceLevel: stats.serviceLevelPercent,
  };

  return <GroupBoxWidget data={data} />;
}

// ---------------------------------------------------------------------------
// Widget renderer -- maps widget type to the correct component
// Reads from dashboard metrics for real-time data
// ---------------------------------------------------------------------------
function renderWidgetContent(
  widget: Widget,
  metrics: DashboardMetrics,
  chartData: TimeSeriesPoint[],
  demoMode: boolean,
) {
  const metricName = widget.config.metric ?? '';
  const metricValue = getMetricValue(metrics, metricName);
  const formatFn = getMetricFormat(metricName);

  switch (widget.type) {
    case 'title-value':
      return (
        <TitleValueWidget
          value={metricValue}
          label={widget.title}
          formatValue={formatFn}
        />
      );
    case 'active-calls':
      return <ActiveCallsWidget />;
    case 'agent-box':
      return <AgentBoxWidget groupId={widget.config.groups?.[0]} />;
    case 'gauge':
      return (
        <GaugeWidget
          value={metricValue}
          label={widget.title}
          formatValue={formatFn}
          thresholds={
            widget.thresholds.length >= 2
              ? {
                  warning: widget.thresholds[0].value,
                  critical: widget.thresholds[1].value,
                }
              : undefined
          }
        />
      );
    case 'chart':
      return (
        <ChartWidget
          chartType={widget.config.chartType ?? 'area'}
          data={chartData}
        />
      );
    case 'group-box':
      return <GroupBoxBridge groupId={widget.config.groups?.[0]} demoMode={demoMode} />;
    case 'leaderboard':
      return (
        <LeaderboardWidget
          entries={demoMode ? DEMO_LEADERBOARD_ENTRIES : undefined}
        />
      );
    case 'pie-chart':
      return (
        <PieChartWidget
          data={demoMode ? DEMO_PIE_DATA : undefined}
        />
      );
    default:
      return (
        <div className="flex items-center justify-center h-full text-body-sm text-content-tertiary">
          {widget.type} widget
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Add Widget Dialog
// ---------------------------------------------------------------------------
interface AddWidgetDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (option: WidgetTypeOption) => void;
}

function AddWidgetDialog({ open, onClose, onAdd }: AddWidgetDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-[540px] max-h-[80vh] rounded-xl border border-border-strong bg-surface-card shadow-lg overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-heading-lg text-content-primary">Add Widget</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-content-tertiary hover:text-content-secondary hover:bg-surface-elevated"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Widget grid */}
        <div className="grid grid-cols-2 gap-3 p-6">
          {WIDGET_TYPE_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => onAdd(option)}
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border border-border',
                'bg-surface-base hover:bg-surface-elevated hover:border-accent',
                'transition-colors duration-fast text-left',
              )}
            >
              <span className="text-accent shrink-0 mt-0.5">{option.icon}</span>
              <div>
                <span className="block text-body-md text-content-primary font-medium">
                  {option.label}
                </span>
                <span className="block text-caption text-content-tertiary mt-0.5">
                  {option.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const widgets = useDashboardStore((s) => s.widgets);
  const layouts = useDashboardStore((s) => s.layouts);
  const editMode = useDashboardStore((s) => s.editMode);
  const setLayout = useDashboardStore((s) => s.setLayout);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const toggleEditMode = useDashboardStore((s) => s.toggleEditMode);
  const saveLayout = useDashboardStore((s) => s.saveLayout);
  const loadLayout = useDashboardStore((s) => s.loadLayout);
  const activeCallCount = useActiveCallCount();
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const latency = useUIStore((s) => s.latency);
  const demoMode = useUIStore((s) => s.demoMode);

  // Dashboard metrics from the bridge
  const { metrics, chartData, getMetric } = useDashboardMetrics();

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Load persisted layout on mount
  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  // Handle layout change from react-grid-layout
  const handleLayoutChange = useCallback(
    (_currentLayout: LayoutItem[], allLayouts: Record<string, LayoutItem[]>) => {
      setLayout(allLayouts);
    },
    [setLayout],
  );

  // Add widget handler
  const handleAddWidget = useCallback(
    (option: WidgetTypeOption) => {
      const id = `w-${option.type}-${Date.now()}`;
      const widget: Widget = {
        id,
        type: option.type,
        title: option.label,
        config: {},
        thresholds: [],
      };
      const layout: LayoutItem = {
        i: id,
        x: 0,
        y: Infinity, // react-grid-layout will put it at the bottom
        w: option.defaultW,
        h: option.defaultH,
        minW: 2,
        minH: 2,
      };
      addWidget(widget, layout);
      setAddDialogOpen(false);
    },
    [addWidget],
  );

  // Save handler
  const handleSave = useCallback(() => {
    saveLayout();
    toggleEditMode();
  }, [saveLayout, toggleEditMode]);

  // Keyboard shortcut: Shift+E toggles edit mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && e.key === 'E' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleEditMode();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleEditMode]);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-xl text-content-primary">Dashboard</h1>
          <p className="text-body-sm text-content-tertiary mt-1">
            Call center overview and real-time metrics
            {connectionStatus === 'connected' && (
              <span className="ml-2 inline-flex items-center gap-1 text-status-success" role="status" aria-live="polite">
                <span className="h-1.5 w-1.5 rounded-full bg-status-success animate-pulse" aria-hidden="true" />
                Live
                {latency > 0 && (
                  <span className="font-mono text-mono-sm text-content-tertiary">
                    {latency}ms
                  </span>
                )}
              </span>
            )}
            {connectionStatus === 'disconnected' && (
              <span className="ml-2 inline-flex items-center gap-1 text-status-danger" role="status" aria-live="polite">
                <span className="h-1.5 w-1.5 rounded-full bg-status-danger" aria-hidden="true" />
                Disconnected
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DataModeIndicator isLive={metrics.isLive} />
          {editMode && (
            <>
              <button
                onClick={() => setAddDialogOpen(true)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-body-sm',
                  'bg-surface-elevated text-content-secondary hover:text-content-primary',
                  'transition-colors duration-fast',
                )}
              >
                <Plus className="h-4 w-4" />
                Add Widget
              </button>
              <button
                onClick={handleSave}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-body-sm',
                  'bg-accent text-white hover:bg-accent-hover',
                  'transition-colors duration-fast',
                )}
              >
                <Save className="h-4 w-4" />
                Save Layout
              </button>
            </>
          )}
          <button
            onClick={toggleEditMode}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-body-sm',
              'transition-colors duration-fast',
              editMode
                ? 'bg-status-danger/20 text-status-danger hover:bg-status-danger/30'
                : 'bg-surface-elevated text-content-secondary hover:text-content-primary',
            )}
          >
            {editMode ? (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" />
                Edit
              </>
            )}
          </button>
        </div>
      </div>

      {/* Widget grid */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={GRID_CONFIG.breakpoints}
        cols={GRID_CONFIG.cols}
        rowHeight={GRID_CONFIG.rowHeight}
        margin={GRID_CONFIG.margin}
        containerPadding={GRID_CONFIG.containerPadding}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        compactType="vertical"
        useCSSTransforms
      >
        {widgets.map((widget) => {
          const metricName = widget.config.metric ?? '';
          const metricValue = getMetric(metricName);

          return (
            <div key={widget.id} className="relative group">
              <WidgetContainer
                widget={widget}
                value={metricValue}
                editMode={editMode}
                lastUpdated={metrics.lastUpdated}
              >
                {/* Drag handle zone (invisible, spans header) */}
                {editMode && (
                  <div className="drag-handle absolute top-0 left-0 right-0 h-10 cursor-grab active:cursor-grabbing z-10" />
                )}
                {renderWidgetContent(widget, metrics, chartData, demoMode)}
              </WidgetContainer>
              {/* Remove button (edit mode) */}
              {editMode && (
                <button
                  onClick={() => removeWidget(widget.id)}
                  className="absolute -top-2 -right-2 z-20 h-6 w-6 rounded-full bg-status-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-fast"
                  aria-label="Remove widget"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </ResponsiveGridLayout>

      {/* Empty state */}
      {widgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BarChart3 className="h-12 w-12 text-content-tertiary mb-4" />
          <h2 className="text-heading-lg text-content-secondary mb-2">
            Your dashboard is empty
          </h2>
          <p className="text-body-md text-content-tertiary mb-6">
            Add widgets to monitor your call center in real time.
          </p>
          <button
            onClick={() => {
              if (!editMode) toggleEditMode();
              setAddDialogOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors duration-fast"
          >
            <Plus className="h-4 w-4" />
            Add your first widget
          </button>
        </div>
      )}

      {/* Add Widget Dialog */}
      <AddWidgetDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddWidget}
      />
    </div>
  );
}
