# CPET Production Deployment & Operations Guide

This document outlines the architecture, deployment procedures, operational standards, backup protocols, and maintenance guidelines for **CPET (Consumer Problem Escalation & Tracking)**.

---

## 1. System Architecture Overview

```
                        [ Internet / Citizen & Org Traffic ]
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │    Nginx Reverse Proxy (Port 80/443) │
                      │  - SSL/TLS Termination & Security    │
                      │  - Gzip Compression & Static Cache   │
                      │  - Reverse Proxy for /api & /socket  │
                      └──────────────────┬───────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
         ┌─────────────────────┐                   ┌─────────────────────┐
         │  Frontend Static SPA│                   │  Backend API Cluster│
         │  (Vite + React 18)  │                   │  (Express + Node 20)│
         └─────────────────────┘                   └──────────┬──────────┘
                                                              │
                                     ┌────────────────────────┴────────────────────────┐
                                     ▼                                                 ▼
                          ┌─────────────────────┐                           ┌─────────────────────┐
                          │    MongoDB 7.0      │                           │    Redis 7.2        │
                          │ - Tenant Partition  │                           │ - Pub/Sub Bus       │
                          │ - 2dsphere GeoIndex │                           │ - Rate Limiting     │
                          │ - Cases & Audit Logs│                           │ - Escalation Queues │
                          └─────────────────────┘                           └─────────────────────┘
```

---

## 2. Infrastructure Prerequisites

| Component | Minimum Specification | Recommended Production |
| :--- | :--- | :--- |
| **Compute / Host** | 2 vCPU, 4 GB RAM | 4+ vCPU, 8–16 GB RAM |
| **Operating System** | Ubuntu 22.04 LTS / Debian 12 | Linux (kernel 5.15+) |
| **Container Engine** | Docker 24.0+ & Docker Compose v2.20+ | Docker Engine with containerd |
| **Node.js** | Node.js 20 LTS (Iron) | Node.js 20.18+ LTS |
| **Database** | MongoDB 7.0 Community / Atlas | MongoDB 7.0 Enterprise or Atlas M20+ |
| **Cache & Queue** | Redis 7.2 Alpine | Redis Sentinel / Redis Enterprise Cluster |

---

## 3. Environment Configuration & Secrets Matrix

Create a production `.env` file from the following matrix. **Never commit secrets to source control.**

```bash
# Generate high-entropy secrets using openssl:
openssl rand -base64 32
```

| Variable | Type | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | String | `production` | Enables production optimizations, caching, and error sanitization. |
| `PORT` | Number | `5000` | Port on which the Node.js backend listens. |
| `MONGODB_URI` | URI | `mongodb://mongodb:27017/cpet` | MongoDB connection URI with authentication credentials and database name. |
| `REDIS_URL` | URI | `redis://redis:6379` | Redis connection URI with host, port, and optional password. |
| `JWT_SECRET` | Secret | *`<32+ character high-entropy key>`* | Cryptographic signing secret for user session tokens. |
| `JWT_EXPIRES_IN` | String | `7d` | Lifetime of JWT tokens (e.g., `1h`, `24h`, `7d`). |
| `COOKIE_SECRET` | Secret | *`<32+ character high-entropy key>`* | Secret for signing HTTP-only session cookies. |
| `FRONTEND_URL` | URL | `https://cpet.yourdomain.org` | Primary domain of the frontend application. |
| `CORS_ORIGINS` | Comma List | `https://cpet.yourdomain.org` | Allowed origins for cross-origin resource sharing. |
| `RATE_LIMIT_WINDOW_MS` | Number | `900000` (15 min) | Time window for global rate limiting. |
| `RATE_LIMIT_MAX_REQUESTS` | Number | `2000` | Maximum requests per IP per time window. |
| `HTTP_PORT` | Number | `80` | Host port exposed by the Nginx container. |

---

## 4. Production Deployment with Docker Compose

### Step 1: Clone Repository & Prepare Environment
```bash
git clone https://github.com/cpet-platform/cpet.git /opt/cpet
cd /opt/cpet
cp .env.example .env
nano .env  # Supply production secrets and domain URLs
```

### Step 2: Validate Configurations
```bash
docker compose -f docker-compose.prod.yml config
```

