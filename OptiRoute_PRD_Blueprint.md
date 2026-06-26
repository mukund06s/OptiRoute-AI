# OptiRoute — Full PRD & Implementation Blueprint
### AI-Powered Multi-Agent Dynamic Logistics & Supply Chain Resilience System

> **Purpose of this document:** This is the single source of truth for the entire OptiRoute system. Give this file to Cursor at the start of every phase. Every architectural decision, every table, every agent, every API endpoint, every UI screen is documented here. Nothing is left to assumption.

---

## TABLE OF CONTENTS

1. Product Overview
2. Problem Statement
3. System Architecture (High-Level)
4. Tech Stack (with exact versions)
5. Complete Database Schema
6. Multi-Agent System Design (LangGraph)
7. ML Risk Service Design
8. Graph Routing Engine Design
9. Automation Layer Design (n8n)
10. Backend API Specification (all endpoints)
11. Frontend UI Specification (all screens)
12. SHAP Explainability Layer
13. Folder Structure (complete monorepo)
14. Environment Variables (all)
15. Data Flow (end-to-end walkthrough)
16. Phase-wise Build Order

---

## 1. PRODUCT OVERVIEW

**Name:** OptiRoute
**Tagline:** Predict. Reroute. Deliver.
**Type:** Full-stack AI-powered logistics intelligence platform
**Target User:** Warehouse managers, logistics ops teams, supply chain engineers at e-commerce companies
**Core Value:** Shifts logistics operations from reactive firefighting → proactive, autonomous AI-driven resilience

---

## 2. PROBLEM STATEMENT

In modern e-commerce logistics, long-haul shipments spanning multiple cities (e.g., Delhi → Gwalior → Bhopal → Indore, 12–48 hour transit) frequently suffer from cascading delays caused by severe weather, traffic bottlenecks, and sudden route blockages. Current systems are entirely **reactive** — disruptions are detected only after timelines are already derailed, leading to operational losses, missed SLAs, and poor customer satisfaction.

**OptiRoute** solves this by building a **proactive, multi-agent AI system** where four specialized LangGraph agents — Weather, Risk, Routing, and Communication — autonomously collaborate under a Supervisor Agent to monitor, predict, and respond to disruptions without any human intervention.

The system continuously ingests real-time weather data (OpenWeather API) and feeds it into a trained **Random Forest / XGBoost model** to predict delay probabilities at specific transit hubs. These risk scores dynamically adjust edge weights in a **custom Dijkstra/A\* graph algorithm** that treats the supply chain as a directed weighted graph — automatically recalculating optimal routes when risk crosses critical thresholds.

When a reroute is triggered, instead of sending a generic template alert, an **LLM-powered Communication Agent** analyzes historical disruption patterns, detects anomalies (e.g., multiple hubs failing simultaneously), and generates **context-aware, actionable alerts** for warehouse managers — delivered via an n8n automation pipeline.

Every AI-generated risk decision is backed by **SHAP-based explainability** — so operations managers don't blindly trust the system but can audit exactly which weather and traffic factors drove each prediction.

The entire system is visualized through a **React/Next.js operations dashboard** with a live Leaflet map showing real-time shipment positions, color-coded risk zones, and dynamically adjusted routes.

---

## 3. SYSTEM ARCHITECTURE (HIGH-LEVEL)

