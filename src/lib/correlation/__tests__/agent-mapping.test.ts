// ─── Agent Mapping Service Tests ────────────────────────────────────────────
// Tests the AgentMappingService class in isolation by mocking database access.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock external modules BEFORE importing the service
// ---------------------------------------------------------------------------

// Track DB query calls
const mockSelectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
};
const mockSelect = vi.fn().mockReturnValue(mockSelectChain);

const mockInsertChain = {
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{
    id: 'placeholder-id-1',
    extension: '999',
    name: 'Extension 999',
    firstName: null,
    lastName: null,
    systemId: null,
    externalId: null,
    active: true,
  }]),
};
const mockInsert = vi.fn().mockReturnValue(mockInsertChain);

vi.mock('@/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  agents: {
    id: 'id',
    extension: 'extension',
    name: 'name',
    firstName: 'first_name',
    lastName: 'last_name',
    systemId: 'system_id',
    externalId: 'external_id',
    active: 'active',
    state: 'state',
  },
  agentMappings: {
    agentId: 'agent_id',
    extensionNumber: 'extension_number',
    isPrimary: 'is_primary',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: 'eq', args })),
}));

// Now import the service
import { AgentMappingService } from '../agent-mapping';

// ---------------------------------------------------------------------------
// Helper data
// ---------------------------------------------------------------------------

const AGENT_ALICE = {
  id: 'agent-alice-1',
  extension: '1001',
  name: 'Alice Smith',
  firstName: 'Alice',
  lastName: 'Smith',
  systemId: null,
  externalId: null,
  active: true,
};

