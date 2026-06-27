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
  list:         ()         => api.get<HubListResponse>('/hubs'),
  getById:      (id: number) => api.get<HubDetail>(`/hubs/${id}`),
};

export const shipmentsApi = {
  list:         (params?: ShipmentParams) => {
    const qs = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return api.get<ShipmentListResponse>(`/shipments${qs}`);
  },
  getById:      (id: number) => api.get<Shipment>(`/shipments/${id}`),
  create:       (body: CreateShipmentBody) => api.post<Shipment>('/shipments', body),
};

export const routingApi = {
  graphState:   () => api.get<GraphStateResponse>('/routing/graph-state'),
};

export const riskApi = {
  scores:       () => api.get<RiskScoreListResponse>('/risk/scores'),
  scoresByHub:  (hubId: number) => api.get<RiskScore>(`/risk/scores/${hubId}`),
};

export const alertsApi = {
  list:         (params?: AlertParams) => {
    const qs = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return api.get<AlertListResponse>(`/alerts${qs}`);
  },
  stats:        () => api.get<AlertStats>('/alerts/stats'),
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

export interface Hub {
  id: number;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  hub_type: string;
  manager_name: string;
  manager_email: string;
  is_active: boolean;
  risk_score?: RiskScore;
  weather_event?: WeatherEvent;
}

export interface HubListResponse { hubs: Hub[]; total: number; }

export interface HubDetail extends Hub {
  connected_routes: number;
  shipment_count: number;
}

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

export interface ShipmentListResponse { shipments: Shipment[]; total: number; }
export interface ShipmentParams { status?: string; priority?: string; }
export interface CreateShipmentBody {
  originHubId: number;
  destinationHubId: number;
  priority: string;
  weightKg: number;
}

export interface AlertParams { status?: string; channel?: string; }

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

export interface AlertListResponse { alerts: Alert[]; total: number; }
export interface AlertStats { total: number; sent: number; failed: number; today_count: number; }

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
  hub_id: number;
  weather_event_id: number | null;
  delay_probability: number;
  risk_level: string;
  shap_values: Record<string, number> | null;
  top_risk_factors: string[] | null;
  human_explanation: string | null;
  model_version: string;
  computed_at: string;
  valid_until: string | null;
}

export interface RiskScoreListResponse {
  scores: (RiskScore & { hub?: Hub })[];
  total: number;
}

export interface WeatherEvent {
  id: number;
  hub_id: number;
  condition: string;
  condition_code: number;
  temperature: number;
  feels_like: number;
  humidity: number;
  precipitation_mm: number;
  wind_speed_kmh: number;
  visibility_km: number;
  forecast_for: string;
  fetched_at: string;
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