### Step 3: Build & Launch Multi-Container Cluster
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 4: Verify Container Health
```bash
docker compose -f docker-compose.prod.yml ps
```
All four services (`mongodb`, `redis`, `backend`, `frontend`) must report `healthy`.

---

## 5. Database Initialization, Indexes & Seeding

### 1. Verification of Critical MongoDB Indexes
The database requires compound and geospatial indexes for SLA evaluation and blood discovery:
```javascript
// Connect to MongoDB:
docker exec -it cpet-prod-mongodb mongosh cpet

// Verify geospatial index on Donor Registry:
db.donors.createIndex({ "location.coordinates": "2dsphere" });

// Verify SLA tracking compound index:
db.cases.createIndex({ "organizationId": 1, "status": 1, "createdAt": -1 });

// Verify reference number uniqueness:
db.cases.createIndex({ "referenceNumber": 1 }, { unique: true });
```

### 2. Seeding Initial Production Directory
To initialize verified organizations (e.g., Apex, Lloyd, Samsung) and administrative roles:
```bash
docker exec -it cpet-prod-backend node database/dist/seed.js
```

---

## 6. Backup, Restoration & Disaster Recovery

### Automated Daily MongoDB Backup
Install a root cron job on the host system to run at `02:00 UTC`:
```bash
#!/usr/bin/env bash
BACKUP_DIR="/var/backups/cpet/mongodb"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

docker exec cpet-prod-mongodb mongodump --db=cpet --archive | gzip > "$BACKUP_DIR/cpet_$TIMESTAMP.archive.gz"

# Retain backups for 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete
```

### Restoration from Archive
```bash
gunzip -c /var/backups/cpet/mongodb/cpet_20260914_020000.archive.gz | \
  docker exec -i cpet-prod-mongodb mongorestore --archive --drop
```

### Recovery Targets
* **Recovery Point Objective (RPO):** < 1 hour with oplog archiving; < 24 hours with daily snapshots.
* **Recovery Time Objective (RTO):** < 15 minutes for full database restoration from local archive.

---

## 7. Monitoring, Health Checks & Observability

### 1. Health Probe Structure
The backend exposes a structured health probe at `GET /health`:
```json
{
  "status": "healthy",
  "timestamp": "2026-09-14T13:40:56.000Z",
  "version": "0.1.0",
  "services": {
    "database": "connected",
    "cache": "connected",
    "queue": "operational"
  },
  "uptime": 86400
}
```

### 2. Logging & Tracing
All logs are emitted as structured JSON to `stdout`/`stderr` with unique `correlationId` headers per request:
```json
{"timestamp":"2026-09-14T13:40:56Z","level":"INFO","message":"Case created","correlationId":"7c90b957-3bf3-4d88-ae44-32fc82829194","caseId":"6aa7fd179f404888633c964b"}
```

### 3. Recommended Prometheus / Alerting Thresholds
* **SLA Breach Warnings:** Alert when cases in `ACKNOWLEDGED` or `IN_PROGRESS` exceed 80% of configured SLA window.
* **Elevated 5xx Rate:** Alert when HTTP 500 error rate exceeds 1% of total traffic over a 5-minute rolling window.
* **Elevated 429 Rate:** Alert if rate limiting rejects > 50 requests/min from a single subnet (potential DDoS or credential stuffing).

---

## 8. Production Security Hardening Checklist

- [x] **Container Security:** Node.js runs as non-root user `node` in Alpine container.
- [x] **Network Isolation:** All internal services communicate over private Docker bridge network (`cpet_network`).
- [x] **HTTP Security Headers:** Helmet configured with strict CSP, HSTS, X-Content-Type-Options, X-Frame-Options.
- [x] **Rate Limiting:** Multi-tiered rate limiters for auth, case creation, and global API endpoints.
- [x] **Input Validation:** Strict schema validation on all endpoints using Zod with centralized 400 error mapping.
- [x] **Injection Protection:** Built-in sanitization guards against MongoDB query selector injections and XSS.
- [x] **Donor Privacy:** Masked contact relays prevent exposure of donor telephone numbers or PII.
- [x] **Optimistic Locking:** Case state mutations require version tracking to prevent race conditions.
