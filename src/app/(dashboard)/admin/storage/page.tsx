'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import {
  ChevronLeft,
  Plus,
  X,
  HardDrive,
  Cloud,
  Loader2,
  CheckCircle2,
  XCircle,
  FolderOpen,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PoolType = 'local' | 's3';

interface StoragePoolMock {
  id: string;
  name: string;
  type: PoolType;
  usedBytes: number;
  maxBytes: number;
  fileCount: number;
  retentionDays: number;
  retentionAction: 'delete' | 'archive';
  path?: string;
  bucket?: string;
  region?: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_POOLS: StoragePoolMock[] = [
  {
    id: 'pool_001',
    name: 'Primary Local',
    type: 'local',
    usedBytes: 18_500_000_000,
    maxBytes: 32_000_000_000,
    fileCount: 12_847,
    retentionDays: 365,
    retentionAction: 'archive',
    path: '/data/recordings',
  },
  {
    id: 'pool_002',
    name: 'S3 Archive',
    type: 's3',
    usedBytes: 145_200_000_000,
    maxBytes: 500_000_000_000,
    fileCount: 89_234,
    retentionDays: 730,
    retentionAction: 'delete',
    bucket: 'calldoc-recordings',
    region: 'us-east-1',
  },
  {
    id: 'pool_003',
    name: 'Hot Storage',
    type: 'local',
    usedBytes: 9_800_000_000,
    maxBytes: 10_000_000_000,
    fileCount: 4_521,
    retentionDays: 30,
    retentionAction: 'archive',
    path: '/data/recordings-hot',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function getCapacityColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-green-500';
}

function getCapacityLabel(pct: number): string {
  if (pct >= 90) return 'text-red-400';
  if (pct >= 70) return 'text-amber-400';
  return 'text-green-400';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoragePoolsPage() {
  const demoMode = useUIStore((s) => s.demoMode);
  const [pools, setPools] = useState<StoragePoolMock[]>(demoMode ? MOCK_POOLS : []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<PoolType>('local');
  const [formPath, setFormPath] = useState('');
  const [formMaxSize, setFormMaxSize] = useState('50');
  const [formBucket, setFormBucket] = useState('');
  const [formRegion, setFormRegion] = useState('us-east-1');
  const [formAccessKey, setFormAccessKey] = useState('');
  const [formSecretKey, setFormSecretKey] = useState('');
  const [formRetention, setFormRetention] = useState('365');
  const [formRetentionAction, setFormRetentionAction] = useState<'delete' | 'archive'>('delete');

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      await new Promise((r) => setTimeout(r, 500));

      const maxBytes = Number(formMaxSize) * 1_000_000_000;
      const newPool: StoragePoolMock = {
        id: `pool_${Date.now()}`,
        name: formName,
        type: formType,
        usedBytes: 0,
        maxBytes,
        fileCount: 0,
        retentionDays: Number(formRetention),
        retentionAction: formRetentionAction,
        ...(formType === 'local'
          ? { path: formPath }
          : { bucket: formBucket, region: formRegion }),
      };

      setPools((prev) => [...prev, newPool]);
      setSaving(false);
      setDialogOpen(false);
      // Reset form
      setFormName('');
      setFormType('local');
      setFormPath('');
      setFormMaxSize('50');
      setFormBucket('');
      setFormRegion('us-east-1');
      setFormAccessKey('');
      setFormSecretKey('');
      setFormRetention('365');
      setFormRetentionAction('delete');
    },
    [formName, formType, formPath, formMaxSize, formBucket, formRegion, formRetention, formRetentionAction]
  );

  const handleTestS3 = useCallback(async () => {
    setTestResult('testing');
    await new Promise((r) => setTimeout(r, 1500));
    setTestResult(formBucket ? 'success' : 'error');
  }, [formBucket]);

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
            Storage Pools
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {pools.length} pools &middot;{' '}
            {formatBytes(pools.reduce((s, p) => s + p.usedBytes, 0))} total used
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          <Plus className="h-4 w-4" />
          Add Pool
        </button>
      </div>

      {/* Pool cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pools.map((pool) => {
          const pct = Math.round((pool.usedBytes / pool.maxBytes) * 100);

          return (
            <div
              key={pool.id}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 transition-colors hover:border-[var(--border-strong)]"
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {pool.type === 'local' ? (
                    <HardDrive className="h-5 w-5 text-[var(--text-tertiary)]" />
                  ) : (
                    <Cloud className="h-5 w-5 text-[var(--text-tertiary)]" />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {pool.name}
                    </h3>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {pool.type === 'local' ? pool.path : pool.bucket}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'inline-flex rounded-md border px-2 py-0.5 text-xs font-medium',
                    pool.type === 'local'
                      ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                      : 'border-orange-500/20 bg-orange-500/10 text-orange-400'
                  )}
                >
                  {pool.type === 'local' ? 'Local' : 'S3'}
                </span>
              </div>

              {/* Capacity bar */}
              <div className="mb-3 space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">Capacity</span>
                  <span className={cn('text-xs font-medium tabular-nums', getCapacityLabel(pct))}>
                    {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', getCapacityColor(pct))}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
                  <span>{formatBytes(pool.usedBytes)} used</span>
                  <span>{formatBytes(pool.maxBytes)} total</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 border-t border-[var(--border-default)] pt-3">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Files</p>
                  <p className="text-sm font-medium tabular-nums text-[var(--text-primary)]">
                    {formatNumber(pool.fileCount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Retention</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {pool.retentionDays}d / {pool.retentionAction}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {pools.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-[var(--border-default)] py-12 text-center">
            <FolderOpen className="mx-auto mb-3 h-8 w-8 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              No storage pools configured yet.
            </p>
          </div>
        )}
      </div>

      {/* ─── Add Pool Dialog ──────────────────────────────────────────── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDialogOpen(false)}
          />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Add Storage Pool
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
                  Pool Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Primary Storage"
                  className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>

              {/* Type selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Storage Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('local')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all',
                      formType === 'local'
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] text-[var(--accent-primary)]'
                        : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                    )}
                  >
                    <HardDrive className="h-4 w-4" />
                    Local
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('s3')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all',
                      formType === 's3'
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] text-[var(--accent-primary)]'
                        : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                    )}
                  >
                    <Cloud className="h-4 w-4" />
                    S3
                  </button>
                </div>
              </div>

              {/* Type-specific fields */}
              {formType === 'local' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    File Path
                  </label>
                  <input
                    type="text"
                    required
                    value={formPath}
                    onChange={(e) => setFormPath(e.target.value)}
                    placeholder="/data/recordings"
                    className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Bucket Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formBucket}
                      onChange={(e) => setFormBucket(e.target.value)}
                      placeholder="my-recordings-bucket"
                      className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Region
                    </label>
                    <input
                      type="text"
                      value={formRegion}
                      onChange={(e) => setFormRegion(e.target.value)}
                      className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">
                        Access Key
                      </label>
                      <input
                        type="text"
                        value={formAccessKey}
                        onChange={(e) => setFormAccessKey(e.target.value)}
                        className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">
                        Secret Key
                      </label>
                      <input
                        type="password"
                        value={formSecretKey}
                        onChange={(e) => setFormSecretKey(e.target.value)}
                        className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                      />
                    </div>
                  </div>

                  {/* Test S3 */}
                  <button
                    type="button"
                    onClick={handleTestS3}
                    disabled={testResult === 'testing'}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] disabled:opacity-60"
                  >
                    {testResult === 'testing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {testResult === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
                    {testResult === 'error' && <XCircle className="h-3.5 w-3.5 text-red-400" />}
                    Test Access
                  </button>
                </>
              )}

              {/* Max size */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Max Size (GB)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formMaxSize}
                  onChange={(e) => setFormMaxSize(e.target.value)}
                  className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>

              {/* Retention */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Retention (days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formRetention}
                    onChange={(e) => setFormRetention(e.target.value)}
                    className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    On Expiry
                  </label>
                  <select
                    value={formRetentionAction}
                    onChange={(e) => setFormRetentionAction(e.target.value as 'delete' | 'archive')}
                    className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                  >
                    <option value="delete">Delete</option>
                    <option value="archive">Archive</option>
                  </select>
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
                  Add Pool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
