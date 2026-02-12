// ─── Local Admin Login Route ─────────────────────────────────────────────────
// POST /api/auth/local – username/password login for initial setup or when SAML isn't configured.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { createSession } from '@/lib/auth';
import { DEFAULT_PERMISSIONS } from '@/lib/auth/middleware';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { createLogger } from '@/lib/logger';
import type { UserRole, Permission } from '@/types';

const log = createLogger({ service: 'auth-local' });

// ---------------------------------------------------------------------------
// Rate limit configuration: 5 attempts per 15 minutes per IP
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

// ---------------------------------------------------------------------------
// Default admin seeding – creates a default admin user if no users exist in DB
// ---------------------------------------------------------------------------

const DEFAULT_ADMIN_EMAIL = 'admin@calldoc.local';
const DEFAULT_ADMIN_PASSWORD = 'admin';

/**
 * Seeds a default admin user if the users table is completely empty.
 * This is a first-run convenience – a warning is logged so operators
 * know to change the password immediately.
 */
async function ensureDefaultAdminExists(): Promise<void> {
  const existingUsers = await db
    .select({ id: users.id })
    .from(users)
    .limit(1);

  if (existingUsers.length > 0) {
    return; // Users already exist, no seeding needed
  }

  log.warn(
    'No users found in the database. Creating default admin user. ' +
    'IMPORTANT: Change the default admin password immediately!',
    { email: DEFAULT_ADMIN_EMAIL }
  );

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  await db.insert(users).values({
    email: DEFAULT_ADMIN_EMAIL,
    name: 'System Admin',
    role: 'admin',
    passwordHash,
    groupAccess: [],
    permissions: DEFAULT_PERMISSIONS.admin as string[],
    active: true,
  });
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Rate limiting via Redis (works across horizontally-scaled instances)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const rateCheck = await checkRateLimit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_SECONDS);
  if (!rateCheck.allowed) {
    const retryAfterSeconds = Math.ceil((rateCheck.resetAt.getTime() - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Too many login attempts. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(retryAfterSeconds, 1)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Username and password are required.' },
        { status: 400 }
      );
    }

    // Ensure default admin exists on first-ever login attempt
    await ensureDefaultAdminExists();

    // Look up user by email (username is treated as email for DB-backed auth)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, username.toLowerCase()))
      .limit(1);

    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid username or password.' },
        {
          status: 401,
          headers: {
            'X-RateLimit-Remaining': String(rateCheck.remaining),
          },
        }
      );
    }

    // User must have a password hash for local auth (SSO-only users won't)
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid username or password.' },
        {
          status: 401,
          headers: {
            'X-RateLimit-Remaining': String(rateCheck.remaining),
          },
        }
      );
    }

    // Validate password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid username or password.' },
        {
          status: 401,
          headers: {
            'X-RateLimit-Remaining': String(rateCheck.remaining),
          },
        }
      );
    }

    // Resolve permissions: use DB permissions if present, otherwise fall back to role defaults
    const role = user.role as UserRole;
    const permissions: Permission[] = (
      user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0
        ? user.permissions
        : DEFAULT_PERMISSIONS[role] || []
    ) as Permission[];

    const groupAccess: string[] = (user.groupAccess as string[]) || [];

    // Update last login timestamp
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // Create session
    const cookieStore = await cookies();
    await createSession(cookieStore, {
      userId: user.id,
      email: user.email,
      name: user.name,
      role,
      permissions,
      groupAccess,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    log.error('Local login error', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
