/**
 * Communication Agent - Prepares Communication Payloads
 * Does NOT send notifications, only builds structured messages
 */

import { WeatherAgentResult } from './weatherAgent';
import { RiskAgentResult } from './riskAgent';
import { RoutingAgentResult } from './routingAgent';
import { AgentStep } from './supervisorAgent';

export type MessageSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ShipmentContext {
  shipmentId: number;
  trackingId: string;
  currentHubId: number | null;
  destinationHubId: number;
  activeRoute: number[];
  priority: string;
}

export interface CommunicationAgentResult {
  success: boolean;
  messagesGenerated: number;
  shipmentMessage: {
    trackingId: string;
    subject: string;
    body: string;
    severity: MessageSeverity;
    timestamp: Date;
  } | null;
  operationsMessage: {
    recipient: string;
    subject: string;
    body: string;
    severity: MessageSeverity;
    actionRequired: boolean;
    timestamp: Date;
  } | null;
  auditLog: {
    agentName: string;
    action: string;
    inputData: Record<string, any>;
    outputData: Record<string, any>;
    status: 'success' | 'error' | 'skipped';
    durationMs: number;
    shipmentId: number;
  };
  severity: MessageSeverity;
  requiresImmediateAction: boolean;
  anomalyDetected: boolean;
  anomalyDetails?: {
    pattern: string;
    affectedHubs: number[];
    severity: string;
  };
  recommendations: string[];
  metadata: {
    executionTimeMs: number;
    weatherSummary?: string;
    riskSummary?: string;
    routingSummary?: string;
    source: string;
  };
  errors: string[];
}

export class CommunicationAgent {
  private initialized: boolean;

  constructor() {
    this.initialized = false;
  }

  async initialize(): Promise<boolean> {
    console.log('[CommunicationAgent] Initializing...');
    this.initialized = true;
    console.log('[CommunicationAgent] Initialized successfully');
    return true;
  }

  async execute(
    context: ShipmentContext,
    step: AgentStep,
    weatherResult?: WeatherAgentResult,
    riskResult?: RiskAgentResult,
    routingResult?: RoutingAgentResult
  ): Promise<CommunicationAgentResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    console.log(
      `[CommunicationAgent] Executing for shipment ${context.trackingId}`
    );

