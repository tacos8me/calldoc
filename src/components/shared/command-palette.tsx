'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
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
  PanelLeftClose,
  Search,
  User,
  PhoneCall,
  Plus,
  FileText,
  Download,
  Clock,
  Loader2,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAgents as useAgentsFromStore } from '@/stores/agent-store';
import { useActiveCalls } from '@/stores/call-store';
import { cn } from '@/lib/utils';
import { FocusTrap } from '@/components/shared/focus-trap';

// ---------------------------------------------------------------------------
// Recent commands persistence
// ---------------------------------------------------------------------------

const RECENT_COMMANDS_KEY = 'calldoc:recent-commands';
const MAX_RECENT_COMMANDS = 8;

interface RecentCommand {
  id: string;
  label: string;
  timestamp: number;
}

function getRecentCommands(): RecentCommand[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as RecentCommand[];
  } catch {
    return [];
  }
}

function addRecentCommand(id: string, label: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRecentCommands().filter((c) => c.id !== id);
    const updated = [{ id, label, timestamp: Date.now() }, ...existing].slice(
      0,
      MAX_RECENT_COMMANDS,
    );
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

// ---------------------------------------------------------------------------
// Debounce hook for search
// ---------------------------------------------------------------------------

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ---------------------------------------------------------------------------
// CommandPalette -- Cmd+K global search & action palette (cmdk-powered)
// ---------------------------------------------------------------------------

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
  section: 'recent' | 'pages' | 'agents' | 'calls' | 'actions' | 'quick-actions';
  keywords?: string;
}

