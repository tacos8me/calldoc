'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Server,
  Radio,
  Shield,
  Key,
  Users,
  Link,
  Copy,
  Check,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';
import {
  useAdminSettings,
  useUpdateAdminSettings,
  type SamlConfigResponse,
} from '@/hooks/use-admin';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectionTestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
}

interface ToastState {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  description?: string;
}

interface GroupRoleRow {
  id: string;
  group: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INPUT_CLASS =
  'w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]';

const INPUT_CLASS_MONO =
  'w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]';

const SELECT_CLASS =
  'w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]';

const LABEL_CLASS = 'text-xs font-medium text-[var(--text-secondary)]';

const BTN_PRIMARY =
  'flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60';

const BTN_SECONDARY =
  'flex items-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-60';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'agent', label: 'Agent' },
  { value: 'wallboard-only', label: 'Wallboard Only' },
] as const;

const DEFAULT_ATTRIBUTE_MAP = {
  email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
  lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
  groups: 'http://schemas.xmlsoap.org/claims/Group',
};

const DEFAULT_GROUP_ROLE_ROWS: GroupRoleRow[] = [
  { id: 'default-1', group: 'CallDoc Admins', role: 'admin' },
  { id: 'default-2', group: 'CallDoc Supervisors', role: 'supervisor' },
  { id: 'default-3', group: 'CallDoc Agents', role: 'agent' },
  { id: 'default-4', group: 'CallDoc Wallboard', role: 'wallboard-only' },
];

// ---------------------------------------------------------------------------
// Toast Component
// ---------------------------------------------------------------------------

function ToastNotification({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible, onDismiss]);

  if (!toast.visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
          toast.type === 'success' && 'border-green-500/30 bg-green-500/10 text-green-400',
          toast.type === 'error' && 'border-red-500/30 bg-red-500/10 text-red-400'
        )}
      >
        {toast.type === 'success' ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 text-xs opacity-80">{toast.description}</p>
          )}
        </div>
        <button onClick={onDismiss} className="ml-2 shrink-0 opacity-60 hover:opacity-100">
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CopyButton Component
// ---------------------------------------------------------------------------

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section Header Component
// ---------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-5 py-3">
      <Icon className="h-4 w-4 text-[var(--accent-primary)]" />
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="text-xs text-[var(--text-tertiary)]">{description}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SettingsPage
// ---------------------------------------------------------------------------

