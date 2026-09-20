# CPET — Complete Project Bug & Security Audit Report

**Date:** September 20, 2026  
**Scope:** Complete repository audit across `backend`, `frontend`, `database`, Docker orchestration, security, authentication, and background infrastructure.  
**Auditor:** Senior Engineering, QA, Security & Architecture Audit Team  

---

## Executive Summary

A comprehensive end-to-end security, functional, architectural, performance, and code quality audit was performed across the entire CPET repository (`backend`, `frontend`, `database`, Docker configuration, infrastructure, and CI/CD pipelines).

### Total Issues Found: 30

* **Critical**: 8
* **High**: 9
* **Medium**: 8
* **Low**: 3
* **Informational**: 2

### Overall Categories Affected:
* **Deployment & Docker**: Critical healthcheck route mismatch halts container orchestration; `depends_on: service_healthy` fails permanently in production.
* **Security & Authentication**: Broken WebSocket handshake JWT claims (`decoded.sub` vs `userId`); hardcoded fallback secrets in production; credentials committed in `.env`; IP-agnostic OTP rate limiter enabling unauthenticated DoS.
* **Authorization & RBAC**: IDOR on `/api/v1/cases/:id/read`; unauthenticated case room eavesdropping via WebSocket fallback.
* **Backend Architecture & Queues**: Background BullMQ workers and queues never initialized due to import-time Redis connection race condition; outbound email connector mocks dispatch without sending actual emails.
* **Frontend State & Real-Time UX**: Socket event name mismatches (`join:case` vs `case:join`); incorrect localStorage token key (`cpet_auth_token` vs `cpet_access_token`); Organization Team and Settings pages disconnected from backend API (local mock state only); hardcoded organization ID fallbacks.
* **Performance**: Unbounded in-memory cache leak in `fastCache.ts`; un-split 505 kB frontend monolithic bundle.
* **Testing & Documentation**: Frontend has only 1 unit test (`cn` utility); database package has 0 tests; documentation claims LLM-driven inference while code implements deterministic regex heuristics.

---

## Bug Report

---

### BUG-1

**Title:** Production Docker Healthcheck Route Mismatch Halts Container Startup and Orchestration  
**Severity:** Critical  
**Category:** Deployment / Docker / Configuration  
**File:** `backend/Dockerfile`, `docker-compose.prod.yml`, `backend/src/routes/health.ts`  
**Line:** `backend/Dockerfile:56`, `docker-compose.prod.yml:72`, `health.ts:10`  
**Problem:** The Dockerfiles and `docker-compose.prod.yml` test container health using `GET http://localhost:5000/health`. However, `healthRouter` in `health.ts` only registers `/live` (`GET /health/live`) and `/ready` (`GET /health/ready`). A request to `/health` returns HTTP 404 Not Found. Consequently, the Docker healthcheck fails, Docker marks the backend container as unhealthy, and the frontend container (which specifies `depends_on: backend: condition: service_healthy`) never starts.  
**Evidence:**
In `backend/src/routes/health.ts`:
```ts
healthRouter.get('/live', (_req: Request, res: Response) => { ... });
healthRouter.get('/ready', async (_req: Request, res: Response) => { ... });
// No root GET '/' or '/health' handler exists!
```
In `backend/Dockerfile:56`:
```dockerfile
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1
```
In `docker-compose.prod.yml:72`:
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000/health"]
```
**Why it matters:** Production deployments via `docker compose -f docker-compose.prod.yml up` are completely dead on arrival.  
**How to reproduce:**
1. Run `docker compose -f docker-compose.prod.yml build`
2. Run `docker compose -f docker-compose.prod.yml up`
3. Observe `cpet-prod-backend` becoming unhealthy with 404 error logs, causing `cpet-prod-frontend` to wait indefinitely and abort.  
**Expected behavior:** `GET /health` or `GET /health/live` returns HTTP 200 OK.  
**Actual behavior:** `GET /health` returns HTTP 404 `NotFoundError: Requested route does not exist`.  
**Recommended fix:** Add a root handler on `healthRouter`:
```ts
healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
```
Or update the healthcheck probe in `backend/Dockerfile`, `docker-compose.prod.yml`, and `frontend/nginx.conf` to target `/health/live`.  
**Confidence:** High

---

### BUG-2

**Title:** WebSocket Handshake Verifies `decoded.sub` While JWT Generator Uses `userId`, Breaking Real-Time Authentication and Access Control  
**Severity:** Critical  
**Category:** Security / WebSockets / Authentication  
**File:** `backend/src/infrastructure/socket.ts`, `backend/src/modules/auth/service.ts`  
**Line:** `backend/src/infrastructure/socket.ts:66-86`, `backend/src/modules/auth/service.ts:81-91`  
**Problem:** `AuthService.generateAccessToken()` signs a JWT payload with `{ userId, email, role, organizationId }` without setting `sub`. When a client connects via WebSocket, `socket.ts` verifies the JWT and checks `if (decoded && decoded.sub)`. Because `decoded.sub` is `undefined`, `socket.user` is never populated. As a result, users never join their private room `user:${userId}` or organization room `org:${orgId}`. Furthermore, in `case:join`, because `socket.user` is undefined, the fallback branch allows anonymous clients to join any case room without validation.  
**Evidence:**
In `backend/src/modules/auth/service.ts:81`:
```ts
public generateAccessToken(user: any): string {
  const payload: AuthJwtPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    organizationId: user.organizationId ? user.organizationId.toString() : null,
  };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
}
```
In `backend/src/infrastructure/socket.ts:66`:
```ts
const decoded = jwt.verify(token, env.JWT_SECRET) as any;
if (decoded && decoded.sub) { // ALWAYS FALSE! decoded.userId exists, decoded.sub is undefined!
  ...
  socket.user = { ... };
}
```
In `backend/src/infrastructure/socket.ts:113-125`:
```ts
if (socket.user) {
  // Staff check
} else {
  // Anonymous allowed in dev/demo
  socket.join(`case:${caseId}`); // Eavesdrops on confidential citizen/case communications!
}
```
**Why it matters:**
1. No user or organization agent ever receives live notifications via `emitToUser` or `emitToOrg`.
2. Any unauthenticated client connecting to WebSocket can join any case room and inspect confidential messages, citizen notes, and attachments.  
**How to reproduce:**
1. Log in to obtain a valid JWT token.
2. Connect a WebSocket client passing `auth: { token }`.
3. Inspect `socket.user` on the server: it remains `undefined`.
4. Emit `case:join` with an arbitrary case ID: access is granted without checking caller identity.  
**Expected behavior:** `socket.ts` extracts `decoded.userId || decoded.sub`, populates `socket.user`, auto-joins appropriate user/org rooms, and rejects unauthorized room joins.  
**Actual behavior:** `socket.user` is always undefined; rooms are never auto-joined; room join authorization is bypassed.  
**Recommended fix:** In `backend/src/infrastructure/socket.ts`:
```ts
const userId = decoded.userId || decoded.sub;
if (decoded && userId) {
  let userDoc = isDb ? await UserModel.findById(userId).lean() : memoryStore.users.get(userId);
  if (userDoc) {
    socket.user = {
      _id: userDoc._id.toString(),
      email: userDoc.email,
      role: userDoc.role,
      name: userDoc.name,
      organizationId: userDoc.organizationId?.toString() || null,
    };
  }
}
```
Enforce strict authorization checks in `case:join` and forbid anonymous joins in non-test environments.  
**Confidence:** High

---

### BUG-3

**Title:** Hardcoded Default Secrets for JWT, Refresh Tokens, and Cookies in Production Configuration  
**Severity:** Critical  
**Category:** Security / Configuration  
**File:** `backend/src/config/env.ts`, `.env.example`  
**Line:** `backend/src/config/env.ts:29-33`, `.env.example:1-30`  
**Problem:** `env.ts` provides fallback default strings for `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `COOKIE_SECRET`. If an administrator deploys the application without explicitly supplying these environment variables, the application boots in production using publicly accessible, hardcoded secrets. Furthermore, `.env.example` does not even document these keys.  
**Evidence:**
In `backend/src/config/env.ts`:
```ts
JWT_SECRET: z.string().default('cpet-dev-super-secure-jwt-secret-key-change-in-production-2026'),
REFRESH_TOKEN_SECRET: z.string().default('cpet-dev-refresh-token-secret-key-change-in-production-2026'),
COOKIE_SECRET: z.string().default('cpet-dev-cookie-secret-key-2026'),
```
In `.env.example`: Neither `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, nor `COOKIE_SECRET` is defined.  
**Why it matters:** An attacker knowing the open-source repository defaults can forge valid admin JWT tokens, impersonate any user, bypass RBAC, and decrypt signed cookies.  
**How to reproduce:**
1. Remove `JWT_SECRET` from environment variables.
2. Start server in `NODE_ENV=production`.
3. Generate a token locally using `'cpet-dev-super-secure-jwt-secret-key-change-in-production-2026'` with `role: "SUPER_ADMIN"`.
4. Send request to `/api/v1/cases`: access is granted.  
**Expected behavior:** In `production`, `env.ts` must strictly require `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `COOKIE_SECRET` with minimum length (>= 32 chars) and throw a fatal configuration error if absent.  
**Actual behavior:** Starts normally with predictable hardcoded credentials.  
**Recommended fix:** Use Zod refinement in `env.ts`:
```ts
JWT_SECRET: z.string().min(32),
REFRESH_TOKEN_SECRET: z.string().min(32),
COOKIE_SECRET: z.string().min(32),
```
Provide development defaults only when `NODE_ENV === 'development' || NODE_ENV === 'test'`. Document these variables in `.env.example`.  
**Confidence:** High

