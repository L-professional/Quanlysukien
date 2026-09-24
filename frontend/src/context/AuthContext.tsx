import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
export type { UserRole };
import { apiService } from '../services/api';
import { toast } from 'sonner';

// Simple JWT payload decoder
function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Normalize backend role strings → canonical 4-tier UserRole */
export function normalizeRole(raw: string | undefined | null): UserRole {
  if (!raw) return 'ATTENDEE';
  const up = raw.toUpperCase();
  if (up === 'ADMIN') return 'ADMIN';
  if (up === 'EVENT_MANAGER') return 'EVENT_MANAGER';
  if (up === 'STAFF') return 'STAFF';
  if (up === 'SPEAKER') return 'SPEAKER';
  return 'ATTENDEE'; // PARTICIPANT, ATTENDEE, etc.
}

export const DEMO_PRESETS: Record<UserRole, User> = {
  ADMIN: {
    id: 1,
    role_id: 1,
    full_name: 'Nguyễn Văn Quản Trị',
    email: 'admin@eventhub.ai',
    role_name: 'ADMIN',
    is_active: true,
  },
  EVENT_MANAGER: {
    id: 2,
    role_id: 2,
    full_name: 'Trần Thị Điều Hành',
    email: 'manager@eventhub.ai',
    role_name: 'EVENT_MANAGER',
    is_active: true,
  },
  STAFF: {
    id: 3,
    role_id: 3,
    full_name: 'Lê Hoàng Soát Vé',
    email: 'staff@eventhub.ai',
    role_name: 'STAFF',
    is_active: true,
  },
  SPEAKER: {
    id: 37,
    role_id: 5,
    full_name: 'TS. Lê Quang Huy (Speaker)',
    email: 'speaker@eventhub.ai',
    role_name: 'SPEAKER',
    is_active: true,
  },
  ATTENDEE: {
    id: 4,
    role_id: 4,
    full_name: 'Phạm Quốc Khách Hàng',
    email: 'attendee@eventhub.ai',
    role_name: 'ATTENDEE',
    is_active: true,
  },
  PARTICIPANT: {
    id: 4,
    role_id: 4,
    full_name: 'Phạm Quốc Khách Hàng',
    email: 'attendee@eventhub.ai',
    role_name: 'ATTENDEE',
    is_active: true,
  },
  SUPER_ADMIN: {
    id: 99,
    role_id: 99,
    full_name: 'Nguyễn Văn Super Admin',
    email: 'superadmin@eventhub.ai',
    role_name: 'SUPER_ADMIN',
    permissions: ['*'],
    is_active: true,
  },
  AUDITOR: {
    id: 98,
    role_id: 98,
    full_name: 'Kiểm Toán Viên',
    email: 'auditor@eventhub.ai',
    role_name: 'AUDITOR',
    is_active: true,
  },
};

export type MockRole = 'ATTENDEE' | 'STAFF' | 'ORGANIZER' | 'ADMIN';

