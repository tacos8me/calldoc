// ---------------------------------------------------------------------------
// CallDoc - Database Seed Script
//
// Run with: npx tsx src/lib/db/seed.ts  (or npm run db:seed)
//
// Seeds the database with realistic development data:
//   - 1 admin user (admin@calldoc.local)
//   - 5 agents with extensions 1001-1005
//   - 3 hunt groups (Sales, Support, Billing)
//   - 200 call records spanning last 7 days
//   - Call events for each call
//   - 20 recordings
//   - 2 wallboard configurations
//   - 3 report definitions + 1 schedule
//   - 5 alert rules
//   - 1 IP Office system configuration
//   - 1 recording storage pool
// ---------------------------------------------------------------------------

import { db } from './index';
import {
  users,
  agents,
  agentMappings,
  agentStates,
  huntGroups,
  huntGroupMembers,
  calls,
  callEvents,
  recordingStoragePools,
  recordings,
  wallboards,
  wallboardWidgets,
  reportDefinitions,
  reportSchedules,
  alertRules,
  systems,
} from './schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string): void {
  console.log(`[${new Date().toISOString()}] [Seed] ${msg}`);
}

/** Generate a random integer between min and max (inclusive). */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random element from an array. */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a random phone number. */
function randomPhone(): string {
  const area = randInt(200, 999);
  const prefix = randInt(200, 999);
  const line = randInt(1000, 9999);
  return `${area}-${prefix}-${line}`;
}

/** Generate a random date within the last N days with business-hour weighting. */
function randomDateInLastDays(days: number): Date {
  const now = Date.now();
  const daysAgoMs = days * 24 * 60 * 60 * 1000;
  const base = new Date(now - Math.random() * daysAgoMs);

  // Weight toward business hours (9-17) with 70% probability
  if (Math.random() < 0.7) {
    const hour = randInt(9, 17);
    base.setHours(hour, randInt(0, 59), randInt(0, 59), 0);
  }

  return base;
}

// ---------------------------------------------------------------------------
// Seed Data Definitions
// ---------------------------------------------------------------------------

const AGENT_DATA = [
  { extension: '1001', name: 'Sarah Mitchell', firstName: 'Sarah', lastName: 'Mitchell' },
  { extension: '1002', name: 'James Rivera', firstName: 'James', lastName: 'Rivera' },
  { extension: '1003', name: 'Emily Chen', firstName: 'Emily', lastName: 'Chen' },
  { extension: '1004', name: 'Michael Brown', firstName: 'Michael', lastName: 'Brown' },
  { extension: '1005', name: 'Priya Sharma', firstName: 'Priya', lastName: 'Sharma' },
];

const GROUP_DATA = [
  { name: 'Sales', extension: '200', ringMode: 'circular', queueEnabled: true },
  { name: 'Support', extension: '201', ringMode: 'most-idle', queueEnabled: true },
  { name: 'Billing', extension: '202', ringMode: 'linear', queueEnabled: true },
];

const CALLER_NAMES = [
  'John Williams', 'Lisa Anderson', 'David Martinez', 'Karen Taylor',
  'Robert Wilson', 'Jennifer Thomas', 'William Moore', 'Patricia Jackson',
  'Christopher White', 'Amanda Harris', 'Daniel Lewis', 'Stephanie Clark',
  'Matthew Robinson', 'Nicole Walker', 'Andrew Hall', 'Michelle Allen',
  'Joshua Young', 'Laura King', 'Kevin Wright', 'Amber Scott',
];

