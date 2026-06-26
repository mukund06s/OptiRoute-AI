# n8n Workflows

Automation workflows for OptiRoute alert delivery.

## Import Instructions

1. Start n8n via Docker: `docker-compose up -d n8n`
2. Open http://localhost:5678
3. Create an account (first run only)
4. Go to **Workflows** → **Import from File**
5. Select `reroute-alert.json`
6. Activate the workflow and copy the webhook URL
7. Set `N8N_WEBHOOK_URL` in `backend/.env`

## Workflows

| File | Purpose | Phase |
|------|---------|-------|
| `reroute-alert.json` | Shipment reroute alert pipeline | Phase 6 |

Full workflow implementation will be completed in Phase 6 per PRD Section 9.
