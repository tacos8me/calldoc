'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Eye,
  Trash2,
  Plus,
  X,
  ChevronRight,
  Palette,
} from 'lucide-react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { cn } from '@/lib/utils';
import { GRID_CONFIG } from '@/lib/theme';
import { useWallboardStore, generateWidgetId } from '@/stores/wallboard-store';
import {
  WIDGET_REGISTRY,
  getWidgetsByCategory,
} from '@/components/dashboard/widget-registry';
import { WidgetContainer } from '@/components/dashboard/widget-container';
import type { Widget, WidgetType, LayoutItem, ThresholdRule, ThresholdOperator } from '@/types';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// ---------------------------------------------------------------------------
// Wallboard Editor Page -- full drag-and-drop wallboard builder
// ---------------------------------------------------------------------------

const ResponsiveGridLayout = WidthProvider(Responsive);

// ── Widget Renderer ──────────────────────────────────────────────────────

function WidgetRenderer({ widget }: { widget: Widget }) {
  const entry = WIDGET_REGISTRY[widget.type];
  if (!entry) return <div className="text-content-tertiary text-caption">Unknown widget type</div>;

  const Component = entry.component;

  // Map widget config to component props based on type
  switch (widget.type) {
    case 'title-value':
      return <Component value={42} label={widget.config.metric ?? ''} />;
    case 'gauge':
      return <Component value={72} max={100} label={widget.config.metric ?? 'Metric'} thresholds={{ warning: 60, critical: 80 }} />;
    case 'chart':
      return (
        <Component
          chartType={widget.config.chartType ?? 'bar'}
          data={[
            { label: '8AM', calls: 12 },
            { label: '9AM', calls: 24 },
            { label: '10AM', calls: 35 },
            { label: '11AM', calls: 28 },
            { label: '12PM', calls: 18 },
            { label: '1PM', calls: 30 },
          ]}
        />
      );
    case 'clock':
      return <Component timezone={widget.config.timezone as string | undefined} />;
    case 'marquee':
      return (
        <Component
          content={widget.config.content ?? 'Scrolling announcement text...'}
          scrollSpeed={widget.config.scrollSpeed ?? 60}
          fontSize={widget.config.fontSize}
        />
      );
    case 'text':
      return (
        <Component
          content={widget.config.content ?? 'Text content...'}
          fontSize={widget.config.fontSize}
          textAlign={widget.config.textAlign as 'left' | 'center' | 'right' | undefined}
          textColor={widget.config.foregroundColor}
        />
      );
    case 'image':
      return <Component url={widget.config.url} alt={widget.title} objectFit={widget.config.objectFit as 'contain' | 'cover' | undefined} />;
    case 'web-page':
      return <Component url={widget.config.url} refreshInterval={widget.config.refreshInterval} />;
    case 'leaderboard':
      return <Component maxItems={widget.config.maxItems ?? 10} />;
    case 'pie-chart':
      return <Component />;
    case 'group-box':
      return <Component />;
    case 'agent-box':
      return <Component groupId={widget.config.groups?.[0]} />;
    case 'active-calls':
      return <Component />;
    case 'box':
      return (
        <div className="h-full w-full rounded-lg" style={{
          backgroundColor: widget.config.backgroundColor ?? 'transparent',
          border: `${widget.config.borderWidth ?? 1}px solid ${widget.config.borderColor ?? '#3F3F46'}`,
          opacity: widget.config.opacity as number ?? 1,
        }} />
      );
    case 'ellipse':
      return (
        <div className="h-full w-full" style={{
          borderRadius: '50%',
          backgroundColor: widget.config.backgroundColor ?? 'transparent',
          border: `${widget.config.borderWidth ?? 1}px solid ${widget.config.borderColor ?? '#3F3F46'}`,
          opacity: widget.config.opacity as number ?? 1,
        }} />
      );
    case 'line':
      return (
        <div className="flex items-center justify-center h-full w-full">
          <div style={{
            width: '100%',
            height: `${widget.config.borderWidth ?? 1}px`,
            backgroundColor: widget.config.borderColor ?? '#3F3F46',
            opacity: widget.config.opacity as number ?? 1,
          }} />
        </div>
      );
    default:
      return <Component />;
  }
}

// ── Config Panel ─────────────────────────────────────────────────────────

