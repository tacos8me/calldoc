'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  FileText,
  ChevronUp,
  ChevronDown,
  X,
  Mic,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types -- imported from @/types when available, declared locally as fallback
// ---------------------------------------------------------------------------

type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
  speaker?: string;
  words: TranscriptWord[];
}

interface Transcription {
  id: string;
  recordingId: string;
  jobId: string | null;
  status: TranscriptionStatus;
  transcript: string | null;
  confidence: number | null;
  language: string;
  durationSeconds: number | null;
  processingTimeSeconds: number | null;
  segments: TranscriptSegment[];
  wordCount: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TranscriptViewerProps {
  recordingId: string;
  currentTime?: number;
  onSeek?: (time: number) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Find the segment active at a given time. */
function findActiveSegmentIndex(
  segments: TranscriptSegment[],
  time: number,
): number {
  for (let i = 0; i < segments.length; i++) {
    if (time >= segments[i].start && time <= segments[i].end) {
      return i;
    }
  }
  return -1;
}

/** Find the word active at a given time within a segment. */
function findActiveWordIndex(
  words: TranscriptWord[],
  time: number,
): number {
  for (let i = 0; i < words.length; i++) {
    if (time >= words[i].start && time <= words[i].end) {
      return i;
    }
  }
  return -1;
}

/**
 * Escape special regex characters for use in a literal search.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Hook: useTranscription -- try to import from @/hooks/use-transcriptions,
// fallback to a no-op stub so the code compiles before the hooks are created.
// ---------------------------------------------------------------------------

let useTranscriptionHook: (recordingId: string) => {
  data: Transcription | null | undefined;
  isLoading: boolean;
  error: unknown;
  refetch?: () => void;
};

let useSubmitTranscriptionHook: () => {
  mutate: (args: { recordingId: string }) => void;
  isPending: boolean;
};

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const hooks = require('@/hooks/use-transcriptions');
  useTranscriptionHook = hooks.useTranscription;
  useSubmitTranscriptionHook = hooks.useSubmitTranscription;
} catch {
  // Fallback stubs when hooks are not yet available
  useTranscriptionHook = () => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: () => {},
  });
  useSubmitTranscriptionHook = () => ({
    mutate: () => {},
    isPending: false,
  });
}

// ---------------------------------------------------------------------------
// TranscriptViewer
// ---------------------------------------------------------------------------

export function TranscriptViewer({
  recordingId,
  currentTime = 0,
  onSeek,
  className,
}: TranscriptViewerProps) {
  const { data: transcription, isLoading, error, refetch } =
    useTranscriptionHook(recordingId);
  const submitMutation = useSubmitTranscriptionHook();

  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  // Segments from the transcription data
  const segments: TranscriptSegment[] = transcription?.segments ?? [];

  // ─── Active segment/word tracking ─────────────────────────────────
  const activeSegmentIdx = useMemo(
    () => findActiveSegmentIndex(segments, currentTime),
    [segments, currentTime],
  );

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const el = activeSegmentRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      // Scroll if element is out of visible area
      if (
        elRect.top < containerRect.top ||
        elRect.bottom > containerRect.bottom
      ) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeSegmentIdx]);

  // ─── Search logic ─────────────────────────────────────────────────
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim() || segments.length === 0) return [];

    const matches: { segmentIndex: number; wordIndices: number[] }[] = [];
    const query = searchQuery.toLowerCase();

    segments.forEach((segment, segIdx) => {
      const wordIndices: number[] = [];
      segment.words.forEach((word, wIdx) => {
        if (word.word.toLowerCase().includes(query)) {
          wordIndices.push(wIdx);
        }
      });
      // Also check segment text for multi-word matches
      if (wordIndices.length > 0 || segment.text.toLowerCase().includes(query)) {
        matches.push({ segmentIndex: segIdx, wordIndices });
      }
    });

    return matches;
  }, [searchQuery, segments]);

  const totalSearchMatches = searchMatches.reduce(
    (sum, m) => sum + Math.max(m.wordIndices.length, 1),
    0,
  );

  const handleNextMatch = useCallback(() => {
    if (totalSearchMatches === 0) return;
    setSearchMatchIndex((prev) => (prev + 1) % totalSearchMatches);
  }, [totalSearchMatches]);

  const handlePrevMatch = useCallback(() => {
    if (totalSearchMatches === 0) return;
    setSearchMatchIndex((prev) =>
      prev === 0 ? totalSearchMatches - 1 : prev - 1,
    );
  }, [totalSearchMatches]);

  // Reset match index on query change
  useEffect(() => {
    setSearchMatchIndex(0);
  }, [searchQuery]);

  // ─── Copy transcript ──────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    const fullText =
      transcription?.transcript ??
      segments.map((s) => s.text).join('\n\n');
    if (!fullText) return;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = fullText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [transcription, segments]);

  // ─── Submit transcription ─────────────────────────────────────────
  const handleTranscribe = useCallback(() => {
    submitMutation.mutate({ recordingId });
  }, [submitMutation, recordingId]);

  // ─── Render helpers ───────────────────────────────────────────────

  /** Highlight search matches in a word */
  function isSearchMatch(segIdx: number, wordIdx: number): boolean {
    if (!searchQuery.trim()) return false;
    return searchMatches.some(
      (m) =>
        m.segmentIndex === segIdx && m.wordIndices.includes(wordIdx),
    );
  }

  // ─── Loading state ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={cn('flex flex-col', className)}>
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div
                className="h-3 w-16 animate-pulse rounded bg-zinc-800"
                style={{ animationDelay: `${i * 100}ms` }}
              />
              <div
                className="h-4 w-full animate-pulse rounded bg-zinc-800"
                style={{ animationDelay: `${i * 100 + 50}ms` }}
              />
              <div
                className="h-4 w-3/4 animate-pulse rounded bg-zinc-800"
                style={{ animationDelay: `${i * 100 + 100}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <AlertTriangle className="mb-3 h-8 w-8 text-red-400" />
        <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">
          Failed to load transcript
        </p>
        <p className="mb-4 text-xs text-[var(--text-tertiary)]">
          {(error as { message?: string })?.message ?? 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => refetch?.()}
          className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)]"
        >
          Retry
        </button>
      </div>
    );
  }

  // ─── Processing / Pending state ───────────────────────────────────
  if (
    transcription &&
    (transcription.status === 'pending' || transcription.status === 'processing')
  ) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-400" />
        <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">
          {transcription.status === 'pending'
            ? 'Transcription queued'
            : 'Transcribing...'}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {transcription.status === 'pending'
            ? 'Waiting for processing to begin'
            : 'This may take a few moments'}
        </p>
      </div>
    );
  }

  // ─── Failed state ─────────────────────────────────────────────────
  if (transcription && transcription.status === 'failed') {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <AlertTriangle className="mb-3 h-8 w-8 text-red-400" />
        <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">
          Transcription failed
        </p>
        <p className="mb-4 text-xs text-[var(--text-tertiary)]">
          {transcription.errorMessage ?? 'An unknown error occurred during transcription'}
        </p>
        <button
          onClick={handleTranscribe}
          disabled={submitMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Submitting...
            </>
          ) : (
            'Retry Transcription'
          )}
        </button>
      </div>
    );
  }

  // ─── Empty state (no transcription yet) ───────────────────────────
  if (!transcription || segments.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <Mic className="mb-3 h-8 w-8 text-[var(--text-tertiary)]" />
        <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">
          No transcript available
        </p>
        <p className="mb-4 text-xs text-[var(--text-tertiary)]">
          Generate a transcript to see a text version of this recording
        </p>
        <button
          onClick={handleTranscribe}
          disabled={submitMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <FileText className="h-3.5 w-3.5" />
              Transcribe
            </>
          )}
        </button>
      </div>
    );
  }

  // ─── Completed transcript ─────────────────────────────────────────
  return (
    <div className={cn('flex flex-col', className)}>
      {/* ─── Sticky search bar ──────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--border-default)] bg-zinc-900 px-4 py-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full rounded-md border border-[var(--border-default)] bg-zinc-950 py-1.5 pl-8 pr-8 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Search nav */}
        {searchQuery && totalSearchMatches > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs tabular-nums text-[var(--text-tertiary)]">
              {searchMatchIndex + 1}/{totalSearchMatches}
            </span>
            <button
              onClick={handlePrevMatch}
              className="rounded p-0.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleNextMatch}
              className="rounded p-0.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {searchQuery && totalSearchMatches === 0 && (
          <span className="text-xs text-[var(--text-tertiary)]">No matches</span>
        )}

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          title="Copy transcript"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* ─── Transcript segments ────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto bg-zinc-900 p-4"
      >
        <div className="space-y-4">
          {segments.map((segment, segIdx) => {
            const isActive = segIdx === activeSegmentIdx;
            const activeWordIdx = isActive
              ? findActiveWordIndex(segment.words, currentTime)
              : -1;

            return (
              <div
                key={`seg-${segIdx}`}
                ref={isActive ? activeSegmentRef : undefined}
                className={cn(
                  'rounded-lg p-3 transition-colors duration-200',
                  isActive
                    ? 'border-l-2 border-indigo-500 bg-indigo-500/10'
                    : 'border-l-2 border-transparent hover:bg-zinc-800/50',
                )}
              >
                {/* Segment header */}
                <div className="mb-1.5 flex items-center gap-2">
                  <button
                    onClick={() => onSeek?.(segment.start)}
                    className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
                    title={`Seek to ${formatTimestamp(segment.start)}`}
                  >
                    {formatTimestamp(segment.start)}
                  </button>
                  {segment.speaker && (
                    <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
                      {segment.speaker}
                    </span>
                  )}
                </div>

                {/* Words */}
                <p className="text-sm leading-relaxed">
                  {segment.words.length > 0
                    ? segment.words.map((word, wIdx) => {
                        const isActiveWord =
                          isActive && wIdx === activeWordIdx;
                        const isLowConfidence = word.confidence < 0.7;
                        const isMatch = isSearchMatch(segIdx, wIdx);

                        return (
                          <span
                            key={`w-${segIdx}-${wIdx}`}
                            onClick={() => onSeek?.(word.start)}
                            className={cn(
                              'cursor-pointer transition-colors duration-150',
                              isActiveWord
                                ? 'font-bold text-indigo-400'
                                : 'text-[var(--text-primary)]',
                              isLowConfidence &&
                                !isActiveWord &&
                                'underline decoration-dotted decoration-amber-500/60 underline-offset-2',
                              isMatch && 'bg-yellow-500/20 rounded-sm',
                              !isActiveWord &&
                                !isMatch &&
                                'hover:text-indigo-300',
                            )}
                            title={
                              isLowConfidence
                                ? `Low confidence: ${Math.round(word.confidence * 100)}%`
                                : undefined
                            }
                          >
                            {word.word}{' '}
                          </span>
                        );
                      })
                    : // Fallback: render segment text without word-level detail
                      segment.text
                        .split(' ')
                        .map((word, wIdx) => (
                          <span
                            key={`fw-${segIdx}-${wIdx}`}
                            onClick={() => onSeek?.(segment.start)}
                            className="cursor-pointer text-[var(--text-primary)] transition-colors hover:text-indigo-300"
                          >
                            {word}{' '}
                          </span>
                        ))}
                </p>
              </div>
            );
          })}
        </div>

        {/* Transcript metadata footer */}
        {transcription.confidence !== null && (
          <div className="mt-6 flex items-center gap-4 border-t border-zinc-800 pt-4 text-xs text-[var(--text-tertiary)]">
            <span>
              Confidence:{' '}
              <span className="font-medium text-[var(--text-secondary)]">
                {Math.round(transcription.confidence * 100)}%
              </span>
            </span>
            {transcription.wordCount !== null && (
              <span>
                Words:{' '}
                <span className="font-medium text-[var(--text-secondary)]">
                  {transcription.wordCount.toLocaleString()}
                </span>
              </span>
            )}
            {transcription.language && (
              <span>
                Language:{' '}
                <span className="font-medium text-[var(--text-secondary)]">
                  {transcription.language.toUpperCase()}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TranscriptViewer;
