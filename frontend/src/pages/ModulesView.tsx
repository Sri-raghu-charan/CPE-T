import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Skeleton } from '../design-system/index.js';
import { CheckCircle2, Layers } from 'lucide-react';

interface ModuleApiResponse {
  version: string;
  description: string;
  modules: string[];
}

export const ModulesView: React.FC = () => {
  const [data, setData] = useState<ModuleApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchModules() {
      try {
        const res = await fetch('/api/v1');
        if (!res.ok) {
          throw new Error(`Failed to load modules: HTTP ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchModules();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          CPET Modular Monolith Architecture
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Registered backend architectural domains established without premature feature clutter.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-slate-100 text-slate-800">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Architecture Registry</CardTitle>
                <CardDescription>Directly retrieved from backend /api/v1 versioned gateway</CardDescription>
              </div>
            </div>
            {data && <Badge variant="progress">API {data.version}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
              Note: Backend dev server not yet connected via proxy ({error}).
            </div>
          )}

          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {data.modules.map((mod) => (
                <div
                  key={mod}
                  className="flex items-center gap-2 p-3 rounded-md border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-mono font-medium text-slate-800">{mod}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
