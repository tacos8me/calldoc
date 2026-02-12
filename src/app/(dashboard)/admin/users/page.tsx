'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  UserCircle,
  MoreHorizontal,
  Pencil,
  Power,
  Loader2,
} from 'lucide-react';
import type { UserRole } from '@/types';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  extension: string;
  lastLoginAt: string | null;
  active: boolean;
}

const MOCK_USERS: MockUser[] = [
  {
    id: 'usr_001',
    name: 'Sarah Chen',
    email: 'sarah.chen@acme.com',
    role: 'admin',
    extension: '2001',
    lastLoginAt: '2026-02-10T09:15:00Z',
    active: true,
  },
  {
    id: 'usr_002',
    name: 'Marcus Johnson',
    email: 'marcus.j@acme.com',
    role: 'supervisor',
    extension: '2010',
    lastLoginAt: '2026-02-09T16:42:00Z',
    active: true,
  },
  {
    id: 'usr_003',
    name: 'Emily Rodriguez',
    email: 'e.rodriguez@acme.com',
    role: 'agent',
    extension: '2101',
    lastLoginAt: '2026-02-10T08:30:00Z',
    active: true,
  },
  {
    id: 'usr_004',
    name: 'James Patel',
    email: 'j.patel@acme.com',
    role: 'agent',
    extension: '2102',
    lastLoginAt: '2026-01-28T14:10:00Z',
    active: false,
  },
  {
    id: 'usr_005',
    name: 'Olivia Brown',
    email: 'o.brown@acme.com',
    role: 'wallboard-only',
    extension: '',
    lastLoginAt: '2026-02-08T07:55:00Z',
    active: true,
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  agent: 'Agent',
  'wallboard-only': 'Wallboard Only',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-500/10 text-red-400 border-red-500/20',
  supervisor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  agent: 'bg-green-500/10 text-green-400 border-green-500/20',
  'wallboard-only': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const ROLES: UserRole[] = ['admin', 'supervisor', 'agent', 'wallboard-only'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLastLogin(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminUsersPage() {
  const [users, setUsers] = useState<MockUser[]>(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<MockUser | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('agent');
  const [formExtension, setFormExtension] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.includes(q) ||
        u.extension.includes(q)
    );
  }, [users, search]);

  // Open add dialog
  const openAdd = useCallback(() => {
    setEditUser(null);
    setFormName('');
    setFormEmail('');
    setFormRole('agent');
    setFormExtension('');
    setFormPassword('');
    setDialogOpen(true);
  }, []);

  // Open edit dialog
  const openEdit = useCallback((user: MockUser) => {
    setEditUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormExtension(user.extension);
    setFormPassword('');
    setDialogOpen(true);
    setMenuOpenId(null);
  }, []);

  // Save user
  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);

      // Simulate API call
      await new Promise((r) => setTimeout(r, 500));

      if (editUser) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editUser.id
              ? { ...u, name: formName, email: formEmail, role: formRole, extension: formExtension }
              : u
          )
        );
      } else {
        const newUser: MockUser = {
          id: `usr_${Date.now()}`,
          name: formName,
          email: formEmail,
          role: formRole,
          extension: formExtension,
          lastLoginAt: null,
          active: true,
        };
        setUsers((prev) => [...prev, newUser]);
      }

      setSaving(false);
      setDialogOpen(false);
    },
    [editUser, formName, formEmail, formRole, formExtension]
  );

  // Toggle active
  const toggleActive = useCallback((userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, active: !u.active } : u))
    );
    setMenuOpenId(null);
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a
          href="/admin"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </a>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Users & Roles</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {users.length} users &middot; {users.filter((u) => u.active).length} active
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name, email, role..."
          className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Extension
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Last Login
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {filtered.map((user) => (
              <tr
                key={user.id}
                className="transition-colors hover:bg-[var(--bg-elevated)]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserCircle className="h-8 w-8 text-[var(--text-tertiary)]" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {user.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-md border px-2 py-0.5 text-xs font-medium',
                      ROLE_COLORS[user.role]
                    )}
                  >
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-[var(--text-secondary)]">
                  {user.extension || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {formatLastLogin(user.lastLoginAt)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      user.active
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-zinc-500/10 text-zinc-500'
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        user.active ? 'bg-green-400' : 'bg-zinc-500'
                      )}
                    />
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="relative inline-block">
                    <button
                      onClick={() =>
                        setMenuOpenId(menuOpenId === user.id ? null : user.id)
                      }
                      className="rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpenId === user.id && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg">
                        <button
                          onClick={() => openEdit(user)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(user.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]"
                        >
                          <Power className="h-3.5 w-3.5" />
                          {user.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-[var(--text-tertiary)]"
                >
                  No users match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Add/Edit Dialog ──────────────────────────────────────────── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDialogOpen(false)}
          />
          {/* Content */}
          <div className="relative w-full max-w-md rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {editUser ? 'Edit User' : 'Add User'}
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-md p-1 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Role
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Extension */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Extension
                </label>
                <input
                  type="text"
                  value={formExtension}
                  onChange={(e) => setFormExtension(e.target.value)}
                  placeholder="e.g., 2001"
                  className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>

              {/* Password (only for add or optional re-set) */}
              {!editUser && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Initial password"
                    className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editUser ? 'Save Changes' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
