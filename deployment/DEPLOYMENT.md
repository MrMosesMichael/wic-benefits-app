# WIC Backend Deployment Guide
## Private VPS Deployment (mdmichael.com/wic/)

This guide covers deploying the WIC backend to your private VPS using Docker containers.

---

## Architecture Overview

```
Internet
    ↓
nginx (container, ports 80/443)
    ↓ reverse proxy
https://mdmichael.com/wic/api/* → wic-backend (container, port 3000)
    ↓
PostgreSQL (container, port 5432)
```

---

## Prerequisites

### On Your VPS

1. **Docker & Docker Compose installed**
   ```bash
   docker --version  # Should be 20.10+
   docker compose version  # Should be 2.0+
   ```

2. **Git installed**
   ```bash
   git --version
   ```

3. **nginx already running** (you mentioned you have this)

4. **Ports available**:
   - 3000 (backend - localhost only)
   - 5432 (postgres - localhost only)
   - 80/443 already handled by nginx

---

## Step 1: Clone Repository to VPS

```bash
# SSH into your VPS
ssh your-vps

# Choose deployment location
cd /opt  # or wherever you keep apps
sudo mkdir -p wic-app
sudo chown $USER:$USER wic-app
cd wic-app

# Clone repo
git clone https://github.com/MrMosesMichael/wic-benefits-app.git .
# Or if you prefer, rsync from your local machine
```

---

## Step 2: Configure Environment Variables

```bash
cd /opt/wic-app  # or your chosen directory

# Copy production env template
cp backend/.env.production .env

# Edit with strong credentials
nano .env
```

**Required changes in `.env`**:
```bash
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_HERE_MIN_32_CHARS
```

**Generate strong password**:
```bash
openssl rand -base64 32
```

---

## Step 3: Build and Start Containers

```bash
# From project root (/opt/wic-app)
docker compose up -d

# Check status
docker compose ps

# Should show:
# wic-backend    running (healthy)
# wic-postgres   running (healthy)
```

**View logs**:
```bash
# All services
docker compose logs -f

# Just backend
docker compose logs -f backend

# Just database
docker compose logs -f postgres
```

---

## Step 4: Run Database Migrations

The migrations are automatically copied into the container. Run them:

```bash
# Option A: Run migrations via docker exec
docker compose exec backend node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const files = fs.readdirSync('/app/migrations').sort();
(async () => {
  for (const file of files) {
    console.log('Running', file);
    const sql = fs.readFileSync(\`/app/migrations/\${file}\`, 'utf8');
    await pool.query(sql);
  }
  console.log('✅ Migrations complete');
  process.exit(0);
})();
"

# Option B: Connect to PostgreSQL and run manually
docker compose exec postgres psql -U wic_admin -d wic_benefits

# Then in psql:
\i /docker-entrypoint-initdb.d/001_initial_schema.sql
\i /docker-entrypoint-initdb.d/002_three_state_benefits.sql
# ... repeat for all migrations
\q
```

---

## Step 5: Import Michigan APL Data (9,940 products)

```bash
# Check if you have the import script
ls backend/src/scripts/import-michigan-apl.ts

# Run import script inside container
docker compose exec backend sh -c "
  cd /app && \
  npm install --no-save ts-node && \
  npx ts-node src/scripts/import-michigan-apl.ts
"
```

**Note**: If the script expects a file path, you may need to mount the data file:

```bash
# Add this to docker-compose.yml under backend service:
volumes:
  - ./app/assets/data/michigan-apl.json:/app/data/michigan-apl.json:ro

# Then re-run:
docker compose up -d backend
```

---

## Step 6: Configure nginx Reverse Proxy

Since you already have nginx in a container, you need to connect it to the WIC backend network.

### Option A: nginx in separate container (current setup)

**Update your nginx docker-compose.yml**:
```yaml
# Your existing nginx service
nginx:
  # ... your existing config ...
  networks:
    - default  # Your existing network
    - wic-network  # Add WIC network

# Add external network reference
networks:
  wic-network:
    external: true
    name: wic-app_wic-network  # Docker prefixes with directory name
```

**Update nginx upstream**:
In your nginx config, change:
```nginx
upstream wic_backend {
    server 127.0.0.1:3000;  # Change this
}
```
To:
```nginx
upstream wic_backend {
    server wic-backend:3000;  # Use container name
}
```

### Option B: Include WIC in existing docker-compose

Move the WIC services into your existing nginx docker-compose file so they share the same network automatically.

---

## Step 7: Add nginx Configuration

