// ─── Transcription Domain Types ──────────────────────────────────────────────
// Source: Parakeet ASR integration for recording transcription.

/**
 * Transcription processing status.
 */
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * A single word within a transcript segment with timing and confidence.
 */
export interface TranscriptWord {
  /** The word text */
  word: string;
  /** Start time in seconds from recording start */
  start: number;
  /** End time in seconds from recording start */
  end: number;
  /** Confidence score 0-1 */
  confidence: number;
}

/**
 * A segment of transcript text (typically a sentence or phrase).
 */
export interface TranscriptSegment {
  /** Start time in seconds from recording start */
  start: number;
  /** End time in seconds from recording start */
  end: number;
  /** The segment text */
  text: string;
  /** Average confidence score for this segment 0-1 */
  confidence: number;
  /** Speaker label (future: speaker diarization) */
  speaker?: string;
  /** Individual words with timing */
  words: TranscriptWord[];
}

/**
 * A transcription record linked to a recording.
 */
export interface Transcription {
  /** Unique transcription identifier */
  id: string;
  /** Parent recording identifier */
  recordingId: string;
  /** Parakeet server job ID */
  jobId: string | null;
  /** Current processing status */
  status: TranscriptionStatus;
  /** Full transcript text */
  transcript: string | null;
  /** Average confidence score 0-1 */
  confidence: number | null;
  /** Language code (e.g., 'en') */
  language: string;
  /** Audio duration in seconds */
  durationSeconds: number | null;
  /** Processing time in seconds */
  processingTimeSeconds: number | null;
  /** Timed transcript segments with word-level detail */
  segments: TranscriptSegment[];
  /** Total word count */
  wordCount: number | null;
  /** Error message if status is 'failed' */
  errorMessage: string | null;
  /** ISO timestamp of transcription creation */
  createdAt: string;
  /** ISO timestamp of transcription completion */
  completedAt: string | null;
  /** ISO timestamp of last update */
  updatedAt: string;
}

/**
 * A transcription job status object for tracking in-progress work.
 */
export interface TranscriptionJob {
  /** Parakeet server job ID */
  jobId: string;
  /** Parent recording identifier */
  recordingId: string;
  /** Current processing status */
  status: TranscriptionStatus;
  /** Processing progress 0-100 */
  progress: number;
  /** ISO timestamp of job creation */
  createdAt: string;
  /** ISO timestamp of job completion */
  completedAt: string | null;
  /** Error message if failed */
  error: string | null;
}

/**
 * Aggregate statistics for the transcription overview page.
 */
export interface TranscriptionStats {
  /** Total number of transcriptions */
  totalTranscriptions: number;
  /** Number of completed transcriptions */
  completed: number;
  /** Number of pending transcriptions */
  pending: number;
  /** Number of currently processing transcriptions */
  processing: number;
  /** Number of failed transcriptions */
  failed: number;
  /** Average confidence score across completed transcriptions */
  averageConfidence: number;
  /** Total word count across all completed transcriptions */
  totalWordCount: number;
  /** Average processing time in seconds */
  averageProcessingTime: number;
}

/**
 * A search result from full-text transcript search.
 */
export interface TranscriptionSearchResult {
  /** Transcription identifier */
  transcriptionId: string;
  /** Parent recording identifier */
  recordingId: string;
  /** Agent name who handled the call */
  agentName: string | null;
  /** Caller phone number */
  callerNumber: string;
  /** Called phone number */
  calledNumber: string;
  /** Call direction (inbound/outbound) */
  direction: string;
  /** ISO date of the call */
  callDate: string;
  /** Call duration in seconds */
  duration: number;
  /** Full transcript text */
  transcript: string;
  /** Average confidence score */
  confidence: number;
  /** Highlighted context around the search match */
  matchSnippet: string;
  /** Character position of the match in the transcript */
  matchPosition: number;
}
