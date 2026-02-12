// ---------------------------------------------------------------------------
// CallDoc - Agent Mapping Service
//
// Maps DevLink3 extension numbers to agent records in the database.
// Maintains an in-memory cache of extension->agentId lookups for
// high-performance resolution during real-time event processing.
// ---------------------------------------------------------------------------

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents, agentMappings } from '@/lib/db/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Cached agent record with essential fields for real-time lookup. */
export interface CachedAgent {
  id: string;
  extension: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  systemId: string | null;
  externalId: string | null;
  active: boolean;
}

/** Stats about the mapping cache. */
export interface AgentMappingStats {
  /** Total agents cached */
  cachedAgents: number;
  /** Total extension->agent mappings */
  extensionMappings: number;
  /** Cache hit count since last refresh */
  cacheHits: number;
  /** Cache miss count since last refresh */
  cacheMisses: number;
  /** Number of placeholder agents created */
  placeholdersCreated: number;
  /** ISO timestamp of last refresh */
  lastRefreshedAt: string | null;
}

// ---------------------------------------------------------------------------
// AgentMappingService
// ---------------------------------------------------------------------------

/**
 * AgentMappingService maps DevLink3 extension numbers to agent database
 * records. It caches all agent_mappings and agents table data in memory
 * for fast lookup during real-time event processing.
 *
 * Usage:
 *   const mapper = new AgentMappingService();
 *   await mapper.initialize();
 *   const agent = await mapper.resolveAgent('1001');
 */
export class AgentMappingService {
  /** extension -> CachedAgent lookup */
  private extensionCache: Map<string, CachedAgent> = new Map();

  /** agentId -> CachedAgent lookup */
  private agentIdCache: Map<string, CachedAgent> = new Map();

  /** Stats tracking */
  private cacheHits = 0;
  private cacheMisses = 0;
  private placeholdersCreated = 0;
  private lastRefreshedAt: string | null = null;
  private isInitialized = false;

  /**
   * Initialize the mapping service by loading all mappings from the database.
   * Must be called before resolveAgent().
   */
  async initialize(): Promise<void> {
    await this.refreshMappings();
    this.isInitialized = true;
    log(`Initialized with ${this.extensionCache.size} extension mappings`);
  }

