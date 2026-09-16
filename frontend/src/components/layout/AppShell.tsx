import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header.js';
import { Sidebar } from './Sidebar.js';

export const AppShell: React.FC = () => {
  const [backendLive, setBackendLive] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function checkBackend() {
      try {
        const res = await fetch('/health/live');
        if (isMounted) {
          setBackendLive(res.ok);
        }
      } catch {
        if (isMounted) {
          setBackendLive(false);
        }
      }
    }

    checkBackend();
    const interval = setInterval(checkBackend, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header backendLive={backendLive} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
