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
import { EventSchedule } from './components/EventSchedule';
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

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Standalone Public Portal Landing Page at root "/" */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />

      {/* Auth Screen */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Navigate to="/login?mode=register" replace />} />

      {/* Main Single Persistent Layout Shell — Accessible to public & authenticated users */}
      <Route element={<MainLayout />}>
        {/* 4 Role-Based Dashboards (Attendee, Staff, Organizer, Admin) */}
        <Route
          path="dashboard"
          element={
            <Dashboard onNavigateTab={(tab) => navigate(`/${tab === 'schedule' ? 'events' : tab}`)} />
          }
        />

        {/* Events Catalog — All roles */}
        
        {/* Reports - Admin, Event Manager, Auditor */}
        <Route
          path="reports"
          element={
            <ProtectedRoute
              allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'AUDITOR']}
              onRedirect={() => navigate('/dashboard')}
            >
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route path="events" element={<EventSchedule />} />

        {/* QR Check-in — Admin, Staff, Event Manager */}
        <Route
          path="check-in"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'STAFF', 'EVENT_MANAGER']}
              onRedirect={() => navigate('/dashboard')}
            >
              <QRScanner />
            </ProtectedRoute>
          }
        />

        {/* AI Concierge / HITL Inquiries — Admin, Staff */}
        <Route
          path="inquiries"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'STAFF']}
              onRedirect={() => navigate('/dashboard')}
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
              allowedRoles={['ADMIN', 'EVENT_MANAGER']}
              onRedirect={() => navigate('/dashboard')}
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
              allowedRoles={['ADMIN', 'EVENT_MANAGER']}
              onRedirect={() => navigate('/dashboard')}
            >
              <KnowledgeBase />
            </ProtectedRoute>
          }
        />

        {/* Feedback Summary — Admin, Staff, Event Manager */}
        <Route
          path="feedback"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'STAFF', 'EVENT_MANAGER']}
              onRedirect={() => navigate('/events')}
            >
              <FeedbackSummary />
            </ProtectedRoute>
          }
        />
        <Route
          path="feedback-summary"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'STAFF', 'EVENT_MANAGER']}
              onRedirect={() => navigate('/events')}
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
              allowedRoles={['ADMIN']}
              onRedirect={() => navigate('/dashboard')}
            >
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN']}
              onRedirect={() => navigate('/dashboard')}
            >
              <UserManagement />
            </ProtectedRoute>
          }
        />

        {/* System & Security Logs — Admin, Staff, Event Manager */}
        <Route
          path="logs"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'STAFF', 'EVENT_MANAGER']}
              onRedirect={() => navigate('/dashboard')}
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
              allowedRoles={['SPEAKER', 'ADMIN', 'EVENT_MANAGER']}
              onRedirect={() => navigate('/events')}
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
              allowedRoles={['SPEAKER', 'ADMIN', 'EVENT_MANAGER']}
              onRedirect={() => navigate('/events')}
            >
              <SpeakerControlCenter />
            </ProtectedRoute>
          }
        />

        {/* Settings — All authenticated roles (Task 65) */}
        <Route
          path="settings"
          element={
            <ProtectedRoute onRedirect={() => navigate('/login')}>
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
