# OptiRoute — Phase 10C Security & Production Hardening Report

**Date:** 2026-06-27  
**Scope:** Security hardening only. No features. No API contract changes. No routing/ML/LangGraph/UI changes.

---

## PRD Alignment

| PRD Requirement | Status |
|-----------------|--------|
| Environment variables documented (Section 14) | ✅ Extended `.env.example` with security vars |
| Production deployment readiness | ✅ Helmet, CORS, rate limits, env validation |
| No schema changes | ✅ Verified only — no Prisma migrations |
| No ML retrain / prediction logic changes | ✅ ML `predictor.py` / `explainer.py` untouched |
| No routing engine changes | ✅ Untouched |
| No LangGraph changes | ✅ Untouched |
| No frontend UI redesign | ✅ Headers + env validation only |

---

## Verification Checklist

| Control | Status | Notes |
|---------|--------|-------|
| Helmet security headers | ✅ | `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, etc. |
| Secure CORS | ✅ | Origin allowlist via `CORS_ORIGINS`; disabled if unset in production |
| Compression | ✅ | `compression()` middleware |
| Request size limits | ✅ | `512kb` JSON/urlencoded (`JSON_BODY_LIMIT`) |
| HPP protection | ✅ | `hpp()` middleware |
| Rate limiting | ✅ | Per-route-group limiters with `RateLimit-*` headers |
| Environment validation | ✅ | Zod (backend), Pydantic (ML), URL check (frontend) |
| Secure error responses | ✅ | Generic 500 in production; stack in development |
| Input sanitization | ✅ | Strips `__proto__` / prototype pollution keys |
| Disable x-powered-by | ✅ | `app.disable('x-powered-by')` |
| Trust proxy | ✅ | Configurable via `TRUST_PROXY` |
| Security request logging | ✅ | Structured JSON logs for 4xx/5xx + security events |
| Prisma parameterized queries | ✅ Verified | `$queryRaw` tagged template; no string-concat SQL |
| ML request size limit | ✅ | `MAX_REQUEST_BYTES=65536` (64 KB) |
| ML input validation | ✅ Verified | Existing Pydantic `PredictionRequest` |
| ML safe model path | ✅ | Path traversal blocked in `config.py` |
| ML CORS restrictions | ✅ | Allowlist via `CORS_ORIGINS` |
| Frontend env safety | ✅ | `publicEnv` validates `NEXT_PUBLIC_API_URL` |
| Frontend security headers | ✅ | `next.config.js` response headers |
| Safe error rendering | ✅ | Generic message in production ErrorBoundary |

---

## Security Packages Added

| Package | Service | Purpose |
|---------|---------|---------|
| `helmet` | Backend | Security HTTP headers |
| `compression` | Backend | Response compression |
| `hpp` | Backend | HTTP Parameter Pollution protection |
| `express-rate-limit` | Backend | API rate limiting |
| `@types/compression` | Backend (dev) | TypeScript types |
| `@types/hpp` | Backend (dev) | TypeScript types |

**Not added:** `morgan` — structured security logging implemented in `securityLogger.ts` / `securityRequestLogger.ts` instead.

---

## Express Middleware Order

```
1. app.disable('x-powered-by')
2. trust proxy (if TRUST_PROXY=true)
3. helmet()
4. compression()
5. securityRequestLogger
6. cors({ origin: allowlist })
7. hpp()
8. express.json({ limit: JSON_BODY_LIMIT })
9. express.urlencoded({ limit: JSON_BODY_LIMIT })
10. sanitizeInput
11. Per-route rate limiters + routers
12. notFoundHandler
13. errorHandler
```

---

## Rate Limit Configuration

| Route Group | Window | Max Requests | Env Override |
|-------------|--------|--------------|--------------|
| `/api/health` | 60 s | 300 | — (fixed) |
| `/api/hubs`, `/routes`, `/shipments`, `/routing` | 15 min | 100 | `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` |
| `/api/workflow` | 60 s | 20 | `RATE_LIMIT_STRICT_MAX` |

**429 response:** `{ "error": "Too many requests" }` + security log event `rate_limit_exceeded`.

---

## Maximum Request Payload Size

| Service | Limit | Config |
|---------|-------|--------|
| Backend (JSON/urlencoded) | **512 KB** | `JSON_BODY_LIMIT=512kb` |
| ML service | **64 KB** | `MAX_REQUEST_BYTES=65536` |

**413 response:** `{ "error": "Request entity too large" }` (backend) / `{ "detail": "Request entity too large" }` (ML).

---

## Production Security Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `CORS_ORIGINS` to exact frontend origin(s)
- [ ] Set `TRUST_PROXY=true` behind reverse proxy
- [ ] Ensure `DATABASE_URL` uses strong credentials
- [ ] Store secrets in secure secret manager (not committed `.env`)
- [ ] Configure `ML_SERVICE_URL` to internal network URL
- [ ] Set ML `NODE_ENV=production` and restrict `CORS_ORIGINS`
- [ ] Set `NEXT_PUBLIC_API_URL` to HTTPS API base URL
- [ ] Terminate TLS at load balancer / reverse proxy
- [ ] Monitor structured security logs (validation, rate limit, 5xx)
- [ ] Review rate limit thresholds for expected traffic

---

## Structured Security Logging

Events logged as JSON (secrets redacted):

| Event | Trigger |
|-------|---------|
| `validation_failed` | Zod validation rejection |
| `invalid_request` | Malformed JSON / oversized payload |
| `rate_limit_exceeded` | Rate limiter 429 |
| `not_found` | Unknown route |
| `internal_server_error` | Unhandled 5xx |
| `request_completed` | Any response with status ≥ 400 |

**Never logged:** passwords, API keys, tokens, env secret values.

---

## Database Security (Verified, Unchanged)

- Prisma ORM uses parameterized queries — no raw string SQL concatenation found
- `$queryRaw` uses tagged templates (`SELECT 1`) — safe
- JSON columns parsed via Prisma typed accessors
- Decimal fields handled via Prisma `Decimal` type
- No schema modifications in Phase 10C

---

## Modified Files

### Backend (11)
- `package.json` / `package-lock.json`
- `src/index.ts`
- `src/config/env.ts` *(new)*
- `src/lib/securityLogger.ts` *(new)*
- `src/lib/logger.ts`
- `src/middleware/errorHandler.ts`
- `src/middleware/validate.ts`
- `src/middleware/sanitize.ts` *(new)*
- `src/middleware/rateLimit.ts` *(new)*
- `src/middleware/securityRequestLogger.ts` *(new)*
- `.env.example`

### ML Service (3)
- `main.py`
- `config.py` *(new)*
- `.env.example`

### Frontend (5)
- `next.config.js`
- `src/lib/env.ts` *(new)*
- `src/lib/api.ts`
- `src/components/layout/ErrorBoundary.tsx`

---

## Deviations

| Item | Deviation |
|------|-----------|
| PRD ML `MODEL_PATH` default | PRD lists `delay_predictor.pkl`; runtime uses `risk_model.pkl` (pre-existing; validated for path traversal only) |
| Authentication logging | No auth layer exists — `authentication_failure` event type reserved for future use |
| Backend ESLint debt | Pre-existing lint errors not addressed (out of 10C scope) |
| `helmet` CSP in development | CSP disabled in dev to avoid breaking local tooling |

---

## Build & Test Results

| Check | Result |
|-------|--------|
| Backend `npm run build` | ✅ |
| Frontend `npm run build` | ✅ |
| ML `config.py` load | ✅ |
| Helmet headers (live `/api/health`) | ✅ |
| Rate limit headers | ✅ `RateLimit-Policy: 300;w=60` |
| x-powered-by | ✅ Absent |

---

## Final Verification

| Rule | Status |
|------|--------|
| No new features | ✅ |
| No API changes | ✅ |
| No routing changes | ✅ |
| No ML behavior changes | ✅ |
| No LangGraph changes | ✅ |
| No frontend UI changes | ✅ (security-only text/header hardening) |
| Production security hardening only | ✅ |

**Phase 10C complete.**
