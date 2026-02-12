'use client';

import * as React from 'react';
import {
  X,
  Plus,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Save,
  FolderOpen,
  Calendar,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FilterFieldType =
  | 'text'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'daterange'
  | 'number-range'
  | 'boolean';

export interface FilterFieldOption {
  label: string;
  value: string;
}

export interface FilterFieldDef {
  key: string;
  label: string;
  type: FilterFieldType;
  category: string;
  options?: FilterFieldOption[];
  placeholder?: string;
  defaultValue?: unknown;
}

export interface FilterSchema {
  fields: FilterFieldDef[];
}

export type FilterState = Record<string, unknown>;

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
}

export interface FilterBuilderProps {
  schema: FilterSchema;
  value: FilterState;
  onChange: (value: FilterState) => void;
  onReset?: () => void;
  presets?: FilterPreset[];
  onSavePreset?: (name: string, filters: FilterState) => void;
  onLoadPreset?: (preset: FilterPreset) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

// ---------------------------------------------------------------------------
// Active filter chips displayed above the table
// ---------------------------------------------------------------------------

export function ActiveFilterChips({
  schema,
  value,
  onChange,
  onReset,
}: {
  schema: FilterSchema;
  value: FilterState;
  onChange: (value: FilterState) => void;
  onReset?: () => void;
}) {
  const activeEntries = Object.entries(value).filter(([, v]) => {
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (typeof v === 'object' && !Array.isArray(v)) {
      const obj = v as Record<string, unknown>;
      return Object.values(obj).some((val) => val !== null && val !== undefined && val !== '');
    }
    return true;
  });

  if (activeEntries.length === 0) return null;

  function removeFilter(key: string) {
    const next = { ...value };
    delete next[key];
    onChange(next);
  }

  function getLabel(key: string): string {
    return schema.fields.find((f) => f.key === key)?.label ?? key;
  }

  function formatValue(key: string, val: unknown): string {
    const field = schema.fields.find((f) => f.key === key);
    if (!field) return String(val);

    if (field.type === 'multiselect' && Array.isArray(val)) {
      const labels = val.map((v: string) => field.options?.find((o) => o.value === v)?.label ?? v);
      return labels.length <= 2 ? labels.join(', ') : `${labels.length} selected`;
    }
    if (field.type === 'select' && field.options) {
      return field.options.find((o) => o.value === val)?.label ?? String(val);
    }
    if (field.type === 'daterange' && typeof val === 'object') {
      const dr = val as { from?: string; to?: string };
      const f = dr.from ? new Date(dr.from).toLocaleDateString() : '';
      const t = dr.to ? new Date(dr.to).toLocaleDateString() : '';
      return `${f} - ${t}`;
    }
    if (field.type === 'number-range' && typeof val === 'object') {
      const nr = val as { min?: number; max?: number };
      return `${nr.min ?? ''} - ${nr.max ?? ''}`;
    }
    if (field.type === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2">
      {activeEntries.map(([key, val]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1 text-caption text-accent"
        >
          <span className="font-medium">{getLabel(key)}:</span>
          <span className="max-w-[160px] truncate text-content-secondary">{formatValue(key, val)}</span>
          <button
            onClick={() => removeFilter(key)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-accent/20 transition-colors"
            aria-label={`Remove ${getLabel(key)} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {activeEntries.length > 0 && onReset && (
        <button
          onClick={onReset}
          className="text-caption text-content-tertiary hover:text-content-secondary transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterBuilder sidebar panel
// ---------------------------------------------------------------------------

export function FilterBuilder({
  schema,
  value,
  onChange,
  onReset,
  presets = [],
  onSavePreset,
  onLoadPreset,
  collapsed = false,
  onToggleCollapsed,
}: FilterBuilderProps) {
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());
  const [showAddFilter, setShowAddFilter] = React.useState(false);
  const [showPresets, setShowPresets] = React.useState(false);
  const [presetName, setPresetName] = React.useState('');

  // Group fields by category
  const categories = React.useMemo(() => {
    const map = new Map<string, FilterFieldDef[]>();
    schema.fields.forEach((field) => {
      const cat = field.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(field);
    });
    return map;
  }, [schema.fields]);

  // Auto-expand categories that have active filters
  React.useEffect(() => {
    const active = new Set<string>();
    schema.fields.forEach((field) => {
      if (value[field.key] !== undefined && value[field.key] !== null && value[field.key] !== '') {
        active.add(field.category || 'General');
      }
    });
    if (active.size > 0) setExpandedCategories((prev) => new Set([...prev, ...active]));
  }, []);

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function updateField(key: string, fieldValue: unknown) {
    onChange({ ...value, [key]: fieldValue });
  }

  // Keyboard shortcut: F to toggle
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          onToggleCollapsed?.();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleCollapsed]);

  if (collapsed) return null;

  return (
    <div className="flex h-full w-80 flex-shrink-0 flex-col border-r border-border bg-surface-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-heading-sm text-content-primary">Filters</h3>
        <div className="flex items-center gap-1">
          {presets.length > 0 && (
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="rounded-md p-1.5 text-content-tertiary hover:bg-surface-elevated hover:text-content-secondary transition-colors"
              title="Load preset"
              aria-label="Load filter preset"
            >
              <FolderOpen className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {onSavePreset && (
            <button
              onClick={() => {
                if (presetName.trim()) {
                  onSavePreset(presetName.trim(), value);
                  setPresetName('');
                }
              }}
              className="rounded-md p-1.5 text-content-tertiary hover:bg-surface-elevated hover:text-content-secondary transition-colors"
              title="Save preset"
              aria-label="Save filter preset"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="rounded-md p-1.5 text-content-tertiary hover:bg-surface-elevated hover:text-content-secondary transition-colors"
              title="Reset filters"
              aria-label="Reset all filters"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Preset list */}
      {showPresets && presets.length > 0 && (
        <div className="border-b border-border bg-surface-base p-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                onLoadPreset?.(preset);
                setShowPresets(false);
              }}
              className="w-full rounded-md px-3 py-2 text-left text-body-sm text-content-secondary hover:bg-surface-elevated hover:text-content-primary transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable filter area */}
      <div className="flex-1 overflow-y-auto">
        {Array.from(categories.entries()).map(([category, fields]) => {
          const isExpanded = expandedCategories.has(category);
          return (
            <div key={category} className="border-b border-border">
              <button
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-overline uppercase tracking-wider text-content-tertiary hover:text-content-secondary transition-colors"
              >
                {category}
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
              {isExpanded && (
                <div className="space-y-3 px-4 pb-4">
                  {fields.map((field) => (
                    <FilterField
                      key={field.key}
                      field={field}
                      value={value[field.key]}
                      onChange={(v) => updateField(field.key, v)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add filter button */}
      <div className="border-t border-border p-3">
        <div className="relative">
          <button
            onClick={() => setShowAddFilter(!showAddFilter)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-body-sm text-content-tertiary hover:border-content-tertiary hover:text-content-secondary transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Filter
          </button>
          {showAddFilter && (
            <div className="absolute bottom-full left-0 mb-2 w-full rounded-lg border border-border bg-surface-elevated shadow-lg z-20 max-h-64 overflow-y-auto">
              {Array.from(categories.entries()).map(([category, fields]) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-overline uppercase text-content-tertiary bg-surface-card">
                    {category}
                  </div>
                  {fields
                    .filter((f) => value[f.key] === undefined || value[f.key] === null || value[f.key] === '')
                    .map((field) => (
                      <button
                        key={field.key}
                        onClick={() => {
                          updateField(field.key, field.defaultValue ?? '');
                          if (!expandedCategories.has(field.category || 'General')) {
                            toggleCategory(field.category || 'General');
                          }
                          setShowAddFilter(false);
                        }}
                        className="w-full px-3 py-2 text-left text-body-sm text-content-secondary hover:bg-surface-overlay hover:text-content-primary transition-colors"
                      >
                        {field.label}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual filter field renderer
// ---------------------------------------------------------------------------

function FilterField({
  field,
  value,
  onChange,
}: {
  field: FilterFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case 'text':
      return (
        <div>
          <label className="mb-1 block text-caption text-content-secondary">{field.label}</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-tertiary" />
            <input
              type="text"
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value || undefined)}
              placeholder={field.placeholder ?? `Search ${field.label.toLowerCase()}...`}
              className="w-full rounded-md border border-border bg-surface-elevated py-2 pl-8 pr-3 text-body-sm text-content-primary placeholder:text-content-tertiary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>
        </div>
      );

    case 'select':
      return (
        <div>
          <label className="mb-1 block text-caption text-content-secondary">{field.label}</label>
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-body-sm text-content-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          >
            <option value="">All</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'multiselect':
      return <MultiSelectField field={field} value={value} onChange={onChange} />;

    case 'date':
      return (
        <div>
          <label className="mb-1 block text-caption text-content-secondary">{field.label}</label>
          <input
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-body-sm text-content-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>
      );

    case 'daterange':
      return <DateRangeField field={field} value={value} onChange={onChange} />;

    case 'number-range':
      return <NumberRangeField field={field} value={value} onChange={onChange} />;

    case 'boolean':
      return (
        <div className="flex items-center justify-between">
          <label className="text-body-sm text-content-secondary">{field.label}</label>
          <button
            onClick={() => onChange(value ? undefined : true)}
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors duration-fast',
              value ? 'bg-accent' : 'bg-surface-overlay'
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-fast',
                value ? 'translate-x-4' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Multi-select field
// ---------------------------------------------------------------------------

function MultiSelectField({
  field,
  value,
  onChange,
}: {
  field: FilterFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = (value as string[]) ?? [];

  function toggle(optValue: string) {
    const next = selected.includes(optValue)
      ? selected.filter((v) => v !== optValue)
      : [...selected, optValue];
    onChange(next.length > 0 ? next : undefined);
  }

  return (
    <div>
      <label className="mb-1 block text-caption text-content-secondary">{field.label}</label>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md border border-border bg-surface-elevated px-3 py-2 text-body-sm text-content-primary hover:border-border-strong transition-colors"
      >
        <span className={selected.length === 0 ? 'text-content-tertiary' : ''}>
          {selected.length === 0
            ? 'Select...'
            : `${selected.length} selected`}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-content-tertiary" />
      </button>
      {open && (
        <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-surface-elevated">
          {field.options?.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-body-sm text-content-secondary hover:bg-surface-overlay hover:text-content-primary transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date range field
// ---------------------------------------------------------------------------

function DateRangeField({
  field,
  value,
  onChange,
}: {
  field: FilterFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const range = (value as { from?: string; to?: string }) ?? {};

  return (
    <div>
      <label className="mb-1 block text-caption text-content-secondary">{field.label}</label>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={range.from ?? ''}
          onChange={(e) =>
            onChange({ ...range, from: e.target.value || undefined })
          }
          className="flex-1 rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-body-sm text-content-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <span className="text-content-tertiary text-body-sm">to</span>
        <input
          type="date"
          value={range.to ?? ''}
          onChange={(e) =>
            onChange({ ...range, to: e.target.value || undefined })
          }
          className="flex-1 rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-body-sm text-content-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Number range field
// ---------------------------------------------------------------------------

function NumberRangeField({
  field,
  value,
  onChange,
}: {
  field: FilterFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const range = (value as { min?: number; max?: number }) ?? {};

  return (
    <div>
      <label className="mb-1 block text-caption text-content-secondary">{field.label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={range.min ?? ''}
          onChange={(e) =>
            onChange({
              ...range,
              min: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="Min"
          className="flex-1 rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-body-sm text-content-primary placeholder:text-content-tertiary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <span className="text-content-tertiary text-body-sm">to</span>
        <input
          type="number"
          value={range.max ?? ''}
          onChange={(e) =>
            onChange({
              ...range,
              max: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="Max"
          className="flex-1 rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-body-sm text-content-primary placeholder:text-content-tertiary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    </div>
  );
}
