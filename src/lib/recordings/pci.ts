// ---------------------------------------------------------------------------
// PCI Pause/Resume - PCI DSS compliance for recording pause
// ---------------------------------------------------------------------------
// Provides API-triggered pause/resume for call recordings during payment
// processing. Maintains a complete audit trail in recording_pause_events.
// Supports auto-resume timeout to prevent recordings being left paused.

import { eq, and, desc, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { recordingPauseEvents, recordings } from '@/lib/db/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PauseResult {
  success: boolean;
  eventId: string | null;
  message: string;
}

export interface RecordingSegment {
  /** Segment start in milliseconds from recording beginning */
  startMs: number;
  /** Segment end in milliseconds from recording beginning */
  endMs: number;
  /** Whether this segment is active (not paused) */
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default auto-resume timeout in milliseconds (3 minutes) */
const DEFAULT_AUTO_RESUME_MS = parseInt(
  process.env.PCI_AUTO_RESUME_MS || '180000',
  10
);

// ---------------------------------------------------------------------------
// Auto-resume timers
// ---------------------------------------------------------------------------

/** Map of recording ID -> auto-resume timer */
const autoResumeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

// ---------------------------------------------------------------------------
// pauseRecording
// ---------------------------------------------------------------------------

/**
 * Pause an active recording for PCI compliance.
 * Inserts a 'pause' event into the audit trail. If auto-resume is configured,
 * sets a timer to automatically resume after the timeout period.
 *
 * @param recordingId - The recording to pause
 * @param userId - The user initiating the pause
 * @param reason - Optional reason for the pause (e.g., "Payment processing")
 * @returns Pause result with success status and event ID
 */
export async function pauseRecording(
  recordingId: string,
  userId: string,
  reason?: string
): Promise<PauseResult> {
  // Verify the recording exists and is not deleted
  const [recording] = await db
    .select()
    .from(recordings)
    .where(and(eq(recordings.id, recordingId), eq(recordings.isDeleted, false)))
    .limit(1);

  if (!recording) {
    return {
      success: false,
      eventId: null,
      message: 'Recording not found or has been deleted',
    };
  }

  // Check if recording is already paused (last event is 'pause' with no subsequent 'resume')
  const [lastEvent] = await db
    .select()
    .from(recordingPauseEvents)
    .where(eq(recordingPauseEvents.recordingId, recordingId))
    .orderBy(desc(recordingPauseEvents.createdAt))
    .limit(1);

  if (lastEvent && lastEvent.eventType === 'pause') {
    return {
      success: false,
      eventId: null,
      message: 'Recording is already paused',
    };
  }

  // Calculate current timestamp in the recording timeline.
  // If the recording has a start time, compute milliseconds since start.
  // Otherwise use 0 as a fallback.
  let timestampMs = 0;
  if (recording.startTime) {
    timestampMs = Date.now() - new Date(recording.startTime).getTime();
  }

  // Insert pause event
  const [pauseEvent] = await db
    .insert(recordingPauseEvents)
    .values({
      recordingId,
      userId,
      eventType: 'pause',
      timestampMs,
      reason: reason || 'PCI pause',
    })
    .returning();

  log(`Paused recording ${recordingId} by user ${userId} at ${timestampMs}ms`);

  // Set auto-resume timer
  if (DEFAULT_AUTO_RESUME_MS > 0) {
    // Clear existing timer if any
    const existingTimer = autoResumeTimers.get(recordingId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      try {
        await autoResume(recordingId);
      } catch (err) {
        log(`Auto-resume failed for ${recordingId}: ${err instanceof Error ? err.message : err}`);
      }
    }, DEFAULT_AUTO_RESUME_MS);

    autoResumeTimers.set(recordingId, timer);
    log(`Auto-resume timer set for ${recordingId} (${DEFAULT_AUTO_RESUME_MS}ms)`);
  }

  return {
    success: true,
    eventId: pauseEvent.id,
    message: 'Recording paused',
  };
}

// ---------------------------------------------------------------------------
// resumeRecording
// ---------------------------------------------------------------------------

