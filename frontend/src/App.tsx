import React from 'react';
import { Toaster } from 'sonner';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { EventProvider } from './context/EventContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Reports } from './pages/Reports';
import { Events } from './pages/Events';
import { CampaignManagement } from './pages/CampaignManagement';
import { Unsubscribe } from './pages/Unsubscribe';
import { QRScanner } from './pages/QRScanner';
import { AIConcierge } from './pages/AIConcierge';
import { UserManagement } from './pages/UserManagement';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { AIPRStudio } from './pages/AIPRStudio';
import { FeedbackSummary } from './pages/FeedbackSummary';
import { SystemLogs } from './pages/SystemLogs';
import { SpeakerDashboard } from './pages/SpeakerDashboard';
import { SpeakerControlCenter } from './pages/SpeakerControlCenter';
import { LandingPage } from './pages/LandingPage';
import { Settings } from './pages/Settings';
import { ManagerSessions } from './pages/ManagerSessions';
import { ManagerTickets } from './pages/ManagerTickets';
import { ManagerAttendees } from './pages/ManagerAttendees';
import { ManagerSpeakers } from './pages/ManagerSpeakers';
import { ManagerStaff } from './pages/ManagerStaff';
import { NotificationsPage } from './pages/NotificationsPage';
import { StaffEvents } from './pages/StaffEvents';
import { StaffAttendees } from './pages/StaffAttendees';
import { StaffRegistrationSupport } from './pages/StaffRegistrationSupport';
import { StaffSchedule } from './pages/StaffSchedule';
import { StaffTasks } from './pages/StaffTasks';
import { StaffReports } from './pages/StaffReports';

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Standalone Public Portal Landing Page at root "/" */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />

      {/* Standalone Public Unsubscribe Page */}
      <Route path="/unsubscribe" element={<Unsubscribe />} />

      {/* Auth Screen */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Navigate to="/login?mode=register" replace />} />

      {/* Main Single Persistent Layout Shell — Accessible to public & authenticated users */}
      <Route element={<MainLayout />}>
        {/* 4 Role-Based Dashboards (Attendee, Staff, Organizer, Admin) */}
        <Route
          path="dashboard"
          element={
            <Dashboard onNavigateTab={(tab: string) => navigate(`/${tab === 'schedule' ? 'events' : tab}`)} />
          }

        />

        {/* Events Catalog — All roles */}
        <Route path="events" element={<Events />} />

        {/* Email Marketing Campaigns — Admin, Event Manager */}
        <Route
          path="campaigns"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER']}
              onRedirect={() => navigate('/dashboard')}
            >
              <CampaignManagement />
            </ProtectedRoute>
          }
        />

        {/* Reports - Admin, Event Manager, Auditor */}
        <Route
          path="reports"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'AUDITOR']}
              redirectTo="/dashboard"
            >
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* QR Check-in — Admin, Staff, Event Manager */}
        <Route
          path="check-in"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'SUPER_ADMIN', 'STAFF', 'EVENT_MANAGER']}
              redirectTo="/dashboard"
            >
              <QRScanner />
            </ProtectedRoute>
          }
        />

        {/* AI Concierge / HITL Inquiries — Admin, Staff, Event Manager */}
        <Route
          path="inquiries"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'SUPER_ADMIN', 'STAFF', 'EVENT_MANAGER']}
              redirectTo="/dashboard"
            >
              <AIConcierge />
            </ProtectedRoute>
          }
        />

        {/* AI PR Studio — Admin, Event Manager */}
        <Route
          path="content-studio"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'SUPER_ADMIN', 'EVENT_MANAGER']}
              redirectTo="/dashboard"
            >
              <AIPRStudio />
            </ProtectedRoute>
          }
        />
        <Route
          path="pr-studio"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'SUPER_ADMIN', 'EVENT_MANAGER']}
              redirectTo="/dashboard"
            >
              <AIPRStudio />
            </ProtectedRoute>
          }
        />

        {/* Knowledge Base — Admin, Event Manager */}
        <Route
          path="knowledge-base"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'SUPER_ADMIN', 'EVENT_MANAGER']}
              redirectTo="/dashboard"
            >
              <KnowledgeBase />
            </ProtectedRoute>
          }
        />

        {/* Feedback Summary — Admin, Staff, Event Manager, Speaker */}
        <Route
          path="feedback"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'SUPER_ADMIN', 'STAFF', 'EVENT_MANAGER', 'SPEAKER']}
              redirectTo="/events"
            >
              <FeedbackSummary />
            </ProtectedRoute>
          }
        />
        <Route
          path="feedback-summary"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'SUPER_ADMIN', 'STAFF', 'EVENT_MANAGER', 'SPEAKER']}
              redirectTo="/events"
            >
              <FeedbackSummary />
            </ProtectedRoute>
          }
        />


        {/* User Management — Admin only */}
        <Route
          path="users"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'SUPER_ADMIN']}
              redirectTo="/dashboard"
            >
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'SUPER_ADMIN']}
              redirectTo="/dashboard"
            >
              <UserManagement />
            </ProtectedRoute>
          }
        />

        {/* System & Security Logs — Admin only (Hidden from EVENT_MANAGER, SPEAKER, ATTENDEE) */}
        <Route
          path="logs"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'SUPER_ADMIN', 'AUDITOR']}
              redirectTo="/dashboard"
            >
              <SystemLogs />
            </ProtectedRoute>
          }
        />

        {/* Speaker Portal Dashboard — Speaker, Admin, Event Manager (Task 32) */}
        <Route
          path="speaker/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={['SPEAKER', 'ADMIN', 'SUPER_ADMIN', 'EVENT_MANAGER']}
              redirectTo="/events"
            >
              <SpeakerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Speaker Stage Control Center (Studio Dark Mode) — Speaker, Admin (Task 32) */}
        <Route
          path="speaker/session/:sessionId"
          element={
            <ProtectedRoute
              allowedRoles={['SPEAKER', 'ADMIN', 'SUPER_ADMIN', 'EVENT_MANAGER']}
              redirectTo="/events"
            >
              <SpeakerControlCenter />
            </ProtectedRoute>
          }
        />

        {/* Manager Dedicated Submodules */}
        <Route
          path="manager/sessions"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'ORGANIZER']}
              redirectTo="/dashboard"
            >
              <ManagerSessions />
            </ProtectedRoute>
          }
        />
        <Route
          path="manager/tickets"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'ORGANIZER']}
              redirectTo="/dashboard"
            >
              <ManagerTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="manager/attendees"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'ORGANIZER']}
              redirectTo="/dashboard"
            >
              <ManagerAttendees />
            </ProtectedRoute>
          }
        />
        <Route
          path="manager/speakers"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'ORGANIZER']}
              redirectTo="/dashboard"
            >
              <ManagerSpeakers />
            </ProtectedRoute>
          }
        />
        <Route
          path="manager/staff"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'ORGANIZER']}
              redirectTo="/dashboard"
            >
              <ManagerStaff />
            </ProtectedRoute>
          }
        />

        {/* Staff Dedicated Submodules */}
        <Route
          path="staff/events"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'STAFF']}
              redirectTo="/dashboard"
            >
              <StaffEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/attendees"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'STAFF']}
              redirectTo="/dashboard"
            >
              <StaffAttendees />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/registration-support"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'STAFF']}
              redirectTo="/dashboard"
            >
              <StaffRegistrationSupport />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/schedule"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'STAFF']}
              redirectTo="/dashboard"
            >
              <StaffSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/tasks"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'STAFF']}
              redirectTo="/dashboard"
            >
              <StaffTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/reports"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'STAFF']}
              redirectTo="/dashboard"
            >
              <StaffReports />
            </ProtectedRoute>
          }
        />

        <Route
          path="notifications"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'ORGANIZER', 'STAFF', 'SPEAKER', 'ATTENDEE']}
              redirectTo="/dashboard"
            >
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Settings — All authenticated roles (Task 65) */}
        <Route
          path="settings"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'SUPER_ADMIN', 'EVENT_MANAGER', 'ORGANIZER', 'SPEAKER', 'ATTENDEE', 'STAFF']}
              redirectTo="/login"
            >
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Catch-all inner route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1029384756-demo-eventhub-ai.apps.googleusercontent.com';

export const AppContent: React.FC = () => (
  <BrowserRouter>
    <Toaster position="top-right" richColors theme="light" />
    <AppRoutes />
  </BrowserRouter>
);

export const App: React.FC = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <AuthProvider>
      <EventProvider>
        <AppContent />
      </EventProvider>
    </AuthProvider>
  </GoogleOAuthProvider>
);

export default App;
