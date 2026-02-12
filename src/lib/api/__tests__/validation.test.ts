// ─── API Validation Helpers Tests ────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  paginationSchema,
  sortSchema,
  dateRangeSchema,
  uuidSchema,
  parseSearchParams,
  parseBody,
  paginatedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '../validation';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Test: Pagination Schema
// ---------------------------------------------------------------------------

describe('paginationSchema', () => {
  it('should apply defaults when no values provided', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
  });

  it('should parse valid page and limit as numbers', () => {
    const result = paginationSchema.parse({ page: 3, limit: 50 });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('should coerce string values to numbers', () => {
    const result = paginationSchema.parse({ page: '5', limit: '100' });
    expect(result.page).toBe(5);
    expect(result.limit).toBe(100);
  });

  it('should reject page less than 1', () => {
    const result = paginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject negative page', () => {
    const result = paginationSchema.safeParse({ page: -1 });
    expect(result.success).toBe(false);
  });

  it('should reject limit greater than 500', () => {
    const result = paginationSchema.safeParse({ limit: 501 });
    expect(result.success).toBe(false);
  });

  it('should reject limit less than 1', () => {
    const result = paginationSchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('should accept limit at boundary values', () => {
    const min = paginationSchema.parse({ limit: 1 });
    expect(min.limit).toBe(1);

    const max = paginationSchema.parse({ limit: 500 });
    expect(max.limit).toBe(500);
  });

  it('should reject non-integer page', () => {
    const result = paginationSchema.safeParse({ page: 1.5 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: Sort Schema
// ---------------------------------------------------------------------------

describe('sortSchema', () => {
  it('should default order to desc when not provided', () => {
    const result = sortSchema.parse({});
    expect(result.order).toBe('desc');
    expect(result.sort).toBeUndefined();
  });

  it('should accept valid sort field and order', () => {
    const result = sortSchema.parse({ sort: 'startTime', order: 'asc' });
    expect(result.sort).toBe('startTime');
    expect(result.order).toBe('asc');
  });

  it('should reject invalid order values', () => {
    const result = sortSchema.safeParse({ order: 'random' });
    expect(result.success).toBe(false);
  });

  it('should accept desc order explicitly', () => {
    const result = sortSchema.parse({ order: 'desc' });
    expect(result.order).toBe('desc');
  });
});

// ---------------------------------------------------------------------------
// Test: Date Range Schema
// ---------------------------------------------------------------------------

describe('dateRangeSchema', () => {
  it('should accept ISO datetime with offset', () => {
    const result = dateRangeSchema.parse({
      from: '2024-02-10T14:30:00+00:00',
      to: '2024-02-10T18:00:00+00:00',
    });
    expect(result.from).toBe('2024-02-10T14:30:00+00:00');
    expect(result.to).toBe('2024-02-10T18:00:00+00:00');
  });

  it('should accept YYYY-MM-DD date-only strings', () => {
    const result = dateRangeSchema.parse({
      from: '2024-02-10',
      to: '2024-02-15',
    });
    expect(result.from).toBe('2024-02-10');
    expect(result.to).toBe('2024-02-15');
  });

  it('should accept empty/undefined from and to', () => {
    const result = dateRangeSchema.parse({});
    expect(result.from).toBeUndefined();
    expect(result.to).toBeUndefined();
  });

  it('should accept only from without to', () => {
    const result = dateRangeSchema.parse({ from: '2024-01-01' });
    expect(result.from).toBe('2024-01-01');
    expect(result.to).toBeUndefined();
  });

  it('should reject invalid date formats', () => {
    const result = dateRangeSchema.safeParse({ from: 'not-a-date' });
    expect(result.success).toBe(false);
  });

  it('should reject partial date strings', () => {
    const result = dateRangeSchema.safeParse({ from: '2024-02' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: UUID Schema
// ---------------------------------------------------------------------------

describe('uuidSchema', () => {
  it('should accept a valid UUID v4', () => {
    const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(true);
  });

  it('should reject non-UUID strings', () => {
    const result = uuidSchema.safeParse('not-a-uuid');
    expect(result.success).toBe(false);
  });

  it('should reject empty string', () => {
    const result = uuidSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: parseSearchParams
// ---------------------------------------------------------------------------

describe('parseSearchParams', () => {
  it('should parse valid search params against schema', () => {
    const result = parseSearchParams(
      'http://localhost:3000/api/calls?page=2&limit=50',
      paginationSchema
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should apply defaults for missing params', () => {
    const result = parseSearchParams(
      'http://localhost:3000/api/calls',
      paginationSchema
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(25);
    }
  });

  it('should return error response for invalid params', () => {
    const result = parseSearchParams(
      'http://localhost:3000/api/calls?page=-1',
      paginationSchema
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
    }
  });

  it('should return VALIDATION_ERROR code in error response', async () => {
    const result = parseSearchParams(
      'http://localhost:3000/api/calls?limit=9999',
      paginationSchema
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Invalid query parameters');
      expect(body.error.details).toBeDefined();
    }
  });

  it('should accept a URL object instead of string', () => {
    const url = new URL('http://localhost:3000/api/calls?page=3');
    const result = parseSearchParams(url, paginationSchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it('should work with custom schemas', () => {
    const customSchema = z.object({
      search: z.string().min(1),
    });

    const result = parseSearchParams(
      'http://localhost:3000/api/search?search=hello',
      customSchema
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe('hello');
    }
  });
});

// ---------------------------------------------------------------------------
// Test: parseBody
// ---------------------------------------------------------------------------

describe('parseBody', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  });

  it('should parse a valid JSON body', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
    });

    const result = await parseBody(request, testSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('John');
      expect(result.data.email).toBe('john@example.com');
    }
  });

  it('should return INVALID_JSON for non-JSON body', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json at all',
    });

    const result = await parseBody(request, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(body.error.code).toBe('INVALID_JSON');
      expect(body.error.message).toBe('Request body must be valid JSON');
      expect(result.response.status).toBe(400);
    }
  });

  it('should return VALIDATION_ERROR when body does not match schema', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '', email: 'not-an-email' }),
    });

    const result = await parseBody(request, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Invalid request body');
      expect(body.error.details).toBeDefined();
      expect(result.response.status).toBe(400);
    }
  });

  it('should return VALIDATION_ERROR for missing required fields', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const result = await parseBody(request, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
    }
  });

  it('should return INVALID_JSON for empty body', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '',
    });

    const result = await parseBody(request, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(body.error.code).toBe('INVALID_JSON');
    }
  });
});

// ---------------------------------------------------------------------------
// Test: paginatedResponse
// ---------------------------------------------------------------------------

describe('paginatedResponse', () => {
  it('should build correct paginated response structure', async () => {
    const data = [{ id: '1' }, { id: '2' }];
    const response = paginatedResponse(data, 50, 1, 25);

    const body = await response.json();
    expect(body.data).toEqual(data);
    expect(body.meta.total).toBe(50);
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(25);
    expect(body.meta.pageCount).toBe(2); // ceil(50/25)
  });

  it('should calculate pageCount correctly with remainder', async () => {
    const response = paginatedResponse([], 51, 1, 25);
    const body = await response.json();
    expect(body.meta.pageCount).toBe(3); // ceil(51/25) = 3
  });

  it('should handle zero total', async () => {
    const response = paginatedResponse([], 0, 1, 25);
    const body = await response.json();
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
    expect(body.meta.pageCount).toBe(0); // ceil(0/25) = 0
  });

  it('should handle single-page result', async () => {
    const data = [{ id: '1' }];
    const response = paginatedResponse(data, 1, 1, 25);
    const body = await response.json();
    expect(body.meta.pageCount).toBe(1);
  });

  it('should return a valid Response with 200 status', () => {
    const response = paginatedResponse([], 0, 1, 25);
    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Test: notFoundResponse
// ---------------------------------------------------------------------------

describe('notFoundResponse', () => {
  it('should return 404 status', () => {
    const response = notFoundResponse();
    expect(response.status).toBe(404);
  });

  it('should include default resource message', async () => {
    const response = notFoundResponse();
    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Resource not found');
  });

  it('should include custom resource name in message', async () => {
    const response = notFoundResponse('Call');
    const body = await response.json();
    expect(body.error.message).toBe('Call not found');
  });
});

// ---------------------------------------------------------------------------
// Test: serverErrorResponse
// ---------------------------------------------------------------------------

describe('serverErrorResponse', () => {
  it('should return 500 status', () => {
    const response = serverErrorResponse();
    expect(response.status).toBe(500);
  });

  it('should include default error message', async () => {
    const response = serverErrorResponse();
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Internal server error');
  });

  it('should include custom error message', async () => {
    const response = serverErrorResponse('Database connection failed');
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Database connection failed');
  });
});
