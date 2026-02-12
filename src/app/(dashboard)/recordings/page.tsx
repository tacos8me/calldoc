'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  Calendar,
  Play,
  Pause,
  Star,
  Share2,
  ChevronDown,
  ChevronRight,
  X,
  Mic,
  Clock,
  User,
  PhoneIncoming,
  PhoneOutgoing,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  WaveformPlayer,
  PlaybackControls,
  RecordingNotes,
  ScorecardPanel,
  MOCK_NOTES,
} from '@/components/recordings';
import type { WaveformAnnotation } from '@/components/recordings/waveform-player';
import { toast } from 'sonner';
import {
  useRecordings,
  useRecording,
  useRecordingNotes,
  useCreateRecordingNote,
  useSubmitScore,
  useCreateShareLink,
  type RecordingFilters,
} from '@/hooks/use-recordings';
import type { Recording, RecordingNote } from '@/types';
import type { RecordingNoteItem } from '@/components/recordings';

// ---------------------------------------------------------------------------
// Mock recording data (fallback for demo mode)
// ---------------------------------------------------------------------------

interface MockRecording {
  id: string;
  dateTime: string;
  agentName: string;
  agentId: string;
  callerNumber: string;
  calledNumber: string;
  direction: 'inbound' | 'outbound';
  duration: number; // seconds
  score: number | null;
  tags: string[];
  audioSrc: string;
}

const MOCK_RECORDINGS: MockRecording[] = [
  {
    id: 'rec_001',
    dateTime: '2026-02-10T09:15:23Z',
    agentName: 'Emily Rodriguez',
    agentId: 'agt_001',
    callerNumber: '+1 (555) 234-5678',
    calledNumber: '+1 (800) 555-0100',
    direction: 'inbound',
    duration: 187,
    score: 92,
    tags: ['sales', 'follow-up'],
    audioSrc: '',
  },
  {
    id: 'rec_002',
    dateTime: '2026-02-10T09:02:11Z',
    agentName: 'James Patel',
    agentId: 'agt_002',
    callerNumber: '+1 (555) 876-5432',
    calledNumber: '+1 (800) 555-0100',
    direction: 'inbound',
    duration: 342,
    score: 78,
    tags: ['support'],
    audioSrc: '',
  },
  {
    id: 'rec_003',
    dateTime: '2026-02-10T08:47:05Z',
    agentName: 'Emily Rodriguez',
    agentId: 'agt_001',
    callerNumber: '+1 (800) 555-0100',
    calledNumber: '+1 (555) 111-2222',
    direction: 'outbound',
    duration: 95,
    score: null,
    tags: [],
    audioSrc: '',
  },
  {
    id: 'rec_004',
    dateTime: '2026-02-09T16:38:19Z',
    agentName: 'Marcus Johnson',
    agentId: 'agt_003',
    callerNumber: '+1 (555) 333-4444',
    calledNumber: '+1 (800) 555-0100',
    direction: 'inbound',
    duration: 423,
    score: 65,
    tags: ['escalation', 'billing'],
    audioSrc: '',
  },
  {
    id: 'rec_005',
    dateTime: '2026-02-09T15:12:47Z',
    agentName: 'Olivia Brown',
    agentId: 'agt_004',
    callerNumber: '+1 (555) 777-8888',
    calledNumber: '+1 (800) 555-0100',
    direction: 'inbound',
    duration: 156,
    score: 88,
    tags: ['sales'],
    audioSrc: '',
  },
  {
    id: 'rec_006',
    dateTime: '2026-02-09T14:01:33Z',
    agentName: 'James Patel',
    agentId: 'agt_002',
    callerNumber: '+1 (800) 555-0100',
    calledNumber: '+1 (555) 999-0000',
    direction: 'outbound',
    duration: 278,
    score: null,
    tags: ['callback'],
    audioSrc: '',
  },
  {
    id: 'rec_007',
    dateTime: '2026-02-09T11:22:08Z',
    agentName: 'Emily Rodriguez',
    agentId: 'agt_001',
    callerNumber: '+1 (555) 444-5555',
    calledNumber: '+1 (800) 555-0100',
    direction: 'inbound',
    duration: 512,
    score: 95,
    tags: ['sales', 'closed-deal'],
    audioSrc: '',
  },
  {
    id: 'rec_008',
    dateTime: '2026-02-08T09:55:42Z',
    agentName: 'Marcus Johnson',
    agentId: 'agt_003',
    callerNumber: '+1 (555) 666-7777',
    calledNumber: '+1 (800) 555-0100',
    direction: 'inbound',
    duration: 67,
    score: null,
    tags: [],
    audioSrc: '',
  },
  {
    id: 'rec_009',
    dateTime: '2026-02-08T08:30:15Z',
    agentName: 'Olivia Brown',
    agentId: 'agt_004',
    callerNumber: '+1 (800) 555-0100',
    calledNumber: '+1 (555) 222-3333',
    direction: 'outbound',
    duration: 198,
    score: 71,
    tags: ['follow-up'],
    audioSrc: '',
  },
  {
    id: 'rec_010',
    dateTime: '2026-02-07T16:10:51Z',
    agentName: 'Emily Rodriguez',
    agentId: 'agt_001',
    callerNumber: '+1 (555) 888-9999',
    calledNumber: '+1 (800) 555-0100',
    direction: 'inbound',
    duration: 310,
    score: 84,
    tags: ['support', 'technical'],
    audioSrc: '',
  },
];

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
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getScoreBadge(score: number | null): { text: string; className: string } {
  if (score === null) return { text: 'Unscored', className: 'bg-zinc-500/10 text-zinc-500' };
  if (score >= 80) return { text: `${score}`, className: 'bg-green-500/10 text-green-400' };
  if (score >= 60) return { text: `${score}`, className: 'bg-amber-500/10 text-amber-400' };
  return { text: `${score}`, className: 'bg-red-500/10 text-red-400' };
}

