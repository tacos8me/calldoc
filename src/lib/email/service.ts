// ---------------------------------------------------------------------------
// Email Service - SMTP email delivery via nodemailer
// ---------------------------------------------------------------------------
// Provides email delivery for report attachments, alert notifications,
// and recording share links. Configured via environment variables.
// Fails gracefully if SMTP is not configured (logs warning, no crash).

import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailAlert {
  id: string;
  ruleName: string;
  severity: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// EmailService
// ---------------------------------------------------------------------------

/**
 * Email delivery service using SMTP via nodemailer.
 *
 * Configuration via environment variables:
 *   - SMTP_HOST: SMTP server hostname
 *   - SMTP_PORT: SMTP server port (default 587)
 *   - SMTP_USER: SMTP authentication username
 *   - SMTP_PASS: SMTP authentication password
 *   - SMTP_FROM: Sender email address (default: calldoc@localhost)
 *   - SMTP_SECURE: Use TLS (default: false, STARTTLS is used on port 587)
 *
 * If SMTP_HOST is not configured, all send methods log a warning and return
 * without throwing, allowing the application to function without email.
 */
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private configured = false;
  private fromAddress: string;

  constructor() {
    this.fromAddress = process.env.SMTP_FROM || 'CallDoc <calldoc@localhost>';
    this.initialize();
  }

  /**
   * Initialize the SMTP transporter from environment variables.
   */
  private initialize(): void {
    const host = process.env.SMTP_HOST;
    if (!host) {
      log('SMTP not configured (SMTP_HOST not set). Email delivery disabled.');
      return;
    }

    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
        tls: {
          // Allow self-signed certs in development
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });

      this.configured = true;
      log(`SMTP configured: ${host}:${port} (secure: ${secure})`);
    } catch (err) {
      log(`Failed to create SMTP transporter: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Check if email delivery is available.
   */
  get isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Verify the SMTP connection is working.
   */
  async verify(): Promise<boolean> {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      log('SMTP connection verified');
      return true;
    } catch (err) {
      log(`SMTP verification failed: ${err instanceof Error ? err.message : err}`);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // sendReportEmail
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Send a scheduled report as an email attachment.
   *
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param reportBuffer - Report file contents
   * @param format - Report format for MIME type determination
   * @param filename - Attachment filename
   */
  async sendReportEmail(
    to: string,
    subject: string,
    reportBuffer: Buffer,
    format: 'csv' | 'pdf' | 'xlsx',
    filename: string
  ): Promise<boolean> {
    if (!this.ensureConfigured()) return false;

    const mimeTypes: Record<string, string> = {
      csv: 'text/csv',
      pdf: 'application/pdf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1a1a2e; border-bottom: 2px solid #e6e6e6; padding-bottom: 10px;">
      Scheduled Report
    </h2>
    <p>Your scheduled report is attached to this email.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px; color: #666;">Report:</td>
        <td style="padding: 8px; font-weight: 600;">${escapeHtml(subject.replace('Scheduled Report: ', ''))}</td>
      </tr>
      <tr>
        <td style="padding: 8px; color: #666;">Format:</td>
        <td style="padding: 8px;">${format.toUpperCase()}</td>
      </tr>
      <tr>
        <td style="padding: 8px; color: #666;">Generated:</td>
        <td style="padding: 8px;">${new Date().toLocaleString()}</td>
      </tr>
    </table>
    <p style="font-size: 12px; color: #999; margin-top: 24px;">
      This is an automated email from CallDoc. To change your report schedule, visit the Reports section.
    </p>
  </div>
</body>
</html>`;

    try {
      await this.transporter!.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
        attachments: [
          {
            filename,
            content: reportBuffer,
            contentType: mimeTypes[format] || 'application/octet-stream',
          },
        ],
      });

      log(`Report email sent to ${to}: ${filename}`);
      return true;
    } catch (err) {
      log(`Failed to send report email to ${to}: ${err instanceof Error ? err.message : err}`);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // sendAlertEmail
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Send an alert notification email.
   *
   * @param to - Recipient email address
   * @param alert - Alert data
   */
  async sendAlertEmail(to: string, alert: EmailAlert): Promise<boolean> {
    if (!this.ensureConfigured()) return false;

    const severityColors: Record<string, string> = {
      critical: '#dc2626',
      warning: '#f59e0b',
      info: '#3b82f6',
    };
    const color = severityColors[alert.severity] || '#3b82f6';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: ${color}; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
      <h2 style="margin: 0; font-size: 18px;">
        ${alert.severity.toUpperCase()} Alert: ${escapeHtml(alert.ruleName)}
      </h2>
    </div>
    <div style="border: 1px solid #e6e6e6; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
      <p style="font-size: 16px; margin-top: 0;">${escapeHtml(alert.message)}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; color: #666; border-bottom: 1px solid #f0f0f0;">Metric:</td>
          <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${escapeHtml(alert.metric)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; color: #666; border-bottom: 1px solid #f0f0f0;">Current Value:</td>
          <td style="padding: 8px; font-weight: 600; border-bottom: 1px solid #f0f0f0;">${alert.value}</td>
        </tr>
        <tr>
          <td style="padding: 8px; color: #666; border-bottom: 1px solid #f0f0f0;">Threshold:</td>
          <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${alert.threshold}</td>
        </tr>
        <tr>
          <td style="padding: 8px; color: #666;">Time:</td>
          <td style="padding: 8px;">${new Date(alert.timestamp).toLocaleString()}</td>
        </tr>
      </table>
      <p style="font-size: 12px; color: #999; margin-top: 24px;">
        This is an automated alert from CallDoc. To manage alert rules, visit the Alerts section.
      </p>
    </div>
  </div>
</body>
</html>`;

    try {
      await this.transporter!.sendMail({
        from: this.fromAddress,
        to,
        subject: `[${alert.severity.toUpperCase()}] ${alert.ruleName}`,
        html,
      });

      log(`Alert email sent to ${to}: ${alert.ruleName}`);
      return true;
    } catch (err) {
      log(`Failed to send alert email to ${to}: ${err instanceof Error ? err.message : err}`);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // sendShareLink
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Send a recording share link via email.
   *
   * @param to - Recipient email address
   * @param recordingName - Display name for the recording
   * @param shareUrl - The full share URL
   * @param expiresAt - Expiration date of the share link
   */
  async sendShareLink(
    to: string,
    recordingName: string,
    shareUrl: string,
    expiresAt: Date
  ): Promise<boolean> {
    if (!this.ensureConfigured()) return false;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1a1a2e; border-bottom: 2px solid #e6e6e6; padding-bottom: 10px;">
      Recording Shared With You
    </h2>
    <p>A call recording has been shared with you:</p>
    <p style="font-weight: 600; font-size: 16px;">${escapeHtml(recordingName)}</p>
    <a href="${escapeHtml(shareUrl)}"
       style="display: inline-block; background: #1a1a2e; color: white; padding: 12px 24px;
              border-radius: 6px; text-decoration: none; margin: 16px 0;">
      Listen to Recording
    </a>
    <p style="color: #666; font-size: 14px;">
      This link expires on ${expiresAt.toLocaleString()}.
    </p>
    <p style="font-size: 12px; color: #999; margin-top: 24px;">
      This is an automated email from CallDoc.
    </p>
  </div>
</body>
</html>`;

    try {
      await this.transporter!.sendMail({
        from: this.fromAddress,
        to,
        subject: `Recording Shared: ${recordingName}`,
        html,
      });

      log(`Share link email sent to ${to}: ${recordingName}`);
      return true;
    } catch (err) {
      log(`Failed to send share link email to ${to}: ${err instanceof Error ? err.message : err}`);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Close the SMTP connection pool.
   */
  async dispose(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.configured = false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if SMTP is configured and log a warning if not.
   * Returns true if ready to send.
   */
  private ensureConfigured(): boolean {
    if (!this.configured || !this.transporter) {
      log('Email not sent: SMTP not configured');
      return false;
    }
    return true;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape HTML entities to prevent XSS in email templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [Email] ${message}`);
}

/** Singleton EmailService instance. */
export const emailService = new EmailService();
