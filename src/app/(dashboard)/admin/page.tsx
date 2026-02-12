'use client';

import { useRouter } from 'next/navigation';
import {
  Users,
  Settings,
  Mic,
  HardDrive,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Admin sub-pages
// ---------------------------------------------------------------------------

interface AdminCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const ADMIN_CARDS: AdminCard[] = [
  {
    title: 'Users & Roles',
    description: 'Manage user accounts, assign roles, and configure access permissions.',
    href: '/admin/users',
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: 'System Settings',
    description: 'Configure DevLink3 connection, SMDR, and SAML authentication.',
    href: '/admin/settings',
    icon: <Settings className="h-5 w-5" />,
  },
  {
    title: 'Recording Rules',
    description: 'Define which calls are recorded based on agents, groups, and schedules.',
    href: '/admin/recording-rules',
    icon: <Mic className="h-5 w-5" />,
  },
  {
    title: 'Storage Pools',
    description: 'Manage recording storage backends, capacity, and retention policies.',
    href: '/admin/storage',
    icon: <HardDrive className="h-5 w-5" />,
  },
];

// ---------------------------------------------------------------------------
// AdminPage
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-subtle)]">
          <Shield className="h-5 w-5 text-[var(--accent-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Administration
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            System configuration and user management
          </p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {ADMIN_CARDS.map((card) => (
          <button
            key={card.href}
            onClick={() => router.push(card.href)}
            className={cn(
              'group flex items-start gap-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-left transition-all duration-200',
              'hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]'
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors group-hover:bg-[var(--accent-subtle)] group-hover:text-[var(--accent-primary)]">
              {card.icon}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  {card.title}
                </h2>
                <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text-secondary)]" />
              </div>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {card.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
