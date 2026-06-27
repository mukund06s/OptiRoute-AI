# OptiRoute — Phase 11A Docker & Container Validation Report

**Date:** 2026-06-27  
**Scope:** Infrastructure only. No business logic, API, routing, ML, SHAP, LangGraph, or UI changes.

---

## PRD Alignment

| PRD Reference | Status |
|---------------|--------|
| Docker + docker-compose for local/production environment (Section 4 / 13) | ✅ Production compose stack implemented |
| PostgreSQL + seed + backend + ML + frontend services | ✅ Wired with health checks and startup order |
| Environment variables (Section 14) | ✅ Root `.env.example` + service examples updated |
| n8n automation (optional) | ✅ Available via `automation` profile |
| PRD model filename `delay_predictor.pkl` | ⚠️ Deviation — runtime uses `risk_model.pkl` (pre-existing; compose env aligned) |

---

## Verification Checklist

| Item | Status |
|------|--------|
| Backend Dockerfile (multi-stage, Node 20 Alpine) | ✅ |
| ML Dockerfile (Python 3.11 slim, wheel cache) | ✅ |
| Frontend Dockerfile (Next.js standalone multi-stage) | ✅ |
| PostgreSQL persistent named volume | ✅ `optiroute-postgres-data` |
| Shared bridge network | ✅ `optiroute-net` |
| Health checks (postgres, backend, ml, frontend) | ✅ |
| Startup order (postgres → ml → backend → frontend) | ✅ `depends_on` + `service_healthy` |
| Restart policies | ✅ `unless-stopped` on core services |
| `.dockerignore` files | ✅ Root, backend, frontend, ml-service |
| Environment placeholders only | ✅ No secrets committed |
| `docker compose build` | ⚠️ Not executed — Docker CLI unavailable on validation host |
| `docker compose up` | ⚠️ Not executed — Docker CLI unavailable on validation host |

---

## Architecture (Compose)

```
postgres (healthy)
    ↓
ml-service (healthy)
    ↓
backend (healthy, runs prisma migrate deploy)
    ↓
frontend (healthy)

Optional: n8n (--profile automation)
```

**Internal URLs:**
- Backend → Postgres: `postgres:5432`
- Backend → ML: `http://ml-service:8000`
- Browser → Backend: `http://localhost:5000/api` (via `NEXT_PUBLIC_API_URL`)

---

## Dockerfiles Summary

### Backend (`backend/Dockerfile`)
- **Build context:** repository root (includes `prisma/`)
- **Stages:** builder → runner
- **Production deps only** in runner (`npm ci --omit=dev`)
- **Prisma:** generate at build; `migrate deploy` at container start
- **Health check:** `GET /api/health`
- **Port:** 5000

### ML Service (`ml-service/Dockerfile`)
- **Stages:** builder (pip wheels) → runner
- **Copies:** models, schemas, services, training, data
- **Health check:** `GET /health`
- **Port:** 8000
- **Pre-build:** run `scripts/docker-prepare.bat` (or `.sh`) to ensure `models/risk_model.pkl` exists

### Frontend (`frontend/Dockerfile`)
- **Stages:** deps → builder → runner
- **Next.js `output: 'standalone'`** for minimal runtime image
- **Build args:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_NAME`
- **Health check:** `GET /`
- **Port:** 3000

---

## Compose Configuration

| Setting | Value |
|---------|-------|
| Network | `optiroute-net` (bridge) |
| Postgres volume | `optiroute-postgres-data` |
| n8n volume | `optiroute-n8n-data` |
| Backend rate limits / security env | Passed from compose (Phase 10C vars) |
| Dev overrides | `docker-compose.override.yml` (ml bind mount, dev NODE_ENV) |

---

## Build & Run Instructions

```bash
# 1. Prepare ML artifacts (if models/*.pkl not present)
scripts/docker-prepare.bat   # Windows
# or: scripts/docker-prepare.sh

# 2. Copy environment template
cp .env.example .env

# 3. Build and start
docker compose build
docker compose up -d

# 4. Seed database (first run, from host)
cd backend && npx tsx ../prisma/seed.ts

# 5. Optional n8n
docker compose --profile automation up -d n8n
```

**Health verification (after `docker compose up`):**
```bash
curl http://localhost:5432        # postgres (via compose health)
curl http://localhost:8000/health  # ML
curl http://localhost:5000/api/health  # Backend
curl http://localhost:3000/        # Frontend
```

---

## Modified Files

| File | Change |
|------|--------|
| `docker-compose.yml` | Production stack, health checks, networking, profiles |
| `docker-compose.override.yml` | Dev overrides (new) |
| `.dockerignore` | Root build context exclusions (new) |
| `.env.example` | Root compose env template (new) |
| `backend/Dockerfile` | Multi-stage production build |
| `backend/docker-entrypoint.sh` | Migration + startup (new) |
| `backend/.dockerignore` | Build exclusions (new) |
| `frontend/Dockerfile` | Standalone multi-stage build |
| `frontend/.dockerignore` | Build exclusions (new) |
| `frontend/next.config.js` | `output: 'standalone'` (Docker infra) |
| `ml-service/Dockerfile` | Wheel-cached multi-stage build |
| `ml-service/.dockerignore` | Build exclusions (new) |
| `scripts/docker-prepare.sh` | ML artifact prep script (new) |
| `scripts/docker-prepare.bat` | ML artifact prep script (new) |
| `DOCKER_REPORT.md` | This report (new) |

---

## Deviations

| Item | Notes |
|------|-------|
| PRD model filename | Compose uses `models/risk_model.pkl` (actual trained artifact name) |
| Live `docker compose` validation | Docker CLI not installed on CI/agent host |
| Database seed | Not auto-run in container (requires host `tsx` seed after first boot) |
| `docker-compose.override.yml` | Applies automatically in Compose v2 — sets dev NODE_ENV for backend/ml |

---

## Build Validation (Host)

| Target | Result |
|--------|--------|
| Frontend `npm run build` (standalone) | ✅ Pass |
| ML training artifacts generated | ✅ `risk_model.pkl` present for image COPY |
| Docker compose build/up | ⚠️ Skipped — Docker not available |

---

## Final Verification

| Rule | Status |
|------|--------|
| No business logic changed | ✅ |
| No API changes | ✅ |
| No routing changes | ✅ |
| No ML prediction/SHAP changes | ✅ |
| No LangGraph changes | ✅ |
| No frontend UI changes | ✅ (standalone output flag only) |
| Infrastructure only | ✅ |

**Phase 11A is 100% complete** (implementation); live container validation pending Docker installation on host.
