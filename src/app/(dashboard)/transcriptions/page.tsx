'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  Clock,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Type,
  Timer,
  PhoneIncoming,
  PhoneOutgoing,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

// ---------------------------------------------------------------------------
// Types (provided by another team -- imported inline until barrel available)
// ---------------------------------------------------------------------------

type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

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

interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
  confidence: number;
  speaker?: string;
}

interface TranscriptionStats {
  totalTranscriptions: number;
  completed: number;
  pending: number;
  processing: number;
  failed: number;
  averageConfidence: number;
  totalWordCount: number;
  averageProcessingTime: number;
}

interface TranscriptionSearchResult {
  transcriptionId: string;
  recordingId: string;
  agentName: string | null;
  callerNumber: string;
  calledNumber: string;
  direction: string;
  callDate: string;
  duration: number;
  transcript: string;
  confidence: number;
  matchSnippet: string;
  matchPosition: number;
}

// ---------------------------------------------------------------------------
// Mock data for demo mode
// ---------------------------------------------------------------------------

const MOCK_STATS: TranscriptionStats = {
  totalTranscriptions: 1284,
  completed: 1156,
  pending: 47,
  processing: 12,
  failed: 69,
  averageConfidence: 91.3,
  totalWordCount: 2847392,
  averageProcessingTime: 4.7,
};

const AGENT_NAMES = [
  'Sarah Johnson',
  'Mike Chen',
  'Emma Wilson',
  'James Brown',
  'Lisa Davis',
  'Robert Taylor',
  'Amy Garcia',
  'David Martinez',
];

function randomPhone(): string {
  const area = Math.floor(200 + Math.random() * 800);
  const pre = Math.floor(200 + Math.random() * 800);
  const line = Math.floor(1000 + Math.random() * 9000);
  return `(${area}) ${pre}-${line}`;
}

const SAMPLE_TRANSCRIPTS = [
  'Thank you for calling our support line. How may I assist you today? I see you have an open ticket regarding your billing inquiry from last week.',
  'Hi, I would like to inquire about upgrading my current plan. Could you walk me through the available options and pricing tiers?',
  'I am experiencing issues with my account login. I have tried resetting my password three times but keep getting an error message.',
  'Good morning! I wanted to follow up on the service request I submitted yesterday. The technician was supposed to arrive between 9 and 11 AM.',
  'I need to cancel my subscription effective immediately. I have already found an alternative provider that better suits my needs.',
  'Could you please transfer me to the billing department? I was charged twice for my last invoice and need a refund processed.',
  'I am calling to schedule a maintenance appointment for next Tuesday. We need someone to look at the network equipment in our server room.',
  'Hello, I received a notification that my contract is up for renewal. I would like to discuss the terms before making a decision.',
  'The automated system is not recognizing my account number. I have tried entering it several times. Can you look it up manually?',
  'I appreciate the quick response on my previous call. Everything is working great now. I just wanted to confirm the changes went through.',
  'We are planning to expand our team and will need additional licenses. Can you provide a quote for fifteen more seats?',
  'I am having trouble with the integration between your platform and our CRM system. The data sync seems to be delayed by several hours.',
];

