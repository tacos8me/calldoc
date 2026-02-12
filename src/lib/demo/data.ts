// ---------------------------------------------------------------------------
// Demo Data Generator -- seeds Zustand stores with realistic data when
// not connected to a live PBX. Simulates periodic state changes.
// ---------------------------------------------------------------------------

import { useCallStore } from '@/stores/call-store';
import { useAgentStore } from '@/stores/agent-store';
import { useGroupStore } from '@/stores/group-store';
import { useUIStore } from '@/stores/ui-store';
import type { Call, CallState, CallDirection, Agent, AgentState } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_NAMES = [
  'Sarah Johnson', 'Michael Chen', 'Emily Davis', 'Robert Wilson',
  'Jessica Brown', 'David Lee', 'Amanda Taylor', 'Chris Martinez',
  'Lisa Anderson', 'James Thomas', 'Rachel Kim', 'Daniel Garcia',
  'Michelle White', 'Kevin Harris', 'Laura Clark', 'Brian Lewis',
];

const EXTENSIONS = [
  '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008',
  '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016',
];

const GROUPS = [
  { id: 'grp-sales', name: 'Sales' },
  { id: 'grp-support', name: 'Technical Support' },
  { id: 'grp-billing', name: 'Billing' },
];

const CALLER_NUMBERS = [
  '(555) 123-4567', '(555) 234-5678', '(555) 345-6789', '(555) 456-7890',
  '(555) 567-8901', '(555) 678-9012', '(555) 789-0123', '(555) 890-1234',
  '(555) 901-2345', '(555) 012-3456', '(212) 555-1234', '(310) 555-5678',
  '(415) 555-9012', '(617) 555-3456', '(972) 555-7890', '(503) 555-2345',
];

const CALLER_NAMES = [
  'John Smith', 'Maria Rodriguez', 'William Brown', 'Jennifer Davis',
  'Thomas Miller', 'Patricia Wilson', 'Charles Anderson', 'Barbara Thomas',
  'Joseph Jackson', 'Margaret White', null, null, null, null, null, null,
];