interface AuthContextType {
  user: User | null;
  token: string | null;
  userRole: UserRole;
  selectedRole: MockRole;
  setSelectedRole: (role: MockRole) => void;
  activeRoleView: MockRole;
  setActiveRoleView: (role: MockRole) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName: string, phoneNumber?: string) => Promise<boolean>;
  googleLogin: (payload: { credential?: string; email?: string; full_name?: string; avatar_url?: string }) => Promise<boolean>;
  logout: () => void;
  switchDemoAccount: (role: UserRole) => void;
  updateUser: (updatedData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('eventhub_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('eventhub_token') || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Derive userRole from user object (or JWT payload as fallback)
  const userRole: UserRole = React.useMemo(() => {
    if (user?.role_name) return normalizeRole(user.role_name);
    if (token && token !== 'demo_jwt_token_eventhub_2026') {
      const payload = decodeJWTPayload(token);
      if (payload?.role) return normalizeRole(payload.role as string);
    }
    if (user?.role_id === 1) return 'ADMIN';
    if (user?.role_id === 2) return 'EVENT_MANAGER';
    if (user?.role_id === 3) return 'STAFF';
    return 'ATTENDEE';
  }, [user, token]);

  // Dynamic RBAC Selected Role (Mockup preview & dynamic filtering)
  const [selectedRole, setSelectedRoleState] = useState<MockRole>(() => {
    const saved = localStorage.getItem('eventhub_active_role_view');
    if (saved === 'ATTENDEE' || saved === 'STAFF' || saved === 'ORGANIZER' || saved === 'ADMIN') {
      return saved;
    }
    return 'ADMIN';
  });

  const setSelectedRole = React.useCallback((role: MockRole) => {
    setSelectedRoleState(role);
    localStorage.setItem('eventhub_active_role_view', role);
  }, []);

  // Synchronize selectedRole when userRole changes
  useEffect(() => {
    if (userRole === 'ATTENDEE' || userRole === 'PARTICIPANT') {
      setSelectedRole('ATTENDEE');
    } else if (userRole === 'STAFF') {
      setSelectedRole('STAFF');
    } else if (userRole === 'EVENT_MANAGER') {
      setSelectedRole('ORGANIZER');
    } else if (userRole === 'ADMIN') {
      setSelectedRole('ADMIN');
    }
  }, [userRole, setSelectedRole]);

  /** Check if current user has one of the allowed roles */
  const hasRole = (roles: UserRole[]): boolean => {
    const canonicalRoles = roles.map((r) => (r === 'PARTICIPANT' ? 'ATTENDEE' : r));
    const current = userRole === 'PARTICIPANT' ? 'ATTENDEE' : userRole;
    return canonicalRoles.includes(current);
  };

  useEffect(() => {
    if (token && token !== 'demo_jwt_token_eventhub_2026') {
      apiService
        .getMe()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('eventhub_user', JSON.stringify(userData));
        })
        .catch((err) => {
          console.warn('Failed to verify token with backend:', err);
        });
    }
  }, [token]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiService.login({ email, password });
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('eventhub_token', response.access_token);
      localStorage.setItem('eventhub_user', JSON.stringify(response.user));
      const role = normalizeRole(response.user.role_name);
      const roleDisplay =
        role === 'ADMIN'
          ? '👑 Quản Trị Viên (Admin)'
          : role === 'EVENT_MANAGER'
          ? '🎯 Quản Lý Sự Kiện (Event Manager)'
          : role === 'STAFF'
          ? '🎫 Nhân Viên (Staff)'
          : '👤 Khách Tham Dự (Attendee)';
      toast.success(`Đăng nhập thành công! Chào ${roleDisplay}: ${response.user.full_name}`);
      return true;
    } catch (err: unknown) {
      console.error('Backend login error:', err);
      let errorMsg = 'Email hoặc mật khẩu không chính xác!';
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        if (axErr.response?.data?.detail) {
          errorMsg = axErr.response.data.detail;
        }
      }
      toast.error(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    phoneNumber?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Hardcoded role_id = 4 (PARTICIPANT) for all public registrations
      const response = await apiService.register({
        email,
        password,
        full_name: fullName,
        phone_number: phoneNumber,
        role_id: 4,
      });
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('eventhub_token', response.access_token);
      localStorage.setItem('eventhub_user', JSON.stringify(response.user));
      toast.success(`Đăng ký tài khoản thành công! Chào mừng ${response.user.full_name}`);
      return true;
    } catch (err: unknown) {
      console.error('Backend register error:', err);
      let errorMsg = 'Đăng ký tài khoản không thành công!';
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        if (axErr.response?.data?.detail) {
          errorMsg = axErr.response.data.detail;
        }
      }
      toast.error(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (payload: {
    credential?: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiService.googleAuth(payload);
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('eventhub_token', response.access_token);
      localStorage.setItem('eventhub_user', JSON.stringify(response.user));
      const role = normalizeRole(response.user.role_name);
      const roleDisplay =
        role === 'ADMIN'
          ? '👑 Admin'
          : role === 'EVENT_MANAGER'
          ? '🎯 Quản Lý Sự Kiện'
          : role === 'STAFF'
          ? '🎫 Nhân Viên'
          : '👤 Khách Tham Dự';
      toast.success(`Đăng nhập Google thành công! (${roleDisplay}: ${response.user.full_name})`);
      return true;
    } catch (err: unknown) {
      console.error('Google login failed:', err);
      let errorMsg = 'Đăng nhập Google không thành công!';
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        if (axErr.response?.data?.detail) {
          errorMsg = axErr.response.data.detail;
        }
      }
      toast.error(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const switchDemoAccount = (targetRole: UserRole) => {
    const key = targetRole === 'PARTICIPANT' ? 'ATTENDEE' : targetRole;
    const account = DEMO_PRESETS[key] || DEMO_PRESETS.ATTENDEE;
    const dummyToken = 'demo_jwt_token_eventhub_2026';
    setToken(dummyToken);
    setUser(account);
    localStorage.setItem('eventhub_token', dummyToken);
    localStorage.setItem('eventhub_user', JSON.stringify(account));
    const roleTitles: Record<string, string> = {
      ADMIN: '👑 Quản Trị Viên (Admin)',
      EVENT_MANAGER: '🎯 Quản Lý Sự Kiện (Event Manager)',
      STAFF: '🎫 Nhân Viên Soát Vé & Duyệt AI (Staff)',
      ATTENDEE: '👤 Khách Tham Dự (Attendee)',
    };
    toast.success(`Đã chuyển vai trò sang: ${roleTitles[key]}!`);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('eventhub_token');
    localStorage.removeItem('eventhub_user');
    localStorage.removeItem('eventhub_user_role');
    localStorage.removeItem('eventhub_submitted_feedback_sessions');
    localStorage.removeItem('eventhub_my_agenda');
    document.cookie = 'eventhub_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    toast.info('Đã đăng xuất khỏi hệ thống EventHub AI');
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  };

  const updateUser = (updatedData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const nextUser = { ...prev, ...updatedData };
      localStorage.setItem('eventhub_user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        userRole,
        selectedRole,
        setSelectedRole,
        activeRoleView: selectedRole,
        setActiveRoleView: setSelectedRole,
        isAuthenticated: !!user && !!token,
        isLoading,
        hasRole,
        login,
        register,
        googleLogin,
        logout,
        switchDemoAccount,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
