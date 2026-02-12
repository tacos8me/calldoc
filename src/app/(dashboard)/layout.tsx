'use client';

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Phone,
  Users,
  BarChart3,
  Mic,
  Monitor,
  Settings,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { ConnectionIndicator } from '@/components/shared/connection-indicator';
import { CommandPalette } from '@/components/shared/command-palette';
import { NotificationCenter } from '@/components/shared/notification-center';
import { KeyboardHelpDialog } from '@/components/shared/keyboard-help';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import {
  ResponsiveSidebar,
  MobileMenuButton,
  MobileSidebar,
  type NavItem,
} from '@/components/shared/responsive-sidebar';
import { SocketProvider } from '@/components/providers/socket-provider';
import { SkipToContent } from '@/components/shared/focus-trap';
import { OfflineBanner } from '@/components/shared/offline-banner';
import { SIDEBAR, TOP_BAR } from '@/lib/theme';

// ---------------------------------------------------------------------------
// Dashboard Shell -- responsive sidebar + top bar + main content area
// ---------------------------------------------------------------------------

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <LayoutDashboard className="h-5 w-5" />,
    section: 'OVERVIEW',
  },
  {
    label: 'Agent Timeline',
    href: '/agent-timeline',
    icon: <Users className="h-5 w-5" />,
    section: 'REAL-TIME',
  },
  {
    label: 'Calls',
    href: '/calls',
    icon: <Phone className="h-5 w-5" />,
    section: 'DATA',
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: <BarChart3 className="h-5 w-5" />,
    section: 'DATA',
  },
  {
    label: 'Recordings',
    href: '/recordings',
    icon: <Mic className="h-5 w-5" />,
    section: 'DATA',
  },
  {
    label: 'Wallboards',
    href: '/wallboards',
    icon: <Monitor className="h-5 w-5" />,
    section: 'WALLBOARDS',
  },
  {
    label: 'Admin',
    href: '/admin/settings',
    icon: <Settings className="h-5 w-5" />,
    section: 'SYSTEM',
    adminOnly: true,
  },
];

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  const labelMap: Record<string, string> = {
    'agent-timeline': 'Agent Timeline',
    calls: 'Calls',
    reports: 'Reports',
    recordings: 'Recordings',
    wallboards: 'Wallboards',
    admin: 'Admin',
    settings: 'Settings',
    users: 'Users',
    'recording-rules': 'Recording Rules',
    'storage-pools': 'Storage Pools',
  };

  let href = '';
  for (const seg of segments) {
    href += `/${seg}`;
    crumbs.push({
      label: labelMap[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
      href,
    });
  }

  // If no segments, we're on the dashboard root
  if (crumbs.length === 0) {
    crumbs.push({ label: 'Dashboard', href: '/' });
  }

  return crumbs;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const breadcrumbs = getBreadcrumbs(pathname);

  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Track mobile breakpoint
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 1024);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Cmd+/ to toggle sidebar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        toggleSidebar();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // Theme toggle
  const handleToggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('calldoc-theme', next);
  }, [theme, setTheme]);

  // Restore theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('calldoc-theme') as 'light' | 'dark' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    }
  }, [setTheme]);

  return (
    <SocketProvider>
    <div className="flex min-h-screen bg-surface-base">
      {/* Accessibility: skip-to-content link for keyboard users (WCAG 2.4.1) */}
      <SkipToContent contentId="main-content" />

      {/* ── Responsive Sidebar ───────────────────────────────── */}
      <ResponsiveSidebar navItems={NAV_ITEMS} />

      {/* ── Mobile sidebar drawer ────────────────────────────── */}
      <MobileSidebar
        navItems={NAV_ITEMS}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* ── Main area (right of sidebar) ─────────────────────── */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-[margin-left] duration-smooth',
          isMobile ? 'ml-0' : '',
        )}
        style={{
          marginLeft: isMobile
            ? 0
            : collapsed
              ? SIDEBAR.collapsedWidth
              : SIDEBAR.expandedWidth,
        }}
      >
        {/* ── Top Bar ──────────────────────────────────────── */}
        <header
          className={cn(
            'sticky top-0 z-20 flex items-center justify-between border-b border-border px-4 lg:px-6',
            'bg-surface-card/80 backdrop-blur-md',
          )}
          style={{ height: TOP_BAR.height }}
        >
          {/* Left: hamburger (mobile) + breadcrumbs */}
          <div className="flex items-center gap-2 min-w-0">
            {isMobile && (
              <MobileMenuButton onClick={() => setMobileMenuOpen(true)} />
            )}
            <nav className="flex items-center gap-1.5 min-w-0" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="text-caption text-content-tertiary">/</span>
                  )}
                  {i === breadcrumbs.length - 1 ? (
                    <span className="text-caption text-content-primary font-medium truncate">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-caption text-content-secondary hover:text-content-primary truncate"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <ConnectionIndicator />

            {/* Notification center (bell + dropdown) */}
            <NotificationCenter />

            {/* Theme toggle */}
            <button
              onClick={handleToggleTheme}
              className="p-2 rounded-md text-content-secondary hover:text-content-primary hover:bg-surface-elevated transition-colors duration-fast"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            {/* User avatar */}
            <button
              className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-caption text-white font-semibold"
              aria-label="User menu"
            >
              U
            </button>
          </div>
        </header>

        {/* ── Page content with error boundary ────────────── */}
        <main id="main-content" className="flex-1 overflow-auto p-4 lg:p-6" role="main">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {/* ── Global overlays ──────────────────────────────────── */}
      <CommandPalette />
      <KeyboardHelpDialog />

      {/* Offline banner (service worker connection awareness) */}
      <OfflineBanner />
    </div>
    </SocketProvider>
  );
}
