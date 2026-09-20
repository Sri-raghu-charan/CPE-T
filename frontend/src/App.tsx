import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';

// Layouts
import { AppShell } from './components/layout/AppShell.js';
import { CitizenShell } from './components/layout/CitizenShell.js';
import { OrgShell } from './components/layout/OrgShell.js';

// Public & Gateway Pages (Lazy Loaded)
const SplashScreen = lazy(() => import('./pages/SplashScreen.js').then((m) => ({ default: m.SplashScreen })));
const ArchitectureOverview = lazy(() => import('./pages/ArchitectureOverview.js').then((m) => ({ default: m.ArchitectureOverview })));
const DesignSystemShowcase = lazy(() => import('./pages/DesignSystemShowcase.js').then((m) => ({ default: m.DesignSystemShowcase })));
const ModulesView = lazy(() => import('./pages/ModulesView.js').then((m) => ({ default: m.ModulesView })));
const HealthView = lazy(() => import('./pages/HealthView.js').then((m) => ({ default: m.HealthView })));

// Citizen Auth & Workspace (Lazy Loaded)
const CitizenLogin = lazy(() => import('./pages/citizen/CitizenLogin.js').then((m) => ({ default: m.CitizenLogin })));
const CitizenSignup = lazy(() => import('./pages/citizen/CitizenSignup.js').then((m) => ({ default: m.CitizenSignup })));
const CitizenHome = lazy(() => import('./pages/citizen/CitizenHome.js').then((m) => ({ default: m.CitizenHome })));
const CitizenProfile = lazy(() => import('./pages/citizen/CitizenProfile.js').then((m) => ({ default: m.CitizenProfile })));
const CitizenMyRequests = lazy(() => import('./pages/citizen/CitizenMyRequests.js').then((m) => ({ default: m.CitizenMyRequests })));
const CitizenNewRequest = lazy(() => import('./pages/citizen/CitizenNewRequest.js').then((m) => ({ default: m.CitizenNewRequest })));
const CitizenCaseDetails = lazy(() => import('./pages/citizen/CitizenCaseDetails.js').then((m) => ({ default: m.CitizenCaseDetails })));
const CitizenAiIntake = lazy(() => import('./pages/citizen/CitizenAiIntake.js').then((m) => ({ default: m.CitizenAiIntake })));
const CitizenBloodHub = lazy(() => import('./pages/citizen/CitizenBloodHub.js').then((m) => ({ default: m.CitizenBloodHub })));

// Organization Auth & Workspace (Lazy Loaded)
const OrgLogin = lazy(() => import('./pages/organization/OrgLogin.js').then((m) => ({ default: m.OrgLogin })));
const OrgOnboarding = lazy(() => import('./pages/organization/OrgOnboarding.js').then((m) => ({ default: m.OrgOnboarding })));
const OrgDashboard = lazy(() => import('./pages/organization/OrgDashboard.js').then((m) => ({ default: m.OrgDashboard })));
const OrgRequestQueue = lazy(() => import('./pages/organization/OrgRequestQueue.js').then((m) => ({ default: m.OrgRequestQueue })));
const OrgRequestDetails = lazy(() => import('./pages/organization/OrgRequestDetails.js').then((m) => ({ default: m.OrgRequestDetails })));
const OrgTeam = lazy(() => import('./pages/organization/OrgTeam.js').then((m) => ({ default: m.OrgTeam })));
const OrgSettings = lazy(() => import('./pages/organization/OrgSettings.js').then((m) => ({ default: m.OrgSettings })));

const PageFallback: React.FC = () => (
  <div className="flex min-h-[60vh] items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      <span className="text-sm font-medium text-slate-500">Loading...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
          {/* Splash Gateway */}
          <Route path="/" element={<SplashScreen />} />

          {/* Foundation & Design System (Phase 1 Inspection) */}
          <Route element={<AppShell />}>
            <Route path="/foundation" element={<ArchitectureOverview />} />
            <Route path="/design-system" element={<DesignSystemShowcase />} />
            <Route path="/modules" element={<ModulesView />} />
            <Route path="/health" element={<HealthView />} />
          </Route>

          {/* Citizen Authentication */}
          <Route path="/citizen/login" element={<CitizenLogin />} />
          <Route path="/citizen/signup" element={<CitizenSignup />} />

          {/* Citizen Protected Workspace */}
          <Route
            path="/citizen"
            element={
              <ProtectedRoute allowedRoles={['CITIZEN', 'DONOR', 'SUPER_ADMIN', 'CPET_ADMIN']} redirectPath="/citizen/login">
                <CitizenShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/citizen/home" replace />} />
            <Route path="home" element={<CitizenHome />} />
            <Route path="intake" element={<CitizenAiIntake />} />
            <Route path="requests" element={<CitizenMyRequests />} />
            <Route path="requests/new" element={<CitizenNewRequest />} />
            <Route path="requests/:id" element={<CitizenCaseDetails />} />
            <Route path="blood" element={<CitizenBloodHub />} />
            <Route path="blood/new" element={<CitizenBloodHub />} />
            <Route path="profile" element={<CitizenProfile />} />
          </Route>

          {/* Organization Authentication */}
          <Route path="/organization/login" element={<OrgLogin />} />
          <Route path="/organization/onboarding" element={<OrgOnboarding />} />

          {/* Organization Protected Workspace */}
          <Route
            path="/organization"
            element={
              <ProtectedRoute
                allowedRoles={['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'SUPER_ADMIN', 'CPET_ADMIN']}
                redirectPath="/organization/login"
              >
                <OrgShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/organization/dashboard" replace />} />
            <Route path="dashboard" element={<OrgDashboard />} />
            <Route path="requests" element={<OrgRequestQueue />} />
            <Route path="requests/:id" element={<OrgRequestDetails />} />
            <Route path="team" element={<OrgTeam />} />
            <Route path="settings" element={<OrgSettings />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </AuthProvider>
  );
};
