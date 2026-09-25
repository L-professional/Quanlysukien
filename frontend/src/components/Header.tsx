import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Bell, User, ChevronDown, Menu, LogOut, Settings as SettingsIcon, ShieldCheck, Briefcase, Ticket, LogIn,
  Clock, CheckCheck, Sparkles, AlertTriangle, Calendar, QrCode, X, Mic
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';
import { apiService } from '../services/api';
import type { NotificationItem } from '../types';
import { useEventSync } from '../services/eventSync';
import { toast } from 'sonner';

export interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  pendingCount?: number;
  onOpenAuthModal?: () => void;
  onToggleSidebar?: () => void;
  onOpenMobileDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenMobileDrawer,
  onOpenAuthModal,
}) => {
  const { user, isAuthenticated, userRole, switchDemoAccount, logout } = useAuth();
  const navigate = useNavigate();

  const currentRoleLabel =
    userRole === 'SUPER_ADMIN' || userRole === 'ADMIN'
      ? 'Quản trị viên'
      : userRole === 'EVENT_MANAGER'
      ? 'Quản lý sự kiện'
      : userRole === 'STAFF'
      ? 'Nhân viên điều phối'
      : 'Khách tham dự';

  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Global Quick Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchEvents, setSearchEvents] = useState<{ id: string | number; title: string; location?: string }[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const fetchSearchEvents = useCallback(async () => {
    try {
      const data = await apiService.getEvents();
      if (Array.isArray(data)) {
        setSearchEvents(data.map((e: any) => ({ id: e.id, title: e.title, location: e.location })));
      }
    } catch {
      // silently ignore
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await apiService.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.warn('Failed to fetch notifications in Header:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    fetchSearchEvents();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchSearchEvents]);

  useEventSync(
    useCallback(() => {
      fetchNotifications();
      fetchSearchEvents();
    }, [fetchNotifications, fetchSearchEvents])
  );

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const SYSTEM_NAV_SHORTCUTS = [
    { title: 'Quản lý sự kiện', subtitle: 'Danh sách và tạo sự kiện mới', path: '/events', category: 'Trang' },
    { title: 'Soát vé QR Code', subtitle: 'Quét vé và cấp thẻ tại chỗ', path: '/check-in', category: 'Trang' },
    { title: 'Trợ lý AI Concierge', subtitle: 'Hỏi đáp AI & Hỗ trợ khách', path: '/inquiries', category: 'Trang' },
    { title: 'AI PR Content Studio', subtitle: 'Soạn bài đăng & gửi thử nghiệm', path: '/content-studio', category: 'Trang' },
    { title: 'Kho tri thức AI (RAG)', subtitle: 'Tài liệu và vector store', path: '/knowledge-base', category: 'Trang' },
    { title: 'Báo cáo & Phân tích', subtitle: 'Chỉ số KPI và doanh thu', path: '/reports', category: 'Trang' },
    { title: 'Quản lý người dùng', subtitle: 'Phân quyền & Mời thành viên', path: '/users', category: 'Trang' },
    { title: 'Nhật ký hệ thống', subtitle: 'Audit log và cảnh báo thời gian thực', path: '/system-logs', category: 'Trang' },
    { title: 'Trung tâm diễn giả', subtitle: 'Lịch trình và quản lý slide', path: '/speaker/dashboard', category: 'Trang' },
    { title: 'Khảo sát & Đánh giá', subtitle: 'Ý kiến phản hồi người tham dự', path: '/feedback', category: 'Trang' },
  ];

  const filteredNavShortcuts = searchQuery.trim()
    ? SYSTEM_NAV_SHORTCUTS.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const filteredEvents = searchQuery.trim()
    ? searchEvents.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase())))
    : [];

  // Map roles to Vietnamese titles
  const roleTitles: Record<string, string> = {
    ADMIN: 'Quản trị viên hệ thống',
    SUPER_ADMIN: 'Quản trị viên cấp cao',
    EVENT_MANAGER: 'Quản lý sự kiện',
    STAFF: 'Nhân viên soát vé',
    SPEAKER: 'Diễn giả hội nghị',
    PARTICIPANT: 'Khách tham dự',
    ATTENDEE: 'Khách tham dự',
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch {
      toast.error('Không thể đánh dấu đã đọc.');
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    try {
      if (!notif.is_read) {
        await apiService.markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      }
      setShowNotifications(false);
      if (notif.link) {
        navigate(notif.link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatNotificationTime = (isoStr?: string): string => {
    if (!isoStr) return 'Vừa xong';
    try {
      const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
      if (diff < 60) return 'Vừa xong';
      if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
      return `${Math.floor(diff / 86400)} ngày trước`;
    } catch {
      return 'Gần đây';
    }
  };

  return (
    <header className="h-[72px] bg-white border-b border-[#E5EAF2] sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm transition-all duration-300">
      
      {/* LEFT: Search Bar and Mobile Controls */}
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile Menu Button */}
        <button
          onClick={onOpenMobileDrawer}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Toggle (Optional, can be hidden if always expanded) */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Input with Interactive Dropdown */}
        <div ref={searchContainerRef} className="hidden sm:flex items-center w-full max-w-md relative group">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 group-focus-within:text-[#DC2626] transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`);
                setIsSearchOpen(false);
              }
            }}
            placeholder="Tìm kiếm sự kiện, người dùng, nội dung..."
            className="w-full h-10 pl-10 pr-9 rounded-full bg-[#F6F8FC] border border-transparent focus:border-[#DC2626]/30 focus:bg-white focus:ring-4 focus:ring-[#DC2626]/10 text-[13px] font-medium text-[#12213A] placeholder:text-[#64748B] transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Search Popover Dropdown */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-12 left-0 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                {/* 1. Pages & Features */}
                {filteredNavShortcuts.length > 0 && (
                  <div className="p-2">
                    <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Trang & Phân hệ ({filteredNavShortcuts.length})
                    </p>
                    {filteredNavShortcuts.slice(0, 4).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          navigate(item.path);
                          setIsSearchOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-50/60 flex items-center justify-between group transition-colors"
                      >
                        <div>
                          <p className="text-[13px] font-semibold text-[#12213A] group-hover:text-[#DC2626] transition-colors">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Mở trang
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. Events */}
                {filteredEvents.length > 0 && (
                  <div className="p-2">
                    <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Sự kiện liên quan ({filteredEvents.length})
                    </p>
                    {filteredEvents.slice(0, 4).map((evt) => (
                      <button
                        key={evt.id}
                        onClick={() => {
                          navigate(`/events`);
                          setIsSearchOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-50/60 flex items-center justify-between group transition-colors"
                      >
                        <div className="truncate pr-2">
                          <p className="text-[13px] font-semibold text-[#12213A] group-hover:text-[#DC2626] truncate transition-colors">
                            {evt.title}
                          </p>
                          {evt.location && <p className="text-[11px] text-slate-400 truncate">{evt.location}</p>}
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0">
                          Sự kiện
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {filteredNavShortcuts.length === 0 && filteredEvents.length === 0 && (
                  <div className="p-6 text-center">
                    <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Không tìm thấy kết quả</p>
                    <p className="text-xs text-slate-400 mt-1">Không có sự kiện hay trang nào khớp với "{searchQuery}"</p>
                  </div>
                )}
              </div>

              {/* View all in Events */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`);
                    setIsSearchOpen(false);
                  }}
                  className="text-xs font-bold text-[#DC2626] hover:underline"
                >
                  Tìm tất cả trong Danh mục sự kiện &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Notifications & User Profile */}
      <div className="flex items-center gap-5 sm:gap-6 shrink-0">
        
        {/* In-App Notification Center */}
        {isAuthenticated && (
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowDropdown(false);
              }}
              className={`relative p-2 transition-colors rounded-full cursor-pointer ${
                showNotifications ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Trung tâm thông báo & Nhắc lịch"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-[#DC2626] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-4 py-3.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Thông báo & Nhắc lịch</span>
                    {unreadCount > 0 && (
                      <span className="bg-[#DC2626]/10 text-[#DC2626] text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                        {unreadCount} mới
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-[#DC2626] hover:text-[#B91C1C] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Đã đọc tất cả
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <Bell className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-medium">Bạn chưa có thông báo hoặc nhắc lịch nào</p>
                    </div>
                  ) : (
                    notifications.map((item) => {
                      const isUnread = !item.is_read;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 items-start ${
                            isUnread ? 'bg-red-50/30' : ''
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                            item.type === 'TICKET_CONFIRMATION'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : item.type === 'REMINDER_24H'
                              ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                              : item.type === 'REMINDER_2H'
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.type === 'TICKET_CONFIRMATION' ? (
                              <Ticket className="w-4 h-4" />
                            ) : item.type === 'REMINDER_24H' ? (
                              <Calendar className="w-4 h-4" />
                            ) : item.type === 'REMINDER_2H' ? (
                              <Clock className="w-4 h-4" />
                            ) : item.type === 'CHECK_IN' ? (
                              <QrCode className="w-4 h-4" />
                            ) : (
                              <Bell className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h5 className={`text-xs ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'} truncate`}>
                                {item.title}
                              </h5>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0"></span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                              {item.message}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {formatNotificationTime(item.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/events');
                    }}
                    className="text-xs text-[#DC2626] hover:text-[#B91C1C] font-bold py-1 px-3 hover:underline cursor-pointer"
                  >
                    Xem tất cả sự kiện & vé của bạn &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vertical Separator */}
        {isAuthenticated && (
          <div className="hidden sm:block w-px h-8 bg-slate-200" />
        )}

        {/* User Profile */}
        {isAuthenticated ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-[13px] font-bold text-[#12213A] group-hover:text-[#DC2626] transition-colors">
                  {user?.full_name || 'Nguyễn Văn Admin'}
                </span>
                <span className="text-[11px] text-[#64748B]">
                  {currentRoleLabel}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#E5EAF2] overflow-hidden py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 mb-2">
                  <div className="font-bold text-[#12213A] truncate">{user?.full_name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                </div>

                {/* Role Switcher Demo */}
                <div className="px-4 py-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Chuyển Role (Demo)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { role: 'SUPER_ADMIN' as UserRole, label: 'Admin', icon: ShieldCheck },
                      { role: 'EVENT_MANAGER' as UserRole, label: 'Manager', icon: Briefcase },
                      { role: 'SPEAKER' as UserRole, label: 'Speaker', icon: Mic },
                      { role: 'STAFF' as UserRole, label: 'Staff', icon: Ticket },
                      { role: 'ATTENDEE' as UserRole, label: 'Attendee', icon: User },
                    ].map((r) => {
                      const Icon = r.icon;
                      const isCurrent = userRole === r.role || (r.role === 'ATTENDEE' && userRole === 'PARTICIPANT');
                      return (
                        <button
                          key={r.role}
                          onClick={() => {
                            switchDemoAccount(r.role);
                            setShowDropdown(false);
                          }}
                          className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                            isCurrent
                              ? 'border-[#DC2626] bg-red-50 text-[#DC2626]'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Icon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100 mt-2 pt-2">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      navigate('/settings');
                    }}
                    className="w-full px-4 py-2 text-left text-[12px] font-semibold text-[#12213A] hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-400" />
                    Cài đặt tài khoản
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left text-[12px] font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-[13px] font-bold shadow-[0_4px_12px_rgba(215,25,63,0.25)] transition-colors flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
