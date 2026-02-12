// ─── Barrel Export: All Shared TypeScript Types ─────────────────────────────
// This file re-exports every type from the type system for convenient imports:
//   import { Call, Agent, Recording, ... } from '@/types';

// Call domain
export type {
  Call,
  CallEvent,
  CallNote,
  CallState,
  CallEventType,
  CallDirection,
} from './calls';

// Agent domain
export type {
  Agent,
  AgentState,
  AgentEventType,
  AgentTimelineEntry,
  TimelineEventType,
} from './agents';

// Recording domain
export type {
  Recording,
  RecordingFormat,
  RecordingNote,
  ScoreCard,
  ScoreCategory,
  ScoreCriterion,
  ScorecardTemplate,
  ScorecardTemplateQuestion,
  RecordingRuleType,
  RecordingRule,
  RecordingRuleCondition,
  StoragePoolType,
  StoragePool,
  StoragePoolConfig,
  RecordingShareLink,
} from './recordings';

// Report domain
export type {
  Report,
  ReportCategory,
  ReportInterval,
  ReportChartType,
  ReportExportFormat,
  ReportScheduleFrequency,
  ReportFilterState,
  ReportSchedule,
  SavedFilterPageContext,
  SavedFilter,
} from './reports';

// Wallboard domain
export type {
  WallboardConfig,
  WallboardTheme,
  Widget,
  WidgetType,
  WidgetConfig,
  WidgetChartType,
  ThresholdRule,
  ThresholdOperator,
  LayoutItem,
} from './wallboards';

// User & auth domain
export type {
  User,
  UserRole,
  Permission,
  UserPreference,
  Session,
} from './users';

// System domain
export type {
  SystemConnection,
  SystemConnectionType,
  SystemConnectionStatus,
  SystemStatus,
  AlertSeverity,
  AlertOperator,
  AlertAction,
  AlertRule,
  AlertHistory,
  HuntGroup,
  Trunk,
  TrunkGroup,
  SamlConfig,
  SamlAttributeMapping,
} from './system';

// DevLink3 wire-level types
export {
  PacketType,
  ResponseCode,
  TupleCode,
  EVENT_FLAGS,
  DevLink3CallState,
  DevLink3CallStateMap,
  EquipmentType,
  CalledType,
  FlagsBitfield,
  CauseCode,
} from './devlink3';
export type {
  DevLink3Packet,
  EventFlag,
  Delta3DetailRecord,
  Delta3Party,
  Delta3Target,
  Delta3CallLostRecord,
  Delta3LinkLostRecord,
  Delta3AttemptRejectRecord,
  Delta3Record,
} from './devlink3';

// SMDR types
export type {
  SmdrRecord,
  SmdrDirection,
  SmdrDevicePrefix,
  SmdrTargetingSource,
  SmdrTargetingReason,
} from './smdr';

// Socket.io event types
export type {
  ServerToClientEvents,
  ClientToServerEvents,
  AgentStateUpdate,
  GroupStats,
  AlertNotification,
} from './socket-events';

// Redis pub/sub event types
export { REDIS_CHANNELS } from './redis-events';
export type {
  RedisChannel,
  CallEventMessageType,
  CallEventMessage,
  AgentStateMessage,
  GroupStatsMessage,
  RedisMessage,
} from './redis-events';

// Shared API types
export { queryKeys } from './api';
export type {
  PaginatedResponse,
  ApiError,
  ApiResponse,
  Toast,
} from './api';
