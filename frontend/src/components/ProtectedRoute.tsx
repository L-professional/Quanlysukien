import React, { useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  /** The content to render if the user passes the role check */
  children: React.ReactNode;
  /** List of roles allowed to access this route. If omitted, any authenticated user can access */
  allowedRoles?: UserRole[];
  /** Destination to redirect to when access is denied (defaults to /dashboard) */
  redirectTo?: string;
  /** Called when redirect happens */
  onRedirect?: () => void;
}

/**
 * ProtectedRoute — wraps any tab/page and enforces role-based access.
 * Automatically redirects to /dashboard (or configured route) with a toast notification
 * when an unauthorized user attempts to access the route directly, removing the 403 black full-page error.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/dashboard',
  onRedirect,
}) => {
  const { isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();
  const hasToastShown = useRef(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = allowedRoles && allowedRoles.length > 0 ? hasRole(allowedRoles) : true;

  useEffect(() => {
    if (!hasAccess && !hasToastShown.current) {
      hasToastShown.current = true;
      toast.warning('Bạn không có quyền truy cập vào trang này', {
        id: 'rbac-access-denied-toast',
      });
      if (onRedirect) {
        onRedirect();
      } else {
        navigate(redirectTo, { replace: true });
      }
    }
  }, [hasAccess, navigate, onRedirect, redirectTo]);

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
