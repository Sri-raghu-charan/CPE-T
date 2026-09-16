import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Skeleton, Button } from '../design-system/index.js';
import { RefreshCw } from 'lucide-react';

export const HealthView: React.FC = () => {
  const [liveData, setLiveData] = useState<any>(null);
  const [readyData, setReadyData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function checkProbes() {
    setLoading(true);
    try {
      const [liveRes, readyRes] = await Promise.all([
        fetch('/health/live'),
        fetch('/health/ready'),
      ]);
      setLiveData(await liveRes.json());
      setReadyData(await readyRes.json());
    } catch (err: any) {
      console.warn('Probe check failed', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkProbes();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Probes & Diagnostics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time verification of backend liveness, readiness, database pooling, and cache infrastructure.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={checkProbes} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Refresh Probes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Liveness Probe */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Liveness Probe</CardTitle>
              {liveData?.status === 'ok' ? (
                <Badge variant="resolved">Healthy</Badge>
              ) : (
                <Badge variant="pending">Pending / Unknown</Badge>
              )}
            </div>
            <CardDescription>GET /health/live (Process uptime & availability)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : liveData ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-mono font-semibold text-slate-900">{liveData.status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Uptime:</span>
                  <span className="font-mono text-slate-900">{liveData.uptimeSeconds} seconds</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Last Checked:</span>
                  <span className="font-mono text-slate-900">{liveData.timestamp}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Backend probe not reached.</p>
            )}
          </CardContent>
        </Card>

        {/* Readiness Probe */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Readiness Probe</CardTitle>
              {readyData?.status === 'ready' ? (
                <Badge variant="resolved">Ready</Badge>
              ) : (
                <Badge variant="escalated">Degraded (Dev Standalone)</Badge>
              )}
            </div>
            <CardDescription>GET /health/ready (MongoDB & Redis connectivity)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : readyData ? (
              <div className="space-y-3 text-xs">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800">MongoDB:</span>
                    <span className="font-mono">{readyData.services?.database?.status}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ReadyState: {readyData.services?.database?.readyState} | Latency: {readyData.services?.database?.latencyMs ?? 'N/A'}ms
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800">Redis:</span>
                    <span className="font-mono">{readyData.services?.redis?.status}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Latency: {readyData.services?.redis?.latencyMs ?? 'N/A'}ms
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Backend probe not reached.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