/**
 * Resume a paused recording.
 * Inserts a 'resume' event into the audit trail and cancels any pending
 * auto-resume timer.
 *
 * @param recordingId - The recording to resume
 * @param userId - The user initiating the resume
 * @returns Pause result with success status and event ID
 */
export async function resumeRecording(
  recordingId: string,
  userId: string
): Promise<PauseResult> {
  // Verify the recording exists
  const [recording] = await db
    .select()
    .from(recordings)
    .where(and(eq(recordings.id, recordingId), eq(recordings.isDeleted, false)))
    .limit(1);

  if (!recording) {
    return {
      success: false,
      eventId: null,
      message: 'Recording not found or has been deleted',
    };
  }

  // Check if recording is actually paused
  const [lastEvent] = await db
    .select()
    .from(recordingPauseEvents)
    .where(eq(recordingPauseEvents.recordingId, recordingId))
    .orderBy(desc(recordingPauseEvents.createdAt))
    .limit(1);

  if (!lastEvent || lastEvent.eventType !== 'pause') {
    return {
      success: false,
      eventId: null,
      message: 'Recording is not currently paused',
    };
  }

  // Calculate current timestamp in the recording timeline
  let timestampMs = 0;
  if (recording.startTime) {
    timestampMs = Date.now() - new Date(recording.startTime).getTime();
  }

  // Insert resume event
  const [resumeEvent] = await db
    .insert(recordingPauseEvents)
    .values({
      recordingId,
      userId,
      eventType: 'resume',
      timestampMs,
      reason: 'Manual resume',
    })
    .returning();

  // Cancel auto-resume timer
  cancelAutoResumeTimer(recordingId);

  // Update the recording's PCI paused segments JSON
  await updatePausedSegments(recordingId);

  log(`Resumed recording ${recordingId} by user ${userId} at ${timestampMs}ms`);

  return {
    success: true,
    eventId: resumeEvent.id,
    message: 'Recording resumed',
  };
}

// ---------------------------------------------------------------------------
// autoResumeCheck - Periodic check for stale pauses
// ---------------------------------------------------------------------------

/**
 * Check for recordings that have been paused longer than the auto-resume timeout.
 * This is a safety net in case the in-process timer was lost (e.g., server restart).
 * Should be called periodically (e.g., every 60 seconds).
 */
export async function autoResumeCheck(): Promise<number> {
  const cutoffMs = DEFAULT_AUTO_RESUME_MS;
  const cutoffTime = new Date(Date.now() - cutoffMs);

  // Find all pause events that are older than the cutoff and have no subsequent resume
  const pauseEvents = await db
    .select()
    .from(recordingPauseEvents)
    .where(eq(recordingPauseEvents.eventType, 'pause'))
    .orderBy(desc(recordingPauseEvents.createdAt));

  let resumedCount = 0;

  for (const pauseEvent of pauseEvents) {
    // Check if this pause has been resolved
    const [subsequentEvent] = await db
      .select()
      .from(recordingPauseEvents)
      .where(
        and(
          eq(recordingPauseEvents.recordingId, pauseEvent.recordingId),
          eq(recordingPauseEvents.eventType, 'resume')
        )
      )
      .orderBy(desc(recordingPauseEvents.createdAt))
      .limit(1);

    // If the latest resume is before this pause, the recording is still paused
    const isStillPaused =
      !subsequentEvent || subsequentEvent.createdAt < pauseEvent.createdAt;

    if (isStillPaused && pauseEvent.createdAt < cutoffTime) {
      try {
        await autoResume(pauseEvent.recordingId);
        resumedCount++;
      } catch (err) {
        log(`Auto-resume check failed for ${pauseEvent.recordingId}: ${
          err instanceof Error ? err.message : err
        }`);
      }
    }
  }

  if (resumedCount > 0) {
    log(`Auto-resumed ${resumedCount} recording(s) past timeout`);
  }

  return resumedCount;
}

// ---------------------------------------------------------------------------
// getRecordingSegments
// ---------------------------------------------------------------------------