// ---------------------------------------------------------------------------
// Main Seed Function
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  log('Starting database seed...');

  // ── 1. Admin User ──────────────────────────────────────────────────────
  log('Creating admin user...');
  const [adminUser] = await db
    .insert(users)
    .values({
      email: 'admin@calldoc.local',
      name: 'System Administrator',
      role: 'admin',
      groupAccess: ['*'],
      permissions: ['*'],
      active: true,
    })
    .returning({ id: users.id });
  log(`  Admin user created: ${adminUser.id}`);

  // ── 2. System Configuration ────────────────────────────────────────────
  log('Creating system configuration...');
  const [system] = await db
    .insert(systems)
    .values({
      name: 'IPO-Main',
      description: 'Primary Avaya IP Office 11 system',
      devlinkHost: '192.168.1.10',
      devlinkPort: 50797,
      devlinkUseTls: false,
      devlinkUsername: 'devlink_user',
      devlinkPasswordEncrypted: 'encrypted_placeholder',
      smdrHost: '192.168.1.10',
      smdrPort: 1150,
      smdrEnabled: true,
      timezone: 'America/New_York',
      active: true,
    })
    .returning({ id: systems.id });
  log(`  System created: ${system.id}`);

  // ── 3. Agents ──────────────────────────────────────────────────────────
  log('Creating agents...');
  const agentRecords: Array<{ id: string; extension: string; name: string }> = [];

  for (const agentData of AGENT_DATA) {
    const [agent] = await db
      .insert(agents)
      .values({
        systemId: system.id,
        extension: agentData.extension,
        name: agentData.name,
        firstName: agentData.firstName,
        lastName: agentData.lastName,
        state: 'idle',
        active: true,
        skills: agentData.extension === '1001' || agentData.extension === '1002'
          ? ['sales', 'upsell']
          : agentData.extension === '1003'
            ? ['tech-support', 'networking']
            : ['billing', 'collections'],
      })
      .returning({ id: agents.id, extension: agents.extension, name: agents.name });
    agentRecords.push(agent);
    log(`  Agent: ${agent.name} (${agent.extension})`);

    // Create agent mapping
    await db.insert(agentMappings).values({
      userId: adminUser.id,
      agentId: agent.id,
      extensionNumber: agentData.extension,
      huntGroups: [],
      isPrimary: true,
    });
  }

  // ── 4. Hunt Groups ─────────────────────────────────────────────────────
  log('Creating hunt groups...');
  const groupRecords: Array<{ id: string; name: string }> = [];

  for (const groupData of GROUP_DATA) {
    const [group] = await db
      .insert(huntGroups)
      .values({
        systemId: system.id,
        name: groupData.name,
        extension: groupData.extension,
        ringMode: groupData.ringMode,
        queueEnabled: groupData.queueEnabled,
        voicemailEnabled: true,
        active: true,
      })
      .returning({ id: huntGroups.id, name: huntGroups.name });
    groupRecords.push(group);
    log(`  Group: ${group.name}`);
  }

  // Assign agents to groups
  // Sales: agents 1,2  Support: agents 3,4  Billing: agents 4,5
  const groupAssignments = [
    { groupIdx: 0, agentIdxs: [0, 1] },
    { groupIdx: 1, agentIdxs: [2, 3] },
    { groupIdx: 2, agentIdxs: [3, 4] },
  ];

  for (const assignment of groupAssignments) {
    for (const agentIdx of assignment.agentIdxs) {
      await db.insert(huntGroupMembers).values({
        huntGroupId: groupRecords[assignment.groupIdx].id,
        agentId: agentRecords[agentIdx].id,
        priority: 1,
        isEnabled: true,
      });
    }
  }

  // ── 5. Recording Storage Pool ──────────────────────────────────────────
  log('Creating recording storage pool...');
  const [storagePool] = await db
    .insert(recordingStoragePools)
    .values({
      name: 'Local Storage',
      poolType: 'local',
      path: '/data/recordings',
      maxSizeBytes: 107374182400, // 100 GB
      currentSizeBytes: 0,
      writeEnabled: true,
      deleteEnabled: true,
      retentionMinDays: 30,
      retentionMaxDays: 365,
      active: true,
    })
    .returning({ id: recordingStoragePools.id });

  // ── 6. Calls & Events ─────────────────────────────────────────────────
  log('Creating 200 call records with events...');
  const callRecords: Array<{ id: string; startTime: Date; agentIdx: number }> = [];
  const directions: Array<'inbound' | 'outbound' | 'internal'> = ['inbound', 'outbound', 'internal'];

  for (let i = 0; i < 200; i++) {
    const startTime = randomDateInLastDays(7);
    const agentIdx = randInt(0, agentRecords.length - 1);
    const agent = agentRecords[agentIdx];
    const direction = pickRandom(directions);
    const ringDuration = randInt(2, 15);
    const isAnswered = Math.random() < 0.82; // 82% answer rate
    const talkDuration = isAnswered ? randInt(15, 600) : 0;
    const holdCount = isAnswered && Math.random() < 0.25 ? randInt(1, 3) : 0;
    const holdDuration = holdCount > 0 ? randInt(5, 60) * holdCount : 0;
    const transferCount = isAnswered && Math.random() < 0.12 ? 1 : 0;
    const totalDuration = ringDuration + talkDuration + holdDuration;
    const answerTime = isAnswered
      ? new Date(startTime.getTime() + ringDuration * 1000)
      : null;
    const endTime = new Date(startTime.getTime() + totalDuration * 1000);
    const groupIdx = direction === 'inbound' ? randInt(0, groupRecords.length - 1) : -1;

    const callerNumber = direction === 'inbound' ? randomPhone() : agent.extension;
    const calledNumber = direction === 'inbound' ? agent.extension : randomPhone();
    const callerName = direction === 'inbound' ? pickRandom(CALLER_NAMES) : agent.name;

    const [callRecord] = await db
      .insert(calls)
      .values({
        systemId: system.id,
        externalCallId: `${1000000 + i}`,
        direction,
        state: 'completed',
        callerNumber,
        callerName,
        calledNumber,
        calledName: direction === 'inbound' ? agent.name : pickRandom(CALLER_NAMES),
        queueName: groupIdx >= 0 ? groupRecords[groupIdx].name : null,
        queueEntryTime: groupIdx >= 0 ? startTime : null,
        agentId: agent.id,
        agentExtension: agent.extension,
        agentName: agent.name,
        trunkId: direction !== 'internal' ? `trunk-${randInt(1, 4)}` : null,
        trunkName: direction !== 'internal' ? `SIP Trunk ${randInt(1, 4)}` : null,
        startTime,
        answerTime,
        endTime,
        duration: totalDuration,
        talkDuration,
        holdCount,
        holdDuration,
        transferCount,
        isAnswered,
        isAbandoned: !isAnswered && direction === 'inbound',
        isRecorded: isAnswered && Math.random() < 0.4,
        accountCode: Math.random() < 0.15 ? `AC${randInt(100, 999)}` : null,
        tags: Math.random() < 0.1 ? ['escalated'] : [],
      })
      .returning({ id: calls.id });

    callRecords.push({ id: callRecord.id, startTime, agentIdx });

    // ── Call Events for this call ─────────────────────────────────────
    const eventsList: Array<{
      eventType:
        | 'initiated'
        | 'queued'
        | 'ringing'
        | 'answered'
        | 'held'
        | 'retrieved'
        | 'transferred'
        | 'conferenced'
        | 'parked'
        | 'unparked'
        | 'voicemail'
        | 'completed'
        | 'abandoned'
        | 'dtmf'
        | 'recording_started'
        | 'recording_stopped';
      timestamp: Date;
      duration?: number;
      party?: string;
    }> = [];

    let eventTime = new Date(startTime);

    // Initiated
    eventsList.push({
      eventType: 'initiated',
      timestamp: new Date(eventTime),
      party: callerNumber,
    });

    // Queued (if inbound to a group)
    if (groupIdx >= 0) {
      eventTime = new Date(eventTime.getTime() + 500);
      eventsList.push({
        eventType: 'queued',
        timestamp: new Date(eventTime),
      });
    }

    // Ringing
    eventTime = new Date(eventTime.getTime() + 1000);
    eventsList.push({
      eventType: 'ringing',
      timestamp: new Date(eventTime),
      duration: ringDuration,
      party: agent.extension,
    });

    if (isAnswered) {
      // Answered
      eventTime = new Date(eventTime.getTime() + ringDuration * 1000);
      eventsList.push({
        eventType: 'answered',
        timestamp: new Date(eventTime),
        party: agent.extension,
      });

      // Hold events
      if (holdCount > 0) {
        for (let h = 0; h < holdCount; h++) {
          const holdStartOffset = randInt(10, Math.max(11, talkDuration - 30));
          const singleHoldDuration = Math.floor(holdDuration / holdCount);

          eventTime = new Date(answerTime!.getTime() + holdStartOffset * 1000);
          eventsList.push({
            eventType: 'held',
            timestamp: new Date(eventTime),
            duration: singleHoldDuration,
          });

          eventTime = new Date(eventTime.getTime() + singleHoldDuration * 1000);
          eventsList.push({
            eventType: 'retrieved',
            timestamp: new Date(eventTime),
          });
        }
      }

      // Transfer
      if (transferCount > 0) {
        const transferTarget = agentRecords[(agentIdx + 1) % agentRecords.length];
        eventTime = new Date(answerTime!.getTime() + randInt(30, Math.max(31, talkDuration - 10)) * 1000);
        eventsList.push({
          eventType: 'transferred',
          timestamp: new Date(eventTime),
          party: transferTarget.extension,
        });
      }

      // Completed
      eventsList.push({
        eventType: 'completed',
        timestamp: new Date(endTime),
        duration: totalDuration,
      });
    } else {
      // Abandoned
      eventTime = new Date(startTime.getTime() + totalDuration * 1000);
      eventsList.push({
        eventType: 'abandoned',
        timestamp: new Date(eventTime),
        duration: totalDuration,
      });
    }

    // Batch insert events
    if (eventsList.length > 0) {
      await db.insert(callEvents).values(
        eventsList.map((evt) => ({
          callId: callRecord.id,
          eventType: evt.eventType,
          timestamp: evt.timestamp,
          duration: evt.duration ?? null,
          party: evt.party ?? null,
          agentId: agent.id,
          agentExtension: agent.extension,
          details: {},
        }))
      );
    }

    if ((i + 1) % 50 === 0) {
      log(`  ${i + 1}/200 calls created`);
    }
  }

  // ── 7. Agent State History ─────────────────────────────────────────────
  log('Creating agent state history...');
  const agentStateValues = ['idle', 'talking', 'ringing', 'hold', 'acw'] as const;

  for (const agent of agentRecords) {
    for (let s = 0; s < 10; s++) {
      const stateTime = randomDateInLastDays(2);
      const state = pickRandom([...agentStateValues]);
      const duration = randInt(5, 300);

      await db.insert(agentStates).values({
        agentId: agent.id,
        state,
        previousState: s === 0 ? 'idle' : pickRandom([...agentStateValues]),
        startTime: stateTime,
        endTime: new Date(stateTime.getTime() + duration * 1000),
        duration,
        reason: state === 'acw' ? 'post-call wrap' : null,
      });
    }
  }

  // ── 8. Recordings ──────────────────────────────────────────────────────
  log('Creating 20 recordings...');
  const recordedCalls = callRecords.filter(() => Math.random() < 0.15).slice(0, 20);

  // Pad to 20 if needed
  while (recordedCalls.length < 20 && callRecords.length > 0) {
    const idx = randInt(0, callRecords.length - 1);
    if (!recordedCalls.includes(callRecords[idx])) {
      recordedCalls.push(callRecords[idx]);
    }
  }

  for (let r = 0; r < Math.min(20, recordedCalls.length); r++) {
    const call = recordedCalls[r];
    const agent = agentRecords[call.agentIdx];
    const duration = randInt(30, 300);
    const fileSize = duration * 16000; // ~16KB/s for WAV

    await db.insert(recordings).values({
      callId: call.id,
      agentId: agent.id,
      storagePoolId: storagePool.id,
      storagePath: `/data/recordings/${call.startTime.toISOString().slice(0, 10)}`,
      fileName: `call_${call.id.slice(0, 8)}_${Date.now()}.wav`,
      originalFormat: 'wav',
      storedFormat: 'opus',
      codec: 'opus',
      sampleRate: 16000,
      channels: 1,
      duration,
      durationMs: duration * 1000,
      fileSize,
      sourceType: 'vmpro_ftp',
      matchMethod: 'call_id',
      matchConfidence: 100,
      callerNumber: randomPhone(),
      calledNumber: agent.extension,
      agentName: agent.name,
      direction: 'inbound',
      hasScorecard: false,
      tags: [],
      startTime: call.startTime,
      endTime: new Date(call.startTime.getTime() + duration * 1000),
    });
  }

  // ── 9. Wallboards ──────────────────────────────────────────────────────
  log('Creating 2 wallboard configurations...');

  const [wallboard1] = await db
    .insert(wallboards)
    .values({
      name: 'Main Call Center',
      description: 'Primary wallboard for call center operations',
      createdBy: adminUser.id,
      theme: 'dark',
      resolutionWidth: 1920,
      resolutionHeight: 1080,
      refreshInterval: 15,
      layouts: {},
      isPublished: true,
      active: true,
    })
    .returning({ id: wallboards.id });

  const [wallboard2] = await db
    .insert(wallboards)
    .values({
      name: 'Supervisor Dashboard',
      description: 'Supervisor-focused metrics and alerts',
      createdBy: adminUser.id,
      theme: 'light',
      resolutionWidth: 1920,
      resolutionHeight: 1080,
      refreshInterval: 30,
      layouts: {},
      isPublished: false,
      active: true,
    })
    .returning({ id: wallboards.id });

  // Add widgets to wallboard 1
  await db.insert(wallboardWidgets).values([
    {
      wallboardId: wallboard1.id,
      widgetType: 'active-calls',
      title: 'Active Calls',
      config: { metric: 'calls.active', groups: ['Sales', 'Support', 'Billing'] },
      thresholds: [
        { operator: 'gte' as const, value: 10, color: '#ef4444', flash: true },
        { operator: 'gte' as const, value: 5, color: '#f59e0b' },
      ],
      sortOrder: 0,
    },
    {
      wallboardId: wallboard1.id,
      widgetType: 'agent-box',
      title: 'Agent Status',
      config: { metric: 'agents.state', groups: ['Sales'] },
      thresholds: [],
      sortOrder: 1,
    },
    {
      wallboardId: wallboard1.id,
      widgetType: 'gauge',
      title: 'Service Level',
      config: { metric: 'groups.service_level', groups: ['Support'] },
      thresholds: [
        { operator: 'lt' as const, value: 80, color: '#ef4444' },
        { operator: 'lt' as const, value: 90, color: '#f59e0b' },
      ],
      sortOrder: 2,
    },
  ]);

  // Add widgets to wallboard 2
  await db.insert(wallboardWidgets).values([
    {
      wallboardId: wallboard2.id,
      widgetType: 'chart',
      title: 'Calls Per Hour',
      config: { metric: 'calls.per_hour', chartType: 'bar' },
      thresholds: [],
      sortOrder: 0,
    },
    {
      wallboardId: wallboard2.id,
      widgetType: 'leaderboard',
      title: 'Agent Leaderboard',
      config: { metric: 'agents.calls_handled', maxItems: 10 },
      thresholds: [],
      sortOrder: 1,
    },
  ]);

  // ── 10. Report Definitions ─────────────────────────────────────────────
  log('Creating 3 report definitions and 1 schedule...');

  const [callReport] = await db
    .insert(reportDefinitions)
    .values({
      name: 'Daily Call Summary',
      description: 'Summary of all calls by direction, queue, and outcome',
      category: 'call',
      isStandard: true,
      createdBy: adminUser.id,
      filters: { dateRange: { from: 'today-start', to: 'today-end' } },
      columns: ['direction', 'queue', 'agent', 'duration', 'outcome'],
      groupBy: 'queue',
      interval: '1h',
      chartType: 'bar',
      active: true,
    })
    .returning({ id: reportDefinitions.id });

  await db.insert(reportDefinitions).values([
    {
      name: 'Agent Performance',
      description: 'Individual agent performance metrics including handle time and availability',
      category: 'agent',
      isStandard: true,
      createdBy: adminUser.id,
      filters: { dateRange: { from: 'week-start', to: 'week-end' } },
      columns: ['agent', 'calls_handled', 'avg_handle_time', 'availability'],
      groupBy: 'agent',
      interval: '1d',
      chartType: 'bar',
      active: true,
    },
    {
      name: 'Group Queue Analysis',
      description: 'Queue performance by hunt group with wait times and abandonment rates',
      category: 'group',
      isStandard: true,
      createdBy: adminUser.id,
      filters: { dateRange: { from: 'month-start', to: 'month-end' } },
      columns: ['group', 'calls_queued', 'avg_wait', 'abandoned_pct', 'service_level'],
      groupBy: 'group',
      interval: '1d',
      chartType: 'line',
      active: true,
    },
  ]);

  // Schedule for the daily call summary
  await db.insert(reportSchedules).values({
    reportDefinitionId: callReport.id,
    createdBy: adminUser.id,
    enabled: true,
    frequency: 'daily',
    time: '08:00',
    recipients: ['admin@calldoc.local'],
    format: 'pdf',
    filters: { dateRangeType: 'yesterday' },
    nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // ── 11. Alert Rules ────────────────────────────────────────────────────
  log('Creating 5 alert rules...');
  await db.insert(alertRules).values([
    {
      name: 'High Queue Wait Time',
      description: 'Alert when any queue wait time exceeds 120 seconds',
      metric: 'queue.longest_wait',
      condition: 'gt',
      threshold: 120,
      severity: 'warning',
      cooldownMinutes: 10,
      notifyInApp: true,
      notifyEmail: true,
      notifyWallboard: true,
      emailRecipients: ['admin@calldoc.local'],
      targetGroups: [],
      isBuiltIn: true,
      active: true,
      createdBy: adminUser.id,
    },
    {
      name: 'All Agents Busy',
      description: 'Alert when no agents are available in any group',
      metric: 'agents.available_count',
      condition: 'eq',
      threshold: 0,
      severity: 'critical',
      cooldownMinutes: 5,
      notifyInApp: true,
      notifyEmail: true,
      notifyWallboard: true,
      emailRecipients: ['admin@calldoc.local'],
      targetGroups: [],
      isBuiltIn: true,
      active: true,
      createdBy: adminUser.id,
    },
    {
      name: 'High Abandonment Rate',
      description: 'Alert when abandonment rate exceeds 15%',
      metric: 'calls.abandonment_rate',
      condition: 'gt',
      threshold: 15,
      severity: 'warning',
      evaluationWindow: '15m',
      cooldownMinutes: 30,
      notifyInApp: true,
      notifyEmail: false,
      notifyWallboard: true,
      emailRecipients: [],
      targetGroups: [],
      isBuiltIn: false,
      active: true,
      createdBy: adminUser.id,
    },
    {
      name: 'Service Disconnection',
      description: 'Alert when DevLink3 or SMDR connection is lost',
      metric: 'system.connection_status',
      condition: 'eq',
      threshold: 0,
      severity: 'critical',
      cooldownMinutes: 1,
      notifyInApp: true,
      notifyEmail: true,
      notifyWallboard: false,
      emailRecipients: ['admin@calldoc.local'],
      targetGroups: [],
      isBuiltIn: true,
      active: true,
      createdBy: adminUser.id,
    },
    {
      name: 'Emergency Number Dialed',
      description: 'Alert when an emergency number (999, 911, 112) is dialed',
      metric: 'calls.emergency_dialed',
      condition: 'gt',
      threshold: 0,
      severity: 'critical',
      cooldownMinutes: 0,
      notifyInApp: true,
      notifyEmail: true,
      notifyWallboard: true,
      emailRecipients: ['admin@calldoc.local'],
      targetGroups: [],
      isBuiltIn: true,
      active: true,
      createdBy: adminUser.id,
    },
  ]);

  // ── Done ──────────────────────────────────────────────────────────────
  log('Database seed completed successfully!');
  log('');
  log('Summary:');
  log('  - 1 admin user (admin@calldoc.local)');
  log('  - 1 IP Office system');
  log(`  - ${agentRecords.length} agents (extensions 1001-1005)`);
  log(`  - ${groupRecords.length} hunt groups (Sales, Support, Billing)`);
  log('  - 200 call records with events');
  log('  - 20 recordings');
  log('  - 2 wallboard configurations');
  log('  - 3 report definitions + 1 schedule');
  log('  - 5 alert rules');
}

// ---------------------------------------------------------------------------
// Entry Point
// ---------------------------------------------------------------------------

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
