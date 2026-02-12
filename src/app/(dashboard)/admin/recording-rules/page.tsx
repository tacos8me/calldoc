'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  Mic,
  Loader2,
  GripVertical,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RuleType =
  | 'all-calls'
  | 'agent'
  | 'group'
  | 'direction'
  | 'caller-pattern'
  | 'schedule'
  | 'random';

interface RecordingRuleMock {
  id: string;
  name: string;
  type: RuleType;
  conditions: string;
  recordPercent: number;
  priority: number;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  'all-calls': 'All Calls',
  agent: 'By Agent',
  group: 'By Group',
  direction: 'By Direction',
  'caller-pattern': 'By Caller Pattern',
  schedule: 'By Schedule',
  random: 'Random %',
};

const RULE_TYPE_COLORS: Record<RuleType, string> = {
  'all-calls': 'bg-green-500/10 text-green-400 border-green-500/20',
  agent: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  group: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  direction: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'caller-pattern': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  schedule: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  random: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const RULE_TYPES: RuleType[] = [
  'all-calls',
  'agent',
  'group',
  'direction',
  'caller-pattern',
  'schedule',
  'random',
];

const MOCK_RULES: RecordingRuleMock[] = [
  {
    id: 'rule_001',
    name: 'Record All Inbound',
    type: 'direction',
    conditions: 'Direction: Inbound',
    recordPercent: 100,
    priority: 1,
    active: true,
  },
  {
    id: 'rule_002',
    name: 'Sales Team Full Recording',
    type: 'group',
    conditions: 'Group: Sales (HG1)',
    recordPercent: 100,
    priority: 2,
    active: true,
  },
  {
    id: 'rule_003',
    name: 'Support QA Sample',
    type: 'group',
    conditions: 'Group: Support (HG2)',
    recordPercent: 25,
    priority: 3,
    active: true,
  },
  {
    id: 'rule_004',
    name: 'VIP Callers',
    type: 'caller-pattern',
    conditions: 'Caller: +1800*',
    recordPercent: 100,
    priority: 4,
    active: false,
  },
  {
    id: 'rule_005',
    name: 'Business Hours Only',
    type: 'schedule',
    conditions: 'Mon-Fri 08:00-18:00',
    recordPercent: 50,
    priority: 5,
    active: true,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RecordingRulesPage() {
  const [rules, setRules] = useState<RecordingRuleMock[]>(MOCK_RULES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<RuleType>('all-calls');
  const [formPercent, setFormPercent] = useState(100);
  const [formConditions, setFormConditions] = useState('');

  // Toggle rule active
  const toggleRule = useCallback((id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  }, []);

  // Move rule up/down
  const moveRule = useCallback((id: string, direction: 'up' | 'down') => {
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;

      const newRules = [...prev];
      [newRules[idx], newRules[target]] = [newRules[target], newRules[idx]];
      return newRules.map((r, i) => ({ ...r, priority: i + 1 }));
    });
  }, []);

  // Add rule
  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      await new Promise((r) => setTimeout(r, 500));

      const newRule: RecordingRuleMock = {
        id: `rule_${Date.now()}`,
        name: formName,
        type: formType,
        conditions: formConditions || RULE_TYPE_LABELS[formType],
        recordPercent: formPercent,
        priority: rules.length + 1,
        active: true,
      };
      setRules((prev) => [...prev, newRule]);
      setSaving(false);
      setDialogOpen(false);
      setFormName('');
      setFormType('all-calls');
      setFormPercent(100);
      setFormConditions('');
    },
    [formName, formType, formPercent, formConditions, rules.length]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a
          href="/admin"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </a>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Recording Rules
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {rules.length} rules &middot; {rules.filter((r) => r.active).length} active
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          <Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      {/* Rule cards */}
      <div className="space-y-3">
        {rules.map((rule, idx) => (
          <div
            key={rule.id}
            className={cn(
              'flex items-center gap-4 rounded-xl border bg-[var(--bg-surface)] p-4 transition-all duration-200',
              rule.active
                ? 'border-[var(--border-default)]'
                : 'border-[var(--border-default)] opacity-50'
            )}
          >
            {/* Grip / priority */}
            <div className="flex flex-col items-center gap-1">
              <GripVertical className="h-4 w-4 text-[var(--text-tertiary)]" />
              <span className="text-xs font-mono text-[var(--text-tertiary)]">
                #{rule.priority}
              </span>
            </div>

            {/* Rule info */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {rule.name}
                </span>
                <span
                  className={cn(
                    'inline-flex rounded-md border px-2 py-0.5 text-xs font-medium',
                    RULE_TYPE_COLORS[rule.type]
                  )}
                >
                  {RULE_TYPE_LABELS[rule.type]}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">{rule.conditions}</p>
            </div>

            {/* Record percentage */}
            <div className="text-right">
              <span className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                {rule.recordPercent}%
              </span>
              <p className="text-xs text-[var(--text-tertiary)]">recording</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => moveRule(rule.id, 'up')}
                disabled={idx === 0}
                className="rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => moveRule(rule.id, 'down')}
                disabled={idx === rules.length - 1}
                className="rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>

              {/* Active toggle */}
              <button
                onClick={() => toggleRule(rule.id)}
                className={cn(
                  'ml-2 relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
                  rule.active ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-overlay)]'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
                    rule.active ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--border-default)] py-12 text-center">
            <Mic className="mx-auto mb-3 h-8 w-8 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              No recording rules configured yet.
            </p>
            <button
              onClick={() => setDialogOpen(true)}
              className="mt-2 text-sm text-[var(--accent-primary)] hover:underline"
            >
              Add your first rule
            </button>
          </div>
        )}
      </div>

      {/* ─── Add Rule Dialog ──────────────────────────────────────────── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDialogOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Add Recording Rule
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-md p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Record Sales Calls"
                  className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Rule Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as RuleType)}
                  className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                >
                  {RULE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {RULE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Conditions (summary)
                </label>
                <input
                  type="text"
                  value={formConditions}
                  onChange={(e) => setFormConditions(e.target.value)}
                  placeholder="e.g., Group: Sales, Direction: Inbound"
                  className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Record Percentage
                  </label>
                  <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                    {formPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={formPercent}
                  onChange={(e) => setFormPercent(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--bg-overlay)] accent-[var(--accent-primary)]"
                />
                <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