```
┌─────────────────────────────────────────────────────────────────┐
│                     OPTIROUTE SYSTEM                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              MULTI-AGENT LAYER (LangGraph)               │   │
│  │                                                          │   │
│  │   ┌─────────────┐        ┌──────────────────────────┐   │   │
│  │   │  SUPERVISOR │◄──────►│     WEATHER AGENT        │   │   │
│  │   │    AGENT    │        │  (OpenWeather API)       │   │   │
│  │   └──────┬──────┘        └──────────────────────────┘   │   │
│  │          │                                               │   │
│  │   ┌──────▼──────┐        ┌──────────────────────────┐   │   │
│  │   │    RISK     │◄──────►│   ML MODEL (RF/XGBoost)  │   │   │
│  │   │    AGENT    │        │   + SHAP Explainability  │   │   │
│  │   └──────┬──────┘        └──────────────────────────┘   │   │
│  │          │                                               │   │
│  │   ┌──────▼──────┐        ┌──────────────────────────┐   │   │
│  │   │  ROUTING    │◄──────►│  Custom Dijkstra/A*      │   │   │
│  │   │   AGENT     │        │  Graph Engine            │   │   │
│  │   └──────┬──────┘        └──────────────────────────┘   │   │
│  │          │                                               │   │
│  │   ┌──────▼──────┐        ┌──────────────────────────┐   │   │
│  │   │ COMM AGENT  │◄──────►│  LLM (Claude/GPT-4o)    │   │   │
│  │   │             │        │  Anomaly Detection       │   │   │
│  │   └─────────────┘        └──────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                  │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│   ┌─────────────────┐ ┌───────────┐ ┌──────────────────┐       │
│   │   PostgreSQL DB  │ │ n8n Auto  │ │  Python FastAPI  │       │
│   │  (Prisma ORM)   │ │ (Webhooks)│ │  ML Microservice │       │
│   └─────────────────┘ └───────────┘ └──────────────────┘       │
│                              │                                  │
│                    ┌─────────▼──────────┐                       │
│                    │  Node.js/Express   │                       │
│                    │  TypeScript API    │                       │
│                    └─────────┬──────────┘                       │
│                              │                                  │
│                    ┌─────────▼──────────┐                       │
│                    │  Next.js Dashboard │                       │
│                    │  + Leaflet Map     │                       │
│                    └────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. TECH STACK (EXACT VERSIONS)

### Backend
| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20.x LTS | Runtime |
| TypeScript | 5.x | Type safety |
| Express | 4.x | HTTP server |
| Prisma | 5.x | ORM + migrations |
| PostgreSQL | 15.x | Primary database |
| node-cron | 3.x | Scheduled jobs |
| zod | 3.x | Request validation |
| axios | 1.x | HTTP client |
| langchain | 0.3.x | LangGraph agents |
| @langchain/langgraph | 0.2.x | Multi-agent orchestration |
| @langchain/anthropic | 0.3.x | LLM integration |

### ML Microservice (Python)
| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11.x | Runtime |
| FastAPI | 0.111.x | API server |
| scikit-learn | 1.5.x | ML models |
| pandas | 2.x | Data processing |
| numpy | 1.26.x | Numerical ops |
| shap | 0.45.x | Explainability |
| joblib | 1.4.x | Model serialization |
| httpx | 0.27.x | Async HTTP client |
| uvicorn | 0.30.x | ASGI server |

### Frontend
| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 14.x (App Router) | Framework |
| React | 18.x | UI library |
| Tailwind CSS | 3.x | Styling |
| Leaflet + react-leaflet | 1.9.x | Interactive map |
| TanStack Query | 5.x | Data fetching/caching |
| Recharts | 2.x | Charts/graphs |
| Lucide React | 0.400.x | Icons |
| date-fns | 3.x | Date formatting |

### Infrastructure
| Tool | Purpose |
|------|---------|
| Docker + docker-compose | Local dev environment |
| n8n | Webhook-triggered automation |

---

## 5. COMPLETE DATABASE SCHEMA

```sql
-- ============================================================
-- TABLE 1: HUBS (Nodes in the supply chain graph)
-- ============================================================
CREATE TABLE hubs (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,          -- "Delhi Warehouse Central"
    city            VARCHAR(100) NOT NULL,          -- "Delhi"
    state           VARCHAR(100),                  -- "Delhi"
    latitude        DECIMAL(9,6) NOT NULL,
    longitude       DECIMAL(9,6) NOT NULL,
    hub_type        VARCHAR(20) NOT NULL
                    CHECK (hub_type IN ('warehouse', 'transit', 'delivery')),
    manager_name    VARCHAR(100),
    manager_email   VARCHAR(255),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE 2: ROUTES (Edges in the supply chain graph)
-- ============================================================
CREATE TABLE routes (
    id                      SERIAL PRIMARY KEY,
    origin_hub_id           INTEGER NOT NULL REFERENCES hubs(id),
    destination_hub_id      INTEGER NOT NULL REFERENCES hubs(id),
    base_distance_km        DECIMAL(8,2) NOT NULL,
    base_duration_minutes   INTEGER NOT NULL,
    road_type               VARCHAR(20)
                            CHECK (road_type IN ('highway', 'state_road', 'city_road')),
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP DEFAULT NOW(),
    CONSTRAINT no_self_loop CHECK (origin_hub_id != destination_hub_id)
);

-- ============================================================
-- TABLE 3: WEATHER_EVENTS (Raw data per hub from OpenWeather)
-- ============================================================
CREATE TABLE weather_events (
    id                  SERIAL PRIMARY KEY,
    hub_id              INTEGER NOT NULL REFERENCES hubs(id),
    condition           VARCHAR(50),               -- "Rain", "Clear", "Thunderstorm"
    condition_code      INTEGER,                   -- OpenWeather condition code
    temperature         DECIMAL(5,2),              -- Celsius
    feels_like          DECIMAL(5,2),
    humidity            INTEGER,                   -- percentage
    precipitation_mm    DECIMAL(6,2) DEFAULT 0,
    wind_speed_kmh      DECIMAL(6,2),
    visibility_km       DECIMAL(6,2),
    forecast_for        TIMESTAMP NOT NULL,        -- which time window this is for
    fetched_at          TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE 4: RISK_SCORES (ML model output per hub)
-- ============================================================
CREATE TABLE risk_scores (
    id                  SERIAL PRIMARY KEY,
    hub_id              INTEGER NOT NULL REFERENCES hubs(id),
    weather_event_id    INTEGER REFERENCES weather_events(id),
    delay_probability   DECIMAL(5,4) NOT NULL,     -- 0.0000 to 1.0000
    risk_level          VARCHAR(20) NOT NULL
                        CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    -- SHAP explanation stored as JSON
    shap_values         JSONB,
    -- e.g. {"precipitation_mm": 0.42, "wind_speed_kmh": 0.28, "condition_code": 0.18, "humidity": 0.12}
    top_risk_factors    JSONB,
    -- e.g. ["Heavy precipitation (3x normal)", "Wind above 60kmh threshold"]
    human_explanation   TEXT,
    -- e.g. "85% delay risk at Bhopal — primary driver is heavy rainfall (42% contribution)"
    model_version       VARCHAR(20) DEFAULT 'v1.0',
    computed_at         TIMESTAMP DEFAULT NOW(),
    valid_until         TIMESTAMP
);

-- ============================================================
-- TABLE 5: SHIPMENTS
-- ============================================================
CREATE TABLE shipments (
    id                      SERIAL PRIMARY KEY,
    tracking_id             VARCHAR(50) UNIQUE NOT NULL,  -- "OPT-A1B2C3"
    origin_hub_id           INTEGER NOT NULL REFERENCES hubs(id),
    destination_hub_id      INTEGER NOT NULL REFERENCES hubs(id),
    current_hub_id          INTEGER REFERENCES hubs(id),
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'in_transit', 'rerouted', 'delayed', 'delivered', 'at_risk')),
    -- planned_route: original route as array of hub_ids e.g. [1, 3, 5, 7]
    planned_route           JSONB NOT NULL,
    -- active_route: current route (may differ after rerouting)
    active_route            JSONB NOT NULL,
    -- route_hub_names stored for display without joins
    planned_route_names     JSONB,               -- ["Delhi", "Gwalior", "Bhopal", "Indore"]
    active_route_names      JSONB,
    priority                VARCHAR(10) DEFAULT 'standard'
                            CHECK (priority IN ('standard', 'express', 'critical')),
    weight_kg               DECIMAL(8,2),
    eta                     TIMESTAMP,
    actual_delivery         TIMESTAMP,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE 6: ROUTE_CHANGES (Audit log — triggers automation)
-- ============================================================
CREATE TABLE route_changes (
    id                          SERIAL PRIMARY KEY,
    shipment_id                 INTEGER NOT NULL REFERENCES shipments(id),
    old_route                   JSONB NOT NULL,   -- array of hub_ids
    new_route                   JSONB NOT NULL,
    old_route_names             JSONB,
    new_route_names             JSONB,
    reason                      TEXT NOT NULL,
    -- e.g. "High delay risk (85%) detected at Bhopal hub due to heavy rainfall.
    --       Rerouting via Agra to avoid disruption."
    risk_level_triggered        VARCHAR(20),      -- "high" / "critical"
    triggered_by_hub_id         INTEGER REFERENCES hubs(id),
    triggered_by_risk_score_id  INTEGER REFERENCES risk_scores(id),
    agent_decision_log          TEXT,             -- What the supervisor agent decided and why
    webhook_fired               BOOLEAN DEFAULT FALSE,
    webhook_fired_at            TIMESTAMP,
    created_at                  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE 7: ALERTS (Log of all notifications sent)
-- ============================================================
CREATE TABLE alerts (
    id                  SERIAL PRIMARY KEY,
    route_change_id     INTEGER REFERENCES route_changes(id),
    shipment_id         INTEGER REFERENCES shipments(id),
    channel             VARCHAR(20) NOT NULL
                        CHECK (channel IN ('slack', 'email', 'sms', 'webhook')),
    recipient           VARCHAR(255),
    subject             VARCHAR(500),
    message             TEXT NOT NULL,            -- LLM-generated alert message
    is_anomaly_alert    BOOLEAN DEFAULT FALSE,    -- TRUE if multi-hub anomaly detected
    anomaly_details     JSONB,                    -- details of what anomaly was detected
    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('sent', 'failed', 'pending')),
    n8n_execution_id    VARCHAR(100),             -- for tracking n8n workflow runs
    sent_at             TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE 8: USERS (Warehouse managers / ops team)
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'viewer'
                    CHECK (role IN ('admin', 'warehouse_manager', 'viewer')),
    assigned_hub_id INTEGER REFERENCES hubs(id),
    phone           VARCHAR(20),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE 9: AGENT_LOGS (Audit trail of all agent decisions)
-- ============================================================
CREATE TABLE agent_logs (
    id              SERIAL PRIMARY KEY,
    agent_name      VARCHAR(50) NOT NULL,
    -- "supervisor" | "weather" | "risk" | "routing" | "communication"
    action          VARCHAR(100) NOT NULL,
    input_data      JSONB,
    output_data     JSONB,
    duration_ms     INTEGER,
    status          VARCHAR(20) CHECK (status IN ('success', 'error', 'skipped')),
    error_message   TEXT,
    shipment_id     INTEGER REFERENCES shipments(id),
    hub_id          INTEGER REFERENCES hubs(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES (for performance on frequent queries)
-- ============================================================
CREATE INDEX idx_risk_scores_hub_id ON risk_scores(hub_id);
CREATE INDEX idx_risk_scores_computed_at ON risk_scores(computed_at DESC);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_id);
CREATE INDEX idx_weather_events_hub_id ON weather_events(hub_id);
CREATE INDEX idx_route_changes_shipment ON route_changes(shipment_id);
CREATE INDEX idx_agent_logs_created ON agent_logs(created_at DESC);
```

### Seed Data (8 Real Indian Hubs + 12 Routes)

```typescript
// Hubs seed data
const HUBS_SEED = [
  { name: "Delhi Warehouse Central", city: "Delhi", state: "Delhi",
    latitude: 28.6139, longitude: 77.2090, hub_type: "warehouse",
    manager_name: "Rajesh Kumar", manager_email: "rajesh@optiroute.in" },
  { name: "Agra Transit Hub", city: "Agra", state: "Uttar Pradesh",
    latitude: 27.1767, longitude: 78.0081, hub_type: "transit",
    manager_name: "Priya Singh", manager_email: "priya@optiroute.in" },
  { name: "Gwalior Transit Hub", city: "Gwalior", state: "Madhya Pradesh",
    latitude: 26.2183, longitude: 78.1828, hub_type: "transit",
    manager_name: "Amit Sharma", manager_email: "amit@optiroute.in" },
  { name: "Jhansi Hub", city: "Jhansi", state: "Uttar Pradesh",
    latitude: 25.4484, longitude: 78.5685, hub_type: "transit",
    manager_name: "Sunita Verma", manager_email: "sunita@optiroute.in" },
  { name: "Bhopal Central Hub", city: "Bhopal", state: "Madhya Pradesh",
    latitude: 23.2599, longitude: 77.4126, hub_type: "transit",
    manager_name: "Vikram Patel", manager_email: "vikram@optiroute.in" },
  { name: "Jaipur Warehouse", city: "Jaipur", state: "Rajasthan",
    latitude: 26.9124, longitude: 75.7873, hub_type: "warehouse",
    manager_name: "Kavita Joshi", manager_email: "kavita@optiroute.in" },
  { name: "Kota Transit Hub", city: "Kota", state: "Rajasthan",
    latitude: 25.2138, longitude: 75.8648, hub_type: "transit",
    manager_name: "Ravi Meena", manager_email: "ravi@optiroute.in" },
  { name: "Indore Delivery Hub", city: "Indore", state: "Madhya Pradesh",
    latitude: 22.7196, longitude: 75.8577, hub_type: "delivery",
    manager_name: "Deepak Yadav", manager_email: "deepak@optiroute.in" },
];

// Routes seed: Delhi→Agra→Gwalior→Bhopal→Indore (main corridor)
// + alternate routes via Jaipur→Kota→Indore
// All distances and durations are real approximate values
const ROUTES_SEED = [
  { origin: "Delhi", dest: "Agra", distance_km: 233, duration_min: 195, road: "highway" },
  { origin: "Agra", dest: "Gwalior", distance_km: 119, duration_min: 105, road: "highway" },
  { origin: "Gwalior", dest: "Jhansi", distance_km: 102, duration_min: 90, road: "highway" },
  { origin: "Jhansi", dest: "Bhopal", distance_km: 308, duration_min: 270, road: "highway" },
  { origin: "Bhopal", dest: "Indore", distance_km: 195, duration_min: 180, road: "highway" },
  // Alternate via Jaipur corridor
  { origin: "Delhi", dest: "Jaipur", distance_km: 281, duration_min: 240, road: "highway" },
  { origin: "Jaipur", dest: "Kota", distance_km: 247, duration_min: 210, road: "highway" },
  { origin: "Kota", dest: "Indore", distance_km: 289, duration_min: 255, road: "state_road" },
  // Cross connections
  { origin: "Agra", dest: "Jaipur", distance_km: 238, duration_min: 210, road: "highway" },
  { origin: "Gwalior", dest: "Bhopal", distance_km: 423, duration_min: 360, road: "highway" },
  { origin: "Jaipur", dest: "Bhopal", distance_km: 564, duration_min: 480, road: "state_road" },
  { origin: "Kota", dest: "Bhopal", distance_km: 385, duration_min: 330, road: "highway" },
];
```

---

## 6. MULTI-AGENT SYSTEM DESIGN (LangGraph)

### Architecture Overview

```
SupervisorAgent
│
├── WeatherAgent    → fetches + stores weather data per hub
├── RiskAgent       → runs ML predictions, gets SHAP values
├── RoutingAgent    → recalculates optimal routes via graph engine
└── CommunicationAgent → generates LLM alerts, detects anomalies
```

### Agent Definitions

#### Supervisor Agent
- **Role:** Orchestrates the full pipeline every 15 minutes (or on-demand trigger)
- **Decision Logic:**
  1. Trigger WeatherAgent for all active hubs
  2. Pass weather results to RiskAgent
  3. If any hub is "high" or "critical" → trigger RoutingAgent for affected shipments
  4. If RoutingAgent changes a route → trigger CommunicationAgent
  5. Log every decision in agent_logs table
- **LangGraph State:**
```typescript
interface AgentState {
  hubsToCheck: number[];            // hub IDs
  weatherResults: WeatherResult[];
  riskResults: RiskResult[];
  affectedShipments: number[];      // shipment IDs with high-risk hubs on route
  routeChanges: RouteChange[];
  alertsSent: Alert[];
  cycleId: string;                  // unique ID per orchestration run
  errors: AgentError[];
}
```

#### Weather Agent
- **Tools available:**
  - `fetchWeatherForHub(hubId)` → calls OpenWeather API with hub lat/long
  - `storeWeatherEvent(hubId, weatherData)` → saves to weather_events table
- **Output:** Array of WeatherResult per hub

#### Risk Agent
- **Tools available:**
  - `callMLService(hubId, weatherData)` → POST to Python FastAPI /predict-risk
  - `storeRiskScore(hubId, riskResult)` → saves to risk_scores table
  - `getSHAPExplanation(hubId)` → GET from Python FastAPI /explain/:hubId
- **Output:** Array of RiskResult with delay_probability, risk_level, shap_values, human_explanation

#### Routing Agent
- **Tools available:**
  - `getActiveShipmentsOnHub(hubId)` → finds all in-transit shipments whose active_route includes this hub
  - `recalculateRoute(shipmentId, currentHubId, destinationHubId)` → runs Dijkstra/A* with current risk weights
  - `updateShipmentRoute(shipmentId, newRoute, reason)` → updates shipments + creates route_changes record
- **Output:** Array of RouteChange objects

#### Communication Agent
- **Tools available:**
  - `detectAnomalies(riskResults)` → checks if multiple hubs simultaneously critical (anomaly pattern)
  - `generateAlert(routeChange, anomalyData)` → calls LLM (Claude/GPT-4o) with structured prompt to generate human-readable alert
  - `fireWebhook(routeChangeId, alertPayload)` → POST to n8n webhook URL
  - `storeAlert(alertData)` → saves to alerts table
- **LLM Prompt Template for Alert Generation:**
```
You are an expert logistics operations assistant for OptiRoute.
A shipment has been automatically rerouted due to AI-detected risk.

Shipment: {tracking_id}
Original Route: {old_route_names}
New Route: {new_route_names}
Risk Reason: {human_explanation_from_shap}
Risk Level: {risk_level} ({delay_probability}% delay probability)
Anomaly Detected: {is_anomaly} — {anomaly_details if any}

Generate a concise, professional alert message for the warehouse manager at {hub_city}.
Include: what happened, why (in plain English), what action they should take.
Keep it under 150 words. Use a slightly urgent but calm tone.
Do NOT use technical jargon like "SHAP values" or "Dijkstra".
```

### LangGraph Flow (State Machine)

```
START
  │
  ▼
[weather_node] → fetches weather for all active hubs
  │
  ▼
[risk_node] → runs ML + SHAP for each hub
  │
  ├── No high/critical risk? → [log_node] → END (no action needed)
  │
  └── High/critical risk detected?
        │
        ▼
      [routing_node] → finds affected shipments, recalculates routes
        │
        ├── No route changes? → [log_node] → END
        │
        └── Routes changed?
              │
              ▼
            [communication_node] → anomaly check → LLM alert → webhook → store
              │
              ▼
            [log_node] → audit trail in agent_logs
              │
              ▼
            END
```

---

## 7. ML RISK SERVICE DESIGN (Python FastAPI)

### File: `/ml-service/`

```
ml-service/
├── main.py                    # FastAPI app
├── models/
│   └── delay_predictor.pkl    # Trained model (generated by train_model.py)
├── training/
│   ├── train_model.py         # Training script
│   └── synthetic_data.py      # Generates training dataset
├── schemas/
│   └── prediction.py          # Pydantic request/response schemas
├── services/
│   ├── predictor.py           # Prediction logic
│   └── explainer.py           # SHAP explanation logic
└── requirements.txt
```

### Training Dataset Schema (Synthetic)

```python
# Columns in training CSV:
# hub_id, weather_condition, precipitation_mm, wind_speed_kmh,
# temperature, humidity, visibility_km, hour_of_day,
# day_of_week, historical_avg_delay_this_route,
# is_monsoon_month, delay_occurred (TARGET: 0 or 1)

# Generate 2000 rows with realistic distributions:
# - 60% no delay (clear weather, normal conditions)
# - 40% delay (heavy rain, high wind, low visibility, night hours)
```

### API Endpoints

```
GET  /health
     → { status: "ok", model_version: "v1.0", model_loaded: true }

POST /predict-risk
     Body: {
       hub_id: int,
       precipitation_mm: float,
       wind_speed_kmh: float,
       temperature: float,
       humidity: int,
       visibility_km: float,
       condition_code: int,
       hour_of_day: int,
       is_monsoon_month: bool
     }
     Response: {
       hub_id: int,
       delay_probability: float,     # 0.0 to 1.0
       risk_level: str,              # low/medium/high/critical
       shap_values: dict,            # feature: shap_value pairs
       top_risk_factors: list[str],  # human readable top 3 factors
       human_explanation: str        # 1 sentence plain English
     }

GET  /explain/:hub_id
     → Returns last computed SHAP explanation for this hub

POST /batch-predict
     Body: { hubs: [{ hub_id, ...weather_data }] }
     → Batch prediction for all hubs in one call
```

### Risk Level Thresholds
```python
RISK_LEVELS = {
    "low":      (0.0,  0.30),   # < 30% delay probability
    "medium":   (0.30, 0.60),   # 30-60%
    "high":     (0.60, 0.85),   # 60-85%
    "critical": (0.85, 1.0),    # > 85%
}
```

### SHAP Implementation
```python
# After training RandomForestClassifier:
import shap

explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_input)

# Return feature contributions as dict:
feature_contributions = dict(zip(feature_names, shap_values[1][0]))
# e.g. {"precipitation_mm": 0.42, "wind_speed_kmh": 0.28, "humidity": 0.12}

# Top 3 factors (most positive SHAP = most delay-causing):
top_factors = sorted(feature_contributions.items(), key=lambda x: -x[1])[:3]
```

---

## 8. GRAPH ROUTING ENGINE DESIGN (Node.js)

### File: `/backend/src/services/routing/`

```
routing/
├── graphBuilder.ts       # Builds adjacency list from DB
├── dijkstra.ts           # Custom Dijkstra implementation
├── weightCalculator.ts   # Dynamic edge weight formula
└── rerouteService.ts     # Checks shipments, triggers reroutes
```

### Graph Structure
```typescript
// Adjacency list representation
type Graph = Map<number, Edge[]>;  // hubId → list of outgoing edges

interface Edge {
  destinationHubId: number;
  baseDistanceKm: number;
  baseDurationMinutes: number;
  routeId: number;
}

interface WeightedEdge extends Edge {
  compositeWeight: number;
  riskPenalty: number;
  destinationRiskLevel: string;
}
```

### Dynamic Weight Formula
```typescript
function calculateEdgeWeight(
  edge: Edge,
  destinationRiskScore: RiskScore | null
): number {
  const DISTANCE_FACTOR = 1.0;
  const TIME_FACTOR = 0.5;

  // Risk penalty multipliers
  const RISK_MULTIPLIERS = {
    low:      1.0,   // no penalty
    medium:   1.5,   // 50% heavier
    high:     3.0,   // 3x heavier
    critical: 10.0,  // effectively blocked
  };

  const baseWeight = (edge.baseDistanceKm * DISTANCE_FACTOR) +
                     (edge.baseDurationMinutes * TIME_FACTOR);

  const riskLevel = destinationRiskScore?.risk_level ?? 'low';
  const multiplier = RISK_MULTIPLIERS[riskLevel];

  return baseWeight * multiplier;
}
```

### Custom Dijkstra
```typescript
// IMPORTANT: Must be custom implementation, no library shortcut
// Uses MinHeap/PriorityQueue for O(E log V) performance

function dijkstra(
  graph: Graph,
  riskScores: Map<number, RiskScore>,  // hubId → latest risk score
  startHubId: number,
  endHubId: number
): DijkstraResult {
  // Returns:
  // {
  //   path: number[],           // array of hub IDs
  //   totalWeight: number,
  //   totalDistanceKm: number,
  //   totalDurationMinutes: number,
  //   riskFlags: { hubId: number, riskLevel: string }[]
  // }
}
```

### Reroute Logic
```typescript
async function checkAndRerouteShipment(shipmentId: number): Promise<RouteChange | null> {
  // 1. Get shipment with active_route
  // 2. Get current_hub_id (where shipment currently is)
  // 3. Rebuild graph with latest risk scores
  // 4. Run Dijkstra from current_hub to destination
  // 5. Compare new path to existing active_route
  // 6. If significantly different (different hubs, not just weights):
  //    a. Update shipments.active_route + active_route_names
  //    b. Update shipments.status = 'rerouted'
  //    c. Insert into route_changes with reason, triggered_by fields
  //    d. Return route_change record
  // 7. Else: return null (no change needed)
}
```

---

## 9. AUTOMATION LAYER (n8n + Webhooks)

### Webhook Payload (Node.js → n8n)
```json
{
  "event": "SHIPMENT_REROUTED",
  "timestamp": "2024-08-15T14:30:00Z",
  "cycleId": "cycle-uuid-here",
  "shipment": {
    "id": 42,
    "trackingId": "OPT-A1B2C3",
    "priority": "express"
  },
  "reroute": {
    "oldRoute": ["Delhi", "Gwalior", "Bhopal", "Indore"],
    "newRoute": ["Delhi", "Agra", "Jaipur", "Kota", "Indore"],
    "reason": "High delay risk (85%) at Bhopal due to heavy rainfall",
    "riskLevel": "high",
    "triggeredByHub": "Bhopal"
  },
  "alert": {
    "message": "LLM-generated alert text here...",
    "isAnomaly": false,
    "recipientEmail": "vikram@optiroute.in",
    "recipientName": "Vikram Patel"
  }
}
```

### n8n Workflow Nodes
```
1. Webhook Trigger         → receives POST from Node.js backend
2. Set Node                → extract/format fields from payload
3. IF Node                 → check if isAnomaly = true
   ├── TRUE  → HTTP Request (high-priority Slack/email)
   └── FALSE → HTTP Request (standard alert)
4. HTTP Request Node       → POST to mock Slack webhook (webhook.site)
5. HTTP Request Node       → POST to mock email service
6. HTTP Request Node       → callback to Node.js /api/alerts/:id/confirm
                             to update alerts.status = 'sent'
```

### Webhook.site Mock (for demo without real Slack)
- Use https://webhook.site as free mock endpoint
- Store generated unique URL in N8N_MOCK_WEBHOOK_URL env var
- n8n sends formatted message there for demo purposes

---

## 10. BACKEND API SPECIFICATION

### Base URL: `http://localhost:5000/api`

#### HUBS
```
GET    /hubs                    → List all hubs (with latest risk_score joined)
GET    /hubs/:id                → Hub detail + connected routes + latest weather + risk
POST   /hubs                    → Create hub
PUT    /hubs/:id                → Update hub
DELETE /hubs/:id                → Soft delete (set is_active = false)
```

#### ROUTES (Graph Edges)
```
GET    /routes                  → All routes with origin/dest hub names
POST   /routes                  → Create route
GET    /routes/hub/:hubId       → All routes connected to a hub (both directions)
```

#### SHIPMENTS
```
GET    /shipments               → List (supports ?status=&priority= filters)
GET    /shipments/:id           → Full detail: route_changes history, alerts
POST   /shipments               → Create new shipment
                                  Body: { originHubId, destinationHubId, priority, weightKg }
                                  Auto: generate tracking_id, run initial Dijkstra for planned_route
PATCH  /shipments/:id/status    → Update status
PATCH  /shipments/:id/hub       → Update current_hub_id (simulate shipment moving)
GET    /shipments/stats         → { total, active, rerouted, delayed, delivered, at_risk }
```

#### ROUTING ENGINE
```
POST   /routing/calculate       → Ad-hoc route calculation
                                  Body: { originHubId, destinationHubId }
                                  Returns: { path: [hubIds], pathNames, totalDistanceKm, totalDurationMinutes, riskFlags }
POST   /routing/reroute/:shipmentId → Manually trigger reroute check for one shipment
POST   /routing/reroute-all    → Trigger reroute check for ALL active shipments
GET    /routing/graph-state     → Returns current graph with all edge weights (for visualization)
```

#### RISK & ML
```
POST   /risk/refresh            → Triggers full pipeline: weather fetch → ML predict → reroute check
GET    /risk/scores             → All latest risk scores per hub
GET    /risk/scores/:hubId      → Latest risk score for specific hub with SHAP explanation
GET    /risk/history/:hubId     → Historical risk scores for a hub (last 24h)
```

#### AGENT OPERATIONS
```
POST   /agents/run-cycle        → Manually trigger full LangGraph agent cycle
GET    /agents/logs             → Recent agent_logs (last 50)
GET    /agents/logs/:cycleId    → All logs for a specific cycle
GET    /agents/status           → Current agent system status (last run, next run, errors)
```

#### ALERTS
```
GET    /alerts                  → All alerts (supports ?status=&channel= filters)
GET    /alerts/shipment/:shipmentId → All alerts for a shipment
GET    /alerts/stats            → { total, sent, failed, today_count }
```

#### ROUTE CHANGES
```
GET    /route-changes           → Recent route changes (last 20)
GET    /route-changes/:shipmentId → All route changes for a shipment
```

#### DASHBOARD STATS
```
GET    /dashboard/summary       → All stats needed for dashboard home page in one call
                                  Returns: {
                                    activeShipments, reroutedToday, atRiskHubs,
                                    alertsSentToday, recentRouteChanges[],
                                    criticalHubs[], agentLastRun
                                  }
```

---

## 11. FRONTEND UI SPECIFICATION

### Design Direction
- **Theme:** Dark ops-center aesthetic — dark navy/slate background (#0F172A base), electric blue accents (#3B82F6), warning amber (#F59E0B), critical red (#EF4444)
- **Font:** Inter for UI, JetBrains Mono for tracking IDs / data values
- **Feel:** Think mission control room, not e-commerce dashboard — serious, data-dense, professional

### Pages & Components

#### Page 1: Dashboard (/)
```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR    │           MAIN CONTENT                        │
│  • Dashboard│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  • Map      │  │Active  │ │Rerouted│ │At Risk │ │Alerts  │ │
│  • Shipments│  │Shipmt  │ │Today   │ │Hubs    │ │Sent    │ │
│  • Alerts   │  │  24    │ │  3     │ │  2     │ │  7     │ │
│  • Agents   │  └────────┘ └────────┘ └────────┘ └────────┘ │
│             │                                               │
│  [status]   │  RECENT ROUTE CHANGES (last 10)             │
│  ● Online   │  ┌───────────────────────────────────────┐  │
│             │  │ OPT-A1B2C3 | Bhopal risk 85% | 2m ago│  │
│             │  │ OPT-X9Y8Z7 | Gwalior risk 72% | 8m   │  │
│             │  └───────────────────────────────────────┘  │
│             │                                               │
│             │  AGENT STATUS                                 │
│             │  Last run: 2 min ago | Next: 13 min | ✅ OK  │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- `StatCard` — metric with icon, value, trend indicator
- `RouteChangeRow` — tracking ID, old→new route, reason badge, timestamp
- `AgentStatusBar` — last run, next run, status indicator
- Auto-refreshes every 30 seconds via TanStack Query

#### Page 2: Map (/map)
```
┌──────────────────────────────────────────────┐
│  MAP CONTROLS          │                     │
│  [Show Routes] [Risks] │   LEAFLET MAP       │
│                        │                     │
│  LEGEND:               │  ● Delhi (green)    │
│  ● Low Risk            │     │               │
│  ● Medium Risk         │  ● Agra (yellow)    │
│  ● High Risk           │     │               │
│  ● Critical            │  ● Bhopal (RED)     │
│  ── Planned Route      │     │               │
│  ── Active Route       │  ● Indore (green)   │
│                        │                     │
│  SELECTED HUB PANEL:   │  [polylines for     │
│  Bhopal                │   planned + active  │
│  Risk: 85% CRITICAL    │   routes in diff    │
│  Rain: 45mm            │   colors]           │
│  Wind: 72kmh           │                     │
│  [SHAP Explanation ▼]  │                     │
└──────────────────────────────────────────────┘
```

**Components:**
- `MapContainer` (Leaflet + OpenStreetMap tiles — no Mapbox token needed)
- `HubMarker` — color-coded by risk_level, click → opens HubDetailPanel
- `RoutePolyline` — grey for planned_route, blue for active_route (if different, show both)
- `HubDetailPanel` — risk %, weather data, SHAP explanation bars
- `SHAPExplanationWidget` — horizontal bar chart showing top 3 risk factors with contribution %

#### Page 3: Shipments (/shipments)
```
┌────────────────────────────────────────────────────────┐
│  [+ New Shipment]    Filter: [All ▼] [Priority ▼]      │
│                                                        │
│  Tracking ID  │ Route          │ Status  │ Risk │ ETA  │
│  ─────────────┼────────────────┼─────────┼──────┼───── │
│  OPT-A1B2C3  │ Delhi→Indore   │REROUTED │HIGH  │ 6PM  │
│  OPT-X9Y8Z7  │ Delhi→Bhopal   │IN_TRANS │MED   │ 4PM  │
│  OPT-K3L4M5  │ Jaipur→Bhopal  │AT_RISK  │CRIT  │ 8PM  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**On row click → Shipment Detail Drawer (slides in from right):**
```
Shipment: OPT-A1B2C3
Status: REROUTED | Priority: EXPRESS

PLANNED ROUTE:  Delhi → Gwalior → Bhopal → Indore
ACTIVE ROUTE:   Delhi → Agra → Jaipur → Kota → Indore

ROUTE CHANGE TIMELINE:
  ─── [14:32] Rerouted: Bhopal risk 85% due to heavy rain
              Agent reason: "Supervisor detected critical risk..."

ALERTS SENT:
  ─── [14:32] Slack → vikram@optiroute.in ✅ Sent
  ─── [14:32] Email → vikram@optiroute.in ✅ Sent
```

**Components:**
- `ShipmentsTable` — sortable, filterable
- `ShipmentDrawer` — detail view with timeline
- `RouteChangeTimeline` — visual timeline of all reroutes
- `CreateShipmentModal` — form: origin hub dropdown, destination hub dropdown, priority, weight

#### Page 4: Alerts (/alerts)
- Table: Channel icon | Recipient | Message preview | Shipment ID | Anomaly badge | Status | Sent at
- Click → expand full LLM-generated message
- Stats at top: Total sent, Failed, Anomaly alerts

#### Page 5: Agent Monitor (/agents)
- `AgentCycleTable` — history of all cycles: cycleId, timestamp, hubs checked, shipments rerouted, alerts sent, duration
- `AgentLogViewer` — click cycle → see each agent's action, input/output, duration_ms
- `ManualTriggerButton` — "Run Agent Cycle Now" → calls POST /api/agents/run-cycle
- Live status: Last run timestamp, Next scheduled run, System health

---

## 12. SHAP EXPLAINABILITY LAYER

### Where SHAP appears in UI:
1. **Map page** — Hub marker click → SHAPExplanationWidget
2. **Shipment drawer** — Route change reason includes human_explanation
3. **Alert message** — LLM uses SHAP-derived explanation in alert text
4. **Risk scores API** — Returns shap_values JSON with every risk score

### SHAPExplanationWidget Component
```
BHOPAL HUB — Why 85% delay risk?

CONTRIBUTING FACTORS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
precipitation_mm   ████████████░░░░  42% contribution
wind_speed_kmh     ████████░░░░░░░░  28% contribution
condition_code     █████░░░░░░░░░░░  18% contribution
humidity           ███░░░░░░░░░░░░░  12% contribution
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plain English: Heavy rainfall (45mm, 3x normal) combined
with strong winds (72 km/h) are the primary delay drivers.
```

---

## 13. FOLDER STRUCTURE (COMPLETE MONOREPO)

```
optiroute/
│
├── README.md
├── docker-compose.yml
├── PRD.md                          ← this document
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts                ← Express server entry
│       ├── lib/
│       │   ├── prisma.ts           ← Prisma client singleton
│       │   ├── cron.ts             ← Scheduled jobs (node-cron)
│       │   └── logger.ts           ← Logging utility
│       ├── routes/
│       │   ├── hubs.routes.ts
│       │   ├── routes.routes.ts
│       │   ├── shipments.routes.ts
│       │   ├── routing.routes.ts
│       │   ├── risk.routes.ts
│       │   ├── agents.routes.ts
│       │   ├── alerts.routes.ts
│       │   └── dashboard.routes.ts
│       ├── controllers/
│       │   ├── hubs.controller.ts
│       │   ├── shipments.controller.ts
│       │   ├── routing.controller.ts
│       │   ├── risk.controller.ts
│       │   ├── agents.controller.ts
│       │   └── dashboard.controller.ts
│       ├── services/
│       │   ├── hubs.service.ts
│       │   ├── shipments.service.ts
│       │   ├── weather.service.ts      ← OpenWeather API integration
│       │   ├── mlClient.service.ts     ← HTTP client to Python ML service
│       │   ├── webhook.service.ts      ← n8n webhook firing
│       │   ├── routing/
│       │   │   ├── graphBuilder.ts
│       │   │   ├── dijkstra.ts
│       │   │   ├── weightCalculator.ts
│       │   │   └── rerouteService.ts
│       │   └── agents/
│       │       ├── supervisorAgent.ts
│       │       ├── weatherAgent.ts
│       │       ├── riskAgent.ts
│       │       ├── routingAgent.ts
│       │       └── communicationAgent.ts
│       ├── middleware/
│       │   ├── errorHandler.ts
│       │   └── validate.ts             ← Zod middleware
│       └── types/
│           └── index.ts                ← Shared TypeScript types
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── ml-service/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── models/
│   │   └── delay_predictor.pkl         ← generated by training
│   ├── training/
│   │   ├── train_model.py
│   │   └── synthetic_data.py
│   ├── schemas/
│   │   └── prediction.py
│   └── services/
│       ├── predictor.py
│       └── explainer.py
│
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── .env.example
│   └── src/
│       ├── app/
│       │   ├── layout.tsx              ← Root layout with sidebar
│       │   ├── page.tsx                ← Dashboard
│       │   ├── map/page.tsx
│       │   ├── shipments/page.tsx
│       │   ├── alerts/page.tsx
│       │   └── agents/page.tsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   └── TopBar.tsx
│       │   ├── dashboard/
│       │   │   ├── StatCard.tsx
│       │   │   ├── RouteChangeRow.tsx
│       │   │   └── AgentStatusBar.tsx
│       │   ├── map/
│       │   │   ├── MapContainer.tsx
│       │   │   ├── HubMarker.tsx
│       │   │   ├── RoutePolyline.tsx
│       │   │   ├── HubDetailPanel.tsx
│       │   │   └── SHAPExplanationWidget.tsx
│       │   ├── shipments/
│       │   │   ├── ShipmentsTable.tsx
│       │   │   ├── ShipmentDrawer.tsx
│       │   │   ├── RouteChangeTimeline.tsx
│       │   │   └── CreateShipmentModal.tsx
│       │   ├── alerts/
│       │   │   └── AlertsTable.tsx
│       │   └── agents/
│       │       ├── AgentCycleTable.tsx
│       │       └── AgentLogViewer.tsx
│       └── lib/
│           ├── api.ts                  ← Centralized fetch wrapper
│           ├── queryClient.ts          ← TanStack Query client
│           └── utils.ts                ← Helpers (formatDate, riskColor, etc)
│
└── n8n-workflows/
    ├── reroute-alert.json              ← n8n workflow export
    └── README.md                       ← How to import + run
```

---

## 14. ENVIRONMENT VARIABLES

### /backend/.env
```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://optiroute:optiroute@localhost:5432/optiroute_db

# ML Service
ML_SERVICE_URL=http://localhost:8000

# External APIs
OPENWEATHER_API_KEY=your_key_here
# Get free key at: https://openweathermap.org/api

# n8n Automation
N8N_WEBHOOK_URL=your_n8n_webhook_url_here
# Leave empty to use fallback mock mode (alerts logged but not fired)

# LLM for Communication Agent (choose one)
ANTHROPIC_API_KEY=your_key_here
# OR
OPENAI_API_KEY=your_key_here

# Scheduler
AGENT_CYCLE_INTERVAL_MINUTES=15
```

### /ml-service/.env
```env
PORT=8000
BACKEND_API_URL=http://localhost:5000/api
MODEL_PATH=models/delay_predictor.pkl
```

### /frontend/.env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=OptiRoute
```

---

## 15. DATA FLOW — END TO END WALKTHROUGH

```
Every 15 minutes (node-cron triggers):
│
▼
1. CRON JOB fires → calls POST /api/agents/run-cycle
│
▼
2. SUPERVISOR AGENT starts new cycle (cycleId = uuid)
│
▼
3. WEATHER AGENT runs:
   • For each active hub (8 hubs)
   • Calls OpenWeather API with hub lat/long
   • Stores result in weather_events table
   • Returns WeatherResult[] to supervisor
│
▼
4. RISK AGENT runs:
   • For each hub, calls Python ML Service POST /predict-risk
   • ML model predicts delay_probability
   • SHAP explainer generates feature contributions
   • Stores risk_score in risk_scores table
   • (includes shap_values, human_explanation)
   • Returns RiskResult[] to supervisor
│
▼
5. SUPERVISOR CHECKS: any hub risk_level = 'high' or 'critical'?
   • NO → Log cycle in agent_logs, END
   • YES → Continue to step 6
│
▼
6. ROUTING AGENT runs:
   • Gets all active shipments whose active_route includes high-risk hub
   • For each affected shipment:
     - Rebuild graph with latest risk weights
     - Run custom Dijkstra from current_hub → destination
     - Compare new path with existing active_route
     - If different → update shipment, create route_change record
   • Returns RouteChange[] to supervisor
│
▼
7. SUPERVISOR CHECKS: any route_changes created?
   • NO → Log cycle, END
   • YES → Continue to step 8
│
▼
8. COMMUNICATION AGENT runs:
   • ANOMALY CHECK: are 2+ hubs simultaneously critical?
     → If yes: flag as anomaly, include in alert
   • For each route_change:
     - Calls LLM (Claude/GPT-4o) with structured prompt
     - LLM generates context-aware alert message (uses SHAP explanation)
     - Calls webhook.service → POST to n8n webhook URL
       (if N8N_WEBHOOK_URL not set → mock mode, log to console)
     - Stores alert in alerts table
│
▼
9. n8n WORKFLOW:
   • Receives webhook POST
   • Formats message
   • Sends to mock Slack (webhook.site)
   • Sends mock email
   • Calls back Node.js to confirm delivery
│
▼
10. FRONTEND (polling every 30s):
    • Dashboard refreshes → shows new route_change in list
    • Map refreshes → Bhopal hub marker turns RED
    • Shipment row → status changes to REROUTED
    • Alerts page → new alert entry appears
```

---

## 16. PHASE-WISE BUILD ORDER

| Phase | What to Build | Key Files | Test When Done |
|-------|--------------|-----------|----------------|
| 1 | Scaffolding + DB setup + seed | prisma/schema.prisma, seed.ts, docker-compose.yml, backend index.ts, Next.js layout | `GET /api/health` returns 200, seed runs, 8 hubs in DB |
| 2 | Core CRUD APIs | All routes/, controllers/, services/ for hubs, routes, shipments | CRUD all 3 resources via .http file |
| 3 | Graph routing engine | routing/graphBuilder.ts, dijkstra.ts, weightCalculator.ts, rerouteService.ts | POST /routing/calculate returns valid path between any 2 hubs |
| 4 | ML service + weather | ml-service/ complete, train_model.py, FastAPI endpoints | POST /predict-risk returns delay_probability + shap_values |
| 5 | LangGraph agents | agents/ all 5 files, cron.ts | POST /agents/run-cycle completes full pipeline, route_changes created |
| 6 | n8n automation | webhook.service.ts, n8n-workflows/reroute-alert.json | Route change → webhook fires → alert in alerts table |
| 7 | Frontend dashboard | All Next.js pages + components | All 5 pages load, data from backend, map shows hubs |

---

## IMPORTANT NOTES FOR CURSOR

1. **Always reference this PRD.md** before writing any code using `@PRD.md`
2. **Never regenerate the DB schema** — it is finalized above. Use Prisma schema exactly as specified
3. **Agent file names must match exactly** as specified in folder structure — cross-file imports depend on this
4. **All API endpoints must match exactly** as specified in Section 10 — frontend depends on these exact paths
5. **No shortcuts on Dijkstra** — it must be a custom implementation, not a library call
6. **SHAP values must be stored in DB** (risk_scores.shap_values column) not just returned from ML service
7. **agent_logs table must be written to** after every agent action — this powers the Agent Monitor page
8. **Mock mode must work** without OpenWeather key, without n8n URL, without LLM key — use fallback data so system is always runnable