function generateMockTranscriptions(count: number): Transcription[] {
  const statuses: TranscriptionStatus[] = ['completed', 'completed', 'completed', 'completed', 'pending', 'processing', 'failed'];
  const results: Transcription[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const isCompleted = status === 'completed';
    const transcript = isCompleted
      ? SAMPLE_TRANSCRIPTS[Math.floor(Math.random() * SAMPLE_TRANSCRIPTS.length)]
      : null;
    const durationSeconds = 30 + Math.floor(Math.random() * 570);
    const wordCount = isCompleted ? Math.floor(durationSeconds * 2.5 + Math.random() * 50) : null;
    const confidence = isCompleted ? 70 + Math.random() * 28 : null;
    const processingTime = isCompleted ? 1.5 + Math.random() * 8 : null;
    const createdAt = new Date(now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));

    results.push({
      id: `txn_${String(i + 1).padStart(4, '0')}`,
      recordingId: `rec_${String(i + 1).padStart(4, '0')}`,
      jobId: isCompleted || status === 'processing' ? `job_${String(i + 1).padStart(4, '0')}` : null,
      status,
      transcript,
      confidence: confidence !== null ? Math.round(confidence * 10) / 10 : null,
      language: 'en-US',
      durationSeconds,
      processingTimeSeconds: processingTime !== null ? Math.round(processingTime * 10) / 10 : null,
      segments: isCompleted
        ? generateMockSegments(transcript!, durationSeconds)
        : [],
      wordCount,
      errorMessage: status === 'failed' ? 'Audio quality below minimum threshold (SNR < 5dB)' : null,
      createdAt: createdAt.toISOString(),
      completedAt: isCompleted
        ? new Date(createdAt.getTime() + (processingTime ?? 5) * 1000).toISOString()
        : null,
      updatedAt: createdAt.toISOString(),
    });
  }

  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}

function generateMockSegments(text: string, durationSeconds: number): TranscriptSegment[] {
  const words = text.split(/\s+/);
  const segments: TranscriptSegment[] = [];
  const msPerWord = (durationSeconds * 1000) / words.length;
  let currentMs = 0;

  // Group words into segments of 5-10 words
  let i = 0;
  while (i < words.length) {
    const segLen = Math.min(5 + Math.floor(Math.random() * 6), words.length - i);
    const segText = words.slice(i, i + segLen).join(' ');
    const startMs = Math.round(currentMs);
    const endMs = Math.round(currentMs + segLen * msPerWord);

    segments.push({
      startMs,
      endMs,
      text: segText,
      confidence: 0.75 + Math.random() * 0.24,
      speaker: Math.random() > 0.5 ? 'Agent' : 'Caller',
    });

    currentMs = endMs;
    i += segLen;
  }

  return segments;
}

function generateMockSearchResults(query: string, transcriptions: Transcription[]): TranscriptionSearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: TranscriptionSearchResult[] = [];

  for (const t of transcriptions) {
    if (t.status !== 'completed' || !t.transcript) continue;
    const lowerText = t.transcript.toLowerCase();
    const pos = lowerText.indexOf(q);
    if (pos === -1) continue;

    // Build snippet with context
    const snippetStart = Math.max(0, pos - 40);
    const snippetEnd = Math.min(t.transcript.length, pos + q.length + 40);
    let snippet = t.transcript.slice(snippetStart, snippetEnd);
    if (snippetStart > 0) snippet = '...' + snippet;
    if (snippetEnd < t.transcript.length) snippet = snippet + '...';

    const directions = ['inbound', 'outbound', 'internal'];
    results.push({
      transcriptionId: t.id,
      recordingId: t.recordingId,
      agentName: AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)],
      callerNumber: randomPhone(),
      calledNumber: randomPhone(),
      direction: directions[Math.floor(Math.random() * 3)],
      callDate: t.createdAt,
      duration: t.durationSeconds ?? 0,
      transcript: t.transcript,
      confidence: t.confidence ?? 0,
      matchSnippet: snippet,
      matchPosition: pos,
    });
  }

  return results;
}

// Enrich transcription with call metadata for display
interface TranscriptionRow {
  transcription: Transcription;
  agentName: string;
  callerNumber: string;
  calledNumber: string;
  direction: 'inbound' | 'outbound' | 'internal';
}

function enrichTranscriptions(transcriptions: Transcription[]): TranscriptionRow[] {
  const directions: ('inbound' | 'outbound' | 'internal')[] = ['inbound', 'outbound', 'internal'];
  return transcriptions.map((t, i) => ({
    transcription: t,
    agentName: AGENT_NAMES[i % AGENT_NAMES.length],
    callerNumber: randomPhone(),
    calledNumber: randomPhone(),
    direction: directions[i % 3],
  }));
}

