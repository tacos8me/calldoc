// ─── Shared API Validation Helpers ───────────────────────────────────────────
// Common Zod schemas and parsing utilities for API route handlers.

import { z } from 'zod';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Common Zod Schemas
// ---------------------------------------------------------------------------

/** Pagination query params: page (1-indexed) and limit (items per page). */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(25),
});

/** Sort query params: field name and order direction. */
export const sortSchema = z.object({
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/** Date range query params: from and to as ISO date strings. */
export const dateRangeSchema = z.object({
  from: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  to: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

/** UUID parameter validation. */
export const uuidSchema = z.string().uuid();

// ---------------------------------------------------------------------------
// Helper: Parse URL Search Params with a Zod Schema
// ---------------------------------------------------------------------------

/**
 * Parses URL search params against a Zod schema.
 * Returns either the parsed data or a NextResponse error.
 */
export function parseSearchParams<T extends z.ZodType>(
  url: string | URL,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; response: NextResponse } {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  const params: Record<string, string> = {};

  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: result.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

// ---------------------------------------------------------------------------
// Helper: Parse Request Body with a Zod Schema
// ---------------------------------------------------------------------------

/**
 * Parses a request JSON body against a Zod schema.
 * Returns either the parsed data or a NextResponse error.
 */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: NextResponse }> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
          },
        },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: result.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

// ---------------------------------------------------------------------------
// Helper: Build Paginated Response
// ---------------------------------------------------------------------------

/**
 * Builds a standard paginated response envelope.
 */
export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return NextResponse.json({
    data,
    meta: {
      total,
      page,
      limit,
      pageCount: Math.ceil(total / limit),
    },
  });
}

// ---------------------------------------------------------------------------
// Helper: Error Responses
// ---------------------------------------------------------------------------

export function notFoundResponse(resource: string = 'Resource') {
  return NextResponse.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: `${resource} not found`,
      },
    },
    { status: 404 }
  );
}

export function serverErrorResponse(message: string = 'Internal server error') {
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message,
      },
    },
    { status: 500 }
  );
}
