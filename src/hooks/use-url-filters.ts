'use client';

import {
  useQueryState,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  parseAsBoolean,
  parseAsArrayOf,
} from 'nuqs';
import { useCallback, useMemo } from 'react';

// ---------------------------------------------------------------------------
// URL-Synced Filters with nuqs
// Each hook syncs filter state to URL search params so that pages are
// shareable and deep-linkable. Array params use comma-separated values.
// ---------------------------------------------------------------------------

// --- Custom parsers --------------------------------------------------------

/**
 * Parse a comma-separated list of strings from a single query parameter.
 * Serializes as "a,b,c". Empty arrays are removed from the URL.
 */
const parseAsCommaSeparated = {
  parse: (value: string) => {
    if (!value) return [];
    return value.split(',').filter(Boolean);
  },
  serialize: (value: string[]) => {
    if (!value || value.length === 0) return '';
    return value.join(',');
  },
};

/**
 * Parse a numeric range from URL as "min,max".
 */
const parseAsNumberRange = {
  parse: (value: string) => {
    if (!value) return undefined;
    const [min, max] = value.split(',');
    return {
      min: min ? Number(min) : undefined,
      max: max ? Number(max) : undefined,
    };
  },
  serialize: (value: { min?: number; max?: number } | undefined) => {
    if (!value) return '';
    return `${value.min ?? ''},${value.max ?? ''}`;
  },
};

/**
 * Parse a date range from URL as "from,to" (ISO date strings).
 */
const parseAsDateRange = {
  parse: (value: string) => {
    if (!value) return undefined;
    const [from, to] = value.split(',');
    return {
      from: from || undefined,
      to: to || undefined,
    };
  },
  serialize: (value: { from?: string; to?: string } | undefined) => {
    if (!value) return '';
    return `${value.from ?? ''},${value.to ?? ''}`;
  },
};

// ---------------------------------------------------------------------------
// useCallFilters
// ---------------------------------------------------------------------------

export interface CallUrlFilters {
  page: number;
  limit: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  caller: string;
  agent: string[];
  group: string[];
  direction: string[];
  state: string[];
  dateRange: { from?: string; to?: string } | undefined;
  durationRange: { min?: number; max?: number } | undefined;
  search: string;
  hasRecording: boolean | null;
}

export interface CallUrlFilterSetters {
  setPage: (value: number | null) => void;
  setLimit: (value: number | null) => void;
  setSortBy: (value: string | null) => void;
  setSortDir: (value: 'asc' | 'desc' | null) => void;
  setCaller: (value: string | null) => void;
  setAgent: (value: string[] | null) => void;
  setGroup: (value: string[] | null) => void;
  setDirection: (value: string[] | null) => void;
  setState: (value: string[] | null) => void;
  setDateRange: (value: { from?: string; to?: string } | null) => void;
  setDurationRange: (value: { min?: number; max?: number } | null) => void;
  setSearch: (value: string | null) => void;
  setHasRecording: (value: boolean | null) => void;
  resetAll: () => void;
}

export function useCallFilters(): [CallUrlFilters, CallUrlFilterSetters] {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [limit, setLimit] = useQueryState('limit', parseAsInteger.withDefault(50));
  const [sortBy, setSortBy] = useQueryState('sortBy', parseAsString.withDefault('startTime'));
  const [sortDir, setSortDir] = useQueryState(
    'sortDir',
    parseAsStringLiteral(['asc', 'desc'] as const).withDefault('desc'),
  );
  const [caller, setCaller] = useQueryState('caller', parseAsString.withDefault(''));
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault(''));
  const [hasRecording, setHasRecording] = useQueryState('hasRecording', parseAsBoolean);

  // Array params using nuqs built-in array parser
  const [agent, setAgent] = useQueryState('agent', parseAsArrayOf(parseAsString, ',').withDefault([]));
  const [group, setGroup] = useQueryState('group', parseAsArrayOf(parseAsString, ',').withDefault([]));
  const [direction, setDirection] = useQueryState('direction', parseAsArrayOf(parseAsString, ',').withDefault([]));
  const [state, setState] = useQueryState('state', parseAsArrayOf(parseAsString, ',').withDefault([]));

  // Composite params using custom parsers
  const [dateRangeStr, setDateRangeStr] = useQueryState('dateRange', parseAsString.withDefault(''));
  const [durationRangeStr, setDurationRangeStr] = useQueryState('durationRange', parseAsString.withDefault(''));

  const dateRange = useMemo(() => parseAsDateRange.parse(dateRangeStr), [dateRangeStr]);
  const durationRange = useMemo(() => parseAsNumberRange.parse(durationRangeStr), [durationRangeStr]);

  const setDateRange = useCallback(
    (value: { from?: string; to?: string } | null) => {
      setDateRangeStr(value ? parseAsDateRange.serialize(value) || null : null);
    },
    [setDateRangeStr],
  );

  const setDurationRange = useCallback(
    (value: { min?: number; max?: number } | null) => {
      setDurationRangeStr(value ? parseAsNumberRange.serialize(value) || null : null);
    },
    [setDurationRangeStr],
  );

  const resetAll = useCallback(() => {
    setPage(null);
    setLimit(null);
    setSortBy(null);
    setSortDir(null);
    setCaller(null);
    setSearch(null);
    setHasRecording(null);
    setAgent(null);
    setGroup(null);
    setDirection(null);
    setState(null);
    setDateRangeStr(null);
    setDurationRangeStr(null);
  }, [
    setPage, setLimit, setSortBy, setSortDir, setCaller, setSearch,
    setHasRecording, setAgent, setGroup, setDirection, setState,
    setDateRangeStr, setDurationRangeStr,
  ]);

  const filters: CallUrlFilters = useMemo(
    () => ({ page, limit, sortBy, sortDir, caller, agent, group, direction, state, dateRange, durationRange, search, hasRecording }),
    [page, limit, sortBy, sortDir, caller, agent, group, direction, state, dateRange, durationRange, search, hasRecording],
  );

  const setters: CallUrlFilterSetters = useMemo(
    () => ({
      setPage, setLimit, setSortBy, setSortDir, setCaller,
      setAgent, setGroup, setDirection, setState,
      setDateRange, setDurationRange, setSearch, setHasRecording,
      resetAll,
    }),
    [
      setPage, setLimit, setSortBy, setSortDir, setCaller,
      setAgent, setGroup, setDirection, setState,
      setDateRange, setDurationRange, setSearch, setHasRecording,
      resetAll,
    ],
  );

  return [filters, setters];
}

