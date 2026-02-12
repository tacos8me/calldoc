'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lock,
  Phone,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Error messages mapping
// ---------------------------------------------------------------------------

const ERROR_MESSAGES: Record<string, string> = {
  sso_failed: 'SSO authentication failed. Please try again or contact your administrator.',
  saml_not_configured: 'SSO is not configured. Please use admin login or contact your administrator.',
  no_saml_response: 'No SAML response received. Please try again.',
  session_expired: 'Your session has expired. Please sign in again.',
};

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-950"><Loader2 className="h-8 w-8 animate-spin text-zinc-500" /></div>}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';
  const errorCode = searchParams.get('error');

  // SSO state
  const [ssoLoading, setSsoLoading] = useState(false);

  // Admin login state
  const [adminOpen, setAdminOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // External error from query params
  const externalError = errorCode ? ERROR_MESSAGES[errorCode] || 'Authentication failed.' : null;

  // ─── SSO Login ──────────────────────────────────────────────────────────
  const handleSsoLogin = useCallback(() => {
    setSsoLoading(true);
    const url = new URL('/api/auth/login', window.location.origin);
    if (returnUrl && returnUrl !== '/') {
      url.searchParams.set('returnUrl', returnUrl);
    }
    window.location.href = url.toString();
  }, [returnUrl]);

  // ─── Admin Login ────────────────────────────────────────────────────────
  const handleAdminLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAdminError(null);

      if (!username.trim() || !password) {
        setAdminError('Username and password are required.');
        return;
      }

      setAdminLoading(true);

      try {
        const res = await fetch('/api/auth/local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 429) {
            setAdminError('Too many login attempts. Please try again later.');
          } else {
            setAdminError(data.message || 'Invalid username or password.');
          }
          return;
        }

        // Success – navigate to dashboard
        router.push(returnUrl);
      } catch {
        setAdminError('Network error. Please check your connection.');
      } finally {
        setAdminLoading(false);
      }
    },
    [username, password, returnUrl, router]
  );

  // Auto-open admin section if SAML error
  useEffect(() => {
    if (errorCode === 'saml_not_configured') {
      setAdminOpen(true);
    }
  }, [errorCode]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] p-4">
      <div className="w-full max-w-md">
        {/* ─── Card ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-lg)]">
          {/* Logo & heading */}
          <div className="mb-8 flex flex-col items-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--accent-primary)]">
              <Phone className="h-7 w-7 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Sign in to CallDoc
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Call center reporting for Avaya IP Office 11
              </p>
            </div>
          </div>

          {/* ─── External error banner ──────────────────────────────── */}
          {externalError && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">{externalError}</p>
            </div>
          )}

          {/* ─── SSO Button ─────────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleSsoLogin}
            disabled={ssoLoading}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
              'bg-[var(--accent-primary)] text-white',
              'hover:bg-[var(--accent-hover)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            {ssoLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting to SSO...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Sign in with SSO
              </>
            )}
          </button>

          {/* ─── Divider ────────────────────────────────────────────── */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-default)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-tertiary)]">
                or
              </span>
            </div>
          </div>

          {/* ─── Admin Login Collapsible ────────────────────────────── */}
          <div>
            <button
              type="button"
              onClick={() => setAdminOpen(!adminOpen)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm text-[var(--text-secondary)] transition-colors duration-200',
                'hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              )}
            >
              <span>Admin Login</span>
              {adminOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {/* Collapsible form */}
            <div
              className={cn(
                'grid transition-all duration-300 ease-in-out',
                adminOpen
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="overflow-hidden">
                <form
                  onSubmit={handleAdminLogin}
                  className="space-y-4 px-1 pt-4"
                >
                  {/* Admin error */}
                  {adminError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <p className="text-sm text-red-300">{adminError}</p>
                    </div>
                  )}

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="username"
                      className="block text-xs font-medium text-[var(--text-secondary)]"
                    >
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin"
                      autoComplete="username"
                      className={cn(
                        'w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
                        'transition-colors duration-200',
                        'focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]'
                      )}
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-medium text-[var(--text-secondary)]"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      className={cn(
                        'w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
                        'transition-colors duration-200',
                        'focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]'
                      )}
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={adminLoading}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 py-2.5 text-sm font-medium transition-all duration-200',
                      'bg-[var(--bg-elevated)] text-[var(--text-primary)]',
                      'hover:bg-[var(--bg-overlay)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]',
                      'disabled:cursor-not-allowed disabled:opacity-60'
                    )}
                  >
                    {adminLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Footer ──────────────────────────────────────────────── */}
        <p className="mt-6 text-center text-xs text-[var(--text-tertiary)]">
          CallDoc v0.1.0 &middot; Avaya IP Office 11
        </p>
      </div>
    </div>
  );
}
