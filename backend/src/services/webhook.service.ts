/**
 * Webhook Service - n8n Integration
 * Phase 8C: n8n Workflow Integration
 * 
 * IMPORTANT: This service contains ZERO business logic.
 * It ONLY sends workflow events to external webhook endpoints.
 */

import axios, { AxiosInstance } from 'axios';

export interface WebhookPayload {
  event: 'workflow_completed' | 'reroute' | 'critical_risk';
  timestamp: string;
  cycleId: string;
  shipment: {
    id: number;
    trackingId: string;
    status: string;
    priority: string;
  };
  riskData?: {
    riskLevel: string;
    delayProbability: number;
    triggeredByHub: string;
  };
  routeChange?: {
    oldRoute: string[];
    newRoute: string[];
    reason: string;
    estimatedTimeSaved?: number;
  };
  alert?: {
    message: string;
    isAnomaly: boolean;
    recipientEmail?: string;
    recipientName?: string;
    severity: string;
  };
}

export interface WebhookResponse {
  success: boolean;
  executionId?: string;
  error?: string;
}

export interface WebhookConfig {
  url: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

export class WebhookService {
  private client: AxiosInstance;
  private config: WebhookConfig;
  private enabled: boolean;

  constructor() {
    const webhookUrl = process.env.N8N_WEBHOOK_URL || process.env.N8N_MOCK_WEBHOOK_URL;
    
    this.enabled = !!webhookUrl;
    
    this.config = {
      url: webhookUrl || 'https://webhook.site/mock',
      timeout: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '5000', 10),
      maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3', 10),
      retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY_MS || '1000', 10),
    };

    this.client = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OptiRoute-Webhook/1.0',
      },
    });

    if (!this.enabled) {
      console.warn('[WebhookService] No webhook URL configured. Webhooks disabled.');
    } else {
      console.log(`[WebhookService] Initialized with URL: ${this.config.url}`);
    }
  }

  /**
   * Send workflow completed event
   * NO business logic - only sends event
   */
  async sendWorkflowCompleted(payload: WebhookPayload): Promise<WebhookResponse> {
    if (!this.enabled) {
      return {
        success: false,
        error: 'Webhooks disabled - no URL configured',
      };
    }

    console.log(`[WebhookService] Sending workflow_completed event: ${payload.shipment.trackingId}`);

    return this.sendWithRetry({
      ...payload,
      event: 'workflow_completed',
    });
  }

  /**
   * Send reroute event
   * NO business logic - only sends event
   */
  async sendRerouteEvent(payload: WebhookPayload): Promise<WebhookResponse> {
    if (!this.enabled) {
      return {
        success: false,
        error: 'Webhooks disabled - no URL configured',
      };
    }

    console.log(`[WebhookService] Sending reroute event: ${payload.shipment.trackingId}`);

    return this.sendWithRetry({
      ...payload,
      event: 'reroute',
    });
  }

  /**
   * Send critical risk event
   * NO business logic - only sends event
   */
  async sendCriticalRiskEvent(payload: WebhookPayload): Promise<WebhookResponse> {
    if (!this.enabled) {
      return {
        success: false,
        error: 'Webhooks disabled - no URL configured',
      };
    }

    console.log(`[WebhookService] Sending critical_risk event: ${payload.shipment.trackingId}`);

    return this.sendWithRetry({
      ...payload,
      event: 'critical_risk',
    });
  }

  /**
   * Send webhook with retry logic
   */
  private async sendWithRetry(
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<WebhookResponse> {
    try {
      const response = await this.client.post(this.config.url, payload);

      console.log(
        `[WebhookService] Webhook sent successfully (attempt ${attempt}): ${response.status}`
      );

      return {
        success: true,
        executionId: response.data?.executionId || response.data?.id,
      };
    } catch (error: any) {
      const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      const isNetworkError =
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ENETUNREACH';

      console.error(
        `[WebhookService] Webhook failed (attempt ${attempt}/${this.config.maxRetries}):`,
        error.message
      );

      // Retry if not exhausted and error is retryable
      if (
        attempt < this.config.maxRetries &&
        (isTimeout || isNetworkError || error.response?.status >= 500)
      ) {
        console.log(
          `[WebhookService] Retrying in ${this.config.retryDelay}ms...`
        );

        // Wait before retry
        await this.sleep(this.config.retryDelay);

        // Exponential backoff
        const nextDelay = this.config.retryDelay * attempt;
        this.config.retryDelay = nextDelay;

        return this.sendWithRetry(payload, attempt + 1);
      }

      // Retry exhausted or non-retryable error
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sleep utility for retry delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if webhook service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get webhook configuration
   */
  getConfig(): WebhookConfig {
    return { ...this.config };
  }
}

export const webhookService = new WebhookService();
