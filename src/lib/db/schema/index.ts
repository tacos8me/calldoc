// ---------------------------------------------------------------------------
// CallDoc - Drizzle ORM Schema Barrel Export
//
// All table definitions, enums, and relations are re-exported from here.
// Import from '@/lib/db/schema' for all schema needs.
// ---------------------------------------------------------------------------

// ── Auth ──────────────────────────────────────────────────────────────────
export {
  // Enums
  userRoleEnum,
  // Tables
  users,
  sessions,
  samlConfigs,
  // Relations
  usersRelations,
  sessionsRelations,
} from './auth';

// ── Calls ─────────────────────────────────────────────────────────────────
export {
  // Enums
  callStateEnum,
  callDirectionEnum,
  callEventTypeEnum,
  // Tables
  calls,
  callEvents,
  callNotes,
  // Relations
  callsRelations,
  callEventsRelations,
  callNotesRelations,
} from './calls';

// ── Agents ────────────────────────────────────────────────────────────────
export {
  // Enums
  agentStateEnum,
  // Tables
  agents,
  agentStates,
  agentMappings,
  // Relations
  agentsRelations,
  agentStatesRelations,
  agentMappingsRelations,
} from './agents';

// ── Groups ────────────────────────────────────────────────────────────────
export {
  // Enums
  routingAlgorithmEnum,
  // Tables
  huntGroups,
  huntGroupMembers,
  skillGroups,
  skillGroupMembers,
  skillRoutingRules,
  // Relations
  huntGroupsRelations,
  huntGroupMembersRelations,
  skillGroupsRelations,
  skillGroupMembersRelations,
  skillRoutingRulesRelations,
} from './groups';

// ── Recordings ────────────────────────────────────────────────────────────
export {
  // Enums
  recordingFormatEnum,
  storagePoolTypeEnum,
  recordingRuleTypeEnum,
  recordingSourceTypeEnum,
  recordingMatchMethodEnum,
  pauseEventTypeEnum,
  // Tables
  recordings,
  recordingRules,
  recordingPauseEvents,
  recordingNotes,
  recordingShareLinks,
  recordingStoragePools,
  scorecardTemplates,
  scorecardResponses,
  // Relations
  recordingsRelations,
  recordingStoragePoolsRelations,
  recordingPauseEventsRelations,
  recordingNotesRelations,
  recordingShareLinksRelations,
  scorecardTemplatesRelations,
  scorecardResponsesRelations,
} from './recordings';

// ── Reports ───────────────────────────────────────────────────────────────
export {
  // Enums
  reportCategoryEnum,
  reportIntervalEnum,
  reportFormatEnum,
  scheduleFrequencyEnum,
  // Tables
  reportDefinitions,
  reportSchedules,
  savedFilters,
  // Relations
  reportDefinitionsRelations,
  reportSchedulesRelations,
  savedFiltersRelations,
} from './reports';

// ── Wallboards ────────────────────────────────────────────────────────────
export {
  // Enums
  wallboardThemeEnum,
  widgetTypeEnum,
  // Tables
  wallboards,
  wallboardWidgets,
  // Relations
  wallboardsRelations,
  wallboardWidgetsRelations,
} from './wallboards';

// ── System ────────────────────────────────────────────────────────────────
export {
  // Enums
  connectionTypeEnum,
  connectionStatusEnum,
  alertSeverityEnum,
  alertStatusEnum,
  smdrCallDirectionEnum,
  // Tables
  systems,
  systemStatus,
  alertRules,
  alertHistory,
  trunks,
  trunkGroups,
  userPreferences,
  smdrRecords,
  // Relations
  systemsRelations,
  systemStatusRelations,
  alertRulesRelations,
  alertHistoryRelations,
  trunksRelations,
  trunkGroupsRelations,
  userPreferencesRelations,
  smdrRecordsRelations,
} from './system';

// ── Advanced (Sprint 4) ──────────────────────────────────────────────────
export {
  // Enums
  auditActionEnum,
  webhookEventEnum,
  bulkJobStatusEnum,
  bulkJobTypeEnum,
  // Tables
  auditLogs,
  webhookEndpoints,
  webhookDeliveries,
  bulkJobs,
  // Relations
  auditLogsRelations,
  webhookEndpointsRelations,
  webhookDeliveriesRelations,
  bulkJobsRelations,
} from './advanced';
