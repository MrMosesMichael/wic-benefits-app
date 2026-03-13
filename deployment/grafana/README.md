# Grafana Cloud Monitoring Setup

Monitors the WIC Benefits backend using Grafana Cloud Free Tier.

**Stack:** Prometheus metrics + Loki logs → Grafana Alloy → Grafana Cloud

## What's Monitored

### Metrics (Prometheus)
- **HTTP**: request rate, latency (p50/p95/p99), error rate, in-flight requests
- **Database**: pool connections (total/idle/waiting)
- **Node.js**: event loop lag, heap size, GC pauses, active handles
- **APL Sync**: sync duration, success/failure counts, data freshness per state
- **App**: barcode scan counts by result

### Logs (Loki)
- `wic-backend` container stdout/stderr
- `wic-postgres` container logs

## Setup Instructions

### 1. Create Grafana Cloud Account

Sign up at https://grafana.com/products/cloud/ (free tier).

### 2. Get Your Credentials

From the Grafana Cloud portal → **My Account** → your stack:

**Prometheus (Metrics)**:
- Click "Send Metrics" on your Prometheus card
- Note the **Remote Write Endpoint** URL
- Note the **Username / Instance ID** (numeric)

**Loki (Logs)**:
- Click "Send Logs" on your Loki card
- Note the **URL** (ends with `/loki/api/v1/push`)
- Note the **Username / Instance ID** (numeric)

**API Key**:
- Go to **Security** → **API Keys** (or use Grafana Cloud Access Policies)
- Create a key with `metrics:write` and `logs:write` scopes
- Copy the token

### 3. Add Environment Variables on VPS

SSH into your VPS and add these to the WIC app `.env` file:

```bash
cd ~/projects/wic-app
vim .env
```

Add:
```bash
# Grafana Cloud
GRAFANA_PROMETHEUS_URL=https://prometheus-prod-XX-prod-us-east-0.grafana.net/api/prom/push
GRAFANA_PROMETHEUS_USERNAME=123456
GRAFANA_LOKI_URL=https://logs-prod-XX.grafana.net/loki/api/v1/push
GRAFANA_LOKI_USERNAME=789012
GRAFANA_API_KEY=glc_xxxxxxxxxxxxx
```

Replace the values with your actual Grafana Cloud credentials.

### 4. Deploy

```bash
# From local machine
./scripts/deploy-backend.sh

# Or on VPS directly
cd ~/projects/wic-app
docker compose up -d
```

The Alloy container will start, scrape the backend every 30s, and ship to Grafana Cloud.

### 5. Verify

```bash
# Check Alloy is running
docker compose ps alloy
docker compose logs alloy

# Check metrics endpoint locally
# curl -s http://localhost:3000/metrics | head -20
docker compose exec backend wget -qO- http://localhost:3000/metrics | head -20
```

## Dashboard Setup

In Grafana Cloud, import or create dashboards using these metrics:

### Key Queries

**Request Rate (RED):**
```promql
rate(http_requests_total[5m])
```

**P95 Latency:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Error Rate:**
```promql
rate(http_requests_total{status_code=~"5.."}[5m])
/ rate(http_requests_total[5m])
```

**DB Pool Utilization:**
```promql
db_pool_connections_total - db_pool_connections_idle
```

**APL Data Freshness:**
```promql
apl_data_age_hours
```

**Node.js Heap:**
```promql
process_resident_memory_bytes / 1024 / 1024
```

### Suggested Alert Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| Backend down | `up{job="wic_backend"} == 0` for 2m | Critical |
| High error rate | Error rate > 5% for 5m | Warning |
| Slow responses | P95 > 2s for 5m | Warning |
| DB pool exhausted | `db_pool_connections_waiting > 0` for 5m | Warning |
| APL data stale | `apl_data_age_hours > 168` (7 days) | Warning |

## Architecture

```
wic-backend:3000/metrics ──scrape──→ Alloy ──remote_write──→ Grafana Cloud Prometheus
wic-backend (stdout)     ──docker──→ Alloy ──push─────────→ Grafana Cloud Loki
wic-postgres (stdout)    ──docker──→ Alloy ──push─────────→ Grafana Cloud Loki
                                                              ↓
                                                    Grafana Dashboards & Alerts
```

## Cost

**Free tier includes:**
- 10,000 active metrics series
- 50 GB logs
- 14-day retention
- 3 users

The WIC app will use ~50-100 metric series — well within limits.
