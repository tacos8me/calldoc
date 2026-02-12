// ---------------------------------------------------------------------------
// Report Scheduler - Background report scheduling using node-cron
// ---------------------------------------------------------------------------
// Manages recurring report generation and email delivery. Loads active
// schedules from the database, registers cron jobs, and handles the full
// pipeline: date range calculation, report generation, export, and delivery.

import cron from 'node-cron';
import { eq, and } from 'drizzle-orm';
import {
  subDays,
  subWeeks,
  subMonths,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { db } from '@/lib/db';
import { reportSchedules, reportDefinitions } from '@/lib/db/schema';
import { emailService } from '@/lib/email/service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduleEntry {
  id: string;
  cronExpression: string;
  task: cron.ScheduledTask;
}

interface DateRange {
  from: Date;
  to: Date;
}

// ---------------------------------------------------------------------------
// ReportScheduler
// ---------------------------------------------------------------------------

/**
 * Background report scheduler. Loads all active report schedules from the
 * database and registers node-cron jobs. When a cron job fires, it:
 *   1. Loads the report definition and filters
 *   2. Adjusts the date range to the previous period
 *   3. Generates report data
 *   4. Exports to the configured format (CSV/PDF/Excel)
 *   5. Sends email with the report as an attachment
 */
export class ReportScheduler {
  private schedules: Map<string, ScheduleEntry> = new Map();
  private isRunning = false;

  /** Number of active cron jobs. */
  get activeCount(): number {
    return this.schedules.size;
  }

  /** Whether the scheduler is running. */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Start the scheduler: load all active schedules and register cron jobs.
   */
  async start(): Promise<void> {
    this.isRunning = true;

    const rows = await db
      .select()
      .from(reportSchedules)
      .where(eq(reportSchedules.enabled, true));

    let registered = 0;

    for (const schedule of rows) {
      try {
        this.scheduleReport(schedule);
        registered++;
      } catch (err) {
        log(`Failed to schedule report ${schedule.id}: ${err instanceof Error ? err.message : err}`);
      }
    }

    log(`Report scheduler started with ${registered} schedule(s)`);
  }

  /**
   * Create a cron job for a report schedule.
   *
   * Cron expression mapping:
   *   - daily:   At the scheduled time every day
   *   - weekly:  At the scheduled time on the configured day of week
   *   - monthly: At the scheduled time on the configured day of month
   *
   * @param schedule - Report schedule record from the database
   */
  scheduleReport(schedule: {
    id: string;
    reportDefinitionId: string;
    frequency: string;
    time: string;
    dayOfWeek: number | null;
    dayOfMonth: number | null;
    recipients: string[];
    format: string;
    filters: Record<string, unknown> | null;
  }): void {
    // Remove existing schedule if being re-registered
    this.removeSchedule(schedule.id);

    // Parse time (HH:mm format)
    const [hourStr, minuteStr] = schedule.time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    // Build cron expression
    let cronExpression: string;

    switch (schedule.frequency) {
      case 'daily':
        // At minute:hour every day
        cronExpression = `${minute} ${hour} * * *`;
        break;

      case 'weekly': {
        const dow = schedule.dayOfWeek ?? 1; // Default to Monday
        cronExpression = `${minute} ${hour} * * ${dow}`;
        break;
      }

      case 'monthly': {
        const dom = schedule.dayOfMonth ?? 1; // Default to 1st
        cronExpression = `${minute} ${hour} ${dom} * *`;
        break;
      }

      default:
        throw new Error(`Unknown schedule frequency: ${schedule.frequency}`);
    }

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // Create the cron task
    const task = cron.schedule(cronExpression, () => {
      this.executeSchedule(schedule).catch((err) => {
        log(`Schedule execution failed for ${schedule.id}: ${err instanceof Error ? err.message : err}`);
      });
    });

    this.schedules.set(schedule.id, {
      id: schedule.id,
      cronExpression,
      task,
    });

    log(`Registered schedule ${schedule.id}: "${cronExpression}" (${schedule.frequency})`);
  }

  /**
   * Remove a specific schedule's cron job.
   */
  removeSchedule(scheduleId: string): void {
    const existing = this.schedules.get(scheduleId);
    if (existing) {
      existing.task.stop();
      this.schedules.delete(scheduleId);
    }
  }

