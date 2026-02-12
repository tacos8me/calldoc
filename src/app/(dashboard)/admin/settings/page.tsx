'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  Settings,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Server,
  Radio,
  Shield,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectionTestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
}

// ---------------------------------------------------------------------------
// SettingsPage
// ---------------------------------------------------------------------------

export default function AdminSettingsPage() {
  // ─── DevLink3 ───────────────────────────────────────────────────────
  const [dlHost, setDlHost] = useState('192.168.1.10');
  const [dlPort, setDlPort] = useState('50797');
  const [dlUsername, setDlUsername] = useState('admin');
  const [dlPassword, setDlPassword] = useState('');
  const [dlShowPassword, setDlShowPassword] = useState(false);
  const [dlTest, setDlTest] = useState<ConnectionTestResult>({ status: 'idle' });
  const [dlSaving, setDlSaving] = useState(false);

  // ─── SMDR ───────────────────────────────────────────────────────────
  const [smdrPort, setSmdrPort] = useState('1150');
  const [smdrType, setSmdrType] = useState<'tcp' | 'file'>('tcp');
  const [smdrSaving, setSmdrSaving] = useState(false);

  // ─── SAML ───────────────────────────────────────────────────────────
  const [samlMetadataUrl, setSamlMetadataUrl] = useState('');
  const [samlEntityId, setSamlEntityId] = useState('calldoc');
  const [samlCert, setSamlCert] = useState('');
  const [samlEmailAttr, setSamlEmailAttr] = useState(
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
  );
  const [samlNameAttr, setSamlNameAttr] = useState(
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
  );
  const [samlSaving, setSamlSaving] = useState(false);

  // ─── Test DevLink3 connection ───────────────────────────────────────
  const testDevLink3 = useCallback(async () => {
    setDlTest({ status: 'testing' });
    // Simulate connection test
    await new Promise((r) => setTimeout(r, 1500));
    const success = dlHost && dlPort && dlUsername;
    setDlTest(
      success
        ? { status: 'success', message: 'Connected to Avaya IP Office 11 (v11.0.4.3)' }
        : { status: 'error', message: 'Connection refused. Check host and port.' }
    );
  }, [dlHost, dlPort, dlUsername]);

  // ─── Save handlers (simulated) ─────────────────────────────────────
  const saveDevLink3 = useCallback(async () => {
    setDlSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setDlSaving(false);
  }, []);

  const saveSmdr = useCallback(async () => {
    setSmdrSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSmdrSaving(false);
  }, []);

  const saveSaml = useCallback(async () => {
    setSamlSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSamlSaving(false);
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a
          href="/admin"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </a>
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            System Settings
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Configure connections and authentication
          </p>
        </div>
      </div>

      {/* ─── DevLink3 Connection ──────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-6 py-4">
          <Server className="h-5 w-5 text-[var(--accent-primary)]" />
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              DevLink3 Connection
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Connect to Avaya IP Office for real-time call data
            </p>
          </div>
          {/* Connection status dot */}
          <div className="ml-auto flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-xs text-[var(--text-secondary)]">Connected</span>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Host / IP Address
              </label>
              <input
                type="text"
                value={dlHost}
                onChange={(e) => setDlHost(e.target.value)}
                placeholder="192.168.1.10"
                className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Port
              </label>
              <input
                type="number"
                value={dlPort}
                onChange={(e) => setDlPort(e.target.value)}
                placeholder="50797"
                className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Username
              </label>
              <input
                type="text"
                value={dlUsername}
                onChange={(e) => setDlUsername(e.target.value)}
                className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <div className="relative">
                <input
                  type={dlShowPassword ? 'text' : 'password'}
                  value={dlPassword}
                  onChange={(e) => setDlPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setDlShowPassword(!dlShowPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                >
                  {dlShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Test result */}
          {dlTest.status !== 'idle' && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                dlTest.status === 'testing' && 'bg-blue-500/10 text-blue-400',
                dlTest.status === 'success' && 'bg-green-500/10 text-green-400',
                dlTest.status === 'error' && 'bg-red-500/10 text-red-400'
              )}
            >
              {dlTest.status === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
              {dlTest.status === 'success' && <CheckCircle2 className="h-4 w-4" />}
              {dlTest.status === 'error' && <XCircle className="h-4 w-4" />}
              {dlTest.message || 'Testing connection...'}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={testDevLink3}
              disabled={dlTest.status === 'testing'}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-60"
            >
              {dlTest.status === 'testing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Test Connection
            </button>
            <button
              onClick={saveDevLink3}
              disabled={dlSaving}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {dlSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* ─── SMDR Configuration ───────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-6 py-4">
          <Radio className="h-5 w-5 text-[var(--accent-primary)]" />
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              SMDR Configuration
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Station Message Detail Recording for historical call data
            </p>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Port
              </label>
              <input
                type="number"
                value={smdrPort}
                onChange={(e) => setSmdrPort(e.target.value)}
                placeholder="1150"
                className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Connection Type
              </label>
              <select
                value={smdrType}
                onChange={(e) => setSmdrType(e.target.value as 'tcp' | 'file')}
                className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              >
                <option value="tcp">TCP Listener</option>
                <option value="file">File Watcher</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveSmdr}
              disabled={smdrSaving}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {smdrSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* ─── SAML Configuration ───────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-6 py-4">
          <Shield className="h-5 w-5 text-[var(--accent-primary)]" />
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              SAML Configuration
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Single Sign-On via Okta, ADFS, or other SAML 2.0 Identity Providers
            </p>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                IdP Metadata URL
              </label>
              <input
                type="url"
                value={samlMetadataUrl}
                onChange={(e) => setSamlMetadataUrl(e.target.value)}
                placeholder="https://your-idp.com/app/metadata"
                className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Entity ID / Issuer
              </label>
              <input
                type="text"
                value={samlEntityId}
                onChange={(e) => setSamlEntityId(e.target.value)}
                className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Email Attribute
              </label>
              <input
                type="text"
                value={samlEmailAttr}
                onChange={(e) => setSamlEmailAttr(e.target.value)}
                className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Name Attribute
              </label>
              <input
                type="text"
                value={samlNameAttr}
                onChange={(e) => setSamlNameAttr(e.target.value)}
                className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                IdP Signing Certificate (PEM)
              </label>
              <textarea
                value={samlCert}
                onChange={(e) => setSamlCert(e.target.value)}
                rows={5}
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveSaml}
              disabled={samlSaving}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {samlSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
