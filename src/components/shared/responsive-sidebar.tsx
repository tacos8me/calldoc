'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { SIDEBAR, TOP_BAR } from '@/lib/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  section: string;
  adminOnly?: boolean;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

// Group nav items by section
function groupBySection(items: NavItem[]): NavGroup[] {
  const groups: NavGroup[] = [];
  let lastSection = '';
  for (const item of items) {
    if (item.section !== lastSection) {
      groups.push({ section: item.section, items: [item] });
      lastSection = item.section;
    } else {
      groups[groups.length - 1].items.push(item);
    }
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Sidebar navigation content (shared between desktop and mobile)
// ---------------------------------------------------------------------------

function SidebarNav({
  navItems,
  collapsed,
  onNavClick,
}: {
  navItems: NavItem[];
  collapsed: boolean;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  const navGroups = groupBySection(navItems);

  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2">
      {navGroups.map((group) => (
        <div key={group.section} className="mb-3">
          {!collapsed && (
            <span className="block px-3 pt-3 pb-1 text-overline text-content-tertiary uppercase tracking-widest">
              {group.section}
            </span>
          )}
          {group.items.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                onClick={onNavClick}
                className={cn(
                  'flex items-center gap-3 rounded-md transition-colors duration-fast',
                  collapsed
                    ? 'justify-center h-10 w-10 mx-auto my-1'
                    : 'h-9 px-3 my-0.5',
                  isActive
                    ? 'bg-accent-subtle text-accent border-l-2 border-accent'
                    : 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary',
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && (
                  <span className="text-body-md truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Mobile drawer overlay sidebar
// ---------------------------------------------------------------------------

export function MobileSidebar({
  navItems,
  open,
  onClose,
}: {
  navItems: NavItem[];
  open: boolean;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={cn(
          'absolute inset-y-0 left-0 flex flex-col w-64 bg-surface-card border-r border-border',
          'shadow-xl animate-slide-up',
        )}
        style={{ width: SIDEBAR.expandedWidth }}
      >
        {/* Header with close */}
        <div className="flex items-center justify-between px-4 border-b border-border" style={{ height: TOP_BAR.height }}>
          <span className="text-heading-lg text-content-primary font-bold">
            Call<span className="text-accent">Doc</span>
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-content-tertiary hover:text-content-secondary hover:bg-surface-elevated transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarNav navItems={navItems} collapsed={false} onNavClick={onClose} />
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Responsive sidebar wrapper -- desktop (fixed) + mobile (drawer)
// ---------------------------------------------------------------------------

export interface ResponsiveSidebarProps {
  navItems: NavItem[];
}

export function ResponsiveSidebar({ navItems }: ResponsiveSidebarProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Track responsive breakpoint
  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setMobileOpen(false);
      }
      // Auto-collapse on tablet (1024-1279)
      if (window.innerWidth >= 1024 && window.innerWidth < 1280) {
        setSidebarCollapsed(true);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  // Persist sidebar state
  useEffect(() => {
    const saved = localStorage.getItem('calldoc-sidebar-collapsed');
    if (saved !== null && !isMobile) {
      setSidebarCollapsed(saved === 'true');
    }
  }, [setSidebarCollapsed, isMobile]);

  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('calldoc-sidebar-collapsed', String(collapsed));
    }
  }, [collapsed, isMobile]);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      {/* Desktop sidebar -- hidden on mobile */}
      {!isMobile && (
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-30 flex-col border-r border-border',
            'bg-surface-card transition-[width] duration-smooth ease-in-out',
            'hidden lg:flex',
          )}
          style={{
            width: collapsed ? SIDEBAR.collapsedWidth : SIDEBAR.expandedWidth,
          }}
        >
          {/* Logo */}
          <div
            className={cn(
              'flex items-center shrink-0 border-b border-border',
              collapsed ? 'justify-center px-2' : 'px-4',
            )}
            style={{ height: TOP_BAR.height }}
          >
            {collapsed ? (
              <span className="text-heading-md text-accent font-bold">C</span>
            ) : (
              <span className="text-heading-lg text-content-primary font-bold">
                Call<span className="text-accent">Doc</span>
              </span>
            )}
          </div>

          <SidebarNav navItems={navItems} collapsed={collapsed} />

          {/* Collapse toggle */}
          <div className="shrink-0 border-t border-border p-2">
            <button
              onClick={toggleSidebar}
              className={cn(
                'flex items-center justify-center rounded-md',
                'text-content-tertiary hover:text-content-secondary hover:bg-surface-elevated',
                'transition-colors duration-fast',
                collapsed ? 'h-10 w-10 mx-auto' : 'h-9 w-full gap-2 px-3',
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-body-sm">Collapse</span>
                </>
              )}
            </button>
          </div>
        </aside>
      )}

      {/* Mobile drawer */}
      <MobileSidebar navItems={navItems} open={mobileOpen} onClose={closeMobile} />

      {/* Hamburger button exposed for the top bar on mobile */}
      {isMobile && (
        <MobileMenuButton onClick={openMobile} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Hamburger button for mobile (rendered in the top bar area)
// ---------------------------------------------------------------------------

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'lg:hidden p-2 rounded-md',
        'text-content-secondary hover:text-content-primary hover:bg-surface-elevated',
        'transition-colors duration-fast',
      )}
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
