'use client';

import { cn } from '@/lib/utils';
import { useAgents } from '@/stores/agent-store';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Agent, AgentState } from '@/types';

// ---------------------------------------------------------------------------
// AgentBoxWidget -- grid of agent cards sorted by state
// ---------------------------------------------------------------------------

/** Sort priority: talking first, then ringing, acw, hold, idle, dnd, away, logged-out */
const STATE_SORT_ORDER: Record<AgentState, number> = {
  talking: 0,
  ringing: 1,
  hold: 2,
  acw: 3,
  idle: 4,
  dnd: 5,
  away: 6,
  'logged-out': 7,
  unknown: 8,
};

function formatStateDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}:${String(s).padStart(2, '0')}`;
  const h = Math.floor(m / 60);
  return `${h}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface AgentCardProps {
  agent: Agent;
  onClick?: (agent: Agent) => void;
}

function AgentCard({ agent, onClick }: AgentCardProps) {
  return (
    <button
      onClick={() => onClick?.(agent)}
      className={cn(
        'flex flex-col items-start gap-1 p-2.5 rounded-lg border border-border',
        'bg-surface-base hover:bg-surface-elevated',
        'transition-colors duration-fast text-left w-full',
      )}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-body-sm text-content-primary truncate font-medium">
          {agent.name}
        </span>
        <StatusBadge status={agent.state} size="sm" />
      </div>
      <div className="flex items-center justify-between w-full">
        <span className="text-caption text-content-tertiary font-mono">
          x{agent.extension}
        </span>
        <span className="text-mono-sm text-content-tertiary font-mono tabular-nums">
          {formatStateDuration(agent.stateDuration)}
        </span>
      </div>
      <StatusBadge status={agent.state} size="sm" showLabel />
    </button>
  );
}

export interface AgentBoxWidgetProps {
  /** Optional group filter */
  groupId?: string;
  onAgentClick?: (agent: Agent) => void;
}

export function AgentBoxWidget({ groupId, onAgentClick }: AgentBoxWidgetProps) {
  const allAgents = useAgents();

  const agents = allAgents
    .filter((a) => (groupId ? a.groups.includes(groupId) : true))
    .sort(
      (a, b) =>
        (STATE_SORT_ORDER[a.state] ?? 99) - (STATE_SORT_ORDER[b.state] ?? 99),
    );

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-body-sm text-content-tertiary">
        No agents found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 h-full overflow-y-auto auto-rows-min">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} onClick={onAgentClick} />
      ))}
    </div>
  );
}
