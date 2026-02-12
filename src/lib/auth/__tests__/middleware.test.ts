// ─── Auth Middleware Tests ───────────────────────────────────────────────────
// Tests the auth guard functions in isolation by mocking session management.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock external modules BEFORE importing the middleware
// ---------------------------------------------------------------------------

// Mock next/headers cookies()
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

// Mock session management
const mockGetSessionFromCookies = vi.fn().mockResolvedValue({});
const mockIsSessionValid = vi.fn().mockReturnValue(false);
const mockTouchSession = vi.fn().mockResolvedValue(undefined);

vi.mock('../session', () => ({
  getSessionFromCookies: (...args: unknown[]) => mockGetSessionFromCookies(...args),
  isSessionValid: (...args: unknown[]) => mockIsSessionValid(...args),
  touchSession: (...args: unknown[]) => mockTouchSession(...args),
}));

// Now import the middleware functions
import {
  getCurrentUser,
  requireAuth,
  requireRole,
  requirePermission,
  DEFAULT_PERMISSIONS,
} from '../middleware';

// ---------------------------------------------------------------------------
// Helper: Create a valid session object
// ---------------------------------------------------------------------------

function createValidSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    userId: 'user-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    permissions: DEFAULT_PERMISSIONS.admin,
    groupAccess: [],
    lastActivity: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test: getCurrentUser
// ---------------------------------------------------------------------------

describe('getCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when session is not valid', async () => {
    mockIsSessionValid.mockReturnValue(false);
    mockGetSessionFromCookies.mockResolvedValue({});

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('should return user data when session is valid', async () => {
    const session = createValidSession();
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.userId).toBe('user-1');
    expect(user!.email).toBe('admin@example.com');
    expect(user!.name).toBe('Admin User');
    expect(user!.role).toBe('admin');
  });

  it('should touch session to reset idle timer', async () => {
    const session = createValidSession();
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    await getCurrentUser();
    expect(mockTouchSession).toHaveBeenCalledOnce();
  });

  it('should use DEFAULT_PERMISSIONS when session has no permissions', async () => {
    const session = createValidSession({ permissions: undefined });
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.permissions).toEqual(DEFAULT_PERMISSIONS.admin);
  });

  it('should use session permissions when present', async () => {
    const customPermissions = ['calls:view', 'recordings:view'] as const;
    const session = createValidSession({ permissions: [...customPermissions] });
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.permissions).toEqual([...customPermissions]);
  });

  it('should return null when getSessionFromCookies throws', async () => {
    mockGetSessionFromCookies.mockRejectedValue(new Error('Cookie error'));

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('should return empty groupAccess when not in session', async () => {
    const session = createValidSession({ groupAccess: undefined });
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.groupAccess).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Test: requireAuth
// ---------------------------------------------------------------------------

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return authenticated=true with user when session is valid', async () => {
    const session = createValidSession();
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    const result = await requireAuth();
    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.user.userId).toBe('user-1');
      expect(result.user.email).toBe('admin@example.com');
    }
  });

  it('should return authenticated=false with 401 when not authenticated', async () => {
    mockIsSessionValid.mockReturnValue(false);
    mockGetSessionFromCookies.mockResolvedValue({});

    const result = await requireAuth();
    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toBe('Authentication required');
    }
  });
});

// ---------------------------------------------------------------------------
// Test: requireRole
// ---------------------------------------------------------------------------

