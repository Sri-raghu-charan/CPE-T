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
const CitizenFormsCatalog = lazy(() => import('./pages/citizen/CitizenFormsCatalog.js').then((m) => ({ default: m.CitizenFormsCatalog })));
const CitizenDynamicFormView = lazy(() => import('./pages/citizen/CitizenDynamicFormView.js').then((m) => ({ default: m.CitizenDynamicFormView })));
const CitizenProfile = lazy(() => import('./pages/citizen/CitizenProfile.js').then((m) => ({ default: m.CitizenProfile })));
const CitizenMyRequests = lazy(() => import('./pages/citizen/CitizenMyRequests.js').then((m) => ({ default: m.CitizenMyRequests })));
const CitizenNewRequest = lazy(() => import('./pages/citizen/CitizenNewRequest.js').then((m) => ({ default: m.CitizenNewRequest })));
const CitizenCaseDetails = lazy(() => import('./pages/citizen/CitizenCaseDetails.js').then((m) => ({ default: m.CitizenCaseDetails })));
const CitizenAiIntake = lazy(() => import('./pages/citizen/CitizenAiIntake.js').then((m) => ({ default: m.CitizenAiIntake })));
const CitizenBloodHub = lazy(() => import('./pages/citizen/CitizenBloodHub.js').then((m) => ({ default: m.CitizenBloodHub })));
const CitizenHelp = lazy(() => import('./pages/citizen/CitizenHelp.js').then((m) => ({ default: m.CitizenHelp })));

// Organization Auth & Workspace (Lazy Loaded)
const OrgLogin = lazy(() => import('./pages/organization/OrgLogin.js').then((m) => ({ default: m.OrgLogin })));
const OrgOnboarding = lazy(() => import('./pages/organization/OrgOnboarding.js').then((m) => ({ default: m.OrgOnboarding })));
const OrgDashboard = lazy(() => import('./pages/organization/OrgDashboard.js').then((m) => ({ default: m.OrgDashboard })));
const OrgFormsList = lazy(() => import('./pages/organization/OrgFormsList.js').then((m) => ({ default: m.OrgFormsList })));
const OrgFormBuilder = lazy(() => import('./pages/organization/OrgFormBuilder.js').then((m) => ({ default: m.OrgFormBuilder })));
const OrgFormSubmissions = lazy(() => import('./pages/organization/OrgFormSubmissions.js').then((m) => ({ default: m.OrgFormSubmissions })));
const OrgRequestQueue = lazy(() => import('./pages/organization/OrgRequestQueue.js').then((m) => ({ default: m.OrgRequestQueue })));
const OrgRequestDetails = lazy(() => import('./pages/organization/OrgRequestDetails.js').then((m) => ({ default: m.OrgRequestDetails })));
const OrgTimelineExpanded = lazy(() => import('./pages/organization/OrgTimelineExpanded.js').then((m) => ({ default: m.OrgTimelineExpanded })));
const OrgTeam = lazy(() => import('./pages/organization/OrgTeam.js').then((m) => ({ default: m.OrgTeam })));
const OrgAddTeamMember = lazy(() => import('./pages/organization/OrgAddTeamMember.js').then((m) => ({ default: m.OrgAddTeamMember })));
const OrgSettings = lazy(() => import('./pages/organization/OrgSettings.js').then((m) => ({ default: m.OrgSettings })));
const OrgProfile = lazy(() => import('./pages/organization/OrgProfile.js').then((m) => ({ default: m.OrgProfile })));
const OrgNotifications = lazy(() => import('./pages/organization/OrgNotifications.js').then((m) => ({ default: m.OrgNotifications })));
const OrgPerformance = lazy(() => import('./pages/organization/OrgPerformance.js').then((m) => ({ default: m.OrgPerformance })));

// Public Direct Online Form Gateway
const PublicFormView = lazy(() => import('./pages/public/PublicFormView.js').then((m) => ({ default: m.PublicFormView })));

// Admin Portal & Workspace (Lazy Loaded)
const AdminLanding = lazy(() => import('./pages/admin/AdminLanding.js').then((m) => ({ default: m.AdminLanding })));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.js').then((m) => ({ default: m.AdminLogin })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.js').then((m) => ({ default: m.AdminDashboard })));
const AdminOrganizations = lazy(() => import('./pages/admin/AdminOrganizations.js').then((m) => ({ default: m.AdminOrganizations })));
const AdminOrgDetails = lazy(() => import('./pages/admin/AdminOrgDetails.js').then((m) => ({ default: m.AdminOrgDetails })));
const AdminServices = lazy(() => import('./pages/admin/AdminServices.js').then((m) => ({ default: m.AdminServices })));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.js').then((m) => ({ default: m.AdminSettings })));

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

          {/* Direct Public Form Access Routes (Online Forms) */}
          <Route path="/forms/:id" element={<PublicFormView />} />
          <Route path="/public/forms/:id" element={<PublicFormView />} />

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
            <Route path="forms" element={<CitizenFormsCatalog />} />
            <Route path="forms/:id" element={<CitizenDynamicFormView />} />
            <Route path="intake" element={<CitizenAiIntake />} />
            <Route path="requests" element={<CitizenMyRequests />} />
            <Route path="requests/new" element={<CitizenNewRequest />} />
            <Route path="requests/:id" element={<CitizenCaseDetails />} />
            <Route path="blood" element={<CitizenBloodHub />} />
            <Route path="blood/new" element={<CitizenBloodHub />} />
            <Route path="help" element={<CitizenHelp />} />
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
            <Route path="forms" element={<OrgFormsList />} />
            <Route path="forms/new" element={<OrgFormBuilder />} />
            <Route path="forms/:id/edit" element={<OrgFormBuilder />} />
            <Route path="forms/:id/submissions" element={<OrgFormSubmissions />} />
            <Route path="requests" element={<OrgRequestQueue />} />
            <Route path="requests/:id" element={<OrgRequestDetails />} />
            <Route path="requests/:id/timeline" element={<OrgTimelineExpanded />} />
            <Route path="team" element={<OrgTeam />} />
            <Route path="team/new" element={<OrgAddTeamMember />} />
            <Route path="settings" element={<OrgSettings />} />
            <Route path="profile" element={<OrgProfile />} />
            <Route path="notifications" element={<OrgNotifications />} />
            <Route path="performance" element={<OrgPerformance />} />
            <Route path="sla" element={<OrgPerformance />} />
          </Route>

          {/* Admin Portal Flow (Screens 1, 2, 3, 4 & 5 + Services & Settings) */}
          <Route path="/admin" element={<AdminLanding />} />
          <Route path="/admin/welcome" element={<AdminLanding />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/organizations" element={<AdminOrganizations />} />
          <Route path="/admin/organizations/:id" element={<AdminOrgDetails />} />
          <Route path="/admin/services" element={<AdminServices />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/forms" element={<OrgFormsList />} />
          <Route path="/admin/requests" element={<OrgRequestQueue />} />
          <Route path="/admin/requests/:id" element={<OrgRequestDetails />} />
          <Route path="/admin/requests/:id/timeline" element={<OrgTimelineExpanded />} />
          <Route path="/admin/team" element={<OrgTeam />} />
          <Route path="/admin/team/new" element={<OrgAddTeamMember />} />
          <Route path="/admin/profile" element={<OrgProfile />} />
          <Route path="/admin/notifications" element={<OrgNotifications />} />
          <Route path="/admin/performance" element={<OrgPerformance />} />
          <Route path="/admin/sla" element={<OrgPerformance />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </AuthProvider>
  );
};
