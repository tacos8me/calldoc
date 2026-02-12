// ---------------------------------------------------------------------------
// System Audit Log Service
// ---------------------------------------------------------------------------
// Tracks all administrative actions for compliance and security auditing.
// Provides a simple API for logging actions from anywhere in the application.

import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql, type SQL } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'settings.changed'
  | 'rule.created'
  | 'rule.updated'
  | 'wallboard.created'
  | 'recording.shared'
  | 'recording.deleted'
  | 'report.scheduled'
  | 'webhook.created'
  | 'webhook.updated'
  | 'webhook.deleted'
  | 'bulk.export'
  | 'bulk.tag'
  | 'bulk.score';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  action: AuditAction;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Default retention: 90 days (configurable via env)
// ---------------------------------------------------------------------------

const RETENTION_DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10);

// ---------------------------------------------------------------------------
// auditLog - Main logging function
// ---------------------------------------------------------------------------

/**
 * Record an administrative action in the audit log.
 *
 * @param userId - ID of the user performing the action
 * @param userName - Display name of the user
 * @param action - The action being performed
 * @param resource - Type of resource being acted on (e.g., 'user', 'recording')
 * @param resourceId - Optional ID of the specific resource
 * @param details - Optional additional context
 * @param ipAddress - Optional client IP address
 */
export async function auditLog(
  userId: string,
  userName: string,
  action: AuditAction,
  resource: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId,
      userName,
      action,
      resource,
      resourceId: resourceId ?? null,
      details: details ?? null,
      ipAddress: ipAddress ?? null,
    });

    log(`${userName} (${userId}) ${action} on ${resource}${resourceId ? `:${resourceId}` : ''}`);
  } catch (err) {
    // Audit logging should never crash the application
    log(`Failed to write audit log: ${err instanceof Error ? err.message : err}`);
  }
}

// ---------------------------------------------------------------------------
// queryAuditLogs - Paginated, filterable audit log query
// ---------------------------------------------------------------------------

/**
 * Query the audit log with pagination and filters.
 */
export async function queryAuditLogs(
  filters: AuditLogFilters = {}
): Promise<{ data: AuditLogEntry[]; total: number }> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters.resource) {
    conditions.push(eq(auditLogs.resource, filters.resource));
  }
  if (filters.from) {
    conditions.push(gte(auditLogs.createdAt, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(auditLogs.createdAt, filters.to));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  const data: AuditLogEntry[] = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    action: row.action,
    resource: row.resource,
    resourceId: row.resourceId,
    details: row.details,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
  }));

  return { data, total };
}

// ---------------------------------------------------------------------------
// cleanupOldEntries - Retention enforcement
// ---------------------------------------------------------------------------

/**
 * Delete audit log entries older than the configured retention period.
 * Should be called periodically (e.g., once per day via cron).
 *
 * @returns Number of deleted entries
 */
export async function cleanupOldAuditEntries(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const result = await db
    .delete(auditLogs)
    .where(lte(auditLogs.createdAt, cutoff))
    .returning({ id: auditLogs.id });

  if (result.length > 0) {
    log(`Cleaned up ${result.length} audit entries older than ${RETENTION_DAYS} days`);
  }

  return result.length;
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [Audit] ${message}`);
}
