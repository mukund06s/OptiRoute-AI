/**
 * API Client — centralised fetch wrapper
 * Consumes backend REST APIs only. Zero business logic.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  // Allow callers to also cancel
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let data: unknown;
      try { data = await res.json(); } catch { /* ignore */ }
      throw new ApiError(
        res.status,
        res.statusText,
        `${method} ${path} → ${res.status} ${res.statusText}`,
        data,
      );
    }

    // 204 No Content
    if (res.status === 204) return undefined as T;

    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(408, 'Request Timeout', `Request timed out: ${method} ${path}`);
    }
    throw err;
  }
}

export const api = {
  get:    <T>(path: string, signal?: AbortSignal)                  => request<T>('GET',    path, undefined, signal),
  post:   <T>(path: string, body: unknown, signal?: AbortSignal)   => request<T>('POST',   path, body,      signal),
  put:    <T>(path: string, body: unknown, signal?: AbortSignal)   => request<T>('PUT',    path, body,      signal),
  patch:  <T>(path: string, body: unknown, signal?: AbortSignal)   => request<T>('PATCH',  path, body,      signal),
  delete: <T>(path: string, signal?: AbortSignal)                  => request<T>('DELETE', path, undefined, signal),
};

/* ------------------------------------------------------------------ */
/*  Typed API methods (consumed by React Query hooks)                  */
/* ------------------------------------------------------------------ */

export const hubsApi = {
  list: async () => {
    const res = await api.get<ApiDataResponse<Hub[]>>('/hubs');
    return { hubs: res.data, total: res.data.length };
  },
  getById: async (id: number) => {
    const res = await api.get<ApiDataResponse<HubDetail>>(`/hubs/${id}`);
    return res.data;
  },
};

export const shipmentsApi = {
  list: async (params?: ShipmentParams) => {
    const qs = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    const res = await api.get<ApiDataResponse<ShipmentListItem[]>>(`/shipments${qs}`);
    return { shipments: res.data, total: res.data.length };
  },
  getById: async (id: number) => {
    const res = await api.get<ApiDataResponse<ShipmentDetail>>(`/shipments/${id}`);
    return res.data;
  },
  create: async (body: CreateShipmentBody) => {
    const res = await api.post<ApiDataResponse<ShipmentListItem>>('/shipments', body);
    return res.data;
  },
  stats: async () => {
    const res = await api.get<ApiDataResponse<ShipmentStats>>('/shipments/stats');
    return res.data;
  },
};

export const routingApi = {
  graphState:   () => api.get<GraphStateResponse>('/routing/graph-state'),
};

export const riskApi = {
  scores: async () => {
    const res = await api.get<ApiDataResponse<RiskScore[]>>('/risk/scores');
    return { scores: res.data, total: res.data.length };
  },
  scoresByHub: async (hubId: number) => {
    const res = await api.get<ApiDataResponse<RiskScore>>(`/risk/scores/${hubId}`);
    return res.data;
  },
};

export const alertsApi = {
  list: async (params?: AlertParams) => {
    const qs = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    const res = await api.get<ApiDataResponse<AlertItem[]>>(`/alerts${qs}`);
    return { alerts: res.data, total: res.data.length };
  },
  byShipment: async (shipmentId: number) => {
    const res = await api.get<ApiDataResponse<AlertItem[]>>(`/alerts/shipment/${shipmentId}`);
    return { alerts: res.data, total: res.data.length };
  },
  stats: async () => {
    const res = await api.get<ApiDataResponse<AlertStats>>('/alerts/stats');
    return res.data;
  },
};

export const agentsApi = {
  status:       () => api.get<AgentStatus>('/agents/status'),
  logs:         () => api.get<AgentLog[]>('/agents/logs'),
  logsByCycle:  (cycleId: string) => api.get<AgentLog[]>(`/agents/logs/${cycleId}`),
  runCycle:     () => api.post<RunCycleResponse>('/agents/run-cycle', {}),
};

export const dashboardApi = {
  summary:      () => api.get<DashboardSummary>('/dashboard/summary'),
};

export const workflowApi = {
  execute:      (shipmentId: number) => api.post<WorkflowResult>('/workflow/execute', { shipmentId }),
  executeBatch: (shipmentIds: number[]) => api.post<BatchWorkflowResult>('/workflow/execute-batch', { shipmentIds }),
  status:       (workflowId: string) => api.get<WorkflowStatus>(`/workflow/status/${workflowId}`),
  history:      () => api.get<WorkflowHistory>('/workflow/history'),
};

/* ------------------------------------------------------------------ */
/*  Shared types                                                        */
/* ------------------------------------------------------------------ */

export interface ApiDataResponse<T> {
  data: T;
  message?: string;
}

export interface Hub {
  id: number;
  name: string;
  city: string;
  state: string | null;
  latitude: number | string;
  longitude: number | string;
  hubType: string;
  managerName: string | null;
  managerEmail: string | null;
  isActive: boolean;
  createdAt?: string;
  riskScore?: RiskScore;
  weatherEvent?: WeatherEvent;
}

export interface HubListResponse { hubs: Hub[]; total: number; }

export interface HubDetail extends Hub {
  originRoutes?: unknown[];
  destinationRoutes?: unknown[];
}

/** @deprecated Use ShipmentListItem — kept for map page compatibility */
export interface Shipment {
  id: number;
  tracking_id: string;
  origin_hub_id: number;
  destination_hub_id: number;
  current_hub_id: number | null;
  status: string;
  priority: string;
  weight_kg: number;
  planned_route: number[];
  active_route: number[];
  eta: string | null;
  created_at: string;
}