const AGENT_BOB = {
  id: 'agent-bob-2',
  extension: '1002',
  name: 'Bob Jones',
  firstName: 'Bob',
  lastName: 'Jones',
  systemId: 'sys-1',
  externalId: 'ext-bob',
  active: true,
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AgentMappingService', () => {
  let service: AgentMappingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AgentMappingService();

    // Default: select for agents returns empty, then select for mappings returns empty
    let selectCallCount = 0;
    mockSelect.mockImplementation(() => {
      selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          // For queries without where clause (agentMappings)
          then: vi.fn().mockImplementation((resolve: (val: unknown) => void) => {
            return Promise.resolve([]).then(resolve);
          }),
        }),
      };
    });
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('should not be initialized before calling initialize()', () => {
      expect(service.initialized).toBe(false);
    });

    it('should return zeroed stats initially', () => {
      const stats = service.getStats();
      expect(stats.cachedAgents).toBe(0);
      expect(stats.extensionMappings).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
      expect(stats.placeholdersCreated).toBe(0);
      expect(stats.lastRefreshedAt).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // initialize / refreshMappings
  // -------------------------------------------------------------------------

  describe('initialize', () => {
    it('should set initialized to true after calling initialize', async () => {
      // Setup: first select returns agents, second returns mappings
      setupSelectMocks([], []);

      await service.initialize();
      expect(service.initialized).toBe(true);
    });

    it('should load agents into cache during initialization', async () => {
      setupSelectMocks([AGENT_ALICE, AGENT_BOB], []);

      await service.initialize();

      const stats = service.getStats();
      expect(stats.cachedAgents).toBe(2);
      expect(stats.extensionMappings).toBe(2);
    });

    it('should load agent mappings and cross-reference with agents', async () => {
      setupSelectMocks(
        [AGENT_ALICE],
        [{ agentId: 'agent-alice-1', extensionNumber: '2001', isPrimary: false }]
      );

      await service.initialize();

      // Alice should be found via both extension 1001 and mapping 2001
      const stats = service.getStats();
      expect(stats.extensionMappings).toBe(2); // 1001 + 2001
    });

    it('should update lastRefreshedAt after initialization', async () => {
      setupSelectMocks([], []);

      await service.initialize();

      const stats = service.getStats();
      expect(stats.lastRefreshedAt).not.toBeNull();
      expect(new Date(stats.lastRefreshedAt!).getTime()).not.toBeNaN();
    });

    it('should reset hit/miss counters on refresh', async () => {
      setupSelectMocks([], []);
      await service.initialize();

      const stats = service.getStats();
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // resolveAgent - cache hit (fast path)
  // -------------------------------------------------------------------------

  describe('resolveAgent - cache hit', () => {
    beforeEach(async () => {
      setupSelectMocks([AGENT_ALICE, AGENT_BOB], []);
      await service.initialize();
      vi.clearAllMocks();
    });

    it('should return cached agent for known extension', async () => {
      const agent = await service.resolveAgent('1001');
      expect(agent.id).toBe('agent-alice-1');
      expect(agent.name).toBe('Alice Smith');
      expect(agent.extension).toBe('1001');
    });

    it('should increment cacheHits on cache hit', async () => {
      await service.resolveAgent('1001');
      await service.resolveAgent('1002');

      const stats = service.getStats();
      expect(stats.cacheHits).toBe(2);
      expect(stats.cacheMisses).toBe(0);
    });

    it('should not query database for cached extensions', async () => {
      await service.resolveAgent('1001');
      expect(mockSelect).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // resolveAgent - cache miss (slow path: DB lookup)
  // -------------------------------------------------------------------------

  describe('resolveAgent - cache miss with DB hit', () => {
    beforeEach(async () => {
      setupSelectMocks([], []);
      await service.initialize();
      vi.clearAllMocks();
    });

    it('should query database when extension is not in cache', async () => {
      // Set up the DB to return an agent on the next select
      setupSelectForResolve([AGENT_ALICE]);

      const agent = await service.resolveAgent('1001');
      expect(agent.id).toBe('agent-alice-1');
      expect(agent.name).toBe('Alice Smith');
    });

    it('should increment cacheMisses on cache miss', async () => {
      setupSelectForResolve([AGENT_ALICE]);

      await service.resolveAgent('1001');

      const stats = service.getStats();
      expect(stats.cacheMisses).toBe(1);
    });

    it('should cache the agent after DB lookup', async () => {
      setupSelectForResolve([AGENT_ALICE]);

      // First call - cache miss, queries DB
      await service.resolveAgent('1001');
      vi.clearAllMocks();

      // Second call - should be a cache hit
      const agent = await service.resolveAgent('1001');
      expect(agent.id).toBe('agent-alice-1');
      expect(mockSelect).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // resolveAgent - cache miss, DB miss (placeholder creation)
  // -------------------------------------------------------------------------

  describe('resolveAgent - placeholder creation', () => {
    beforeEach(async () => {
      setupSelectMocks([], []);
      await service.initialize();
      vi.clearAllMocks();
    });

    it('should create placeholder agent when extension not found anywhere', async () => {
      // Select returns empty (no agent found), then insert creates placeholder
      setupSelectForResolve([]);

      const agent = await service.resolveAgent('9999');
      expect(agent.name).toBe('Extension 999');  // From mock insert returning
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should increment placeholdersCreated counter', async () => {
      setupSelectForResolve([]);

      await service.resolveAgent('9999');

      const stats = service.getStats();
      expect(stats.placeholdersCreated).toBe(1);
    });

    it('should cache the placeholder agent after creation', async () => {
      setupSelectForResolve([]);

      // First call creates placeholder
      await service.resolveAgent('9999');
      vi.clearAllMocks();

      // Second call should be cache hit
      const agent = await service.resolveAgent('9999');
      expect(mockSelect).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
      expect(agent).toBeDefined();
    });

    it('should return transient placeholder on DB insert failure', async () => {
      setupSelectForResolve([]);
      mockInsertChain.returning.mockRejectedValueOnce(new Error('Insert failed'));

      const agent = await service.resolveAgent('8888');
      expect(agent.id).toBe('placeholder-8888');
      expect(agent.extension).toBe('8888');
      expect(agent.name).toBe('Extension 8888');
      expect(agent.active).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // resolveAgent - error handling
  // -------------------------------------------------------------------------

  describe('resolveAgent - error handling', () => {
    beforeEach(async () => {
      setupSelectMocks([], []);
      await service.initialize();
      vi.clearAllMocks();
    });

    it('should return transient placeholder on DB select failure', async () => {
      mockSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Connection refused')),
          }),
        }),
      }));

      const agent = await service.resolveAgent('7777');
      expect(agent.id).toBe('placeholder-7777');
      expect(agent.extension).toBe('7777');
      expect(agent.name).toBe('Extension 7777');
    });
  });

  // -------------------------------------------------------------------------
  // getAgentById
  // -------------------------------------------------------------------------

  describe('getAgentById', () => {
    beforeEach(async () => {
      setupSelectMocks([AGENT_ALICE], []);
      await service.initialize();
    });

    it('should return agent from agentId cache', () => {
      const agent = service.getAgentById('agent-alice-1');
      expect(agent).not.toBeNull();
      expect(agent!.name).toBe('Alice Smith');
    });

    it('should return null for unknown agent ID', () => {
      const agent = service.getAgentById('nonexistent-id');
      expect(agent).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getAgentByExtension
  // -------------------------------------------------------------------------

  describe('getAgentByExtension', () => {
    beforeEach(async () => {
      setupSelectMocks([AGENT_ALICE, AGENT_BOB], []);
      await service.initialize();
    });

    it('should return agent for known extension', () => {
      const agent = service.getAgentByExtension('1001');
      expect(agent).not.toBeNull();
      expect(agent!.id).toBe('agent-alice-1');
    });

    it('should return null for unknown extension without creating placeholder', () => {
      const agent = service.getAgentByExtension('9999');
      expect(agent).toBeNull();
      // Should not trigger a DB query
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // refreshMappings
  // -------------------------------------------------------------------------

  describe('refreshMappings', () => {
    it('should clear existing caches and rebuild', async () => {
      // First initialization with Alice
      setupSelectMocks([AGENT_ALICE], []);
      await service.initialize();
      expect(service.getAgentByExtension('1001')).not.toBeNull();

      // Refresh with only Bob (Alice removed)
      setupSelectMocks([AGENT_BOB], []);
      await service.refreshMappings();

      // Alice should be gone, Bob should be present
      expect(service.getAgentByExtension('1001')).toBeNull();
      expect(service.getAgentByExtension('1002')).not.toBeNull();
    });

    it('should throw on database error during refresh', async () => {
      mockSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB down')),
        }),
      }));

      await expect(service.refreshMappings()).rejects.toThrow('DB down');
    });
  });
});

// ---------------------------------------------------------------------------
// Helper: Set up mock select calls for initialize
// ---------------------------------------------------------------------------

/**
 * Sets up mockSelect to return agents on the first call chain (from agents table)
 * and mappings on the second call chain (from agentMappings table).
 */
function setupSelectMocks(
  agentsData: Record<string, unknown>[],
  mappingsData: Record<string, unknown>[]
): void {
  let callCount = 0;

  mockSelect.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // agents query: select().from(agents).where(eq(agents.active, true))
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(agentsData),
        }),
      };
    }
    // agentMappings query: select().from(agentMappings) (no where)
    return {
      from: vi.fn().mockResolvedValue(mappingsData),
    };
  });
}

/**
 * Sets up mockSelect for the resolveAgent slow-path DB lookup.
 */
function setupSelectForResolve(agentsData: Record<string, unknown>[]): void {
  mockSelect.mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(agentsData),
      }),
    }),
  }));
}
