'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bell,
  AlertTriangle,
  Phone,
  Radio,
  Info,
  Check,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { create } from 'zustand';
import { cn } from '@/lib/utils';
import { FocusTrap } from '@/components/shared/focus-trap';

// ---------------------------------------------------------------------------
// Notification types
// ---------------------------------------------------------------------------

export type NotificationType = 'alert' | 'call' | 'system' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  /** Optional navigation path when clicking the notification */
  href?: string;
}

// ---------------------------------------------------------------------------
// Notification store (Zustand)
// ---------------------------------------------------------------------------

const MAX_NOTIFICATIONS = 50;

interface NotificationStoreState {
  notifications: Notification[];
}

interface NotificationStoreActions {
  add: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'> & { href?: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

type NotificationStore = NotificationStoreState & NotificationStoreActions;

let _idCounter = 0;
function genId(): string {
  _idCounter += 1;
  return `notif-${Date.now()}-${_idCounter}`;
}

export const useNotificationStore = create<NotificationStore>()((set) => ({
  notifications: [],

  add: (partial) =>
    set((state) => {
      const notification: Notification = {
        ...partial,
        id: genId(),
        read: false,
        timestamp: new Date().toISOString(),
      };
      const next = [notification, ...state.notifications];
      // Prune oldest when exceeding max
      if (next.length > MAX_NOTIFICATIONS) {
        next.length = MAX_NOTIFICATIONS;
      }
      return { notifications: next };
    }),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  remove: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clear: () => set({ notifications: [] }),
}));

// ---------------------------------------------------------------------------
// Notification icon by type
// ---------------------------------------------------------------------------

function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case 'alert':
      return <AlertTriangle className="h-4 w-4 text-status-warning" />;
    case 'call':
      return <Phone className="h-4 w-4 text-status-info" />;
    case 'system':
      return <Radio className="h-4 w-4 text-status-danger" />;
    case 'info':
    default:
      return <Info className="h-4 w-4 text-accent" />;
  }
}

// ---------------------------------------------------------------------------
// NotificationCenter component (bell + dropdown)
// ---------------------------------------------------------------------------

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const remove = useNotificationStore((s) => s.remove);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      markRead(notification.id);
      if (notification.href && typeof window !== 'undefined') {
        window.location.href = notification.href;
      }
      setOpen(false);
    },
    [markRead],
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative p-2 rounded-md transition-colors duration-fast',
          'text-content-secondary hover:text-content-primary hover:bg-surface-elevated',
          open && 'bg-surface-elevated text-content-primary',
        )}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center',
              'rounded-full bg-status-danger px-1 text-[10px] font-bold text-white',
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel with focus trap */}
      {open && (
        <FocusTrap onEscape={() => setOpen(false)} active={open}>
        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-80 rounded-xl border border-border-strong',
            'bg-surface-card shadow-lg z-50 overflow-hidden animate-slide-down',
          )}
          role="dialog"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-heading-sm text-content-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-caption text-accent hover:text-accent-hover transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-content-tertiary">
                <Bell className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-body-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'group flex items-start gap-3 px-4 py-3 transition-colors duration-fast cursor-pointer',
                    'hover:bg-surface-elevated border-b border-border last:border-b-0',
                    !notification.read && 'bg-accent-subtle/50',
                  )}
                  onClick={() => handleNotificationClick(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNotificationClick(notification);
                  }}
                >
                  {/* Icon */}
                  <div className="shrink-0 mt-0.5">
                    <NotificationIcon type={notification.type} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'text-body-sm truncate',
                          notification.read ? 'text-content-secondary' : 'text-content-primary font-medium',
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                      )}
                    </div>
                    <p className="text-caption text-content-tertiary truncate mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-mono-sm text-content-tertiary font-mono mt-1">
                      {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Dismiss button (visible on hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(notification.id);
                    }}
                    className={cn(
                      'shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100',
                      'text-content-tertiary hover:text-content-secondary hover:bg-surface-overlay',
                      'transition-all duration-fast',
                    )}
                    aria-label="Dismiss notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        </FocusTrap>
      )}
    </div>
  );
}
