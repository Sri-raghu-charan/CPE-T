import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';

// Layouts
import { AppShell } from './components/layout/AppShell.js';
import { CitizenShell } from './components/layout/CitizenShell.js';
import { OrgShell } from './components/layout/OrgShell.js';

// Public & Gateway Pages
import { SplashScreen } from './pages/SplashScreen.js';
import { ArchitectureOverview } from './pages/ArchitectureOverview.js';
import { DesignSystemShowcase } from './pages/DesignSystemShowcase.js';
import { ModulesView } from './pages/ModulesView.js';
import { HealthView } from './pages/HealthView.js';

// Citizen Auth & Workspace
import { CitizenLogin } from './pages/citizen/CitizenLogin.js';
import { CitizenSignup } from './pages/citizen/CitizenSignup.js';
import { CitizenHome } from './pages/citizen/CitizenHome.js';
import { CitizenProfile } from './pages/citizen/CitizenProfile.js';
import { CitizenMyRequests } from './pages/citizen/CitizenMyRequests.js';
import { CitizenNewRequest } from './pages/citizen/CitizenNewRequest.js';
import { CitizenCaseDetails } from './pages/citizen/CitizenCaseDetails.js';
import { CitizenAiIntake } from './pages/citizen/CitizenAiIntake.js';
import { CitizenBloodHub } from './pages/citizen/CitizenBloodHub.js';

// Organization Auth & Workspace
import { OrgLogin } from './pages/organization/OrgLogin.js';
import { OrgOnboarding } from './pages/organization/OrgOnboarding.js';
import { OrgDashboard } from './pages/organization/OrgDashboard.js';
import { OrgRequestQueue } from './pages/organization/OrgRequestQueue.js';
import { OrgRequestDetails } from './pages/organization/OrgRequestDetails.js';
import { OrgTeam } from './pages/organization/OrgTeam.js';
import { OrgSettings } from './pages/organization/OrgSettings.js';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
};
