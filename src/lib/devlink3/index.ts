// ─── DevLink3 Service Orchestrator ───────────────────────────────────────────
// Connects all DevLink3 components (connection, auth, parser) into a
// single service that maintains call/agent state and publishes events
// to Redis for consumption by the Socket.io layer.

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { DevLink3Connection } from './connection';
import type { DevLink3ConnectionConfig } from './connection';
import { authenticate, requestEvents } from './auth';
import { parseDelta3Event, mapCallState, mapEquipmentType } from './parser';
import type { Delta3Record, Delta3DetailRecord } from '@/types/devlink3';
import { EquipmentType, EVENT_FLAGS } from '@/types/devlink3';
import type { Call, CallDirection } from '@/types/calls';
import type { Agent, AgentState } from '@/types/agents';
import {
  REDIS_CHANNELS,
  type CallEventMessage,
  type AgentStateMessage,
  type GroupStatsMessage,
} from '@/types/redis-events';

/**
 * Configuration for the DevLink3 service.
 */
export interface DevLink3ServiceConfig {
  /** IP Office hostname or IP address */
  host: string;
  /** TCP port (default 50797) */
  port?: number;
  /** Use TLS transport */
  useTls?: boolean;
  /** DevLink3 service user name */
  username: string;
  /** DevLink3 service user password */
  password: string;
  /** Event flags to subscribe to (default: '-CallDelta3 -CMExtn') */
  eventFlags?: string;
  /** Redis connection URL (default: redis://localhost:6379) */
  redisUrl?: string;
}

/**
 * In-memory call state used for correlation between Delta3 events.
 */
interface CallStateEntry {
  call: Call;
  lastUpdate: number;
}

/**
 * In-memory agent state used for tracking state transitions.
 */
interface AgentStateEntry {
  agent: Agent;
  lastUpdate: number;
}

/**
 * Group statistics tracker.
 */
interface GroupStatsEntry {
  groupId: string;
  groupName: string;
  callsWaiting: number;
  longestWaitStart: number;
  agentsAvailable: number;
  agentsBusy: number;
}

/**
 * DevLink3Service orchestrates the full lifecycle of a DevLink3 connection:
 * TCP connection, authentication, event registration, Delta3 parsing,
 * state management, and Redis publication.
 *
 * @example
 * ```ts
 * const service = new DevLink3Service();
 * await service.start({
 *   host: '192.168.1.1',
 *   username: 'devlink',
 *   password: 'secret',
 * });
 * ```
 */
export class DevLink3Service extends EventEmitter {
  private connection: DevLink3Connection;
  private redis: Redis | null = null;
  private config: DevLink3ServiceConfig | null = null;
  private callMap: Map<string, CallStateEntry> = new Map();
  private agentMap: Map<string, AgentStateEntry> = new Map();
  private groupMap: Map<string, GroupStatsEntry> = new Map();
  private isRunning = false;
  private eventCount = 0;

  constructor() {
    super();
    this.connection = new DevLink3Connection();
    this.setupConnectionHandlers();
  }

  /**
   * Start the DevLink3 service: connect, authenticate, register for events,
   * and begin processing the Delta3 event stream.
   *
   * @param config - Service configuration
   */
  async start(config: DevLink3ServiceConfig): Promise<void> {
    this.config = config;
    this.isRunning = true;

    // Initialize Redis publisher
    const redisUrl = config.redisUrl ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 500, 5000),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    try {
      await this.redis.connect();
      this.log('Redis publisher connected');
    } catch (err) {
      this.log(`Redis connection failed: ${err instanceof Error ? err.message : err}`);
      // Continue without Redis -- events will be emitted locally
    }

