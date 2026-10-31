import React, { useMemo } from 'react';
import { 
  LayoutDashboard, Calendar, Mic, QrCode, MessageSquare, 
  Sparkles, Database, Star, Users, ShieldCheck, 
  Settings as SettingsIcon, Zap, X, ChevronDown, PieChart, Mail,
  Bell, Layers, Ticket, UserCheck, CheckSquare, BarChart3, LifeBuoy
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
  pendingCount: _pendingCount = 0,
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
      label: 'Bảng Điều Khiển',
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
      id: 'campaigns',
      label: 'Chiến Dịch Email',
      icon: Mail,
      badge: 'Mới',
      badgeColor: 'bg-emerald-600 text-white',
      requiresRole: ['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER']
    },
    {
      id: 'speaker',
      label: 'Cổng Diễn Giả',
      icon: Mic,
      allowedRoles: ['ADMIN', 'EVENT_MANAGER', 'SPEAKER', 'SUPER_ADMIN'],
    },
    {
      id: 'scanner',
      label: 'Soát Vé QR',
      icon: QrCode,
      allowedRoles: ['ADMIN', 'EVENT_MANAGER', 'STAFF', 'SUPER_ADMIN'],
    },
    {
      id: 'inquiries',
      label: 'AI Trợ Lý Sự Kiện',
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
      label: 'Đánh Giá & Tóm Tắt',
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

  // Dedicated 15-item navigation for Manager (Task Master Prompt)
  const managerMenuItems: MenuItem[] = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Tổng quan',
      icon: LayoutDashboard,
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'events',
      label: 'Quản lý sự kiện',
      icon: Calendar,
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'manager-sessions',
      label: 'Lịch trình và phiên',
      icon: Layers,
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'manager-tickets',
      label: 'Quản lý vé',
      icon: Ticket,
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'manager-attendees',
      label: 'Người tham dự',
      icon: UserCheck,
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'manager-speakers',
      label: 'Quản lý diễn giả',
      icon: Mic,
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'manager-staff',
      label: 'Quản lý nhân viên',
      icon: Users,
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'scanner',
      label: 'Giám sát Check-in',
      icon: QrCode,
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'content-studio',
      label: 'AI PR Studio',
      icon: Sparkles,
      badge: 'AI',
      badgeColor: 'bg-[#DC2626] text-white',
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'campaigns',
      label: 'Chiến dịch Email',
      icon: Mail,
      badge: 'Mới',
      badgeColor: 'bg-emerald-600 text-white',
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'inquiries',
      label: 'Trợ lý sự kiện AI',
      icon: MessageSquare,
      badge: 'AI',
      badgeColor: 'bg-[#DC2626] text-white',
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'feedback',
      label: 'Đánh giá và phản hồi',
      icon: Star,
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'reports',
      label: 'Phân tích và báo cáo',
      icon: PieChart,
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'notifications',
      label: 'Thông báo',
      icon: Bell,
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
    {
      id: 'settings',
      label: 'Hồ sơ cá nhân',
      icon: SettingsIcon,
      allowedRoles: ['EVENT_MANAGER', 'ORGANIZER'],
    },
  ], []);

  // Dedicated 10-item navigation for Staff (Staff Master Prompt)
  const staffMenuItems: MenuItem[] = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Tổng quan công việc',
      icon: LayoutDashboard,
      allowedRoles: ['STAFF'],
    },
    {
      id: 'staff-events',
      label: 'Sự kiện được phân công',
      icon: Calendar,
      allowedRoles: ['STAFF'],
    },
    {
      id: 'scanner',
      label: 'Quét mã và Check-in',
      icon: QrCode,
      allowedRoles: ['STAFF'],
    },
    {
      id: 'staff-attendees',
      label: 'Danh sách người tham dự',
      icon: Users,
      allowedRoles: ['STAFF'],
    },
    {
      id: 'staff-support',
      label: 'Hỗ trợ đăng ký',
      icon: LifeBuoy,
      allowedRoles: ['STAFF'],
    },
    {
      id: 'staff-schedule',
      label: 'Lịch trình sự kiện',
      icon: Layers,
      allowedRoles: ['STAFF'],
    },
    {
      id: 'staff-tasks',
      label: 'Nhiệm vụ được giao',
      icon: CheckSquare,
      allowedRoles: ['STAFF'],
    },
    {
      id: 'staff-reports',
      label: 'Báo cáo vận hành',
      icon: BarChart3,
      allowedRoles: ['STAFF'],
    },
    {
      id: 'notifications',
      label: 'Thông báo',
      icon: Bell,
      allowedRoles: ['STAFF'],
    },
    {
      id: 'settings',
      label: 'Hồ sơ cá nhân',
      icon: SettingsIcon,
      allowedRoles: ['STAFF'],
    },
  ], []);

  // Filter based on allowedRoles: items with insufficient permissions are completely removed
  const visibleMenuItems = useMemo(() => {
    if (currentRole === 'EVENT_MANAGER' || currentRole === 'ORGANIZER') {
      return managerMenuItems;
    }
    if (currentRole === 'STAFF') {
      return staffMenuItems;
    }
    const list = Array.isArray(menuItems) ? menuItems : [];
    return list.filter((item) => {
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
  }, [menuItems, managerMenuItems, staffMenuItems, currentRole]);

  // Actor Workspace Metadata
  const actorInfo = useMemo(() => {
    switch (currentRole) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return {
          title: 'Quản Trị Viên (Admin)',
          subtitle: 'Giám sát toàn nền tảng',
          badgeColor: 'bg-red-50 text-[#DC2626] border-red-200',
          badgeText: 'Admin',
        };
      case 'EVENT_MANAGER':
      case 'ORGANIZER':
        return {
          title: 'Quản Lý Sự Kiện (Manager)',
          subtitle: 'Vận hành sự kiện & Tiếp thị',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          badgeText: 'Manager',
        };
      case 'STAFF':
        return {
          title: 'Nhân Viên Điều Phối (Staff)',
          subtitle: 'Soát vé QR & Hỗ trợ khách',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          badgeText: 'Staff',
        };
      case 'SPEAKER':
        return {
          title: 'Diễn Giả Hội Nghị (Speaker)',
          subtitle: 'Thuyết trình & Điều khiển sân khấu',
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
          badgeText: 'Speaker',
        };
      default:
        return {
          title: 'Khách Tham Dự (User)',
          subtitle: 'Khám phá sự kiện & Vé',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          badgeText: 'Attendee',
        };
    }
  }, [currentRole]);

  // Group visible menu items into logical actor sections
  const menuSections = useMemo(() => {
    const visibleMap = new Map(visibleMenuItems.map((item) => [item.id, item]));

    if (currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN') {
      return [
        {
          title: 'TỔNG QUAN',
          items: ['dashboard'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
        {
          title: 'QUẢN TRỊ NỀN TẢNG',
          items: ['users', 'logs', 'reports', 'knowledge-base'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
        {
          title: 'VẬN HÀNH & TIẾP THỊ',
          items: ['events', 'campaigns', 'content-studio', 'inquiries'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
        {
          title: 'ĐIỀU PHỐI & DIỄN GIẢ',
          items: ['scanner', 'speaker', 'feedback'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
        {
          title: 'HỆ THỐNG',
          items: ['settings'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
      ];
    }

    if (currentRole === 'EVENT_MANAGER' || currentRole === 'ORGANIZER') {
      return [
        {
          title: 'TỔNG QUAN',
          items: ['dashboard'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
        {
          title: 'VẬN HÀNH SỰ KIỆN',
          items: ['events', 'campaigns', 'content-studio', 'knowledge-base', 'inquiries'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
        {
          title: 'BÁO CÁO & PHẢN HỒI',
          items: ['reports', 'feedback', 'speaker'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
        {
          title: 'TÀI KHOẢN',
          items: ['settings'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
      ];
    }

    if (currentRole === 'STAFF') {
      return [
        {
          title: 'TỔNG QUAN',
          items: ['dashboard'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
        {
          title: 'VẬN HÀNH CỔNG & KHÁCH',
          items: ['staff-events', 'scanner', 'staff-attendees', 'staff-support'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
        {
          title: 'LỊCH TRÌNH & NHIỆM VỤ',
          items: ['staff-schedule', 'staff-tasks', 'staff-reports'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
        {
          title: 'HỆ THỐNG & CÁ NHÂN',
          items: ['notifications', 'settings'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
      ];
    }

    if (currentRole === 'SPEAKER') {
      return [
        {
          title: 'CỔNG DIỄN GIẢ',
          items: ['speaker', 'dashboard'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
        {
          title: 'HOẠT ĐỘNG & TƯƠNG TÁC',
          items: ['events', 'feedback'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
        {
          title: 'HỒ SƠ CÁ NHÂN',
          items: ['settings'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
        },
      ];
    }

    // Default Attendee / User
    return [
      {
        title: 'KHÁM PHÁ & THAM DỰ',
        items: ['events', 'dashboard'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
      },
      {
        title: 'ĐÓNG GÓP Ý KIẾN',
        items: ['feedback'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
      },
      {
        title: 'CÁ NHÂN',
        items: ['settings'].map((id) => visibleMap.get(id)).filter(Boolean) as MenuItem[],
      },
    ];
  }, [visibleMenuItems, currentRole]);

  return (
    <aside
      className={`bg-white ${
        isMobileDrawer
          ? 'h-full w-full'
          : `border-r border-[#E5EAF2] ${isCollapsed ? 'w-20' : 'w-[260px]'} h-screen sticky top-0 z-40`
      } flex flex-col justify-between select-none transition-all duration-300 shrink-0 text-[#12213A] overflow-y-auto`}
    >
      <div className="flex flex-col h-full">
        {/* Top Header section inside Sidebar */}
        <div className="px-5 py-5 pb-3">
          <div
            onClick={() => {
              setActiveTab('dashboard');
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            className="flex items-center gap-3 cursor-pointer"
          >
            {/* EventAI Logo matching reference */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#DC2626] shrink-0 shadow-sm">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="font-bold text-lg text-[#12213A] tracking-tight truncate leading-tight">
                  EventHub AI
                </div>
                <div className="text-[9px] font-semibold text-[#64748B] tracking-wider uppercase mt-0.5 truncate">
                  NỀN TẢNG SỰ KIỆN THÔNG MINH
                </div>
              </div>
            )}
          </div>
          
          {isMobileDrawer && onCloseMobileDrawer && (
            <button
              onClick={onCloseMobileDrawer}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Actor Identity Badge Card */}
          {!isCollapsed && (
            <div className="mt-4 p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 flex items-center justify-between gap-2 shadow-xs">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-[#12213A] truncate leading-tight">
                  {actorInfo.title}
                </div>
                <div className="text-[9px] text-slate-500 truncate leading-snug mt-0.5">
                  {actorInfo.subtitle}
                </div>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${actorInfo.badgeColor}`}>
                {actorInfo.badgeText}
              </span>
            </div>
          )}
        </div>

        {/* Navigation items grouped by Actor Section */}
        <nav className="flex-1 px-3 space-y-4 mt-1 overflow-y-auto pb-4">
          {menuSections.map((section, sIdx) => {
            if (!section.items || section.items.length === 0) return null;
            return (
              <div key={sIdx} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    {section.title}
                  </div>
                )}
                {isCollapsed && sIdx > 0 && (
                  <div className="w-8 h-px bg-slate-200 mx-auto my-2" />
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (onCloseMobileDrawer) onCloseMobileDrawer();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[#DC2626] text-white shadow-[0_4px_12px_rgba(220,38,38,0.22)]'
                          : 'text-[#64748B] hover:bg-[#F6F8FC] hover:text-[#12213A]'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-[17px] h-[17px] shrink-0 ${
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
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer Sidebar System Info Card */}
        {!isCollapsed && (
          <div className="p-3.5 mt-auto border-t border-slate-100">
            <div className="p-2.5 rounded-xl bg-[#F6F8FC] border border-[#E5EAF2] flex gap-2.5 items-center">
              <div className="w-7 h-7 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0 border border-slate-100">
                <div className="w-3 h-3 bg-[#DC2626] rotate-45 rounded-xs" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-[#12213A] truncate">EventHub AI</span>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">Online</span>
                </div>
                <div className="text-[9px] text-[#64748B] truncate mt-0.5">5 Nhóm Tác Nhân Sẵn Sàng</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
