import React, { useMemo } from 'react';
import { 
  LayoutDashboard, Calendar, Mic, QrCode, MessageSquare, 
  Sparkles, Database, Star, Users, ShieldCheck, 
  Settings as SettingsIcon, Zap, X, ChevronDown, PieChart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  allowedRoles?: UserRole[];
  requiresRole?: string[];
}

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
  userRole?: string; // e.g. "ADMIN", "EVENT_MANAGER", "SPEAKER", "ATTENDEE", etc.
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  isCollapsed = false,
  isMobileDrawer = false,
  onCloseMobileDrawer,
  userRole: propUserRole
}) => {
  const { user, userRole: authRole } = useAuth();

  // Canonical current role: prioritize prop -> user.role_name -> authRole -> default 'ATTENDEE'
  const resolvedRole = (propUserRole || user?.role_name || authRole || 'ATTENDEE').toUpperCase();
  const currentRole = (resolvedRole === 'PARTICIPANT' ? 'ATTENDEE' : resolvedRole) as UserRole;
  
  // Define all menu items with explicit RBAC permissions
  const menuItems: MenuItem[] = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowedRoles: ['ADMIN', 'EVENT_MANAGER', 'SPEAKER', 'ATTENDEE', 'STAFF', 'SUPER_ADMIN'],
    },
    {
      id: 'reports',
      label: 'Báo Cáo',
      icon: PieChart,
      allowedRoles: ['ADMIN', 'EVENT_MANAGER', 'SUPER_ADMIN', 'AUDITOR'],
    },
    {
      id: 'events',
      label: 'Danh Mục Sự Kiện',
      icon: Calendar,
      allowedRoles: ['ADMIN', 'EVENT_MANAGER', 'SPEAKER', 'ATTENDEE', 'STAFF', 'SUPER_ADMIN'],
    },
    {
      id: 'speaker',
      label: 'Cổng Diễn Giả',
      icon: Mic,
      allowedRoles: ['ADMIN', 'EVENT_MANAGER', 'SPEAKER', 'SUPER_ADMIN'],
    },
    {
      id: 'scanner',
      label: 'Soát vé QR Code',
      icon: QrCode,
      allowedRoles: ['ADMIN', 'EVENT_MANAGER', 'STAFF', 'SUPER_ADMIN'],
    },
    {
      id: 'inquiries',
      label: 'AI Concierge (HITL)',
      icon: MessageSquare,
      badge: 'AI',
      badgeColor: 'bg-[#DC2626] text-white',
      allowedRoles: ['ADMIN', 'EVENT_MANAGER', 'STAFF', 'SUPER_ADMIN'],
    },
    {
      id: 'content-studio',
      label: 'AI PR Studio',
      icon: Sparkles,
      badge: 'AI',
      badgeColor: 'bg-[#DC2626] text-white',
      allowedRoles: ['ADMIN', 'EVENT_MANAGER', 'SUPER_ADMIN'],
    },
    {
      id: 'knowledge-base',
      label: 'Kho Tri Thức RAG',
      icon: Database,
      badge: 'AI',
      badgeColor: 'bg-[#DC2626] text-white',
      allowedRoles: ['ADMIN', 'EVENT_MANAGER', 'SUPER_ADMIN'],
    },
    {
      id: 'feedback',
      label: 'Feedback & Summary',
      icon: Star,
      allowedRoles: ['ADMIN', 'EVENT_MANAGER', 'SPEAKER', 'STAFF', 'SUPER_ADMIN'],
    },
    {
      id: 'users',
      label: 'Quản Lý Tài Khoản',
      icon: Users,
      allowedRoles: ['ADMIN', 'SUPER_ADMIN'],
    },
    {
      id: 'logs',
      label: 'Nhật Ký Bảo Mật',
      icon: ShieldCheck,
      allowedRoles: ['ADMIN', 'SUPER_ADMIN', 'AUDITOR'],
    },
    {
      id: 'settings',
      label: 'Cài Đặt',
      icon: SettingsIcon,
      allowedRoles: ['ADMIN', 'EVENT_MANAGER', 'SPEAKER', 'ATTENDEE', 'STAFF', 'SUPER_ADMIN'],
    },
  ], []);

  // Filter based on allowedRoles: items with insufficient permissions are completely removed
  const visibleMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const allowed = item.allowedRoles || (item.requiresRole as UserRole[]);
      if (!allowed || allowed.length === 0) return true;
      // ADMIN & SUPER_ADMIN have full 100% access to all menus
      if (currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN') {
        return true;
      }
      return (
        allowed.includes(currentRole) ||
        (currentRole === 'ATTENDEE' && allowed.includes('PARTICIPANT' as any))
      );
    });
  }, [menuItems, currentRole]);

  return (
    <aside
      className={`bg-white ${
        isMobileDrawer
          ? 'h-full w-full'
          : `border-r border-[#E5EAF2] ${isCollapsed ? 'w-20' : 'w-[250px]'} h-screen sticky top-0 z-40`
      } flex flex-col justify-between select-none transition-all duration-300 shrink-0 text-[#12213A] overflow-y-auto`}
    >
      <div className="flex flex-col h-full">
        {/* Top Header section inside Sidebar */}
        <div className="px-6 py-6 pb-4">
          <div
            onClick={() => {
              setActiveTab('dashboard');
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            className="flex items-center gap-3 cursor-pointer"
          >
            {/* EventAI Logo matching reference */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#DC2626] shrink-0">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xl text-[#12213A] tracking-tight truncate leading-tight">
                  EventAI
                </div>
                <div className="text-[9px] font-semibold text-[#64748B] tracking-widest uppercase mt-0.5 truncate">
                  CONNECT · CREATE · INSPIRE
                </div>
              </div>
            )}
          </div>
          
          {isMobileDrawer && onCloseMobileDrawer && (
            <button
              onClick={onCloseMobileDrawer}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto pb-4">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onCloseMobileDrawer) onCloseMobileDrawer();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#DC2626] text-white shadow-[0_4px_12px_rgba(215,25,63,0.25)]'
                    : 'text-[#64748B] hover:bg-[#F6F8FC] hover:text-[#12213A]'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 ${
                      isActive ? 'text-white' : 'text-[#64748B]'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                
                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      item.badgeColor || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                
                {/* Chevron for items with submenus (mocked for now) */}
                {!isCollapsed && !item.badge && ['events', 'reports'].includes(item.id) && (
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white/70' : 'text-slate-400'}`} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Sidebar System Info Card */}
        {!isCollapsed && (
          <div className="p-4 mt-auto">
            <div className="p-3.5 rounded-xl bg-[#F6F8FC] border border-[#E5EAF2] flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                <div className="w-3.5 h-3.5 bg-[#DC2626] rotate-45 rounded-sm" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-[#12213A] truncate">EventAI</div>
                <div className="text-[9px] text-[#64748B] truncate mt-0.5" title="Nền tảng quản lý sự kiện tích hợp AI">Nền tảng quản lý sự kiện...</div>
                <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-200/50">
                  <div className="text-[10px] font-medium text-slate-500">Phiên bản hệ thống</div>
                  <div className="text-[10px] font-bold text-[#12213A]">v1.0.0</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