  /**
   * Stop all cron jobs and shut down the scheduler.
   */
  stopAll(): void {
    for (const [id, entry] of this.schedules) {
      entry.task.stop();
    }
    this.schedules.clear();
    this.isRunning = false;
    log('Report scheduler stopped');
  }

  /**
   * Execute a scheduled report: generate data, export, and email.
   */
  private async executeSchedule(schedule: {
    id: string;
    reportDefinitionId: string;
    frequency: string;
    recipients: string[];
    format: string;
    filters: Record<string, unknown> | null;
  }): Promise<void> {
    const startTime = Date.now();
    log(`Executing schedule ${schedule.id}...`);

    try {
      // Step 1: Load report definition
      const [reportDef] = await db
        .select()
        .from(reportDefinitions)
        .where(eq(reportDefinitions.id, schedule.reportDefinitionId))
        .limit(1);

      if (!reportDef) {
        throw new Error(`Report definition not found: ${schedule.reportDefinitionId}`);
      }

      // Step 2: Calculate date range for previous period
      const dateRange = this.calculateDateRange(schedule.frequency);

      // Step 3: Generate report data
      // The actual report generation will be implemented by the Reports module.
      // For now, we produce a placeholder indicating what would be generated.
      const reportData = await this.generateReportData(reportDef, dateRange, schedule.filters);

      // Step 4: Export to configured format
      const { buffer, filename, mimeType } = await this.exportReport(
        reportDef.name,
        reportData,
        schedule.format,
        dateRange
      );

      // Step 5: Send email with attachment
      if (schedule.recipients.length > 0) {
        for (const recipient of schedule.recipients) {
          try {
            await emailService.sendReportEmail(
              recipient,
              `Scheduled Report: ${reportDef.name}`,
              buffer,
              schedule.format as 'csv' | 'pdf' | 'xlsx',
              filename
            );
          } catch (emailErr) {
            log(`Failed to email report to ${recipient}: ${
              emailErr instanceof Error ? emailErr.message : emailErr
            }`);
          }
        }
      }

      // Update schedule with last run info
      const elapsedMs = Date.now() - startTime;
      await db
        .update(reportSchedules)
        .set({
          lastRunAt: new Date(),
          lastRunStatus: 'success',
          lastRunError: null,
          updatedAt: new Date(),
        })
        .where(eq(reportSchedules.id, schedule.id));

      log(`Schedule ${schedule.id} completed in ${elapsedMs}ms`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      await db
        .update(reportSchedules)
        .set({
          lastRunAt: new Date(),
          lastRunStatus: 'error',
          lastRunError: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(reportSchedules.id, schedule.id));

      log(`Schedule ${schedule.id} failed: ${errorMessage}`);
      throw err;
    }
  }

  /**
   * Calculate the date range for the previous period based on frequency.
   *   - daily:   yesterday
   *   - weekly:  previous Mon-Sun
   *   - monthly: previous calendar month
   */
  private calculateDateRange(frequency: string): DateRange {
    const now = new Date();

    switch (frequency) {
      case 'daily': {
        const yesterday = subDays(now, 1);
        return {
          from: startOfDay(yesterday),
          to: endOfDay(yesterday),
        };
      }

      case 'weekly': {
        const lastWeek = subWeeks(now, 1);
        return {
          from: startOfWeek(lastWeek, { weekStartsOn: 1 }), // Monday
          to: endOfWeek(lastWeek, { weekStartsOn: 1 }),       // Sunday
        };
      }

      case 'monthly': {
        const lastMonth = subMonths(now, 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
      }

      default:
        // Default to yesterday
        const yesterday = subDays(now, 1);
        return {
          from: startOfDay(yesterday),
          to: endOfDay(yesterday),
        };
    }
  }

  /**
   * Generate report data based on the report definition and filters.
   * This delegates to the report generation logic. Currently returns structured
   * placeholder data that the export functions can process.
   */
  private async generateReportData(
    reportDef: {
      id: string;
      name: string;
      category: string;
      columns: string[] | null;
      filters: Record<string, unknown> | null;
    },
    dateRange: DateRange,
    scheduleFilters: Record<string, unknown> | null
  ): Promise<{ headers: string[]; rows: string[][]; summary: Record<string, unknown> }> {
    // Merge report definition filters with schedule-specific filters
    const mergedFilters = {
      ...reportDef.filters,
      ...scheduleFilters,
      dateRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
    };

    // TODO: Replace with actual report query execution when report engine is built.
    // The report engine would use the mergedFilters to query the calls, agents,
    // groups, or trunks tables depending on reportDef.category.
    log(`Generating ${reportDef.category} report "${reportDef.name}" ` +
        `for ${dateRange.from.toISOString().slice(0, 10)} to ${dateRange.to.toISOString().slice(0, 10)}`);

    const headers = reportDef.columns || ['Date', 'Total Calls', 'Answered', 'Abandoned', 'Avg Duration'];
    const rows: string[][] = [];

    // Return empty data structure -- the report engine will populate this
    return { headers, rows, summary: mergedFilters };
  }

  /**
   * Export report data to the requested format.
   */
  private async exportReport(
    reportName: string,
    data: { headers: string[]; rows: string[][]; summary: Record<string, unknown> },
    format: string,
    dateRange: DateRange
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const dateStr = dateRange.from.toISOString().slice(0, 10);
    const safeName = reportName.replace(/[^a-zA-Z0-9-_]/g, '_');

    switch (format) {
      case 'csv':
        return this.exportCsv(safeName, dateStr, data);

      case 'xlsx':
        return this.exportXlsx(safeName, dateStr, data);

      case 'pdf':
        return this.exportPdf(safeName, dateStr, data);

      default:
        return this.exportCsv(safeName, dateStr, data);
    }
  }

  /**
   * Export data as CSV.
   */
  private async exportCsv(
    safeName: string,
    dateStr: string,
    data: { headers: string[]; rows: string[][] }
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const lines: string[] = [];

    // Header row
    lines.push(data.headers.map(escapeCsvField).join(','));

    // Data rows
    for (const row of data.rows) {
      lines.push(row.map(escapeCsvField).join(','));
    }

    const csv = lines.join('\n');
    return {
      buffer: Buffer.from(csv, 'utf-8'),
      filename: `${safeName}_${dateStr}.csv`,
      mimeType: 'text/csv',
    };
  }

  /**
   * Export data as XLSX using ExcelJS.
   */
  private async exportXlsx(
    safeName: string,
    dateStr: string,
    data: { headers: string[]; rows: string[][] }
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    // Dynamic import of exceljs to avoid loading it until needed
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');

    // Add header row with bold styling
    const headerRow = sheet.addRow(data.headers);
    headerRow.font = { bold: true };

    // Add data rows
    for (const row of data.rows) {
      sheet.addRow(row);
    }

    // Auto-fit column widths (approximate)
    for (let i = 1; i <= data.headers.length; i++) {
      const col = sheet.getColumn(i);
      let maxLen = data.headers[i - 1].length;
      for (const row of data.rows) {
        if (row[i - 1]) {
          maxLen = Math.max(maxLen, row[i - 1].length);
        }
      }
      col.width = Math.min(maxLen + 4, 50);
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      buffer,
      filename: `${safeName}_${dateStr}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /**
   * Export data as PDF. Generates a simple tabular PDF.
   * For a production implementation, use @react-pdf/renderer or pdfkit.
   * For now, generates a text-based representation wrapped as PDF.
   */
  private async exportPdf(
    safeName: string,
    dateStr: string,
    data: { headers: string[]; rows: string[][] }
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    // Simple text-based PDF content. In production, this would use a proper PDF library.
    // The CSV format is used as fallback content for the PDF attachment.
    const lines: string[] = [];
    lines.push(`Report: ${safeName}`);
    lines.push(`Date: ${dateStr}`);
    lines.push('');
    lines.push(data.headers.join(' | '));
    lines.push('-'.repeat(80));

    for (const row of data.rows) {
      lines.push(row.join(' | '));
    }

    const content = lines.join('\n');
    return {
      buffer: Buffer.from(content, 'utf-8'),
      filename: `${safeName}_${dateStr}.pdf`,
      mimeType: 'application/pdf',
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape a field for CSV output. Wraps in quotes if the field contains
 * commas, quotes, or newlines.
 */
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [ReportScheduler] ${message}`);
}

/** Singleton ReportScheduler instance. */
export const reportScheduler = new ReportScheduler();
