import React from 'react';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  /** The content to render if the user passes the role check */
  children: React.ReactNode;
  /** List of roles allowed to access this route */
  allowedRoles: UserRole[];
  /** Called when user clicks "Go Back" / "Trang Chủ" */
  onRedirect?: () => void;
}

/**
 * ProtectedRoute — wraps any tab/page and enforces role-based access.
 * Shows a premium 403 Access Denied page if the current user role is not allowed.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  onRedirect,
}) => {
  const { userRole, isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = hasRole(allowedRoles);

  if (!hasAccess) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-65px)] bg-slate-950 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-rose-600/5 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-brand-600/5 blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-lg mx-auto px-6">
          {/* Shield Icon */}
          <div className="relative mx-auto w-28 h-28 mb-8">
            <div className="w-28 h-28 rounded-3xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center shadow-2xl shadow-rose-900/30 animate-pulse">
              <ShieldX className="w-14 h-14 text-rose-400" />
            </div>
            {/* Error code badge */}
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-rose-600 border-2 border-slate-950 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-xs">403</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
            Truy Cập Bị Từ Chối
          </h1>
          <p className="text-rose-400 font-semibold text-sm mb-4 uppercase tracking-widest">
            403 — Access Denied
          </p>

          {/* Description */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 mb-8 text-left space-y-3 backdrop-blur-sm">
            <p className="text-slate-300 text-sm leading-relaxed">
              Tài khoản của bạn với chức vụ{' '}
              <span className={`font-bold px-2 py-0.5 rounded-md text-xs ${
                userRole === 'ATTENDEE'
                  ? 'bg-slate-700 text-slate-300'
                  : userRole === 'STAFF'
                  ? 'bg-indigo-900/60 text-indigo-300'
                  : 'bg-amber-900/60 text-amber-300'
              }`}>
                {userRole}
              </span>{' '}
              không có quyền truy cập vào trang này.
            </p>
            <p className="text-slate-400 text-xs">
              Trang này yêu cầu một trong các quyền:{' '}
              {allowedRoles.map((r, i) => (
                <span key={r}>
                  <span className="font-bold text-brand-300">{r}</span>
                  {i < allowedRoles.length - 1 && <span className="text-slate-500">, </span>}
                </span>
              ))}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            {onRedirect && (
              <button
                onClick={onRedirect}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all border border-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay Lại
              </button>
            )}
            <button
              onClick={() => {
                if (onRedirect) onRedirect();
                else navigate('/');
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-600/25 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Trang Chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
