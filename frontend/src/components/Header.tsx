import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Bell, User, ChevronDown, Menu, LogOut, Settings as SettingsIcon, ShieldCheck, Briefcase, Ticket, LogIn
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';

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
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Map roles to Vietnamese titles
  const roleTitles: Record<string, string> = {
    ADMIN: 'Quản trị viên hệ thống',
    SUPER_ADMIN: 'Quản trị viên cấp cao',
    EVENT_MANAGER: 'Quản lý sự kiện',
    STAFF: 'Nhân viên soát vé',
    PARTICIPANT: 'Khách tham dự',
    ATTENDEE: 'Khách tham dự',
  };

  const currentRoleLabel = roleTitles[userRole || ''] || roleTitles['ADMIN'];

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

        {/* Search Input */}
        <div className="hidden sm:flex items-center w-full max-w-md relative group">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 group-focus-within:text-[#D7193F] transition-colors" />
          <input
            type="text"
            placeholder="Tìm kiếm sự kiện, người dùng, nội dung..."
            className="w-full h-10 pl-10 pr-4 rounded-full bg-[#F6F8FC] border border-transparent focus:border-[#D7193F]/30 focus:bg-white focus:ring-4 focus:ring-[#D7193F]/10 text-[13px] font-medium text-[#12213A] placeholder:text-[#64748B] transition-all outline-none"
          />
        </div>
      </div>

      {/* RIGHT: Notifications & User Profile */}
      <div className="flex items-center gap-5 sm:gap-6 shrink-0">
        
        {/* Notification Bell */}
        {isAuthenticated && (
          <button className="relative p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-50">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#D7193F] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              3
            </span>
          </button>
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
                <span className="text-[13px] font-bold text-[#12213A] group-hover:text-[#D7193F] transition-colors">
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
                      { role: 'SUPER_ADMIN' as UserRole, label: 'Super Admin', icon: ShieldCheck },
                      { role: 'EVENT_MANAGER' as UserRole, label: 'Manager', icon: Briefcase },
                      { role: 'STAFF' as UserRole, label: 'Staff', icon: Ticket },
                      { role: 'ATTENDEE' as UserRole, label: 'User', icon: User },
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
                              ? 'border-[#D7193F] bg-red-50 text-[#D7193F]'
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
                    className="w-full px-4 py-2 text-left text-[12px] font-semibold text-[#12213A] hover:bg-slate-50 flex items-center gap-2"
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-400" />
                    Cài đặt tài khoản
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left text-[12px] font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
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
            className="px-4 py-2 bg-[#D7193F] hover:bg-[#b01433] text-white rounded-xl text-[13px] font-bold shadow-[0_4px_12px_rgba(215,25,63,0.25)] transition-colors flex items-center gap-2"
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
