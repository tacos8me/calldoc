// ─── API Route Tests: /api/transcriptions ────────────────────────────────────
// Tests the validation schemas, pagination logic, search/filter handling,
// and error formatting used by the transcriptions API route.

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  paginationSchema,
  dateRangeSchema,
  parseSearchParams,
  paginatedResponse,
  serverErrorResponse,
} from '@/lib/api/validation';

// ---------------------------------------------------------------------------
// Replicate the transcriptions query schema from the route
// ---------------------------------------------------------------------------

const transcriptionsQuerySchema = paginationSchema.merge(dateRangeSchema).extend({
  search: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  agentId: z.string().uuid().optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
});

// ---------------------------------------------------------------------------
// Test: Transcriptions Query Schema - Pagination
// ---------------------------------------------------------------------------

describe('transcriptions query schema - pagination', () => {
  it('should accept valid page and limit', () => {
    const result = transcriptionsQuerySchema.safeParse({ page: '2', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should use defaults for missing values', () => {
    const result = transcriptionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(25);
    }
  });

  it('should reject page < 1', () => {
    const result = transcriptionsQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('should reject limit > 500', () => {
    const result = transcriptionsQuerySchema.safeParse({ limit: '501' });
    expect(result.success).toBe(false);
  });

  it('should coerce string numbers', () => {
    const result = transcriptionsQuerySchema.safeParse({ page: '3', limit: '100' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(100);
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Transcriptions Query Schema - Search
// ---------------------------------------------------------------------------

describe('transcriptions query schema - search', () => {
  it('should accept search string', () => {
    const result = transcriptionsQuerySchema.safeParse({ search: 'hello world' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe('hello world');
    }
  });

  it('should accept empty search (omitted)', () => {
    const result = transcriptionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Transcriptions Query Schema - Status Filtering
// ---------------------------------------------------------------------------

describe('transcriptions query schema - status', () => {
  it('should accept all valid statuses', () => {
    const statuses = ['pending', 'processing', 'completed', 'failed'];
    for (const status of statuses) {
      const result = transcriptionsQuerySchema.safeParse({ status });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(status);
      }
    }
  });

  it('should reject invalid status', () => {
    const result = transcriptionsQuerySchema.safeParse({ status: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('should reject empty status string', () => {
    const result = transcriptionsQuerySchema.safeParse({ status: '' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: Transcriptions Query Schema - Date Range Filtering
// ---------------------------------------------------------------------------

describe('transcriptions query schema - date range', () => {
  it('should accept date-only from/to strings', () => {
    const result = transcriptionsQuerySchema.safeParse({
      from: '2024-02-10',
      to: '2024-02-11',
    });
    expect(result.success).toBe(true);
  });

  it('should accept ISO datetime from/to strings', () => {
    const result = transcriptionsQuerySchema.safeParse({
      from: '2024-02-10T00:00:00+00:00',
      to: '2024-02-10T23:59:59+00:00',
    });
    expect(result.success).toBe(true);
  });

  it('should accept from-only', () => {
    const result = transcriptionsQuerySchema.safeParse({ from: '2024-02-10' });
    expect(result.success).toBe(true);
  });

  it('should accept to-only', () => {
    const result = transcriptionsQuerySchema.safeParse({ to: '2024-02-10' });
    expect(result.success).toBe(true);
  });

  it('should accept missing from/to (optional)', () => {
    const result = transcriptionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: Transcriptions Query Schema - Agent ID Filtering
// ---------------------------------------------------------------------------

describe('transcriptions query schema - agentId', () => {
  it('should accept valid UUID agentId', () => {
    const result = transcriptionsQuerySchema.safeParse({
      agentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agentId).toBe('550e8400-e29b-41d4-a716-446655440000');
    }
  });

  it('should reject non-UUID agentId', () => {
    const result = transcriptionsQuerySchema.safeParse({ agentId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('should accept missing agentId', () => {
    const result = transcriptionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agentId).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Transcriptions Query Schema - Min Confidence
// ---------------------------------------------------------------------------

describe('transcriptions query schema - minConfidence', () => {
  it('should accept valid confidence values', () => {
    const values = ['0', '0.5', '0.95', '1'];
    for (const val of values) {
      const result = transcriptionsQuerySchema.safeParse({ minConfidence: val });
      expect(result.success).toBe(true);
    }
  });

  it('should coerce string to number', () => {
    const result = transcriptionsQuerySchema.safeParse({ minConfidence: '0.85' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minConfidence).toBe(0.85);
    }
  });

  it('should reject confidence > 1', () => {
    const result = transcriptionsQuerySchema.safeParse({ minConfidence: '1.5' });
    expect(result.success).toBe(false);
  });

  it('should reject confidence < 0', () => {
    const result = transcriptionsQuerySchema.safeParse({ minConfidence: '-0.1' });
    expect(result.success).toBe(false);
  });

  it('should accept missing minConfidence', () => {
    const result = transcriptionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minConfidence).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Transcriptions Query Schema - Combined Filters
// ---------------------------------------------------------------------------

describe('transcriptions query schema - combined filters', () => {
  it('should accept all valid filter combinations', () => {
    const result = transcriptionsQuerySchema.safeParse({
      page: '1',
      limit: '25',
      search: 'billing inquiry',
      status: 'completed',
      from: '2024-02-10',
      to: '2024-02-11',
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      minConfidence: '0.8',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(25);
      expect(result.data.search).toBe('billing inquiry');
      expect(result.data.status).toBe('completed');
      expect(result.data.from).toBe('2024-02-10');
      expect(result.data.to).toBe('2024-02-11');
      expect(result.data.agentId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.data.minConfidence).toBe(0.8);
    }
  });
});

// ---------------------------------------------------------------------------
// Test: parseSearchParams with transcription filters
// ---------------------------------------------------------------------------

describe('parseSearchParams for transcriptions', () => {
  it('should parse valid transcription query from URL', () => {
    const url = 'http://localhost:3000/api/transcriptions?status=completed&page=1&limit=10';
    const result = parseSearchParams(url, transcriptionsQuerySchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('completed');
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
    }
  });

  it('should parse search query from URL', () => {
    const url = 'http://localhost:3000/api/transcriptions?search=billing';
    const result = parseSearchParams(url, transcriptionsQuerySchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe('billing');
    }
  });

  it('should parse date range from URL', () => {
    const url = 'http://localhost:3000/api/transcriptions?from=2024-02-10&to=2024-02-11';
    const result = parseSearchParams(url, transcriptionsQuerySchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.from).toBe('2024-02-10');
      expect(result.data.to).toBe('2024-02-11');
    }
  });

  it('should return 400 for invalid status in URL', async () => {
    const url = 'http://localhost:3000/api/transcriptions?status=invalid';
    const result = parseSearchParams(url, transcriptionsQuerySchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('should return 400 for invalid agentId in URL', async () => {
    const url = 'http://localhost:3000/api/transcriptions?agentId=not-a-uuid';
    const result = parseSearchParams(url, transcriptionsQuerySchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('should return 400 for out-of-range minConfidence in URL', async () => {
    const url = 'http://localhost:3000/api/transcriptions?minConfidence=2';
    const result = parseSearchParams(url, transcriptionsQuerySchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
    }
  });

  it('should handle URL with no params and use defaults', () => {
    const url = 'http://localhost:3000/api/transcriptions';
    const result = parseSearchParams(url, transcriptionsQuerySchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(25);
      expect(result.data.search).toBeUndefined();
      expect(result.data.status).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Transcription Paginated Response
// ---------------------------------------------------------------------------

describe('transcription paginated response', () => {
  it('should format transcription list response correctly', async () => {
    const data = [
      { id: 'tr-1', status: 'completed', transcript: 'Hello' },
      { id: 'tr-2', status: 'pending', transcript: null },
    ];

    const response = paginatedResponse(data, 50, 1, 25);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(50);
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(25);
    expect(body.meta.pageCount).toBe(2);
  });

  it('should handle empty transcription list', async () => {
    const response = paginatedResponse([], 0, 1, 25);
    const body = await response.json();

    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
    expect(body.meta.pageCount).toBe(0);
  });

  it('should calculate pageCount correctly for non-even totals', async () => {
    const response = paginatedResponse([], 51, 1, 25);
    const body = await response.json();
    expect(body.meta.pageCount).toBe(3); // ceil(51/25) = 3
  });
});

// ---------------------------------------------------------------------------
// Test: Transcription Server Error Response
// ---------------------------------------------------------------------------

describe('transcription error responses', () => {
  it('should return 500 with proper format for fetch failure', async () => {
    const response = serverErrorResponse('Failed to fetch transcriptions');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Failed to fetch transcriptions');
  });
});
