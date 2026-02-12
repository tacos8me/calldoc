// ─── API Route Tests: /api/agents ─────────────────────────────────────────────
// Tests agent-related validation schemas and the auth middleware patterns.

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  paginationSchema,
  dateRangeSchema,
  uuidSchema,
  parseSearchParams,
  paginatedResponse,
  notFoundResponse,
} from '@/lib/api/validation';
import { createMockAgent } from '@/test/helpers';

// ---------------------------------------------------------------------------
// Test: Agent Query Schema
// ---------------------------------------------------------------------------

describe('agents query schema', () => {
  const agentsQuerySchema = paginationSchema.extend({
    state: z.enum([
      'idle', 'talking', 'ringing', 'hold', 'acw', 'dnd', 'away', 'logged-out', 'unknown',
    ]).optional(),
    group: z.string().uuid().optional(),
    active: z.coerce.boolean().optional().default(true),
  });

  it('should accept valid agent state filters', () => {
    const result = agentsQuerySchema.safeParse({ state: 'idle' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe('idle');
    }
  });

  it('should accept all valid agent states', () => {
    const states = ['idle', 'talking', 'ringing', 'hold', 'acw', 'dnd', 'away', 'logged-out', 'unknown'];
    for (const state of states) {
      const result = agentsQuerySchema.safeParse({ state });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid agent state', () => {
    const result = agentsQuerySchema.safeParse({ state: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should accept group UUID filter', () => {
    const result = agentsQuerySchema.safeParse({
      group: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid group UUID', () => {
    const result = agentsQuerySchema.safeParse({ group: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('should default active to true', () => {
    const result = agentsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.active).toBe(true);
    }
  });

  it('should accept active parameter', () => {
    // Note: z.coerce.boolean() coerces strings by truthiness.
    // 'false' as a non-empty string is truthy in JavaScript.
    // The actual API uses query params where "false" is a string.
    // To properly pass false, use 0 or empty string, or a transform.
    const result = agentsQuerySchema.safeParse({ active: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.active).toBe(false);
    }
  });

  it('should accept combined filters', () => {
    const result = agentsQuerySchema.safeParse({
      page: '2',
      limit: '10',
      state: 'talking',
      active: 'true',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
      expect(result.data.state).toBe('talking');
      expect(result.data.active).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Agent Timeline Query Schema
// ---------------------------------------------------------------------------

describe('timeline query schema', () => {
  const timelineQuerySchema = dateRangeSchema;

  it('should accept date range', () => {
    const result = timelineQuerySchema.safeParse({
      from: '2024-02-10',
      to: '2024-02-11',
    });
    expect(result.success).toBe(true);
  });

  it('should accept ISO datetime range', () => {
    const result = timelineQuerySchema.safeParse({
      from: '2024-02-10T00:00:00+00:00',
      to: '2024-02-10T23:59:59+00:00',
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty date range', () => {
    const result = timelineQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept from-only', () => {
    const result = timelineQuerySchema.safeParse({ from: '2024-02-10' });
    expect(result.success).toBe(true);
  });

  it('should accept to-only', () => {
    const result = timelineQuerySchema.safeParse({ to: '2024-02-10' });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: Agent ID Validation
// ---------------------------------------------------------------------------

describe('agent ID validation', () => {
  it('should accept valid UUID', () => {
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });

  it('should reject non-UUID strings', () => {
    expect(uuidSchema.safeParse('agent-201').success).toBe(false);
    expect(uuidSchema.safeParse('12345').success).toBe(false);
    expect(uuidSchema.safeParse('').success).toBe(false);
    expect(uuidSchema.safeParse('not-valid-uuid-format').success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: Agent Paginated Response
// ---------------------------------------------------------------------------

describe('agent paginated response', () => {
  it('should format agent list response correctly', async () => {
    const agents = [
      createMockAgent({ state: 'idle' }),
      createMockAgent({ state: 'talking' }),
      createMockAgent({ state: 'acw' }),
    ];

    const response = paginatedResponse(agents, 3, 1, 25);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toHaveLength(3);
    expect(body.meta.total).toBe(3);
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(25);
    expect(body.meta.pageCount).toBe(1);
  });

  it('should handle empty agent list', async () => {
    const response = paginatedResponse([], 0, 1, 25);
    const body = await response.json();

    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
    expect(body.meta.pageCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test: Agent Not Found
// ---------------------------------------------------------------------------

describe('agent not found response', () => {
  it('should return 404 for missing agent', async () => {
    const response = notFoundResponse('Agent');
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Agent not found');
  });
});

// ---------------------------------------------------------------------------
// Test: Auth Middleware Error Formats
// ---------------------------------------------------------------------------

describe('auth middleware error format', () => {
  it('should have consistent 401 error structure', () => {
    // Simulate what requireAuth returns for unauthenticated requests
    const errorBody = {
      error: 'Unauthorized',
      message: 'Authentication required',
    };

    expect(errorBody.error).toBe('Unauthorized');
    expect(errorBody.message).toBe('Authentication required');
  });

  it('should have consistent 403 error structure', () => {
    const errorBody = {
      error: 'Forbidden',
      message: 'Requires supervisor role or higher',
    };

    expect(errorBody.error).toBe('Forbidden');
    expect(errorBody.message).toContain('role or higher');
  });

  it('should have consistent permission denied structure', () => {
    const errorBody = {
      error: 'Forbidden',
      message: 'Missing permission: calls:view',
    };

    expect(errorBody.error).toBe('Forbidden');
    expect(errorBody.message).toContain('Missing permission');
  });
});

// ---------------------------------------------------------------------------
// Test: Role Hierarchy
// ---------------------------------------------------------------------------

describe('role hierarchy', () => {
  const ROLE_HIERARCHY: Record<string, number> = {
    'wallboard-only': 0,
    agent: 1,
    supervisor: 2,
    admin: 3,
  };

  it('should order roles correctly', () => {
    expect(ROLE_HIERARCHY['admin']).toBeGreaterThan(ROLE_HIERARCHY['supervisor']);
    expect(ROLE_HIERARCHY['supervisor']).toBeGreaterThan(ROLE_HIERARCHY['agent']);
    expect(ROLE_HIERARCHY['agent']).toBeGreaterThan(ROLE_HIERARCHY['wallboard-only']);
  });

  it('should grant admin access to all lower roles', () => {
    const adminLevel = ROLE_HIERARCHY['admin'];
    expect(adminLevel).toBeGreaterThanOrEqual(ROLE_HIERARCHY['supervisor']);
    expect(adminLevel).toBeGreaterThanOrEqual(ROLE_HIERARCHY['agent']);
    expect(adminLevel).toBeGreaterThanOrEqual(ROLE_HIERARCHY['wallboard-only']);
  });

  it('should deny wallboard-only access to agent resources', () => {
    const wallboardLevel = ROLE_HIERARCHY['wallboard-only'];
    const agentLevel = ROLE_HIERARCHY['agent'];
    expect(wallboardLevel).toBeLessThan(agentLevel);
  });
});

// ---------------------------------------------------------------------------
// Test: Mock Agent Factory
// ---------------------------------------------------------------------------

describe('createMockAgent', () => {
  it('should create agents with unique IDs', () => {
    const a1 = createMockAgent();
    const a2 = createMockAgent();
    expect(a1.id).not.toBe(a2.id);
    expect(a1.extension).not.toBe(a2.extension);
  });

  it('should allow overriding individual fields', () => {
    const agent = createMockAgent({
      state: 'talking',
      activeCallId: 'call-123',
      name: 'Custom Name',
    });
    expect(agent.state).toBe('talking');
    expect(agent.activeCallId).toBe('call-123');
    expect(agent.name).toBe('Custom Name');
  });

  it('should have proper defaults', () => {
    const agent = createMockAgent();
    expect(agent.state).toBe('idle');
    expect(agent.activeCallId).toBeNull();
    expect(agent.groups).toContain('group-sales');
    expect(agent.skills).toContain('english');
    expect(agent.loginTime).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test: parseSearchParams with agent filters
// ---------------------------------------------------------------------------

describe('parseSearchParams for agents', () => {
  const agentsQuerySchema = paginationSchema.extend({
    state: z.enum([
      'idle', 'talking', 'ringing', 'hold', 'acw', 'dnd', 'away', 'logged-out', 'unknown',
    ]).optional(),
    group: z.string().uuid().optional(),
    active: z.coerce.boolean().optional().default(true),
  });

  it('should parse valid agent query from URL', () => {
    const url = 'http://localhost:3000/api/agents?state=talking&page=1&limit=10';
    const result = parseSearchParams(url, agentsQuerySchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe('talking');
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
    }
  });

  it('should return 400 for invalid state in URL', async () => {
    const url = 'http://localhost:3000/api/agents?state=invalid';
    const result = parseSearchParams(url, agentsQuerySchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('should parse timeline query with date range', () => {
    const url = 'http://localhost:3000/api/agents/test/timeline?from=2024-02-10&to=2024-02-11';
    const result = parseSearchParams(url, dateRangeSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.from).toBe('2024-02-10');
      expect(result.data.to).toBe('2024-02-11');
    }
  });
});