---

### BUG-4

**Title:** Real Production SMTP Credentials and App Passwords Committed in Workspace `.env`  
**Severity:** Critical  
**Category:** Security / Sensitive Information Exposure  
**File:** `.env`  
**Line:** `Line 26-27`  
**Problem:** The local `.env` file contains plaintext Google SMTP credentials, including an active Gmail account and an unmasked App Password (`CPETORG1@gmail.com` / `ajba****`).  
**Evidence:**
In `/home/charan/Desktop/cpet/.env`:
```ini
SMTP_USER=CPETORG1@gmail.com
SMTP_PASSWORD=ajba****************
```
**Why it matters:** Exposure of active application passwords permits unauthorized email dispatch, spamming, and account takeover.  
**How to reproduce:** Inspect `/home/charan/Desktop/cpet/.env`.  
**Expected behavior:** `.env` should only contain placeholder tokens or be loaded from secure secret managers (e.g. AWS Secrets Manager, HashiCorp Vault).  
**Actual behavior:** Active credentials reside in plaintext.  
**Recommended fix:**
1. Revoke the Google App Password immediately in the Google Account security console.
2. Generate a new password and store it strictly in local secure secret stores, ensuring `.env` remains git-ignored.  
**Confidence:** High

---

### BUG-5

**Title:** Background Queue & Worker Never Initialized Due to Import-Time Redis Initialization Race Condition  
**Severity:** Critical  
**Category:** Backend / BullMQ / Background Jobs  
**File:** `backend/src/modules/escalation/escalation.queue.ts`, `backend/src/modules/routing/dispatch.queue.ts`, `backend/src/server.ts`  
**Line:** `escalation.queue.ts:16-58`, `dispatch.queue.ts:20-54`, `server.ts:25-27`  
**Problem:** `escalationQueueService` and `dispatchQueueService` instantiate `initQueue()` inside their class constructors, which execute when the files are imported by `app.ts`. At module import time, `redisManager.connect()` has not been called yet (it is invoked asynchronously in `server.ts` line 26). Therefore, `redisClient.status` is never `'ready'` during queue construction. Both queue services permanently fall back to in-memory timers/workers. When Redis later connects, `initQueue()` is never invoked again. Consequently, BullMQ queues and workers are NEVER instantiated in production.  
**Evidence:**
In `backend/src/modules/escalation/escalation.queue.ts`:
```ts
constructor() {
  this.initQueue(); // Called on import!
}
private initQueue() {
  const redisClient = redisManager.getClient();
  if (redisClient && redisClient.status === 'ready') {
    // THIS CODE NEVER RUNS because Redis connects later in server.ts
  } else {
    this.startMemoryTimer();
  }
}
```
In `backend/src/server.ts`:
```ts
const server = httpServer.listen(env.PORT, env.HOST, async () => {
  ...
  await redisManager.connect(); // Runs AFTER modules have already initialized and fallen back!
});
```
**Why it matters:** In a multi-instance production deployment, BullMQ distributed jobs, delayed retries, and shared queue processing never run. Multiple instances run competing in-memory `setInterval` sweeps or drop background tasks upon process restarts.  
**How to reproduce:** Start the backend with Redis running. Inspect logs: `[BullMQ] Outbound dispatch queue & worker initialized with Redis` is never logged.  
**Expected behavior:** Queues and workers should be initialized in an explicit async lifecycle hook after `redisManager.connect()` successfully resolves.  
**Actual behavior:** Services permanently run in fallback memory mode.  
**Recommended fix:** Remove constructor auto-initialization and expose an async `init()` method on queue services called in `server.ts` after `redisManager.connect()`.  
**Confidence:** High

---

### BUG-6

**Title:** Insecure Direct Object Reference (IDOR) on Mark Messages As Read Endpoint  
**Severity:** Critical  
**Category:** Security / Authorization / IDOR  
**File:** `backend/src/modules/cases/case.service.ts`, `backend/src/modules/cases/case.routes.ts`  
**Line:** `case.service.ts:825-868`, `case.routes.ts:73`  
**Problem:** In `POST /api/v1/cases/:id/read`, `caseService.markMessagesAsRead()` directly performs an update on `CaseEventModel` matching `caseId` without validating whether the caller is the case's requester or an authorized member of the assigned organization tenant. Any authenticated user can mark messages as read on any case across any tenant in the platform.  
**Evidence:**
In `backend/src/modules/cases/case.service.ts:825`:
```ts
public async markMessagesAsRead(caseId: string, user: { _id: string; role: any }) {
  const isDb = memoryStore.isDbConnected();
  const readAt = new Date();

  if (isDb) {
    // No ownership or organization tenant validation!
    await CaseEventModel.updateMany(
      { caseId: new Types.ObjectId(caseId), 'readBy.userId': { $ne: new Types.ObjectId(user._id) } },
      ...
    );
  }
```
**Why it matters:** Violates multi-tenant boundaries and integrity of legal audit timelines; allows unauthorized users to tamper with read receipts on confidential grievances.  
**How to reproduce:**
1. Create a case under Citizen A.
2. Authenticate as Citizen B (or Organization Agent from an unrelated tenant).
3. Send `POST /api/v1/cases/<Case A ID>/read`.
4. Observe HTTP 200 OK and read receipts updated on Citizen A's events.  
**Expected behavior:** Endpoint returns HTTP 403 Forbidden if caller is not the requester or an agent of the assigned organization.  
**Actual behavior:** Any authenticated user can modify read receipts on any case.  
**Recommended fix:** Add tenant and requester validation prior to updating events:
```ts
const targetCase = isDb ? await CaseModel.findById(caseId) : memoryStore.cases.get(caseId);
if (!targetCase) throw new NotFoundError('Case not found');
this.validateCaseAccess(targetCase, user);
```
**Confidence:** High

---

### BUG-7

**Title:** Unbounded In-Memory Cache Growth in `fastCache` Middleware Causes Memory Exhaustion DoS  
**Severity:** Critical  
**Category:** Performance / Security / Memory Leak  
**File:** `backend/src/middleware/fastCache.ts`  
**Line:** `fastCache.ts:9-46`  
**Problem:** `fastCache` maintains an in-memory `Map<string, CacheEntry>` where cache keys are derived from `${req.baseUrl}${req.path}?${JSON.stringify(req.query)}`. Expired entries are only overwritten on a cache hit; they are never purged or garbage-collected if no matching request is repeated. Furthermore, there is no maximum entry cap or LRU eviction. An attacker sending requests with randomized query parameters (e.g. `?rand=1`, `?rand=2`) causes unbounded memory growth, leading to process Out-Of-Memory (OOM) crashes.  
**Evidence:**
In `backend/src/middleware/fastCache.ts:9`:
```ts
const memoryCache = new Map<string, CacheEntry>();
...
const key = `${req.baseUrl}${req.path}?${JSON.stringify(req.query)}`;
...
res.send = (body: any) => {
  if (res.statusCode >= 200 && res.statusCode < 300) {
    memoryCache.set(key, { body, contentType, expiresAt });
  }
  return originalSend(body);
};
```
**Why it matters:** Any anonymous user querying `/api/v1/domains?rand=...` can crash the Node.js backend within minutes by exhausting available RAM.  
**How to reproduce:**
Run a simple script sending 100,000 requests with unique query strings to `/api/v1/domains?q=<uuid>`. Monitor Node.js heap usage: memory climbs monotonically until crash.  
**Expected behavior:** Cache uses an LRU cache with a strict maximum key limit (e.g., `lru-cache`) and TTL expiration sweeps.  
**Actual behavior:** An unbounded Map retains all entries indefinitely.  
**Recommended fix:** Replace the raw `Map` with an LRU cache or Redis-backed cache with a strict maximum size (e.g. `max: 500`) and automatic eviction.  
**Confidence:** High

---

### BUG-8

