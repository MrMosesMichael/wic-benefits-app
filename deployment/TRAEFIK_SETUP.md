# WIC Backend with Traefik

This guide covers deploying the WIC backend with an existing Traefik reverse proxy.

## Prerequisites

- Traefik running with network named `nginx-proxy`
- Let's Encrypt certificate resolver configured in Traefik

## What's Configured

The docker-compose.yml includes Traefik labels for:

### Routes

**Health Check**:
- URL: `https://mdmichael.com/wic/health`
- Backend receives: `/health`
- Middleware: `wic-health-strip` (removes `/wic` prefix)

**API Endpoints**:
- URL: `https://mdmichael.com/wic/api/v1/*`
- Backend receives: `/api/v1/*`
- Middleware: `wic-api-strip` (removes `/wic` prefix)

**WWW Support** (optional):
- URL: `https://www.mdmichael.com/wic/api/v1/*`
- Same behavior as non-www

### Networks

- **wic-network** (internal): PostgreSQL <-> Backend communication
- **nginx-proxy** (external): Traefik <-> Backend communication

## Deployment

```bash
# Pull latest code
cd ~/projects/wic-app
git pull origin main

# Create .env file
cp .env.production.example .env
nano .env  # Set POSTGRES_PASSWORD

# Build and start
docker compose build
docker compose up -d

# Check status
docker compose ps
# Both containers should show (healthy)
```

## Verify Deployment

### Test from Host

```bash
# Health check (local)
curl http://localhost:3000/health

# Health check (via Traefik)
curl https://mdmichael.com/wic/health

# API endpoint (via Traefik)
curl https://mdmichael.com/wic/api/v1/stores
```

### Test from Container

```bash
# Check Traefik network connection
docker exec wic-backend ping -c 2 <traefik-container-name>

# Check backend can reach internet
docker exec wic-backend wget -qO- https://google.com
```

## Landing Page

The landing page at `https://mdmichael.com/wic/` should be served by your web server (not the backend).

**Deploy landing page**:
```bash
sudo mkdir -p /data/docker/www/mdmichael/www/wic
sudo cp deployment/wic-landing/index.html /data/docker/www/mdmichael/www/wic/
sudo chown -R www-data:www-data /data/docker/www/mdmichael/www/wic
```

The landing page will auto-detect API health via JavaScript.

## Traefik Dashboard

Check Traefik dashboard to verify routes are registered:
- Look for routers: `wic-health`, `wic-api`
- Verify middleware: `wic-health-strip`, `wic-api-strip`
- Check service: `wic-backend` with port 3000

## Troubleshooting

### Backend shows in Traefik but returns errors

Check backend logs:
```bash
docker compose logs backend
```

### Traefik can't reach backend

Verify networks:
```bash
# Check if backend is on nginx-proxy network
docker network inspect nginx-proxy | grep wic-backend

# If not, manually connect it
docker network connect nginx-proxy wic-backend
```

### SSL certificate issues

Check Traefik config:
- Ensure `letsencrypt` certificate resolver exists
- Check Traefik logs: `docker logs <traefik-container>`

### Migration already exists warnings

These warnings are normal if the database volume persisted from a previous run:
```
ERROR:  relation "idx_products_upc" already exists
```

**This is safe to ignore** - the database is already initialized.

To start fresh (optional):
```bash
docker compose down -v  # WARNING: Deletes all data
docker compose up -d
```

## Configuration Summary

### Traefik Labels Explained

```yaml
# Enable this container in Traefik
traefik.enable=true

# Create a router named "wic-api"
traefik.http.routers.wic-api.rule=Host(`mdmichael.com`) && PathPrefix(`/wic/api`)

# Use HTTPS with Let's Encrypt
traefik.http.routers.wic-api.entrypoints=websecure
traefik.http.routers.wic-api.tls.certresolver=letsencrypt

# Apply middleware to strip /wic prefix
traefik.http.routers.wic-api.middlewares=wic-api-strip

# Define the middleware
traefik.http.middlewares.wic-api-strip.stripprefix.prefixes=/wic

# Tell Traefik the backend listens on port 3000
traefik.http.services.wic-backend.loadbalancer.server.port=3000
```

## URLs After Deployment

| URL | Receives | Handler |
|-----|----------|---------|
| `https://mdmichael.com/wic/` | N/A | Web server (nginx) serves landing page |
| `https://mdmichael.com/wic/health` | `/health` | Backend container |
| `https://mdmichael.com/wic/api/v1/stores` | `/api/v1/stores` | Backend container |

## Next Steps

1. ✅ Deploy backend with Traefik labels
2. ✅ Verify health check works
3. ✅ Test API endpoints
4. 🔄 Deploy landing page to web server
5. 🔄 Run database migrations (if needed)
6. 🔄 Update mobile app to test with production API
