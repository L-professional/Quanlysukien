import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  QrCode,
  MessageSquare,
  Sparkles,
  Database,
  Star,
  ShieldCheck,
  Users,
  Zap,
  ChevronDown,
  Mic,
  X,
  Ticket,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth, MockRole } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import { useTranslation } from 'react-i18next';

/** Parse "DD/MM/YYYY HH:mm" or ISO string → Date (VN locale-aware) */
function parseEventDate(raw?: string | null): Date | null {
  if (!raw) return null;
  // DD/MM/YYYY HH:mm
  const dmyMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (dmyMatch) {
    const [, dd, mm, yyyy, hh, min] = dmyMatch;
    return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00+07:00`);
  }
  // Fallback: native Date parse
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

type EventStatus = 'live' | 'upcoming' | 'ended';

function computeEventStatus(startRaw?: string | null, endRaw?: string | null): EventStatus {
  const now = Date.now();
  const start = parseEventDate(startRaw);
  const end = parseEventDate(endRaw);
  if (start && end) {
    if (now >= start.getTime() && now <= end.getTime()) return 'live';
    if (now < start.getTime()) return 'upcoming';
    return 'ended';
  }
  if (start) return now < start.getTime() ? 'upcoming' : 'live';
  return 'live'; // default
}

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: string | null;
  badgeColor?: string;
  roles?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 5,
  isCollapsed = false,
  isMobileDrawer = false,
  onCloseMobileDrawer,
}) => {
  const { t } = useTranslation();
  const { userRole } = useAuth();
  const { activeEvent } = useEvent();

  // Current active role view derived from authenticated user role
  const currentRole: MockRole =
    userRole === 'ATTENDEE' || userRole === 'PARTICIPANT'
      ? 'ATTENDEE'
      : userRole === 'STAFF'
      ? 'STAFF'
      : userRole === 'EVENT_MANAGER'
      ? 'ORGANIZER'
      : 'ADMIN';

  // Real-time VN clock — tick every minute to recompute status
  const [_tick, setTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const eventStatus = computeEventStatus(activeEvent?.start_date, activeEvent?.end_date);

  const statusConfig = {
    live:     { dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400', label: t('status.live', '🟢 Live') },
    upcoming: { dot: 'bg-blue-400',                  text: 'text-blue-400',    label: t('status.upcoming', '🔵 Sắp diễn ra') },
    ended:    { dot: 'bg-slate-500',                  text: 'text-slate-400',   label: t('status.ended', '⚫ Đã kết thúc') },
  };
  const sc = statusConfig[eventStatus || 'live'] || statusConfig.live;

  // Format start_date for display: "DD/MM/YYYY" only
  const displayDate = (() => {
    const raw = activeEvent?.start_date;
    if (!raw) return '';
    // Already DD/MM/YYYY format
    const match = raw.match(/(\d{2}\/\d{2}\/\d{4})/);
    return match ? match[1] : raw.slice(0, 10);
  })();

  // Build visible menu items strictly based on Dynamic RBAC (Task 63)
  const visibleMenuItems: MenuItem[] = React.useMemo(() => {
    if (currentRole === 'ATTENDEE') {
      // Role 1 (Người tham dự - Attendee):
      // Chỉ hiển thị: Vé QR của tôi, Sự kiện đã đăng ký.
      // ẨN HOÀN TOÀN: AI Concierge (HITL), AI Feedback & Summary, cùng tất cả các chức năng quản trị.
      return [
        {
          id: 'dashboard',
          label: t('nav.myTickets', 'Vé QR của tôi'),
          icon: Ticket,
          badge: t('nav.myTicketBadge', 'Vé của tôi'),
          badgeColor: 'bg-blue-400/20 text-blue-300 border border-blue-400/30',
        },
        {
          id: 'schedule',
          label: t('nav.registeredEvents', 'Sự kiện đã đăng ký'),
          icon: Calendar,
        },
        {
          id: 'settings',
          label: t('nav.settings', 'Cài Đặt'),
          icon: SettingsIcon,
        },
      ];
    }

    if (currentRole === 'STAFF') {
      // Role 2 (Nhân viên sự kiện - Staff):
      // Task 64: Ẩn hoàn toàn 2 mục AI PR Studio và Kho Tri Thức RAG khỏi Sidebar dành cho vai trò Staff.
      // Giữ lại 6 menu khả dụng + Cài Đặt.
      return [
        {
          id: 'dashboard',
          label: t('nav.dashboard'),
          icon: LayoutDashboard,
        },
        {
          id: 'schedule',
          label: t('nav.schedule'),
          icon: Calendar,
        },
        {
          id: 'speaker',
          label: t('nav.speaker', 'Cổng Diễn Giả'),
          icon: Mic,
          badge: 'Studio',
          badgeColor: 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30',
        },
        {
          id: 'scanner',
          label: t('nav.scanner'),
          icon: QrCode,
        },
        {
          id: 'inquiries',
          label: t('nav.inquiries', 'AI Concierge (HITL)'),
          icon: MessageSquare,
          badge: `${pendingCount > 0 ? pendingCount : 5} HITL`,
          badgeColor: 'bg-amber-400/20 text-amber-300 border border-amber-400/30',
        },
        {
          id: 'feedback',
          label: t('nav.feedback', 'AI Feedback & Summary'),
          icon: Star,
          badge: 'Analytics',
          badgeColor: 'bg-blue-400/20 text-blue-300 border border-blue-400/30',
        },
        {
          id: 'settings',
          label: t('nav.settings', 'Cài Đặt'),
          icon: SettingsIcon,
        },
      ];
    }

    if (currentRole === 'ORGANIZER') {
      // Role 3 (Quản lý sự kiện - Event Manager):
      // Hiển thị đầy đủ 8 module quản trị sự kiện và AI (gồm cả AI PR Studio & Kho Tri Thức RAG) + Cài Đặt.
      return [
        {
          id: 'dashboard',
          label: t('nav.dashboard'),
          icon: LayoutDashboard,
        },
        {
          id: 'schedule',
          label: t('nav.schedule'),
          icon: Calendar,
        },
        {
          id: 'speaker',
          label: t('nav.speaker', 'Cổng Diễn Giả'),
          icon: Mic,
          badge: 'Studio',
          badgeColor: 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30',
        },
        {
          id: 'scanner',
          label: t('nav.scanner'),
          icon: QrCode,
        },
        {
          id: 'inquiries',
          label: t('nav.inquiries', 'AI Concierge (HITL)'),
          icon: MessageSquare,
          badge: `${pendingCount > 0 ? pendingCount : 5} HITL`,
          badgeColor: 'bg-amber-400/20 text-amber-300 border border-amber-400/30',
        },
        {
          id: 'content-studio',
          label: t('nav.contentStudio', 'AI PR Studio'),
          icon: Sparkles,
          badge: 'AI Gen',
          badgeColor: 'bg-purple-400/20 text-purple-300 border border-purple-400/30',
        },
        {
          id: 'knowledge-base',
          label: t('nav.knowledgeBase'),
          icon: Database,
        },
        {
          id: 'feedback',
          label: t('nav.feedback', 'AI Feedback & Summary'),
          icon: Star,
          badge: 'Analytics',
          badgeColor: 'bg-blue-400/20 text-blue-300 border border-blue-400/30',
        },
        {
          id: 'settings',
          label: t('nav.settings', 'Cài Đặt'),
          icon: SettingsIcon,
        },
      ];
    }

    // Role 4 (Quản trị viên - Admin):
    // Hiển thị đầy đủ 100% tất cả các mục menu trong Sidebar + Cài Đặt.
    return [
      {
        id: 'dashboard',
        label: t('nav.dashboard'),
        icon: LayoutDashboard,
      },
      {
        id: 'schedule',
        label: t('nav.schedule'),
        icon: Calendar,
      },
      {
        id: 'speaker',
        label: t('nav.speaker', 'Cổng Diễn Giả'),
        icon: Mic,
        badge: 'Studio',
        badgeColor: 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30',
      },
      {
        id: 'scanner',
        label: t('nav.scanner'),
        icon: QrCode,
      },
      {
        id: 'inquiries',
        label: t('nav.inquiries', 'AI Concierge (HITL)'),
        icon: MessageSquare,
        badge: `${pendingCount > 0 ? pendingCount : 5} HITL`,
        badgeColor: 'bg-amber-400/20 text-amber-300 border border-amber-400/30',
      },
      {
        id: 'content-studio',
        label: t('nav.contentStudio', 'AI PR Studio'),
        icon: Sparkles,
        badge: 'AI Gen',
        badgeColor: 'bg-purple-400/20 text-purple-300 border border-purple-400/30',
      },
      {
        id: 'knowledge-base',
        label: t('nav.knowledgeBase'),
        icon: Database,
      },
      {
        id: 'feedback',
        label: t('nav.feedback', 'AI Feedback & Summary'),
        icon: Star,
        badge: 'Analytics',
        badgeColor: 'bg-blue-400/20 text-blue-300 border border-blue-400/30',
      },
      {
        id: 'users',
        label: t('nav.users'),
        icon: Users,
      },
      {
        id: 'logs',
        label: t('nav.logs'),
        icon: ShieldCheck,
      },
      {
        id: 'settings',
        label: t('nav.settings', 'Cài Đặt'),
        icon: SettingsIcon,
      },
    ];
  }, [currentRole, pendingCount, t]);

  return (
    <aside
      className={`bg-[#0B0F19] ${
        isMobileDrawer
          ? 'h-full w-full'
          : `border-r border-slate-800/60 ${isCollapsed ? 'w-20' : 'w-64'} h-screen sticky top-0 z-40`
      } flex flex-col justify-between select-none transition-all duration-300 p-4 shrink-0 text-slate-200 overflow-y-auto`}
    >
      <div className="space-y-6">
        {/* Header Sidebar: Logo Lightning + Brand Title + Optional Mobile Close (X) */}
        <div className="flex items-center justify-between gap-3 px-2 py-1">
          <div
            onClick={() => {
              setActiveTab('dashboard');
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-90 transition-opacity"
            title="EventHub AI Dashboard"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
              <Zap className="w-5 h-5 fill-current text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-base text-white tracking-tight truncate">
                  EventHub AI
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  Event Intelligence Suite
                </p>
              </div>
            )}
          </div>

          {/* Close button for Mobile Drawer */}
          {isMobileDrawer && onCloseMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Đóng menu điều hướng"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Active Event Card (Dark Box) — Dynamic */}
        {!isCollapsed && (
          <div className="px-1">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#151C2C] border border-slate-800/80 cursor-pointer hover:bg-[#1a2337] transition-all group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-800/80 flex items-center justify-center text-indigo-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate" title={activeEvent?.title || 'EventHub AI'}>
                    {activeEvent?.title || 'EventHub AI Summit 2026'}
                  </div>
                  <div className={`text-[10px] font-semibold flex items-center gap-1.5 mt-0.5 ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
                    <span>{displayDate && `${displayDate} • `}{sc.label}</span>
                  </div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors shrink-0" />
            </div>
          </div>
        )}

        {/* Navigation Menu List */}
        <nav className="space-y-1.5 pt-1">
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
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-3 min-h-[44px] rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      item.badgeColor || 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Sidebar (RAG Status Box) */}
      {!isCollapsed && (
        <div className="px-1 pb-2">
          <div className="p-3 rounded-2xl bg-[#151C2C] border border-slate-800/80 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="text-[11px] font-semibold text-slate-300 truncate">
              {t('nav.kbStatus')}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
