# CPET Backend Vercel Deployment Guide

This guide provides the exact configuration required to deploy the **CPET (Consumer Problem Escalation & Tracking)** Express backend as an independent Vercel project while preserving the monorepo's shared `@cpet/database` dependency.

---

## 1. Vercel Project Dashboard Settings

When creating the new project in your [Vercel Dashboard](https://vercel.com/new) and importing this repository:

| Setting | Value / Field Input | Explanation |
| :--- | :--- | :--- |
| **Project Name** | `cpet-backend` *(or your choice)* | Name of the Vercel backend deployment. |
| **Framework Preset** | **Other** | CPET uses custom Express Serverless Functions with npm workspaces. |
| **Root Directory** | `./` *(Monorepo Root)* | **Do not select `backend`**. Deploying from root (`.`) ensures npm workspaces link `@cpet/database` properly. |
| **Build Command** | `npm run build:backend` *(Toggle Override)* | Compiles `@cpet/database` first, then `@cpet/backend` without building frontend assets. |
| **Output Directory** | *(Leave empty / toggle OFF)* | Serverless API functions execute directly via `api/index.ts`. No static folder needed. |
| **Install Command** | `npm install` *(Default / toggle OFF)* | Installs workspace dependencies and symlinks `@cpet/database` to root `node_modules`. |
| **Node.js Version** | **20.x** or **22.x** | Set in *Project Settings → General → Node.js Version*. |

---

## 2. Production Environment Variables Matrix

Configure the following environment variables under **Project Settings → Environment Variables** in the Vercel Dashboard. Select **Production**, **Preview**, and **Development** environments as appropriate.

> [!IMPORTANT]
> In `NODE_ENV=production`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `COOKIE_SECRET` must each be at least 32 characters long and cannot contain the development fallback prefix `cpet-dev-`.

| Variable | Required? | Example / Placeholder Value | Purpose & Instructions |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Activates production error handling, security hardening, and cookie rules. |
| `MONGODB_URI` | **Yes** | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/cpet?retryWrites=true&w=majority` | Cloud MongoDB connection string (e.g. MongoDB Atlas). Localhost will not work on Vercel. |
| `CORS_ORIGIN` | **Yes** | `https://<your-frontend>.vercel.app,https://*.vercel.app` | Comma-separated list of allowed frontend origins. Supports wildcard `*.vercel.app` for branch previews. |
| `JWT_SECRET` | **Yes** | *`<32+ character high-entropy key>`* | Used to sign short-lived access JWTs. Generate with `openssl rand -base64 32`. |
| `JWT_EXPIRES_IN` | No | `15m` | Lifetime of access tokens (default: `15m`). |
| `REFRESH_TOKEN_SECRET` | **Yes** | *`<32+ character high-entropy key>`* | Used to sign 7-day refresh tokens. Generate with `openssl rand -base64 32`. |
| `REFRESH_TOKEN_EXPIRES_IN` | No | `7d` | Lifetime of refresh tokens (default: `7d`). |
| `COOKIE_SECRET` | **Yes** | *`<32+ character high-entropy key>`* | Secret key for signing HTTP-only session cookies. Generate with `openssl rand -base64 32`. |
| `CRON_SECRET` | No | *`<random-32-char-token>`* | Optional secret to authenticate Vercel Cron requests to `/api/v1/sla/sweep-cron`. |
| `SMTP_HOST` | Conditional | `smtp.resend.com` or `smtp.gmail.com` | SMTP host for sending verification emails and OTPs. |
| `SMTP_PORT` | Conditional | `587` | SMTP port (`587` for TLS, `465` for SSL). |
| `SMTP_SECURE` | Conditional | `false` | Set `true` if using port 465, `false` for port 587. |
| `SMTP_USER` | Conditional | `your-smtp-user@example.com` | SMTP username or API key. |
| `SMTP_PASSWORD` | Conditional | `your-smtp-password-or-app-key` | SMTP password or app-specific password. |
| `SMTP_FROM` | No | `noreply@yourdomain.com` | From email address. |
| `SMTP_FROM_NAME` | No | `CPET` | Display name in outgoing emails. |
| `REDIS_HOST` | Optional | `your-redis-host.upstash.io` | Cloud Redis host (e.g. Upstash Redis). |
| `REDIS_PORT` | Optional | `6379` | Cloud Redis port. |
| `REDIS_PASSWORD` | Optional | `your-redis-auth-token` | Cloud Redis auth password. |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limiter window in milliseconds (default: 15 minutes). |
| `RATE_LIMIT_MAX` | No | `1000` | Maximum requests per IP window. |
| `LOG_LEVEL` | No | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`). |

---

## 3. Feature Compatibility Matrix: Vercel Serverless vs External Services

Because Vercel runs stateless serverless functions that freeze immediately after sending an HTTP response, certain long-running stateful services behave differently than on a dedicated Docker/VPS host:

| Feature / Subsystem | Supported Natively on Vercel? | Operational Behavior & Architectural Recommendation |
| :--- | :---: | :--- |
| **REST API (`/api/v1/*`)** | **YES** | Runs natively as a high-performance Vercel Serverless Function via `api/index.ts`. |
| **Health Checks (`/health`, `/health/ready`)** | **YES** | Probes report database latency and operational readiness. |
| **Authentication & OTP** | **YES** | JWT tokens, refresh tokens, and email OTPs work with cloud MongoDB & SMTP. |
| **Cookies across Domains** | **YES** | Production cookies use `sameSite: 'none'` and `secure: true`, enabling cross-site auth from frontend Vercel projects. |
| **SLA Escalation Sweep** | **YES (via Vercel Cron)** | Configured in `vercel.json` to hit `/api/v1/sla/sweep-cron` every 5 minutes automatically. |
| **Database Connection Pooling** | **YES** | Singleton connection caching (`connectingPromise`) reuses connections across warm lambdas, limited to 10 connections max per container. |
| **Socket.IO WebSockets** | **NO** | Serverless functions cannot hold persistent WebSocket connections. **Recommendation:** For live socket updates, run the backend server on a persistent Node host (Render, Railway, Fly.io, or VPS) or integrate Pusher/Ably channels. |
| **Continuous BullMQ Workers** | **NO** | Serverless execution freezes between requests, so background BullMQ workers listening for jobs cannot stay alive. **Recommendation:** Run the BullMQ worker (`npm run start` or `docker compose`) on a persistent worker instance, or rely on Vercel Cron for scheduled operations. |
| **File Uploads** | **YES (via Storage URL)** | CPET stores attachment URLs and metadata in MongoDB. For binary file storage, connect AWS S3 or Cloudinary. |

---

## 4. Frontend Integration (Connecting Frontend to Backend on Vercel)

If your frontend is deployed as a separate Vercel project (`https://cpet-frontend.vercel.app`):

### Option A: Vercel Edge Rewrites in Frontend (Recommended)
Add a `vercel.json` in your **frontend** repository with rewrites so the browser sees same-origin requests:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://<your-backend-project>.vercel.app/api/:path*"
    },
    {
      "source": "/health/:path*",
      "destination": "https://<your-backend-project>.vercel.app/health/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
*Benefits:* Completely eliminates cross-origin cookie restrictions and CORS headers.

### Option B: Direct Cross-Origin API Calls
Set `CORS_ORIGIN=https://<your-frontend>.vercel.app` in your backend Vercel project environment variables. The backend's updated CORS middleware and `sameSite: 'none'` cookies will permit authenticated cross-domain requests.

---

## 5. Deployment Verification Checklist

After deploying to Vercel:

1. **Verify Root Health**:
   Visit `https://<your-backend>.vercel.app/`. You should receive:
   ```json
   {
     "name": "CPET API Server",
     "status": "online",
     "version": "0.1.0"
   }
   ```
2. **Verify Database Connectivity**:
   Visit `https://<your-backend>.vercel.app/health/ready`.
   Ensure `services.database.status` reports `"connected"`.
3. **Verify API Catalog**:
   Visit `https://<your-backend>.vercel.app/api/v1`.
   Ensure the modules array contains `cases`, `complaints`, `blood`, etc.
4. **Verify SLA Cron Sweep**:
   Trigger `https://<your-backend>.vercel.app/api/v1/sla/sweep-cron` or view the Vercel **Cron Jobs** dashboard tab.
