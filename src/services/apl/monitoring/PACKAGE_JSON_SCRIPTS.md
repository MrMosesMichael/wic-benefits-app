# Package.json Scripts

Add these scripts to your `package.json` for easy access to APL sync commands:

```json
{
  "scripts": {
    "apl:sync:start": "ts-node src/services/apl/monitoring/quick-start.ts",
    "apl:sync:check": "ts-node -e \"require('./src/examples/apl-sync-monitoring-example').example2_CheckForUpdates()\"",
    "apl:sync:freshness": "ts-node -e \"require('./src/examples/apl-sync-monitoring-example').example3_CheckFreshness()\"",
    "apl:sync:manual": "ts-node -e \"require('./src/examples/apl-sync-monitoring-example').example4_ManualSync()\"",
    "apl:sync:health": "ts-node -e \"require('./src/examples/apl-sync-monitoring-example').example7_HealthMonitoring()\"",
    "apl:migrate": "psql -U $DB_USER -d $DB_NAME -f src/services/apl/migrations/001_apl_sync_monitoring_tables.sql"
  }
}
```

## Usage

### Start the sync system
```bash
npm run apl:sync:start
```

### Check for updates (no sync)
```bash
npm run apl:sync:check
```

### Check data freshness
```bash
npm run apl:sync:freshness
```

### Run manual sync
```bash
npm run apl:sync:manual
```

### Check system health
```bash
npm run apl:sync:health
```

### Run database migration
```bash
export DB_USER=wic_user
export DB_NAME=wic_benefits
npm run apl:migrate
```

## Environment Variables

Create a `.env` file:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wic_benefits
DB_USER=wic_user
DB_PASSWORD=your_password

# Sync Configuration
APL_SYNC_SCHEDULE="0 2 * * *"
APL_SYNC_TIMEZONE="America/New_York"
APL_RUN_ON_INIT=false

# Environment
NODE_ENV=development
```

Load with:
```bash
npm install dotenv
```

In your code:
```typescript
import 'dotenv/config';
```

## Docker Compose

For production deployment:

```yaml
version: '3.8'

services:
  apl-sync-worker:
    build: .
    command: npm run apl:sync:start
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=wic_benefits
      - DB_USER=wic_user
      - DB_PASSWORD=${DB_PASSWORD}
      - APL_SYNC_SCHEDULE=0 2 * * *
      - APL_RUN_ON_INIT=false
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - wic-network

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=wic_benefits
      - POSTGRES_USER=wic_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./src/services/apl/migrations:/docker-entrypoint-initdb.d
    networks:
      - wic-network

volumes:
  postgres-data:

networks:
  wic-network:
```

Start with:
```bash
docker-compose up -d apl-sync-worker
```

## Kubernetes Deployment

For Kubernetes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: apl-sync-worker
spec:
  replicas: 1
  selector:
    matchLabels:
      app: apl-sync-worker
  template:
    metadata:
      labels:
        app: apl-sync-worker
    spec:
      containers:
      - name: apl-sync-worker
        image: wic-benefits-app:latest
        command: ["npm", "run", "apl:sync:start"]
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          value: "postgres-service"
        - name: DB_NAME
          value: "wic_benefits"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: APL_SYNC_SCHEDULE
          value: "0 2 * * *"
```

## Systemd Service (Linux)

For Linux servers:

```ini
# /etc/systemd/system/apl-sync.service
[Unit]
Description=WIC APL Sync Service
After=network.target postgresql.service

[Service]
Type=simple
User=wic
WorkingDirectory=/opt/wic-benefits-app
Environment="NODE_ENV=production"
Environment="DB_HOST=localhost"
Environment="DB_NAME=wic_benefits"
EnvironmentFile=/etc/wic/apl-sync.env
ExecStart=/usr/bin/npm run apl:sync:start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable apl-sync
sudo systemctl start apl-sync
sudo systemctl status apl-sync
```

## PM2 Process Manager

For Node.js process management:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'apl-sync-worker',
    script: 'npm',
    args: 'run apl:sync:start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      DB_HOST: 'localhost',
      DB_NAME: 'wic_benefits',
      APL_SYNC_SCHEDULE: '0 2 * * *',
    }
  }]
};
```

Start with:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```
