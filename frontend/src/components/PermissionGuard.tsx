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

  // 1. Check Roles
  if (requireRole) {
    const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
    // SUPER_ADMIN overrides everything
    if (userRole !== 'SUPER_ADMIN' && !allowedRoles.includes(userRole)) {
      return <>{fallback}</>;
    }
  }

  // 2. Check Permissions
  if (requirePermission) {
    const requiredPerms = Array.isArray(requirePermission) ? requirePermission : [requirePermission];
    const userPerms = user.permissions || [];
    
    // SUPER_ADMIN or user with '*' permission overrides
    if (userRole !== 'SUPER_ADMIN' && !userPerms.includes('*')) {
      const hasAllRequired = requiredPerms.every(p => userPerms.includes(p));
      if (!hasAllRequired) {
        return <>{fallback}</>;
      }
    }
  }

  return <>{children}</>;
};

export default PermissionGuard;
