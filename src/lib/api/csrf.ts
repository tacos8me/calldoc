// ─── CSRF Protection Middleware ──────────────────────────────────────────────
// Validates the Origin / Referer header on mutating requests (POST, PUT, DELETE)
// to protect against cross-site request forgery attacks.
//
// Usage in route handlers:
//
//   import { validateCsrf } from '@/lib/api/csrf';
//
//   export async function POST(request: NextRequest) {
//     const csrfError = validateCsrf(request);
//     if (csrfError) return csrfError;
//     // ... handle request
//   }

import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Routes that are exempt from CSRF checks (external callbacks)
// ---------------------------------------------------------------------------

const CSRF_EXEMPT_PATHS = [
  '/api/auth/callback/saml',
  '/api/auth/saml',
];

/**
 * Check whether a pathname matches one of the CSRF-exempt routes.
 * Uses startsWith so nested callback paths (e.g. /api/auth/saml/callback) are
 * also covered.
 */
function isExemptPath(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some((exempt) => pathname.startsWith(exempt));
}

/**
 * Check whether a path matches the transcript callback pattern:
 * /api/recordings/{id}/transcript/callback
 */
function isTranscriptCallback(pathname: string): boolean {
  return /^\/api\/recordings\/[^/]+\/transcript\/callback/.test(pathname);
}

// ---------------------------------------------------------------------------
// Origin / Referer Validation
// ---------------------------------------------------------------------------

/**
 * Extracts the host (hostname:port) from an Origin or Referer header value.
 * Returns null if the header is missing or unparseable.
 */
function extractHost(headerValue: string | null): string | null {
  if (!headerValue) return null;
  try {
    const url = new URL(headerValue);
    return url.host; // includes port if non-default
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates the CSRF token (Origin / Referer header) for mutating requests.
 *
 * Returns `null` if validation passes (request is safe to process).
 * Returns a `NextResponse` with 403 status if validation fails — the caller
 * should return this response immediately.
 *
 * Only validates POST, PUT, and DELETE methods. GET / HEAD / OPTIONS are
 * always allowed through.
 */
export function validateCsrf(request: NextRequest): NextResponse | null {
  // Only check mutating methods
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null;
  }

  // Skip CSRF check for exempt paths (external callbacks)
  const pathname = request.nextUrl.pathname;
  if (isExemptPath(pathname) || isTranscriptCallback(pathname)) {
    return null;
  }

  // Determine the expected host from the request itself
  const expectedHost = request.nextUrl.host; // hostname:port from the incoming request

  // Check Origin header first (most reliable), then fall back to Referer
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  const originHost = extractHost(origin);
  const refererHost = extractHost(referer);

  // If neither header is present, reject the request
  if (!originHost && !refererHost) {
    return NextResponse.json(
      {
        error: {
          code: 'CSRF_VALIDATION_FAILED',
          message: 'Invalid origin',
        },
      },
      { status: 403 }
    );
  }

  // Validate that at least one header matches the expected host
  const matchesOrigin = originHost === expectedHost;
  const matchesReferer = refererHost === expectedHost;

  if (!matchesOrigin && !matchesReferer) {
    return NextResponse.json(
      {
        error: {
          code: 'CSRF_VALIDATION_FAILED',
          message: 'Invalid origin',
        },
      },
      { status: 403 }
    );
  }

  // Validation passed
  return null;
}
