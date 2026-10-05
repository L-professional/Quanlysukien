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
            <Dashboard onNavigateTab={(tab: string) => navigate(`/${tab === 'schedule' ? 'events' : tab}`)} />
          }
        />

        {/* Events Catalog — All roles */}
        <Route path="events" element={<Events />} />

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

        {/* Settings — All authenticated roles (Task 65) */}
        <Route
          path="settings"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'SUPER_ADMIN', 'EVENT_MANAGER', 'SPEAKER', 'ATTENDEE', 'STAFF']}
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

const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_ID = (rawClientId && !rawClientId.includes('YOUR_GOOGLE_CLIENT_ID'))
  ? rawClientId
  : '1029384756-demo-eventhub-ai.apps.googleusercontent.com';

interface RootErrorBoundaryProps {
  children: React.ReactNode;
}

interface RootErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class RootErrorBoundary extends React.Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RootErrorBoundary] Uncaught UI error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Đang tải lại giao diện EventAI</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Trang web đang đồng bộ dữ liệu phiên bản mới nhất. Bạn có thể bấm vào nút dưới đây để tiếp tục đăng nhập hoặc tải lại trang.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="/login"
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
              >
                🔐 Vào trang Đăng nhập hệ thống
              </a>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('eventhub_token');
                    localStorage.removeItem('eventhub_user');
                  } catch (_) {}
                  window.location.reload();
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all text-sm"
              >
                🔄 Tải lại trang (F5)
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AppContent: React.FC = () => (
  <BrowserRouter>
    <Toaster position="top-right" richColors theme="light" />
    <AppRoutes />
  </BrowserRouter>
);

export const App: React.FC = () => (
  <RootErrorBoundary>
    <GoogleOAuthProvider
      clientId={GOOGLE_CLIENT_ID}
      onScriptLoadError={() => {
        console.warn('Google Identity Service script warning (non-fatal)');
      }}
    >
      <AuthProvider>
        <EventProvider>
          <AppContent />
        </EventProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </RootErrorBoundary>
);

export default App;