**Title:** IP-Agnostic OTP Rate Limiter Key Enables Unauthenticated Denial of Service Against Any Account  
**Severity:** Critical  
**Category:** Security / Rate Limiting / DoS  
**File:** `backend/src/middleware/rateLimiter.ts`, `backend/src/modules/auth/routes.ts`  
**Line:** `rateLimiter.ts:57-65`, `routes.ts:22-29`  
**Problem:** The `otpRateLimiter` middleware uses `keyGenerator: (req) => `otp:${req.body?.email || req.body?.phone || req.ip}`` with a strict limit of 5 requests per 5 minutes. Because the key is based solely on the target identifier rather than the client's IP address, an unauthenticated attacker knowing a victim's email address can submit 5 bogus requests to `/api/v1/auth/otp/request` or `/api/v1/auth/otp/verify`. This locks out the legitimate victim from requesting or verifying OTPs.  
**Evidence:**
In `backend/src/middleware/rateLimiter.ts:61`:
```ts
export const otpRateLimiter = createRateLimiter({
  name: 'otp',
  windowMs: 5 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 50 : 5,
  keyGenerator: (req) => {
    const target = req.body?.email || req.body?.phone || req.ip;
    return `otp:${target}`; // Missing IP in key!
  },
});
```
**Why it matters:** An attacker can permanently prevent citizens or corporate admins from logging in or registering by continuously sending 5 requests every 5 minutes for their email address.  
**How to reproduce:**
1. Send 5 invalid OTP requests from IP address X with body `{"email": "victim@example.com", "purpose": "LOGIN"}`.
2. From IP address Y (legitimate victim), attempt to log in or request OTP for `victim@example.com`.
3. Request fails with HTTP 429 `RATE_LIMIT_EXCEEDED`.  
**Expected behavior:** Rate limiting should be keyed on composite `${req.ip}:${target}` for per-client throttling, while target-level brute force is handled by the account lockout logic (`bruteForceProtector`).  
**Actual behavior:** Any third party can trigger a rate-limit lockout against any target.  
**Recommended fix:** Change key generator to include client IP:
```ts
keyGenerator: (req) => `otp:${req.ip}:${req.body?.email || req.body?.target || 'none'}`
```
**Confidence:** High

---

### BUG-9

**Title:** Socket Event Name Mismatch Between Frontend and Backend Breaks All Real-Time Timeline and Queue Updates  
**Severity:** High  
**Category:** Frontend / Backend / WebSockets  
**File:** `frontend/src/services/socket.ts`, `backend/src/infrastructure/socket.ts`  
**Line:** `frontend/src/services/socket.ts:65, 75, 85, 95`, `backend/src/infrastructure/socket.ts:109, 129`  
**Problem:** The frontend emits `'join:case'`, `'leave:case'`, `'join:org'`, and `'leave:org'`. However, the backend Socket.IO server listens for `'case:join'` and `'case:leave'`, and has no listener at all for organization joins. Because the event names do not match, the backend never receives the room join requests. Clients never join case or organization rooms, and live message and case updates are never received in real time.  
**Evidence:**
In `frontend/src/services/socket.ts:65`:
```ts
export function joinCaseRoom(caseId: string): void {
  const socket = getSocket();
  if (socket) {
    socket.emit('join:case', caseId); // Emits "join:case"
  }
}
```
In `backend/src/infrastructure/socket.ts:109`:
```ts
socket.on('case:join', async (caseId: string) => { // Listens for "case:join"
  ...
});
socket.on('case:leave', (caseId: string) => { // Listens for "case:leave"
  ...
});
```
**Why it matters:** Bidirectional real-time timeline updates on `CitizenCaseDetails.tsx` and `OrgRequestDetails.tsx` do not work; users must manually refresh pages to see messages and status changes.  
**How to reproduce:**
1. Open a case in Citizen Case Details.
2. In another tab or window, post a message as Organization Agent.
3. Observe that the citizen view never updates in real time.  
**Expected behavior:** Event names match across frontend and backend (`case:join` and `case:leave`).  
**Actual behavior:** Events are ignored by the backend.  
**Recommended fix:** Standardize event names across both frontend and backend to `'case:join'` and `'case:leave'`.  
**Confidence:** High

---

### BUG-10

**Title:** Frontend Socket Client Reads Wrong LocalStorage Key (`cpet_auth_token` vs `cpet_access_token`)  
**Severity:** High  
**Category:** Frontend / WebSockets / State Management  
**File:** `frontend/src/services/socket.ts`, `frontend/src/context/AuthContext.tsx`  
**Line:** `frontend/src/services/socket.ts:10`, `frontend/src/context/AuthContext.tsx:35, 87, 108, 129`  
**Problem:** `AuthContext.tsx` stores and reads the JWT access token in `localStorage` under the key `'cpet_access_token'`. However, `socket.ts` attempts to load the token from `localStorage.getItem('cpet_auth_token')`. Unless the token is explicitly passed as an argument, `socket.ts` loads `null` and initializes an unauthenticated socket connection with `token: ''`.  
**Evidence:**
In `frontend/src/context/AuthContext.tsx:87`:
```ts
localStorage.setItem('cpet_access_token', accessToken);
```
In `frontend/src/services/socket.ts:10`:
```ts
const activeToken = token || localStorage.getItem('cpet_auth_token'); // WRONG KEY!
```
**Why it matters:** Any call to `getSocket()` or `joinCaseRoom()` that does not explicitly pass the token connects as an anonymous guest.  
**How to reproduce:** Inspect `localStorage` after logging in: `cpet_access_token` exists, but `cpet_auth_token` is `null`.  
**Expected behavior:** `socket.ts` reads from `'cpet_access_token'`.  
**Actual behavior:** Reads from non-existent key `'cpet_auth_token'`.  
**Recommended fix:** Update `frontend/src/services/socket.ts` line 10 to use `'cpet_access_token'`.  
**Confidence:** High

---

### BUG-11

**Title:** Organization Team Page (`OrgTeam.tsx`) Uses Pure Mock State; Added Members Never Persist to Backend  
**Severity:** High  
**Category:** Frontend / Functional Bug / Data Loss  
**File:** `frontend/src/pages/organization/OrgTeam.tsx`  
**Line:** `OrgTeam.tsx:25-76`  
**Problem:** `OrgTeam.tsx` hardcodes mock team members ("Sarah Connor", "Michael Scott") in local component state. The `handleAddMember` form submission only pushes the new member to the local React `members` array. It never invokes `POST /api/v1/organizations/:orgId/members`, and `useEffect` never fetches the organization's real members from `GET /api/v1/organizations/:orgId/members`. When the page is reloaded, all newly added members disappear immediately.  
**Evidence:**
In `frontend/src/pages/organization/OrgTeam.tsx:25`:
```ts
const [members, setMembers] = useState([
  { id: '1', name: user?.name || 'Administrator', ... },
  { id: '2', name: 'Sarah Connor', email: 'sarah.c@org.com', ... },
  { id: '3', name: 'Michael Scott', email: 'michael.s@org.com', ... },
]);
...
const handleAddMember = (e: React.FormEvent) => {
  e.preventDefault();
  setMembers([...members, { id: Date.now().toString(), name: newName, ... }]); // Local state only!
  setShowAddModal(false);
};
```
**Why it matters:** Organization admins cannot invite or manage actual support agents. Team member management is entirely non-functional.  
**How to reproduce:**
1. Log in as an Organization Admin.
2. Navigate to Team Members (`/organization/team`).
3. Click "Add Team Member", enter details, and submit.
4. Member appears in list.
5. Refresh the page: the added member is gone, and the mock members reappear.  
**Expected behavior:** `useEffect` fetches real members from `/api/v1/organizations/:orgId/members`, and `handleAddMember` calls `POST /api/v1/organizations/:orgId/members`.  
**Actual behavior:** Component operates on static in-memory dummy data.  
**Recommended fix:** Connect `OrgTeam.tsx` to `GET /api/v1/organizations/${user.organizationId}/members` and `POST /api/v1/organizations/${user.organizationId}/members`.  
**Confidence:** High

---

### BUG-12

**Title:** Organization Settings Page (`OrgSettings.tsx`) Fails to Load or Persist Configuration Changes  
**Severity:** High  
**Category:** Frontend / Functional Bug / Data Loss  
**File:** `frontend/src/pages/organization/OrgSettings.tsx`  
**Line:** `OrgSettings.tsx:24-28`  
**Problem:** In `OrgSettings.tsx`, `handleSave` displays a success alert (`setNotice(...)`) without issuing an HTTP request. It does not call `PATCH /api/v1/organizations/:orgId/settings`. Additionally, on mount, the component does not fetch the organization's existing settings from `GET /api/v1/organizations/:orgId`. When the user modifies SLA hours, auto-assign settings, or contact metadata and saves, no data is written to the database, and values revert upon page refresh.  
**Evidence:**
In `frontend/src/pages/organization/OrgSettings.tsx:24`:
```ts
const handleSave = (e: React.FormEvent) => {
  e.preventDefault();
  setNotice('Organization settings and SLA benchmarks saved successfully.');
  setTimeout(() => setNotice(null), 4000);
};
```
**Why it matters:** Organizations cannot configure response thresholds, SLA benchmarks, or public contact details. The feature gives a false impression of success while silently failing to save data.  
**How to reproduce:**
1. Log in as Organization Admin and go to `/organization/settings`.
2. Change Default SLA Target Window from 48 to 24 hours.
3. Click "Save Configuration Changes".
4. Success message appears.
5. Refresh the page: SLA hours revert to 48.  
**Expected behavior:** Settings are fetched from the backend on load and updated via `PATCH /api/v1/organizations/:orgId/settings`.  
**Actual behavior:** Settings are never fetched or sent to the backend.  
**Recommended fix:** Wire `useEffect` to fetch organization settings and `handleSave` to issue a `PATCH` request with the updated settings payload.  
**Confidence:** High

