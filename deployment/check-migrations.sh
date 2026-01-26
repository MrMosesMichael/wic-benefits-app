#!/bin/bash
# Check migration status in PostgreSQL

echo "🔍 Checking WIC database migration status..."
echo ""

# Check if containers are running
if ! docker compose ps | grep -q "wic-postgres.*Up"; then
    echo "❌ PostgreSQL container is not running"
    echo "Run: docker compose up -d"
    exit 1
fi

echo "✅ PostgreSQL container is running"
echo ""

# List all tables
echo "📊 Database tables:"
docker compose exec -T postgres psql -U wic_admin -d wic_benefits -c "\dt" 2>/dev/null | grep -v "List of relations" | grep -v "^--" | grep -v "^(" | grep "public"

echo ""
echo "📝 Table count:"
docker compose exec -T postgres psql -U wic_admin -d wic_benefits -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' '

echo ""
echo "🔢 Sample data counts:"

# Check if tables exist and have data
tables=("apl_products" "households" "stores" "wic_formulas")

for table in "${tables[@]}"; do
    count=$(docker compose exec -T postgres psql -U wic_admin -d wic_benefits -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
    if [ $? -eq 0 ]; then
        echo "  - $table: $count rows"
    else
        echo "  - $table: [table doesn't exist]"
    fi
done

echo ""
echo "✅ Migration check complete"
echo ""
echo "Note: Warnings like 'relation already exists' during startup are normal"
echo "if the database volume persisted from a previous run."
