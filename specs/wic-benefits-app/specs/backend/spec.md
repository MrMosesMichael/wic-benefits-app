# Backend Architecture Specification

## Purpose

Define the backend infrastructure, API design, authentication, database schema, and deployment architecture for the WIC Benefits Assistant.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile Clients                           │
│                    (iOS / Android / Web)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Load Balancer                             │
│                    (AWS ALB / CloudFlare)                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │   API    │  │   API    │  │   API    │
        │ Server 1 │  │ Server 2 │  │ Server N │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │             │             │
             └─────────────┼─────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │PostgreSQL│      │  Redis   │      │ Message  │
   │ Primary  │      │  Cache   │      │  Queue   │
   └────┬─────┘      └──────────┘      └────┬─────┘
        │                                    │
        ▼                                    ▼
   ┌──────────┐                        ┌──────────┐
   │PostgreSQL│                        │  Worker  │
   │ Replica  │                        │ Services │
   └──────────┘                        └──────────┘
```

---

## Requirements

### Requirement: API Gateway

The system SHALL provide a secure, performant API gateway.

#### Scenario: Request routing
- GIVEN client makes API request
- WHEN request reaches load balancer
- THEN request is routed to healthy API server
- AND sticky sessions are NOT required (stateless)
- AND request is logged for monitoring

#### Scenario: Rate limiting
- GIVEN API must be protected from abuse
- WHEN requests exceed limits
- THEN rate limits are enforced:
  - Per user: 100 requests/minute
  - Per device: 200 requests/minute
  - Per IP: 500 requests/minute
- AND 429 Too Many Requests returned
- AND Retry-After header included

#### Scenario: Request validation
- GIVEN all requests must be validated
- WHEN request is received
- THEN validation occurs:
  - JSON schema validation
  - Required field checking
  - Type checking
  - Size limits (max 1MB body)
- AND invalid requests return 400 with details

---

### Requirement: Authentication & Authorization

The system SHALL securely authenticate users.

#### Scenario: User registration
- GIVEN new user wants to create account
- WHEN user provides email/phone and password
- THEN account is created:
  ```
  POST /api/v1/auth/register
  {
    "email": "user@example.com",
    "password": "SecureP@ss123",
    "state": "MI"
  }

  Response: 201 Created
  {
    "userId": "usr_abc123",
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600
  }
  ```
- AND password is hashed (Argon2id)
- AND verification email/SMS is sent
- AND rate limit on registration (5/hour per IP)

#### Scenario: User login
- GIVEN user has account
- WHEN user provides credentials
- THEN authentication occurs:
  ```
  POST /api/v1/auth/login
  {
    "email": "user@example.com",
    "password": "SecureP@ss123"
  }

  Response: 200 OK
  {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600
  }
  ```
- AND access token expires in 1 hour
- AND refresh token expires in 30 days
- AND failed attempts are rate limited

#### Scenario: Token refresh
- GIVEN access token is expiring
- WHEN client sends refresh token
- THEN new tokens are issued:
  ```
  POST /api/v1/auth/refresh
  {
    "refreshToken": "eyJ..."
  }

  Response: 200 OK
  {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600
  }
  ```
- AND old refresh token is invalidated
- AND refresh token rotation prevents reuse

#### Scenario: Device management
- GIVEN user may have multiple devices
- WHEN user logs in on new device
- THEN device is registered:
  - Device ID stored
  - Push token associated
  - Last active timestamp
- AND user can view/revoke devices
- AND suspicious logins trigger notification

#### Scenario: Anonymous usage
- GIVEN some features work without account
- WHEN user uses app without logging in
- THEN limited functionality available:
  - Scanning products (read-only)
  - Viewing APL data
  - Store search
- AND personal features disabled:
  - Benefits tracking
  - Cart/checkout
  - Alerts

---

### Requirement: API Design

The system SHALL follow RESTful API conventions.

#### Scenario: API versioning
- GIVEN API may evolve over time
- WHEN client makes request
- THEN version is in URL path: `/api/v1/...`
- AND breaking changes require new version
- AND old versions supported for 12 months

#### Scenario: Standard response format
- GIVEN consistent responses aid development
- WHEN API returns data
- THEN format is consistent:
  ```json
  {
    "data": { ... },
    "meta": {
      "requestId": "req_abc123",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
  ```

#### Scenario: Error response format
- WHEN API returns error
- THEN format is consistent:
  ```json
  {
    "error": {
      "code": "PRODUCT_NOT_FOUND",
      "message": "Product with UPC 012345678901 not found",
      "details": {
        "upc": "012345678901"
      }
    },
    "meta": {
      "requestId": "req_abc123",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
  ```
- AND HTTP status codes are correct:
  - 400: Bad Request
  - 401: Unauthorized
  - 403: Forbidden
  - 404: Not Found
  - 429: Too Many Requests
  - 500: Internal Server Error

#### Scenario: Pagination
- GIVEN large result sets need pagination
- WHEN list endpoint is called
- THEN pagination is supported:
  ```
  GET /api/v1/products?limit=20&offset=40

  Response:
  {
    "data": [...],
    "meta": {
      "total": 500,
      "limit": 20,
      "offset": 40,
      "hasMore": true
    }
  }
  ```

#### Scenario: Filtering and sorting
- GIVEN users need to filter/sort results
- WHEN query parameters provided
- THEN filtering is applied:
  ```
  GET /api/v1/stores?state=MI&chain=walmart&sort=distance
  ```

---

### Requirement: Database Schema

The system SHALL use PostgreSQL as primary database.

#### Scenario: Database design
- WHEN designing database
- THEN schema follows:
  - Normalized where appropriate
  - Denormalized for read-heavy tables
  - Proper indexing for query patterns
  - UUID primary keys for distribution
  - Soft deletes for audit trail

#### Core Tables:

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  state VARCHAR(2) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Households
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(100),
  primary_state VARCHAR(2) NOT NULL,
  ewic_card_last4 VARCHAR(4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  display_name VARCHAR(100) NOT NULL,
  participant_type VARCHAR(20) NOT NULL,
  birth_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (participant_type IN ('pregnant', 'postpartum', 'breastfeeding', 'infant', 'child'))
);

-- Benefits
CREATE TABLE benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Benefit Categories
CREATE TABLE benefit_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id UUID REFERENCES benefits(id),
  name VARCHAR(100) NOT NULL,
  allocated DECIMAL(10,2) NOT NULL,
  consumed DECIMAL(10,2) DEFAULT 0,
  in_cart DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(20) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- APL Entries
CREATE TABLE apl_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(2) NOT NULL,
  upc VARCHAR(14) NOT NULL,
  eligible BOOLEAN NOT NULL,
  benefit_category VARCHAR(100),
  participant_types VARCHAR(50)[],
  size_min DECIMAL(10,2),
  size_max DECIMAL(10,2),
  size_unit VARCHAR(20),
  brand_restriction JSONB,
  effective_date DATE NOT NULL,
  expiration_date DATE,
  data_source VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(state, upc, effective_date)
);

-- Products
CREATE TABLE products (
  upc VARCHAR(14) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  manufacturer VARCHAR(100),
  category VARCHAR(50)[],
  size VARCHAR(50),
  size_unit VARCHAR(20),
  size_oz DECIMAL(10,2),
  image_url TEXT,
  data_source VARCHAR(20),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  chain VARCHAR(50),
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zip VARCHAR(10),
  location GEOGRAPHY(POINT, 4326),
  wic_authorized BOOLEAN DEFAULT TRUE,
  wic_vendor_id VARCHAR(50),
  phone VARCHAR(20),
  hours JSONB,
  features JSONB,
  inventory_api_available BOOLEAN DEFAULT FALSE,
  data_source VARCHAR(20),
  last_verified TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping Carts
CREATE TABLE shopping_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  store_id UUID REFERENCES stores(id),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CHECK (status IN ('active', 'checking_out', 'completed', 'abandoned'))
);

-- Cart Items
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES shopping_carts(id),
  upc VARCHAR(14) NOT NULL,
  participant_id UUID REFERENCES participants(id),
  benefit_category VARCHAR(100) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES shopping_carts(id),
  household_id UUID REFERENCES households(id),
  store_id UUID REFERENCES stores(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'completed',
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  CHECK (status IN ('completed', 'voided'))
);

-- Formula Alerts
CREATE TABLE formula_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  formula_upcs VARCHAR(14)[],
  max_distance_miles INTEGER DEFAULT 10,
  notification_method VARCHAR(20) DEFAULT 'push',
  specific_store_ids UUID[],
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_notified_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_apl_state_upc ON apl_entries(state, upc);
CREATE INDEX idx_stores_location ON stores USING GIST(location);
CREATE INDEX idx_benefits_participant ON benefit_categories(benefit_id);
CREATE INDEX idx_cart_household ON shopping_carts(household_id, status);
CREATE INDEX idx_formula_alerts_active ON formula_alerts(active, user_id);
```

---

### Requirement: Caching Layer

The system SHALL use Redis for caching.

#### Scenario: Cache strategy
- GIVEN read-heavy workload
- WHEN caching data
- THEN strategy is:
  - Cache-aside pattern for most data
  - Write-through for critical data
  - TTL-based expiration

#### Scenario: Cache keys
- WHEN storing in cache
- THEN key format is:
  ```
  apl:{state}:{upc} -> APL entry
  product:{upc} -> Product data
  store:{id} -> Store data
  inventory:{store_id}:{upc} -> Inventory status
  user:{id}:session -> Session data
  ```

#### Scenario: Cache invalidation
- WHEN data changes
- THEN invalidation occurs:
  - APL update: Clear state APL cache
  - Product update: Clear product cache
  - Store update: Clear store + nearby stores cache
  - Inventory update: Clear store inventory cache

---

### Requirement: Message Queue

The system SHALL use message queues for async processing.

#### Scenario: Queue usage
- GIVEN some operations are async
- WHEN async operation needed
- THEN message is queued:
  - Formula alert notifications
  - Data sync operations
  - Email/SMS sending
  - Analytics processing

#### Scenario: Queue structure
- WHEN setting up queues
- THEN queues include:
  ```
  notifications.push - Push notification delivery
  notifications.sms - SMS delivery
  sync.apl - APL data sync
  sync.inventory - Inventory sync
  analytics.events - Analytics processing
  ```

#### Scenario: Worker processing
- GIVEN messages are queued
- WHEN worker processes message
- THEN:
  - Acknowledge on success
  - Retry with backoff on failure
  - Dead letter after max retries
  - Monitoring for queue depth

---

### Requirement: Push Notifications

The system SHALL send push notifications.

#### Scenario: Device registration
- GIVEN user has mobile device
- WHEN app registers for push
- THEN device token is stored:
  ```
  POST /api/v1/notifications/device
  {
    "token": "fcm_token_abc123",
    "platform": "android",
    "appVersion": "1.2.3"
  }
  ```
- AND token is associated with user

#### Scenario: Notification sending
- WHEN notification needs to be sent
- THEN:
  - Fetch user's device tokens
  - Send via FCM (Android) or APNS (iOS)
  - Track delivery status
  - Retry on failure

#### Scenario: Notification preferences
- GIVEN user can control notifications
- WHEN preference is set
- THEN:
  ```
  PUT /api/v1/notifications/preferences
  {
    "formulaAlerts": true,
    "benefitReminders": true,
    "weeklyDigest": false
  }
  ```
- AND preferences are respected

---

### Requirement: Security

The system SHALL implement security best practices.

#### Scenario: HTTPS everywhere
- GIVEN all communication must be secure
- WHEN any request is made
- THEN HTTPS is enforced
- AND TLS 1.3 preferred
- AND HTTP redirects to HTTPS

#### Scenario: Input sanitization
- GIVEN SQL injection is a threat
- WHEN processing user input
- THEN:
  - Parameterized queries always
  - Input validation at API layer
  - Output encoding for responses

#### Scenario: Secret management
- GIVEN secrets must be protected
- WHEN managing secrets
- THEN:
  - Environment variables for config
  - AWS Secrets Manager for credentials
  - Never in code or logs

#### Scenario: Audit logging
- GIVEN security events need tracking
- WHEN security-relevant action occurs
- THEN audit log entry created:
  - Login attempts (success/failure)
  - Password changes
  - Data exports
  - Account deletions
  - Admin actions

---

### Requirement: Monitoring & Observability

The system SHALL be fully observable.

#### Scenario: Logging
- GIVEN logs are essential for debugging
- WHEN events occur
- THEN structured logs are created:
  ```json
  {
    "timestamp": "2024-01-15T10:30:00Z",
    "level": "info",
    "message": "Product lookup completed",
    "requestId": "req_abc123",
    "userId": "usr_xyz789",
    "upc": "012345678901",
    "durationMs": 45
  }
  ```
- AND logs are shipped to central location
- AND PII is redacted from logs

#### Scenario: Metrics
- GIVEN performance must be tracked
- WHEN system operates
- THEN metrics are collected:
  - Request count by endpoint
  - Response time percentiles (p50, p95, p99)
  - Error rates
  - Cache hit/miss ratios
  - Queue depths
  - Database connection pool

#### Scenario: Tracing
- GIVEN distributed tracing aids debugging
- WHEN request flows through system
- THEN trace is created:
  - Unique trace ID
  - Span for each service call
  - Propagated across services
- AND traces are sampled (10%)

#### Scenario: Alerting
- GIVEN issues need quick response
- WHEN thresholds exceeded
- THEN alerts fire:
  - Error rate >1%: Warning
  - Error rate >5%: Critical
  - P99 latency >2s: Warning
  - P99 latency >5s: Critical
  - Queue depth >1000: Warning
  - Database connections >80%: Critical

---

## API Endpoints Summary

### Authentication
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/profile
PUT  /api/v1/auth/profile
DELETE /api/v1/auth/account
```

### Products
```
GET  /api/v1/products/{upc}
POST /api/v1/products/batch
GET  /api/v1/products/search
POST /api/v1/products/report
```

### APL (Eligibility)
```
GET  /api/v1/apl/{state}
GET  /api/v1/apl/{state}/upc/{upc}
GET  /api/v1/apl/{state}/updates
```

### Stores
```
GET  /api/v1/stores
GET  /api/v1/stores/{storeId}
GET  /api/v1/stores/{storeId}/inventory
GET  /api/v1/stores/detect
POST /api/v1/stores/report
```

### Benefits
```
GET  /api/v1/benefits
POST /api/v1/benefits/manual
PUT  /api/v1/benefits/{benefitId}
GET  /api/v1/benefits/history
```

### Household
```
GET  /api/v1/household
POST /api/v1/household
PUT  /api/v1/household
GET  /api/v1/household/participants
POST /api/v1/household/participants
PUT  /api/v1/household/participants/{id}
DELETE /api/v1/household/participants/{id}
```

### Shopping Cart
```
GET  /api/v1/cart
POST /api/v1/cart/items
DELETE /api/v1/cart/items/{itemId}
POST /api/v1/cart/checkout
GET  /api/v1/cart/history
```

### Formula
```
GET  /api/v1/formula/availability
POST /api/v1/formula/search
GET  /api/v1/formula/alerts
POST /api/v1/formula/alerts
DELETE /api/v1/formula/alerts/{id}
POST /api/v1/formula/sightings
```

### Food Banks
```
GET  /api/v1/foodbanks
GET  /api/v1/foodbanks/{id}
```

### Notifications
```
POST /api/v1/notifications/device
GET  /api/v1/notifications/preferences
PUT  /api/v1/notifications/preferences
```

### User Data
```
POST /api/v1/user/data/export
GET  /api/v1/user/data/export/{exportId}
DELETE /api/v1/user/data/{category}
GET  /api/v1/user/privacy
PUT  /api/v1/user/privacy
```

---

## Deployment Architecture

### Production Environment
```
Region: us-east-2 (Ohio) - Primary
Region: us-west-2 (Oregon) - DR

Load Balancer: AWS ALB
Compute: AWS ECS Fargate
Database: AWS RDS PostgreSQL (Multi-AZ)
Cache: AWS ElastiCache Redis
Queue: AWS SQS
Storage: AWS S3
CDN: CloudFlare
Secrets: AWS Secrets Manager
Monitoring: Datadog
```

### Infrastructure as Code
- Terraform for AWS resources
- Docker for containerization
- GitHub Actions for CI/CD

### Scaling Strategy
- Horizontal scaling for API servers (auto-scale on CPU/requests)
- Read replicas for database
- Redis cluster for cache scaling
- Regional deployment for latency

---

## Technology Stack

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js or Fastify
- **Language:** TypeScript
- **ORM:** Prisma or Knex.js
- **Validation:** Zod or Joi

### Database
- **Primary:** PostgreSQL 15
- **Cache:** Redis 7
- **Queue:** AWS SQS or RabbitMQ

### Infrastructure
- **Cloud:** AWS
- **Containers:** Docker + ECS Fargate
- **IaC:** Terraform
- **CI/CD:** GitHub Actions

### Monitoring
- **APM:** Datadog
- **Logging:** CloudWatch + Datadog
- **Alerting:** PagerDuty
