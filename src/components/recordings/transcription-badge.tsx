'use client';

import { cn } from '@/lib/utils';
import { Check, X, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TranscriptionBadgeProps {
  status: TranscriptionStatus | null;
  confidence?: number | null;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// TranscriptionBadge
// ---------------------------------------------------------------------------

export function TranscriptionBadge({
  status,
  confidence,
  compact = false,
}: TranscriptionBadgeProps) {
  // No transcription -- show nothing or subtle text
  if (status === null || status === undefined) {
    if (compact) return null;
    return (
      <span className="text-xs text-[var(--text-tertiary)]">No transcript</span>
    );
  }

  // ─── Pending ────────────────────────────────────────────────────────
  if (status === 'pending') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5',
          !compact && 'rounded-full bg-amber-500/10 px-2 py-0.5',
        )}
        title="Transcription pending"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
        {!compact && (
          <span className="text-[11px] font-medium text-amber-400">Pending</span>
        )}
      </span>
    );
  }

  // ─── Processing ─────────────────────────────────────────────────────
  if (status === 'processing') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5',
          !compact && 'rounded-full bg-blue-500/10 px-2 py-0.5',
        )}
        title="Transcribing..."
      >
        <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
        {!compact && (
          <span className="text-[11px] font-medium text-blue-400">
            Transcribing...
          </span>
        )}
      </span>
    );
  }

  // ─── Completed ──────────────────────────────────────────────────────
  if (status === 'completed') {
    const confidenceText =
      confidence !== null && confidence !== undefined
        ? `${Math.round(confidence * 100)}%`
        : null;

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5',
          !compact && 'rounded-full bg-green-500/10 px-2 py-0.5',
        )}
        title={
          confidenceText
            ? `Transcription complete (${confidenceText} confidence)`
            : 'Transcription complete'
        }
      >
        <Check className="h-3 w-3 text-green-400" />
        {!compact && confidenceText && (
          <span className="text-[11px] font-medium text-green-400">
            {confidenceText}
          </span>
        )}
      </span>
    );
  }

  // ─── Failed ─────────────────────────────────────────────────────────
  if (status === 'failed') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5',
          !compact && 'rounded-full bg-red-500/10 px-2 py-0.5',
        )}
        title="Transcription failed"
      >
        <X className="h-3 w-3 text-red-400" />
        {!compact && (
          <span className="text-[11px] font-medium text-red-400">Failed</span>
        )}
      </span>
    );
  }

  return null;
}

export default TranscriptionBadge;
