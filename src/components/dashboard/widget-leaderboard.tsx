'use client';

import { cn } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/theme';

// ---------------------------------------------------------------------------
// LeaderboardWidget -- ranked list of agents by a metric
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  rank: number;
  agentName: string;
  value: number;
}

export interface LeaderboardWidgetProps {
  /** Metric label to display */
  metricLabel?: string;
  /** Leaderboard entries (pre-sorted) */
  entries?: LeaderboardEntry[];
  /** Max entries to show */
  maxItems?: number;
  /** Value formatter */
  formatValue?: (v: number) => string;
}

const RANK_ACCENTS: Record<number, string> = {
  1: '#FFD700', // gold
  2: '#C0C0C0', // silver
  3: '#CD7F32', // bronze
};

export const DEMO_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  { rank: 1, agentName: 'Sarah Johnson', value: 47 },
  { rank: 2, agentName: 'Michael Chen', value: 42 },
  { rank: 3, agentName: 'Emily Davis', value: 38 },
  { rank: 4, agentName: 'Robert Wilson', value: 35 },
  { rank: 5, agentName: 'Jessica Brown', value: 31 },
  { rank: 6, agentName: 'David Lee', value: 28 },
  { rank: 7, agentName: 'Amanda Taylor', value: 24 },
  { rank: 8, agentName: 'Chris Martinez', value: 21 },
  { rank: 9, agentName: 'Lisa Anderson', value: 18 },
  { rank: 10, agentName: 'James Thomas', value: 15 },
];

export function LeaderboardWidget({
  metricLabel = 'Calls Handled',
  entries,
  maxItems = 10,
  formatValue,
}: LeaderboardWidgetProps) {
  const displayEntries = (entries ?? []).slice(0, maxItems);
  const maxValue = displayEntries.length > 0 ? displayEntries[0].value : 1;

  if (displayEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-body-sm text-content-tertiary">
        No data available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-1">
      {/* Metric header */}
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-border">
        <span className="text-caption text-content-tertiary uppercase tracking-wider">
          Agent
        </span>
        <span className="text-caption text-content-tertiary uppercase tracking-wider">
          {metricLabel}
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex flex-col gap-0.5 overflow-y-auto flex-1 min-h-0 -mx-1 px-1">
        {displayEntries.map((entry) => {
          const barWidth = maxValue > 0 ? (entry.value / maxValue) * 100 : 0;
          const rankAccent = RANK_ACCENTS[entry.rank];
          const barColor = rankAccent ?? CHART_COLORS[0];

          return (
            <div
              key={entry.rank}
              className={cn(
                'relative flex items-center gap-2 py-1.5 px-2 rounded-md',
                'hover:bg-surface-elevated/50 transition-colors duration-fast',
              )}
            >
              {/* Bar background */}
              <div
                className="absolute inset-0 rounded-md opacity-10 transition-all duration-chart"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: barColor,
                }}
              />

              {/* Rank */}
              <span
                className={cn(
                  'relative shrink-0 w-6 text-center font-mono text-caption tabular-nums font-semibold',
                  rankAccent ? '' : 'text-content-tertiary',
                )}
                style={rankAccent ? { color: rankAccent } : undefined}
              >
                {entry.rank}
              </span>

              {/* Agent name */}
              <span className="relative flex-1 text-body-sm text-content-primary truncate">
                {entry.agentName}
              </span>

              {/* Value */}
              <span
                className={cn(
                  'relative shrink-0 font-mono text-body-sm tabular-nums',
                  rankAccent ? 'font-semibold' : 'text-content-secondary',
                )}
                style={rankAccent ? { color: rankAccent } : undefined}
              >
                {formatValue ? formatValue(entry.value) : entry.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