---

### BUG-13

**Title:** Hardcoded Fallback Organization ID (`66d000000000000000000010`) in Organization Views Triggers Tenant Boundary Violations  
**Severity:** High  
**Category:** Frontend / Multi-Tenancy  
**File:** `frontend/src/pages/organization/OrgRequestQueue.tsx`, `frontend/src/pages/organization/OrgRequestDetails.tsx`  
**Line:** `OrgRequestQueue.tsx:27`, `OrgRequestDetails.tsx:38`  
**Problem:** Both `OrgRequestQueue.tsx` and `OrgRequestDetails.tsx` contain `const orgId = user?.organizationId || '66d000000000000000000010'`. If `user` has not finished loading or has a different organization ID, the client issues API requests for the hardcoded ID `'66d000000000000000000010'`, resulting in 403 Forbidden errors from the backend `tenantScope` middleware.  
**Evidence:**
In `frontend/src/pages/organization/OrgRequestQueue.tsx:27`:
```ts
const { user, token } = useAuth();
const orgId = user?.organizationId || '66d000000000000000000010';
```
In `frontend/src/pages/organization/OrgRequestDetails.tsx:38`:
```ts
const orgId = user?.organizationId || '66d000000000000000000010';
```
**Why it matters:** Causes spurious 403 errors and attempts cross-tenant access.  
**How to reproduce:** Log in as an administrator of a newly created organization whose ID is not `66d000000000000000000010`. During initial mount when `user` is hydrating, requests are sent targeting `66d000000000000000000010`, triggering `Tenant violation` warnings in backend logs.  
**Expected behavior:** If `user?.organizationId` is not present, the page displays a loading spinner or redirects, never falling back to a hardcoded tenant ID.  
**Actual behavior:** Requests are made using another tenant's mock ID.  
**Recommended fix:** Guard requests with `if (!user?.organizationId) return;` and remove hardcoded fallback IDs.  
**Confidence:** High

---

### BUG-14

**Title:** Outbound Email Dispatch Connector Mocks Delivery Without Dispatching Actual Emails  
**Severity:** High  
**Category:** Backend / External Dispatch / Integrations  
**File:** `backend/src/modules/routing/connectors/email.connector.ts`  
**Line:** `email.connector.ts:35-48`  
**Problem:** `EmailConnector` generates a synthetic message ID (`<cpet-${payload.referenceNumber}-${Date.now()}@cpet.org>`) and immediately returns `{ success: true }` without invoking `getEmailProvider()` or nodemailer. Cases routed to external email destinations are marked as `SENT` in the database and audit logs, but no actual email is ever sent.  
**Evidence:**
In `backend/src/modules/routing/connectors/email.connector.ts:35`:
```ts
// In production, nodemailer or AWS SES sends the email
const messageId = `<cpet-${payload.referenceNumber}-${Date.now()}@cpet.org>`;
return {
  success: true,
  channel: 'EMAIL',
  externalReference: messageId,
  deliveredAt: new Date(),
  ...
};
```
**Why it matters:** External organizations that receive citizen service requests or complaints via email never receive notifications, despite CPET logging `EXTERNAL_DISPATCH_SUCCESS`.  
**How to reproduce:**
1. Submit a case routed to an organization destination of type `EMAIL`.
2. Check SMTP server logs: no email transmission occurs.
3. Case timeline falsely shows `Successfully dispatched to EMAIL`.  
**Expected behavior:** `EmailConnector` calls `getEmailProvider().sendEmail(...)` with the case summary and recipient address.  
**Actual behavior:** Dispatch is simulated.  
**Recommended fix:** Import `getEmailProvider()` from `../../providers/email/index.js` and send the email with fallback error handling.  
**Confidence:** High

---

### BUG-15

**Title:** UI Prompts for Phone/Mobile OTP Delivery When SMS Provider Is Not Implemented  
**Severity:** High  
**Category:** Frontend / Backend / UX / Functional  
**File:** `frontend/src/pages/citizen/CitizenLogin.tsx`, `backend/src/modules/auth/service.ts`, `backend/src/modules/auth/schemas.ts`  
**Line:** `CitizenLogin.tsx:147-150`, `service.ts:546-559`, `schemas.ts:56`  
**Problem:** The citizen login UI provides an input labeled `"Email or Mobile Number"` with placeholder `"e.g. user@example.com or +1234567890"`. The backend schema `otpRequestSchema` allows any string as `target`, and `otpPurposeEnum` includes `'PHONE_VERIFICATION'`. However, `AuthService.requestOtp()` unconditionally passes `targetKey` to `getEmailProvider().sendOtpEmail({ to: targetKey })`. When a user enters a phone number, nodemailer fails because the phone number is not a valid email address, resulting in an error to the user.  
**Evidence:**
In `frontend/src/pages/citizen/CitizenLogin.tsx:147`:
```tsx
<Input
  label="Email or Mobile Number"
  type="text"
  required
  placeholder="e.g. user@example.com or +1234567890"
```
In `backend/src/modules/auth/service.ts:546`:
```ts
await getEmailProvider().sendOtpEmail({
  to: targetKey, // Pass phone number "+1234567890" to SMTP email provider!
  otp: rawOtp,
  purpose,
});
```
**Why it matters:** Citizens attempting to log in or register via phone number receive an unexpected service failure error.  
**How to reproduce:**
1. Navigate to `/citizen/login` -> "One-Time Passcode (OTP)".
2. Enter `+19876543210` and click "Send Verification Code".
3. Observe error: "Unable to deliver verification email at this time" or validation error.  
**Expected behavior:** The UI should either clarify that OTP delivery is currently email-only, or an SMS gateway (e.g. Twilio, AWS SNS) should be integrated.  
**Actual behavior:** Phone numbers are routed to the SMTP provider and rejected.  
**Recommended fix:** Restrict `CitizenLogin.tsx` input to `"Email Address"`, validate that input is an email, or implement an SMS provider branch in `AuthService`.  
**Confidence:** High

---

### BUG-16

**Title:** Missing Automatic Token Refresh Interceptor Causes Sudden Session Loss After 15 Minutes  
**Severity:** High  
**Category:** Frontend / Authentication / UX  
**File:** `frontend/src/context/AuthContext.tsx`  
**Line:** `AuthContext.tsx:38-62`  
**Problem:** Access tokens expire after 15 minutes (`JWT_EXPIRES_IN: '15m'`). In `AuthContext.tsx`, when any request receives a 401 response or on initial load with an expired token, `fetchCurrentUser` simply deletes `cpet_access_token` and resets user state to `null`. There is no fetch wrapper, axios interceptor, or refresh handler to call `/api/v1/auth/refresh` using the HTTP-only refresh token. Users are abruptly logged out in the middle of active workflows.  
**Evidence:**
In `frontend/src/context/AuthContext.tsx:49-54`:
```ts
if (res.ok) {
  const json = await res.json();
  setUser(json.data);
} else {
  // Token invalid or expired - immediately kicks user out without refreshing!
  localStorage.removeItem('cpet_access_token');
  setToken(null);
  setUser(null);
}
```
**Why it matters:** Citizens drafting detailed complaints or organization agents working in ticket queues lose their session every 15 minutes, causing unsaved form data loss.  
**How to reproduce:**
1. Log in.
2. Wait 15 minutes (or set token expiration to 10 seconds for testing).
3. Reload the page or perform an action.
4. User is redirected to `/citizen/login` or `/organization/login`.  
**Expected behavior:** An expired access token triggers a silent call to `POST /api/v1/auth/refresh` to rotate tokens before logging the user out.  
**Actual behavior:** User is immediately logged out.  
**Recommended fix:** Implement an authenticated fetch wrapper in `AuthContext` or API client that catches 401s, attempts `POST /api/v1/auth/refresh`, updates `cpet_access_token`, and replays the failed request.  
**Confidence:** High

---

### BUG-17

**Title:** Logout Endpoint Fails to Revoke Refresh Token in Database Due to Missing Body/Cookie Options  
**Severity:** High  
**Category:** Security / Authentication / Session Management  
**File:** `frontend/src/context/AuthContext.tsx`, `backend/src/modules/auth/controller.ts`  
**Line:** `AuthContext.tsx:212`, `controller.ts:169-184`  
**Problem:** `AuthContext.logout()` executes `fetch('/api/v1/auth/logout', { method: 'POST' })` without passing `credentials: 'include'` and without providing a request body. On the server, `AuthController.logout()` checks `const refreshToken = req.body?.refreshToken || req.cookies?.cpet_refresh_token`. Because cookies are not included and no body is passed, `refreshToken` is `undefined`. `authService.logout(undefined)` does nothing, leaving the session record unrevoked in the database.  
**Evidence:**
In `frontend/src/context/AuthContext.tsx:212`:
```ts
const logout = async () => {
  try {
    await fetch('/api/v1/auth/logout', { method: 'POST' }); // No credentials or body!
  } catch { ... }
```
In `backend/src/modules/auth/controller.ts:171`:
```ts
const refreshToken = req.body?.refreshToken || req.cookies?.cpet_refresh_token;
await authService.logout(refreshToken); // Called with undefined!
```
**Why it matters:** Refresh tokens remain valid in the database after the user clicks "Sign Out". If an attacker has intercepted the refresh token, they can continue generating access tokens indefinitely.  
**How to reproduce:**
1. Log in to establish a session.
2. Note the session record in MongoDB (`SessionModel.find()`).
3. Click "Sign Out" in the frontend.
4. Inspect the session record: `isRevoked` is still `false`.  
**Expected behavior:** Logout revokes the session in MongoDB/memoryStore (`isRevoked: true`).  
**Actual behavior:** The session remains active in the database.  
**Recommended fix:** In `AuthContext.tsx`:
```ts
await fetch('/api/v1/auth/logout', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
});
```
**Confidence:** High