/**
 * Get the active (non-paused) segments of a recording.
 * Used by the audio streaming layer to skip paused portions during playback.
 *
 * @param recordingId - The recording to get segments for
 * @returns List of segments with their active/paused status
 */
export async function getRecordingSegments(recordingId: string): Promise<RecordingSegment[]> {
  // Get the recording duration
  const [recording] = await db
    .select()
    .from(recordings)
    .where(eq(recordings.id, recordingId))
    .limit(1);

  if (!recording) {
    return [];
  }

  const totalDurationMs = recording.durationMs || recording.duration * 1000;

  // Get all pause events ordered by timestamp
  const events = await db
    .select()
    .from(recordingPauseEvents)
    .where(eq(recordingPauseEvents.recordingId, recordingId))
    .orderBy(recordingPauseEvents.timestampMs);

  if (events.length === 0) {
    // No pause events -- entire recording is one active segment
    return [{ startMs: 0, endMs: totalDurationMs, isActive: true }];
  }

  const segments: RecordingSegment[] = [];
  let currentMs = 0;
  let isPaused = false;

  for (const event of events) {
    if (event.eventType === 'pause' && !isPaused) {
      // Active segment up to this pause
      if (event.timestampMs > currentMs) {
        segments.push({
          startMs: currentMs,
          endMs: event.timestampMs,
          isActive: true,
        });
      }
      currentMs = event.timestampMs;
      isPaused = true;
    } else if ((event.eventType === 'resume' || event.eventType === 'auto_resume') && isPaused) {
      // Paused segment up to this resume
      if (event.timestampMs > currentMs) {
        segments.push({
          startMs: currentMs,
          endMs: event.timestampMs,
          isActive: false,
        });
      }
      currentMs = event.timestampMs;
      isPaused = false;
    }
  }

  // Final segment to end of recording
  if (currentMs < totalDurationMs) {
    segments.push({
      startMs: currentMs,
      endMs: totalDurationMs,
      isActive: !isPaused,
    });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Automatically resume a recording and insert an auto_resume event.
 */
async function autoResume(recordingId: string): Promise<void> {
  const [recording] = await db
    .select()
    .from(recordings)
    .where(eq(recordings.id, recordingId))
    .limit(1);

  if (!recording) return;

  // Calculate current timestamp in the recording timeline
  let timestampMs = 0;
  if (recording.startTime) {
    timestampMs = Date.now() - new Date(recording.startTime).getTime();
  }

  await db
    .insert(recordingPauseEvents)
    .values({
      recordingId,
      userId: null,
      eventType: 'auto_resume',
      timestampMs,
      reason: `Auto-resumed after ${DEFAULT_AUTO_RESUME_MS / 1000}s timeout`,
    });

  cancelAutoResumeTimer(recordingId);
  await updatePausedSegments(recordingId);

  log(`Auto-resumed recording ${recordingId} at ${timestampMs}ms`);
}

/**
 * Cancel an auto-resume timer for a recording.
 */
function cancelAutoResumeTimer(recordingId: string): void {
  const timer = autoResumeTimers.get(recordingId);
  if (timer) {
    clearTimeout(timer);
    autoResumeTimers.delete(recordingId);
  }
}

/**
 * Rebuild and persist the pci_paused_segments_json on the recording record.
 */
async function updatePausedSegments(recordingId: string): Promise<void> {
  const segments = await getRecordingSegments(recordingId);
  const pausedSegments = segments
    .filter((s) => !s.isActive)
    .map((s) => ({ startMs: s.startMs, endMs: s.endMs }));

  await db
    .update(recordings)
    .set({ pciPausedSegmentsJson: pausedSegments })
    .where(eq(recordings.id, recordingId));
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Clear all auto-resume timers. Call on server shutdown.
 */
export function clearAllAutoResumeTimers(): void {
  for (const [recordingId, timer] of autoResumeTimers) {
    clearTimeout(timer);
  }
  autoResumeTimers.clear();
  log('All auto-resume timers cleared');
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [PCI] ${message}`);
}