describe('requireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return authorized=true when user role meets minimum', async () => {
    const session = createValidSession({ role: 'admin' });
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    const result = await requireRole('supervisor');
    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.user.role).toBe('admin');
    }
  });

  it('should return authorized=true when user role equals minimum', async () => {
    const session = createValidSession({ role: 'supervisor', permissions: DEFAULT_PERMISSIONS.supervisor });
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    const result = await requireRole('supervisor');
    expect(result.authorized).toBe(true);
  });

  it('should return authorized=false with 403 when role is below minimum', async () => {
    const session = createValidSession({ role: 'agent', permissions: DEFAULT_PERMISSIONS.agent });
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    const result = await requireRole('admin');
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(403);
      const body = await result.response.json();
      expect(body.error).toBe('Forbidden');
      expect(body.message).toContain('admin');
    }
  });

  it('should return authorized=false with 401 when not authenticated', async () => {
    mockIsSessionValid.mockReturnValue(false);
    mockGetSessionFromCookies.mockResolvedValue({});

    const result = await requireRole('agent');
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it('should respect full role hierarchy: wallboard-only < agent < supervisor < admin', async () => {
    // wallboard-only trying to access agent-level
    const session1 = createValidSession({ role: 'wallboard-only', permissions: DEFAULT_PERMISSIONS['wallboard-only'] });
    mockGetSessionFromCookies.mockResolvedValue(session1);
    mockIsSessionValid.mockReturnValue(true);

    const result1 = await requireRole('agent');
    expect(result1.authorized).toBe(false);

    // agent trying to access supervisor-level
    const session2 = createValidSession({ role: 'agent', permissions: DEFAULT_PERMISSIONS.agent });
    mockGetSessionFromCookies.mockResolvedValue(session2);

    const result2 = await requireRole('supervisor');
    expect(result2.authorized).toBe(false);

    // supervisor trying to access admin-level
    const session3 = createValidSession({ role: 'supervisor', permissions: DEFAULT_PERMISSIONS.supervisor });
    mockGetSessionFromCookies.mockResolvedValue(session3);

    const result3 = await requireRole('admin');
    expect(result3.authorized).toBe(false);
  });

  it('should allow admin access to all role levels', async () => {
    const session = createValidSession({ role: 'admin' });
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    for (const role of ['wallboard-only', 'agent', 'supervisor', 'admin'] as const) {
      const result = await requireRole(role);
      expect(result.authorized).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Test: requirePermission
// ---------------------------------------------------------------------------

describe('requirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return authorized=true when user has the permission', async () => {
    const session = createValidSession({
      permissions: ['calls:view', 'recordings:view'],
    });
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    const result = await requirePermission('calls:view');
    expect(result.authorized).toBe(true);
  });

  it('should return authorized=false with 403 when user lacks the permission', async () => {
    const session = createValidSession({
      permissions: ['calls:view'],
    });
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    const result = await requirePermission('admin:users');
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(403);
      const body = await result.response.json();
      expect(body.error).toBe('Forbidden');
      expect(body.message).toContain('admin:users');
    }
  });

  it('should return authorized=false with 401 when not authenticated', async () => {
    mockIsSessionValid.mockReturnValue(false);
    mockGetSessionFromCookies.mockResolvedValue({});

    const result = await requirePermission('calls:view');
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it('should handle empty permissions array', async () => {
    const session = createValidSession({ permissions: [] });
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    const result = await requirePermission('calls:view');
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(403);
    }
  });

  it('admin should have access to all standard admin permissions', async () => {
    const session = createValidSession({ role: 'admin' });
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    const result = await requirePermission('admin:users');
    expect(result.authorized).toBe(true);
  });

  it('agent should not have access to admin permissions', async () => {
    const session = createValidSession({
      role: 'agent',
      permissions: DEFAULT_PERMISSIONS.agent,
    });
    mockGetSessionFromCookies.mockResolvedValue(session);
    mockIsSessionValid.mockReturnValue(true);

    const result = await requirePermission('admin:users');
    expect(result.authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: DEFAULT_PERMISSIONS
// ---------------------------------------------------------------------------

describe('DEFAULT_PERMISSIONS', () => {
  it('should define permissions for all four roles', () => {
    expect(DEFAULT_PERMISSIONS).toHaveProperty('admin');
    expect(DEFAULT_PERMISSIONS).toHaveProperty('supervisor');
    expect(DEFAULT_PERMISSIONS).toHaveProperty('agent');
    expect(DEFAULT_PERMISSIONS).toHaveProperty('wallboard-only');
  });

  it('admin should have the most permissions', () => {
    expect(DEFAULT_PERMISSIONS.admin.length).toBeGreaterThan(DEFAULT_PERMISSIONS.supervisor.length);
  });

  it('supervisor should have more permissions than agent', () => {
    expect(DEFAULT_PERMISSIONS.supervisor.length).toBeGreaterThan(DEFAULT_PERMISSIONS.agent.length);
  });

  it('wallboard-only should have the fewest permissions', () => {
    expect(DEFAULT_PERMISSIONS['wallboard-only'].length).toBe(1);
    expect(DEFAULT_PERMISSIONS['wallboard-only']).toContain('wallboards:view');
  });

  it('agent should have calls:view but not admin:users', () => {
    expect(DEFAULT_PERMISSIONS.agent).toContain('calls:view');
    expect(DEFAULT_PERMISSIONS.agent).not.toContain('admin:users');
  });
});
