// ─── Session Management (iron-session) ──────────────────────────────────────
// Cookie-based sessions for CallDoc auth. No JWT, no next-auth.

import { getIronSession, type IronSession } from 'iron-session';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import type { NextRequest } from 'next/server';
import type { UserRole, Permission } from '@/types';

// ---------------------------------------------------------------------------
// Session data shape
// ---------------------------------------------------------------------------

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  groupAccess: string[];
  lastActivity: number; // unix ms – used for idle timeout
}

// ---------------------------------------------------------------------------
// Config constants
// ---------------------------------------------------------------------------

const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production-at-least-32-chars!';
const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE || '43200', 10); // 12 hours default
const SESSION_IDLE_TIMEOUT = parseInt(process.env.SESSION_IDLE_TIMEOUT || '1800', 10); // 30 min default
const COOKIE_NAME = 'calldoc.sid';

export const sessionOptions = {
  password: SESSION_SECRET,
  cookieName: COOKIE_NAME,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE,
    path: '/',
  },
};

// ---------------------------------------------------------------------------
// getSession – read & validate session from a request
// ---------------------------------------------------------------------------

/**
 * Get the current session from a NextRequest.
 * Returns the IronSession instance. Check `.userId` to determine if authenticated.
 */
export async function getSession(
  req: NextRequest
): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(req, new Response(), sessionOptions);
  return session;
}

/**
 * Get session from cookies (for server components / route handlers that have
 * access to `cookies()` from next/headers).
 */
export async function getSessionFromCookies(
  cookieStore: ReadonlyRequestCookies
): Promise<IronSession<SessionData>> {
  // iron-session v8 supports cookies() directly
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}

// ---------------------------------------------------------------------------
// createSession – set session data after successful login
// ---------------------------------------------------------------------------

export interface CreateSessionInput {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  groupAccess: string[];
}

/**
 * Create a new authenticated session. Must be called within a route handler
 * where you have access to a Response (or cookies()).
 */
export async function createSession(
  cookieStore: ReadonlyRequestCookies,
  user: CreateSessionInput
): Promise<void> {
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  session.userId = user.userId;
  session.email = user.email;
  session.name = user.name;
  session.role = user.role;
  session.permissions = user.permissions;
  session.groupAccess = user.groupAccess;
  session.lastActivity = Date.now();

  await session.save();
}

// ---------------------------------------------------------------------------
// destroySession – clear the session cookie
// ---------------------------------------------------------------------------

export async function destroySession(
  cookieStore: ReadonlyRequestCookies
): Promise<void> {
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.destroy();
}

// ---------------------------------------------------------------------------
// validateSession – check if session is still valid (not expired / idle)
// ---------------------------------------------------------------------------

export function isSessionValid(session: SessionData | Partial<SessionData>): boolean {
  if (!session.userId) return false;

  const now = Date.now();
  const lastActivity = session.lastActivity || 0;
  const idleMs = SESSION_IDLE_TIMEOUT * 1000;

  // Check idle timeout
  if (now - lastActivity > idleMs) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// touchSession – update lastActivity to prevent idle timeout
// ---------------------------------------------------------------------------

export async function touchSession(
  cookieStore: ReadonlyRequestCookies
): Promise<void> {
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (session.userId) {
    session.lastActivity = Date.now();
    await session.save();
  }
}

export { SESSION_MAX_AGE, SESSION_IDLE_TIMEOUT, COOKIE_NAME };
