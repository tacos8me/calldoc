'use client';

import * as React from 'react';

// ---------------------------------------------------------------------------
// FocusTrap -- Traps keyboard focus within a container element.
// Used for modals, dialogs, and dropdown panels to ensure WCAG 2.1 AA
// compliance for keyboard navigation.
//
// Features:
// - Tab cycles within the container (wraps from last to first and vice versa)
// - Escape key calls onEscape callback (typically closes the container)
// - Auto-focuses the first focusable element on mount
// - Restores focus to the previously focused element on unmount
// ---------------------------------------------------------------------------

interface FocusTrapProps {
  children: React.ReactNode;
  /** Called when Escape key is pressed */
  onEscape?: () => void;
  /** Whether focus trapping is active (default: true) */
  active?: boolean;
  /** Whether to auto-focus the first focusable element on mount (default: true) */
  autoFocus?: boolean;
  /** Whether to restore focus to the previous element on unmount (default: true) */
  restoreFocus?: boolean;
  /** Optional element to focus initially (by query selector) */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

export function FocusTrap({
  children,
  onEscape,
  active = true,
  autoFocus = true,
  restoreFocus = true,
  initialFocusRef,
  className,
}: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  // Store the previously focused element before we trap focus
  React.useEffect(() => {
    if (active && restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    return () => {
      // Restore focus on unmount
      if (restoreFocus && previousFocusRef.current) {
        try {
          previousFocusRef.current.focus();
        } catch {
          // Element may no longer be in the DOM
        }
      }
    };
  }, [active, restoreFocus]);

  // Auto-focus on mount
  React.useEffect(() => {
    if (!active || !autoFocus) return;

    // Small delay to ensure the container is rendered
    const timer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [active, autoFocus, initialFocusRef]);

  // Handle keyboard events for focus trapping
  React.useEffect(() => {
    if (!active) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab on first element -> wrap to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab on last element -> wrap to first
      if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
        return;
      }

      // If focus is outside the container, bring it back
      if (!container.contains(document.activeElement)) {
        e.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [active, onEscape]);

  return (
    <div ref={containerRef} className={className} role="presentation">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkipToContent -- Invisible link that becomes visible on focus.
// Allows keyboard users to skip navigation and jump to main content.
// WCAG 2.1 AA: SC 2.4.1 Bypass Blocks
// ---------------------------------------------------------------------------

interface SkipToContentProps {
  /** The ID of the main content element to skip to */
  contentId?: string;
  /** Label text (default: "Skip to main content") */
  label?: string;
}

export function SkipToContent({
  contentId = 'main-content',
  label = 'Skip to main content',
}: SkipToContentProps) {
  return (
    <a
      href={`#${contentId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-hover"
    >
      {label}
    </a>
  );
}

// ---------------------------------------------------------------------------
// VisuallyHidden -- Renders content that is invisible but accessible
// to screen readers. Use for icon-only buttons or decorative elements
// that need text alternatives.
// ---------------------------------------------------------------------------

interface VisuallyHiddenProps {
  children: React.ReactNode;
  /** Render as a specific element (default: span) */
  as?: 'span' | 'div' | 'p' | 'label';
}

export function VisuallyHidden({
  children,
  as: Component = 'span',
}: VisuallyHiddenProps) {
  return <Component className="sr-only">{children}</Component>;
}

// ---------------------------------------------------------------------------
// LiveRegion -- ARIA live region for dynamic announcements.
// Screen readers will announce content changes in this region.
// ---------------------------------------------------------------------------

interface LiveRegionProps {
  children: React.ReactNode;
  /** Politeness level: 'polite' waits for idle, 'assertive' interrupts */
  politeness?: 'polite' | 'assertive';
  /** Whether the entire region should be re-read on changes */
  atomic?: boolean;
  /** Relevant types of changes to announce */
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}

export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true,
  relevant = 'additions',
}: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      role={politeness === 'assertive' ? 'alert' : 'status'}
      className="sr-only"
    >
      {children}
    </div>
  );
}
