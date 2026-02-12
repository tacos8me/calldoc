// ─── GET /api/health ──────────────────────────────────────────────────────────
// Production health monitoring endpoint for Docker/K8s probes.
// No authentication required.

import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  details: Record<string, unknown>;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  version: string;
  timestamp: string;
  components: ComponentHealth[];
}

// ---------------------------------------------------------------------------
// Server start time (captured at module load)
// ---------------------------------------------------------------------------

const startTime = Date.now();

// ---------------------------------------------------------------------------
// Component Health Checks
// ---------------------------------------------------------------------------

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    // Dynamic import to avoid issues when DB is not configured
    const { db } = await import('@/lib/db');
    const { sql } = await import('drizzle-orm');

    const result = await db.execute(sql`SELECT 1 AS ok`);
    const latencyMs = Date.now() - start;

    return {
      name: 'database',
      status: 'healthy',
      latencyMs,
      details: {
        type: 'postgresql',
        connected: true,
      },
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      details: {
        type: 'postgresql',
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      },
    };
  }
}

async function checkRedis(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const Redis = (await import('ioredis')).default;
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redis = new Redis(redisUrl, {
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    await redis.connect();
    const pong = await redis.ping();
    const latencyMs = Date.now() - start;
    await redis.quit().catch(() => {});

    return {
      name: 'redis',
      status: pong === 'PONG' ? 'healthy' : 'degraded',
      latencyMs,
      details: {
        connected: true,
        response: pong,
      },
    };
  } catch (error) {
    return {
      name: 'redis',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      details: {
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      },
    };
  }
}

async function checkDevLink3(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const { getServiceHealth } = await import('@/lib/services/bootstrap');
    const services = getServiceHealth();
    const devlink3 = services.find((s) => s.name === 'devlink3');

    const isRunning = devlink3?.running ?? false;
    const latencyMs = Date.now() - start;

    return {
      name: 'devlink3',
      status: isRunning ? 'healthy' : 'degraded',
      latencyMs,
      details: {
        connected: isRunning,
        activeCalls: (devlink3?.details?.activeCalls as number) ?? 0,
        eventsProcessed: (devlink3?.details?.eventsProcessed as number) ?? 0,
      },
    };
  } catch {
    return {
      name: 'devlink3',
      status: 'degraded',
      latencyMs: Date.now() - start,
      details: {
        connected: false,
        error: 'Service not available',
      },
    };
  }
}

async function checkSmdr(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const { getServiceHealth } = await import('@/lib/services/bootstrap');
    const services = getServiceHealth();
    const smdr = services.find((s) => s.name === 'smdr');

    const isRunning = smdr?.running ?? false;
    const latencyMs = Date.now() - start;

    return {
      name: 'smdr',
      status: isRunning ? 'healthy' : 'degraded',
      latencyMs,
      details: {
        listening: isRunning,
        recordsProcessed: (smdr?.details?.recordsProcessed as number) ?? 0,
        connections: (smdr?.details?.connections as number) ?? 0,
      },
    };
  } catch {
    return {
      name: 'smdr',
      status: 'degraded',
      latencyMs: Date.now() - start,
      details: {
        listening: false,
        error: 'Service not available',
      },
    };
  }
}

async function checkStorage(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const fs = await import('fs/promises');
    const os = await import('os');
    const path = await import('path');

    // Check that the temp directory is writable
    const testFile = path.join(os.tmpdir(), `.calldoc-health-${Date.now()}`);
    await fs.writeFile(testFile, 'health-check');
    await fs.unlink(testFile);

    const latencyMs = Date.now() - start;

    return {
      name: 'storage',
      status: 'healthy',
      latencyMs,
      details: {
        writable: true,
        tempDir: os.tmpdir(),
      },
    };
  } catch (error) {
    return {
      name: 'storage',
      status: 'degraded',
      latencyMs: Date.now() - start,
      details: {
        writable: false,
        error: error instanceof Error ? error.message : 'Write check failed',
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Determine Overall Status
// ---------------------------------------------------------------------------

function determineOverallStatus(components: ComponentHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
  const criticalServices = ['database'];
  const hasCriticalFailure = components.some(
    (c) => criticalServices.includes(c.name) && c.status === 'unhealthy'
  );

  if (hasCriticalFailure) return 'unhealthy';

  const hasAnyUnhealthy = components.some((c) => c.status === 'unhealthy');
  const hasAnyDegraded = components.some((c) => c.status === 'degraded');

  if (hasAnyUnhealthy || hasAnyDegraded) return 'degraded';

  return 'healthy';
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET() {
  const requestStart = Date.now();

  // Run all health checks in parallel
  const components = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkDevLink3(),
    checkSmdr(),
    checkStorage(),
  ]);

  const overallStatus = determineOverallStatus(components);
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  const response: HealthResponse = {
    status: overallStatus,
    uptime,
    version: process.env.npm_package_version || '0.1.0',
    timestamp: new Date().toISOString(),
    components,
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  const totalDuration = Date.now() - requestStart;

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Response-Time': `${totalDuration}ms`,
    },
  });
}