---

### BUG-18

**Title:** Incomplete Regex Blacklist in XSS Sanitizer Allows Script Injection Bypasses  
**Severity:** Medium  
**Category:** Security / XSS  
**File:** `backend/src/middleware/security.ts`  
**Line:** `security.ts:104-112`  
**Problem:** `sanitizeXssString()` relies on a naive regular expression blacklist that only strips `<script>`, `<iframe>`, `javascript:`, `onerror=`, and `onload=`. It does not sanitize countless other valid HTML event handlers (e.g. `onfocus=`, `onmouseover=`, `onpointerenter=`, `ontoggle=`, `<svg onload=...>`, `<details ontoggle=...>`).  
**Evidence:**
In `backend/src/middleware/security.ts:104`:
```ts
export function sanitizeXssString(str: string): string {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onload\s*=/gi, '');
}
```
**Why it matters:** An input like `<img src=x onfocus=alert(1) autofocus>` passes through completely unaltered, enabling Cross-Site Scripting (XSS) if rendered in an unescaped context.  
**How to reproduce:** Send a case description containing `<img src=x onfocus=alert(1) autofocus>`. The stored string is not sanitized.  
**Expected behavior:** Proper HTML entity encoding or an established HTML sanitizer library (such as DOMPurify or sanitize-html) should be utilized.  
**Actual behavior:** Bypasses pass through without removal.  
**Recommended fix:** Use an established sanitization library or strict HTML escaping rather than an ad-hoc regex blacklist.  
**Confidence:** High

---

### BUG-19

**Title:** Missing Critical Compound Indexes on MongoDB Models Impacting High-Volume Production Queries  
**Severity:** Medium  
**Category:** Database / Performance  
**File:** `database/src/models/otp.model.ts`, `database/src/models/destination.model.ts`  
**Line:** `otp.model.ts:25-74`, `destination.model.ts:31-94`  
**Problem:**
1. `OtpModel` queries frequently filter by `{ target, purpose, isVerified, expiresAt }` and sort by `{ updatedAt: -1 }`. The schema only defines single-field indexes on `target`, `destinationHash`, and `purpose`, requiring MongoDB to perform an index intersection or in-memory sort.
2. `DestinationModel` queries match `{ organizationId, departmentId, type, activeStatus }`, but lack a compound index on these fields.  
**Evidence:**
In `database/src/models/otp.model.ts`:
```ts
// Only single-field indexes defined:
target: { type: String, required: true, index: true },
purpose: { type: String, index: true },
```
**Why it matters:** Under high load, OTP verification and destination routing queries degrade into unindexed collection scans.  
**How to reproduce:** Run `explain('executionStats')` on `OtpModel.findOne({ target, purpose: 'SIGNUP', isVerified: true, expiresAt: { $gt: new Date() } })`.  
**Expected behavior:** Query uses a covering compound index.  
**Actual behavior:** Uses single-field index with in-memory filtering.  
**Recommended fix:** Add compound indexes:
```ts
otpSchema.index({ target: 1, purpose: 1, isVerified: 1, expiresAt: 1, updatedAt: -1 });
destinationSchema.index({ organizationId: 1, type: 1, activeStatus: 1 });
```
**Confidence:** High

---

### BUG-20

**Title:** Unsanitized Sensitive Credentials in Destination Schema Without `select: false`  
**Severity:** Medium  
**Category:** Security / Sensitive Information Exposure  
**File:** `database/src/models/destination.model.ts`  
**Line:** `destination.model.ts:60-63`  
**Problem:** `DestinationModel` defines `credentials: { type: Schema.Types.Mixed, default: {} }` without `select: false`. Any routine query selecting destinations retrieves API keys, webhook signing secrets, and authentication credentials into memory and potentially exposes them in API responses if not explicitly stripped.  
**Evidence:**
In `database/src/models/destination.model.ts:60`:
```ts
credentials: {
  type: Schema.Types.Mixed,
  default: {},
},
```
**Why it matters:** Accidental exposure of third-party integration credentials in admin or routing API responses.  
**How to reproduce:** Query a destination using `DestinationModel.findById(...)`. The `credentials` object is populated in the returned document.  
**Expected behavior:** Sensitive credentials should have `select: false` on the schema level and be decrypted only within specific connector classes.  
**Actual behavior:** Credentials are returned by default on any find query.  
**Recommended fix:** Add `select: false` to `credentials` in `destination.model.ts`.  
**Confidence:** High

---

### BUG-21

**Title:** Monolithic Frontend Bundle Exceeds 500 kB Without Code-Splitting  
**Severity:** Medium  
**Category:** Performance / Frontend  
**File:** `frontend/src/App.tsx`, `frontend/package.json`  
**Line:** `App.tsx:12-36`  
**Problem:** `App.tsx` statically imports all 16 citizen and organization pages upfront. When building with Vite (`npm run build --workspace=frontend`), a single monolithic bundle `dist/assets/index-C78GZLWk.js` (505.23 kB minified) is generated. Vite emits a warning: `(!) Some chunks are larger than 500 kB after minification. Consider using dynamic import() to code-split the application.`  
**Evidence:**
Output of `npm run build`:
```
dist/assets/index-C78GZLWk.js   505.23 kB │ gzip: 140.42 kB
(!) Some chunks are larger than 500 kB after minification.
```
**Why it matters:** Increases Initial Page Load time (FCP/LCP) for mobile citizens on low-bandwidth networks.  
**How to reproduce:** Run `npm run build --workspace=frontend`.  
**Expected behavior:** Route-level code splitting using `React.lazy()` and `Suspense` ensures users only download code for the page they are viewing.  
**Actual behavior:** The entire application and all dependencies are bundled into one large file.  
**Recommended fix:** Convert page imports in `App.tsx` to `React.lazy(() => import(...))` wrapped with `<Suspense>`.  
**Confidence:** High

---

### BUG-22

**Title:** Missing Dependencies in React `useEffect` Hooks Across Core Pages  
**Severity:** Medium  
**Category:** Frontend / Code Quality / React Lifecycle  
**File:** `frontend/src/pages/citizen/CitizenAiIntake.tsx`, `frontend/src/pages/citizen/CitizenBloodHub.tsx`, `frontend/src/pages/citizen/CitizenCaseDetails.tsx`, `frontend/src/pages/organization/OrgRequestDetails.tsx`  
**Line:** `CitizenAiIntake.tsx:101`, `CitizenBloodHub.tsx:82`, `CitizenCaseDetails.tsx:202`, `OrgRequestDetails.tsx:153`  
**Problem:** ESLint (`react-hooks/exhaustive-deps`) identifies 4 hook warnings where functions and state variables used inside effects are omitted from dependency arrays. For instance, in `CitizenAiIntake.tsx`, `useEffect` calls `handleSend` without declaring `conversation.length` or `handleSend` in its dependency array, risking stale closure execution when query parameters change.  
**Evidence:**
ESLint output:
```
/frontend/src/pages/citizen/CitizenAiIntake.tsx:101:6 warning React Hook useEffect has missing dependencies: 'conversation.length' and 'handleSend'.
/frontend/src/pages/citizen/CitizenBloodHub.tsx:82:6 warning React Hook useEffect has missing dependencies: 'handleSearch' and 'loadMyDonorProfile'.
/frontend/src/pages/citizen/CitizenCaseDetails.tsx:202:6 warning React Hook useEffect has a missing dependency: 'fetchCase'.
/frontend/src/pages/organization/OrgRequestDetails.tsx:153:6 warning React Hook useEffect has missing dependencies: 'fetchCaseDetails' and 'fetchTeamMembers'.
```
**Why it matters:** Can cause stale state bugs, missed updates when props or query strings change, or infinite re-render loops if fixed naively.  
**How to reproduce:** Run `npm run lint --workspace=frontend`.  
**Expected behavior:** Handlers are wrapped in `useCallback` or effects declare appropriate dependencies.  
**Actual behavior:** Missing dependencies trigger linter warnings and potential closure bugs.  
**Recommended fix:** Wrap fetched helper functions with `useCallback` and include them in the dependency arrays.  
**Confidence:** High

---

### BUG-23

