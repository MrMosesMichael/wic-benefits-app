# Quick Start: North Carolina APL Ingestion

Get started with North Carolina APL data ingestion in 5 minutes.

## Prerequisites

- Node.js installed
- PostgreSQL database
- North Carolina APL download URL (or local test file)

## Step 1: Set Environment Variables

```bash
export NORTH_CAROLINA_APL_DOWNLOAD_URL="https://example.com/nc-apl.xlsx"
export DATABASE_URL="postgresql://user:password@localhost:5432/wic_db"
```

## Step 2: Verify Configuration

```bash
node src/examples/north-carolina-apl-example.ts 5
```

Expected output:
```
✅ Configuration is valid

Configuration:
  Download URL: https://example.com/nc-apl.xlsx
  Cron Schedule: 0 3 * * *
  Timezone: America/New_York
  ...
```

## Step 3: Test with Local File (Optional)

Create a test file `test-nc-apl.csv`:

```csv
UPC/PLU,Item Description,Food Category,Sub Category,Container Size,Eligible Participants,Begin Date,End Date
012345678901,Test Whole Milk,Milk,Whole Milk,1 gal,All,2024-01-01,
011110416605,Cheerios Cereal,Cereal,Ready-to-Eat,18 oz,Child,2024-01-01,
```

Run dry-run test:

```bash
node src/services/apl/cli/ingest-north-carolina.ts \
  --local test-nc-apl.csv \
  --dry-run
```

## Step 4: Run Actual Ingestion

```bash
node src/services/apl/cli/ingest-north-carolina.ts
```

Expected output:
```
🚀 Starting North Carolina APL ingestion...
✅ APL file downloaded
✅ Parsed 1234 rows from file
✅ Transformed 1200 valid entries
✅ Validated 1200 entries
✅ Stored entries in database
✅ Updated sync status
🎉 North Carolina APL ingestion complete

📊 Ingestion Statistics:
   Total Rows: 1234
   Valid Entries: 1200
   Invalid Entries: 34
   Additions: 800
   Updates: 400
   Duration: 5432ms
```

## Step 5: Verify Data

Query the database:

```sql
-- Check entries
SELECT COUNT(*) FROM apl_entries
WHERE state = 'NC' AND data_source = 'conduent';

-- View sample entries
SELECT upc, benefit_category, participant_types
FROM apl_entries
WHERE state = 'NC'
LIMIT 5;

-- Check sync status
SELECT last_sync_at, sync_status, entries_count
FROM apl_sync_status
WHERE state = 'NC' AND data_source = 'conduent';
```

Or use the example script:

```bash
node src/examples/north-carolina-apl-example.ts 7
```

## Step 6: Start Background Sync Worker (Optional)

For automated daily syncing:

```bash
# Start worker (runs on schedule)
node src/services/apl/workers/north-carolina-sync-worker.ts
```

Worker will run daily at 3 AM EST by default.

---

## Common Commands

### Manual Ingestion

```bash
# Standard ingestion
node src/services/apl/cli/ingest-north-carolina.ts

# Use local file
node src/services/apl/cli/ingest-north-carolina.ts --local path/to/file.xlsx

# Custom URL
node src/services/apl/cli/ingest-north-carolina.ts --url https://custom.url/apl.xlsx

# Dry run (no DB changes)
node src/services/apl/cli/ingest-north-carolina.ts --dry-run

# Help
node src/services/apl/cli/ingest-north-carolina.ts --help
```

### Examples

```bash
# Config validation
node src/examples/north-carolina-apl-example.ts 5

# Query data
node src/examples/north-carolina-apl-example.ts 7

# Run all examples
node src/examples/north-carolina-apl-example.ts
```

---

## Troubleshooting

### Error: "NORTH_CAROLINA_APL_DOWNLOAD_URL not set"

**Solution**: Set the environment variable:
```bash
export NORTH_CAROLINA_APL_DOWNLOAD_URL="https://actual-url.com/apl.xlsx"
```

### Error: "DATABASE_URL not set"

**Solution**: Set the database connection string:
```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
```

### Error: "Failed to download APL file: HTTP 404"

**Solutions**:
1. Check the URL is correct
2. Try using `--local` flag with a local file
3. Check network connectivity

### Error: "Excel file has no sheets"

**Solutions**:
1. File may be corrupted - re-download
2. File may be CSV format - parser will auto-fallback
3. Use `--local` with a known-good file to test

### Warning: "Invalid UPC format"

**Not a blocker**: The ingestion will skip invalid UPCs and continue processing. Check warnings list in output for details.

---

## Next Steps

1. ✅ North Carolina ingestion working
2. 📋 Set up scheduled sync (cron or systemd)
3. 📊 Monitor sync status regularly
4. 🔄 Implement A1.5 (Florida APL - FIS processor)
5. 🔄 Implement A1.6 (Oregon APL - state-specific)

---

## Production Deployment

### Using systemd (Linux)

Create `/etc/systemd/system/nc-apl-sync.service`:

```ini
[Unit]
Description=North Carolina APL Sync Worker
After=network.target postgresql.service

[Service]
Type=simple
User=wic-app
WorkingDirectory=/opt/wic-app
Environment="NODE_ENV=production"
Environment="DATABASE_URL=postgresql://..."
Environment="NORTH_CAROLINA_APL_DOWNLOAD_URL=https://..."
ExecStart=/usr/bin/node src/services/apl/workers/north-carolina-sync-worker.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable nc-apl-sync
sudo systemctl start nc-apl-sync
sudo systemctl status nc-apl-sync
```

### Using PM2 (Node.js process manager)

```bash
pm2 start src/services/apl/workers/north-carolina-sync-worker.ts \
  --name nc-apl-sync \
  --env production

pm2 save
pm2 startup
```

---

## Support

- 📖 Full docs: `README-north-carolina.md`
- 💻 Examples: `src/examples/north-carolina-apl-example.ts`
- 📝 Implementation: `IMPLEMENTATION-SUMMARY.md`
