'use client';

import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Keyboard Shortcuts System
// ---------------------------------------------------------------------------

export interface ShortcutDef {
  /** Human-readable key combo, e.g. "Cmd+K", "Shift+ArrowLeft", "F" */
  key: string;
  /** The raw KeyboardEvent.key value (e.g. 'k', 'F', 'ArrowLeft', '/', '?') */
  eventKey: string;
  /** Require Cmd (Mac) / Ctrl (Windows) modifier */
  meta?: boolean;
  /** Require Shift modifier */
  shift?: boolean;
  /** Require Alt modifier */
  alt?: boolean;
  /** Description of the action for the help dialog */
  description: string;
  /** Category for grouping in the help dialog */
  category: string;
  /** Handler to execute when the shortcut fires */
  handler: () => void;
  /** If true, fires even when focus is in input/textarea (default: false) */
  global?: boolean;
}

/**
 * Returns true if the currently focused element is a text input field.
 * Used to skip keyboard shortcuts while the user is typing.
 */
function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if ((el as HTMLElement).contentEditable === 'true') return true;
  return false;
}

/**
 * Registers keyboard shortcuts and unregisters them on unmount.
 * Respects input focus -- shortcuts without `global: true` are skipped
 * when the user is typing in an input/textarea.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutDef[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const inputFocused = isInputFocused();

      for (const shortcut of shortcutsRef.current) {
        // Skip non-global shortcuts when typing
        if (inputFocused && !shortcut.global) continue;

        const metaMatch = shortcut.meta
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        // For meta shortcuts, we only check meta requirement; for non-meta we make sure meta is not pressed
        const metaOk = shortcut.meta
          ? (e.metaKey || e.ctrlKey)
          : !(e.metaKey || e.ctrlKey);

        if (
          e.key === shortcut.eventKey &&
          metaOk &&
          shiftMatch &&
          altMatch
        ) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}

// ---------------------------------------------------------------------------
// Pre-configured shortcut definitions (no handlers -- those are page-specific)
// These are used by the KeyboardHelpDialog to display all available shortcuts.
// ---------------------------------------------------------------------------

export interface ShortcutInfo {
  key: string;
  description: string;
  category: string;
}

export const GLOBAL_SHORTCUTS: ShortcutInfo[] = [
  { key: 'Cmd+K', description: 'Open command palette', category: 'Global' },
  { key: 'Cmd+/', description: 'Toggle sidebar', category: 'Global' },
  { key: 'Escape', description: 'Close modal / panel / palette', category: 'Global' },
  { key: '?', description: 'Show keyboard shortcuts', category: 'Global' },
];

export const TABLE_SHORTCUTS: ShortcutInfo[] = [
  { key: 'J', description: 'Move to next row', category: 'Table Navigation' },
  { key: 'K', description: 'Move to previous row', category: 'Table Navigation' },
  { key: 'Enter', description: 'Expand / collapse selected row', category: 'Table Navigation' },
  { key: 'F', description: 'Toggle filter panel', category: 'Table Navigation' },
  { key: 'R', description: 'Refresh data', category: 'Table Navigation' },
  { key: 'E', description: 'Export data', category: 'Table Navigation' },
];

export const REPORT_SHORTCUTS: ShortcutInfo[] = [
  { key: 'Cmd+Enter', description: 'Generate report', category: 'Reports' },
  { key: 'Cmd+E', description: 'Export report', category: 'Reports' },
];

export const RECORDING_SHORTCUTS: ShortcutInfo[] = [
  { key: 'Space', description: 'Play / pause recording', category: 'Recording Player' },
  { key: 'ArrowLeft', description: 'Skip backward 5s', category: 'Recording Player' },
  { key: 'ArrowRight', description: 'Skip forward 5s', category: 'Recording Player' },
  { key: 'Shift+ArrowLeft', description: 'Skip backward 30s', category: 'Recording Player' },
  { key: 'Shift+ArrowRight', description: 'Skip forward 30s', category: 'Recording Player' },
  { key: '[', description: 'Set snippet start', category: 'Recording Player' },
  { key: ']', description: 'Set snippet end', category: 'Recording Player' },
];

export const NAVIGATION_SHORTCUTS: ShortcutInfo[] = [
  { key: 'G then D', description: 'Go to Dashboard', category: 'Navigation' },
  { key: 'G then C', description: 'Go to Calls', category: 'Navigation' },
  { key: 'G then A', description: 'Go to Agent Timeline', category: 'Navigation' },
  { key: 'G then R', description: 'Go to Reports', category: 'Navigation' },
  { key: 'G then T', description: 'Go to Transcriptions', category: 'Navigation' },
  { key: 'G then W', description: 'Go to Wallboards', category: 'Navigation' },
  { key: 'G then S', description: 'Go to Admin Settings', category: 'Navigation' },
];

export const ALL_SHORTCUTS: ShortcutInfo[] = [
  ...GLOBAL_SHORTCUTS,
  ...NAVIGATION_SHORTCUTS,
  ...TABLE_SHORTCUTS,
  ...REPORT_SHORTCUTS,
  ...RECORDING_SHORTCUTS,
];