// ---------------------------------------------------------------------------
// Debounce hook
// ---------------------------------------------------------------------------

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSegmentTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatWordCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return 'text-green-400';
  if (confidence >= 70) return 'text-amber-400';
  return 'text-red-400';
}

function getConfidenceBgColor(confidence: number): string {
  if (confidence >= 90) return 'bg-green-500/10';
  if (confidence >= 70) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

function getStatusIcon(status: TranscriptionStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-zinc-400" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-400" />;
  }
}

function getStatusBadgeClasses(status: TranscriptionStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-500/10 text-green-400';
    case 'pending':
      return 'bg-zinc-500/10 text-zinc-400';
    case 'processing':
      return 'bg-blue-500/10 text-blue-400';
    case 'failed':
      return 'bg-red-500/10 text-red-400';
  }
}

function DirectionIcon({ direction }: { direction: string }) {
  switch (direction) {
    case 'inbound':
      return <PhoneIncoming className="h-3.5 w-3.5 text-green-400" />;
    case 'outbound':
      return <PhoneOutgoing className="h-3.5 w-3.5 text-blue-400" />;
    default:
      return <Phone className="h-3.5 w-3.5 text-zinc-400" />;
  }
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  subtext,
  icon,
  valueClassName,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-body-sm text-content-secondary">{label}</span>
        <span className="text-content-tertiary">{icon}</span>
      </div>
      <div className={cn('mt-2 font-mono text-2xl font-semibold text-content-primary', valueClassName)}>
        {value}
      </div>
      {subtext && (
        <p className="mt-1 text-caption text-content-tertiary">{subtext}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function TranscriptionsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface-card p-4"
          >
            <div
              className="h-4 w-24 animate-shimmer rounded bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]"
              style={{ animationDelay: `${i * 100}ms` }}
            />
            <div
              className="mt-3 h-8 w-16 animate-shimmer rounded bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]"
              style={{ animationDelay: `${i * 100 + 50}ms` }}
            />
            <div
              className="mt-2 h-3 w-32 animate-shimmer rounded bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]"
              style={{ animationDelay: `${i * 100 + 100}ms` }}
            />
          </div>
        ))}
      </div>

      {/* Search skeleton */}
      <div className="h-12 w-full animate-shimmer rounded-lg bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]" />

      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-10 w-full animate-shimmer rounded bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-full animate-shimmer rounded bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Highlighted Snippet Component
// ---------------------------------------------------------------------------

