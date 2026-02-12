'use client';

import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/theme';

// ---------------------------------------------------------------------------
// GroupBoxWidget -- hunt group status summary with key metrics
// ---------------------------------------------------------------------------

export interface GroupBoxData {
  groupName: string;
  agentsAvailable: number;
  agentsBusy: number;
  agentsTotal: number;
  callsWaiting: number;
  longestWaitSeconds: number;
  serviceLevel: number;
}

export interface GroupBoxWidgetProps {
  data?: GroupBoxData;
}

function formatWaitTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getCallsWaitingColor(count: number): string {
  if (count === 0) return STATUS_COLORS.success;
  if (count <= 3) return STATUS_COLORS.warning;
  return STATUS_COLORS.danger;
}

function getServiceLevelColor(percent: number): string {
  if (percent >= 80) return STATUS_COLORS.success;
  if (percent >= 60) return STATUS_COLORS.warning;
  return STATUS_COLORS.danger;
}

const MOCK_DATA: GroupBoxData = {
  groupName: 'Sales Queue',
  agentsAvailable: 5,
  agentsBusy: 7,
  agentsTotal: 12,
  callsWaiting: 2,
  longestWaitSeconds: 145,
  serviceLevel: 87,
};

export function GroupBoxWidget({ data = MOCK_DATA }: GroupBoxWidgetProps) {
  const callsColor = getCallsWaitingColor(data.callsWaiting);
  const slColor = getServiceLevelColor(data.serviceLevel);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Top stats row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Agents */}
        <div className="flex flex-col gap-1 p-2 rounded-md bg-surface-elevated/50">
          <span className="text-caption text-content-tertiary">Agents</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-heading-lg text-content-primary font-mono tabular-nums">
              {data.agentsAvailable}
            </span>
            <span className="text-caption text-content-tertiary">
              / {data.agentsTotal}
            </span>
          </div>
          <div className="flex items-center gap-2 text-caption">
            <span className="text-status-success">{data.agentsAvailable} avail</span>
            <span className="text-content-tertiary">{data.agentsBusy} busy</span>
          </div>
        </div>

        {/* Calls Waiting */}
        <div className="flex flex-col gap-1 p-2 rounded-md bg-surface-elevated/50">
          <span className="text-caption text-content-tertiary">Calls Waiting</span>
          <span
            className="text-heading-lg font-mono tabular-nums"
            style={{ color: callsColor }}
          >
            {data.callsWaiting}
          </span>
          <span className="text-caption text-content-tertiary">
            Max: {formatWaitTime(data.longestWaitSeconds)}
          </span>
        </div>
      </div>

      {/* Service Level */}
      <div className="flex flex-col gap-1.5 mt-auto">
        <div className="flex items-center justify-between">
          <span className="text-caption text-content-tertiary">Service Level</span>
          <span
            className="text-heading-md font-mono tabular-nums"
            style={{ color: slColor }}
          >
            {data.serviceLevel}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-elevated overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-counter"
            style={{
              width: `${Math.min(data.serviceLevel, 100)}%`,
              backgroundColor: slColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}