    await this.connectAndAuth();
  }

  /**
   * Stop the DevLink3 service and clean up resources.
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    this.connection.disconnect();

    if (this.redis) {
      await this.redis.quit().catch(() => {});
      this.redis = null;
    }

    this.callMap.clear();
    this.agentMap.clear();
    this.groupMap.clear();
    this.log('Service stopped');
  }

  /** Get the current number of tracked active calls. */
  get activeCallCount(): number {
    return this.callMap.size;
  }

  /** Get the total number of events processed since start. */
  get totalEventCount(): number {
    return this.eventCount;
  }

  /** Get a snapshot of the current call map. */
  getActiveCalls(): Call[] {
    return Array.from(this.callMap.values()).map((e) => e.call);
  }

  /** Get a snapshot of the current agent map. */
  getAgents(): Agent[] {
    return Array.from(this.agentMap.values()).map((e) => e.agent);
  }

  /**
   * Connect to IP Office, authenticate, and request events.
   */
  private async connectAndAuth(): Promise<void> {
    if (!this.config || !this.isRunning) return;

    const { host, port = 50797, useTls, username, password, eventFlags } = this.config;

    try {
      await this.connection.connect({
        host,
        port,
        useTls,
        autoReconnect: true,
      });

      this.log('TCP connected, starting authentication...');

      const authOk = await authenticate(this.connection, username, password);
      if (!authOk) {
        this.log('Authentication failed -- will retry on reconnect');
        this.emit('error', new Error('Authentication failed'));
        return;
      }

      this.log('Authenticated, requesting events...');

      const flags = eventFlags ?? `${EVENT_FLAGS.CALL_DELTA3} ${EVENT_FLAGS.CM_EXTN}`;
      const eventsOk = await requestEvents(this.connection, flags);
      if (!eventsOk) {
        this.log('Event registration failed');
        this.emit('error', new Error('Event registration failed'));
        return;
      }

      this.log('Event stream active -- processing Delta3 events');
      this.emit('ready');
    } catch (err) {
      this.log(`Connection sequence failed: ${err instanceof Error ? err.message : err}`);
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Set up event handlers on the DevLink3Connection.
   */
  private setupConnectionHandlers(): void {
    this.connection.on('delta3', (xml: string) => {
      this.handleDelta3(xml);
    });

    this.connection.on('disconnected', (reason: string) => {
      this.log(`Disconnected: ${reason}`);
      this.emit('disconnected', reason);

      // On reconnect, the connection will fire 'connected' and we re-auth.
      // Only re-authenticate and re-register events -- do NOT call connectAndAuth()
      // which would redundantly call connection.connect() on an already-connected socket.
      if (this.isRunning) {
        this.connection.once('connected', async () => {
          if (!this.config || !this.isRunning) return;
          this.log('Reconnected, re-authenticating...');
          try {
            const { username, password, eventFlags } = this.config;
            const authOk = await authenticate(this.connection, username, password);
            if (!authOk) {
              this.log('Re-authentication failed -- will retry on next reconnect');
              this.emit('error', new Error('Re-authentication failed'));
              return;
            }
            const flags = eventFlags ?? `${EVENT_FLAGS.CALL_DELTA3} ${EVENT_FLAGS.CM_EXTN}`;
            const eventsOk = await requestEvents(this.connection, flags);
            if (!eventsOk) {
              this.log('Event re-registration failed');
              return;
            }
            this.log('Re-authenticated and event stream restored');
            this.emit('ready');
          } catch (err) {
            this.log(`Re-auth sequence failed: ${err instanceof Error ? err.message : err}`);
            this.emit('error', err instanceof Error ? err : new Error(String(err)));
          }
        });
      }
    });

    this.connection.on('error', (err: Error) => {
      this.log(`Connection error: ${err.message}`);
      this.emit('error', err);
    });
  }

  /**
   * Handle a raw Delta3 XML event string.
   */
  private handleDelta3(xml: string): void {
    this.eventCount++;

    const record = parseDelta3Event(xml);
    if (!record) return;

    switch (record.recordType) {
      case 'Detail':
        this.processDetailRecord(record);
        break;
      case 'CallLost':
        this.processCallLost(record.callId, record.cause);
        break;
      case 'LinkLost':
        // LinkLost events are informational -- log but don't modify state
        this.log(`LinkLost: node=${record.nodeId}`);
        break;
      case 'AttemptReject':
        this.processAttemptReject(record.callId, record.partyName);
        break;
    }
  }

  /**
   * Process a Detail record: update call state, agent state, and group stats.
   */
  private processDetailRecord(record: Delta3DetailRecord): void {
    const { call: callData, partyA, partyB, targets } = record;
    const callId = callData.callId;
    const now = new Date().toISOString();

    // Determine call direction
    const direction = this.determineDirection(partyA, partyB);

    // Determine caller/called info
    const callerNumber = partyA.dir === 'I' ? partyA.callingPN : partyA.dialPN || partyA.calledPN;
    const calledNumber = partyA.dir === 'I' ? (partyA.calledPN || partyA.dialPN) : (partyB?.callingPN || '');
    const callerName = partyA.dir === 'I' ? partyA.name : null;
    const calledName = partyB?.name || null;

    // Determine agent info -- the internal party is the agent
    let agentExtension: string | null = null;
    let agentName: string | null = null;
    if (this.isInternalDevice(partyA.eqType)) {
      agentExtension = partyA.name;
      agentName = partyA.name;
    } else if (partyB && this.isInternalDevice(partyB.eqType)) {
      agentExtension = partyB.name;
      agentName = partyB.name;
    }

    // Determine trunk ID
    let trunkId: string | null = null;
    if (this.isTrunkDevice(partyA.eqType)) {
      trunkId = partyA.slot || partyA.name;
    } else if (partyB && this.isTrunkDevice(partyB.eqType)) {
      trunkId = partyB.slot || partyB.name;
    }

    // Map call state
    const state = mapCallState(callData.state);

    // Build or update call object
    const existing = this.callMap.get(callId);
    const callObj: Call = {
      id: callId,
      direction,
      state,
      callerNumber: callerNumber || existing?.call.callerNumber || '',
      callerName: callerName || existing?.call.callerName || null,
      calledNumber: calledNumber || existing?.call.calledNumber || '',
      calledName: calledName || existing?.call.calledName || null,
      queueName: callData.targetGroup || callData.origGroup || existing?.call.queueName || null,
      queueEntryTime: existing?.call.queueEntryTime || (state === 'queued' ? now : null),
      agentExtension: agentExtension || existing?.call.agentExtension || null,
      agentName: agentName || existing?.call.agentName || null,
      trunkId: trunkId || existing?.call.trunkId || null,
      startTime: existing?.call.startTime || (callData.stamp ? new Date(callData.stamp * 1000).toISOString() : now),
      answerTime: existing?.call.answerTime ||
        (state === 'connected' && callData.connStamp ? new Date(callData.connStamp * 1000).toISOString() : null),
      endTime: null,
      duration: callData.connDur || existing?.call.duration || 0,
      holdCount: existing?.call.holdCount || (state === 'hold' ? (existing?.call.holdCount ?? 0) + 1 : 0),
      holdDuration: existing?.call.holdDuration || 0,
      transferCount: callData.xfer || existing?.call.transferCount || 0,
      recordingId: existing?.call.recordingId || null,
      tags: existing?.call.tags || [],
    };

    const isNew = !existing;
    this.callMap.set(callId, { call: callObj, lastUpdate: Date.now() });

    // Publish call event to Redis
    const eventType = isNew ? 'call:created' : 'call:updated';
    this.publishCallEvent(eventType, callId, callObj);

    // Update agent state from this call
    if (agentExtension) {
      this.updateAgentState(agentExtension, agentName || agentExtension, state, callId);
    }

    // Update group stats
    if (callData.targetGroup) {
      this.updateGroupStats(callData.targetGroup, state);
    }

    // Clean up completed calls after a delay
    if (state === 'completed' || state === 'idle') {
      callObj.endTime = now;
      this.publishCallEvent('call:ended', callId, callObj);

      // Remove from active map after 5 seconds (allow final events to arrive)
      setTimeout(() => {
        this.callMap.delete(callId);
      }, 5_000);

      // Mark agent as idle
      if (agentExtension) {
        this.updateAgentState(agentExtension, agentName || agentExtension, 'idle', null);
      }
    }
  }

  /**
   * Process a CallLost event: end the call.
   */
  private processCallLost(callId: string, cause: number): void {
    const existing = this.callMap.get(callId);
    if (!existing) return;

    const now = new Date().toISOString();
    existing.call.state = 'completed';
    existing.call.endTime = now;

    this.publishCallEvent('call:ended', callId, existing.call);

    // Update agent if applicable
    if (existing.call.agentExtension) {
      this.updateAgentState(
        existing.call.agentExtension,
        existing.call.agentName || existing.call.agentExtension,
        'idle',
        null
      );
    }

    setTimeout(() => {
      this.callMap.delete(callId);
    }, 5_000);
  }

  /**
   * Process an AttemptReject event.
   */
  private processAttemptReject(callId: string, partyName: string): void {
    this.log(`AttemptReject: callId=${callId}, party=${partyName}`);
    // The call continues to ring other targets; no state change needed
    // unless all targets have rejected
  }

  /**
   * Determine call direction based on party information.
   */
  private determineDirection(
    partyA: { eqType: number; dir: string },
    partyB: { eqType: number; dir: string } | null
  ): CallDirection {
    const aIsTrunk = this.isTrunkDevice(partyA.eqType);
    const bIsTrunk = partyB ? this.isTrunkDevice(partyB.eqType) : false;

    if (aIsTrunk && !bIsTrunk) {
      // Trunk -> Extension = inbound
      return partyA.dir === 'I' ? 'inbound' : 'outbound';
    }
    if (!aIsTrunk && bIsTrunk) {
      // Extension -> Trunk = outbound
      return 'outbound';
    }
    if (!aIsTrunk && !bIsTrunk) {
      // Extension -> Extension = internal
      return 'internal';
    }
    // Trunk -> Trunk (rare, tandem)
    return partyA.dir === 'I' ? 'inbound' : 'outbound';
  }

  /**
   * Check if an equipment type is a trunk device.
   */
  private isTrunkDevice(eqType: number): boolean {
    return (
      eqType === EquipmentType.ISDNTrunk ||
      eqType === EquipmentType.SIPTrunk ||
      eqType === 3 || // AlogTrunk
      eqType === 4 || // H323Trunk
      eqType === 6 || // T1Trunk
      eqType === 7    // R2Trunk
    );
  }

  /**
   * Check if an equipment type is an internal phone device.
   */
  private isInternalDevice(eqType: number): boolean {
    return (
      eqType === EquipmentType.TDMPhone ||
      eqType === EquipmentType.H323Phone ||
      eqType === EquipmentType.SIPDevice ||
      eqType === EquipmentType.WebRTCPhone ||
      eqType === 11   // DECTPhone
    );
  }

  /**
   * Update agent state based on call activity.
   */
  private updateAgentState(
    extension: string,
    name: string,
    callState: string,
    callId: string | null
  ): void {
    const agentId = `agent-${extension}`;
    const now = new Date().toISOString();

    const existing = this.agentMap.get(agentId);
    const previousState: AgentState = existing?.agent.state ?? 'unknown';

    // Map call state to agent state
    let newState: AgentState;
    switch (callState) {
      case 'connected':
        newState = 'talking';
        break;
      case 'ringing':
        newState = 'ringing';
        break;
      case 'hold':
        newState = 'hold';
        break;
      case 'idle':
      case 'completed':
        newState = 'idle';
        break;
      case 'queued':
        newState = 'ringing';
        break;
      default:
        newState = 'talking';
    }

    // Don't publish if state hasn't changed
    if (previousState === newState && existing?.agent.activeCallId === callId) return;

    const agent: Agent = {
      id: agentId,
      extension,
      name,
      state: newState,
      stateStartTime: now,
      stateDuration: 0,
      activeCallId: callId,
      groups: existing?.agent.groups ?? [],
      skills: existing?.agent.skills ?? [],
      loginTime: existing?.agent.loginTime ?? now,
    };

    this.agentMap.set(agentId, { agent, lastUpdate: Date.now() });

    // Publish agent state change
    const message: AgentStateMessage = {
      type: 'agent:state_changed',
      agentId,
      extension,
      previousState,
      newState,
      timestamp: now,
      callId,
    };

    this.publishToRedis(REDIS_CHANNELS.agents, message);
    this.emit('agent:state', message);
  }

  /**
   * Update hunt group statistics.
   */
  private updateGroupStats(groupName: string, callState: string): void {
    const groupId = `group-${groupName}`;
    let entry = this.groupMap.get(groupId);

    if (!entry) {
      entry = {
        groupId,
        groupName,
        callsWaiting: 0,
        longestWaitStart: 0,
        agentsAvailable: 0,
        agentsBusy: 0,
      };
      this.groupMap.set(groupId, entry);
    }

    // Recompute from call map
    let waiting = 0;
    let longestWait = 0;

    for (const [, { call }] of this.callMap) {
      if (call.queueName === groupName && call.state === 'queued') {
        waiting++;
        if (call.queueEntryTime) {
          const waitMs = Date.now() - new Date(call.queueEntryTime).getTime();
          longestWait = Math.max(longestWait, Math.floor(waitMs / 1000));
        }
      }
    }

    // Recompute agent counts from agent map
    let available = 0;
    let busy = 0;
    for (const [, { agent }] of this.agentMap) {
      if (agent.groups.includes(groupId) || agent.groups.includes(groupName)) {
        if (agent.state === 'idle') available++;
        else if (agent.state === 'talking' || agent.state === 'ringing') busy++;
      }
    }

    entry.callsWaiting = waiting;
    entry.longestWaitStart = longestWait;
    entry.agentsAvailable = available;
    entry.agentsBusy = busy;

    const message: GroupStatsMessage = {
      type: 'group:stats_updated',
      groupId,
      callsWaiting: waiting,
      longestWait,
      agentsAvailable: available,
      agentsBusy: busy,
    };

    this.publishToRedis(REDIS_CHANNELS.groups, message);
    this.emit('group:stats', message);
  }

  /**
   * Publish a call event to Redis.
   */
  private publishCallEvent(type: 'call:created' | 'call:updated' | 'call:ended', callId: string, data: Call): void {
    const message: CallEventMessage = {
      type,
      callId,
      data,
      timestamp: new Date().toISOString(),
    };

    this.publishToRedis(REDIS_CHANNELS.calls, message);
    this.emit(type, message);
  }

  /**
   * Publish a message to a Redis channel.
   */
  private publishToRedis(channel: string, message: object): void {
    if (!this.redis) return;

    try {
      this.redis.publish(channel, JSON.stringify(message)).catch((err) => {
        this.log(`Redis publish error on ${channel}: ${err.message}`);
      });
    } catch (err) {
      this.log(`Redis publish error: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Internal logging helper.
   */
  private log(message: string): void {
    console.log(`[${new Date().toISOString()}] [DevLink3:Service] ${message}`);
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

/** Singleton DevLink3Service instance for use across the application. */
export const devlink3Service = new DevLink3Service();

// Re-export sub-modules
export { DevLink3Connection } from './connection';
export { authenticate, requestEvents, computeChallengeResponse } from './auth';
export { parseDelta3Event, mapCallState, mapEquipmentType, mapCalledType, mapCauseCode } from './parser';
