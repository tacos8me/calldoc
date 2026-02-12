// ---------------------------------------------------------------------------
// Webhook Notification Service
// ---------------------------------------------------------------------------
// Outbound webhook system for integrating CallDoc with external systems.
// Supports event subscriptions, HMAC-SHA256 signatures, and retry logic
// with exponential backoff.

import * as crypto from 'crypto';
import { db } from '@/lib/db';
import { webhookEndpoints, webhookDeliveries } from '@/lib/db/schema';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebhookEvent =
  | 'call.started'
  | 'call.ended'
  | 'call.abandoned'
  | 'agent.state_changed'
  | 'alert.fired'
  | 'recording.ready';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookEndpointRecord {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryRecord {
  id: string;
  endpointId: string;
  event: string;
  payload: Record<string, unknown>;
  responseStatus: number | null;
  responseBody: string | null;
  latencyMs: number | null;
  attempt: number;
  success: boolean;
  errorMessage: string | null;
  deliveredAt: string;
}

// ---------------------------------------------------------------------------
// Retry configuration: exponential backoff
// ---------------------------------------------------------------------------

const RETRY_DELAYS_MS = [1000, 5000, 30000]; // 1s, 5s, 30s
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1; // initial + retries
const DELIVERY_TIMEOUT_MS = 10000; // 10 second timeout per delivery attempt

// ---------------------------------------------------------------------------
// WebhookService
// ---------------------------------------------------------------------------

class WebhookService {
  /**
   * Dispatch an event to all subscribed webhook endpoints.
   * Delivery is fire-and-forget from the caller's perspective.
   */
  async dispatch(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
    try {
      // Find all active endpoints subscribed to this event
      const endpoints = await db
        .select()
        .from(webhookEndpoints)
        .where(eq(webhookEndpoints.active, true));

      const subscribedEndpoints = endpoints.filter((ep) => {
        const events = ep.events as string[];
        return events.includes(event);
      });

      if (subscribedEndpoints.length === 0) return;

      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      // Fire deliveries concurrently (non-blocking)
      const deliveryPromises = subscribedEndpoints.map((endpoint) =>
        this.deliverWithRetry(endpoint.id, endpoint.url, endpoint.secret, payload)
          .catch((err) => {
            log(`Delivery failed for endpoint ${endpoint.name}: ${err instanceof Error ? err.message : err}`);
          })
      );

      // Do not await - fire and forget
      Promise.allSettled(deliveryPromises);

      log(`Dispatched ${event} to ${subscribedEndpoints.length} endpoint(s)`);
    } catch (err) {
      log(`Failed to dispatch ${event}: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Deliver a webhook payload to a single endpoint with retry logic.
   */
  private async deliverWithRetry(
    endpointId: string,
    url: string,
    secret: string,
    payload: WebhookPayload
  ): Promise<void> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const result = await this.deliver(endpointId, url, secret, payload, attempt);

      if (result.success) return;

      // If not the last attempt, wait before retrying
      if (attempt < MAX_ATTEMPTS) {
        const delay = RETRY_DELAYS_MS[attempt - 1] ?? 30000;
        await sleep(delay);
      }
    }
  }

  /**
   * Perform a single delivery attempt and log the result.
   */
  private async deliver(
    endpointId: string,
    url: string,
    secret: string,
    payload: WebhookPayload,
    attempt: number
  ): Promise<{ success: boolean }> {
    const body = JSON.stringify(payload);
    const signature = this.computeSignature(body, secret);
    const startTime = Date.now();

    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    let success = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Delivery-Attempt': String(attempt),
          'User-Agent': 'CallDoc-Webhook/1.0',
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      responseStatus = response.status;
      try {
        responseBody = await response.text();
        if (responseBody.length > 1024) {
          responseBody = responseBody.slice(0, 1024) + '...[truncated]';
        }
      } catch {
        responseBody = null;
      }

      // 2xx is considered success
      success = responseStatus >= 200 && responseStatus < 300;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    const latencyMs = Date.now() - startTime;

    // Record the delivery attempt
    try {
      await db.insert(webhookDeliveries).values({
        endpointId,
        event: payload.event,
        payload: payload as unknown as Record<string, unknown>,
        responseStatus,
        responseBody,
        latencyMs,
        attempt,
        success,
        errorMessage,
      });
    } catch (dbErr) {
      log(`Failed to record webhook delivery: ${dbErr instanceof Error ? dbErr.message : dbErr}`);
    }

    return { success };
  }

  /**
   * Compute HMAC-SHA256 signature for webhook payload verification.
   */
  private computeSignature(body: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body, 'utf8');
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Get delivery history for an endpoint.
   */
  async getDeliveryHistory(
    endpointId: string,
    page: number = 1,
    limit: number = 25
  ): Promise<{ data: WebhookDeliveryRecord[]; total: number }> {
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.endpointId, endpointId))
        .orderBy(desc(webhookDeliveries.deliveredAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.endpointId, endpointId)),
    ]);

    const total = countResult[0]?.count ?? 0;

    const data: WebhookDeliveryRecord[] = rows.map((row) => ({
      id: row.id,
      endpointId: row.endpointId,
      event: row.event,
      payload: row.payload,
      responseStatus: row.responseStatus,
      responseBody: row.responseBody,
      latencyMs: row.latencyMs,
      attempt: row.attempt,
      success: row.success,
      errorMessage: row.errorMessage,
      deliveredAt: row.deliveredAt.toISOString(),
    }));

    return { data, total };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [Webhook] ${message}`);
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const webhookService = new WebhookService();
