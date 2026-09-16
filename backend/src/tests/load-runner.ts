process.env.CPET_LOAD_TEST = 'true';
import http from 'http';
import { createApp } from '../app.js';
import { memoryStore } from '../infrastructure/store.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

interface ScenarioResult {
  name: string;
  totalRequests: number;
  durationSeconds: number;
  rps: number;
  minLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  successRate: number;
  errorCount: number;
}

// Generate valid JWT token for authenticated load testing
const testToken = jwt.sign(
  {
    userId: '66d000000000000000000099',
    email: 'citizen@cpet.org',
    role: 'CITIZEN',
    organizationId: null,
  },
  env.JWT_SECRET,
  { expiresIn: '1h' }
);

async function runScenario(
  name: string,
  port: number,
  path: string,
  method: string,
  headers: Record<string, string>,
  body: any,
  concurrency: number,
  targetRequests: number
): Promise<ScenarioResult> {
  const agent = new http.Agent({
    keepAlive: true,
    maxSockets: concurrency * 2,
    maxFreeSockets: concurrency,
    timeout: 5000,
  });

  const latencies: number[] = [];
  let completed = 0;
  let errors = 0;

  const sendOneRequest = (): Promise<void> => {
    return new Promise((resolve) => {
      const start = performance.now();
      const payload = body ? JSON.stringify(body) : undefined;

      const reqHeaders = {
        ...headers,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      };

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: reqHeaders,
          agent,
        },
        (res) => {
          res.resume(); // consume response stream
          res.on('end', () => {
            const duration = performance.now() - start;
            latencies.push(duration);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
              completed++;
            } else {
              errors++;
            }
            resolve();
          });
        }
      );

      req.on('error', () => {
        errors++;
        resolve();
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  };

  const startTime = performance.now();

  // Execute requests in concurrent workers
  const worker = async () => {
    while (completed + errors < targetRequests) {
      await sendOneRequest();
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const totalTimeSeconds = (performance.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;

  const rps = Math.round(completed / totalTimeSeconds);
  const successRate = Math.round((completed / (completed + errors)) * 1000) / 10;

  return {
    name,
    totalRequests: completed + errors,
    durationSeconds: Math.round(totalTimeSeconds * 100) / 100,
    rps,
    minLatencyMs: Math.round(min * 10) / 10,
    p50LatencyMs: Math.round(p50 * 10) / 10,
    p95LatencyMs: Math.round(p95 * 10) / 10,
    p99LatencyMs: Math.round(p99 * 10) / 10,
    maxLatencyMs: Math.round(max * 10) / 10,
    successRate,
    errorCount: errors,
  };
}

export async function runAllLoadTests(): Promise<ScenarioResult[]> {
  memoryStore.seedDefaults();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const port = address.port;

  console.log(`\n================================================================`);
  console.log(`CPET PRODUCTION LOAD TEST RUNNER — 750 RPS BENCHMARK TARGET`);
  console.log(`Ephemeral Server Listening on: 127.0.0.1:${port}`);
  console.log(`================================================================\n`);

  const results: ScenarioResult[] = [];

  // 1. Health Liveness (Stateless Gateway Baseline)
  console.log(`[1/4] Running Scenario 1: Stateless Health & Gateway Throughput (Target: 3,000 requests, 50 concurrency)...`);
  const s1 = await runScenario(
    'Gateway Liveness (GET /health/live)',
    port,
    '/health/live',
    'GET',
    {},
    null,
    50,
    3000
  );
  results.push(s1);

  // 2. Cached Domain Discovery
  console.log(`[2/4] Running Scenario 2: Cached Public Domain Discovery (Target: 3,000 requests, 50 concurrency)...`);
  const s2 = await runScenario(
    'Cached Domain Config (GET /api/v1/domains)',
    port,
    '/api/v1/domains',
    'GET',
    {},
    null,
    50,
    3000
  );
  results.push(s2);

  // 3. Authenticated Directory Querying
  console.log(`[3/4] Running Scenario 3: Organization Directory Querying (Target: 2,500 requests, 40 concurrency)...`);
  const s3 = await runScenario(
    'Directory Query (GET /api/v1/routing/directory?q=lloyd)',
    port,
    '/api/v1/routing/directory?q=lloyd',
    'GET',
    { Authorization: `Bearer ${testToken}` },
    null,
    40,
    2500
  );
  results.push(s3);

  // 4. Authenticated Case Listing with Pagination
  console.log(`[4/4] Running Scenario 4: Authenticated Case Retrieval & Pagination (Target: 2,500 requests, 40 concurrency)...`);
  const s4 = await runScenario(
    'Case Retrieval & Pagination (GET /api/v1/cases/my?page=1&limit=10)',
    port,
    '/api/v1/cases/my?page=1&limit=10',
    'GET',
    { Authorization: `Bearer ${testToken}` },
    null,
    40,
    2500
  );
  results.push(s4);

  server.close();

  // Print results table
  console.log(`\n========================================================================================================`);
  console.log(`PERFORMANCE BENCHMARK RESULTS MATRIX (Target: 750 Requests/Sec)`);
  console.log(`========================================================================================================`);
  console.table(
    results.map((r) => ({
      'Scenario': r.name,
      'Total Reqs': r.totalRequests,
      'Duration (s)': r.durationSeconds,
      'Measured RPS': `${r.rps} req/s`,
      'p50 (ms)': `${r.p50LatencyMs} ms`,
      'p95 (ms)': `${r.p95LatencyMs} ms`,
      'p99 (ms)': `${r.p99LatencyMs} ms`,
      'Success %': `${r.successRate}%`,
      'Target Met (>=750)': r.rps >= 750 ? 'YES PASS' : 'NO FAIL',
    }))
  );

  return results;
}

// Execute standalone when run via tsx
if (process.argv[1]?.includes('load-runner')) {
  runAllLoadTests()
    .then((results) => {
      const topRps = Math.max(...results.map((r) => r.rps));
      console.log(`\nLoad test suite completed. Peak achieved throughput: ${topRps} RPS.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Load test run failed:', err);
      process.exit(1);
    });
}
