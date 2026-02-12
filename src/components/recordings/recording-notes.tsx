'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Plus, MessageSquare, Clock, X, Send } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecordingNoteItem {
  id: string;
  timestampMs: number;
  author: string;
  text: string;
  createdAt: string;
}

export interface RecordingNotesProps {
  /** Existing notes */
  notes: RecordingNoteItem[];
  /** Current playback time in ms */
  currentTimeMs: number;
  /** Callback when user clicks a note to seek */
  onSeek: (timestampMs: number) => void;
  /** Callback when user submits a new note */
  onAddNote?: (note: { timestampMs: number; text: string }) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

export const MOCK_NOTES: RecordingNoteItem[] = [
  {
    id: 'note_001',
    timestampMs: 12000,
    author: 'Sarah Chen',
    text: 'Greeting follows standard script. Tone is warm.',
    createdAt: '2026-02-09T14:22:00Z',
  },
  {
    id: 'note_002',
    timestampMs: 45000,
    author: 'Sarah Chen',
    text: 'Customer asks about billing. Agent handles well.',
    createdAt: '2026-02-09T14:23:00Z',
  },
  {
    id: 'note_003',
    timestampMs: 98000,
    author: 'Marcus Johnson',
    text: 'Agent forgot to mention the promotion. Follow up needed.',
    createdAt: '2026-02-09T15:10:00Z',
  },
  {
    id: 'note_004',
    timestampMs: 142000,
    author: 'Sarah Chen',
    text: 'Closing script correct. Good call overall.',
    createdAt: '2026-02-09T14:25:00Z',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// RecordingNotes
// ---------------------------------------------------------------------------

export function RecordingNotes({
  notes,
  currentTimeMs,
  onSeek,
  onAddNote,
  className,
}: RecordingNotesProps) {
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const sortedNotes = [...notes].sort((a, b) => a.timestampMs - b.timestampMs);

  const handleSubmitNote = useCallback(() => {
    if (!noteText.trim()) return;
    onAddNote?.({ timestampMs: currentTimeMs, text: noteText.trim() });
    setNoteText('');
    setAddingNote(false);
  }, [noteText, currentTimeMs, onAddNote]);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[var(--text-tertiary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Notes
          </h3>
          <span className="rounded-full bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs text-[var(--text-tertiary)]">
            {notes.length}
          </span>
        </div>
        <button
          onClick={() => setAddingNote(!addingNote)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-subtle)]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Note
        </button>
      </div>

      {/* Add note form */}
      {addingNote && (
        <div className="border-b border-[var(--border-default)] bg-[var(--bg-elevated)] p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Clock className="h-3 w-3" />
            <span>at {formatTimestamp(currentTimeMs)}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitNote()}
              placeholder="Type your note..."
              autoFocus
              className="flex-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            />
            <button
              onClick={handleSubmitNote}
              disabled={!noteText.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent-primary)] text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setAddingNote(false);
                setNoteText('');
              }}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto">
        {sortedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="mb-2 h-6 w-6 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">No notes yet</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Click "Add Note" to annotate this recording
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {sortedNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => onSeek(note.timestampMs)}
                className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-elevated)]"
              >
                {/* Timestamp badge */}
                <span className="mt-0.5 flex shrink-0 items-center gap-1 rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-xs text-[var(--accent-primary)] group-hover:bg-[var(--accent-subtle)]">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(note.timestampMs)}
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                    {note.text}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    {note.author} &middot; {formatDate(note.createdAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecordingNotes;
