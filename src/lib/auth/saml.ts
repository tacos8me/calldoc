// ─── SAML Authentication ─────────────────────────────────────────────────────
// Configures passport-saml strategy for Avaya IP Office SSO via Okta / ADFS.

import { Strategy as SamlStrategy, type Profile } from '@node-saml/passport-saml';
import type { UserRole } from '@/types';

// ---------------------------------------------------------------------------
// Env-driven config
// ---------------------------------------------------------------------------

const SAML_ENTRY_POINT = process.env.SAML_ENTRY_POINT || '';
const SAML_ISSUER = process.env.SAML_ISSUER || 'calldoc';
const SAML_CALLBACK_URL =
  process.env.SAML_CALLBACK_URL || 'http://localhost:3000/api/auth/callback/saml';
const SAML_CERT = process.env.SAML_CERT || '';

// ---------------------------------------------------------------------------
// Attribute mapping – configurable, sensible defaults for Okta / ADFS
// ---------------------------------------------------------------------------

export interface SamlAttributeMap {
  email: string;
  firstName: string;
  lastName: string;
  groups: string;
}

const DEFAULT_ATTRIBUTE_MAP: SamlAttributeMap = {
  email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
  lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
  groups: 'http://schemas.xmlsoap.org/claims/Group',
};

// ---------------------------------------------------------------------------
// Group → role mapping
// ---------------------------------------------------------------------------

export interface GroupRoleMapping {
  [groupName: string]: UserRole;
}

const DEFAULT_GROUP_ROLE_MAP: GroupRoleMapping = {
  'CallDoc Admins': 'admin',
  'CallDoc Supervisors': 'supervisor',
  'CallDoc Agents': 'agent',
  'CallDoc Wallboard': 'wallboard-only',
};

// ---------------------------------------------------------------------------
// Parsed SAML user
// ---------------------------------------------------------------------------

export interface SamlUser {
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: UserRole;
  groups: string[];
  nameId: string;
  sessionIndex: string | undefined;
}

// ---------------------------------------------------------------------------
// getSamlStrategy – returns a configured passport-saml strategy instance
// ---------------------------------------------------------------------------

let cachedStrategy: SamlStrategy | null = null;

export function getSamlStrategy(
  attributeMap: SamlAttributeMap = DEFAULT_ATTRIBUTE_MAP,
  groupRoleMap: GroupRoleMapping = DEFAULT_GROUP_ROLE_MAP
): SamlStrategy {
  if (cachedStrategy) return cachedStrategy;

  cachedStrategy = new SamlStrategy(
    {
      entryPoint: SAML_ENTRY_POINT,
      issuer: SAML_ISSUER,
      callbackUrl: SAML_CALLBACK_URL,
      idpCert: SAML_CERT,
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: true,
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    },
    // Verify callback
    (profile: Profile | null, done: (err: Error | null, user?: Record<string, unknown>) => void) => {
      if (!profile) {
        return done(new Error('No SAML profile received'));
      }

      try {
        const user = mapSamlProfile(profile, attributeMap, groupRoleMap);
        done(null, user as unknown as Record<string, unknown>);
      } catch (err) {
        done(err instanceof Error ? err : new Error('SAML profile mapping failed'));
      }
    },
    // Logout callback
    (profile: Profile | null, done: (err: Error | null, user?: Record<string, unknown>) => void) => {
      done(null);
    }
  );

  return cachedStrategy;
}

// ---------------------------------------------------------------------------
// mapSamlProfile – extract user data from SAML assertion attributes
// ---------------------------------------------------------------------------

function mapSamlProfile(
  profile: Profile,
  attributeMap: SamlAttributeMap,
  groupRoleMap: GroupRoleMapping
): SamlUser {
  const attrs = profile as Record<string, unknown>;

  const email =
    (getAttr(attrs, attributeMap.email) as string) ||
    profile.nameID ||
    '';
  const firstName = (getAttr(attrs, attributeMap.firstName) as string) || '';
  const lastName = (getAttr(attrs, attributeMap.lastName) as string) || '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || email;

  // Groups may be a string or array
  const rawGroups = getAttr(attrs, attributeMap.groups);
  const groups: string[] = Array.isArray(rawGroups)
    ? rawGroups.map(String)
    : typeof rawGroups === 'string'
      ? [rawGroups]
      : [];

  // Resolve role from groups (first matching group wins, priority: admin > supervisor > agent > wallboard)
  const role = resolveRole(groups, groupRoleMap);

  return {
    email,
    firstName,
    lastName,
    name,
    role,
    groups,
    nameId: profile.nameID || '',
    sessionIndex: profile.sessionIndex,
  };
}

function getAttr(profile: Record<string, unknown>, key: string): unknown {
  return profile[key] ?? undefined;
}

function resolveRole(groups: string[], mapping: GroupRoleMapping): UserRole {
  const rolePriority: UserRole[] = ['admin', 'supervisor', 'agent', 'wallboard-only'];

  for (const role of rolePriority) {
    for (const [group, mappedRole] of Object.entries(mapping)) {
      if (mappedRole === role && groups.includes(group)) {
        return role;
      }
    }
  }

  // Default to agent if no match
  return 'agent';
}

// ---------------------------------------------------------------------------
// generateMetadata – returns SP metadata XML for IdP configuration
// ---------------------------------------------------------------------------

export function generateMetadata(): string {
  const entityId = SAML_ISSUER;
  const acsUrl = SAML_CALLBACK_URL;

  return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  entityID="${escapeXml(entityId)}">
  <SPSSODescriptor
    AuthnRequestsSigned="true"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${escapeXml(acsUrl)}"
      index="1"
      isDefault="true"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ---------------------------------------------------------------------------
// Helper: check if SAML is configured
// ---------------------------------------------------------------------------

export function isSamlConfigured(): boolean {
  return Boolean(SAML_ENTRY_POINT && SAML_CERT);
}
