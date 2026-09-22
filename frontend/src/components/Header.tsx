import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  PanelLeft,
  Menu,
  LogIn,
  LogOut,
  CheckCheck,
  Trash2,
  ExternalLink,
  Crown,
  Briefcase,
  Ticket,
  ShieldCheck,
  Sparkles,
  Info,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  Plus,
  Mic,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { apiService } from '../services/api';
import { NotificationItem, UserRole } from '../types';
import { toast } from 'sonner';

export interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  pendingCount?: number;
  onOpenAuthModal?: () => void;
  onToggleSidebar?: () => void;
  onOpenMobileDrawer?: () => void;
}

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 60) return 'Vừa xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} ngày trước`;
  } catch {
    return 'Gần đây';
  }
}

export const Header: React.FC<HeaderProps> = ({
  activeTab: _activeTab = 'dashboard',
  setActiveTab,
  onOpenAuthModal,
  onToggleSidebar,
  onOpenMobileDrawer,
}) => {
  const { t } = useTranslation();
  const { user, userRole, isAuthenticated, logout, switchDemoAccount } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Load notifications
  const loadNotifications = async () => {
    try {
      const data = await apiService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.warn('Could not load notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 20000);
    return () => clearInterval(interval);
  }, [userRole]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Command/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === 'Escape') {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === 'unread') return !n.is_read;
    return true;
  });

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      await apiService.markNotificationRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
    }

    if (item.link) {
      setShowNotifications(false);
      const linkToTab: Record<string, string> = {
        '/dashboard': 'dashboard',
        '/events': 'schedule',
        '/check-in': 'scanner',
        '/inquiries': 'inquiries',
        '/content-studio': 'content-studio',
        '/knowledge-base': 'knowledge-base',
        '/feedback': 'feedback',
        '/users': 'users',
        '/logs': 'logs',
        '/settings': 'settings',
      };
      const targetTab = linkToTab[item.link] || 'dashboard';
      setActiveTab?.(targetTab);
    }
  };

  const handleMarkAllRead = async () => {
    await apiService.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  const handleDeleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiService.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success('Đã xóa thông báo');
  };

  const handleCreateTestNotification = async () => {
    const testTypes = [
      {
        title: 'Check-in vé thành công 🎟️',
        message: 'Khách VIP Hoàng Mai Linh vừa quét mã QR tại Cổng 1.',
        type: 'CHECK_IN',
        link: '/check-in',
      },
      {
        title: 'Câu hỏi mới cần duyệt (AI Concierge) 🤖',
        message: 'Khách tham dự vừa hỏi: "Sự kiện có phiên dịch tai nghe không?"',
        type: 'INQUIRY_PENDING',
        link: '/inquiries',
      },
      {
        title: 'Cảnh báo bảo mật hệ thống 🛡️',
        message: 'Đã che giấu 2 thông tin nhạy cảm CCCD trước khi gửi tới Gemini.',
        type: 'SECURITY_ALERT',
        link: '/logs',
      },
      {
        title: 'Sự kiện sắp bắt đầu ⚡',
        message: 'Phiên hội thảo "AI Summit 2026" sẽ chính thức khai mạc trong 30 phút.',
        type: 'INFO',
        link: '/events',
      },
    ];
    const picked = testTypes[Math.floor(Math.random() * testTypes.length)];
    const created = await apiService.sendNotification(picked);
    setNotifications((prev) => [created, ...prev]);
    toast.info(`Thông báo mới: ${picked.title}`);
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'CHECK_IN':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'INQUIRY_PENDING':
      case 'INQUIRY_APPROVED':
        return <MessageSquare className="w-4 h-4 text-indigo-600" />;
      case 'SECURITY_ALERT':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const searchItems = [
    { id: 'landing', label: 'Trang Chủ Portal', category: 'Cổng Công Khai' },
    { id: 'dashboard', label: 'Dashboard Báo Cáo (4 Vai Trò)', category: 'Quản Trị' },
    { id: 'schedule', label: 'Danh Mục Sự Kiện (Events)', category: 'Sự Kiện' },
    { id: 'scanner', label: 'Soát Vé QR Check-in', category: 'Vận Hành' },
    { id: 'inquiries', label: 'AI Concierge (HITL Inquiries)', category: 'AI & Khách Hàng' },
    { id: 'content-studio', label: 'AI PR Studio', category: 'Nội Dung' },
    { id: 'knowledge-base', label: 'Kho Tri Thức RAG', category: 'Kho Dữ Liệu' },
    { id: 'feedback', label: 'AI Feedback & Summary', category: 'Đánh Giá' },
    { id: 'users', label: 'Quản Lý Người Dùng', category: 'Hệ Thống' },
    { id: 'logs', label: 'Security & AI Audit Logs', category: 'Bảo Mật' },
    { id: 'settings', label: 'Cài Đặt Hệ Thống (Hồ Sơ & Bảo Mật)', category: 'Cá Nhân' },
  ];

  const roleMeta: Record<
    UserRole,
    { label: string; bg: string; text: string; icon: React.FC<{ className?: string }> }
  > = {
    ADMIN: { label: 'Admin Quản Trị', bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800', icon: Crown },
    EVENT_MANAGER: { label: 'Quản Lý Sự Kiện', bg: 'bg-purple-100 border-purple-300', text: 'text-purple-800', icon: Briefcase },
    STAFF: { label: 'Nhân Viên Điều Phối', bg: 'bg-indigo-100 border-indigo-300', text: 'text-indigo-800', icon: ShieldCheck },
    SPEAKER: { label: 'Diễn Giả Thuyết Trình', bg: 'bg-cyan-100 border-cyan-300', text: 'text-cyan-800', icon: Mic },
    ATTENDEE: { label: 'Khách Tham Dự', bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800', icon: Ticket },
    PARTICIPANT: { label: 'Khách Tham Dự', bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800', icon: Ticket },
  };

  const currentRoleInfo = roleMeta[userRole] || roleMeta.ATTENDEE;
  const RoleIcon = currentRoleInfo.icon;

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs transition-colors gap-2 sm:gap-4">
        {/* Left Side: Sidebar Toggle (Hamburger on Mobile / PanelLeft on Desktop) + Search Box */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Hamburger Button (☰) for screens < 1024px */}
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            className="lg:hidden min-h-[44px] min-w-[44px] p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="Mở menu điều hướng (Mobile)"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>

          {/* Desktop Sidebar Toggle for screens >= 1024px */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden lg:flex min-h-[40px] min-w-[40px] p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer items-center justify-center shrink-0"
            title="Đóng / Mở menu thanh bên"
            aria-label="Toggle Desktop Sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          {/* Quick Search Trigger */}
          <div
            onClick={() => setCommandOpen(true)}
            className="w-32 xs:w-44 sm:w-72 md:w-96 bg-slate-100/90 hover:bg-slate-100 border border-slate-200/80 rounded-xl px-2.5 sm:px-3.5 py-2 min-h-[40px] flex items-center justify-between cursor-pointer transition-all text-slate-500 hover:border-slate-300"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 font-medium truncate">
                {t('header.searchPlaceholder')}
              </span>
            </div>
            <kbd className="hidden sm:inline-block text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs shrink-0">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Side: Language Switcher + Notification Bell + User Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notification Bell Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                showNotifications
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title={t('header.notifications')}
              aria-label="Thông báo"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-rose-500 text-white font-extrabold text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[92vw] sm:w-96 max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Popover Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-bold text-slate-900">{t('header.notifications')}</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                        {unreadCount} {t('header.newBadge')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCreateTestNotification}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white transition-colors text-xs flex items-center gap-1 cursor-pointer"
                      title="Tạo thông báo thử nghiệm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline font-semibold">{t('header.testNotification')}</span>
                    </button>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        title="Đọc tất cả"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] hidden sm:inline font-semibold">{t('header.markAllRead')}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/40 flex items-center gap-2">
                  <button
                    onClick={() => setNotifFilter('all')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      notifFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả ({notifications.length})
                  </button>
                  <button
                    onClick={() => setNotifFilter('unread')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      notifFilter === 'unread'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Chưa đọc ({unreadCount})
                  </button>
                </div>

                {/* Notification List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-60" />
                      <p className="text-xs font-medium">{t('header.noNotifications')}</p>
                    </div>
                  ) : (
                    filteredNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 transition-all flex items-start gap-3 cursor-pointer group ${
                          n.is_read
                            ? 'hover:bg-slate-50 bg-white'
                            : 'bg-indigo-50/40 hover:bg-indigo-50/70'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                          {getNotifIcon(n.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span
                              className={`text-xs font-bold truncate ${
                                n.is_read ? 'text-slate-700' : 'text-slate-900 font-extrabold'
                              }`}
                            >
                              {n.title}
                            </span>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                            <span>{formatTimeAgo(n.created_at)}</span>
                            {n.link && (
                              <span className="flex items-center gap-1 text-indigo-600 font-semibold group-hover:underline">
                                {t('header.viewDetails')} <ExternalLink className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteNotification(n.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                          title="Xóa thông báo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Role Switcher Dropdown */}
          {isAuthenticated && user ? (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-3 pl-2 pr-2.5 py-1 rounded-2xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
              >
                {/* Circle Avatar */}
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  {user.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'EH'}
                </div>

                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight tracking-wide flex items-center gap-1.5">
                    <span className="truncate max-w-[120px]">{user.full_name}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-extrabold border ${currentRoleInfo.bg} ${currentRoleInfo.text}`}
                    >
                      <RoleIcon className="w-2.5 h-2.5" />
                      {currentRoleInfo.label}
                    </span>
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Account Details Box */}
                  <div className="px-3.5 py-3 border-b border-slate-100 bg-slate-50/80 rounded-xl mb-2">
                    <p className="text-xs font-bold text-slate-900">{user.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email || 'user@eventhub.ai'}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentRoleInfo.bg} ${currentRoleInfo.text}`}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {currentRoleInfo.label}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {t('header.online')}
                      </span>
                    </div>
                  </div>

                  {/* Quick Role Switcher section for RBAC demo */}
                  <div className="px-2 py-1.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      Đổi Quyền Nhanh (Test RBAC)
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { role: 'ADMIN' as UserRole, label: 'Admin', icon: Crown, color: 'hover:border-amber-400 hover:bg-amber-50' },
                        { role: 'EVENT_MANAGER' as UserRole, label: 'Manager', icon: Briefcase, color: 'hover:border-purple-400 hover:bg-purple-50' },
                        { role: 'STAFF' as UserRole, label: 'Staff', icon: ShieldCheck, color: 'hover:border-indigo-400 hover:bg-indigo-50' },
                        { role: 'ATTENDEE' as UserRole, label: 'Attendee', icon: Ticket, color: 'hover:border-emerald-400 hover:bg-emerald-50' },
                      ].map((r) => {
                        const Icon = r.icon;
                        const isCurrent = userRole === r.role || (r.role === 'ATTENDEE' && userRole === 'PARTICIPANT');
                        return (
                          <button
                            key={r.role}
                            onClick={() => {
                              switchDemoAccount(r.role);
                              setShowUserDropdown(false);
                            }}
                            className={`p-2 rounded-xl text-left border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${r.color} ${
                              isCurrent
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[11px] truncate">{r.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Auth Actions */}
                  <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        if (setActiveTab) setActiveTab('settings');
                        else window.location.href = '/settings';
                      }}
                      className="w-full px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-xl flex items-center gap-2 transition-colors text-left cursor-pointer"
                    >
                      <SettingsIcon className="w-4 h-4 text-slate-500" />
                      {t('header.settings', 'Cài Đặt Tài Khoản')}
                    </button>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        logout();
                      }}
                      className="w-full px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('header.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                if (onOpenAuthModal) onOpenAuthModal();
                else window.location.href = '/login';
              }}
              className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('header.login')}</span>
            </button>
          )}
        </div>
      </header>

      {/* Command-K Quick Search Modal */}
      {commandOpen && (
        <div
          onClick={() => {
            setCommandOpen(false);
            setCommandQuery('');
          }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[95vw] sm:max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-indigo-600 shrink-0" />
              <input
                type="text"
                placeholder="Tìm kiếm trang, chức năng..."
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                className="w-full text-sm text-slate-900 bg-transparent placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={() => {
                  setCommandOpen(false);
                  setCommandQuery('');
                }}
                className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded font-mono border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                ESC
              </button>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('header.quickNav')}
              </div>
              {searchItems
                .filter(
                  (item) =>
                    !commandQuery ||
                    item.label.toLowerCase().includes(commandQuery.toLowerCase()) ||
                    item.category.toLowerCase().includes(commandQuery.toLowerCase())
                )
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab?.(item.id);
                      setCommandOpen(false);
                      setCommandQuery('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{item.category}</span>
                  </button>
                ))}
              {searchItems.filter(
                (item) =>
                  !commandQuery ||
                  item.label.toLowerCase().includes(commandQuery.toLowerCase()) ||
                  item.category.toLowerCase().includes(commandQuery.toLowerCase())
              ).length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  {t('header.noResults')}: &quot;{commandQuery}&quot;
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
