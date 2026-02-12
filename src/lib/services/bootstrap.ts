// ---------------------------------------------------------------------------
// Background Services Bootstrap - Initialize all background services
// ---------------------------------------------------------------------------
// Single entry point for starting all server-side background services.
// Called once when the server starts. Handles graceful shutdown and
// provides health check data for monitoring.

import { devlink3Service } from '@/lib/devlink3';
import type { DevLink3ServiceConfig } from '@/lib/devlink3';
import { smdrListener } from '@/lib/smdr/listener';
import type { SmdrListenerConfig } from '@/lib/smdr/listener';
import { ingestionService } from '@/lib/recordings/ingestion';
import type { IngestionConfig } from '@/lib/recordings/ingestion';
import { reportScheduler } from '@/lib/reports/scheduler';
import { alertEngine } from '@/lib/alerts/engine';
import { storageService } from '@/lib/recordings/storage';
import { clearAllAutoResumeTimers } from '@/lib/recordings/pci';
import { emailService } from '@/lib/email/service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceHealth {
  /** Service name */
  name: string;
  /** Whether the service is running */
  running: boolean;
  /** Additional status details */
  details: Record<string, unknown>;
  /** Timestamp of last health check */
  checkedAt: string;
}

export interface BootstrapConfig {
  /** DevLink3 configuration. If not provided, uses env vars. */
  devlink3?: DevLink3ServiceConfig;
  /** SMDR listener configuration. If not provided, uses env vars. */
  smdr?: SmdrListenerConfig;
  /** Recording ingestion configuration. If not provided, uses env vars. */
  ingestion?: IngestionConfig;
  /** Redis connection URL (default: redis://localhost:6379) */
  redisUrl?: string;
  /** Socket.io server instance for alert notifications */
  socketIo?: unknown;
  /** Services to skip during startup */
  skip?: string[];
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let isStarted = false;
let shutdownInProgress = false;
const serviceStatus: Map<string, { running: boolean; error?: string; startedAt?: string }> = new Map();

// ---------------------------------------------------------------------------
// startBackgroundServices
// ---------------------------------------------------------------------------

/**
 * Initialize and start all background services. This function should be
 * called once during server startup (e.g., in a custom Next.js server or
 * instrumentation hook).
 *
 * Services started:
 *   1. DevLink3 Service - CTI connection to IP Office
 *   2. SMDR Listener - TCP server for SMDR record delivery
 *   3. Recording Ingestion - File-based recording pipeline
 *   4. Report Scheduler - Cron-based report generation
 *   5. Alert Engine - Real-time metric alerting
 *
 * @param config - Optional configuration overrides
 */
export async function startBackgroundServices(config: BootstrapConfig = {}): Promise<void> {
  if (isStarted) {
    log('Background services already started');
    return;
  }

  isStarted = true;
  const skip = new Set(config.skip || []);
  const redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

  log('Starting background services...');

  // ── 1. DevLink3 Service ─────────────────────────────────────────────────
  if (!skip.has('devlink3')) {
    await startService('devlink3', async () => {
      const devlinkConfig: DevLink3ServiceConfig = config.devlink3 || {
        host: process.env.DEVLINK3_HOST || '127.0.0.1',
        port: parseInt(process.env.DEVLINK3_PORT || '50797', 10),
        useTls: process.env.DEVLINK3_USE_TLS === 'true',
        username: process.env.DEVLINK3_USERNAME || '',
        password: process.env.DEVLINK3_PASSWORD || '',
        redisUrl,
      };

      // Only start if host is configured
      if (devlinkConfig.host && devlinkConfig.username) {
        await devlink3Service.start(devlinkConfig);
      } else {
        log('DevLink3: Skipped (host or username not configured)');
      }
    });
  }

  // ── 2. SMDR Listener ───────────────────────────────────────────────────
  if (!skip.has('smdr')) {
    await startService('smdr', async () => {
      const smdrConfig: SmdrListenerConfig = config.smdr || {
        port: parseInt(process.env.SMDR_PORT || '1150', 10),
        host: process.env.SMDR_HOST || '0.0.0.0',
        redisUrl,
      };

      const smdrEnabled = process.env.SMDR_ENABLED !== 'false';
      if (smdrEnabled) {
        await smdrListener.start(smdrConfig);
      } else {
        log('SMDR: Skipped (SMDR_ENABLED=false)');
      }
    });
  }

  // ── 3. Recording Ingestion ─────────────────────────────────────────────
  if (!skip.has('ingestion')) {
    await startService('ingestion', async () => {
      const watchDir = process.env.RECORDING_WATCH_DIR;
      const defaultPoolId = process.env.RECORDING_DEFAULT_POOL_ID;

      if (watchDir && defaultPoolId) {
        const ingestionConfig: IngestionConfig = config.ingestion || {
          watchDir,
          defaultPoolId,
          pollIntervalMs: parseInt(process.env.RECORDING_POLL_INTERVAL || '30000', 10),
          sourceType: (process.env.RECORDING_SOURCE_TYPE as 'vmpro_ftp' | 'vrtx' | 'devlink3_active' | 'manual_upload') || 'vmpro_ftp',
        };

        await ingestionService.start(ingestionConfig);
      } else {
        log('Ingestion: Skipped (RECORDING_WATCH_DIR or RECORDING_DEFAULT_POOL_ID not set)');
      }
    });
  }

  // ── 4. Report Scheduler ────────────────────────────────────────────────
  if (!skip.has('scheduler')) {
    await startService('scheduler', async () => {
      await reportScheduler.start();
    });
  }

  // ── 5. Alert Engine ────────────────────────────────────────────────────
  if (!skip.has('alerts')) {
    await startService('alerts', async () => {
      await alertEngine.start(redisUrl, config.socketIo);
    });
  }

  // ── Register Shutdown Handlers ──────────────────────────────────────────
  registerShutdownHandlers();

  log('Background services startup complete');
  logServiceSummary();
}

// ---------------------------------------------------------------------------
// stopBackgroundServices
// ---------------------------------------------------------------------------

/**
 * Gracefully stop all background services.
 * Called on SIGTERM/SIGINT or when the server is shutting down.
 */
export async function stopBackgroundServices(): Promise<void> {
  if (shutdownInProgress) return;
  shutdownInProgress = true;

  log('Stopping background services...');

  const services = [
    { name: 'alerts', stop: () => alertEngine.stop() },
    { name: 'scheduler', stop: () => reportScheduler.stopAll() },
    { name: 'ingestion', stop: () => ingestionService.stop() },
    { name: 'smdr', stop: () => smdrListener.stop() },
    { name: 'devlink3', stop: () => devlink3Service.stop() },
    { name: 'pci-timers', stop: () => { clearAllAutoResumeTimers(); return Promise.resolve(); } },
    { name: 'storage', stop: () => { storageService.dispose(); return Promise.resolve(); } },
    { name: 'email', stop: () => emailService.dispose() },
  ];

  for (const service of services) {
    try {
      await Promise.race([
        service.stop(),
        new Promise<void>((resolve) => setTimeout(resolve, 5000)), // 5s timeout per service
      ]);
      serviceStatus.set(service.name, { running: false });
      log(`  ${service.name}: stopped`);
    } catch (err) {
      log(`  ${service.name}: stop failed - ${err instanceof Error ? err.message : err}`);
    }
  }

  isStarted = false;
  shutdownInProgress = false;
  log('All background services stopped');
}

// ---------------------------------------------------------------------------
// getServiceHealth
// ---------------------------------------------------------------------------

/**
 * Get health status for all background services.
 * Used by health check endpoints (e.g., /api/health).
 */
export function getServiceHealth(): ServiceHealth[] {
  const now = new Date().toISOString();

  return [
    {
      name: 'devlink3',
      running: serviceStatus.get('devlink3')?.running ?? false,
      details: {
        activeCalls: devlink3Service.activeCallCount,
        eventsProcessed: devlink3Service.totalEventCount,
        error: serviceStatus.get('devlink3')?.error,
      },
      checkedAt: now,
    },
    {
      name: 'smdr',
      running: serviceStatus.get('smdr')?.running ?? false,
      details: {
        recordsProcessed: smdrListener.totalRecordCount,
        connections: smdrListener.connectionCount,
        error: serviceStatus.get('smdr')?.error,
      },
      checkedAt: now,
    },
    {
      name: 'ingestion',
      running: serviceStatus.get('ingestion')?.running ?? false,
      details: {
        processed: ingestionService.totalProcessed,
        errors: ingestionService.totalErrors,
        error: serviceStatus.get('ingestion')?.error,
      },
      checkedAt: now,
    },
    {
      name: 'scheduler',
      running: serviceStatus.get('scheduler')?.running ?? false,
      details: {
        activeSchedules: reportScheduler.activeCount,
        error: serviceStatus.get('scheduler')?.error,
      },
      checkedAt: now,
    },
    {
      name: 'alerts',
      running: serviceStatus.get('alerts')?.running ?? false,
      details: {
        alertsFired: alertEngine.totalFired,
        error: serviceStatus.get('alerts')?.error,
      },
      checkedAt: now,
    },
    {
      name: 'email',
      running: emailService.isConfigured,
      details: {
        configured: emailService.isConfigured,
      },
      checkedAt: now,
    },
  ];
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Start a single service with error handling and status tracking.
 */
async function startService(name: string, startFn: () => Promise<void>): Promise<void> {
  try {
    await startFn();
    serviceStatus.set(name, { running: true, startedAt: new Date().toISOString() });
    log(`  ${name}: started`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    serviceStatus.set(name, { running: false, error: message });
    log(`  ${name}: FAILED - ${message}`);
    // Don't throw -- other services should still start
  }
}

/**
 * Register process signal handlers for graceful shutdown.
 */
function registerShutdownHandlers(): void {
  const handleShutdown = (signal: string) => {
    log(`Received ${signal}, initiating graceful shutdown...`);
    stopBackgroundServices()
      .then(() => {
        process.exit(0);
      })
      .catch((err) => {
        log(`Shutdown error: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      });
  };

  // Only register once
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('SIGINT');

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

/**
 * Log a summary of all service statuses.
 */
function logServiceSummary(): void {
  log('Service status summary:');
  for (const [name, status] of serviceStatus) {
    const indicator = status.running ? 'OK' : 'SKIP/FAIL';
    const extra = status.error ? ` (${status.error})` : '';
    log(`  [${indicator}] ${name}${extra}`);
  }
}

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [Bootstrap] ${message}`);
}
