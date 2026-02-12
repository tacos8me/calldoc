// ─── /api/admin/settings ─────────────────────────────────────────────────────
// GET: Get system settings (DevLink3 config, SMDR config, SAML config)
// PUT: Update settings

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { systems, samlConfigs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { parseBody, serverErrorResponse } from '@/lib/api/validation';

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

export async function GET(request: NextRequest) {
  const auth = await requirePermission('admin:settings');
  if (!auth.authorized) return auth.response;

  try {
    // Fetch all systems
    const allSystems = await db.select().from(systems);

    // Fetch SAML configs
    const saml = await db.select().from(samlConfigs);

    return NextResponse.json({
      data: {
        systems: allSystems.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          devlinkHost: s.devlinkHost,
          devlinkPort: s.devlinkPort,
          devlinkUseTls: s.devlinkUseTls,
          devlinkTlsPort: s.devlinkTlsPort,
          devlinkUsername: s.devlinkUsername,
          // Do NOT expose password in response
          smdrHost: s.smdrHost,
          smdrPort: s.smdrPort,
          smdrEnabled: s.smdrEnabled,
          timezone: s.timezone,
          active: s.active,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
        saml: saml.map((c) => ({
          id: c.id,
          name: c.name,
          entityId: c.entityId,
          ssoUrl: c.ssoUrl,
          sloUrl: c.sloUrl,
          // Do NOT expose private key
          signatureAlgorithm: c.signatureAlgorithm,
          digestAlgorithm: c.digestAlgorithm,
          attributeMapping: c.attributeMapping ?? {},
          groupRoleMapping: c.groupRoleMapping ?? {},
          active: c.active,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/settings error:', error);
    return serverErrorResponse('Failed to fetch settings');
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission('admin:settings');
  if (!auth.authorized) return auth.response;

  const parsed = await parseBody(request, updateSettingsSchema);
  if (!parsed.success) return parsed.response;

  try {
    const results: Record<string, unknown> = {};

    // Update system configuration
    if (parsed.data.system) {
      const sys = parsed.data.system;
      if (sys.id) {
        const updateValues: Record<string, unknown> = { updatedAt: new Date() };
        if (sys.name !== undefined) updateValues.name = sys.name;
        if (sys.devlinkHost !== undefined) updateValues.devlinkHost = sys.devlinkHost;
        if (sys.devlinkPort !== undefined) updateValues.devlinkPort = sys.devlinkPort;
        if (sys.devlinkUseTls !== undefined) updateValues.devlinkUseTls = sys.devlinkUseTls;
        if (sys.devlinkUsername !== undefined) updateValues.devlinkUsername = sys.devlinkUsername;
        if (sys.devlinkPassword !== undefined) updateValues.devlinkPasswordEncrypted = sys.devlinkPassword;
        if (sys.smdrHost !== undefined) updateValues.smdrHost = sys.smdrHost;
        if (sys.smdrPort !== undefined) updateValues.smdrPort = sys.smdrPort;
        if (sys.smdrEnabled !== undefined) updateValues.smdrEnabled = sys.smdrEnabled;
        if (sys.timezone !== undefined) updateValues.timezone = sys.timezone;

        const [updated] = await db
          .update(systems)
          .set(updateValues)
          .where(eq(systems.id, sys.id))
          .returning();

        results.system = { id: updated.id, name: updated.name, updatedAt: updated.updatedAt.toISOString() };
      }
    }

    // Update SAML configuration
    if (parsed.data.saml) {
      const saml = parsed.data.saml;
      if (saml.id) {
        const updateValues: Record<string, unknown> = { updatedAt: new Date() };
        if (saml.name !== undefined) updateValues.name = saml.name;
        if (saml.entityId !== undefined) updateValues.entityId = saml.entityId;
        if (saml.ssoUrl !== undefined) updateValues.ssoUrl = saml.ssoUrl;
        if (saml.sloUrl !== undefined) updateValues.sloUrl = saml.sloUrl;
        if (saml.certificate !== undefined) updateValues.certificate = saml.certificate;
        if (saml.active !== undefined) updateValues.active = saml.active;
        if (saml.attributeMapping !== undefined) updateValues.attributeMapping = saml.attributeMapping;
        if (saml.groupRoleMapping !== undefined) updateValues.groupRoleMapping = saml.groupRoleMapping;

        const [updated] = await db
          .update(samlConfigs)
          .set(updateValues)
          .where(eq(samlConfigs.id, saml.id))
          .returning();

        results.saml = { id: updated.id, name: updated.name, updatedAt: updated.updatedAt.toISOString() };
      }
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error);
    return serverErrorResponse('Failed to update settings');
  }
}
