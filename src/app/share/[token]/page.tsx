'use client';

// ---------------------------------------------------------------------------
// /share/[token] - Public recording share page (outside dashboard layout)
// ---------------------------------------------------------------------------
// Clean, minimal player UI with CallDoc branding for external users.
// Includes waveform visualization, play controls, and recording metadata.

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShareData {
  recording: {
    id: string;
    callerNumber: string | null;
    calledNumber: string | null;
    agentName: string | null;
    direction: string | null;
    duration: number;
    startTime: string | null;
    endTime: string | null;
    format: string;
  };
  share: {
    expiresAt: string;
    snippetStartMs: number | null;
    snippetEndMs: number | null;
  };
  audioUrl: string;
}

interface ShareError {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// SharePage Component
// ---------------------------------------------------------------------------

export default function SharePage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<ShareError | null>(null);
  const [loading, setLoading] = useState(true);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // ─── Fetch share data ──────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/recordings/share/${params.token}`);
        const json = await response.json();

        if (!response.ok) {
          setError(json.error ?? { code: 'UNKNOWN', message: 'Something went wrong' });
          return;
        }

        setData(json.data);
      } catch {
        setError({ code: 'NETWORK', message: 'Failed to load recording. Please try again.' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.token]);

  // ─── Audio element setup ───────────────────────────────────────────
  useEffect(() => {
    if (!data) return;

    const audio = new Audio(data.audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('ended', () => {
      setPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = '';
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [data]);

  // ─── Animation loop for time update ────────────────────────────────
  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current && playing) {
        setCurrentTime(audioRef.current.currentTime);
        animFrameRef.current = requestAnimationFrame(updateTime);
      }
    };

    if (playing) {
      animFrameRef.current = requestAnimationFrame(updateTime);
    }

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [playing]);

  // ─── Volume and rate sync ──────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // ─── Controls ──────────────────────────────────────────────────────
  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      await audioRef.current.play();
      setPlaying(true);
    }
  }, [playing]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const newTime = pct * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const cycleSpeed = useCallback(() => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIdx = speeds.indexOf(playbackRate);
    const nextIdx = (currentIdx + 1) % speeds.length;
    setPlaybackRate(speeds[nextIdx]);
  }, [playbackRate]);

  // ─── Time formatting ──────────────────────────────────────────────
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  // ─── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p>Loading shared recording...</p>
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">CallDoc</h1>
            <p className="mt-1 text-sm text-zinc-500">Call Center Reporting</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8">
            {error.code === 'EXPIRED' ? (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                  <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">Link Expired</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  This share link has expired. Please contact the person who shared this recording
                  to request a new link.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                  <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">Unable to Access Recording</h2>
                <p className="mt-2 text-sm text-zinc-400">{error.message}</p>
              </>
            )}
          </div>

          <p className="mt-6 text-xs text-zinc-600">Powered by CallDoc</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ─── Player UI ────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-300">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold text-white">CallDoc</h1>
          <p className="text-xs text-zinc-500">Shared Recording</p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {/* Recording metadata */}
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
              {data.recording.startTime && (
                <div>
                  <span className="text-zinc-500">Date</span>
                  <p className="mt-0.5 font-medium text-zinc-200">
                    {formatDate(data.recording.startTime)}
                  </p>
                </div>
              )}
              <div>
                <span className="text-zinc-500">Duration</span>
                <p className="mt-0.5 font-medium text-zinc-200">
                  {formatTime(data.recording.duration)}
                </p>
              </div>
              {data.recording.callerNumber && (
                <div>
                  <span className="text-zinc-500">Caller</span>
                  <p className="mt-0.5 font-medium text-zinc-200">
                    {data.recording.callerNumber}
                  </p>
                </div>
              )}
              {data.recording.calledNumber && (
                <div>
                  <span className="text-zinc-500">Called</span>
                  <p className="mt-0.5 font-medium text-zinc-200">
                    {data.recording.calledNumber}
                  </p>
                </div>
              )}
              {data.recording.agentName && (
                <div>
                  <span className="text-zinc-500">Agent</span>
                  <p className="mt-0.5 font-medium text-zinc-200">
                    {data.recording.agentName}
                  </p>
                </div>
              )}
              {data.recording.direction && (
                <div>
                  <span className="text-zinc-500">Direction</span>
                  <p className="mt-0.5 font-medium capitalize text-zinc-200">
                    {data.recording.direction}
                  </p>
                </div>
              )}
            </div>

            {/* Progress bar / waveform placeholder */}
            <div
              ref={progressRef}
              className="group relative mb-3 h-16 cursor-pointer overflow-hidden rounded-lg bg-zinc-800"
              onClick={seek}
            >
              {/* Simple waveform visualization */}
              <div className="absolute inset-0 flex items-center justify-center gap-[1px]">
                {Array.from({ length: 100 }).map((_, i) => {
                  const h = 15 + Math.sin(i * 0.3) * 25 + Math.cos(i * 0.7) * 15 + Math.random() * 10;
                  const isPlayed = (i / 100) * 100 <= progressPct;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'w-[2px] rounded-sm transition-colors',
                        isPlayed ? 'bg-indigo-500' : 'bg-zinc-600'
                      )}
                      style={{ height: `${Math.min(90, h)}%` }}
                    />
                  );
                })}
              </div>

              {/* Playhead */}
              <div
                className="absolute top-0 h-full w-0.5 bg-indigo-400 transition-[left] duration-75"
                style={{ left: `${progressPct}%` }}
              />
            </div>

            {/* Time display */}
            <div className="mb-4 flex justify-between text-xs text-zinc-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || data.recording.duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-500"
              >
                {playing ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Speed */}
              <button
                onClick={cycleSpeed}
                className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
              >
                {playbackRate}x
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                </svg>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Expiration notice */}
          <p className="text-center text-xs text-zinc-600">
            This link expires on {formatDate(data.share.expiresAt)}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4 text-center text-xs text-zinc-600">
        Powered by CallDoc &mdash; Call Center Reporting for Avaya IP Office
      </footer>
    </div>
  );
}