/**
 * Adapt an API Recording to the MockRecording shape used by the UI.
 */
function apiRecordingToMock(r: Recording): MockRecording {
  return {
    id: r.id,
    dateTime: r.startTime,
    agentName: r.agentName ?? 'Unknown',
    agentId: r.agentId ?? '',
    callerNumber: r.callerNumber,
    calledNumber: r.calledNumber,
    direction: r.direction === 'internal' ? 'inbound' : r.direction,
    duration: r.duration,
    score: r.score,
    tags: r.tags,
    audioSrc: `/api/recordings/${r.id}/stream`,
  };
}

// ---------------------------------------------------------------------------
// MiniWaveform - decorative static waveform preview (100px)
// ---------------------------------------------------------------------------

function MiniWaveform({ seed }: { seed: string }) {
  // Deterministic pseudo-random bars based on seed
  const bars = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    return Array.from({ length: 30 }, (_, i) => {
      hash = ((hash << 5) - hash + i) | 0;
      return 15 + Math.abs(hash % 85);
    });
  }, [seed]);

  return (
    <div className="flex h-8 w-[100px] items-center gap-[1px]">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-[2px] rounded-sm bg-[var(--text-tertiary)] opacity-40"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecordingsPage
// ---------------------------------------------------------------------------

export default function RecordingsPage() {
  const [search, setSearch] = useState('');
  const [filterScored, setFilterScored] = useState<'all' | 'scored' | 'unscored'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showScorecard, setShowScorecard] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Build API filters from UI state
  const apiFilters: RecordingFilters = useMemo(
    () => ({
      search: search || undefined,
      scored: filterScored,
    }),
    [search, filterScored],
  );

  // Fetch recordings from API
  const {
    data: apiData,
    isLoading,
    isError,
  } = useRecordings(apiFilters);

  // Convert API data to display format, fallback to mock
  const apiRecordings = useMemo(() => {
    if (apiData?.data && apiData.data.length > 0) {
      return apiData.data.map(apiRecordingToMock);
    }
    return null;
  }, [apiData]);

  const useMock = !apiRecordings;
  const allRecordings = apiRecordings ?? MOCK_RECORDINGS;

  // Filtered recordings (client-side filtering for mock mode)
  const filtered = useMemo(() => {
    if (!useMock) return allRecordings; // API already filtered

    let result = MOCK_RECORDINGS;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.agentName.toLowerCase().includes(q) ||
          r.callerNumber.includes(q) ||
          r.calledNumber.includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Score filter
    if (filterScored === 'scored') {
      result = result.filter((r) => r.score !== null);
    } else if (filterScored === 'unscored') {
      result = result.filter((r) => r.score === null);
    }

    return result;
  }, [useMock, allRecordings, search, filterScored]);

  const expandedRecording = expandedId
    ? allRecordings.find((r) => r.id === expandedId) || null
    : null;

  // Fetch notes for expanded recording from API
  const { data: apiNotes } = useRecordingNotes(expandedId);
  const displayNotes: RecordingNoteItem[] = apiNotes
    ? apiNotes.map((n: RecordingNote) => ({
        id: n.id,
        timestampMs: n.timestampMs,
        author: n.userName,
        text: n.text,
        createdAt: n.createdAt,
      }))
    : MOCK_NOTES;

  // Create note mutation
  const createNoteMutation = useCreateRecordingNote(expandedId ?? '');

  // Score mutation
  const submitScoreMutation = useSubmitScore(expandedId ?? '');

  // Share link mutation
  const createShareMutation = useCreateShareLink(expandedId ?? '');

  // Mock annotations for the expanded recording
  const annotations: WaveformAnnotation[] = useMemo(
    () =>
      displayNotes.map((n) => ({
        id: n.id,
        timestampMs: n.timestampMs,
        text: n.text,
        author: n.author,
      })),
    [displayNotes]
  );

  const handleRowClick = useCallback(
    (id: string) => {
      if (expandedId === id) {
        setExpandedId(null);
        setShowScorecard(false);
        setPlaying(false);
      } else {
        setExpandedId(id);
        setShowScorecard(false);
        setPlaying(false);
        setCurrentTime(0);
      }
    },
    [expandedId]
  );

  const handleAddNote = useCallback(
    (note: { text: string; timestampMs: number }) => {
      createNoteMutation.mutate(note, {
        onSuccess: () => {
          toast.success('Note added');
        },
        onError: () => {
          // eslint-disable-next-line no-console
          console.log('Add note (demo mode):', note);
        },
      });
    },
    [createNoteMutation],
  );

  const handleSubmitScore = useCallback(
    (data: Record<string, unknown>) => {
      submitScoreMutation.mutate(data as Parameters<typeof submitScoreMutation.mutate>[0], {
        onSuccess: () => {
          toast.success('Score submitted');
        },
        onError: () => {
          // eslint-disable-next-line no-console
          console.log('Score submitted (demo mode):', data);
          toast.info('Score saved locally (API unavailable)');
        },
      });
    },
    [submitScoreMutation],
  );

  const handleShare = useCallback(() => {
    if (!expandedId) return;
    createShareMutation.mutate(
      { expiresInHours: 24 },
      {
        onSuccess: (link) => {
          toast.success('Share link created', {
            description: `Expires in 24 hours`,
          });
        },
        onError: () => {
          toast.info('Sharing is not available in demo mode');
        },
      },
    );
  }, [expandedId, createShareMutation]);

  const scoredCount = allRecordings.filter((r) => r.score !== null).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Recordings
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {filtered.length} recordings &middot;{' '}
            {scoredCount} scored
            {isLoading && (
              <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" />
            )}
            {useMock && !isLoading && (
              <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                Demo
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by agent, caller ID, tag..."
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </div>

        {/* Score filter */}
        <div className="flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
          {(['all', 'scored', 'unscored'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilterScored(opt)}
              className={cn(
                'px-3 py-2 text-xs font-medium capitalize transition-colors',
                filterScored === opt
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
              <th className="w-8 px-3 py-3" />
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Date / Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Agent
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Caller
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Called
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Waveform
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Tags
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {isLoading && filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    Loading recordings...
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((rec) => {
                const isExpanded = expandedId === rec.id;
                const scoreBadge = getScoreBadge(rec.score);

                return (
                  <tr key={rec.id} className="group">
                    <td colSpan={9} className="p-0">
                      {/* Summary row */}
                      <button
                        onClick={() => handleRowClick(rec.id)}
                        className={cn(
                          'flex w-full items-center text-left transition-colors',
                          isExpanded
                            ? 'bg-[var(--bg-elevated)]'
                            : 'hover:bg-[var(--bg-elevated)]'
                        )}
                      >
                        <div className="w-8 px-3 py-3">
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 text-[var(--text-tertiary)] transition-transform',
                              isExpanded && 'rotate-90'
                            )}
                          />
                        </div>
                        <div className="flex-1 grid grid-cols-[1fr_1fr_1fr_1fr_80px_100px_60px_1fr] items-center gap-0">
                          <div className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {rec.direction === 'inbound' ? (
                                <PhoneIncoming className="h-3.5 w-3.5 text-green-400" />
                              ) : (
                                <PhoneOutgoing className="h-3.5 w-3.5 text-blue-400" />
                              )}
                              <span className="text-sm text-[var(--text-primary)]">
                                {formatDateTime(rec.dateTime)}
                              </span>
                            </div>
                          </div>
                          <div className="px-4 py-3 text-sm text-[var(--text-primary)]">
                            {rec.agentName}
                          </div>
                          <div className="px-4 py-3 font-mono text-sm text-[var(--text-secondary)]">
                            {rec.callerNumber}
                          </div>
                          <div className="px-4 py-3 font-mono text-sm text-[var(--text-secondary)]">
                            {rec.calledNumber}
                          </div>
                          <div className="px-4 py-3 font-mono text-sm text-[var(--text-secondary)]">
                            {formatDuration(rec.duration)}
                          </div>
                          <div className="px-4 py-3">
                            <MiniWaveform seed={rec.id} />
                          </div>
                          <div className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                                scoreBadge.className
                              )}
                            >
                              {scoreBadge.text}
                            </span>
                          </div>
                          <div className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {rec.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs text-[var(--text-tertiary)]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded player */}
                      {isExpanded && expandedRecording && (
                        <div className="border-t border-[var(--border-default)] bg-[var(--bg-base)]">
                          <div className={cn('flex', showScorecard && 'divide-x divide-[var(--border-default)]')}>
                            {/* Left: Player + Notes */}
                            <div className={cn('flex-1', showScorecard && 'max-w-[60%]')}>
                              {/* Waveform */}
                              <div className="p-4">
                                <WaveformPlayer
                                  src={expandedRecording.audioSrc || `/api/recordings/${expandedRecording.id}/stream`}
                                  annotations={annotations}
                                  isPlaying={playing}
                                  playbackRate={playbackRate}
                                  onTimeUpdate={setCurrentTime}
                                  height={120}
                                />
                              </div>

                              {/* Controls */}
                              <PlaybackControls
                                isPlaying={playing}
                                currentTime={currentTime}
                                duration={expandedRecording.duration}
                                playbackRate={playbackRate}
                                onPlayPause={() => setPlaying(!playing)}
                                onSkipBack={(s) =>
                                  setCurrentTime(Math.max(0, currentTime - s))
                                }
                                onSkipForward={(s) =>
                                  setCurrentTime(
                                    Math.min(expandedRecording.duration, currentTime + s)
                                  )
                                }
                                onPlaybackRateChange={setPlaybackRate}
                                className="mx-4 mb-2"
                              />

                              {/* Action buttons */}
                              <div className="flex items-center gap-2 border-t border-[var(--border-default)] px-4 py-3">
                                <button
                                  onClick={() => setShowScorecard(!showScorecard)}
                                  className={cn(
                                    'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                                    showScorecard
                                      ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] text-[var(--accent-primary)]'
                                      : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                                  )}
                                >
                                  <Star className="h-3.5 w-3.5" />
                                  Score
                                </button>
                                <button
                                  onClick={handleShare}
                                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                                >
                                  <Share2 className="h-3.5 w-3.5" />
                                  Share
                                </button>
                              </div>

                              {/* Notes */}
                              <div className="border-t border-[var(--border-default)]">
                                <RecordingNotes
                                  notes={displayNotes}
                                  currentTimeMs={currentTime * 1000}
                                  onSeek={(ms) => setCurrentTime(ms / 1000)}
                                  onAddNote={handleAddNote}
                                  className="max-h-[300px]"
                                />
                              </div>
                            </div>

                            {/* Right: Scorecard */}
                            {showScorecard && (
                              <div className="w-[40%] min-w-[340px]">
                                <ScorecardPanel
                                  recordingId={expandedRecording.id}
                                  onSubmit={handleSubmitScore}
                                  className="h-full rounded-none border-0"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}

            {filtered.length === 0 && !isLoading && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <Mic className="mx-auto mb-3 h-8 w-8 text-[var(--text-tertiary)]" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    No recordings found
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Adjust your search criteria
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
