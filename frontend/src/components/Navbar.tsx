import React, { useState } from 'react';
import { Bot, Bell, ShieldCheck, Sparkles, CalendarDays, LogOut, LogIn, Crown, Briefcase, Ticket, Users, Mic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount?: number;
  onOpenAuthModal?: () => void;
}

const ROLE_BADGE = {
  ADMIN: { label: 'Admin', icon: Crown, color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  STAFF: { label: 'Staff', icon: Briefcase, color: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' },
  SPEAKER: { label: 'Speaker', icon: Mic, color: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' },
  ATTENDEE: { label: 'Attendee', icon: Ticket, color: 'bg-slate-600/30 text-slate-300 border border-slate-600/40' },
  PARTICIPANT: { label: 'Attendee', icon: Ticket, color: 'bg-slate-600/30 text-slate-300 border border-slate-600/40' },
  EVENT_MANAGER: { label: 'Event Mgr', icon: Briefcase, color: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
  SUPER_ADMIN: { label: 'Super Admin', icon: Crown, color: 'bg-red-500/20 text-red-300 border border-red-500/30' },
  AUDITOR: { label: 'Auditor', icon: ShieldCheck, color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
} as const;

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 2,
  onOpenAuthModal,
}) => {
  const { user, userRole, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const roleCfg = ROLE_BADGE[userRole] || ROLE_BADGE.ATTENDEE;
  const RoleIcon = roleCfg.icon;

  // Nav items visible per role
  const navItems = [
    { id: 'dashboard', label: 'Tổng Quan', roles: ['ADMIN', 'STAFF', 'EVENT_MANAGER'] },
    { id: 'schedule', label: 'Lịch Trình', icon: CalendarDays, roles: ['ADMIN', 'STAFF', 'EVENT_MANAGER', 'ATTENDEE'] },
    { id: 'scanner', label: 'Soát Vé QR', roles: ['ADMIN', 'STAFF', 'EVENT_MANAGER'] },
    { id: 'inquiries', label: 'Hỏi Đáp AI HITL', icon: Bot, roles: ['ADMIN', 'STAFF'], badge: pendingCount },
    { id: 'users', label: 'Quản Trị User', icon: Users, roles: ['ADMIN'] },
  ].filter((item) => item.roles.includes(userRole));

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
      {/* Brand Logo & Tagline */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-ai-cyan p-0.5 shadow-lg shadow-brand-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-ai-cyan animate-pulse-subtle" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-brand-300">
              EventHub AI
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full">
              HITL Portal
            </span>
          </div>
          <p className="text-xs text-slate-400">Hệ thống Quản Trị Sự Kiện Tích Hợp AI</p>
        </div>
      </div>

      {/* Quick Navigation Pills */}
      <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon as React.FC<{ className?: string }> | undefined;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5 text-current opacity-80" />}
              {item.label}
              {item.badge && item.badge > 0 && (
                <span className="w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info & Security Status */}
      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-3 py-1 rounded-full">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>PII Masking Active</span>
        </div>

        <button
          onClick={() => toast.info('Không có thông báo mới!')}
          className="relative p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full"></span>
        </button>

        {/* User Account / Auth Section */}
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 pl-2 border-l border-slate-800 text-left hover:opacity-85 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs border border-brand-400/30 shadow-md">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-200 leading-tight">{user.full_name}</p>
                  {/* Role Badge */}
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${roleCfg.color}`}>
                    <RoleIcon className="w-2.5 h-2.5" />
                    {roleCfg.label}
                  </span>
                </div>
                <p className="text-[10px] text-brand-400 font-medium">{user.email}</p>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-white">{user.full_name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${roleCfg.color}`}>
                    <RoleIcon className="w-3 h-3" />
                    {roleCfg.label}
                  </span>
                </div>

                {/* Admin: Quick link to user management */}
                {userRole === 'ADMIN' && (
                  <button
                    onClick={() => { setShowUserMenu(false); setActiveTab('users'); }}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-semibold text-amber-400 hover:bg-amber-950/40 hover:text-amber-300 flex items-center gap-2 transition-colors text-left"
                  >
                    <Users className="w-4 h-4" />
                    Quản Trị Tài Khoản
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 flex items-center gap-2 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng Xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/30 transition-all flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            Đăng Nhập
          </button>
        )}
      </div>
    </header>
  );
};