  /**
   * Reload all agent mappings from the database. Clears and rebuilds
   * the in-memory cache. This is called on startup and can be called
   * periodically or when an agent logs in/out.
   */
  async refreshMappings(): Promise<void> {
    try {
      // Load all active agents
      const allAgents = await db
        .select({
          id: agents.id,
          extension: agents.extension,
          name: agents.name,
          firstName: agents.firstName,
          lastName: agents.lastName,
          systemId: agents.systemId,
          externalId: agents.externalId,
          active: agents.active,
        })
        .from(agents)
        .where(eq(agents.active, true));

      // Clear existing caches
      this.extensionCache.clear();
      this.agentIdCache.clear();

      // Build lookup caches
      for (const agent of allAgents) {
        const cached: CachedAgent = {
          id: agent.id,
          extension: agent.extension,
          name: agent.name,
          firstName: agent.firstName,
          lastName: agent.lastName,
          systemId: agent.systemId,
          externalId: agent.externalId,
          active: agent.active,
        };

        this.extensionCache.set(agent.extension, cached);
        this.agentIdCache.set(agent.id, cached);
      }

      // Also load agent_mappings for extension number overrides
      const mappings = await db
        .select({
          agentId: agentMappings.agentId,
          extensionNumber: agentMappings.extensionNumber,
          isPrimary: agentMappings.isPrimary,
        })
        .from(agentMappings);

      for (const mapping of mappings) {
        const agent = this.agentIdCache.get(mapping.agentId);
        if (agent) {
          // Map the extension number from agent_mappings to the agent
          this.extensionCache.set(mapping.extensionNumber, agent);
        }
      }

      // Reset hit/miss counters on refresh
      this.cacheHits = 0;
      this.cacheMisses = 0;
      this.lastRefreshedAt = new Date().toISOString();

      log(`Refreshed mappings: ${this.extensionCache.size} extensions, ${this.agentIdCache.size} agents`);
    } catch (err) {
      log(`Error refreshing mappings: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  /**
   * Resolve an extension number to an agent record.
   *
   * Lookup order:
   *   1. Check in-memory cache (fast path)
   *   2. Query database for agent with matching extension
   *   3. If not found, create a placeholder agent record
   *
   * @param extension - The extension number to resolve (e.g., '1001')
   * @returns The cached agent record
   */
  async resolveAgent(extension: string): Promise<CachedAgent> {
    // Fast path: check cache
    const cached = this.extensionCache.get(extension);
    if (cached) {
      this.cacheHits++;
      return cached;
    }

    this.cacheMisses++;

    // Slow path: query database
    try {
      const dbAgents = await db
        .select({
          id: agents.id,
          extension: agents.extension,
          name: agents.name,
          firstName: agents.firstName,
          lastName: agents.lastName,
          systemId: agents.systemId,
          externalId: agents.externalId,
          active: agents.active,
        })
        .from(agents)
        .where(eq(agents.extension, extension))
        .limit(1);

      if (dbAgents.length > 0) {
        const agent: CachedAgent = {
          id: dbAgents[0].id,
          extension: dbAgents[0].extension,
          name: dbAgents[0].name,
          firstName: dbAgents[0].firstName,
          lastName: dbAgents[0].lastName,
          systemId: dbAgents[0].systemId,
          externalId: dbAgents[0].externalId,
          active: dbAgents[0].active,
        };

        this.extensionCache.set(extension, agent);
        this.agentIdCache.set(agent.id, agent);
        return agent;
      }

      // Not found - create placeholder agent
      return await this.createPlaceholderAgent(extension);
    } catch (err) {
      log(`Error resolving agent for extension ${extension}: ${err instanceof Error ? err.message : err}`);
      // Return a transient placeholder without persisting
      return {
        id: `placeholder-${extension}`,
        extension,
        name: `Extension ${extension}`,
        firstName: null,
        lastName: null,
        systemId: null,
        externalId: null,
        active: true,
      };
    }
  }

  /**
   * Look up an agent by their database ID.
   *
   * @param agentId - The agent's UUID
   * @returns The cached agent or null if not found
   */
  getAgentById(agentId: string): CachedAgent | null {
    return this.agentIdCache.get(agentId) ?? null;
  }

  /**
   * Look up an agent by extension without creating a placeholder.
   *
   * @param extension - The extension number
   * @returns The cached agent or null if not in cache
   */
  getAgentByExtension(extension: string): CachedAgent | null {
    return this.extensionCache.get(extension) ?? null;
  }

  /**
   * Get current mapping statistics.
   */
  getStats(): AgentMappingStats {
    return {
      cachedAgents: this.agentIdCache.size,
      extensionMappings: this.extensionCache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      placeholdersCreated: this.placeholdersCreated,
      lastRefreshedAt: this.lastRefreshedAt,
    };
  }

  /**
   * Check if the service has been initialized.
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Create a placeholder agent record in the database for an unknown extension.
   * This happens when DevLink3 reports activity on an extension that has no
   * corresponding agent record.
   */
  private async createPlaceholderAgent(extension: string): Promise<CachedAgent> {
    try {
      const result = await db
        .insert(agents)
        .values({
          extension,
          name: `Extension ${extension}`,
          state: 'unknown',
          active: true,
        })
        .returning({
          id: agents.id,
          extension: agents.extension,
          name: agents.name,
          firstName: agents.firstName,
          lastName: agents.lastName,
          systemId: agents.systemId,
          externalId: agents.externalId,
          active: agents.active,
        });

      const agent: CachedAgent = {
        id: result[0].id,
        extension: result[0].extension,
        name: result[0].name,
        firstName: result[0].firstName,
        lastName: result[0].lastName,
        systemId: result[0].systemId,
        externalId: result[0].externalId,
        active: result[0].active,
      };

      this.extensionCache.set(extension, agent);
      this.agentIdCache.set(agent.id, agent);
      this.placeholdersCreated++;

      log(`Created placeholder agent for extension ${extension}: ${agent.id}`);
      return agent;
    } catch (err) {
      log(`Error creating placeholder agent: ${err instanceof Error ? err.message : err}`);
      // Return a transient placeholder
      return {
        id: `placeholder-${extension}`,
        extension,
        name: `Extension ${extension}`,
        firstName: null,
        lastName: null,
        systemId: null,
        externalId: null,
        active: true,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

/** Singleton AgentMappingService instance. */
export const agentMappingService = new AgentMappingService();

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [AgentMapping] ${message}`);
}