**Title:** Missing Navigation Links to Blood Hub and AI Intake in Citizen Shell Header  
**Severity:** Medium  
**Category:** Frontend / UX / Navigation  
**File:** `frontend/src/components/layout/CitizenShell.tsx`  
**Line:** `CitizenShell.tsx:17-21`  
**Problem:** The top navigation bar in `CitizenShell.tsx` only lists `'Services & Home'`, `'Track Requests'`, and `'Profile & Privacy'`. Core differentiating features—the Emergency Blood Hub (`/citizen/blood`) and AI-First Intake (`/citizen/intake`)—are absent from the primary navigation. Once a user navigates away from the home dashboard, there is no direct link to access the Blood Hub or AI Intake without manually typing URLs or returning to Home.  
**Evidence:**
In `frontend/src/components/layout/CitizenShell.tsx:17`:
```ts
const navItems = [
  { name: 'Services & Home', href: '/citizen/home', icon: Home },
  { name: 'Track Requests', href: '/citizen/requests', icon: Clock },
  { name: 'Profile & Privacy', href: '/citizen/profile', icon: User },
];
```
**Why it matters:** Critical functionality is buried and hard to navigate to, degrading user experience.  
**How to reproduce:** Navigate to `/citizen/requests`. Observe that the navigation bar offers no way to jump to `/citizen/blood` or `/citizen/intake`.  
**Expected behavior:** Navbar should include links to "AI Intake" and "Blood Hub".  
**Actual behavior:** Only 3 routes are available in the shell navigation.  
**Recommended fix:** Add `{ name: 'AI Intake', href: '/citizen/intake', icon: Sparkles }` and `{ name: 'Blood Hub', href: '/citizen/blood', icon: HeartHandshake }` to `navItems`.  
**Confidence:** High

---

### BUG-24

**Title:** Citizen User Logging in on Organization Portal Enters an Access Denied Loop  
**Severity:** Medium  
**Category:** Frontend / UX / Authentication  
**File:** `frontend/src/pages/organization/OrgLogin.tsx`  
**Line:** `OrgLogin.tsx:63-75`  
**Problem:** In `OrgLogin.tsx`, while `handlePasswordLogin` validates `if (user.role === 'CITIZEN' || user.role === 'DONOR')` and halts with a friendly error, `handleVerifyOtp` does not perform this check. It directly calls `navigate('/organization/dashboard', { replace: true })`. When the citizen lands on `/organization/dashboard`, `ProtectedRoute` intercepts them with an "Access Denied" screen with a "Go Back" button that loops back.  
**Evidence:**
In `frontend/src/pages/organization/OrgLogin.tsx:63`:
```ts
const handleVerifyOtp = async (e: React.FormEvent) => {
  ...
  await verifyOtp(otpTarget, otpCode, 'LOGIN');
  navigate('/organization/dashboard', { replace: true }); // No role check!
};
```
**Why it matters:** Confusing UX for citizens who mistakenly authenticate on the organization login page using OTP.  
**How to reproduce:**
1. Open `/organization/login`.
2. Select "One-Time Passcode (OTP)".
3. Enter citizen credentials and verify OTP.
4. Immediately land on "Access Denied: Restricted Workspace".  
**Expected behavior:** `verifyOtp` should check user role and display a friendly message directing the user to the Citizen Portal if their role is CITIZEN.  
**Actual behavior:** Unconditionally navigates to the organization workspace.  
**Recommended fix:** Inspect returned user role in `handleVerifyOtp` and block navigation for citizen roles.  
**Confidence:** High

---

### BUG-25

**Title:** Hardcoded Dummy Phone Numbers Pre-filled in Production UI Forms  
**Severity:** Medium  
**Category:** Frontend / UX  
**File:** `frontend/src/pages/citizen/CitizenBloodHub.tsx`, `frontend/src/pages/organization/OrgSettings.tsx`  
**Line:** `CitizenBloodHub.tsx:49, 74`, `OrgSettings.tsx:20`  
**Problem:** Production forms contain pre-filled fake dummy phone numbers in initial React state (`+91 9876543210` in Blood Hub contact and donor registration, and `+1 555-0188` in Organization Settings). If a user does not notice and submits the form, fake contact phone numbers are stored in the database.  
**Evidence:**
In `frontend/src/pages/citizen/CitizenBloodHub.tsx`:
```ts
const [contactPhone, setContactPhone] = useState('+91 9876543210');
const [donorPhone, setDonorPhone] = useState('+91 9876543210');
```
In `frontend/src/pages/organization/OrgSettings.tsx:20`:
```ts
const [contactPhone, setContactPhone] = useState('+1 555-0188');
```
**Why it matters:** Emergency blood relay contacts and organization contact phones end up with junk data if not manually replaced.  
**How to reproduce:** Open `/citizen/blood` -> "Register as Donor". Observe the phone field pre-populated with `+91 9876543210`.  
**Expected behavior:** Form fields should initialize empty or pre-fill from the authenticated user's actual profile (`user?.phone || ''`).  
**Actual behavior:** Hardcoded fake numbers are pre-filled.  
**Recommended fix:** Change initial state to `user?.phone || ''`.  
**Confidence:** High

---

### BUG-26

**Title:** 25 ESLint Unused Variable, Import, and Parameter Warnings Across Backend  
**Severity:** Low  
**Category:** Code Quality / Backend  
**File:** Multiple backend files (e.g. `backend/src/infrastructure/socket.ts`, `backend/src/modules/domains/blood.service.ts`, `backend/src/modules/routing/routing.service.ts`)  
**Line:** Various lines across 11 backend files  
**Problem:** ESLint flags 25 unused variables and imports, including unused model imports (`CaseModel`, `UserModel`, `OtpModel`), unused error classes (`ForbiddenError`, `NotFoundError`), and unused variables (`radiusLimit`, `otherOrgId`, `isStaff`).  
**Evidence:**
Output of `npm run lint --workspace=backend`:
```
✖ 25 problems (0 errors, 25 warnings)
backend/src/infrastructure/socket.ts:7:21 warning 'CaseModel' is defined but never used
backend/src/infrastructure/socket.ts:114:17 warning 'isStaff' is assigned a value but never used
backend/src/modules/domains/blood.service.ts:215:11 warning 'radiusLimit' is assigned a value but never used
backend/src/modules/routing/routing.service.ts:10:10 warning 'NotFoundError' is defined but never used
```
**Why it matters:** Dead code clutters bundle size, impairs readability, and can indicate incomplete logic (e.g., `isStaff` being calculated in `socket.ts` but never evaluated).  
**How to reproduce:** Run `npm run lint --workspace=backend`.  
**Expected behavior:** Clean linter run with 0 errors and 0 warnings.  
**Actual behavior:** 25 warnings reported.  
**Recommended fix:** Remove dead imports and either use or prefix unused variables with `_`.  
**Confidence:** High

---

### BUG-27

**Title:** Disproportionate Test Coverage: Zero Database Package Tests and Only One Frontend Utility Test  
**Severity:** Low  
**Category:** Testing  
**File:** `database/package.json`, `frontend/src/design-system/Button.test.tsx`  
**Line:** `database/package.json:10`, `Button.test.tsx:1-12`  
**Problem:** While the backend has 12 test files with 99 passing integration tests, the frontend test suite contains only 1 test file with 1 test verifying the `cn()` utility (`Button.test.tsx`). There are zero tests for components, forms, state management, auth context, or page routing. Furthermore, the `database` workspace has zero test files.  
**Evidence:**
Running `npm run test`:
```
Backend: 12 test files passed (99 tests)
Frontend: 1 test file passed (1 test for cn utility)
Database: No test files found
```
**Why it matters:** Frontend regressions (such as the disconnected team/settings pages and broken socket listeners) go undetected by automated CI checks.  
**How to reproduce:** Run `npm run test --workspace=frontend` and `npm run test --workspace=database`.  
**Expected behavior:** Core frontend workflows (Auth, Case Creation, State Transitions) have component/integration tests.  
**Actual behavior:** Only a string concatenation utility is tested.  
**Recommended fix:** Add Vitest + React Testing Library tests for `AuthContext`, `CitizenNewRequest`, and `OrgRequestDetails`.  
**Confidence:** High

---

### BUG-28

**Title:** Architecture Documentation Drift: Claims Real-Time Voice/AI LLM Inference When Local Heuristics Are Used  
**Severity:** Low / Informational  
**Category:** Documentation vs Code  
**File:** `CPET_PROJECT_DOCUMENTATION.md`, `backend/src/modules/ai/ai.service.ts`, `backend/src/modules/ai/speech.service.ts`  
**Line:** `CPET_PROJECT_DOCUMENTATION.md:68, 86`, `ai.service.ts:72-120`, `speech.service.ts:1-50`  
**Problem:** `CPET_PROJECT_DOCUMENTATION.md` highlights spoken voice processing and AI-driven conversational intelligence. However, the codebase uses deterministic regex pattern matching in `ai.service.ts`, and `speech.service.ts` contains simulated/mock audio transcriptions. While this is beneficial for offline development and zero API costs, the documentation does not accurately describe the underlying heuristic implementation.  
**Evidence:**
In `backend/src/modules/ai/speech.service.ts`:
```ts
public async transcribeAudio(_buffer: Buffer, _mimeType: string): Promise<string> {
  // Returns simulated transcript
}
```
**Why it matters:** Discrepancy between architectural documentation and real code implementation.  
**How to reproduce:** Compare `CPET_PROJECT_DOCUMENTATION.md` section 10.1 with `backend/src/modules/ai/speech.service.ts`.  
**Expected behavior:** Documentation accurately notes that speech and conversational intake currently use deterministic local heuristics and mock audio transcription as an offline baseline.  
**Actual behavior:** Documentation claims enterprise voice AI integration.  
**Recommended fix:** Update documentation to reflect the heuristic engine baseline.  
**Confidence:** High

