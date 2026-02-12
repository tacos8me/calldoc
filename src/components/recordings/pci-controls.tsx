'use client';

// ---------------------------------------------------------------------------
// PCI Controls Component - PCI DSS compliance controls for recording playback
// ---------------------------------------------------------------------------
// Shows pause/resume controls for active recordings, visual indicators for
// paused state, auto-resume countdown, and audit trail.

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PciSegment {
  startMs: number;
  endMs: number;
  isActive: boolean;
}

export interface PciAuditEntry {
  id: string;
  eventType: 'pause' | 'resume' | 'auto_resume';
  timestampMs: number;
  reason: string | null;
  userId: string | null;
  userName: string;
  createdAt: string;
}

export type PauseReason = 'PCI' | 'Customer Request' | 'Legal Hold';

export interface PciControlsProps {
  /** Recording ID */
  recordingId: string;
  /** Whether this is a live/active recording */
  isLive?: boolean;
  /** Additional CSS class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAUSE_REASONS: PauseReason[] = ['PCI', 'Customer Request', 'Legal Hold'];
const AUTO_RESUME_SECONDS = parseInt(process.env.NEXT_PUBLIC_PCI_AUTO_RESUME_SEC || '180', 10);

// ---------------------------------------------------------------------------
// PciControls Component
// ---------------------------------------------------------------------------

export function PciControls({ recordingId, isLive = false, className }: PciControlsProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [segments, setSegments] = useState<PciSegment[]>([]);
  const [auditTrail, setAuditTrail] = useState<PciAuditEntry[]>([]);
  const [selectedReason, setSelectedReason] = useState<PauseReason>('PCI');
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch current PCI status ──────────────────────────────────────
  const fetchSegments = useCallback(async () => {
    try {
      const res = await fetch(`/api/recordings/${recordingId}/pci/segments`);
      if (!res.ok) return;
      const json = await res.json();

      setSegments(json.data.segments ?? []);
      setAuditTrail(json.data.auditTrail ?? []);

      // Determine if currently paused from audit trail
      const lastEvent = json.data.auditTrail?.[json.data.auditTrail.length - 1];
      if (lastEvent && lastEvent.eventType === 'pause') {
        setIsPaused(true);
        // Calculate remaining countdown
        const pausedAt = new Date(lastEvent.createdAt).getTime();
        const elapsed = Math.floor((Date.now() - pausedAt) / 1000);
        const remaining = Math.max(0, AUTO_RESUME_SECONDS - elapsed);
        setCountdown(remaining > 0 ? remaining : null);
      } else {
        setIsPaused(false);
        setCountdown(null);
      }
    } catch {
      // Silently fail on status check
    }
  }, [recordingId]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  // ─── Countdown timer ──────────────────────────────────────────────
  useEffect(() => {
    if (isPaused && countdown !== null && countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            // Auto-resume triggered
            setIsPaused(false);
            fetchSegments();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isPaused, countdown, fetchSegments]);

  // ─── Pause handler ────────────────────────────────────────────────
  const handlePause = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/recordings/${recordingId}/pci/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: selectedReason }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message || 'Failed to pause recording');
        return;
      }

      setIsPaused(true);
      setCountdown(AUTO_RESUME_SECONDS);
      await fetchSegments();
    } catch {
      setError('Network error while pausing recording');
    } finally {
      setLoading(false);
    }
  };

  // ─── Resume handler ───────────────────────────────────────────────
  const handleResume = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/recordings/${recordingId}/pci/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message || 'Failed to resume recording');
        return;
      }

      setIsPaused(false);
      setCountdown(null);
      await fetchSegments();
    } catch {
      setError('Network error while resuming recording');
    } finally {
      setLoading(false);
    }
  };

  // ─── Time formatting ──────────────────────────────────────────────
  function formatCountdown(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function formatTimestamp(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return iso;
    }
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        isPaused
          ? 'animate-pulse border-red-500/50 bg-red-950/20'
          : 'border-zinc-700 bg-zinc-900',
        className
      )}
    >
      {/* Paused banner */}
      {isPaused && (
        <div className="mb-3 flex items-center justify-between rounded-md bg-red-600/20 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            <span className="text-sm font-semibold text-red-300">RECORDING PAUSED</span>
          </div>
          {countdown !== null && (
            <span className="text-xs text-red-300">
              Auto-resume in {formatCountdown(countdown)}
            </span>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isPaused ? (
          <>
            {/* Reason selector */}
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value as PauseReason)}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-300"
              disabled={loading}
            >
              {PAUSE_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>

            {/* Pause button */}
            {showConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Confirm pause?</span>
                <button
                  onClick={handlePause}
                  disabled={loading}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                >
                  {loading ? 'Pausing...' : 'Yes, Pause'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={loading || !isLive}
                className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pause Recording
              </button>
            )}
          </>
        ) : (
          <button
            onClick={handleResume}
            disabled={loading}
            className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
          >
            {loading ? 'Resuming...' : 'Resume Recording'}
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {/* Audit log */}
      {auditTrail.length > 0 && (
        <div className="mt-4 border-t border-zinc-800 pt-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Pause/Resume History
          </h4>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {auditTrail.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between text-xs text-zinc-400"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-block h-1.5 w-1.5 rounded-full',
                      entry.eventType === 'pause' ? 'bg-red-500' : 'bg-green-500'
                    )}
                  />
                  <span className="font-medium text-zinc-300">
                    {entry.eventType === 'pause'
                      ? 'Paused'
                      : entry.eventType === 'auto_resume'
                        ? 'Auto-resumed'
                        : 'Resumed'}
                  </span>
                  <span>by {entry.userName}</span>
                  {entry.reason && (
                    <span className="text-zinc-500">({entry.reason})</span>
                  )}
                </div>
                <span className="text-zinc-600">{formatTimestamp(entry.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PciControls;