```bash
# If nginx config is mounted as a volume, edit on host
# Find your nginx config location
docker inspect your-nginx-container | grep -A 5 Mounts

# Copy the provided nginx config
sudo cp deployment/nginx-wic.conf /path/to/nginx/conf.d/wic.conf

# OR add to existing mdmichael.com server block
sudo nano /path/to/nginx/sites-available/mdmichael.com
# Paste the location blocks from nginx-wic.conf
```

**Reload nginx**:
```bash
# Test config first
docker exec your-nginx-container nginx -t

# Reload
docker exec your-nginx-container nginx -s reload

# Or restart container
docker restart your-nginx-container
```

---

## Step 8: Test Deployment

### Test backend directly (localhost)
```bash
curl http://localhost:3000/health
# Should return: {"status":"healthy","database":"connected"}
```

### Test via nginx reverse proxy
```bash
curl https://mdmichael.com/wic/health
# Should return: {"status":"healthy","database":"connected"}
```

### Test API endpoint
```bash
curl https://mdmichael.com/wic/api/v1/stores
# Should return store data or empty array
```

---

## Step 9: Update Mobile App Configuration

Update your mobile app to point to the production API:

**File**: `app/lib/services/api.ts`

```typescript
// Change from:
const API_BASE_URL = 'http://192.168.x.x:3000/api/v1';

// To:
const API_BASE_URL = __DEV__
  ? 'http://192.168.x.x:3000/api/v1'  // Local dev
  : 'https://mdmichael.com/wic/api/v1';  // Production
```

Rebuild the APK with production API URL.

---

## Ongoing Maintenance

### View Logs
```bash
docker compose logs -f
```

### Restart Services
```bash
# Restart all
docker compose restart

# Restart just backend
docker compose restart backend
```

### Update Code
```bash
cd /opt/wic-app
git pull
docker compose build backend
docker compose up -d backend
```

### Database Backup
```bash
# Create backup
docker compose exec postgres pg_dump -U wic_admin wic_benefits > backup_$(date +%Y%m%d).sql

# Restore backup
docker compose exec -T postgres psql -U wic_admin wic_benefits < backup_20260126.sql
```

### Monitor Resources
```bash
docker stats wic-backend wic-postgres
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker compose logs backend

# Common issues:
# 1. Database not ready → wait for postgres health check
# 2. Wrong DATABASE_URL → check .env file
# 3. Port conflict → check if 3000 is in use
```

### nginx can't reach backend
```bash
# Check if containers are on same network
docker network inspect wic-app_wic-network

# Both wic-backend and nginx should appear in "Containers"

# Test from nginx container
docker exec your-nginx-container curl http://wic-backend:3000/health
```

### Database connection issues
```bash
# Check postgres is running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Test connection
docker compose exec postgres psql -U wic_admin -d wic_benefits -c "SELECT version();"
```

---

## Security Checklist

- [ ] Strong database password (32+ chars)
- [ ] `.env` file has proper permissions (600)
- [ ] PostgreSQL not exposed to internet (127.0.0.1 only)
- [ ] Backend not exposed to internet (nginx proxy only)
- [ ] CORS configured for your domain only
- [ ] SSL/TLS enabled via nginx
- [ ] Regular database backups enabled

---

## Scaling Considerations

### Current Setup (Good for MVP)
- Single backend container
- Single database container
- Can handle ~100-1000 concurrent users

### When to Scale
If you see high CPU/memory usage or slow response times:

**Horizontal Scaling (Multiple backend containers)**:
```yaml
# In docker-compose.yml
backend:
  deploy:
    replicas: 3  # Run 3 backend instances
```

**Connection Pooling**:
Already configured via `pg.Pool` - increase max connections in database.ts if needed.

**Database Scaling**:
- Add read replicas for heavy read workloads
- Consider managed PostgreSQL (like Neon) if backup/HA is a concern

---

## Next Steps

1. ✅ Deploy backend to VPS
2. ✅ Test all API endpoints
3. 🔄 Update mobile app with production URL
4. 🔄 Rebuild APK with production API
5. 🔄 Test field app with live backend
6. 🔄 Set up monitoring (optional: Uptime Robot, Grafana)
7. 🔄 Configure automatic backups

---

## Cost

**Estimated Monthly Cost**: $0 (using your existing VPS)

**Resource Usage**:
- Backend: ~200MB RAM, <5% CPU (idle)
- PostgreSQL: ~100-500MB RAM, <5% CPU
- Total: ~300-700MB RAM, ~10% CPU under normal load

---

## Support

If you encounter issues:
1. Check logs: `docker compose logs -f`
2. Verify health: `curl http://localhost:3000/health`
3. Check network: `docker network inspect wic-app_wic-network`
4. Restart services: `docker compose restart`