---

### BUG-29

**Title:** Missing Environment Variable Declarations in `.env.example`  
**Severity:** Low / Informational  
**Category:** Configuration / Documentation  
**File:** `.env.example`  
**Line:** `.env.example:1-30`  
**Problem:** Multiple environment variables validated by `env.ts` are completely absent from `.env.example`, including `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRES_IN`, and `COOKIE_SECRET`. A developer or DevOps engineer deploying the application from `.env.example` will not know these variables are required.  
**Evidence:**
Comparing `.env.example` with `backend/src/config/env.ts`: keys 29-33 in `env.ts` do not appear in `.env.example`.  
**Why it matters:** Incomplete deployment guidance leads to reliance on insecure fallback defaults in production.  
**How to reproduce:** Check `.env.example` for `JWT_SECRET`.  
**Expected behavior:** `.env.example` documents all supported configuration keys with comments.  
**Actual behavior:** Key security variables are missing.  
**Recommended fix:** Add all missing variables to `.env.example`.  
**Confidence:** High

---

### BUG-30

**Title:** Cookie Deletion in `AuthController.logout` Omits Security and Path Attributes  
**Severity:** Low  
**Category:** Backend / Cookies / Security  
**File:** `backend/src/modules/auth/controller.ts`  
**Line:** `controller.ts:174-175`  
**Problem:** When cookies are created in `setCookies()`, `cpet_token` is set with `httpOnly: true, secure: isProd, sameSite: 'lax'`. In `logout()`, `res.clearCookie('cpet_token')` is invoked without matching `secure` and `sameSite` options. In modern strict browsers (e.g. Chrome with partitioned cookies or HTTPS enforcement), mismatched cookie attributes can cause `clearCookie` to fail, leaving the cookie in the browser.  
**Evidence:**
In `backend/src/modules/auth/controller.ts:174`:
```ts
res.clearCookie('cpet_token');
res.clearCookie('cpet_refresh_token', { path: '/api/v1/auth/refresh' });
```
**Why it matters:** Access token cookie may persist in the browser after logout in HTTPS production environments.  
**How to reproduce:** Inspect browser Application/Cookies tab after clicking Sign Out on an HTTPS deployment.  
**Expected behavior:** `clearCookie` options match `cookie` creation options (`httpOnly`, `secure`, `sameSite`).  
**Actual behavior:** Options are omitted.  
**Recommended fix:** Pass matching options to `res.clearCookie`:
```ts
const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'lax' as const };
res.clearCookie('cpet_token', cookieOpts);
res.clearCookie('cpet_refresh_token', { ...cookieOpts, path: '/api/v1/auth/refresh' });
```
**Confidence:** High

---

## Issue Summary Table

| ID | Severity | Category | File | Problem | Impact | Fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-1** | Critical | Deployment | `backend/Dockerfile` | Healthcheck probes `/health` which returns 404 | Docker backend container unhealthy; frontend never starts | Add `GET /health` route or update probe to `/health/live` |
| **BUG-2** | Critical | Security / WebSockets | `backend/src/infrastructure/socket.ts` | Handshake checks `decoded.sub` while JWT signs `userId` | User/org rooms never joined; anonymous case room eavesdropping | Check `decoded.userId \|\| decoded.sub` and enforce authorization |
| **BUG-3** | Critical | Security / Config | `backend/src/config/env.ts` | Hardcoded dev secrets fallback in production | Token forgery and signature bypass in production | Enforce required 32+ char secrets when `NODE_ENV === 'production'` |
| **BUG-4** | Critical | Security | `.env` | Plaintext Google SMTP app password in `.env` | Credential leakage and unauthorized mail dispatch | Revoke Google app password; keep `.env` git-ignored |
| **BUG-5** | Critical | Backend / Queues | `backend/src/modules/escalation/escalation.queue.ts` | Queues initialized on import before Redis connects | BullMQ never starts in production; background jobs run only in-memory | Initialize queues asynchronously after Redis connects |
| **BUG-6** | Critical | Security / IDOR | `backend/src/modules/cases/case.service.ts` | Missing caller ownership check on mark read endpoint | Any authenticated user can modify read receipts on any case | Add caller ownership and tenant validation |
| **BUG-7** | Critical | Performance / Security | `backend/src/middleware/fastCache.ts` | Unbounded in-memory `Map` cache with query string keys | Memory leak causing Out-Of-Memory DoS under attack | Replace with capped LRU cache or Redis cache |
| **BUG-8** | Critical | Security / DoS | `backend/src/middleware/rateLimiter.ts` | OTP rate limiter keyed solely on target email without IP | Unauthenticated attacker can lock out any citizen/admin | Key rate limiter by composite `${req.ip}:${target}` |
| **BUG-9** | High | WebSockets / UX | `frontend/src/services/socket.ts` | Event name mismatch (`join:case` vs `case:join`) | Real-time case room messages and status updates never received | Align event names to `case:join` and `case:leave` |
| **BUG-10** | High | WebSockets / Auth | `frontend/src/services/socket.ts` | Socket reads `cpet_auth_token` instead of `cpet_access_token` | Socket always connects as anonymous guest | Update key to `cpet_access_token` |
| **BUG-11** | High | Frontend / Data Loss | `frontend/src/pages/organization/OrgTeam.tsx` | Page uses hardcoded mock state; never calls backend API | Added team members disappear on page reload | Connect page to `/api/v1/organizations/:orgId/members` |
| **BUG-12** | High | Frontend / Data Loss | `frontend/src/pages/organization/OrgSettings.tsx` | `handleSave` shows fake notice without calling PATCH API | Organization settings and SLA benchmarks never persist | Connect page to `/api/v1/organizations/:orgId/settings` |
| **BUG-13** | High | Frontend / Multi-Tenancy | `frontend/src/pages/organization/OrgRequestQueue.tsx` | Hardcoded fallback ID `66d000000000000000000010` | Spurious 403 Forbidden errors and cross-tenant requests | Guard requests with `if (!user?.organizationId) return` |
| **BUG-14** | High | Backend / Integrations | `backend/src/modules/routing/connectors/email.connector.ts` | Email connector mocks dispatch; never sends actual email | External organizations never receive dispatched cases | Call `getEmailProvider().sendEmail()` |
| **BUG-15** | High | Frontend / Backend / UX | `frontend/src/pages/citizen/CitizenLogin.tsx` | UI prompts for phone number but backend only supports email | Nodemailer crashes or fails when phone number is entered | Restrict UI to email or implement SMS provider |
| **BUG-16** | High | Frontend / Auth | `frontend/src/context/AuthContext.tsx` | No silent token refresh interceptor on 401 | Users abruptly logged out every 15 minutes | Implement refresh token retry interceptor |
| **BUG-17** | High | Security / Auth | `frontend/src/context/AuthContext.tsx` | Logout fetch omits credentials and body | Refresh tokens remain unrevoked in database after logout | Pass `credentials: 'include'` and send refresh token |
| **BUG-18** | Medium | Security / XSS | `backend/src/middleware/security.ts` | Naive regex blacklist for HTML tags | XSS payloads with unhandled attributes bypass filter | Use DOMPurify / sanitize-html or HTML entity encoding |
| **BUG-19** | Medium | Database / Perf | `database/src/models/otp.model.ts` | Missing compound indexes on OTP and Destination models | High query latency and unindexed scans under load | Add compound indexes on frequently queried fields |
| **BUG-20** | Medium | Security | `database/src/models/destination.model.ts` | Destination `credentials` field missing `select: false` | Integration secrets returned in standard queries | Add `select: false` to schema |
| **BUG-21** | Medium | Performance / Bundle | `frontend/src/App.tsx` | Static page imports cause monolithic 505 kB bundle | Slower First Contentful Paint on mobile connections | Implement `React.lazy()` and code-splitting |
| **BUG-22** | Medium | Frontend / Quality | `frontend/src/pages/citizen/CitizenAiIntake.tsx` | Missing dependencies in React `useEffect` hooks | Stale closures or missed effect triggers | Wrap functions in `useCallback` and specify dependencies |
| **BUG-23** | Medium | Frontend / UX | `frontend/src/components/layout/CitizenShell.tsx` | Blood Hub & AI Intake missing from primary navbar | Users cannot navigate directly to key platform features | Add navigation links to `CitizenShell.tsx` |
| **BUG-24** | Medium | Frontend / UX | `frontend/src/pages/organization/OrgLogin.tsx` | OTP login does not verify role before navigating to dashboard | Citizens entering via Org login hit "Access Denied" loop | Check role in `handleVerifyOtp` before redirecting |
| **BUG-25** | Medium | Frontend / UX | `frontend/src/pages/citizen/CitizenBloodHub.tsx` | Pre-filled dummy numbers (`+91 9876543210`) in forms | Fake phone numbers submitted to database | Initialize fields with `user?.phone \|\| ''` |
| **BUG-26** | Low | Code Quality | `backend/src/infrastructure/socket.ts` | 25 unused variables and dead imports across backend | Cluttered codebase and misleading unused variables | Remove dead code and unused imports |
| **BUG-27** | Low | Testing | `database/package.json` | Zero database tests and only 1 frontend utility test | Regression risks in frontend and database plugins | Add integration tests for frontend and database |
| **BUG-28** | Low / Info | Documentation | `CPET_PROJECT_DOCUMENTATION.md` | Docs claim voice AI LLM; code uses deterministic regex | Inaccurate architectural documentation | Clarify that heuristics are used as offline baseline |
| **BUG-29** | Low / Info | Configuration | `.env.example` | Missing security environment variable declarations | Incomplete onboarding and deployment documentation | Add all supported environment variables to `.env.example` |
| **BUG-30** | Low | Backend / Cookies | `backend/src/modules/auth/controller.ts` | Cookie clear options omit `sameSite` and `secure` | Access cookies may persist after logout in HTTPS | Pass matching cookie attributes to `res.clearCookie` |