export function CommandPalette() {
  const router = useRouter();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const close = useUIStore((s) => s.closeCommandPalette);
  const openPalette = useUIStore((s) => s.openCommandPalette);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  // Real-time data for search
  const storeAgents = useAgentsFromStore();
  const activeCalls = useActiveCalls();

  // Search state
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, 300);
  const [recentCommands, setRecentCommands] = useState<RecentCommand[]>([]);

  // Load recent commands when palette opens
  useEffect(() => {
    if (open) {
      setRecentCommands(getRecentCommands());
      setSearchValue('');
    }
  }, [open]);

  // Global Cmd+K handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) {
          close();
        } else {
          openPalette();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, close, openPalette]);

  const navigate = useCallback(
    (path: string) => {
      router.push(path);
      close();
    },
    [router, close],
  );

  const trackAndExecute = useCallback(
    (id: string, label: string, onSelect: () => void) => {
      addRecentCommand(id, label);
      onSelect();
    },
    [],
  );

  // Search filtered agents
  const matchedAgents = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) return [];
    const q = debouncedSearch.toLowerCase();
    return storeAgents
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.extension.includes(q) ||
          a.id.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [storeAgents, debouncedSearch]);

  // Search filtered active calls
  const matchedCalls = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) return [];
    const q = debouncedSearch.toLowerCase();
    return activeCalls
      .filter(
        (c) =>
          c.callerNumber.includes(q) ||
          (c.callerName && c.callerName.toLowerCase().includes(q)) ||
          c.calledNumber.includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.agentExtension && c.agentExtension.toLowerCase().includes(q)) ||
          (c.agentName && c.agentName.toLowerCase().includes(q)),
      )
      .slice(0, 5);
  }, [activeCalls, debouncedSearch]);

  // Build all command items
  const items: CommandItem[] = useMemo(() => {
    const result: CommandItem[] = [];

    // Recent commands section
    for (const recent of recentCommands) {
      result.push({
        id: `recent-${recent.id}`,
        label: recent.label,
        icon: <Clock className="h-4 w-4" />,
        section: 'recent',
        onSelect: () => {
          // Re-trigger the command by finding the matching page/action
          const pageMap: Record<string, string> = {
            dashboard: '/',
            calls: '/calls',
            'agent-timeline': '/agent-timeline',
            reports: '/reports',
            recordings: '/recordings',
            transcriptions: '/transcriptions',
            wallboards: '/wallboards',
            admin: '/admin/settings',
          };
          if (pageMap[recent.id]) {
            trackAndExecute(recent.id, recent.label, () => navigate(pageMap[recent.id]));
          } else {
            close();
          }
        },
      });
    }

    // Pages
    result.push(
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="h-4 w-4" />,
        shortcut: 'G D',
        section: 'pages',
        keywords: 'home overview main',
        onSelect: () => trackAndExecute('dashboard', 'Dashboard', () => navigate('/')),
      },
      {
        id: 'calls',
        label: 'Calls',
        description: `${activeCalls.length} active`,
        icon: <Phone className="h-4 w-4" />,
        shortcut: 'G C',
        section: 'pages',
        keywords: 'cradle grave c2g phone',
        onSelect: () => trackAndExecute('calls', 'Calls', () => navigate('/calls')),
      },
      {
        id: 'agent-timeline',
        label: 'Agent Timeline',
        description: `${storeAgents.length} agents`,
        icon: <Users className="h-4 w-4" />,
        shortcut: 'G A',
        section: 'pages',
        keywords: 'agents state timeline',
        onSelect: () => trackAndExecute('agent-timeline', 'Agent Timeline', () => navigate('/agent-timeline')),
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: <BarChart3 className="h-4 w-4" />,
        shortcut: 'G R',
        section: 'pages',
        keywords: 'report analytics statistics',
        onSelect: () => trackAndExecute('reports', 'Reports', () => navigate('/reports')),
      },
      {
        id: 'recordings',
        label: 'Recordings',
        icon: <Mic className="h-4 w-4" />,
        section: 'pages',
        keywords: 'recording audio playback',
        onSelect: () => trackAndExecute('recordings', 'Recordings', () => navigate('/recordings')),
      },
      {
        id: 'transcriptions',
        label: 'Transcriptions',
        icon: <FileText className="h-4 w-4" />,
        shortcut: 'G T',
        section: 'pages',
        keywords: 'transcription transcript text speech parakeet',
        onSelect: () => trackAndExecute('transcriptions', 'Transcriptions', () => navigate('/transcriptions')),
      },
      {
        id: 'wallboards',
        label: 'Wallboards',
        icon: <Monitor className="h-4 w-4" />,
        shortcut: 'G W',
        section: 'pages',
        keywords: 'wallboard display screen',
        onSelect: () => trackAndExecute('wallboards', 'Wallboards', () => navigate('/wallboards')),
      },
      {
        id: 'admin',
        label: 'Admin Settings',
        icon: <Settings className="h-4 w-4" />,
        shortcut: 'G S',
        section: 'pages',
        keywords: 'admin settings configuration system',
        onSelect: () => trackAndExecute('admin', 'Admin Settings', () => navigate('/admin/settings')),
      },
    );

    // Dynamic agent results
    for (const agent of matchedAgents) {
      result.push({
        id: `agent-${agent.id}`,
        label: agent.name,
        description: `x${agent.extension} -- ${agent.state}`,
        icon: <User className="h-4 w-4" />,
        section: 'agents',
        keywords: `${agent.name} ${agent.extension} ${agent.state}`,
        onSelect: () =>
          trackAndExecute(`agent-${agent.id}`, agent.name, () =>
            navigate(`/agent-timeline?agentId=${agent.id}`),
          ),
      });
    }

    // Dynamic call results
    for (const call of matchedCalls) {
      result.push({
        id: `call-${call.id}`,
        label: `${call.callerName || call.callerNumber}`,
        description: `${call.direction} -- ${call.state} -- ${call.calledNumber}`,
        icon: <PhoneCall className="h-4 w-4" />,
        section: 'calls',
        keywords: `${call.callerNumber} ${call.callerName} ${call.calledNumber} ${call.id}`,
        onSelect: () =>
          trackAndExecute(`call-${call.id}`, call.callerName || call.callerNumber, () =>
            navigate(`/calls?search=${call.callerNumber}`),
          ),
      });
    }

    // Quick actions
    result.push(
      {
        id: 'action-new-wallboard',
        label: 'Create New Wallboard',
        icon: <Plus className="h-4 w-4" />,
        section: 'quick-actions',
        keywords: 'new wallboard create',
        onSelect: () =>
          trackAndExecute('action-new-wallboard', 'Create New Wallboard', () =>
            navigate('/wallboards?action=new'),
          ),
      },
      {
        id: 'action-generate-report',
        label: 'Generate Report',
        icon: <FileText className="h-4 w-4" />,
        section: 'quick-actions',
        keywords: 'report generate new run',
        onSelect: () =>
          trackAndExecute('action-generate-report', 'Generate Report', () =>
            navigate('/reports?action=new'),
          ),
      },
      {
        id: 'action-export-calls',
        label: 'Export Calls',
        icon: <Download className="h-4 w-4" />,
        section: 'quick-actions',
        keywords: 'export download calls csv',
        onSelect: () =>
          trackAndExecute('action-export-calls', 'Export Calls', () =>
            navigate('/calls?action=export'),
          ),
      },
      {
        id: 'action-new-recording-rule',
        label: 'New Recording Rule',
        icon: <Mic className="h-4 w-4" />,
        section: 'quick-actions',
        keywords: 'recording rule new create',
        onSelect: () =>
          trackAndExecute('action-new-recording-rule', 'New Recording Rule', () =>
            navigate('/admin/settings?tab=recording'),
          ),
      },
    );

    // Actions
    result.push(
      {
        id: 'toggle-theme',
        label: 'Toggle Theme',
        icon:
          theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          ),
        section: 'actions',
        keywords: 'theme dark light mode',
        onSelect: () => {
          trackAndExecute('toggle-theme', 'Toggle Theme', () => {
            setTheme(theme === 'dark' ? 'light' : 'dark');
            close();
          });
        },
      },
      {
        id: 'toggle-sidebar',
        label: 'Toggle Sidebar',
        icon: <PanelLeftClose className="h-4 w-4" />,
        shortcut: 'Cmd+/',
        section: 'actions',
        keywords: 'sidebar collapse expand panel',
        onSelect: () => {
          trackAndExecute('toggle-sidebar', 'Toggle Sidebar', () => {
            toggleSidebar();
            close();
          });
        },
      },
    );

    return result;
  }, [
    recentCommands,
    activeCalls,
    storeAgents,
    matchedAgents,
    matchedCalls,
    theme,
    navigate,
    close,
    setTheme,
    toggleSidebar,
    trackAndExecute,
  ]);

  // Group items by section
  const recentItems = items.filter((i) => i.section === 'recent');
  const pageItems = items.filter((i) => i.section === 'pages');
  const agentItems = items.filter((i) => i.section === 'agents');
  const callItems = items.filter((i) => i.section === 'calls');
  const quickActionItems = items.filter((i) => i.section === 'quick-actions');
  const actionItems = items.filter((i) => i.section === 'actions');

  // Determine if we're actively searching (show loading for debounce)
  const isSearching = searchValue.length >= 2 && searchValue !== debouncedSearch;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Command palette">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={close}
      />

      {/* Palette with focus trap for keyboard accessibility */}
      <FocusTrap onEscape={close} active={open}>
      <div className="absolute inset-0 flex items-start justify-center pt-[20vh]">
        <Command
          className={cn(
            'w-[560px] max-h-[480px] rounded-xl border border-border-strong',
            'bg-surface-card shadow-xl overflow-hidden',
            'animate-slide-up',
          )}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              close();
            }
          }}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="h-4 w-4 text-content-tertiary shrink-0" />
            <Command.Input
              autoFocus
              value={searchValue}
              onValueChange={setSearchValue}
              placeholder="Search agents, calls, pages, or type a command..."
              className={cn(
                'flex-1 h-12 bg-transparent text-body-md text-content-primary',
                'placeholder:text-content-tertiary outline-none',
              )}
            />
            {isSearching && (
              <Loader2 className="h-4 w-4 animate-spin text-content-tertiary shrink-0" />
            )}
          </div>

          {/* Results */}
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-body-sm text-content-tertiary">
              No results found.
            </Command.Empty>

            {/* Recent commands section (only when not searching) */}
            {recentItems.length > 0 && !searchValue && (
              <Command.Group
                heading="Recent"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-overline [&_[cmdk-group-heading]]:text-content-tertiary [&_[cmdk-group-heading]]:uppercase"
              >
                {recentItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`recent ${item.label}`}
                    onSelect={item.onSelect}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer',
                      'text-body-sm text-content-secondary',
                      'data-[selected=true]:bg-accent/10 data-[selected=true]:text-content-primary',
                      'hover:bg-surface-elevated transition-colors duration-fast',
                    )}
                  >
                    <span className="text-content-tertiary">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Agents section (only when searching) */}
            {agentItems.length > 0 && (
              <Command.Group
                heading={`Agents (${agentItems.length})`}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-overline [&_[cmdk-group-heading]]:text-content-tertiary [&_[cmdk-group-heading]]:uppercase"
              >
                {agentItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.keywords ?? ''}`}
                    onSelect={item.onSelect}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer',
                      'text-body-sm text-content-secondary',
                      'data-[selected=true]:bg-accent/10 data-[selected=true]:text-content-primary',
                      'hover:bg-surface-elevated transition-colors duration-fast',
                    )}
                  >
                    <span className="text-content-tertiary">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.description && (
                      <span className="text-mono-sm text-content-tertiary font-mono">
                        {item.description}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Calls section (only when searching) */}
            {callItems.length > 0 && (
              <Command.Group
                heading={`Active Calls (${callItems.length})`}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-overline [&_[cmdk-group-heading]]:text-content-tertiary [&_[cmdk-group-heading]]:uppercase"
              >
                {callItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.keywords ?? ''}`}
                    onSelect={item.onSelect}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer',
                      'text-body-sm text-content-secondary',
                      'data-[selected=true]:bg-accent/10 data-[selected=true]:text-content-primary',
                      'hover:bg-surface-elevated transition-colors duration-fast',
                    )}
                  >
                    <span className="text-content-tertiary">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.description && (
                      <span className="text-mono-sm text-content-tertiary font-mono truncate max-w-[200px]">
                        {item.description}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Pages section */}
            <Command.Group
              heading="Pages"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-overline [&_[cmdk-group-heading]]:text-content-tertiary [&_[cmdk-group-heading]]:uppercase"
            >
              {pageItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.keywords ?? ''}`}
                  onSelect={item.onSelect}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
                    'text-body-md text-content-secondary',
                    'data-[selected=true]:bg-accent/10 data-[selected=true]:text-content-primary',
                    'hover:bg-surface-elevated transition-colors duration-fast',
                  )}
                >
                  <span className="text-content-tertiary">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.description && (
                    <span className="text-mono-sm text-content-tertiary font-mono">
                      {item.description}
                    </span>
                  )}
                  {item.shortcut && (
                    <span className="text-mono-sm text-content-tertiary font-mono ml-2">
                      {item.shortcut}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            {/* Quick Actions section */}
            <Command.Group
              heading="Quick Actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-overline [&_[cmdk-group-heading]]:text-content-tertiary [&_[cmdk-group-heading]]:uppercase"
            >
              {quickActionItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.keywords ?? ''}`}
                  onSelect={item.onSelect}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
                    'text-body-md text-content-secondary',
                    'data-[selected=true]:bg-accent/10 data-[selected=true]:text-content-primary',
                    'hover:bg-surface-elevated transition-colors duration-fast',
                  )}
                >
                  <span className="text-content-tertiary">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Actions section */}
            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-overline [&_[cmdk-group-heading]]:text-content-tertiary [&_[cmdk-group-heading]]:uppercase"
            >
              {actionItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.keywords ?? ''}`}
                  onSelect={item.onSelect}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
                    'text-body-md text-content-secondary',
                    'data-[selected=true]:bg-accent/10 data-[selected=true]:text-content-primary',
                    'hover:bg-surface-elevated transition-colors duration-fast',
                  )}
                >
                  <span className="text-content-tertiary">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-mono-sm text-content-tertiary font-mono">
                      {item.shortcut}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Footer hint */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <div className="flex items-center gap-4 text-[11px] text-content-tertiary">
              <span>
                <kbd className="rounded border border-border bg-surface-elevated px-1 py-0.5 font-mono text-[10px]">
                  Esc
                </kbd>{' '}
                Close
              </span>
              <span>
                <kbd className="rounded border border-border bg-surface-elevated px-1 py-0.5 font-mono text-[10px]">
                  Enter
                </kbd>{' '}
                Select
              </span>
            </div>
            {storeAgents.length > 0 && (
              <span className="text-[11px] text-content-tertiary">
                {storeAgents.length} agents online -- {activeCalls.length} active calls
              </span>
            )}
          </div>
        </Command>
      </div>
      </FocusTrap>
    </div>
  );
}
