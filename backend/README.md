# WIC Benefits Backend - Michigan MVP

Node.js/Express/PostgreSQL API server for the WIC Benefits app.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL=postgresql://user:password@localhost:5432/wic_benefits

# Run database migrations (coming soon)
npm run migrate

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### Eligibility Check
```
GET /api/v1/eligibility/:upc
```

Response:
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "product": {
      "upc": "041520000000",
      "name": "Whole Milk, 1 Gallon"
    },
    "category": "milk"
  }
}
```

### Get Benefits
```
GET /api/v1/benefits
```

## Database Schema

Coming soon. Will include:
- `apl_products` - Michigan APL data
- `products` - Product metadata
- `households` - User households
- `participants` - Household members
- `benefits` - Benefit allocations

## Development

The server runs on port 3000 by default. Configure via PORT environment variable.

Hot reload enabled via nodemon.