---

## Critical Path Analysis

The platform's primary end-to-end workflows and their breakdown points:

### 1. Citizen Registration & Authentication Workflow
```
User -> Signup Form -> Request Email OTP -> SMTPEmailProvider -> Enter 6 Digits -> Verify OTP -> Register User -> Set Cookies & LocalStorage -> Navigate to Home
```
* **Failure Points Identified:**
  - If user enters a phone number in "Email or Mobile Number", SMTP provider fails and throws a 503 error (**BUG-15**).
  - An attacker can DoS any citizen's email address by making 5 dummy verification requests (**BUG-8**).
  - After 15 minutes, access token expires, and with no refresh interceptor, the user is abruptly kicked out (**BUG-16**).
  - On logout, the refresh token is not revoked in MongoDB (**BUG-17**).

### 2. Case Creation, Routing & Real-Time Triage Workflow
```
Citizen -> AI Intake / Form -> Deterministic Routing -> Case Saved -> WebSocket Room Broadcast -> Org Queue -> Agent Assigned -> Resolution -> Citizen Rating
```
* **Failure Points Identified:**
  - Because WebSocket auth checks `decoded.sub` instead of `decoded.userId`, `socket.user` is undefined, and organization staff never join `org:${orgId}` (**BUG-2**).
  - When backend emits `org:new_case`, no staff socket receives the event (**BUG-2**).
  - Frontend emits `join:case`, but backend listens for `case:join`, so live case rooms are never joined (**BUG-9**).
  - If a case is routed to external email dispatch, `EmailConnector` generates a dummy message ID and never sends the email (**BUG-14**).
  - Any authenticated user can mark read receipts on any case via IDOR (**BUG-6**).

### 3. SLA Monitoring & Escalation Sweep Workflow
```
Case Created with SLA -> BullMQ Escalation Queue -> Periodic 60s Sweep -> SLA Breached -> Tier Escalation -> Supervisor Notification
```
* **Failure Points Identified:**
  - `EscalationQueueService` executes constructor logic before Redis connects, permanently falling back to an in-memory timer (**BUG-5**).
  - In multi-instance production environments, distributed sweep coordination fails.

### 4. Organization Operations Workflow
```
Org Admin -> Login -> Dashboard -> Request Queue -> Team Members -> Organization Settings
```
* **Failure Points Identified:**
  - Adding team members only updates local React state and never saves to the database (**BUG-11**).
  - Saving SLA settings only shows a local alert and never calls the backend API (**BUG-12**).
  - Organization views fall back to hardcoded mock ID `66d000000000000000000010`, causing 403 Forbidden errors (**BUG-13**).

### 5. Production Docker Deployment Workflow
```
Docker Compose Up -> Build Images -> MongoDB & Redis Healthcheck OK -> Start Backend -> Backend Healthcheck -> Start Frontend Nginx
```
* **Failure Points Identified:**
  - Healthcheck probes `http://localhost:5000/health`, which returns 404 Not Found (**BUG-1**).
  - Backend container is marked unhealthy; frontend container never starts.

---

## Priority Fix Plan

### PHASE 1 — CRITICAL (Security Breaches, Data Loss & Startup Blockers)
1. **Fix Docker Healthcheck**: Add `/health` route or point probe to `/health/live` in Dockerfiles and `docker-compose.prod.yml` (**BUG-1**).
2. **Fix WebSocket Authentication**: Read `decoded.userId || decoded.sub` in `socket.ts`, populate `socket.user`, auto-join rooms, and restrict room join permissions (**BUG-2**).
3. **Secure Secrets Configuration**: Mandate 32+ character secrets in production without insecure default fallbacks (**BUG-3**).
4. **Revoke Exposed Credentials**: Revoke Google App Password from `.env` and document placeholder configuration in `.env.example` (**BUG-4**, **BUG-29**).
5. **Fix Queue Initialization**: Move BullMQ queue and worker initialization to an async startup hook executed after Redis connects (**BUG-5**).
6. **Fix IDOR on Read Receipts**: Enforce requester and organization tenant ownership checks in `markMessagesAsRead()` (**BUG-6**).
7. **Fix Fast Cache Memory Leak**: Replace the unbounded `Map` in `fastCache.ts` with a capped LRU cache or Redis cache (**BUG-7**).
8. **Fix OTP Rate Limiting Key**: Key `otpRateLimiter` by `${req.ip}:${target}` to prevent unauthenticated targeted DoS (**BUG-8**).

### PHASE 2 — HIGH (Functional Failures, Broken Integrations & Data Persistence)
9. **Fix Socket Event Names**: Standardize event names across frontend and backend to `case:join` and `case:leave` (**BUG-9**).
10. **Fix Frontend Socket Token Key**: Update `socket.ts` to read `'cpet_access_token'` from `localStorage` (**BUG-10**).
11. **Connect Organization Team Management**: Replace mock state in `OrgTeam.tsx` with calls to `GET` and `POST /api/v1/organizations/:orgId/members` (**BUG-11**).
12. **Connect Organization Settings**: Wire `OrgSettings.tsx` to fetch settings on mount and persist updates via `PATCH /api/v1/organizations/:orgId/settings` (**BUG-12**).
13. **Remove Hardcoded Organization IDs**: Remove fallback mock ID `66d000000000000000000010` from `OrgRequestQueue.tsx` and `OrgRequestDetails.tsx` (**BUG-13**).
14. **Implement Real Email Dispatch**: Connect `EmailConnector.ts` to `getEmailProvider().sendEmail()` (**BUG-14**).
15. **Align OTP Delivery Methods**: Update citizen login input to specify email delivery or implement SMS provider (**BUG-15**).
16. **Implement Frontend Token Refresh**: Add silent refresh interceptor for 401 responses in `AuthContext.tsx` (**BUG-16**).
17. **Fix Logout Session Revocation**: Send credentials and refresh token during logout to revoke sessions in MongoDB (**BUG-17**).

### PHASE 3 — MEDIUM (Stability, UI/UX & Database Optimization)
18. **Harden XSS Sanitization**: Replace regex blacklist with robust HTML entity escaping or an established sanitizer (**BUG-18**).
19. **Add Compound Database Indexes**: Add compound indexes for OTP and Destination queries (**BUG-19**).
20. **Protect Destination Credentials**: Add `select: false` to `credentials` in `destination.model.ts` (**BUG-20**).
21. **Code-Split Frontend Routes**: Use `React.lazy()` and `Suspense` in `App.tsx` to split the 505 kB bundle (**BUG-21**).
22. **Fix React Hook Dependencies**: Wrap effect functions in `useCallback` and fix linter dependency warnings (**BUG-22**).
23. **Update Citizen Navigation**: Add direct links for Blood Hub and AI Intake in `CitizenShell.tsx` (**BUG-23**).
24. **Improve Org Login Role Validation**: Validate user role in OTP verification before redirecting (**BUG-24**).
25. **Remove Hardcoded Phone Numbers**: Clear pre-filled dummy numbers from form states in Blood Hub and Settings (**BUG-25**).

### PHASE 4 — LOW & INFORMATIONAL (Cleanup & Documentation)
26. **Clean Up Unused Variables**: Remove 25 unused variables and dead imports across backend modules (**BUG-26**).
27. **Expand Frontend & Database Tests**: Add component integration tests and model unit tests (**BUG-27**).
28. **Update Documentation**: Align documentation with heuristic engine baseline (**BUG-28**).
29. **Document Environment Variables**: Complete `.env.example` with all configuration keys (**BUG-29**).
30. **Align Cookie Clear Options**: Ensure `res.clearCookie()` options match creation parameters (**BUG-30**).