export interface ShipmentListItem {
  id: number;
  trackingId: string;
  originHubId: number;
  destinationHubId: number;
  currentHubId: number | null;
  status: string;
  priority: string;
  weightKg: number | string | null;
  plannedRoute: number[];
  activeRoute: number[];
  plannedRouteNames: string[] | null;
  activeRouteNames: string[] | null;
  eta: string | null;
  createdAt: string;
  updatedAt: string;
  originHub: Hub;
  destinationHub: Hub;
  currentHub?: Hub | null;
}

export interface ShipmentRouteChange {
  id: number;
  shipmentId: number;
  oldRoute: number[];
  newRoute: number[];
  oldRouteNames: string[] | null;
  newRouteNames: string[] | null;
  reason: string;
  riskLevelTriggered: string | null;
  triggeredByHubId: number | null;
  agentDecisionLog: string | null;
  webhookFired: boolean;
  createdAt: string;
}

export interface ShipmentAlert {
  id: number;
  routeChangeId: number | null;
  shipmentId: number | null;
  channel: string;
  recipient: string | null;
  subject: string | null;
  message: string;
  isAnomalyAlert: boolean;
  status: string;
  sentAt: string;
}

export interface ShipmentDetail extends ShipmentListItem {
  routeChanges: ShipmentRouteChange[];
  alerts: ShipmentAlert[];
}

export interface ShipmentListResponse { shipments: ShipmentListItem[]; total: number; }
export interface ShipmentParams { status?: string; priority?: string; }
export interface CreateShipmentBody {
  originHubId: number;
  destinationHubId: number;
  priority?: string;
  weightKg?: number;
}

export interface ShipmentStats {
  total: number;
  active: number;
  rerouted: number;
  delayed: number;
  delivered: number;
  at_risk: number;
}

export interface AlertParams { status?: string; channel?: string; }

export interface AlertAnomalyDetails {
  severity?: string;
  riskLevel?: string;
  agentName?: string;
  hubId?: number;
  hubName?: string;
  [key: string]: unknown;
}

export interface AlertRouteChangeRef {
  id?: number;
  riskLevelTriggered?: string | null;
  triggeredByHubId?: number | null;
  reason?: string;
  triggeredByHub?: Hub | null;
}

export interface AlertShipmentRef {
  id: number;
  trackingId?: string;
  tracking_id?: string;
  currentHubId?: number | null;
  currentHub?: Hub | null;
}

export interface AlertItem {
  id: number;
  routeChangeId: number | null;
  shipmentId: number | null;
  channel: string;
  recipient: string | null;
  subject: string | null;
  message: string;
  isAnomalyAlert: boolean;
  anomalyDetails: AlertAnomalyDetails | null;
  status: string;
  n8nExecutionId: string | null;
  sentAt: string;
  shipment?: AlertShipmentRef | null;
  routeChange?: AlertRouteChangeRef | null;
}

/** @deprecated Use AlertItem */
export interface Alert {
  id: number;
  route_change_id: number | null;
  shipment_id: number;
  channel: string;
  recipient: string | null;
  subject: string | null;
  message: string;
  is_anomaly_alert: boolean;
  anomaly_details: unknown | null;
  status: string;
  n8n_execution_id: string | null;
  sent_at: string;
}

export interface AlertListResponse { alerts: AlertItem[]; total: number; }
export interface AlertStats {
  total: number;
  sent: number;
  failed: number;
  today_count: number;
}

export interface AgentStatus {
  isRunning: boolean;
  lastRun: string | null;
  nextRun: string | null;
  health: string;
}

export interface AgentLog {
  id: number;
  agent_name: string;
  action: string;
  status: string;
  duration_ms: number | null;
  shipment_id: number | null;
  hub_id: number | null;
  created_at: string;
}

export interface RunCycleResponse { cycleId: string; status: string; }

export interface DashboardSummary {
  activeShipments: number;
  reroutedToday: number;
  atRiskHubs: number;
  alertsSentToday: number;
  recentRouteChanges: RouteChange[];
  criticalHubs: Hub[];
  agentLastRun: string | null;
}

export interface RouteChange {
  id: number;
  shipment_id: number;
  tracking_id: string;
  old_route: number[];
  new_route: number[];
  reason: string;
  created_at: string;
}

export interface GraphStateResponse {
  nodes: number;
  edges: number;
  hubs: { id: number; name: string }[];
}

export interface RiskScore {
  id: number;
  hubId: number;
  weatherEventId: number | null;
  delayProbability: number | string;
  riskLevel: string;
  shapValues: Record<string, number> | null;
  topRiskFactors: string[] | null;
  humanExplanation: string | null;
  modelVersion: string;
  computedAt: string;
  validUntil: string | null;
  /** Legacy snake_case aliases for map components */
  hub_id?: number;
  delay_probability?: number;
  risk_level?: string;
  shap_values?: Record<string, number> | null;
  top_risk_factors?: string[] | null;
  human_explanation?: string | null;
  computed_at?: string;
}

export interface RiskScoreListResponse {
  scores: RiskScore[];
  total: number;
}

export interface WeatherEvent {
  id: number;
  hubId: number;
  condition: string | null;
  conditionCode: number | null;
  temperature: number | string | null;
  feelsLike: number | string | null;
  humidity: number | null;
  precipitationMm: number | string | null;
  windSpeedKmh: number | string | null;
  visibilityKm: number | string | null;
  forecastFor: string;
  fetchedAt: string;
}

export interface WorkflowResult {
  success: boolean;
  workflowId: string;
  cycleId: string;
  overallStatus: string;
  executionTimeMs: number;
}

export interface BatchWorkflowResult {
  total: number;
  completed: number;
  failed: number;
  results: WorkflowResult[];
}

export interface WorkflowStatus {
  workflowId: string;
  state: string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
}

export interface WorkflowHistory {
  total: number;
  workflows: WorkflowStatus[];
}
