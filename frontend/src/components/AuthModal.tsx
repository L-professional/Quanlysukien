import React, { useState } from 'react';
import { toast } from 'sonner';
import { X, Mail, Lock, User, Phone, Sparkles, LogIn, UserPlus, Crown, Briefcase, Ticket, ShieldCheck, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { GoogleAuthModal, GoogleIcon } from './GoogleAuthModal';
import { useTranslation } from 'react-i18next';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

const QUICK_DEMO_ACCOUNTS: {
  role: UserRole;
  title: string;
  badge: string;
  email: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  border: string;
}[] = [
  {
    role: 'ADMIN',
    title: 'Admin Quản Trị',
    badge: '👑 Admin',
    email: 'admin@eventhub.ai',
    desc: 'Toàn quyền quản trị tài khoản, cấu hình RAG & logs',
    icon: Crown,
    color: 'from-amber-500/20 to-orange-500/10 text-amber-300',
    border: 'border-amber-500/40 hover:border-amber-400',
  },
  {
    role: 'EVENT_MANAGER',
    title: 'Quản Lý Sự Kiện',
    badge: '🎯 Manager',
    email: 'manager@eventhub.ai',
    desc: 'Tạo sự kiện, AI PR Studio, Dashboard báo cáo',
    icon: Briefcase,
    color: 'from-purple-500/20 to-indigo-500/10 text-purple-300',
    border: 'border-purple-500/40 hover:border-purple-400',
  },
  {
    role: 'STAFF',
    title: 'Nhân Viên Điều Phối',
    badge: '🎫 Staff',
    email: 'staff@eventhub.ai',
    desc: 'Soát vé QR Code, duyệt AI Concierge (HITL)',
    icon: ShieldCheck,
    color: 'from-indigo-500/20 to-blue-500/10 text-indigo-300',
    border: 'border-indigo-500/40 hover:border-indigo-400',
  },
  {
    role: 'ATTENDEE',
    title: 'Khách Tham Dự',
    badge: '👤 Attendee',
    email: 'attendee@eventhub.ai',
    desc: 'Xem sự kiện, nhận vé QR, hỏi đáp AI Concierge',
    icon: Ticket,
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-300',
    border: 'border-emerald-500/40 hover:border-emerald-400',
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const { login, register, isLoading } = useAuth();
  const isDemoLoginEnabled = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg(t('auth.errEmailRequired'));
      return;
    }

    if (mode === 'login') {
      try {
        const success = await login(email, password);
        if (success) {
          onClose();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t('auth.loginFailed');
        setErrorMsg(msg);
        toast.error(msg);
      }
    } else {
      if (!fullName) {
        setErrorMsg(t('auth.errFullNameRequired'));
        toast.error(t('auth.errFullNameRequired'));
        return;
      }
      try {
        const success = await register(email, password, fullName, phoneNumber);
        if (success) {
          onClose();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t('auth.registerFailed');
        setErrorMsg(msg);
        toast.error(msg);
      }
    }
  };

  const handleQuickLogin = async (acc: typeof QUICK_DEMO_ACCOUNTS[0]) => {
    setMode('login');
    setEmail(acc.email);
    setPassword('123456');
    setErrorMsg('');
    try {
      const success = await login(acc.email, '123456');
      if (success) {
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('auth.loginFailed');
      setErrorMsg(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-[95vw] sm:max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header decoration */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md">
                <Sparkles className="w-5 h-5 animate-pulse-subtle" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">EventHub AI</h3>
                <p className="text-xs text-slate-400">{t('header.brandSubtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="mt-4 grid grid-cols-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`py-2.5 min-h-[44px] text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              {t('auth.login')}
            </button>
            <button
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`py-2.5 min-h-[44px] text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              {t('auth.register')}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
          {/* Google OAuth Button */}
          <div>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowGoogleModal(true)}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 border border-slate-200"
            >
              <GoogleIcon className="w-4 h-4" />
              <span>
                {mode === 'login' ? t('auth.googleLogin') : t('auth.googleRegister')}
              </span>
            </button>
          </div>

          {/* Quick Demo Accounts 1-Click Login (Only when VITE_ENABLE_DEMO_LOGIN=true) */}
          {isDemoLoginEnabled && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  {t('auth.demoLoginTitle')}
                </span>
                <span className="text-[10px] text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-800/50 font-semibold">
                  {t('auth.realApiAuth')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {QUICK_DEMO_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon;
                  return (
                    <button
                      key={acc.role}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleQuickLogin(acc)}
                      className={`p-3 rounded-2xl bg-gradient-to-br ${acc.color} border ${acc.border} text-left transition-all hover:scale-[1.02] shadow-xs group cursor-pointer disabled:opacity-50`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          {t(`roles.${acc.role}`)}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900/70 border border-slate-700/50">
                          {acc.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1 group-hover:text-slate-200 transition-colors">
                        {acc.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isDemoLoginEnabled && (
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                {mode === 'login' ? t('auth.orUseAccount') : t('auth.orRegisterAccount')}
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs font-semibold text-rose-300 bg-rose-950/50 border border-rose-800/60 rounded-xl">
                {errorMsg}
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('auth.fullName')}</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder={t('auth.fullNamePlaceholder')}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* RBAC Notice */}
                <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200/90 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    {t('auth.rbacNotice')}
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="admin@eventhub.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('auth.phoneNumber')}</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="0987654321"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3 min-h-[44px] rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span className="animate-pulse">{t('auth.loggingIn')}</span>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  {t('auth.confirmLogin')}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {t('auth.confirmRegister')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSuccess={() => {
          setShowGoogleModal(false);
          onClose();
        }}
      />
    </div>
  );
};