    try {
      const summary = this.buildSummary(weatherResult, riskResult, routingResult);

      const shipmentMessage = this.buildShipmentMessage(
        context,
        weatherResult,
        riskResult,
        routingResult
      );

      const operationsMessage = this.buildOperationsMessage(
        context,
        weatherResult,
        riskResult,
        routingResult,
        summary
      );

      const auditLog = this.buildAuditLog(
        context,
        weatherResult,
        riskResult,
        routingResult,
        Date.now() - startTime
      );

      const severity = this.calculateSeverity(riskResult, routingResult);

      const requiresImmediateAction = severity === 'critical' || severity === 'high';

      const anomalyDetected = this.detectAnomalies(riskResult);
      const anomalyDetails = anomalyDetected
        ? this.buildAnomalyDetails(riskResult)
        : undefined;

      const recommendations = this.generateRecommendations(
        weatherResult,
        riskResult,
        routingResult,
        anomalyDetected
      );

      const executionTimeMs = Date.now() - startTime;

      const result: CommunicationAgentResult = {
        success: true,
        messagesGenerated: 2,
        shipmentMessage,
        operationsMessage,
        auditLog,
        severity,
        requiresImmediateAction,
        anomalyDetected,
        anomalyDetails,
        recommendations,
        metadata: {
          executionTimeMs,
          weatherSummary: summary.weather,
          riskSummary: summary.risk,
          routingSummary: summary.routing,
          source: 'communication_agent',
        },
        errors: [],
      };

      console.log(
        `[CommunicationAgent] Completed: Severity ${severity}, ${result.messagesGenerated} messages in ${executionTimeMs}ms`
      );

      return result;
    } catch (error: any) {
      console.error('[CommunicationAgent] Execution failed:', error.message);

      return {
        success: false,
        messagesGenerated: 0,
        shipmentMessage: null,
        operationsMessage: null,
        auditLog: {
          agentName: 'communication',
          action: 'generate_messages',
          inputData: { context },
          outputData: {},
          status: 'error',
          durationMs: Date.now() - startTime,
          shipmentId: context.shipmentId,
        },
        severity: 'low',
        requiresImmediateAction: false,
        anomalyDetected: false,
        recommendations: [],
        metadata: {
          executionTimeMs: Date.now() - startTime,
          source: 'error',
        },
        errors: [error.message],
      };
    }
  }

  buildSummary(
    weatherResult?: WeatherAgentResult,
    riskResult?: RiskAgentResult,
    routingResult?: RoutingAgentResult
  ): {
    weather: string;
    risk: string;
    routing: string;
  } {
    const weather = weatherResult
      ? `${weatherResult.hubsProcessed} hubs checked, highest impact: ${weatherResult.impactAssessment.highestImpact}`
      : 'No weather data';

    const risk = riskResult
      ? `${riskResult.hubsProcessed} hubs assessed, overall risk: ${riskResult.overallRisk.highestRisk}`
      : 'No risk data';

    const routing = routingResult
      ? `${routingResult.summary.totalRerouted} rerouted, ${routingResult.summary.totalUnchanged} unchanged`
      : 'No routing changes';

    return { weather, risk, routing };
  }

  buildShipmentMessage(
    context: ShipmentContext,
    weatherResult?: WeatherAgentResult,
    riskResult?: RiskAgentResult,
    routingResult?: RoutingAgentResult
  ): CommunicationAgentResult['shipmentMessage'] {
    const rerouted = routingResult?.summary.totalRerouted ?? 0;

    if (rerouted === 0) {
      return null;
    }

    const routeChange = routingResult?.routeChanges[0];
    if (!routeChange) return null;

    const subject = `Shipment ${context.trackingId}: Route Updated`;

    const body = `
Dear Customer,

Your shipment ${context.trackingId} has been rerouted for optimal delivery.

Original Route: ${routeChange.oldRouteNames.join(' → ')}
New Route: ${routeChange.newRouteNames.join(' → ')}

Reason: ${routeChange.reason}

${
  routeChange.estimatedTimeSaved && routeChange.estimatedTimeSaved > 0
    ? `Estimated time saved: ${routeChange.estimatedTimeSaved} minutes`
    : 'This change ensures your shipment arrives safely and on time.'
}

We continue to monitor your shipment and will notify you of any updates.

Best regards,
OptiRoute Logistics Team
    `.trim();

    const severity = this.calculateSeverity(riskResult, routingResult);

    return {
      trackingId: context.trackingId,
      subject,
      body,
      severity,
      timestamp: new Date(),
    };
  }

  buildOperationsMessage(
    context: ShipmentContext,
    weatherResult?: WeatherAgentResult,
    riskResult?: RiskAgentResult,
    routingResult?: RoutingAgentResult,
    summary?: { weather: string; risk: string; routing: string }
  ): CommunicationAgentResult['operationsMessage'] {
    const rerouted = routingResult?.summary.totalRerouted ?? 0;
    const highestRisk = riskResult?.overallRisk.highestRisk || 'low';

    if (rerouted === 0 && highestRisk !== 'critical' && highestRisk !== 'high') {
      return null;
    }

    const severity = this.calculateSeverity(riskResult, routingResult);
    const actionRequired = severity === 'critical' || severity === 'high';

    const routeChange = routingResult?.routeChanges[0];

    const subject = actionRequired
      ? `URGENT: Shipment ${context.trackingId} Rerouted - Action Required`
      : `Shipment ${context.trackingId} Update`;

    const body = `
Operations Team,

Automated routing update for shipment ${context.trackingId}:

SUMMARY:
- Weather: ${summary?.weather || 'N/A'}
- Risk Assessment: ${summary?.risk || 'N/A'}
- Routing: ${summary?.routing || 'N/A'}

${
  routeChange
    ? `
ROUTE CHANGE:
- Old Route: ${routeChange.oldRouteNames.join(' → ')}
- New Route: ${routeChange.newRouteNames.join(' → ')}
- Reason: ${routeChange.reason}
- Hubs Removed: ${routeChange.routeDifference.hubsRemoved.length}
- Hubs Added: ${routeChange.routeDifference.hubsAdded.length}
`
    : ''
}

RISK FACTORS:
${riskResult?.riskScores.slice(0, 3).map((score) => `- ${score.hubName}: ${score.predictedRisk.toUpperCase()} (${(score.confidence * 100).toFixed(0)}% confidence)`).join('\n') || '- No significant risks'}

${
  actionRequired
    ? `
⚠️ ACTION REQUIRED:
- Monitor shipment progress closely
- Verify hub capacity at new route stops
- Prepare for potential delays
`
    : ''
}

System: OptiRoute AI Agent
Timestamp: ${new Date().toISOString()}
    `.trim();

    return {
      recipient: 'operations@optiroute.in',
      subject,
      body,
      severity,
      actionRequired,
      timestamp: new Date(),
    };
  }

  buildAuditLog(
    context: ShipmentContext,
    weatherResult?: WeatherAgentResult,
    riskResult?: RiskAgentResult,
    routingResult?: RoutingAgentResult,
    durationMs?: number
  ): CommunicationAgentResult['auditLog'] {
    return {
      agentName: 'communication',
      action: 'generate_messages',
      inputData: {
        shipmentId: context.shipmentId,
        trackingId: context.trackingId,
        weatherHubs: weatherResult?.hubsProcessed || 0,
        riskHubs: riskResult?.hubsProcessed || 0,
        routeChanges: routingResult?.summary.totalRerouted || 0,
      },
      outputData: {
        messagesGenerated: 2,
        severity: this.calculateSeverity(riskResult, routingResult),
        anomalyDetected: this.detectAnomalies(riskResult),
      },
      status: 'success',
      durationMs: durationMs || 0,
      shipmentId: context.shipmentId,
    };
  }

  private calculateSeverity(
    riskResult?: RiskAgentResult,
    routingResult?: RoutingAgentResult
  ): MessageSeverity {
    const highestRisk = riskResult?.overallRisk.highestRisk || 'low';
    const rerouted = routingResult?.summary.totalRerouted ?? 0;

    if (highestRisk === 'critical') {
      return 'critical';
    }

    if (highestRisk === 'high' || rerouted > 0) {
      return 'high';
    }

    if (highestRisk === 'medium') {
      return 'medium';
    }

    return 'low';
  }

  private detectAnomalies(riskResult?: RiskAgentResult): boolean {
    if (!riskResult) return false;

    const criticalCount = riskResult.overallRisk.criticalHubs.length;
    const highCount = riskResult.overallRisk.highRiskHubs.length;

    return criticalCount >= 2 || highCount >= 3;
  }

  private buildAnomalyDetails(
    riskResult?: RiskAgentResult
  ): CommunicationAgentResult['anomalyDetails'] {
    if (!riskResult) return undefined;

    const criticalHubs = riskResult.overallRisk.criticalHubs;
    const highRiskHubs = riskResult.overallRisk.highRiskHubs;

    let pattern = '';
    let severity = '';
    const affectedHubs = [...criticalHubs, ...highRiskHubs];

    if (criticalHubs.length >= 2) {
      pattern = 'Multiple hubs experiencing critical risk simultaneously';
      severity = 'critical';
    } else if (highRiskHubs.length >= 3) {
      pattern = 'Multiple hubs experiencing high risk simultaneously';
      severity = 'high';
    }

    return {
      pattern,
      affectedHubs,
      severity,
    };
  }

  private generateRecommendations(
    weatherResult?: WeatherAgentResult,
    riskResult?: RiskAgentResult,
    routingResult?: RoutingAgentResult,
    anomalyDetected?: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (anomalyDetected) {
      recommendations.push(
        'ALERT: Anomaly detected - multiple hubs affected. Escalate to operations manager.'
      );
    }

    if (riskResult && riskResult.overallRisk.criticalHubs.length > 0) {
      recommendations.push(
        'Critical risk hubs detected. Consider suspending new shipments to affected areas.'
      );
    }

    if (routingResult && routingResult.summary.totalRerouted > 0) {
      recommendations.push(
        'Route changes applied. Notify affected hubs of incoming shipment updates.'
      );
    }

    if (
      weatherResult &&
      weatherResult.impactAssessment.highestImpact === 'CRITICAL'
    ) {
      recommendations.push(
        'Severe weather conditions. Review all active shipments in affected regions.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('No immediate action required. Continue monitoring.');
    }

    return recommendations;
  }

  async generateResult(
    context: ShipmentContext,
    weatherResult?: WeatherAgentResult,
    riskResult?: RiskAgentResult,
    routingResult?: RoutingAgentResult
  ): Promise<CommunicationAgentResult> {
    return this.execute(
      context,
      {
        agent: 'communication',
        state: 'running',
        retryCount: 0,
        maxRetries: 3,
      },
      weatherResult,
      riskResult,
      routingResult
    );
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const communicationAgent = new CommunicationAgent();
