# OptiRoute n8n Workflows

This directory contains n8n workflow definitions for the OptiRoute logistics system.

## Available Workflows

### 1. Reroute Alert Workflow (`reroute-alert.json`)

**Purpose:** Receives webhook events from the OptiRoute backend and processes notifications for shipment updates, reroutes, and critical risk alerts.

**Workflow Nodes:**
1. **Webhook Trigger** - Receives POST requests from Node.js backend
2. **Extract Fields** - Extracts and formats event data
3. **Is Critical Risk?** - Conditional check for critical risk events
4. **Is Anomaly?** - Conditional check for anomaly detection
5. **Prepare High Priority Alert** - Formats high-priority notification payload
6. **Prepare Standard Alert** - Formats standard notification payload
7. **Prepare Info Message** - Formats informational message
8. **Send to Mock Endpoint** - Sends notification to mock webhook (webhook.site)
9. **Log Execution** - Logs execution details
10. **Webhook Response** - Returns success response to backend

**Event Types:**
- `workflow_completed` - Workflow execution finished
- `reroute` - Shipment route changed
- `critical_risk` - Critical risk detected

## Setup Instructions

### 1. Install n8n

```bash
# Using npm
npm install -g n8n

# Or using Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### 2. Start n8n

```bash
n8n start

# Or with Docker
docker start n8n
```

n8n will be available at: http://localhost:5678

### 3. Import Workflow

1. Open n8n UI (http://localhost:5678)
2. Click "Workflows" in the left sidebar
3. Click "Import from File"
4. Select `reroute-alert.json`
5. Click "Import"

### 4. Configure Environment Variables

Create a `.env` file in your backend directory:

```env
# n8n Webhook URL (production)
N8N_WEBHOOK_URL=http://localhost:5678/webhook/optiroute-webhook

# Or use webhook.site for testing
N8N_MOCK_WEBHOOK_URL=https://webhook.site/your-unique-url

# Webhook Configuration
WEBHOOK_TIMEOUT_MS=5000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY_MS=1000
```

### 5. Activate Workflow

1. Open the imported workflow in n8n
2. Click "Active" toggle in the top right
3. The webhook will now accept requests

### 6. Get Webhook URL

1. Click on the "Webhook Trigger" node
2. Copy the "Test URL" or "Production URL"
3. Update your `.env` file with this URL

## Testing the Workflow

### Using curl

```bash
# Test workflow_completed event
curl -X POST http://localhost:5678/webhook/optiroute-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "workflow_completed",
    "timestamp": "2026-06-27T12:00:00Z",
    "cycleId": "cycle-123",
    "shipment": {
      "id": 1,
      "trackingId": "OPT-123",
      "status": "in_transit",
      "priority": "express"
    },
    "alert": {
      "message": "Workflow completed successfully",
      "isAnomaly": false,
      "severity": "low"
    }
  }'

# Test reroute event
curl -X POST http://localhost:5678/webhook/optiroute-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "reroute",
    "timestamp": "2026-06-27T12:00:00Z",
    "cycleId": "cycle-123",
    "shipment": {
      "id": 1,
      "trackingId": "OPT-123",
      "status": "in_transit",
      "priority": "express"
    },
    "routeChange": {
      "oldRoute": ["Delhi", "Bhopal", "Indore"],
      "newRoute": ["Delhi", "Jaipur", "Indore"],
      "reason": "Risk-based rerouting",
      "estimatedTimeSaved": 60
    },
    "alert": {
      "message": "Route optimized for better delivery",
      "isAnomaly": false,
      "severity": "medium"
    }
  }'

# Test critical_risk event
curl -X POST http://localhost:5678/webhook/optiroute-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "critical_risk",
    "timestamp": "2026-06-27T12:00:00Z",
    "cycleId": "cycle-123",
    "shipment": {
      "id": 1,
      "trackingId": "OPT-123",
      "status": "at_risk",
      "priority": "express"
    },
    "riskData": {
      "riskLevel": "critical",
      "delayProbability": 0.89,
      "triggeredByHub": "Bhopal"
    },
    "alert": {
      "message": "Critical risk detected. Immediate action required.",
      "isAnomaly": true,
      "recipientEmail": "manager@optiroute.in",
      "recipientName": "Operations Manager",
      "severity": "critical"
    }
  }'
```

### Using webhook.site

1. Go to https://webhook.site
2. Copy your unique URL
3. Set `N8N_MOCK_WEBHOOK_URL` in `.env`
4. The "Send to Mock Endpoint" node will forward notifications there
5. View received webhooks in real-time on webhook.site

## Payload Format

### Webhook Payload Structure

```typescript
{
  event: 'workflow_completed' | 'reroute' | 'critical_risk';
  timestamp: string; // ISO 8601
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
```

### Response Format

```json
{
  "success": true,
  "executionId": "workflow-id-execution-id",
  "timestamp": "2026-06-27T12:00:00Z"
}
```

## Workflow Logic

1. **Webhook receives event**
2. **Extract fields** - Parse event data
3. **Check if critical risk** - Branch based on event type
   - If critical → Check for anomaly
     - If anomaly → High priority alert
     - If not → Standard alert
   - If not critical → Info message
4. **Send to mock endpoint** - Forward to webhook.site or external service
5. **Log execution** - Record execution details
6. **Return response** - Send success response to backend

## Extending the Workflow

### Adding Email Notifications

1. Add "Send Email" node after "Prepare Alert" nodes
2. Configure SMTP settings in n8n credentials
3. Map alert fields to email template

### Adding Slack Integration

1. Add "Slack" node after "Prepare Alert" nodes
2. Configure Slack webhook URL in n8n credentials
3. Format message for Slack

### Adding Database Logging

1. Add "PostgreSQL" node after "Log Execution"
2. Configure database connection
3. Insert execution log into `alerts` table

## Troubleshooting

### Webhook not receiving requests

- Check n8n is running: `http://localhost:5678`
- Verify workflow is active
- Check webhook URL in backend `.env`
- Ensure no firewall blocking port 5678

### Workflow execution fails

- Check node configurations
- Verify all required fields in payload
- Check n8n logs: `n8n logs`
- Test individual nodes using "Execute Node"

### Mock endpoint not receiving data

- Verify `N8N_MOCK_WEBHOOK_URL` is set
- Check webhook.site URL is valid
- Test with curl to verify connectivity

## Security Considerations

### Production Deployment

1. **Use HTTPS** - Always use HTTPS in production
2. **Add Authentication** - Configure webhook authentication in n8n
3. **Rate Limiting** - Enable rate limiting in n8n settings
4. **IP Whitelisting** - Restrict webhook access to known IPs
5. **Secret Verification** - Implement webhook signature verification

### Example with Authentication

```typescript
// In backend webhook.service.ts
const signature = createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

headers: {
  'X-Webhook-Signature': signature
}
```

## Support

For n8n documentation: https://docs.n8n.io
For OptiRoute issues: Contact your system administrator
