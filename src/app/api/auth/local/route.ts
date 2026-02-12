// ─── Local Admin Login Route ─────────────────────────────────────────────────
// POST /api/auth/local – username/password login for initial setup or when SAML isn't configured.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';
import { DEFAULT_PERMISSIONS } from '@/lib/auth/middleware';
import type { UserRole, Permission } from '@/types';

// ---------------------------------------------------------------------------
// In-memory rate limiting (per-IP, max 5 attempts/minute)
// ---------------------------------------------------------------------------

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count };
}

// ---------------------------------------------------------------------------
// Mock admin user for initial setup (in production, this comes from DB)
// ---------------------------------------------------------------------------

interface LocalUser {
  id: string;
  email: string;
  name: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  permissions: Permission[];
  groupAccess: string[];
  active: boolean;
}

// Default admin password: "admin" – hashed with bcrypt
const MOCK_ADMIN_HASH = bcrypt.hashSync('admin', 10);

const LOCAL_USERS: LocalUser[] = [
  {
    id: 'usr_admin_001',
    email: 'admin@calldoc.local',
    name: 'System Admin',
    username: 'admin',
    passwordHash: MOCK_ADMIN_HASH,
    role: 'admin',
    permissions: DEFAULT_PERMISSIONS.admin,
    groupAccess: [],
    active: true,
  },
];

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Too many login attempts. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
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

    // Find user by username
    const user = LOCAL_USERS.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.active
    );

    if (!user) {
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

    // Create session
    const cookieStore = await cookies();
    await createSession(cookieStore, {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      groupAccess: user.groupAccess,
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
    console.error('Local login error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