// ---------------------------------------------------------------------------
// useRecordingFilters
// ---------------------------------------------------------------------------

export interface RecordingUrlFilters {
  page: number;
  limit: number;
  search: string;
  agentId: string;
  direction: string;
  scored: string;
  from: string;
  to: string;
  tags: string[];
}

export interface RecordingUrlFilterSetters {
  setPage: (value: number | null) => void;
  setLimit: (value: number | null) => void;
  setSearch: (value: string | null) => void;
  setAgentId: (value: string | null) => void;
  setDirection: (value: string | null) => void;
  setScored: (value: string | null) => void;
  setFrom: (value: string | null) => void;
  setTo: (value: string | null) => void;
  setTags: (value: string[] | null) => void;
  resetAll: () => void;
}

export function useRecordingFilters(): [RecordingUrlFilters, RecordingUrlFilterSetters] {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [limit, setLimit] = useQueryState('limit', parseAsInteger.withDefault(50));
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault(''));
  const [agentId, setAgentId] = useQueryState('agentId', parseAsString.withDefault(''));
  const [direction, setDirection] = useQueryState('direction', parseAsString.withDefault(''));
  const [scored, setScored] = useQueryState('scored', parseAsString.withDefault(''));
  const [from, setFrom] = useQueryState('from', parseAsString.withDefault(''));
  const [to, setTo] = useQueryState('to', parseAsString.withDefault(''));
  const [tags, setTags] = useQueryState('tags', parseAsArrayOf(parseAsString, ',').withDefault([]));

  const resetAll = useCallback(() => {
    setPage(null);
    setLimit(null);
    setSearch(null);
    setAgentId(null);
    setDirection(null);
    setScored(null);
    setFrom(null);
    setTo(null);
    setTags(null);
  }, [setPage, setLimit, setSearch, setAgentId, setDirection, setScored, setFrom, setTo, setTags]);

  const filters: RecordingUrlFilters = useMemo(
    () => ({ page, limit, search, agentId, direction, scored, from, to, tags }),
    [page, limit, search, agentId, direction, scored, from, to, tags],
  );

  const setters: RecordingUrlFilterSetters = useMemo(
    () => ({ setPage, setLimit, setSearch, setAgentId, setDirection, setScored, setFrom, setTo, setTags, resetAll }),
    [setPage, setLimit, setSearch, setAgentId, setDirection, setScored, setFrom, setTo, setTags, resetAll],
  );

  return [filters, setters];
}

// ---------------------------------------------------------------------------
// useAgentTimelineFilters
// ---------------------------------------------------------------------------

export interface AgentTimelineUrlFilters {
  date: string;
  agentId: string[];
  groupId: string;
}

export interface AgentTimelineUrlFilterSetters {
  setDate: (value: string | null) => void;
  setAgentId: (value: string[] | null) => void;
  setGroupId: (value: string | null) => void;
  resetAll: () => void;
}

export function useAgentTimelineFilters(): [AgentTimelineUrlFilters, AgentTimelineUrlFilterSetters] {
  const [date, setDate] = useQueryState(
    'date',
    parseAsString.withDefault(new Date().toISOString().slice(0, 10)),
  );
  const [agentId, setAgentId] = useQueryState('agentId', parseAsArrayOf(parseAsString, ',').withDefault([]));
  const [groupId, setGroupId] = useQueryState('groupId', parseAsString.withDefault(''));

  const resetAll = useCallback(() => {
    setDate(null);
    setAgentId(null);
    setGroupId(null);
  }, [setDate, setAgentId, setGroupId]);

  const filters: AgentTimelineUrlFilters = useMemo(
    () => ({ date, agentId, groupId }),
    [date, agentId, groupId],
  );

  const setters: AgentTimelineUrlFilterSetters = useMemo(
    () => ({ setDate, setAgentId, setGroupId, resetAll }),
    [setDate, setAgentId, setGroupId, resetAll],
  );

  return [filters, setters];
}
