import React from 'react';
import { useAuth } from '../context/AuthContext';

interface PermissionGuardProps {
  requirePermission?: string | string[];
  requireRole?: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  requirePermission,
  requireRole,
  fallback = null,
  children
}) => {
  const { user, userRole } = useAuth();

  if (!user || !userRole) {
    return <>{fallback}</>;
  }

  // SUPER_ADMIN and ADMIN always have 100% full access to all features
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    return <>{children}</>;
  }

  // 1. Check Roles
  if (requireRole) {
    const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
    if (!allowedRoles.includes(userRole)) {
      return <>{fallback}</>;
    }
  }

  // 2. Check Permissions
  if (requirePermission) {
    const requiredPerms = Array.isArray(requirePermission) ? requirePermission : [requirePermission];
    const userPerms = user.permissions || [];
    
    // User with wildcard '*' permission overrides
    if (!userPerms.includes('*')) {
      // EVENT_MANAGER default capabilities
      const managerAllowedPerms = [
        'EVENT_CREATE', 'EVENT_EDIT', 'EVENT_DELETE', 'EVENT_PUBLISH',
        'REPORT_VIEW', 'REPORT_EXPORT', 'REPORT_SCHEDULE', 'REPORT_SHARE'
      ];
      if (userRole === 'EVENT_MANAGER') {
        const canManagerAccess = requiredPerms.every(p => managerAllowedPerms.includes(p) || userPerms.includes(p));
        if (canManagerAccess) {
          return <>{children}</>;
        }
      }

      const hasAllRequired = requiredPerms.every(p => userPerms.includes(p));
      if (!hasAllRequired) {
        return <>{fallback}</>;
      }
    }
  }

  return <>{children}</>;
};

export default PermissionGuard;