interface ConfigPanelProps {
  widget: Widget;
  onClose: () => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onUpdateTitle: (title: string) => void;
  onDelete: () => void;
  onUpdateThresholds: (thresholds: ThresholdRule[]) => void;
}

function ConfigPanel({
  widget,
  onClose,
  onUpdateConfig,
  onUpdateTitle,
  onDelete,
  onUpdateThresholds,
}: ConfigPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-heading-sm text-content-primary">Configure Widget</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-content-tertiary hover:text-content-primary hover:bg-surface-elevated transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Widget title */}
        <div className="space-y-1">
          <label className="text-caption text-content-secondary">Title</label>
          <input
            type="text"
            value={widget.title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
          />
        </div>

        {/* Widget type label */}
        <div className="space-y-1">
          <label className="text-caption text-content-secondary">Type</label>
          <p className="text-body-sm text-content-primary">
            {WIDGET_REGISTRY[widget.type]?.label ?? widget.type}
          </p>
        </div>

        {/* Type-specific config */}
        {(widget.type === 'title-value' || widget.type === 'gauge') && (
          <div className="space-y-1">
            <label className="text-caption text-content-secondary">Metric</label>
            <select
              value={(widget.config.metric as string) ?? ''}
              onChange={(e) => onUpdateConfig({ metric: e.target.value })}
              className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
            >
              <option value="active_calls">Active Calls</option>
              <option value="calls_in_queue">Calls in Queue</option>
              <option value="calls_handled">Calls Handled</option>
              <option value="agents_available">Agents Available</option>
              <option value="avg_wait_time">Avg Wait Time</option>
              <option value="service_level">Service Level</option>
              <option value="abandon_rate">Abandon Rate</option>
              <option value="avg_talk_time">Avg Talk Time</option>
            </select>
          </div>
        )}

        {widget.type === 'chart' && (
          <>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Chart Type</label>
              <select
                value={(widget.config.chartType as string) ?? 'bar'}
                onChange={(e) => onUpdateConfig({ chartType: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
              >
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="area">Area</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Metric</label>
              <select
                value={(widget.config.metric as string) ?? ''}
                onChange={(e) => onUpdateConfig({ metric: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
              >
                <option value="calls_by_hour">Calls by Hour</option>
                <option value="calls_by_day">Calls by Day</option>
                <option value="agent_performance">Agent Performance</option>
                <option value="group_comparison">Group Comparison</option>
              </select>
            </div>
          </>
        )}

        {widget.type === 'agent-box' && (
          <div className="space-y-1">
            <label className="text-caption text-content-secondary">Group Filter</label>
            <select
              value={widget.config.groups?.[0] ?? ''}
              onChange={(e) => onUpdateConfig({ groups: e.target.value ? [e.target.value] : [] })}
              className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
            >
              <option value="">All Groups</option>
              <option value="sales">Sales</option>
              <option value="support">Support</option>
              <option value="billing">Billing</option>
            </select>
          </div>
        )}

        {widget.type === 'group-box' && (
          <div className="space-y-1">
            <label className="text-caption text-content-secondary">Hunt Group</label>
            <select
              value={widget.config.groups?.[0] ?? ''}
              onChange={(e) => onUpdateConfig({ groups: e.target.value ? [e.target.value] : [] })}
              className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
            >
              <option value="sales">Sales</option>
              <option value="support">Support</option>
              <option value="billing">Billing</option>
              <option value="tech">Tech</option>
            </select>
          </div>
        )}

        {widget.type === 'leaderboard' && (
          <>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Metric</label>
              <select
                value={(widget.config.metric as string) ?? 'calls_handled'}
                onChange={(e) => onUpdateConfig({ metric: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
              >
                <option value="calls_handled">Calls Handled</option>
                <option value="talk_time">Talk Time</option>
                <option value="avg_handle_time">Avg Handle Time</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Max Items</label>
              <input
                type="number"
                value={widget.config.maxItems ?? 10}
                min={3}
                max={20}
                onChange={(e) => onUpdateConfig({ maxItems: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
              />
            </div>
          </>
        )}

        {widget.type === 'marquee' && (
          <>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Text Content</label>
              <textarea
                value={(widget.config.content as string) ?? ''}
                onChange={(e) => onUpdateConfig({ content: e.target.value })}
                rows={3}
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Scroll Speed (px/s)</label>
              <input
                type="number"
                value={widget.config.scrollSpeed ?? 60}
                min={10}
                max={200}
                onChange={(e) => onUpdateConfig({ scrollSpeed: parseInt(e.target.value) || 60 })}
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
              />
            </div>
          </>
        )}

        {widget.type === 'clock' && (
          <>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Timezone</label>
              <select
                value={(widget.config.timezone as string) ?? ''}
                onChange={(e) => onUpdateConfig({ timezone: e.target.value || undefined })}
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
              >
                <option value="">Local</option>
                <option value="America/New_York">Eastern (ET)</option>
                <option value="America/Chicago">Central (CT)</option>
                <option value="America/Denver">Mountain (MT)</option>
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Berlin">Berlin (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Date Format</label>
              <select
                value={(widget.config.dateFormat as string) ?? 'long'}
                onChange={(e) => onUpdateConfig({ dateFormat: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
              >
                <option value="long">Long (Monday, January 1, 2026)</option>
                <option value="short">Short (Jan 1, 2026)</option>
                <option value="none">No Date</option>
              </select>
            </div>
          </>
        )}

        {widget.type === 'image' && (
          <div className="space-y-1">
            <label className="text-caption text-content-secondary">Image URL</label>
            <input
              type="url"
              value={(widget.config.url as string) ?? ''}
              onChange={(e) => onUpdateConfig({ url: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
            />
          </div>
        )}

        {widget.type === 'web-page' && (
          <>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Page URL</label>
              <input
                type="url"
                value={(widget.config.url as string) ?? ''}
                onChange={(e) => onUpdateConfig({ url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Auto Refresh (seconds, 0 = off)</label>
              <input
                type="number"
                value={widget.config.refreshInterval ?? 0}
                min={0}
                onChange={(e) => onUpdateConfig({ refreshInterval: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
              />
            </div>
          </>
        )}

        {widget.type === 'text' && (
          <>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Content</label>
              <textarea
                value={(widget.config.content as string) ?? ''}
                onChange={(e) => onUpdateConfig({ content: e.target.value })}
                rows={5}
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Font Size (px)</label>
              <input
                type="number"
                value={widget.config.fontSize ?? 14}
                min={10}
                max={48}
                onChange={(e) => onUpdateConfig({ fontSize: parseInt(e.target.value) || 14 })}
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Alignment</label>
              <select
                value={(widget.config.textAlign as string) ?? 'left'}
                onChange={(e) => onUpdateConfig({ textAlign: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </>
        )}

        {(widget.type === 'box' || widget.type === 'ellipse' || widget.type === 'line') && (
          <>
            {widget.type !== 'line' && (
              <div className="space-y-1">
                <label className="text-caption text-content-secondary">Fill Color</label>
                <input
                  type="color"
                  value={(widget.config.backgroundColor as string) ?? '#18181B'}
                  onChange={(e) => onUpdateConfig({ backgroundColor: e.target.value })}
                  className="w-full h-8 rounded-md bg-surface-elevated border border-border cursor-pointer"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Border Color</label>
              <input
                type="color"
                value={(widget.config.borderColor as string) ?? '#3F3F46'}
                onChange={(e) => onUpdateConfig({ borderColor: e.target.value })}
                className="w-full h-8 rounded-md bg-surface-elevated border border-border cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Border Width (px)</label>
              <input
                type="number"
                value={(widget.config.borderWidth as number) ?? 1}
                min={0}
                max={10}
                onChange={(e) => onUpdateConfig({ borderWidth: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-caption text-content-secondary">Opacity</label>
              <input
                type="range"
                min={0}
                max={100}
                value={((widget.config.opacity as number) ?? 1) * 100}
                onChange={(e) => onUpdateConfig({ opacity: parseInt(e.target.value) / 100 })}
                className="w-full"
              />
              <span className="text-caption text-content-tertiary">
                {Math.round(((widget.config.opacity as number) ?? 1) * 100)}%
              </span>
            </div>
          </>
        )}

        {/* Background color (for non-decorative types) */}
        {!['box', 'ellipse', 'line'].includes(widget.type) && (
          <div className="space-y-1">
            <label className="text-caption text-content-secondary">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(widget.config.backgroundColor as string) ?? '#18181B'}
                onChange={(e) => onUpdateConfig({ backgroundColor: e.target.value })}
                className="w-8 h-8 rounded-md bg-surface-elevated border border-border cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={(widget.config.backgroundColor as string) ?? ''}
                onChange={(e) => onUpdateConfig({ backgroundColor: e.target.value })}
                placeholder="Default"
                className="flex-1 px-3 py-1.5 rounded-md bg-surface-elevated border border-border text-body-sm text-content-primary focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Threshold editor -- for metric widgets */}
        {['title-value', 'gauge', 'group-box'].includes(widget.type) && (
          <ThresholdEditor
            thresholds={widget.thresholds}
            onChange={onUpdateThresholds}
          />
        )}

        {/* Divider before delete */}
        <div className="border-t border-border pt-4">
          <button
            onClick={onDelete}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 rounded-md',
              'text-status-danger bg-status-danger/10',
              'hover:bg-status-danger/20 transition-colors text-body-sm font-medium',
            )}
          >
            <Trash2 className="h-4 w-4" />
            Delete Widget
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Threshold Editor ─────────────────────────────────────────────────────

function ThresholdEditor({
  thresholds,
  onChange,
}: {
  thresholds: ThresholdRule[];
  onChange: (thresholds: ThresholdRule[]) => void;
}) {
  const handleAdd = () => {
    onChange([...thresholds, { operator: 'gte', value: 0, color: '#EAB308' }]);
  };

  const handleRemove = (index: number) => {
    onChange(thresholds.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: string, value: unknown) => {
    const updated = thresholds.map((t, i) =>
      i === index ? { ...t, [field]: value } : t,
    );
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <label className="text-caption text-content-secondary">Thresholds</label>
      {thresholds.map((t, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <select
            value={t.operator}
            onChange={(e) => handleUpdate(idx, 'operator', e.target.value)}
            className="w-16 px-1 py-1 rounded-md bg-surface-elevated border border-border text-caption text-content-primary focus:border-accent focus:outline-none"
          >
            <option value="gt">&gt;</option>
            <option value="gte">&gt;=</option>
            <option value="lt">&lt;</option>
            <option value="lte">&lt;=</option>
            <option value="eq">=</option>
          </select>
          <input
            type="number"
            value={t.value}
            onChange={(e) => handleUpdate(idx, 'value', parseFloat(e.target.value) || 0)}
            className="w-16 px-2 py-1 rounded-md bg-surface-elevated border border-border text-caption text-content-primary focus:border-accent focus:outline-none"
          />
          <input
            type="color"
            value={t.color}
            onChange={(e) => handleUpdate(idx, 'color', e.target.value)}
            className="w-8 h-6 rounded border border-border cursor-pointer"
          />
          <button
            onClick={() => handleRemove(idx)}
            className="p-0.5 rounded text-content-tertiary hover:text-status-danger transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="flex items-center gap-1 text-caption text-accent hover:text-accent-hover transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add Threshold
      </button>
    </div>
  );
}

// ── Widget Palette ───────────────────────────────────────────────────────

interface WidgetPaletteProps {
  onAddWidget: (type: WidgetType) => void;
}

function WidgetPalette({ onAddWidget }: WidgetPaletteProps) {
  const categories = useMemo(() => getWidgetsByCategory(), []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-heading-sm text-content-primary">Widget Palette</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {categories.map(({ category, types }) => (
          <div key={category}>
            <h4 className="text-overline text-content-tertiary uppercase tracking-wider mb-2">
              {category}
            </h4>
            <div className="space-y-1">
              {types.map((type) => {
                const entry = WIDGET_REGISTRY[type];
                const Icon = entry.icon;
                return (
                  <button
                    key={type}
                    onClick={() => onAddWidget(type)}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2 rounded-md',
                      'text-left hover:bg-surface-elevated transition-colors duration-fast',
                      'group',
                    )}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-surface-elevated group-hover:bg-accent-subtle shrink-0">
                      <Icon className="h-4 w-4 text-content-secondary group-hover:text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-body-sm text-content-primary block truncate">
                        {entry.label}
                      </span>
                      <span className="text-caption text-content-tertiary block truncate">
                        {entry.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Layout Presets ────────────────────────────────────────────────────────

interface LayoutPreset {
  name: string;
  description: string;
  widgets: Widget[];
  layouts: Record<string, LayoutItem[]>;
}

const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    name: '4-Widget KPI Row',
    description: 'Four key metrics in a top row',
    widgets: [
      { id: 'p-1', type: 'title-value', title: 'Active Calls', config: { metric: 'active_calls' }, thresholds: [] },
      { id: 'p-2', type: 'title-value', title: 'Calls in Queue', config: { metric: 'calls_in_queue' }, thresholds: [] },
      { id: 'p-3', type: 'title-value', title: 'Agents Available', config: { metric: 'agents_available' }, thresholds: [] },
      { id: 'p-4', type: 'gauge', title: 'Service Level', config: { metric: 'service_level' }, thresholds: [] },
    ],
    layouts: {
      lg: [
        { i: 'p-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'p-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'p-3', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'p-4', x: 9, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
      ],
    },
  },
  {
    name: '8-Widget Overview',
    description: 'Full overview with KPIs, charts, and agent status',
    widgets: [
      { id: 'p-1', type: 'title-value', title: 'Active Calls', config: { metric: 'active_calls' }, thresholds: [] },
      { id: 'p-2', type: 'title-value', title: 'Calls in Queue', config: { metric: 'calls_in_queue' }, thresholds: [] },
      { id: 'p-3', type: 'gauge', title: 'Service Level', config: { metric: 'service_level' }, thresholds: [] },
      { id: 'p-4', type: 'clock', title: 'Clock', config: {}, thresholds: [] },
      { id: 'p-5', type: 'chart', title: 'Calls by Hour', config: { chartType: 'bar' }, thresholds: [] },
      { id: 'p-6', type: 'agent-box', title: 'Agent Status', config: {}, thresholds: [] },
      { id: 'p-7', type: 'leaderboard', title: 'Top Agents', config: {}, thresholds: [] },
      { id: 'p-8', type: 'marquee', title: 'Announcements', config: { content: 'Welcome to CallDoc!' }, thresholds: [] },
    ],
    layouts: {
      lg: [
        { i: 'p-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'p-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'p-3', x: 6, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
        { i: 'p-4', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'p-5', x: 0, y: 2, w: 6, h: 3, minW: 3, minH: 2 },
        { i: 'p-6', x: 6, y: 3, w: 3, h: 4, minW: 3, minH: 3 },
        { i: 'p-7', x: 9, y: 2, w: 3, h: 5, minW: 3, minH: 3 },
        { i: 'p-8', x: 0, y: 5, w: 12, h: 1, minW: 4, minH: 1 },
      ],
    },
  },
];

// ── Main Editor Page ─────────────────────────────────────────────────────

export default function WallboardEditorPage() {
  const params = useParams();
  const router = useRouter();
  const wallboardId = params.id as string;

  const wallboards = useWallboardStore((s) => s.wallboards);
  const activeWallboard = useWallboardStore((s) => s.activeWallboard);
  const selectedWidgetId = useWallboardStore((s) => s.selectedWidgetId);
  const isDirty = useWallboardStore((s) => s.isDirty);
  const loadWallboards = useWallboardStore((s) => s.loadWallboards);
  const getWallboard = useWallboardStore((s) => s.getWallboard);
  const setActiveWallboard = useWallboardStore((s) => s.setActiveWallboard);
  const saveActiveWallboard = useWallboardStore((s) => s.saveActiveWallboard);
  const addWidget = useWallboardStore((s) => s.addWidget);
  const removeWidget = useWallboardStore((s) => s.removeWidget);
  const updateWidgetConfig = useWallboardStore((s) => s.updateWidgetConfig);
  const updateWidgetTitle = useWallboardStore((s) => s.updateWidgetTitle);
  const updateWallboardName = useWallboardStore((s) => s.updateWallboardName);
  const setLayout = useWallboardStore((s) => s.setLayout);
  const selectWidget = useWallboardStore((s) => s.selectWidget);

  const [showPresets, setShowPresets] = useState(false);

  // Load wallboard on mount
  useEffect(() => {
    loadWallboards();
  }, [loadWallboards]);

  useEffect(() => {
    const wb = getWallboard(wallboardId);
    if (wb) {
      setActiveWallboard(wb);
    }
  }, [wallboardId, wallboards, getWallboard, setActiveWallboard]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if typing in an input
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) return;
        if (selectedWidgetId) {
          removeWidget(selectedWidgetId);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveActiveWallboard();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedWidgetId, removeWidget, saveActiveWallboard]);

  const handleAddWidget = useCallback(
    (type: WidgetType) => {
      const entry = WIDGET_REGISTRY[type];
      const id = generateWidgetId();
      const widget: Widget = {
        id,
        type,
        title: entry.label,
        config: type === 'box' ? { backgroundColor: 'transparent', borderColor: '#3F3F46', borderWidth: 1, opacity: 1 }
          : type === 'ellipse' ? { backgroundColor: 'transparent', borderColor: '#3F3F46', borderWidth: 1, opacity: 1 }
          : type === 'line' ? { borderColor: '#3F3F46', borderWidth: 1, opacity: 1 }
          : {},
        thresholds: [],
      };
      const layout: LayoutItem = {
        i: id,
        x: 0,
        y: Infinity, // Place at bottom
        w: entry.defaultSize.w,
        h: entry.defaultSize.h,
        minW: Math.max(2, Math.min(entry.defaultSize.w, 2)),
        minH: Math.max(1, Math.min(entry.defaultSize.h, 1)),
      };
      addWidget(widget, layout);
      selectWidget(id);
    },
    [addWidget, selectWidget],
  );

  const handleLayoutChange = useCallback(
    (_currentLayout: LayoutItem[], allLayouts: Record<string, LayoutItem[]>) => {
      setLayout(allLayouts);
    },
    [setLayout],
  );

  const handleApplyPreset = useCallback(
    (preset: LayoutPreset) => {
      // Re-generate IDs for the preset widgets
      const idMap: Record<string, string> = {};
      const widgets = preset.widgets.map((w) => {
        const newId = generateWidgetId();
        idMap[w.id] = newId;
        return { ...w, id: newId };
      });
      const layouts: Record<string, LayoutItem[]> = {};
      for (const [bp, items] of Object.entries(preset.layouts)) {
        layouts[bp] = items.map((item) => ({
          ...item,
          i: idMap[item.i] ?? item.i,
        }));
      }
      // Add all widgets
      for (let i = 0; i < widgets.length; i++) {
        const layoutItem = layouts.lg?.[i];
        if (layoutItem) {
          addWidget(widgets[i], layoutItem);
        }
      }
      setShowPresets(false);
    },
    [addWidget],
  );

  const handleUpdateThresholds = useCallback(
    (widgetId: string, thresholds: ThresholdRule[]) => {
      if (!activeWallboard) return;
      const store = useWallboardStore.getState();
      const wb = store.activeWallboard;
      if (!wb) return;
      useWallboardStore.setState({
        activeWallboard: {
          ...wb,
          widgets: wb.widgets.map((w) =>
            w.id === widgetId ? { ...w, thresholds } : w,
          ),
        },
        isDirty: true,
      });
    },
    [activeWallboard],
  );

  const selectedWidget = activeWallboard?.widgets.find(
    (w) => w.id === selectedWidgetId,
  );

  if (!activeWallboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-body-md text-content-tertiary">Loading wallboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] -m-6">
      {/* ── Top Toolbar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-border bg-surface-card shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/wallboards')}
            className="p-1.5 rounded-md text-content-tertiary hover:text-content-primary hover:bg-surface-elevated transition-colors"
            aria-label="Back to wallboards"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Editable name */}
          <input
            type="text"
            value={activeWallboard.name}
            onChange={(e) => updateWallboardName(e.target.value)}
            className="text-heading-md text-content-primary bg-transparent border-0 border-b border-transparent hover:border-border focus:border-accent focus:outline-none px-1 py-0.5 max-w-[300px]"
          />

          {isDirty && (
            <span className="text-caption text-content-tertiary">(unsaved changes)</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Layout presets */}
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-sm text-content-secondary hover:text-content-primary hover:bg-surface-elevated transition-colors"
            >
              <Palette className="h-4 w-4" />
              Presets
            </button>
            {showPresets && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-surface-card border border-border rounded-lg shadow-lg z-50">
                {LAYOUT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleApplyPreset(preset)}
                    className="flex flex-col w-full px-3 py-2 text-left hover:bg-surface-elevated transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    <span className="text-body-sm text-content-primary">{preset.name}</span>
                    <span className="text-caption text-content-tertiary">{preset.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <button
            onClick={() => router.push(`/wallboards/${wallboardId}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-sm text-content-secondary hover:text-content-primary hover:bg-surface-elevated transition-colors"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>

          {/* Save */}
          <button
            onClick={saveActiveWallboard}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-body-sm font-medium transition-colors',
              isDirty
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'bg-surface-elevated text-content-secondary cursor-default',
            )}
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>

      {/* ── Editor Body ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div
          className="flex-1 overflow-auto bg-surface-base"
          onClick={(e) => {
            // Deselect widget when clicking canvas background
            if (e.target === e.currentTarget) {
              selectWidget(null);
            }
          }}
        >
          <div className="min-h-full p-4">
            {/* Grid overlay dots */}
            <div
              className="relative"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            >
              <ResponsiveGridLayout
                className="layout"
                layouts={activeWallboard.layouts}
                breakpoints={GRID_CONFIG.breakpoints}
                cols={GRID_CONFIG.cols}
                rowHeight={GRID_CONFIG.rowHeight}
                margin={GRID_CONFIG.margin as [number, number]}
                containerPadding={GRID_CONFIG.containerPadding as [number, number]}
                isDraggable
                isResizable
                onLayoutChange={handleLayoutChange}
                draggableHandle=".drag-handle"
                useCSSTransforms
              >
                {activeWallboard.widgets.map((widget) => {
                  const isSelected = selectedWidgetId === widget.id;
                  const isDecorative = ['box', 'ellipse', 'line'].includes(widget.type);

                  return (
                    <div
                      key={widget.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectWidget(widget.id);
                      }}
                      className={cn(
                        'rounded-lg overflow-hidden',
                        isSelected
                          ? 'ring-2 ring-accent shadow-glow'
                          : 'border border-border border-dashed hover:border-accent/50',
                        !isDecorative && 'bg-surface-card',
                      )}
                    >
                      {isDecorative ? (
                        <div className="h-full w-full relative">
                          {/* Drag handle overlay for decorative */}
                          <div className="drag-handle absolute top-0 left-0 right-0 h-6 z-10 cursor-grab active:cursor-grabbing" />
                          <WidgetRenderer widget={widget} />
                        </div>
                      ) : (
                        <div className="flex flex-col h-full">
                          {/* Widget header with drag handle */}
                          <div className="drag-handle flex items-center h-8 px-3 border-b border-border cursor-grab active:cursor-grabbing shrink-0">
                            <span className="text-content-tertiary mr-2">
                              <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
                                <circle cx="1.5" cy="1.5" r="1.2" />
                                <circle cx="6.5" cy="1.5" r="1.2" />
                                <circle cx="1.5" cy="6" r="1.2" />
                                <circle cx="6.5" cy="6" r="1.2" />
                                <circle cx="1.5" cy="10.5" r="1.2" />
                                <circle cx="6.5" cy="10.5" r="1.2" />
                              </svg>
                            </span>
                            <span className="text-caption text-content-primary truncate">
                              {widget.title}
                            </span>
                          </div>
                          {/* Widget body */}
                          <div className="flex-1 p-2 min-h-0 overflow-hidden">
                            <WidgetRenderer widget={widget} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </ResponsiveGridLayout>

              {/* Empty canvas message */}
              {activeWallboard.widgets.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
                  <div className="text-content-tertiary text-center">
                    <p className="text-heading-lg mb-2">Empty Canvas</p>
                    <p className="text-body-md">
                      Add widgets from the palette on the right, or apply a preset layout.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Sidebar (280px) ──────────────────────────── */}
        <div className="w-[280px] border-l border-border bg-surface-card shrink-0 overflow-hidden flex flex-col">
          {selectedWidget ? (
            <ConfigPanel
              widget={selectedWidget}
              onClose={() => selectWidget(null)}
              onUpdateConfig={(config) => updateWidgetConfig(selectedWidget.id, config)}
              onUpdateTitle={(title) => updateWidgetTitle(selectedWidget.id, title)}
              onDelete={() => {
                removeWidget(selectedWidget.id);
                selectWidget(null);
              }}
              onUpdateThresholds={(thresholds) => handleUpdateThresholds(selectedWidget.id, thresholds)}
            />
          ) : (
            <WidgetPalette onAddWidget={handleAddWidget} />
          )}
        </div>
      </div>
    </div>
  );
}
