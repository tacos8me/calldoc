// ─── Auth Middleware ─────────────────────────────────────────────────────────
// Provides auth guards for API routes and server components.

import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import {
  getSessionFromCookies,
  isSessionValid,
  touchSession,
  type SessionData,
} from './session';
import type { UserRole, Permission } from '@/types';

// ---------------------------------------------------------------------------
// Role hierarchy – higher index = more privilege
// ---------------------------------------------------------------------------

const ROLE_HIERARCHY: Record<UserRole, number> = {
  'wallboard-only': 0,
  agent: 1,
  supervisor: 2,
  admin: 3,
};

// ---------------------------------------------------------------------------
// Default permissions by role
// ---------------------------------------------------------------------------

const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'calls:view',
    'calls:cradle-to-grave',
    'reports:view',
    'reports:create',
    'reports:export',
    'recordings:view',
    'recordings:playback',
    'recordings:download',
    'recordings:delete',
    'recordings:score',
    'recordings:manage-rules',
    'wallboards:view',
    'wallboards:edit',
    'agents:view',
    'agents:change-state',
    'admin:users',
    'admin:settings',
    'admin:storage',
    'alerts:view',
    'alerts:manage',
    'admin:skills',
    'admin:connections',
  ],
  supervisor: [
    'calls:view',
    'calls:cradle-to-grave',
    'reports:view',
    'reports:create',
    'reports:export',
    'recordings:view',
    'recordings:playback',
    'recordings:download',
    'recordings:score',
    'wallboards:view',
    'wallboards:edit',
    'agents:view',
    'agents:change-state',
    'alerts:view',
  ],
  agent: [
    'calls:view',
    'recordings:view',
    'recordings:playback',
    'wallboards:view',
    'agents:view',
  ],
  'wallboard-only': [
    'wallboards:view',
  ],
};

export { DEFAULT_PERMISSIONS };

// ---------------------------------------------------------------------------
// getCurrentUser – return typed user data or null
// ---------------------------------------------------------------------------

export interface CurrentUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  groupAccess: string[];
}

/**
 * Returns the current authenticated user or null if not authenticated.
 * Should be called in server components or route handlers.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const session = await getSessionFromCookies(cookieStore);

    if (!isSessionValid(session)) {
      return null;
    }

    // Touch session to reset idle timer
    await touchSession(cookieStore);

    return {
      userId: session.userId!,
      email: session.email!,
      name: session.name!,
      role: session.role!,
      permissions: session.permissions || DEFAULT_PERMISSIONS[session.role!] || [],
      groupAccess: session.groupAccess || [],
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// requireAuth – for API route handlers, returns 401 if not authenticated
// ---------------------------------------------------------------------------

export type AuthResult =
  | { authenticated: true; user: CurrentUser }
  | { authenticated: false; response: NextResponse };

/**
 * Validate that the request has a valid session.
 * Usage in route handlers:
 *   const auth = await requireAuth();
 *   if (!auth.authenticated) return auth.response;
 *   const user = auth.user;
 */
export async function requireAuth(): Promise<AuthResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  return { authenticated: true, user };
}

// ---------------------------------------------------------------------------
// requireRole – check minimum role level
// ---------------------------------------------------------------------------

export type RoleResult =
  | { authorized: true; user: CurrentUser }
  | { authorized: false; response: NextResponse };

/**
 * Check that the authenticated user has at least the specified role.
 */
export async function requireRole(minRole: UserRole): Promise<RoleResult> {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return { authorized: false, response: auth.response };
  }

  const userLevel = ROLE_HIERARCHY[auth.user.role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

  if (userLevel < requiredLevel) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: 'Forbidden',
          message: `Requires ${minRole} role or higher`,
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user: auth.user };
}

// ---------------------------------------------------------------------------
// requirePermission – check a specific permission
// ---------------------------------------------------------------------------

export type PermissionResult =
  | { authorized: true; user: CurrentUser }
  | { authorized: false; response: NextResponse };

/**
 * Check that the authenticated user has a specific permission.
 */
export async function requirePermission(permission: Permission): Promise<PermissionResult> {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return { authorized: false, response: auth.response };
  }

  const userPermissions = auth.user.permissions;
  if (!userPermissions.includes(permission)) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: 'Forbidden',
          message: `Missing permission: ${permission}`,
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user: auth.user };
}

// ---------------------------------------------------------------------------
// Edge middleware helper for protecting pages
// ---------------------------------------------------------------------------

/**
 * For use in Next.js middleware.ts to protect page routes.
 * Returns a redirect response to login if not authenticated.
 */
export function createAuthRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