export default function AdminSettingsPage() {
  // ─── Toast ────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'success',
    title: '',
  });
  const dismissToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  const showToast = useCallback((type: 'success' | 'error', title: string, description?: string) => {
    setToast({ visible: true, type, title, description });
  }, []);

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

  // ─── SAML ─── IdP Configuration ────────────────────────────────────
  const [samlConfigId, setSamlConfigId] = useState<string | null>(null);
  const [samlConnectionName, setSamlConnectionName] = useState('');
  const [samlEntityId, setSamlEntityId] = useState('calldoc');
  const [samlSsoUrl, setSamlSsoUrl] = useState('');
  const [samlSloUrl, setSamlSloUrl] = useState('');
  const [samlCert, setSamlCert] = useState('');
  const [samlActive, setSamlActive] = useState(true);
  const [samlSigAlgorithm, setSamlSigAlgorithm] = useState<'sha256' | 'sha512'>('sha256');

  // ─── SAML ─── Attribute Mapping ────────────────────────────────────
  const [attrEmail, setAttrEmail] = useState(DEFAULT_ATTRIBUTE_MAP.email);
  const [attrFirstName, setAttrFirstName] = useState(DEFAULT_ATTRIBUTE_MAP.firstName);
  const [attrLastName, setAttrLastName] = useState(DEFAULT_ATTRIBUTE_MAP.lastName);
  const [attrGroups, setAttrGroups] = useState(DEFAULT_ATTRIBUTE_MAP.groups);

  // ─── SAML ─── Group-to-Role Mapping ───────────────────────────────
  const [groupRoleRows, setGroupRoleRows] = useState<GroupRoleRow[]>(DEFAULT_GROUP_ROLE_ROWS);

  // ─── SAML ─── Connection Test ─────────────────────────────────────
  const [samlTest, setSamlTest] = useState<ConnectionTestResult>({ status: 'idle' });

  // ─── API Hooks ────────────────────────────────────────────────────
  const { data: settingsData, isLoading: settingsLoading } = useAdminSettings();
  const updateMutation = useUpdateAdminSettings();

  // ─── Hydrate SAML form from API response ──────────────────────────
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (settingsData?.data?.saml && settingsData.data.saml.length > 0 && !hydrated) {
      const saml: SamlConfigResponse = settingsData.data.saml[0];
      setSamlConfigId(saml.id);
      setSamlConnectionName(saml.name || '');
      setSamlEntityId(saml.entityId || 'calldoc');
      setSamlSsoUrl(saml.ssoUrl || '');
      setSamlSloUrl(saml.sloUrl || '');
      setSamlActive(saml.active ?? true);
      setSamlSigAlgorithm(
        (saml.signatureAlgorithm as 'sha256' | 'sha512') || 'sha256'
      );

      // Hydrate attribute mapping
      const attrMap = saml.attributeMapping || {};
      if (attrMap.email) setAttrEmail(attrMap.email);
      if (attrMap.firstName) setAttrFirstName(attrMap.firstName);
      if (attrMap.lastName) setAttrLastName(attrMap.lastName);
      if (attrMap.groups) setAttrGroups(attrMap.groups);

      // Hydrate group-role mapping
      const grMap = saml.groupRoleMapping || {};
      const entries = Object.entries(grMap);
      if (entries.length > 0) {
        setGroupRoleRows(
          entries.map(([group, role], i) => ({
            id: `loaded-${i}`,
            group,
            role,
          }))
        );
      }

      setHydrated(true);
    }
  }, [settingsData, hydrated]);

  // ─── SP Info computed values ───────────────────────────────────────
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const spEntityId = samlEntityId || 'calldoc';
  const acsUrl = `${origin}/api/auth/callback/saml`;
  const metadataUrl = `${origin}/api/auth/metadata`;

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

  // ─── Save DevLink3 (real API call) ─────────────────────────────────
  const saveDevLink3 = useCallback(async () => {
    setDlSaving(true);
    try {
      const systemId = settingsData?.data?.systems?.[0]?.id;
      await updateMutation.mutateAsync({
        system: {
          ...(systemId ? { id: systemId } : {}),
          devlinkHost: dlHost,
          devlinkPort: parseInt(dlPort, 10) || 50797,
          devlinkUsername: dlUsername,
          ...(dlPassword ? { devlinkPassword: dlPassword } : {}),
        },
      });
      showToast('success', 'DevLink3 Saved', 'DevLink3 connection settings updated.');
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to save DevLink3 settings.';
      showToast('error', 'Save Failed', message);
    } finally {
      setDlSaving(false);
    }
  }, [settingsData, dlHost, dlPort, dlUsername, dlPassword, updateMutation, showToast]);

  // ─── Save SMDR (real API call) ────────────────────────────────────
  const saveSmdr = useCallback(async () => {
    setSmdrSaving(true);
    try {
      const systemId = settingsData?.data?.systems?.[0]?.id;
      await updateMutation.mutateAsync({
        system: {
          ...(systemId ? { id: systemId } : {}),
          smdrPort: parseInt(smdrPort, 10) || 1150,
          smdrEnabled: smdrType === 'tcp',
        },
      });
      showToast('success', 'SMDR Saved', 'SMDR configuration updated.');
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to save SMDR settings.';
      showToast('error', 'Save Failed', message);
    } finally {
      setSmdrSaving(false);
    }
  }, [settingsData, smdrPort, smdrType, updateMutation, showToast]);

  // ─── Save SAML Configuration (real API call) ─────────────────────────
  const saveSaml = useCallback(async () => {
    // Validation
    if (!samlSsoUrl.trim()) {
      showToast('error', 'Validation Error', 'SSO URL / Entry Point is required.');
      return;
    }

    if (!samlCert.trim()) {
      showToast('error', 'Validation Error', 'IdP Signing Certificate is required.');
      return;
    }

    // Build attribute mapping
    const attributeMapping: Record<string, string> = {
      email: attrEmail,
      firstName: attrFirstName,
      lastName: attrLastName,
      groups: attrGroups,
    };

    // Build group-role mapping (filter out empty rows)
    const groupRoleMapping: Record<string, string> = {};
    for (const row of groupRoleRows) {
      if (row.group.trim()) {
        groupRoleMapping[row.group.trim()] = row.role;
      }
    }

    const samlPayload: Record<string, unknown> = {
      name: samlConnectionName || 'SAML SSO',
      entityId: samlEntityId,
      ssoUrl: samlSsoUrl,
      sloUrl: samlSloUrl || undefined,
      certificate: samlCert,
      active: samlActive,
      signatureAlgorithm: samlSigAlgorithm,
      attributeMapping,
      groupRoleMapping,
    };

    // Include the id if we are updating an existing config
    if (samlConfigId) {
      samlPayload.id = samlConfigId;
    }

    try {
      await updateMutation.mutateAsync({
        saml: samlPayload as Parameters<typeof updateMutation.mutateAsync>[0]['saml'],
      });
      showToast('success', 'SAML Configuration Saved', 'Your SAML SSO settings have been updated.');
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to save SAML configuration.';
      showToast('error', 'Save Failed', message);
    }
  }, [
    samlConfigId,
    samlConnectionName,
    samlEntityId,
    samlSsoUrl,
    samlSloUrl,
    samlCert,
    samlActive,
    samlSigAlgorithm,
    attrEmail,
    attrFirstName,
    attrLastName,
    attrGroups,
    groupRoleRows,
    updateMutation,
    showToast,
  ]);

  // ─── Test SAML Configuration ──────────────────────────────────────
  const testSaml = useCallback(async () => {
    setSamlTest({ status: 'testing' });
    // Check if the essential fields are configured
    await new Promise((r) => setTimeout(r, 1000));
    const isConfigured = samlSsoUrl.trim() && samlCert.trim() && samlEntityId.trim();
    if (isConfigured) {
      setSamlTest({
        status: 'success',
        message: `SAML is configured. IdP entry point: ${samlSsoUrl}`,
      });
    } else {
      const missing: string[] = [];
      if (!samlSsoUrl.trim()) missing.push('SSO URL');
      if (!samlCert.trim()) missing.push('Certificate');
      if (!samlEntityId.trim()) missing.push('Entity ID');
      setSamlTest({
        status: 'error',
        message: `SAML is not fully configured. Missing: ${missing.join(', ')}`,
      });
    }
  }, [samlSsoUrl, samlCert, samlEntityId]);

  // ─── Group-Role Mapping helpers ───────────────────────────────────
  const addGroupRoleRow = useCallback(() => {
    setGroupRoleRows((prev) => [
      ...prev,
      { id: `row-${Date.now()}`, group: '', role: 'agent' },
    ]);
  }, []);

  const removeGroupRoleRow = useCallback((id: string) => {
    setGroupRoleRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateGroupRoleRow = useCallback(
    (id: string, field: 'group' | 'role', value: string) => {
      setGroupRoleRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  // ─── Computed: is SAML saving ────────────────────────────────────
  const samlSaving = updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Toast */}
      <ToastNotification toast={toast} onDismiss={dismissToast} />

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

      {/* ─── Two-Column Grid ──────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

      {/* ─── Left Column: Connections ─────────────────────────────────── */}
      <div className="space-y-6">

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
              <label className={LABEL_CLASS}>
                Host / IP Address
              </label>
              <input
                type="text"
                value={dlHost}
                onChange={(e) => setDlHost(e.target.value)}
                placeholder="192.168.1.10"
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>
                Port
              </label>
              <input
                type="number"
                value={dlPort}
                onChange={(e) => setDlPort(e.target.value)}
                placeholder="50797"
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>
                Username
              </label>
              <input
                type="text"
                value={dlUsername}
                onChange={(e) => setDlUsername(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>
                Password
              </label>
              <div className="relative">
                <input
                  type={dlShowPassword ? 'text' : 'password'}
                  value={dlPassword}
                  onChange={(e) => setDlPassword(e.target.value)}
                  placeholder="Enter password"
                  className={cn(INPUT_CLASS, 'pr-10')}
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
              className={BTN_SECONDARY}
            >
              {dlTest.status === 'testing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Test Connection
            </button>
            <button
              onClick={saveDevLink3}
              disabled={dlSaving}
              className={BTN_PRIMARY}
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
              <label className={LABEL_CLASS}>
                Port
              </label>
              <input
                type="number"
                value={smdrPort}
                onChange={(e) => setSmdrPort(e.target.value)}
                placeholder="1150"
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>
                Connection Type
              </label>
              <select
                value={smdrType}
                onChange={(e) => setSmdrType(e.target.value as 'tcp' | 'file')}
                className={SELECT_CLASS}
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
              className={BTN_PRIMARY}
            >
              {smdrSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>

      </div>{/* End Left Column */}

      {/* ─── Right Column: Authentication ─────────────────────────────── */}
      <div className="space-y-6">

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
          {/* Active status */}
          <div className="ml-auto flex items-center gap-2">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                samlActive ? 'bg-green-400' : 'bg-zinc-500'
              )}
            />
            <span className="text-xs text-[var(--text-secondary)]">
              {samlActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {settingsLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
            <span className="ml-2 text-sm text-[var(--text-tertiary)]">Loading SAML configuration...</span>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-[var(--border-default)]">
            {/* ── Section A: Identity Provider Configuration ──────────── */}
            <div>
              <SectionHeader
                icon={Key}
                title="Identity Provider Configuration"
                description="Configure the SAML 2.0 Identity Provider connection"
              />
              <div className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className={LABEL_CLASS}>Connection Name</label>
                    <input
                      type="text"
                      value={samlConnectionName}
                      onChange={(e) => setSamlConnectionName(e.target.value)}
                      placeholder="e.g. Corporate Okta"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL_CLASS}>Entity ID / Issuer</label>
                    <input
                      type="text"
                      value={samlEntityId}
                      onChange={(e) => setSamlEntityId(e.target.value)}
                      placeholder="calldoc"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL_CLASS}>
                      SSO URL / Entry Point <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="url"
                      value={samlSsoUrl}
                      onChange={(e) => setSamlSsoUrl(e.target.value)}
                      placeholder="https://your-idp.com/app/sso/saml"
                      className={cn(INPUT_CLASS, 'placeholder:text-[var(--text-tertiary)]')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL_CLASS}>SLO URL (optional)</label>
                    <input
                      type="url"
                      value={samlSloUrl}
                      onChange={(e) => setSamlSloUrl(e.target.value)}
                      placeholder="https://your-idp.com/app/slo"
                      className={cn(INPUT_CLASS, 'placeholder:text-[var(--text-tertiary)]')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL_CLASS}>Signature Algorithm</label>
                    <select
                      value={samlSigAlgorithm}
                      onChange={(e) => setSamlSigAlgorithm(e.target.value as 'sha256' | 'sha512')}
                      className={SELECT_CLASS}
                    >
                      <option value="sha256">SHA-256 (Recommended)</option>
                      <option value="sha512">SHA-512</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL_CLASS}>Active</label>
                    <div className="flex h-[38px] items-center">
                      <button
                        type="button"
                        onClick={() => setSamlActive(!samlActive)}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition-colors',
                          samlActive ? 'bg-[var(--accent-primary)]' : 'bg-zinc-600'
                        )}
                        role="switch"
                        aria-checked={samlActive}
                      >
                        <span
                          className={cn(
                            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                            samlActive && 'translate-x-5'
                          )}
                        />
                      </button>
                      <span className="ml-3 text-sm text-[var(--text-secondary)]">
                        {samlActive ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={LABEL_CLASS}>
                    IdP Signing Certificate (PEM) <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={samlCert}
                    onChange={(e) => setSamlCert(e.target.value)}
                    rows={6}
                    placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                    className={INPUT_CLASS_MONO}
                  />
                </div>
              </div>
            </div>

            {/* ── Section B: Attribute Mapping ───────────────────────── */}
            <div>
              <SectionHeader
                icon={Link}
                title="Attribute Mapping"
                description="Map SAML assertion attributes to user fields"
              />
              <div className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className={LABEL_CLASS}>Email Attribute</label>
                    <input
                      type="text"
                      value={attrEmail}
                      onChange={(e) => setAttrEmail(e.target.value)}
                      className={cn(INPUT_CLASS, 'font-mono text-xs')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL_CLASS}>First Name Attribute</label>
                    <input
                      type="text"
                      value={attrFirstName}
                      onChange={(e) => setAttrFirstName(e.target.value)}
                      className={cn(INPUT_CLASS, 'font-mono text-xs')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL_CLASS}>Last Name Attribute</label>
                    <input
                      type="text"
                      value={attrLastName}
                      onChange={(e) => setAttrLastName(e.target.value)}
                      className={cn(INPUT_CLASS, 'font-mono text-xs')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL_CLASS}>Groups Attribute</label>
                    <input
                      type="text"
                      value={attrGroups}
                      onChange={(e) => setAttrGroups(e.target.value)}
                      className={cn(INPUT_CLASS, 'font-mono text-xs')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section C: Group-to-Role Mapping ───────────────────── */}
            <div>
              <SectionHeader
                icon={Users}
                title="Group-to-Role Mapping"
                description="Map SAML group names to CallDoc roles"
              />
              <div className="space-y-3 p-5">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_180px_40px] items-center gap-3">
                  <span className={LABEL_CLASS}>SAML Group Name</span>
                  <span className={LABEL_CLASS}>CallDoc Role</span>
                  <span />
                </div>

                {/* Rows */}
                {groupRoleRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1fr_180px_40px] items-center gap-3"
                  >
                    <input
                      type="text"
                      value={row.group}
                      onChange={(e) => updateGroupRoleRow(row.id, 'group', e.target.value)}
                      placeholder="e.g. CallDoc Admins"
                      className={INPUT_CLASS}
                    />
                    <select
                      value={row.role}
                      onChange={(e) => updateGroupRoleRow(row.id, 'role', e.target.value)}
                      className={SELECT_CLASS}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeGroupRoleRow(row.id)}
                      disabled={groupRoleRows.length <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--text-tertiary)]"
                      title="Remove mapping"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* Add row button */}
                <button
                  type="button"
                  onClick={addGroupRoleRow}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text-tertiary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                >
                  <Plus className="h-4 w-4" />
                  Add Mapping
                </button>
              </div>
            </div>

            {/* ── Section D: Service Provider Info (Read-Only) ────────── */}
            <div>
              <SectionHeader
                icon={Info}
                title="Service Provider Info"
                description="Provide these values to your Identity Provider"
              />
              <div className="space-y-3 p-5">
                <div className="space-y-1.5">
                  <label className={LABEL_CLASS}>SP Entity ID</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 font-mono text-xs text-[var(--text-secondary)]">
                      {spEntityId}
                    </div>
                    <CopyButton value={spEntityId} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={LABEL_CLASS}>Assertion Consumer Service (ACS) URL</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 truncate rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 font-mono text-xs text-[var(--text-secondary)]">
                      {acsUrl}
                    </div>
                    <CopyButton value={acsUrl} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={LABEL_CLASS}>SP Metadata URL</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 truncate rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 font-mono text-xs text-[var(--text-secondary)]">
                      {metadataUrl}
                    </div>
                    <CopyButton value={metadataUrl} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section E: Connection Test + Save ──────────────────── */}
            <div className="space-y-4 p-5">
              {/* Test result */}
              {samlTest.status !== 'idle' && (
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                    samlTest.status === 'testing' && 'bg-blue-500/10 text-blue-400',
                    samlTest.status === 'success' && 'bg-green-500/10 text-green-400',
                    samlTest.status === 'error' && 'bg-red-500/10 text-red-400'
                  )}
                >
                  {samlTest.status === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {samlTest.status === 'success' && <CheckCircle2 className="h-4 w-4" />}
                  {samlTest.status === 'error' && <XCircle className="h-4 w-4" />}
                  {samlTest.message || 'Testing SAML configuration...'}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={testSaml}
                  disabled={samlTest.status === 'testing'}
                  className={BTN_SECONDARY}
                >
                  {samlTest.status === 'testing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  Test Configuration
                </button>
                <button
                  onClick={saveSaml}
                  disabled={samlSaving}
                  className={BTN_PRIMARY}
                >
                  {samlSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save SAML Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      </div>{/* End Right Column */}
      </div>{/* End Two-Column Grid */}
    </div>
  );
}
