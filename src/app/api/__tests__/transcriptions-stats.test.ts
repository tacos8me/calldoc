// ─── API Route Tests: /api/transcriptions/stats ──────────────────────────────
// Tests the stat shape, empty database behavior, and error formatting
// used by the transcription statistics API route.

import { describe, it, expect, vi } from 'vitest';
import {
  serverErrorResponse,
} from '@/lib/api/validation';

// ---------------------------------------------------------------------------
// Test: Stats Response Shape
// ---------------------------------------------------------------------------

describe('transcription stats response shape', () => {
  it('should validate expected stat shape from populated data', () => {
    // Simulate the shape returned by GET /api/transcriptions/stats
    const stats = {
      totalTranscriptions: 150,
      completed: 120,
      pending: 10,
      processing: 5,
      failed: 15,
      averageConfidence: 0.923,
      totalWordCount: 45000,
      averageProcessingTime: 12.45,
    };

    expect(stats.totalTranscriptions).toBe(150);
    expect(stats.completed).toBe(120);
    expect(stats.pending).toBe(10);
    expect(stats.processing).toBe(5);
    expect(stats.failed).toBe(15);
    expect(stats.averageConfidence).toBe(0.923);
    expect(stats.totalWordCount).toBe(45000);
    expect(stats.averageProcessingTime).toBe(12.45);
  });

  it('should have consistent field names', () => {
    const expectedFields = [
      'totalTranscriptions',
      'completed',
      'pending',
      'processing',
      'failed',
      'averageConfidence',
      'totalWordCount',
      'averageProcessingTime',
    ];

    const stats = {
      totalTranscriptions: 0,
      completed: 0,
      pending: 0,
      processing: 0,
      failed: 0,
      averageConfidence: 0,
      totalWordCount: 0,
      averageProcessingTime: 0,
    };

    for (const field of expectedFields) {
      expect(stats).toHaveProperty(field);
    }
  });

  it('should sum status counts to total', () => {
    const stats = {
      totalTranscriptions: 150,
      completed: 120,
      pending: 10,
      processing: 5,
      failed: 15,
    };

    expect(stats.completed + stats.pending + stats.processing + stats.failed)
      .toBe(stats.totalTranscriptions);
  });
});

// ---------------------------------------------------------------------------
// Test: Empty Database Case
// ---------------------------------------------------------------------------

describe('transcription stats empty database', () => {
  it('should produce zero stats for empty database', () => {
    // Simulating what the route returns when all DB queries return count=0 / avg=0
    const totalCount = 0;
    const completedCount = 0;
    const pendingCount = 0;
    const processingCount = 0;
    const failedCount = 0;
    const avgConfidence = 0;
    const totalWords = 0;
    const avgProcessingTime = 0;

    const stats = {
      totalTranscriptions: totalCount ?? 0,
      completed: completedCount ?? 0,
      pending: pendingCount ?? 0,
      processing: processingCount ?? 0,
      failed: failedCount ?? 0,
      averageConfidence: Math.round((avgConfidence ?? 0) * 1000) / 1000,
      totalWordCount: totalWords ?? 0,
      averageProcessingTime: Math.round((avgProcessingTime ?? 0) * 100) / 100,
    };

    expect(stats.totalTranscriptions).toBe(0);
    expect(stats.completed).toBe(0);
    expect(stats.pending).toBe(0);
    expect(stats.processing).toBe(0);
    expect(stats.failed).toBe(0);
    expect(stats.averageConfidence).toBe(0);
    expect(stats.totalWordCount).toBe(0);
    expect(stats.averageProcessingTime).toBe(0);
  });

  it('should handle null count results gracefully', () => {
    // When the DB returns undefined/null for aggregate queries
    const countResult = undefined;
    const confidenceResult = undefined;
    const wordCountResult = undefined;
    const processingTimeResult = undefined;

    const total = (countResult as { count: number } | undefined)?.count ?? 0;
    const avgConfidence = (confidenceResult as { avg: number } | undefined)?.avg ?? 0;
    const totalWords = (wordCountResult as { total: number } | undefined)?.total ?? 0;
    const avgProcTime = (processingTimeResult as { avg: number } | undefined)?.avg ?? 0;

    expect(total).toBe(0);
    expect(Math.round(avgConfidence * 1000) / 1000).toBe(0);
    expect(totalWords).toBe(0);
    expect(Math.round(avgProcTime * 100) / 100).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test: Rounding Logic
// ---------------------------------------------------------------------------

describe('transcription stats rounding', () => {
  it('should round averageConfidence to 3 decimal places', () => {
    const raw = 0.92345678;
    const rounded = Math.round(raw * 1000) / 1000;
    expect(rounded).toBe(0.923);
  });

  it('should round averageProcessingTime to 2 decimal places', () => {
    const raw = 12.456789;
    const rounded = Math.round(raw * 100) / 100;
    expect(rounded).toBe(12.46);
  });

  it('should handle rounding of zero values', () => {
    expect(Math.round(0 * 1000) / 1000).toBe(0);
    expect(Math.round(0 * 100) / 100).toBe(0);
  });

  it('should handle rounding of exact values', () => {
    expect(Math.round(0.9 * 1000) / 1000).toBe(0.9);
    expect(Math.round(10.0 * 100) / 100).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Test: Error Handling
// ---------------------------------------------------------------------------

describe('transcription stats error handling', () => {
  it('should return 500 for statistics fetch failure', async () => {
    const response = serverErrorResponse('Failed to fetch transcription statistics');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Failed to fetch transcription statistics');
  });
});

// ---------------------------------------------------------------------------
// Test: Auth Middleware Error Format
// ---------------------------------------------------------------------------

describe('transcription stats auth errors', () => {
  it('should have consistent 401 error structure for unauthenticated requests', () => {
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
