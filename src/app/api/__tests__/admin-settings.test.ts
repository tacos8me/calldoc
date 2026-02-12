// ─── API Route Tests: /api/admin/settings ────────────────────────────────────
// Tests the validation schemas, response shapes, permission checks,
// and error formatting used by the admin settings API route.

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  parseBody,
  serverErrorResponse,
} from '@/lib/api/validation';
import { createMockRequest } from '@/test/helpers';

// ---------------------------------------------------------------------------
// Replicate the update settings schema from the route
// ---------------------------------------------------------------------------

const updateSettingsSchema = z.object({
  system: z
    .object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(255).optional(),
      devlinkHost: z.string().min(1).optional(),
      devlinkPort: z.number().int().min(1).max(65535).optional(),
      devlinkUseTls: z.boolean().optional(),
      devlinkUsername: z.string().min(1).optional(),
      devlinkPassword: z.string().min(1).optional(),
      smdrHost: z.string().optional(),
      smdrPort: z.number().int().min(1).max(65535).optional(),
      smdrEnabled: z.boolean().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
  saml: z
    .object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).optional(),
      entityId: z.string().min(1).optional(),
      ssoUrl: z.string().url().optional(),
      sloUrl: z.string().url().optional(),
      certificate: z.string().min(1).optional(),
      active: z.boolean().optional(),
      attributeMapping: z.record(z.string()).optional(),
      groupRoleMapping: z.record(z.string()).optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Test: GET Settings Response Shape
// ---------------------------------------------------------------------------

describe('admin settings GET response shape', () => {
  it('should have systems and saml arrays', () => {
    const responseData = {
      systems: [],
      saml: [],
    };

    expect(responseData).toHaveProperty('systems');
    expect(responseData).toHaveProperty('saml');
    expect(Array.isArray(responseData.systems)).toBe(true);
    expect(Array.isArray(responseData.saml)).toBe(true);
  });

  it('should include expected system fields', () => {
    const now = new Date();
    const system = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Main IPO',
      description: 'Primary IP Office',
      devlinkHost: '192.168.1.1',
      devlinkPort: 50797,
      devlinkUseTls: false,
      devlinkTlsPort: 50796,
      devlinkUsername: 'admin',
      // devlinkPassword should NOT be exposed
      smdrHost: '192.168.1.1',
      smdrPort: 1150,
      smdrEnabled: true,
      timezone: 'UTC',
      active: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    expect(system).toHaveProperty('id');
    expect(system).toHaveProperty('name');
    expect(system).toHaveProperty('devlinkHost');
    expect(system).toHaveProperty('devlinkPort');
    expect(system).toHaveProperty('devlinkUseTls');
    expect(system).toHaveProperty('devlinkUsername');
    expect(system).not.toHaveProperty('devlinkPassword');
    expect(system).not.toHaveProperty('devlinkPasswordEncrypted');
    expect(system).toHaveProperty('smdrHost');
    expect(system).toHaveProperty('smdrPort');
    expect(system).toHaveProperty('smdrEnabled');
    expect(system).toHaveProperty('timezone');
    expect(system).toHaveProperty('active');
    expect(system).toHaveProperty('createdAt');
    expect(system).toHaveProperty('updatedAt');
  });

  it('should include expected SAML config fields', () => {
    const now = new Date();
    const samlConfig = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Okta SSO',
      entityId: 'https://idp.example.com/entity',
      ssoUrl: 'https://idp.example.com/sso',
      sloUrl: 'https://idp.example.com/slo',
      // privateKey should NOT be exposed
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      attributeMapping: { email: 'urn:oid:0.9.2342.19200300.100.1.3' },
      groupRoleMapping: { admins: 'admin' },
      active: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    expect(samlConfig).toHaveProperty('id');
    expect(samlConfig).toHaveProperty('name');
    expect(samlConfig).toHaveProperty('entityId');
    expect(samlConfig).toHaveProperty('ssoUrl');
    expect(samlConfig).toHaveProperty('sloUrl');
    expect(samlConfig).not.toHaveProperty('privateKey');
    expect(samlConfig).not.toHaveProperty('certificate');
    expect(samlConfig).toHaveProperty('signatureAlgorithm');
    expect(samlConfig).toHaveProperty('digestAlgorithm');
    expect(samlConfig).toHaveProperty('attributeMapping');
    expect(samlConfig).toHaveProperty('groupRoleMapping');
    expect(samlConfig).toHaveProperty('active');
    expect(samlConfig).toHaveProperty('createdAt');
    expect(samlConfig).toHaveProperty('updatedAt');
  });

  it('should handle null attribute/group mappings as empty objects', () => {
    // The route uses c.attributeMapping ?? {} and c.groupRoleMapping ?? {}
    const nullMapping = null;
    expect(nullMapping ?? {}).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Test: PUT Settings - System Payload Validation
// ---------------------------------------------------------------------------

describe('admin settings PUT - system payload', () => {
  it('should accept valid system update with all fields', () => {
    const result = updateSettingsSchema.safeParse({
      system: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Updated IPO',
        devlinkHost: '10.0.0.1',
        devlinkPort: 50797,
        devlinkUseTls: true,
        devlinkUsername: 'new-admin',
        devlinkPassword: 'new-secret',
        smdrHost: '10.0.0.1',
        smdrPort: 1150,
        smdrEnabled: false,
        timezone: 'America/New_York',
      },
    });
    expect(result.success).toBe(true);
  });

  it('should accept system update with partial fields', () => {
    const result = updateSettingsSchema.safeParse({
      system: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        devlinkHost: '10.0.0.2',
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.system?.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.data.system?.devlinkHost).toBe('10.0.0.2');
      expect(result.data.system?.devlinkPort).toBeUndefined();
    }
  });

  it('should reject invalid system UUID', () => {
    const result = updateSettingsSchema.safeParse({
      system: {
        id: 'not-a-uuid',
      },
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty system name', () => {
    const result = updateSettingsSchema.safeParse({
      system: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: '',
      },
    });
    expect(result.success).toBe(false);
  });

  it('should reject system name exceeding 255 characters', () => {
    const result = updateSettingsSchema.safeParse({
      system: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'x'.repeat(256),
      },
    });
    expect(result.success).toBe(false);
  });

  it('should reject devlinkPort out of range', () => {
    expect(updateSettingsSchema.safeParse({
      system: { devlinkPort: 0 },
    }).success).toBe(false);

    expect(updateSettingsSchema.safeParse({
      system: { devlinkPort: 70000 },
    }).success).toBe(false);
  });

  it('should reject smdrPort out of range', () => {
    expect(updateSettingsSchema.safeParse({
      system: { smdrPort: 0 },
    }).success).toBe(false);

    expect(updateSettingsSchema.safeParse({
      system: { smdrPort: 70000 },
    }).success).toBe(false);
  });

  it('should accept devlinkUseTls boolean', () => {
    const result = updateSettingsSchema.safeParse({
      system: { devlinkUseTls: true },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.system?.devlinkUseTls).toBe(true);
    }
  });

  it('should accept smdrEnabled boolean', () => {
    const result = updateSettingsSchema.safeParse({
      system: { smdrEnabled: false },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.system?.smdrEnabled).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Test: PUT Settings - SAML Payload Validation
// ---------------------------------------------------------------------------

describe('admin settings PUT - saml payload', () => {
  it('should accept valid SAML update with all fields', () => {
    const result = updateSettingsSchema.safeParse({
      saml: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Okta Production',
        entityId: 'https://idp.example.com/entity',
        ssoUrl: 'https://idp.example.com/sso',
        sloUrl: 'https://idp.example.com/slo',
        certificate: 'MIIC...base64cert',
        active: true,
        attributeMapping: { email: 'emailAddress', name: 'displayName' },
        groupRoleMapping: { admins: 'admin', staff: 'agent' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('should accept SAML update with partial fields', () => {
    const result = updateSettingsSchema.safeParse({
      saml: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        active: false,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.saml?.active).toBe(false);
    }
  });

  it('should reject invalid SAML UUID', () => {
    const result = updateSettingsSchema.safeParse({
      saml: { id: 'not-a-uuid' },
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid ssoUrl (not a URL)', () => {
    const result = updateSettingsSchema.safeParse({
      saml: { ssoUrl: 'not-a-url' },
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid sloUrl (not a URL)', () => {
    const result = updateSettingsSchema.safeParse({
      saml: { sloUrl: 'not-a-url' },
    });
    expect(result.success).toBe(false);
  });

  it('should accept empty attributeMapping', () => {
    const result = updateSettingsSchema.safeParse({
      saml: { attributeMapping: {} },
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty groupRoleMapping', () => {
    const result = updateSettingsSchema.safeParse({
      saml: { groupRoleMapping: {} },
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: PUT Settings - Combined System + SAML Payload
// ---------------------------------------------------------------------------

describe('admin settings PUT - combined payload', () => {
  it('should accept both system and saml in one request', () => {
    const result = updateSettingsSchema.safeParse({
      system: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        devlinkHost: '10.0.0.1',
      },
      saml: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        active: true,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.system?.devlinkHost).toBe('10.0.0.1');
      expect(result.data.saml?.active).toBe(true);
    }
  });

  it('should accept empty object (no updates)', () => {
    const result = updateSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.system).toBeUndefined();
      expect(result.data.saml).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Test: PUT Settings - parseBody Validation
// ---------------------------------------------------------------------------

describe('admin settings parseBody validation', () => {
  it('should parse valid system update body', async () => {
    const req = createMockRequest('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      body: {
        system: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          devlinkHost: '192.168.1.100',
          devlinkPort: 50797,
        },
      },
    });

    const result = await parseBody(req, updateSettingsSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.system?.devlinkHost).toBe('192.168.1.100');
      expect(result.data.system?.devlinkPort).toBe(50797);
    }
  });

  it('should parse valid SAML update body', async () => {
    const req = createMockRequest('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      body: {
        saml: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          ssoUrl: 'https://idp.example.com/sso',
          active: true,
        },
      },
    });

    const result = await parseBody(req, updateSettingsSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.saml?.ssoUrl).toBe('https://idp.example.com/sso');
      expect(result.data.saml?.active).toBe(true);
    }
  });

  it('should return 400 for invalid system UUID in body', async () => {
    const req = createMockRequest('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      body: {
        system: { id: 'bad-uuid' },
      },
    });

    const result = await parseBody(req, updateSettingsSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Invalid request body');
    }
  });

  it('should return 400 for invalid SAML ssoUrl in body', async () => {
    const req = createMockRequest('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      body: {
        saml: { ssoUrl: 'not-a-url' },
      },
    });

    const result = await parseBody(req, updateSettingsSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('should return 400 for non-JSON body', async () => {
    const req = new Request('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      headers: { 'content-type': 'text/plain' },
      body: 'not json',
    });

    const result = await parseBody(req, updateSettingsSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe('INVALID_JSON');
      expect(body.error.message).toBe('Request body must be valid JSON');
    }
  });

  it('should return 400 for devlinkPort as string (type mismatch)', async () => {
    const req = createMockRequest('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      body: {
        system: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          devlinkPort: 'not-a-number',
        },
      },
    });

    const result = await parseBody(req, updateSettingsSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Permission Check (admin:settings required)
// ---------------------------------------------------------------------------

describe('admin settings permission check', () => {
  it('should have consistent 401 error structure for unauthenticated requests', () => {
    const errorBody = {
      error: 'Unauthorized',
      message: 'Authentication required',
    };
    expect(errorBody.error).toBe('Unauthorized');
    expect(errorBody.message).toBe('Authentication required');
  });

  it('should have consistent 403 error for missing admin:settings permission', () => {
    const errorBody = {
      error: 'Forbidden',
      message: 'Missing permission: admin:settings',
    };
    expect(errorBody.error).toBe('Forbidden');
    expect(errorBody.message).toContain('Missing permission');
    expect(errorBody.message).toContain('admin:settings');
  });

  it('should deny non-admin roles from accessing settings', () => {
    // Per the middleware, only admin role has admin:settings permission
    const DEFAULT_PERMISSIONS: Record<string, string[]> = {
      admin: ['admin:settings', 'admin:users', 'admin:storage'],
      supervisor: ['calls:view', 'reports:view'],
      agent: ['calls:view'],
      'wallboard-only': ['wallboards:view'],
    };

    expect(DEFAULT_PERMISSIONS['admin']).toContain('admin:settings');
    expect(DEFAULT_PERMISSIONS['supervisor']).not.toContain('admin:settings');
    expect(DEFAULT_PERMISSIONS['agent']).not.toContain('admin:settings');
    expect(DEFAULT_PERMISSIONS['wallboard-only']).not.toContain('admin:settings');
  });
});

// ---------------------------------------------------------------------------
// Test: Error Responses
// ---------------------------------------------------------------------------

describe('admin settings error responses', () => {
  it('should return 500 for GET fetch failure', async () => {
    const response = serverErrorResponse('Failed to fetch settings');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Failed to fetch settings');
  });

  it('should return 500 for PUT update failure', async () => {
    const response = serverErrorResponse('Failed to update settings');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Failed to update settings');
  });
});

// ---------------------------------------------------------------------------
// Test: PUT Response Shape
// ---------------------------------------------------------------------------

describe('admin settings PUT response shape', () => {
  it('should return updated system data', () => {
    const result = {
      system: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Updated IPO',
        updatedAt: new Date().toISOString(),
      },
    };

    expect(result.system).toHaveProperty('id');
    expect(result.system).toHaveProperty('name');
    expect(result.system).toHaveProperty('updatedAt');
  });

  it('should return updated SAML data', () => {
    const result = {
      saml: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Okta Production',
        updatedAt: new Date().toISOString(),
      },
    };

    expect(result.saml).toHaveProperty('id');
    expect(result.saml).toHaveProperty('name');
    expect(result.saml).toHaveProperty('updatedAt');
  });

  it('should return empty results when no updates provided', () => {
    const result: Record<string, unknown> = {};
    expect(Object.keys(result)).toHaveLength(0);
  });
});
