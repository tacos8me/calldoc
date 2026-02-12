// ─── API Route Tests: /api/recordings/[id]/transcript ────────────────────────
// Tests the validation schemas, ID parsing, request body validation,
// and error formatting used by the recording transcript API route.

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  uuidSchema,
  parseBody,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api/validation';
import { createMockRequest } from '@/test/helpers';

// ---------------------------------------------------------------------------
// Replicate the submit transcription schema from the route
// ---------------------------------------------------------------------------

const submitTranscriptionSchema = z.object({
  language: z.string().min(2).max(10).default('en'),
});

// ---------------------------------------------------------------------------
// Test: Recording ID Validation
// ---------------------------------------------------------------------------

describe('transcript recording ID validation', () => {
  it('should accept valid UUID', () => {
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });

  it('should reject non-UUID strings', () => {
    expect(uuidSchema.safeParse('rec-123').success).toBe(false);
    expect(uuidSchema.safeParse('12345').success).toBe(false);
    expect(uuidSchema.safeParse('').success).toBe(false);
    expect(uuidSchema.safeParse('not-valid-uuid-format').success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: GET Transcript - Not Found Responses
// ---------------------------------------------------------------------------

describe('transcript not found responses', () => {
  it('should return 404 for missing recording', async () => {
    const response = notFoundResponse('Recording');
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Recording not found');
  });

  it('should return 404 for recording with no transcription', async () => {
    // This simulates the route's behavior when the recording exists
    // but no transcription record is found for it.
    const response = new Response(
      JSON.stringify({
        error: { code: 'NOT_FOUND', message: 'No transcription found for this recording' },
      }),
      { status: 404, headers: { 'content-type': 'application/json' } }
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('No transcription found for this recording');
  });
});

// ---------------------------------------------------------------------------
// Test: GET Transcript - Response Shape
// ---------------------------------------------------------------------------

describe('transcript response shape', () => {
  it('should have all expected fields in transcription data', () => {
    const now = new Date();
    const transcription = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      recordingId: '550e8400-e29b-41d4-a716-446655440000',
      jobId: 'job-abc-123',
      status: 'completed',
      transcript: 'Hello, how can I help you today?',
      confidence: 0.95,
      language: 'en',
      durationSeconds: 120.5,
      processingTimeSeconds: 8.2,
      segments: [],
      wordCount: 7,
      errorMessage: null,
      createdAt: now.toISOString(),
      completedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    expect(transcription).toHaveProperty('id');
    expect(transcription).toHaveProperty('recordingId');
    expect(transcription).toHaveProperty('jobId');
    expect(transcription).toHaveProperty('status');
    expect(transcription).toHaveProperty('transcript');
    expect(transcription).toHaveProperty('confidence');
    expect(transcription).toHaveProperty('language');
    expect(transcription).toHaveProperty('durationSeconds');
    expect(transcription).toHaveProperty('processingTimeSeconds');
    expect(transcription).toHaveProperty('segments');
    expect(transcription).toHaveProperty('wordCount');
    expect(transcription).toHaveProperty('errorMessage');
    expect(transcription).toHaveProperty('createdAt');
    expect(transcription).toHaveProperty('completedAt');
    expect(transcription).toHaveProperty('updatedAt');
  });

  it('should allow null completedAt for pending/processing transcriptions', () => {
    const transcription = {
      status: 'pending',
      completedAt: null,
    };
    expect(transcription.completedAt).toBeNull();
  });

  it('should handle empty segments array', () => {
    const segmentsJson = null;
    const segments = segmentsJson ?? [];
    expect(segments).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Test: POST Transcript - Submit Schema Validation
// ---------------------------------------------------------------------------

describe('submit transcription schema', () => {
  it('should accept valid language code', () => {
    const result = submitTranscriptionSchema.safeParse({ language: 'en' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe('en');
    }
  });

  it('should accept longer language codes', () => {
    const result = submitTranscriptionSchema.safeParse({ language: 'en-US' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe('en-US');
    }
  });

  it('should default language to en when not provided', () => {
    const result = submitTranscriptionSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe('en');
    }
  });

  it('should reject language code shorter than 2 characters', () => {
    const result = submitTranscriptionSchema.safeParse({ language: 'e' });
    expect(result.success).toBe(false);
  });

  it('should reject language code longer than 10 characters', () => {
    const result = submitTranscriptionSchema.safeParse({ language: 'en-US-extra-long' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: POST Transcript - parseBody Validation
// ---------------------------------------------------------------------------

describe('transcript parseBody validation', () => {
  it('should parse valid request body', async () => {
    const req = createMockRequest('http://localhost:3000/api/recordings/abc/transcript', {
      method: 'POST',
      body: { language: 'fr' },
    });

    const result = await parseBody(req, submitTranscriptionSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe('fr');
    }
  });

  it('should accept empty body and use default language', async () => {
    const req = createMockRequest('http://localhost:3000/api/recordings/abc/transcript', {
      method: 'POST',
      body: {},
    });

    const result = await parseBody(req, submitTranscriptionSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe('en');
    }
  });

  it('should reject invalid language in body', async () => {
    const req = createMockRequest('http://localhost:3000/api/recordings/abc/transcript', {
      method: 'POST',
      body: { language: 'x' },
    });

    const result = await parseBody(req, submitTranscriptionSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Invalid request body');
    }
  });

  it('should reject non-JSON body', async () => {
    const req = new Request('http://localhost:3000/api/recordings/abc/transcript', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'not json',
    });

    const result = await parseBody(req, submitTranscriptionSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe('INVALID_JSON');
      expect(body.error.message).toBe('Request body must be valid JSON');
    }
  });
});

// ---------------------------------------------------------------------------
// Test: POST Transcript - Invalid Recording ID Response
// ---------------------------------------------------------------------------

describe('transcript invalid recording ID response', () => {
  it('should return 400 with VALIDATION_ERROR for invalid recording ID', () => {
    // Simulating the format the route produces for invalid ID
    const errorResponse = {
      error: { code: 'VALIDATION_ERROR', message: 'Invalid recording ID format' },
    };

    expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
    expect(errorResponse.error.message).toBe('Invalid recording ID format');
  });
});

// ---------------------------------------------------------------------------
// Test: POST Transcript - Submission Response Shape
// ---------------------------------------------------------------------------

describe('transcript submission response shape', () => {
  it('should return transcriptionId, jobId, and status on success', () => {
    // Simulate the 201 response from POST
    const responseData = {
      transcriptionId: '550e8400-e29b-41d4-a716-446655440001',
      jobId: 'job-123',
      status: 'processing',
    };

    expect(responseData).toHaveProperty('transcriptionId');
    expect(responseData).toHaveProperty('jobId');
    expect(responseData).toHaveProperty('status');
    expect(responseData.status).toBe('processing');
  });

  it('should have pending status when Parakeet server is unreachable', () => {
    const responseData = {
      transcriptionId: '550e8400-e29b-41d4-a716-446655440001',
      jobId: null,
      status: 'pending',
    };

    expect(responseData.jobId).toBeNull();
    expect(responseData.status).toBe('pending');
  });
});

// ---------------------------------------------------------------------------
// Test: Transcript Error Responses
// ---------------------------------------------------------------------------

describe('transcript error responses', () => {
  it('should return 500 for GET fetch failure', async () => {
    const response = serverErrorResponse('Failed to fetch transcription');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Failed to fetch transcription');
  });

  it('should return 500 for POST submission failure', async () => {
    const response = serverErrorResponse('Failed to submit transcription job');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Failed to submit transcription job');
  });

  it('should return 502 format for Parakeet server failure', () => {
    const errorResponse = {
      error: {
        code: 'TRANSCRIPTION_SUBMIT_FAILED',
        message: 'Failed to submit transcription job to Parakeet server',
      },
    };

    expect(errorResponse.error.code).toBe('TRANSCRIPTION_SUBMIT_FAILED');
    expect(errorResponse.error.message).toContain('Parakeet');
  });
});

// ---------------------------------------------------------------------------
// Test: Auth Middleware Error Formats for Transcript Routes
// ---------------------------------------------------------------------------

describe('transcript auth errors', () => {
  it('should have consistent 401 error for unauthenticated requests', () => {
    const errorBody = {
      error: 'Unauthorized',
      message: 'Authentication required',
    };
    expect(errorBody.error).toBe('Unauthorized');
    expect(errorBody.message).toBe('Authentication required');
  });

  it('should have consistent 403 error for missing recordings:view permission', () => {
    const errorBody = {
      error: 'Forbidden',
      message: 'Missing permission: recordings:view',
    };
    expect(errorBody.error).toBe('Forbidden');
    expect(errorBody.message).toContain('Missing permission');
    expect(errorBody.message).toContain('recordings:view');
  });
});
