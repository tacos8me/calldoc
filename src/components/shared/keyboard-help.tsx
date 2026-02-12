'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ALL_SHORTCUTS,
  type ShortcutInfo,
} from '@/hooks/use-keyboard-shortcuts';
import { FocusTrap } from '@/components/shared/focus-trap';

// ---------------------------------------------------------------------------
// KeyboardHelpDialog -- modal showing all available shortcuts grouped by
// context. Triggered by Cmd+/ or "?" key.
// ---------------------------------------------------------------------------

function ShortcutKey({ keyLabel }: { keyLabel: string }) {
  // Split compound keys like "Cmd+K" into individual badges
  const parts = keyLabel.split('+');
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((part, i) => (
        <span key={i}>
          <kbd
            className={cn(
              'inline-flex h-6 min-w-[24px] items-center justify-center rounded-md',
              'border border-border-strong bg-surface-elevated px-1.5',
              'text-mono-sm font-mono text-content-secondary',
            )}
          >
            {part === 'Cmd' ? (typeof navigator !== 'undefined' && /Mac|iPhone/.test(navigator.userAgent) ? '\u2318' : 'Ctrl') : part}
          </kbd>
          {i < parts.length - 1 && (
            <span className="text-content-tertiary mx-0.5">+</span>
          )}
        </span>
      ))}
    </span>
  );
}

export function KeyboardHelpDialog() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  // Listen for "?" key to open the dialog
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;

      if (e.key === '?') {
        e.preventDefault();
        toggle();
        return;
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, toggle, close]);

  // Group shortcuts by category
  const grouped = useMemo(() => {
    const map = new Map<string, ShortcutInfo[]>();
    for (const s of ALL_SHORTCUTS) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return Array.from(map.entries());
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={close}
      />

      {/* Dialog with focus trap */}
      <FocusTrap onEscape={close} active={open}>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            'w-full max-w-lg rounded-xl border border-border-strong',
            'bg-surface-card shadow-xl overflow-hidden animate-slide-up',
          )}
          role="dialog"
          aria-label="Keyboard shortcuts"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Keyboard className="h-5 w-5 text-accent" />
              <h2 className="text-heading-md text-content-primary">
                Keyboard Shortcuts
              </h2>
            </div>
            <button
              onClick={close}
              className="rounded-md p-1.5 text-content-tertiary hover:bg-surface-elevated hover:text-content-secondary transition-colors duration-fast"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto p-5 space-y-6">
            {grouped.map(([category, shortcuts]) => (
              <div key={category}>
                <h3 className="text-overline text-content-tertiary uppercase tracking-widest mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((s) => (
                    <div
                      key={s.key + s.description}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-body-sm text-content-secondary">
                        {s.description}
                      </span>
                      <ShortcutKey keyLabel={s.key} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-5 py-3">
            <p className="text-caption text-content-tertiary">
              Press <ShortcutKey keyLabel="?" /> to toggle this dialog
            </p>
          </div>
        </div>
      </div>
      </FocusTrap>
    </div>
  );
}
