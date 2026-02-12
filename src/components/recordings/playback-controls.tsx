'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlaybackControlsProps {
  /** Whether playback is currently active */
  isPlaying: boolean;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Current playback speed multiplier */
  playbackRate: number;
  /** Callback: toggle play/pause */
  onPlayPause: () => void;
  /** Callback: skip backwards N seconds */
  onSkipBack: (seconds: number) => void;
  /** Callback: skip forwards N seconds */
  onSkipForward: (seconds: number) => void;
  /** Callback: change playback speed */
  onPlaybackRateChange: (rate: number) => void;
  /** Callback: change volume (0-1) */
  onVolumeChange?: (volume: number) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Speed options
// ---------------------------------------------------------------------------

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// PlaybackControls
// ---------------------------------------------------------------------------

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onPlaybackRateChange,
  onVolumeChange,
  className,
}: PlaybackControlsProps) {
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);

  const handleVolumeChange = useCallback(
    (newVol: number) => {
      setVolume(newVol);
      setMuted(newVol === 0);
      onVolumeChange?.(newVol);
    },
    [onVolumeChange]
  );

  const toggleMute = useCallback(() => {
    const newMuted = !muted;
    setMuted(newMuted);
    onVolumeChange?.(newMuted ? 0 : volume);
  }, [muted, volume, onVolumeChange]);

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg bg-[var(--bg-surface)] px-4 py-3',
        className
      )}
    >
      {/* ─── Transport ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Skip back 5s */}
        <button
          onClick={() => onSkipBack(5)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          title="Skip back 5 seconds"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200',
            isPlaying
              ? 'bg-[var(--accent-primary)] text-white shadow-[0_0_16px_var(--accent-ring)]'
              : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white'
          )}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" />
          )}
        </button>

        {/* Skip forward 5s */}
        <button
          onClick={() => onSkipForward(5)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          title="Skip forward 5 seconds"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* ─── Time display ───────────────────────────────────────────── */}
      <div className="flex items-baseline gap-1 font-mono text-sm tabular-nums">
        <span className="text-[var(--text-primary)]">{formatTime(currentTime)}</span>
        <span className="text-[var(--text-tertiary)]">/</span>
        <span className="text-[var(--text-secondary)]">{formatTime(duration)}</span>
      </div>

      {/* ─── Spacer ─────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ─── Speed selector ─────────────────────────────────────────── */}
      <div className="relative">
        <button
          onClick={() => setSpeedOpen(!speedOpen)}
          className={cn(
            'flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors',
            'border-[var(--border-default)] text-[var(--text-secondary)]',
            'hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
          )}
        >
          {playbackRate}x
        </button>

        {speedOpen && (
          <div className="absolute bottom-full right-0 z-20 mb-1 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg">
            {SPEED_OPTIONS.map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  onPlaybackRateChange(rate);
                  setSpeedOpen(false);
                }}
                className={cn(
                  'block w-full px-4 py-1.5 text-left text-xs tabular-nums transition-colors',
                  rate === playbackRate
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                )}
              >
                {rate}x
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Volume ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          {muted || volume === 0 ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-[var(--bg-overlay)] accent-[var(--accent-primary)]"
        />
      </div>
    </div>
  );
}

export default PlaybackControls;
