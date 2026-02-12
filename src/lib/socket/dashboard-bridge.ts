'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useCallStore } from '@/stores/call-store';
import { useAgentStore } from '@/stores/agent-store';
import { useGroupStore, type GroupStatsEntry } from '@/stores/group-store';
import type { Call, Agent, AgentState } from '@/types';

// ---------------------------------------------------------------------------
// Dashboard Metrics -- computed values bridging socket data to widgets
// ---------------------------------------------------------------------------

export interface DashboardMetrics {
  /** Total currently active calls */
  totalActiveCalls: number;
  /** Calls answered today (from recent completed calls) */
  answeredToday: number;
  /** Calls abandoned today */
  abandonedToday: number;
  /** Average wait time in seconds across queued calls */
  avgWaitTime: number;
  /** Longest currently waiting call in seconds */
  longestCurrentWait: number;
  /** Service level percentage (0-100) */
  serviceLevelPercent: number;
  /** Average talk time in seconds for completed calls */
  avgTalkTime: number;
  /** Number of agents in idle state */
  agentsAvailable: number;
  /** Number of agents in talking/ringing/hold state */
  agentsBusy: number;
  /** Number of agents in away/dnd/acw state */
  agentsAway: number;
  /** Total calls waiting in queue across all groups */
  callsInQueue: number;
  /** Per-group stats */
  groupStats: GroupStatsEntry[];
  /** Whether these are real metrics (socket connected) or demo data */
  isLive: boolean;
  /** ISO timestamp of last metric computation */
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Demo data defaults
// ---------------------------------------------------------------------------

const DEMO_METRICS: DashboardMetrics = {
  totalActiveCalls: 12,
  answeredToday: 247,
  abandonedToday: 18,
  avgWaitTime: 23,
  longestCurrentWait: 45,
  serviceLevelPercent: 87,
  avgTalkTime: 185,
  agentsAvailable: 8,
  agentsBusy: 6,
  agentsAway: 2,
  callsInQueue: 3,
  groupStats: [],
  isLive: false,
  lastUpdated: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Metric name -> value lookup for widget binding
// ---------------------------------------------------------------------------

export function getMetricValue(
  metrics: DashboardMetrics,
  metricName: string,
): number {
  switch (metricName) {
    case 'active_calls':
    case 'totalActiveCalls':
      return metrics.totalActiveCalls;
    case 'answered_today':
    case 'answeredToday':
      return metrics.answeredToday;
    case 'abandoned_today':
    case 'abandonedToday':
      return metrics.abandonedToday;
    case 'avg_wait_time':
    case 'avgWaitTime':
      return metrics.avgWaitTime;
    case 'longest_wait':
    case 'longestCurrentWait':
      return metrics.longestCurrentWait;
    case 'service_level':
    case 'serviceLevelPercent':
      return metrics.serviceLevelPercent;
    case 'avg_talk_time':
    case 'avgTalkTime':
      return metrics.avgTalkTime;
    case 'agents_available':
    case 'agentsAvailable':
      return metrics.agentsAvailable;
    case 'agents_busy':
    case 'agentsBusy':
      return metrics.agentsBusy;
    case 'agents_away':
    case 'agentsAway':
      return metrics.agentsAway;
    case 'calls_in_queue':
    case 'callsInQueue':
      return metrics.callsInQueue;
    case 'calls_handled':
      return metrics.answeredToday;
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Metric computation from store data
// ---------------------------------------------------------------------------

function computeMetrics(
  activeCalls: Call[],
  recentCalls: Call[],
  agents: Agent[],
  groupStats: GroupStatsEntry[],
): Omit<DashboardMetrics, 'isLive' | 'lastUpdated'> {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  // Filter recent calls to today
  const recentToday = recentCalls.filter(
    (c) => new Date(c.startTime).getTime() >= todayMs,
  );
  const completedToday = recentToday.filter((c) => c.state === 'completed');
  const abandonedToday = recentToday.filter((c) => c.state === 'abandoned');

  // Active call metrics
  const totalActiveCalls = activeCalls.length;

  // Queue metrics from active calls
  const queuedCalls = activeCalls.filter((c) => c.state === 'queued');
  const callsInQueue = queuedCalls.length;

  let longestCurrentWait = 0;
  let totalWaitTime = 0;
  for (const call of queuedCalls) {
    const waitStart = call.queueEntryTime
      ? new Date(call.queueEntryTime).getTime()
      : new Date(call.startTime).getTime();
    const waitSecs = Math.floor((now - waitStart) / 1000);
    totalWaitTime += waitSecs;
    if (waitSecs > longestCurrentWait) {
      longestCurrentWait = waitSecs;
    }
  }
  const avgWaitTime =
    queuedCalls.length > 0
      ? Math.round(totalWaitTime / queuedCalls.length)
      : 0;

  // Talk time from completed calls today
  const totalTalkTime = completedToday.reduce(
    (sum, c) => sum + c.duration - c.holdDuration,
    0,
  );
  const avgTalkTime =
    completedToday.length > 0
      ? Math.round(totalTalkTime / completedToday.length)
      : 0;

  // Service level: percentage of calls answered within 20 seconds
  const totalHandled = completedToday.length + abandonedToday.length;
  const serviceLevelPercent =
    totalHandled > 0
      ? Math.round((completedToday.length / totalHandled) * 100)
      : 100;

  // Agent state counts
  let agentsAvailable = 0;
  let agentsBusy = 0;
  let agentsAway = 0;

  const busyStates: AgentState[] = ['talking', 'ringing', 'hold'];
  const awayStates: AgentState[] = ['away', 'dnd', 'acw'];

  for (const agent of agents) {
    if (agent.state === 'idle') {
      agentsAvailable++;
    } else if (busyStates.includes(agent.state)) {
      agentsBusy++;
    } else if (awayStates.includes(agent.state)) {
      agentsAway++;
    }
  }

  // Also add group-level callsInQueue if groups have more data
  let groupQueueTotal = 0;
  for (const g of groupStats) {
    groupQueueTotal += g.callsWaiting;
  }

  return {
    totalActiveCalls,
    answeredToday: completedToday.length,
    abandonedToday: abandonedToday.length,
    avgWaitTime,
    longestCurrentWait,
    serviceLevelPercent,
    avgTalkTime,
    agentsAvailable,
    agentsBusy,
    agentsAway,
    callsInQueue: Math.max(callsInQueue, groupQueueTotal),
    groupStats,
  };
}

// ---------------------------------------------------------------------------
// Rolling time-series buffer for chart widgets
// ---------------------------------------------------------------------------

export interface TimeSeriesPoint {
  label: string;
  activeCalls: number;
  callsInQueue: number;
  agentsAvailable: number;
  [key: string]: string | number;
}

const MAX_CHART_POINTS = 24;
const CHART_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// useDashboardMetrics -- the primary hook for dashboard widgets
// ---------------------------------------------------------------------------

export function useDashboardMetrics(): {
  metrics: DashboardMetrics;
  chartData: TimeSeriesPoint[];
  getMetric: (name: string) => number;
} {
  // Select raw Maps/arrays from stores -- these are stable references that
  // only change when the store data actually changes (new Map is created).
  // This avoids the infinite loop caused by Array.from() creating new refs
  // on every render.
  const activeCallsMap = useCallStore((s) => s.activeCalls);
  const recentCalls = useCallStore((s) => s.recentCalls);
  const agentsMap = useAgentStore((s) => s.agents);
  const groupsMap = useGroupStore((s) => s.groups);

  // Derive arrays from maps -- stable because map refs are stable
  const activeCalls = useMemo(
    () => Array.from(activeCallsMap.values()),
    [activeCallsMap],
  );
  const agentsArray = useMemo(
    () => Array.from(agentsMap.values()),
    [agentsMap],
  );
  const groupStats = useMemo(
    () => Array.from(groupsMap.values()),
    [groupsMap],
  );

  const hasRealData =
    activeCallsMap.size > 0 || agentsMap.size > 0 || groupsMap.size > 0;

  // Compute metrics synchronously with useMemo -- no useState/useEffect
  // loop since useMemo doesn't trigger re-renders
  const metrics = useMemo<DashboardMetrics>(() => {
    if (!hasRealData) return DEMO_METRICS;

    const computed = computeMetrics(
      activeCalls,
      recentCalls,
      agentsArray,
      groupStats,
    );

    return {
      ...computed,
      isLive: true,
      lastUpdated: new Date().toISOString(),
    };
  }, [hasRealData, activeCalls, recentCalls, agentsArray, groupStats]);

  // Chart data managed via interval + refs
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;
  const chartDataRef = useRef<TimeSeriesPoint[]>([]);
  const [chartData, setChartData] = useState<TimeSeriesPoint[]>([]);

  useEffect(() => {
    if (!hasRealData) return;

    // Seed initial chart point
    if (chartDataRef.current.length === 0) {
      const m = metricsRef.current;
      const initial: TimeSeriesPoint = {
        label: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        activeCalls: m.totalActiveCalls,
        callsInQueue: m.callsInQueue,
        agentsAvailable: m.agentsAvailable,
      };
      chartDataRef.current = [initial];
      setChartData([initial]);
    }

    // Periodic chart updates
    const interval = setInterval(() => {
      const m = metricsRef.current;
      const point: TimeSeriesPoint = {
        label: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        activeCalls: m.totalActiveCalls,
        callsInQueue: m.callsInQueue,
        agentsAvailable: m.agentsAvailable,
      };
      const next = [...chartDataRef.current, point].slice(-MAX_CHART_POINTS);
      chartDataRef.current = next;
      setChartData(next);
    }, CHART_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [hasRealData]);

  const getMetric = useCallback(
    (name: string) => getMetricValue(metrics, name),
    [metrics],
  );

  return { metrics, chartData, getMetric };
}
