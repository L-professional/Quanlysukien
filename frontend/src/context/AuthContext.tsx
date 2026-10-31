import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
export type { UserRole };
import { apiService } from '../services/api';
import { toast } from 'sonner';
import { saveAccountToHistory } from '../utils/accountHistory';

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
  if (up === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (up === 'ADMIN') return 'ADMIN';
  if (up === 'EVENT_MANAGER' || up === 'ORGANIZER') return 'EVENT_MANAGER';
  if (up === 'STAFF') return 'STAFF';
  if (up === 'SPEAKER') return 'SPEAKER';
  return 'ATTENDEE'; // PARTICIPANT, ATTENDEE, etc.
}

export const DEMO_PRESETS: Record<UserRole, User> = {
  ADMIN: {
    id: 2,
    role_id: 1,
    full_name: 'Nguyễn Văn Quản Trị',
    email: 'admin@eventhub.ai',
    role_name: 'ADMIN',
    is_active: true,
  },
  SUPER_ADMIN: {
    id: 2,
    role_id: 1,
    full_name: 'Nguyễn Văn Quản Trị (Super Admin)',
    email: 'admin@eventhub.ai',
    role_name: 'SUPER_ADMIN',
    permissions: ['*'],
    is_active: true,
  },
  EVENT_MANAGER: {
    id: 3,
    role_id: 2,
    full_name: 'Trần Thị Điều Hành',
    email: 'manager@eventhub.ai',
    role_name: 'EVENT_MANAGER',
    is_active: true,
  },
  ORGANIZER: {
    id: 3,
    role_id: 2,
    full_name: 'Trần Thị Điều Hành (Organizer)',
    email: 'manager@eventhub.ai',
    role_name: 'EVENT_MANAGER',
    is_active: true,
  },
  STAFF: {
    id: 4,
    role_id: 3,
    full_name: 'Lê Hoàng Soát Vé',
    email: 'staff@eventhub.ai',
    role_name: 'STAFF',
    is_active: true,
  },
  SPEAKER: {
    id: 1,
    role_id: 5,
    full_name: 'TS. Lê Quang Huy (Speaker)',
    email: 'speaker@eventhub.ai',
    role_name: 'SPEAKER',
    is_active: true,
  },
  ATTENDEE: {
    id: 5,
    role_id: 4,
    full_name: 'Phạm Quốc Khách Hàng',
    email: 'attendee@eventhub.ai',
    role_name: 'ATTENDEE',
    is_active: true,
  },
  PARTICIPANT: {
    id: 5,
    role_id: 4,
    full_name: 'Phạm Quốc Khách Hàng',
    email: 'attendee@eventhub.ai',
    role_name: 'ATTENDEE',
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

export const DEMO_CREDENTIALS: Record<string, { email: string; password: string; role: UserRole }> = {
  ADMIN: { email: 'admin@eventhub.ai', password: '123456', role: 'ADMIN' },
  SUPER_ADMIN: { email: 'admin@eventhub.ai', password: '123456', role: 'SUPER_ADMIN' },
  EVENT_MANAGER: { email: 'manager@eventhub.ai', password: '123456', role: 'EVENT_MANAGER' },
  ORGANIZER: { email: 'manager@eventhub.ai', password: '123456', role: 'EVENT_MANAGER' },
  STAFF: { email: 'staff@eventhub.ai', password: '123456', role: 'STAFF' },
  SPEAKER: { email: 'speaker@eventhub.ai', password: '123456', role: 'SPEAKER' },
  ATTENDEE: { email: 'attendee@eventhub.ai', password: '123456', role: 'ATTENDEE' },
  PARTICIPANT: { email: 'attendee@eventhub.ai', password: '123456', role: 'ATTENDEE' },
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
  microsoftLogin: (payload: { access_token?: string; credential?: string; email?: string; full_name?: string; avatar_url?: string }) => Promise<boolean>;
  logout: (options?: { silent?: boolean; redirect?: boolean | string }) => void;
  switchDemoAccount: (role: UserRole) => Promise<boolean>;
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
    if (!roles || roles.length === 0) return true;
    let current = userRole === 'PARTICIPANT' ? 'ATTENDEE' : userRole;
    if (current === 'ORGANIZER') current = 'EVENT_MANAGER';
    if (current === 'SUPER_ADMIN') return true;
    const canonicalRoles = roles.map((r) => {
      if (r === 'PARTICIPANT') return 'ATTENDEE';
      if (r === 'ORGANIZER') return 'EVENT_MANAGER';
      return r;
    });
    if (current === 'ADMIN' && canonicalRoles.includes('ADMIN')) return true;
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
          // Chỉ clear user nếu là lỗi 401 (token thực sự hết hạn/không hợp lệ)
          // Không clear nếu là Network Error (backend chưa chạy / localhost trên Vercel)
          const status = err?.response?.status;
          const isNetworkError = !err?.response && (
            err?.code === 'ERR_NETWORK' ||
            err?.code === 'ECONNREFUSED' ||
            err?.message === 'Network Error'
          );
          if (status === 401) {
            // Token không hợp lệ → clear
            setToken(null);
            setUser(null);
            localStorage.removeItem('eventhub_token');
            localStorage.removeItem('eventhub_user');
            console.warn('Token expired or invalid, cleared session.');
          } else if (isNetworkError) {
            // Backend không có (Vercel/localhost) → giữ user từ localStorage
            console.warn('Backend unreachable (Network Error), keeping local session:', err?.message);
          } else {
            console.warn('Failed to verify token with backend:', err);
          }
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
      document.cookie = `eventhub_token=${response.access_token}; path=/; max-age=86400; SameSite=Lax`;
      const role = normalizeRole(response.user.role_name);
      const roleDisplay =
        role === 'ADMIN'
          ? '👑 Quản Trị Viên (Admin)'
          : role === 'EVENT_MANAGER'
          ? '🎯 Quản Lý Sự Kiện (Event Manager)'
          : role === 'STAFF'
          ? '🎫 Nhân Viên (Staff)'
          : '👤 Khách Tham Dự (Attendee)';
      saveAccountToHistory({
        email: response.user.email,
        name: response.user.full_name,
        avatar: response.user.avatar_url || undefined,
        provider: (response.user.provider as any) || 'local',
        lastUsed: Date.now(),
      });
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
      document.cookie = `eventhub_token=${response.access_token}; path=/; max-age=86400; SameSite=Lax`;
      saveAccountToHistory({
        email: response.user.email,
        name: response.user.full_name,
        avatar: response.user.avatar_url || undefined,
        provider: 'local',
        lastUsed: Date.now(),
      });
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
      document.cookie = `eventhub_token=${response.access_token}; path=/; max-age=86400; SameSite=Lax`;
      saveAccountToHistory({
        email: response.user.email,
        name: response.user.full_name,
        avatar: response.user.avatar_url || undefined,
        provider: 'google',
        lastUsed: Date.now(),
      });
      toast.success(`Đăng nhập thành công! Chào mừng ${response.user.full_name}`);
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

  const microsoftLogin = async (payload: {
    access_token?: string;
    credential?: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiService.microsoftAuth(payload);
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('eventhub_token', response.access_token);
      localStorage.setItem('eventhub_user', JSON.stringify(response.user));
      document.cookie = `eventhub_token=${response.access_token}; path=/; max-age=86400; SameSite=Lax`;
      saveAccountToHistory({
        email: response.user.email,
        name: response.user.full_name,
        avatar: response.user.avatar_url || undefined,
        provider: 'microsoft',
        lastUsed: Date.now(),
      });
      toast.success(`Đăng nhập thành công! Chào mừng ${response.user.full_name}`);
      return true;
    } catch (err: unknown) {
      console.error('Microsoft login failed:', err);
      let errorMsg = 'Đăng nhập Microsoft không thành công!';
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

  const switchDemoAccount = async (targetRole: UserRole): Promise<boolean> => {
    const key =
      targetRole === 'PARTICIPANT'
        ? 'ATTENDEE'
        : targetRole === 'ORGANIZER'
        ? 'EVENT_MANAGER'
        : targetRole;

    const demoCreds = DEMO_CREDENTIALS[key] || DEMO_CREDENTIALS.ATTENDEE;
    const fallbackAccount = DEMO_PRESETS[key] || DEMO_PRESETS.ATTENDEE;

    setIsLoading(true);
    try {
      // 1. Authenticate with backend to get real signed JWT token
      const response = await apiService.login({
        email: demoCreds.email,
        password: demoCreds.password,
      });

      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('eventhub_token', response.access_token);
      localStorage.setItem('eventhub_user', JSON.stringify(response.user));
      document.cookie = `eventhub_token=${response.access_token}; path=/; max-age=86400; SameSite=Lax`;

      saveAccountToHistory({
        email: response.user.email,
        name: response.user.full_name,
        avatar: response.user.avatar_url || undefined,
        provider: (response.user.provider as any) || 'local',
        lastUsed: Date.now(),
      });

      const roleTitles: Record<string, string> = {
        ADMIN: '👑 Quản Trị Viên (Admin)',
        SUPER_ADMIN: '👑 Quản Trị Viên Cấp Cao (Super Admin)',
        EVENT_MANAGER: '🎯 Quản Lý Sự Kiện (Event Manager)',
        SPEAKER: '🎤 Diễn Giả Hội Nghị (Speaker)',
        STAFF: '🎫 Nhân Viên Soát Vé & Vận Hành (Staff)',
        ATTENDEE: '👤 Khách Tham Dự (Attendee)',
      };
      toast.success(`Đã chuyển vai trò sang: ${roleTitles[key] || key}!`);
      return true;
    } catch (err) {
      console.warn('Real backend login failed during role switch, using offline demo mode:', err);
      // Offline fallback: keep user in demo mode without triggering 401 kickout
      const dummyToken = 'demo_jwt_token_eventhub_2026';
      setToken(dummyToken);
      setUser(fallbackAccount);
      localStorage.setItem('eventhub_token', dummyToken);
      localStorage.setItem('eventhub_user', JSON.stringify(fallbackAccount));
      toast.success(`Đã chuyển vai trò (Offline): ${fallbackAccount.full_name}!`);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (options?: { silent?: boolean; redirect?: boolean | string }) => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('eventhub_token');
    localStorage.removeItem('eventhub_user');
    localStorage.removeItem('eventhub_user_role');
    localStorage.removeItem('eventhub_submitted_feedback_sessions');
    localStorage.removeItem('eventhub_my_agenda');
    document.cookie = 'eventhub_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    if (!options?.silent) {
      toast.info('Đã đăng xuất khỏi hệ thống EventHub AI');
    }
    if (options?.redirect === false) {
      return;
    }
    const target = typeof options?.redirect === 'string' ? options.redirect : '/';
    if (window.location.pathname !== target) {
      window.location.href = target;
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
        microsoftLogin,
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
