// ─── API Route Tests: /api/calls ──────────────────────────────────────────────
// Tests the validation schemas, pagination logic, and error formatting
// used by the calls API routes. Uses direct function invocation of the
// shared validation utilities since Next.js route handlers require the
// full request lifecycle.

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  paginationSchema,
  sortSchema,
  dateRangeSchema,
  uuidSchema,
  parseSearchParams,
  paginatedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api/validation';
import { createMockCall } from '@/test/helpers';

// ---------------------------------------------------------------------------
// Test: Pagination Schema Validation
// ---------------------------------------------------------------------------

describe('paginationSchema', () => {
  it('should accept valid page and limit', () => {
    const result = paginationSchema.safeParse({ page: '2', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should use defaults for missing values', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(25);
    }
  });

  it('should reject page < 1', () => {
    const result = paginationSchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('should reject limit > 500', () => {
    const result = paginationSchema.safeParse({ limit: '501' });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer page', () => {
    const result = paginationSchema.safeParse({ page: '1.5' });
    expect(result.success).toBe(false);
  });

  it('should coerce string numbers', () => {
    const result = paginationSchema.safeParse({ page: '10', limit: '100' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(10);
      expect(result.data.limit).toBe(100);
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Sort Schema Validation
// ---------------------------------------------------------------------------

describe('sortSchema', () => {
  it('should accept valid sort field and order', () => {
    const result = sortSchema.safeParse({ sort: 'startTime', order: 'asc' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort).toBe('startTime');
      expect(result.data.order).toBe('asc');
    }
  });

  it('should default order to desc', () => {
    const result = sortSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe('desc');
    }
  });

  it('should reject invalid order value', () => {
    const result = sortSchema.safeParse({ order: 'random' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: Date Range Schema Validation
// ---------------------------------------------------------------------------

describe('dateRangeSchema', () => {
  it('should accept ISO datetime strings', () => {
    const result = dateRangeSchema.safeParse({
      from: '2024-02-10T00:00:00+00:00',
      to: '2024-02-10T23:59:59+00:00',
    });
    expect(result.success).toBe(true);
  });

  it('should accept date-only strings (YYYY-MM-DD)', () => {
    const result = dateRangeSchema.safeParse({
      from: '2024-02-10',
      to: '2024-02-11',
    });
    expect(result.success).toBe(true);
  });

  it('should accept missing from/to (optional)', () => {
    const result = dateRangeSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: UUID Schema
// ---------------------------------------------------------------------------

describe('uuidSchema', () => {
  it('should accept valid UUIDs', () => {
    const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUIDs', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(uuidSchema.safeParse('12345').success).toBe(false);
    expect(uuidSchema.safeParse('').success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: parseSearchParams
// ---------------------------------------------------------------------------

describe('parseSearchParams', () => {
  it('should parse valid query parameters', () => {
    const url = 'http://localhost:3000/api/calls?page=2&limit=50';
    const result = parseSearchParams(url, paginationSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should return error response for invalid params', () => {
    const url = 'http://localhost:3000/api/calls?page=0';
    const result = parseSearchParams(url, paginationSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Should be a 400 response
      expect(result.response.status).toBe(400);
    }
  });

  it('should return proper error format', async () => {
    const url = 'http://localhost:3000/api/calls?page=-1';
    const result = parseSearchParams(url, paginationSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Invalid query parameters');
      expect(body.error.details).toBeDefined();
    }
  });

  it('should handle URL with no params', () => {
    const url = 'http://localhost:3000/api/calls';
    const result = parseSearchParams(url, paginationSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(25);
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Calls Query Schema (full combined schema)
// ---------------------------------------------------------------------------

describe('calls query schema', () => {
  const callsQuerySchema = paginationSchema.merge(sortSchema).merge(dateRangeSchema).extend({
    caller: z.string().optional(),
    called: z.string().optional(),
    agent: z.string().uuid().optional(),
    group: z.string().optional(),
    direction: z.enum(['inbound', 'outbound', 'internal']).optional(),
    state: z.enum([
      'idle', 'ringing', 'connected', 'hold', 'transferring',
      'conferencing', 'queued', 'parked', 'voicemail', 'completed', 'abandoned',
    ]).optional(),
    hasRecording: z.coerce.boolean().optional(),
  });

  it('should accept all valid filter combinations', () => {
    const result = callsQuerySchema.safeParse({
      page: '1',
      limit: '25',
      sort: 'startTime',
      order: 'desc',
      from: '2024-02-10',
      caller: '+442075551234',
      direction: 'inbound',
      state: 'connected',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid direction', () => {
    const result = callsQuerySchema.safeParse({ direction: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid state', () => {
    const result = callsQuerySchema.safeParse({ state: 'invalid-state' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid agent UUID', () => {
    const result = callsQuerySchema.safeParse({ agent: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('should accept hasRecording as boolean coercion', () => {
    const result = callsQuerySchema.safeParse({ hasRecording: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hasRecording).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Response Builders
// ---------------------------------------------------------------------------

describe('paginatedResponse', () => {
  it('should build proper paginated response structure', async () => {
    const calls = [createMockCall(), createMockCall()];
    const response = paginatedResponse(calls, 50, 1, 25);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(50);
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(25);
    expect(body.meta.pageCount).toBe(2);
  });

  it('should calculate pageCount correctly', async () => {
    const response = paginatedResponse([], 0, 1, 25);
    const body = await response.json();
    expect(body.meta.pageCount).toBe(0);
    expect(body.data).toEqual([]);
  });

  it('should handle non-even page counts', async () => {
    const response = paginatedResponse([], 51, 1, 25);
    const body = await response.json();
    expect(body.meta.pageCount).toBe(3); // ceil(51/25) = 3
  });
});

describe('notFoundResponse', () => {
  it('should return 404 with proper error format', async () => {
    const response = notFoundResponse('Call');
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Call not found');
  });

  it('should use default resource name', async () => {
    const response = notFoundResponse();
    const body = await response.json();
    expect(body.error.message).toBe('Resource not found');
  });
});

describe('serverErrorResponse', () => {
  it('should return 500 with proper error format', async () => {
    const response = serverErrorResponse('Failed to fetch calls');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Failed to fetch calls');
  });

  it('should use default message', async () => {
    const response = serverErrorResponse();
    const body = await response.json();
    expect(body.error.message).toBe('Internal server error');
  });
});