const ACTIVE_STATES: AgentState[] = ['idle', 'talking', 'ringing', 'hold', 'acw', 'dnd', 'away'];
const CALL_ACTIVE_STATES: CallState[] = ['ringing', 'connected', 'hold', 'queued'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function minutesAgo(min: number): string {
  return new Date(Date.now() - min * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Generate demo agents
// ---------------------------------------------------------------------------

function generateDemoAgents(): Agent[] {
  const stateDistribution: AgentState[] = [
    'talking', 'talking', 'talking', 'talking', 'talking',
    'idle', 'idle', 'idle', 'idle',
    'ringing', 'ringing',
    'acw', 'acw',
    'hold',
    'away',
    'dnd',
  ];

  return AGENT_NAMES.map((name, i) => {
    const state = stateDistribution[i] ?? 'idle';
    const agentGroups: string[] = [];
    // Assign agents to 1-2 groups
    if (i < 6) agentGroups.push(GROUPS[0].id);
    if (i >= 4 && i < 11) agentGroups.push(GROUPS[1].id);
    if (i >= 9) agentGroups.push(GROUPS[2].id);

    return {
      id: `agent-${i + 1}`,
      extension: EXTENSIONS[i],
      name,
      state,
      stateStartTime: minutesAgo(randomInt(0, 15)),
      stateDuration: randomInt(5, 900),
      activeCallId: state === 'talking' || state === 'ringing' ? `demo-call-${i}` : null,
      groups: agentGroups,
      skills: [],
      loginTime: minutesAgo(randomInt(60, 480)),
    };
  });
}

// ---------------------------------------------------------------------------
// Generate demo calls
// ---------------------------------------------------------------------------

function generateDemoCalls(agents: Agent[]): Call[] {
  const talkingAgents = agents.filter((a) => a.state === 'talking' || a.state === 'ringing' || a.state === 'hold');
  const calls: Call[] = [];

  // Calls tied to agents
  for (const agent of talkingAgents) {
    const direction: CallDirection = pick(['inbound', 'inbound', 'inbound', 'outbound']);
    const callerIdx = randomInt(0, CALLER_NUMBERS.length - 1);
    const startMinAgo = randomInt(0, 10);
    const duration = randomInt(10, 600);

    const state: CallState = agent.state === 'ringing' ? 'ringing'
      : agent.state === 'hold' ? 'hold'
      : 'connected';

    calls.push({
      id: agent.activeCallId ?? randomId(),
      direction,
      state,
      callerNumber: direction === 'inbound' ? CALLER_NUMBERS[callerIdx] : agent.extension,
      callerName: direction === 'inbound' ? CALLER_NAMES[callerIdx] ?? null : agent.name,
      calledNumber: direction === 'inbound' ? agent.extension : CALLER_NUMBERS[callerIdx],
      calledName: direction === 'inbound' ? agent.name : CALLER_NAMES[callerIdx] ?? null,
      queueName: pick([GROUPS[0].name, GROUPS[1].name, null]),
      queueEntryTime: null,
      agentExtension: agent.extension,
      agentName: agent.name,
      trunkId: `T${randomInt(1, 4)}`,
      startTime: minutesAgo(startMinAgo),
      answerTime: state !== 'ringing' ? minutesAgo(startMinAgo - 0.2) : null,
      endTime: null,
      duration,
      holdCount: state === 'hold' ? 1 : 0,
      holdDuration: state === 'hold' ? randomInt(5, 60) : 0,
      transferCount: 0,
      recordingId: null,
      tags: [],
    });
  }

  // 2-3 queued calls (no agent yet)
  for (let i = 0; i < randomInt(2, 3); i++) {
    const callerIdx = randomInt(0, CALLER_NUMBERS.length - 1);
    const queueGroup = pick(GROUPS);
    const waitMinutes = randomInt(0, 3);

    calls.push({
      id: `demo-queued-${i}`,
      direction: 'inbound',
      state: 'queued',
      callerNumber: CALLER_NUMBERS[callerIdx],
      callerName: CALLER_NAMES[callerIdx] ?? null,
      calledNumber: queueGroup.name,
      calledName: queueGroup.name,
      queueName: queueGroup.name,
      queueEntryTime: minutesAgo(waitMinutes),
      agentExtension: null,
      agentName: null,
      trunkId: `T${randomInt(1, 4)}`,
      startTime: minutesAgo(waitMinutes + 0.5),
      answerTime: null,
      endTime: null,
      duration: 0,
      holdCount: 0,
      holdDuration: 0,
      transferCount: 0,
      recordingId: null,
      tags: [],
    });
  }

  return calls;
}

// ---------------------------------------------------------------------------
// Generate demo group stats (derived from agents)
// ---------------------------------------------------------------------------

function computeGroupStats(agents: Agent[], calls: Call[]) {
  for (const group of GROUPS) {
    const groupAgents = agents.filter((a) => a.groups.includes(group.id));
    const available = groupAgents.filter((a) => a.state === 'idle').length;
    const busy = groupAgents.filter((a) =>
      ['talking', 'ringing', 'hold'].includes(a.state),
    ).length;
    const away = groupAgents.filter((a) =>
      ['away', 'dnd', 'acw'].includes(a.state),
    ).length;
    const queuedCalls = calls.filter(
      (c) => c.state === 'queued' && c.queueName === group.name,
    );
    const longestWait = queuedCalls.reduce((max, c) => {
      const wait = c.queueEntryTime
        ? Math.floor((Date.now() - new Date(c.queueEntryTime).getTime()) / 1000)
        : 0;
      return Math.max(max, wait);
    }, 0);

    useGroupStore.getState().updateGroup(group.id, {
      id: group.id,
      name: group.name,
      agentsAvailable: available,
      agentsBusy: busy,
      agentsAway: away,
      callsWaiting: queuedCalls.length,
      longestWait,
      answeredToday: randomInt(40, 120),
      abandonedToday: randomInt(2, 15),
      serviceLevelPercent: randomInt(78, 96),
    });
  }
}

// ---------------------------------------------------------------------------
// Periodic demo simulation
// ---------------------------------------------------------------------------

let demoInterval: ReturnType<typeof setInterval> | null = null;
let demoAgents: Agent[] = [];

function simulateTick() {
  const agentStore = useAgentStore.getState();
  const callStore = useCallStore.getState();

  // Pick 1-2 agents and change their state
  const agentIds = Array.from(agentStore.agents.keys());
  const numChanges = randomInt(1, 2);

  for (let i = 0; i < numChanges && agentIds.length > 0; i++) {
    const agentId = pick(agentIds);
    const agent = agentStore.agents.get(agentId);
    if (!agent) continue;

    // Determine a realistic next state
    let nextState: AgentState;
    switch (agent.state) {
      case 'idle':
        nextState = pick(['ringing', 'idle', 'idle', 'dnd']);
        break;
      case 'ringing':
        nextState = pick(['talking', 'talking', 'idle']);
        break;
      case 'talking':
        nextState = pick(['talking', 'talking', 'talking', 'acw', 'hold']);
        break;
      case 'hold':
        nextState = pick(['talking', 'talking', 'idle']);
        break;
      case 'acw':
        nextState = pick(['idle', 'idle', 'acw']);
        break;
      case 'dnd':
        nextState = pick(['idle', 'dnd']);
        break;
      case 'away':
        nextState = pick(['idle', 'away']);
        break;
      default:
        nextState = 'idle';
    }

    const now = new Date().toISOString();

    // Handle call lifecycle with agent state change
    if (nextState === 'ringing' && agent.state === 'idle') {
      // New incoming call
      const callId = randomId();
      const callerIdx = randomInt(0, CALLER_NUMBERS.length - 1);
      const newCall: Call = {
        id: callId,
        direction: 'inbound',
        state: 'ringing',
        callerNumber: CALLER_NUMBERS[callerIdx],
        callerName: CALLER_NAMES[callerIdx] ?? null,
        calledNumber: agent.extension,
        calledName: agent.name,
        queueName: null,
        queueEntryTime: null,
        agentExtension: agent.extension,
        agentName: agent.name,
        trunkId: `T${randomInt(1, 4)}`,
        startTime: now,
        answerTime: null,
        endTime: null,
        duration: 0,
        holdCount: 0,
        holdDuration: 0,
        transferCount: 0,
        recordingId: null,
        tags: [],
      };
      callStore.upsertCall(newCall);
      agentStore.updateAgentState(agentId, nextState, now, callId);
    } else if (nextState === 'talking' && agent.state === 'ringing') {
      // Answer the call
      if (agent.activeCallId) {
        const call = callStore.activeCalls.get(agent.activeCallId);
        if (call) {
          callStore.upsertCall({ ...call, state: 'connected', answerTime: now });
        }
      }
      agentStore.updateAgentState(agentId, nextState, now, agent.activeCallId);
    } else if ((nextState === 'acw' || nextState === 'idle') && (agent.state === 'talking' || agent.state === 'hold')) {
      // End the call
      if (agent.activeCallId) {
        callStore.removeCall(agent.activeCallId);
      }
      agentStore.updateAgentState(agentId, nextState, now, null);
    } else if (nextState === 'hold' && agent.state === 'talking') {
      // Put call on hold
      if (agent.activeCallId) {
        const call = callStore.activeCalls.get(agent.activeCallId);
        if (call) {
          callStore.upsertCall({ ...call, state: 'hold', holdCount: call.holdCount + 1 });
        }
      }
      agentStore.updateAgentState(agentId, nextState, now, agent.activeCallId);
    } else {
      agentStore.updateAgentState(agentId, nextState, now, agent.activeCallId);
    }
  }

  // Recompute group stats based on current store data
  const currentAgents = Array.from(agentStore.agents.values());
  const currentCalls = Array.from(callStore.activeCalls.values());
  computeGroupStats(currentAgents, currentCalls);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function generateRecentCalls(): Call[] {
  const recent: Call[] = [];
  const count = randomInt(15, 25);

  for (let i = 0; i < count; i++) {
    const callerIdx = randomInt(0, CALLER_NUMBERS.length - 1);
    const agentIdx = randomInt(0, AGENT_NAMES.length - 1);
    const direction: CallDirection = pick(['inbound', 'inbound', 'outbound']);
    const startMin = randomInt(5, 240);
    const duration = randomInt(30, 600);
    const isAbandoned = Math.random() < 0.12;

    recent.push({
      id: `demo-recent-${i}`,
      direction,
      state: isAbandoned ? 'abandoned' : 'completed',
      callerNumber: CALLER_NUMBERS[callerIdx],
      callerName: CALLER_NAMES[callerIdx] ?? null,
      calledNumber: EXTENSIONS[agentIdx],
      calledName: AGENT_NAMES[agentIdx],
      queueName: pick(GROUPS).name,
      queueEntryTime: null,
      agentExtension: isAbandoned ? null : EXTENSIONS[agentIdx],
      agentName: isAbandoned ? null : AGENT_NAMES[agentIdx],
      trunkId: `T${randomInt(1, 4)}`,
      startTime: minutesAgo(startMin),
      answerTime: isAbandoned ? null : minutesAgo(startMin - 0.5),
      endTime: minutesAgo(startMin - duration / 60),
      duration: isAbandoned ? randomInt(5, 30) : duration,
      holdCount: Math.random() < 0.2 ? 1 : 0,
      holdDuration: Math.random() < 0.2 ? randomInt(5, 45) : 0,
      transferCount: Math.random() < 0.1 ? 1 : 0,
      recordingId: null,
      tags: [],
    });
  }

  return recent;
}

export function startDemoMode(): void {
  // Don't start if already running
  if (demoInterval) return;

  // Generate initial data
  demoAgents = generateDemoAgents();
  const demoCalls = generateDemoCalls(demoAgents);
  const recentCalls = generateRecentCalls();

  // Seed agent store
  useAgentStore.getState().setAgents(demoAgents);

  // Seed call store with active calls
  for (const call of demoCalls) {
    useCallStore.getState().upsertCall(call);
  }

  // Seed recent completed calls (add then remove to push to ring buffer)
  for (const call of recentCalls) {
    useCallStore.getState().upsertCall(call);
    useCallStore.getState().removeCall(call.id);
  }

  // Seed group store
  computeGroupStats(demoAgents, demoCalls);

  // Mark demo mode in UI store
  useUIStore.getState().setDemoMode(true);

  // Start periodic updates (every 3 seconds)
  demoInterval = setInterval(simulateTick, 3000);
}

export function stopDemoMode(): void {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }

  // Clear demo data from stores
  useCallStore.getState().clearAll();
  useAgentStore.getState().setAgents([]);
  useGroupStore.getState().clearAll();
  useUIStore.getState().setDemoMode(false);

  demoAgents = [];
}

export function isDemoRunning(): boolean {
  return demoInterval !== null;
}