function HighlightedSnippet({ snippet, query }: { snippet: string; query: string }) {
  if (!query.trim()) return <span>{snippet}</span>;

  const parts: { text: string; highlight: boolean }[] = [];
  const lowerSnippet = snippet.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;

  let searchStart = 0;
  while (searchStart < lowerSnippet.length) {
    const idx = lowerSnippet.indexOf(lowerQuery, searchStart);
    if (idx === -1) break;

    if (idx > lastIndex) {
      parts.push({ text: snippet.slice(lastIndex, idx), highlight: false });
    }
    parts.push({ text: snippet.slice(idx, idx + query.length), highlight: true });
    lastIndex = idx + query.length;
    searchStart = lastIndex;
  }

  if (lastIndex < snippet.length) {
    parts.push({ text: snippet.slice(lastIndex), highlight: false });
  }

  if (parts.length === 0) return <span>{snippet}</span>;

  return (
    <span>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark
            key={i}
            className="rounded bg-yellow-500/20 px-0.5 text-yellow-200"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Transcriptions Page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 15;

export default function TranscriptionsPage() {
  const demoMode = useUIStore((s) => s.demoMode);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const searchRef = useRef<HTMLInputElement>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<TranscriptionStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minConfidence, setMinConfidence] = useState(0);
  const [agentFilter, setAgentFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Loading/demo state
  const [isLoading, setIsLoading] = useState(true);

  // Generate mock data in demo mode only
  const allTranscriptions = useMemo(
    () => demoMode ? generateMockTranscriptions(80) : [],
    [demoMode],
  );
  const enrichedRows = useMemo(() => enrichTranscriptions(allTranscriptions), [allTranscriptions]);

  // Simulate initial load
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Stats (mock in demo mode, zeros otherwise)
  const stats: TranscriptionStats = demoMode ? MOCK_STATS : {
    totalTranscriptions: 0,
    completed: 0,
    pending: 0,
    processing: 0,
    failed: 0,
    averageConfidence: 0,
    totalWordCount: 0,
    averageProcessingTime: 0,
  };

  // Search results
  const searchResults = useMemo(() => {
    if (!debouncedSearch.trim()) return [];
    return generateMockSearchResults(debouncedSearch, allTranscriptions);
  }, [debouncedSearch, allTranscriptions]);

  const isSearchActive = debouncedSearch.trim().length > 0;

  // Apply filters to enriched rows
  const filteredRows = useMemo(() => {
    let result = enrichedRows;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.transcription.status === statusFilter);
    }

    // Date range
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((r) => new Date(r.transcription.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000; // end of day
      result = result.filter((r) => new Date(r.transcription.createdAt).getTime() <= to);
    }

    // Min confidence
    if (minConfidence > 0) {
      result = result.filter(
        (r) => r.transcription.confidence !== null && r.transcription.confidence >= minConfidence,
      );
    }

    // Agent filter
    if (agentFilter.trim()) {
      const q = agentFilter.toLowerCase();
      result = result.filter((r) => r.agentName.toLowerCase().includes(q));
    }

    return result;
  }, [enrichedRows, statusFilter, dateFrom, dateTo, minConfidence, agentFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateFrom, dateTo, minConfidence, agentFilter]);

  // Row expand toggle
  const handleRowClick = useCallback(
    (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
    },
    [],
  );

  // Count untranscribed recordings (mock)
  const untranscribedCount = 23;

  // Bulk transcribe handler (stub)
  const handleBulkTranscribe = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('[Transcriptions] Bulk transcribe triggered (stub)');
  }, []);

  if (isLoading) {
    return <TranscriptionsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content-primary">
            Transcriptions
          </h1>
          <p className="text-sm text-content-secondary">
            {filteredRows.length} transcriptions
            <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
              Demo
            </span>
          </p>
        </div>
        {untranscribedCount > 0 && (
          <button
            onClick={handleBulkTranscribe}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Transcribe All Untranscribed
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
              {untranscribedCount}
            </span>
          </button>
        )}
      </div>

      {/* ── Stats Bar ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Transcriptions"
          value={stats.totalTranscriptions.toLocaleString()}
          subtext={`${stats.completed} completed / ${stats.pending} pending / ${stats.failed} failed`}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="Average Confidence"
          value={`${stats.averageConfidence.toFixed(1)}%`}
          subtext="Across all completed transcriptions"
          icon={<BarChart3 className="h-5 w-5" />}
          valueClassName={getConfidenceColor(stats.averageConfidence)}
        />
        <StatCard
          label="Total Words Processed"
          value={formatWordCount(stats.totalWordCount)}
          subtext={`${stats.totalWordCount.toLocaleString()} words`}
          icon={<Type className="h-5 w-5" />}
        />
        <StatCard
          label="Avg Processing Time"
          value={`${stats.averageProcessingTime.toFixed(1)}s`}
          subtext="Per transcription job"
          icon={<Timer className="h-5 w-5" />}
        />
      </div>

      {/* ── Search Bar ──────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-content-tertiary" />
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search across all transcript content..."
          className={cn(
            'w-full rounded-lg border border-border bg-surface-card py-3.5 pl-12 pr-4',
            'text-base text-content-primary placeholder:text-content-tertiary',
            'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
            'transition-colors',
          )}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 text-content-tertiary hover:text-content-primary transition-colors"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Search Results ──────────────────────────────── */}
      {isSearchActive && (
        <div className="rounded-lg border border-border bg-surface-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-heading-sm text-content-primary">
              Search Results
              <span className="ml-2 text-body-sm font-normal text-content-tertiary">
                {searchResults.length} match{searchResults.length !== 1 ? 'es' : ''}
              </span>
            </h3>
          </div>
          {searchResults.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Search className="mx-auto mb-2 h-6 w-6 text-content-tertiary" />
              <p className="text-sm text-content-secondary">
                No transcripts match &quot;{debouncedSearch}&quot;
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {searchResults.slice(0, 10).map((result) => (
                <div
                  key={result.transcriptionId}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-surface-elevated transition-colors cursor-pointer"
                  onClick={() => {
                    setSearchQuery('');
                    setExpandedId(result.transcriptionId);
                  }}
                >
                  <DirectionIcon direction={result.direction} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-content-primary">
                        {result.agentName ?? 'Unknown'}
                      </span>
                      <span className="text-content-tertiary">--</span>
                      <span className="font-mono text-content-secondary">
                        {result.callerNumber}
                      </span>
                      <span className="text-content-tertiary">--</span>
                      <span className="font-mono text-xs text-content-tertiary">
                        {formatDateTime(result.callDate)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-content-secondary leading-relaxed">
                      <HighlightedSnippet snippet={result.matchSnippet} query={debouncedSearch} />
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold font-mono',
                      getConfidenceBgColor(result.confidence),
                      getConfidenceColor(result.confidence),
                    )}
                  >
                    {result.confidence.toFixed(0)}%
                  </span>
                </div>
              ))}
              {searchResults.length > 10 && (
                <div className="px-4 py-2 text-center text-caption text-content-tertiary">
                  Showing 10 of {searchResults.length} results
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Filter Bar ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status pills */}
        <div className="flex rounded-lg border border-border bg-surface-card">
          {(['all', 'pending', 'processing', 'completed', 'failed'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setStatusFilter(opt)}
              className={cn(
                'px-3 py-2 text-xs font-medium capitalize transition-colors',
                'first:rounded-l-lg last:rounded-r-lg',
                statusFilter === opt
                  ? 'bg-accent-subtle text-accent'
                  : 'text-content-secondary hover:text-content-primary',
              )}
            >
              {opt === 'all' ? 'All' : opt}
              {opt !== 'all' && (
                <span className="ml-1 text-[10px] text-content-tertiary">
                  {opt === 'pending' && stats.pending}
                  {opt === 'processing' && stats.processing}
                  {opt === 'completed' && stats.completed}
                  {opt === 'failed' && stats.failed}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-border bg-surface-card px-3 py-2 text-xs text-content-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="From"
          />
          <span className="text-content-tertiary text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-border bg-surface-card px-3 py-2 text-xs text-content-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="To"
          />
        </div>

        {/* Min confidence */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-card px-3 py-1.5">
          <label className="text-xs text-content-secondary whitespace-nowrap">
            Min Confidence
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="h-1.5 w-20 cursor-pointer accent-indigo-500"
          />
          <span className="font-mono text-xs text-content-primary w-8 text-right">
            {minConfidence}%
          </span>
        </div>

        {/* Agent filter */}
        <div className="relative min-w-[160px]">
          <input
            type="text"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            placeholder="Filter by agent..."
            className="w-full rounded-lg border border-border bg-surface-card py-2 pl-3 pr-3 text-xs text-content-primary placeholder:text-content-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* ── Results Table ───────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-elevated">
              <th className="w-8 px-3 py-3" />
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-content-tertiary">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-content-tertiary">
                Agent
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-content-tertiary">
                Caller
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-content-tertiary">
                Direction
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-content-tertiary">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-content-tertiary">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-content-tertiary">
                Confidence
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-content-tertiary">
                Preview
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <FileText className="mx-auto mb-3 h-8 w-8 text-content-tertiary" />
                  <p className="text-sm font-medium text-content-secondary">
                    No transcriptions found
                  </p>
                  <p className="mt-1 text-xs text-content-tertiary">
                    Transcriptions will appear here as recordings are processed
                  </p>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const t = row.transcription;
                const isExpanded = expandedId === t.id;

                return (
                  <tr key={t.id} className="group">
                    <td colSpan={9} className="p-0">
                      {/* Summary row */}
                      <button
                        onClick={() => handleRowClick(t.id)}
                        className={cn(
                          'flex w-full items-center text-left transition-colors',
                          isExpanded
                            ? 'bg-surface-elevated'
                            : 'hover:bg-surface-elevated/50',
                        )}
                      >
                        <div className="w-8 px-3 py-3">
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 text-content-tertiary transition-transform',
                              isExpanded && 'rotate-90',
                            )}
                          />
                        </div>
                        <div className="flex-1 grid grid-cols-[1fr_1fr_1fr_80px_80px_100px_80px_2fr] items-center gap-0">
                          {/* Date */}
                          <div className="px-4 py-3">
                            <span className="font-mono text-sm text-content-primary">
                              {formatDateTime(t.createdAt)}
                            </span>
                          </div>
                          {/* Agent */}
                          <div className="px-4 py-3 text-sm text-content-primary truncate">
                            {row.agentName}
                          </div>
                          {/* Caller */}
                          <div className="px-4 py-3 font-mono text-sm text-content-secondary truncate">
                            {row.callerNumber}
                          </div>
                          {/* Direction */}
                          <div className="px-4 py-3">
                            <DirectionIcon direction={row.direction} />
                          </div>
                          {/* Duration */}
                          <div className="px-4 py-3 font-mono text-sm text-content-secondary">
                            {t.durationSeconds !== null ? formatDuration(t.durationSeconds) : '--'}
                          </div>
                          {/* Status */}
                          <div className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
                                getStatusBadgeClasses(t.status),
                              )}
                            >
                              {getStatusIcon(t.status)}
                              {t.status}
                            </span>
                          </div>
                          {/* Confidence */}
                          <div className="px-4 py-3">
                            {t.confidence !== null ? (
                              <span
                                className={cn(
                                  'font-mono text-sm font-medium',
                                  getConfidenceColor(t.confidence),
                                )}
                              >
                                {t.confidence.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="text-sm text-content-tertiary">--</span>
                            )}
                          </div>
                          {/* Preview */}
                          <div className="px-4 py-3">
                            {t.transcript ? (
                              <span className="text-sm text-content-secondary line-clamp-1">
                                {t.transcript.slice(0, 80)}
                                {t.transcript.length > 80 ? '...' : ''}
                              </span>
                            ) : t.status === 'failed' ? (
                              <span className="text-sm text-red-400 line-clamp-1">
                                {t.errorMessage ?? 'Transcription failed'}
                              </span>
                            ) : (
                              <span className="text-sm text-content-tertiary italic">
                                {t.status === 'processing' ? 'Processing...' : 'Awaiting transcription'}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-border bg-surface-base p-4 space-y-4">
                          {t.status === 'completed' && t.transcript ? (
                            <>
                              {/* Metadata bar */}
                              <div className="flex flex-wrap items-center gap-4 text-caption text-content-tertiary">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  Processing: {t.processingTimeSeconds?.toFixed(1) ?? '--'}s
                                </span>
                                <span className="flex items-center gap-1">
                                  <Type className="h-3.5 w-3.5" />
                                  {t.wordCount?.toLocaleString() ?? 0} words
                                </span>
                                <span className="flex items-center gap-1">
                                  <BarChart3 className="h-3.5 w-3.5" />
                                  Confidence: {t.confidence?.toFixed(1) ?? '--'}%
                                </span>
                                <span>Language: {t.language}</span>
                              </div>

                              {/* Full transcript with segments */}
                              {t.segments.length > 0 ? (
                                <div className="rounded-lg border border-border bg-surface-card p-4 space-y-2 max-h-[400px] overflow-y-auto">
                                  <h4 className="text-heading-sm text-content-primary mb-3">
                                    Full Transcript
                                  </h4>
                                  {t.segments.map((seg, idx) => (
                                    <div
                                      key={idx}
                                      className="flex gap-3 py-1.5 hover:bg-surface-elevated/50 rounded px-2 transition-colors"
                                    >
                                      <span className="shrink-0 font-mono text-xs text-content-tertiary w-12 text-right pt-0.5">
                                        {formatSegmentTime(seg.startMs)}
                                      </span>
                                      {seg.speaker && (
                                        <span
                                          className={cn(
                                            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                                            seg.speaker === 'Agent'
                                              ? 'bg-blue-500/10 text-blue-400'
                                              : 'bg-green-500/10 text-green-400',
                                          )}
                                        >
                                          {seg.speaker}
                                        </span>
                                      )}
                                      <span className="text-sm text-content-primary leading-relaxed">
                                        {seg.text}
                                      </span>
                                      <span className="shrink-0 font-mono text-[10px] text-content-tertiary pt-0.5">
                                        {(seg.confidence * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-lg border border-border bg-surface-card p-4">
                                  <h4 className="text-heading-sm text-content-primary mb-2">
                                    Full Transcript
                                  </h4>
                                  <p className="text-sm text-content-secondary leading-relaxed whitespace-pre-wrap">
                                    {t.transcript}
                                  </p>
                                </div>
                              )}
                            </>
                          ) : t.status === 'failed' ? (
                            <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-red-400">
                                  Transcription Failed
                                </p>
                                <p className="text-xs text-content-tertiary mt-1">
                                  {t.errorMessage ?? 'An unknown error occurred during transcription.'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-card p-4">
                              {t.status === 'processing' ? (
                                <Loader2 className="h-5 w-5 animate-spin text-blue-400 shrink-0" />
                              ) : (
                                <Clock className="h-5 w-5 text-zinc-400 shrink-0" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-content-primary">
                                  {t.status === 'processing'
                                    ? 'Transcription in progress...'
                                    : 'Awaiting transcription'}
                                </p>
                                <p className="text-xs text-content-tertiary mt-1">
                                  {t.status === 'processing'
                                    ? 'The audio is being processed by the Parakeet server.'
                                    : 'This recording is queued and will be transcribed automatically.'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────── */}
      {filteredRows.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-content-tertiary">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}--
            {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of{' '}
            {filteredRows.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={cn(
                'flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm transition-colors',
                currentPage === 1
                  ? 'text-content-tertiary cursor-not-allowed opacity-50'
                  : 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary',
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                // Show first, last, and pages near current
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - currentPage) <= 1) return true;
                return false;
              })
              .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                if (idx > 0) {
                  const prev = arr[idx - 1];
                  if (p - prev > 1) acc.push('ellipsis');
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-content-tertiary">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item)}
                    className={cn(
                      'h-8 w-8 rounded-md text-sm font-medium transition-colors',
                      currentPage === item
                        ? 'bg-accent text-white'
                        : 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary',
                    )}
                  >
                    {item}
                  </button>
                ),
              )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                'flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm transition-colors',
                currentPage === totalPages
                  ? 'text-content-tertiary cursor-not-allowed opacity-50'
                  : 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary',
              )}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Empty State (when zero transcriptions at all) ─ */}
      {allTranscriptions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-card py-20">
          <div className="mb-4 rounded-full bg-surface-elevated p-4">
            <FileText className="h-8 w-8 text-content-tertiary" />
          </div>
          <p className="text-body-md font-medium text-content-secondary">
            No transcriptions yet
          </p>
          <p className="mt-1 text-body-sm text-content-tertiary">
            Transcriptions will appear here as recordings are processed
          </p>
        </div>
      )}
    </div>
  );
}
