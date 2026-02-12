// ─── SAML Auth Route Handler ─────────────────────────────────────────────────
// Handles: /api/auth/login, /api/auth/callback/saml, /api/auth/metadata, /api/auth/logout

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  generateMetadata,
  isSamlConfigured,
  createSession,
  destroySession,
} from '@/lib/auth';
import { DEFAULT_PERMISSIONS } from '@/lib/auth/middleware';
import type { UserRole } from '@/types';

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ saml: string[] }> }
) {
  const { saml } = await params;
  const path = saml.join('/');

  // /api/auth/metadata – return SP metadata XML
  if (path === 'metadata') {
    const xml = generateMetadata();
    return new NextResponse(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  // /api/auth/login – initiate SAML login redirect
  if (path === 'login') {
    if (!isSamlConfigured()) {
      return NextResponse.redirect(
        new URL('/login?error=saml_not_configured', request.url)
      );
    }

    try {
      // Dynamically import to get the SAML strategy and generate auth URL
      const { getSamlStrategy } = await import('@/lib/auth/saml');
      const strategy = getSamlStrategy();

      // Access the internal SAML instance to generate the authorize URL
      const samlInstance = (strategy as any)._saml;
      if (!samlInstance) {
        throw new Error('SAML strategy not initialized');
      }

      const authorizeUrl = await samlInstance.getAuthorizeUrlAsync('', request.headers.get('host') || '', {});
      return NextResponse.redirect(authorizeUrl);
    } catch (error) {
      console.error('SAML login initiation failed:', error);
      return NextResponse.redirect(
        new URL('/login?error=sso_failed', request.url)
      );
    }
  }

  // /api/auth/logout – destroy session and optionally do SAML SLO
  if (path === 'logout') {
    try {
      const cookieStore = await cookies();
      await destroySession(cookieStore);
    } catch (error) {
      console.error('Session destroy error:', error);
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.json(
    { error: 'Not Found', message: `Unknown auth path: ${path}` },
    { status: 404 }
  );
}

// ---------------------------------------------------------------------------
// POST handler – SAML callback (assertion consumer service)
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ saml: string[] }> }
) {
  const { saml } = await params;
  const path = saml.join('/');

  // /api/auth/callback/saml – handle SAML assertion
  if (path === 'callback/saml') {
    if (!isSamlConfigured()) {
      return NextResponse.redirect(
        new URL('/login?error=saml_not_configured', request.url)
      );
    }

    try {
      const formData = await request.formData();
      const samlResponse = formData.get('SAMLResponse') as string;

      if (!samlResponse) {
        return NextResponse.redirect(
          new URL('/login?error=no_saml_response', request.url)
        );
      }

      // Use the internal SAML instance to validate the assertion
      const { getSamlStrategy } = await import('@/lib/auth/saml');
      const strategy = getSamlStrategy();
      const samlInstance = (strategy as any)._saml;

      if (!samlInstance) {
        throw new Error('SAML strategy not initialized');
      }

      // Validate assertion using the SAML library
      const { profile } = await samlInstance.validatePostResponseAsync({
        SAMLResponse: samlResponse,
      });

      if (!profile) {
        throw new Error('SAML validation returned no profile');
      }

      // Extract user info from profile
      const email = (profile.nameID as string) || '';
      const firstName = (profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] as string) || '';
      const lastName = (profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] as string) || '';
      const name = [firstName, lastName].filter(Boolean).join(' ') || email;
      const role: UserRole = 'agent'; // Default role; in production, map from SAML groups

      // Create session
      const cookieStore = await cookies();
      await createSession(cookieStore, {
        userId: email,
        email,
        name,
        role,
        permissions: DEFAULT_PERMISSIONS[role] || [],
        groupAccess: [],
      });

      // Redirect to dashboard or returnUrl
      const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/';
      return NextResponse.redirect(new URL(returnUrl, request.url));
    } catch (error) {
      console.error('SAML callback error:', error);
      return NextResponse.redirect(
        new URL('/login?error=sso_failed', request.url)
      );
    }
  }

  return NextResponse.json(
    { error: 'Not Found', message: `Unknown auth path: ${path}` },
    { status: 404 }
  );
}
