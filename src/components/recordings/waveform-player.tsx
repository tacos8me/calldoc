'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WaveformAnnotation {
  id: string;
  timestampMs: number;
  text: string;
  author: string;
}

export interface WaveformPlayerProps {
  /** Audio source URL */
  src: string;
  /** Pre-computed waveform peaks (0-1 float array) */
  peaks?: number[];
  /** Timestamped annotations to display as markers */
  annotations?: WaveformAnnotation[];
  /** Callback fired on playback time update (seconds) */
  onTimeUpdate?: (currentTime: number) => void;
  /** Callback when user seeks to a time */
  onSeek?: (time: number) => void;
  /** External play state control */
  isPlaying?: boolean;
  /** External playback speed */
  playbackRate?: number;
  /** Height of the waveform in px */
  height?: number;
  /** Class for wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// WaveformPlayer
// ---------------------------------------------------------------------------

export function WaveformPlayer({
  src,
  peaks,
  annotations = [],
  onTimeUpdate,
  onSeek,
  isPlaying: externalPlaying,
  playbackRate = 1,
  height = 120,
  className,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // ─── Initialize wavesurfer.js ───────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    let ws: any = null;
    let destroyed = false;

    const initWavesurfer = async () => {
      try {
        const WaveSurfer = (await import('wavesurfer.js')).default;

        if (destroyed) return;

        ws = WaveSurfer.create({
          container: containerRef.current!,
          height: height,
          barWidth: 2,
          barGap: 1,
          barRadius: 1,
          cursorWidth: 2,
          cursorColor: '#6366F1',
          progressColor: '#6366F1',
          waveColor: '#52525B',
          backend: 'WebAudio',
          normalize: true,
          fillParent: true,
          minPxPerSec: 1,
          autoplay: false,
          hideScrollbar: true,
          peaks: peaks ? [peaks] : undefined,
        });

        wavesurferRef.current = ws;

        ws.on('ready', () => {
          if (destroyed) return;
          setLoading(false);
          setReady(true);
          setDuration(ws.getDuration());
        });

        ws.on('audioprocess', () => {
          if (destroyed) return;
          const t = ws.getCurrentTime();
          setCurrentTime(t);
          onTimeUpdate?.(t);
        });

        ws.on('seeking', () => {
          if (destroyed) return;
          const t = ws.getCurrentTime();
          setCurrentTime(t);
          onSeek?.(t);
        });

        ws.on('play', () => {
          if (!destroyed) setPlaying(true);
        });

        ws.on('pause', () => {
          if (!destroyed) setPlaying(false);
        });

        ws.on('finish', () => {
          if (!destroyed) setPlaying(false);
        });

        ws.load(src);
      } catch (err) {
        console.error('WaveSurfer init error:', err);
        setLoading(false);
      }
    };

    initWavesurfer();

    return () => {
      destroyed = true;
      if (ws) {
        try {
          ws.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
      wavesurferRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // ─── Sync external play state ──────────────────────────────────────
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !ready) return;

    if (externalPlaying !== undefined) {
      if (externalPlaying && !ws.isPlaying()) {
        ws.play();
      } else if (!externalPlaying && ws.isPlaying()) {
        ws.pause();
      }
    }
  }, [externalPlaying, ready]);

  // ─── Sync playback rate ────────────────────────────────────────────
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (ws && ready) {
      ws.setPlaybackRate(playbackRate);
    }
  }, [playbackRate, ready]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const ws = wavesurferRef.current;
      if (!ws || !ready) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          ws.playPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          ws.skip(e.shiftKey ? -30 : -5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          ws.skip(e.shiftKey ? 30 : 5);
          break;
      }
    },
    [ready]
  );

  // ─── Public API ────────────────────────────────────────────────────
  const play = useCallback(() => wavesurferRef.current?.play(), []);
  const pause = useCallback(() => wavesurferRef.current?.pause(), []);
  const togglePlay = useCallback(() => wavesurferRef.current?.playPause(), []);
  const seekTo = useCallback((seconds: number) => {
    const ws = wavesurferRef.current;
    if (ws) {
      const pct = seconds / ws.getDuration();
      ws.seekTo(Math.max(0, Math.min(1, pct)));
    }
  }, []);

  // Expose to parent via ref data attributes
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (wrapperRef.current) {
      (wrapperRef.current as any).__wavesurfer = {
        play,
        pause,
        togglePlay,
        seekTo,
        isPlaying: () => playing,
        getCurrentTime: () => currentTime,
        getDuration: () => duration,
      };
    }
  }, [play, pause, togglePlay, seekTo, playing, currentTime, duration]);

  // ─── Compute annotation positions ─────────────────────────────────
  const annotationPositions = duration > 0
    ? annotations.map((a) => ({
        ...a,
        leftPct: (a.timestampMs / 1000 / duration) * 100,
      }))
    : [];

  return (
    <div
      ref={wrapperRef}
      className={cn('relative select-none', className)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Loading shimmer */}
      {loading && (
        <div
          className="skeleton"
          style={{ height: `${height}px`, width: '100%' }}
        >
          {/* Fake waveform shape */}
          <div className="flex h-full items-center justify-center">
            <div className="flex items-end gap-[1px]" style={{ height: height * 0.7 }}>
              {Array.from({ length: 80 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[2px] rounded-sm bg-[var(--bg-overlay)]"
                  style={{
                    height: `${20 + Math.random() * 80}%`,
                    opacity: 0.3 + Math.random() * 0.4,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Waveform container */}
      <div
        ref={containerRef}
        className={cn(
          'w-full rounded-lg',
          loading && 'hidden'
        )}
        style={{ height: `${height}px` }}
      />

      {/* Annotation markers */}
      {ready && annotationPositions.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0" style={{ height: `${height}px` }}>
          {annotationPositions.map((ann) => (
            <button
              key={ann.id}
              className="group absolute bottom-0 -translate-x-1/2"
              style={{ left: `${ann.leftPct}%` }}
              onClick={() => seekTo(ann.timestampMs / 1000)}
              title={`${ann.author}: ${ann.text}`}
            >
              {/* Triangle marker */}
              <div className="flex flex-col items-center">
                <div className="mb-0.5 hidden whitespace-nowrap rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-medium text-black group-hover:block">
                  {ann.text.length > 30 ? ann.text.slice(0, 30) + '...' : ann.text}
                </div>
                <div
                  className="h-0 w-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent border-b-amber-400"
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default WaveformPlayer;
