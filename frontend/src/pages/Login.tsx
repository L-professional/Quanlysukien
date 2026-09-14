import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Mail,
  Lock,
  User,
  Phone,
  Sparkles,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Crown,
  Briefcase,
  Ticket,
  ShieldCheck,
  Zap,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Info,
  Mic,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { UserRole } from '../types';
import { GoogleAuthModal, GoogleIcon } from '../components/GoogleAuthModal';

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
    role: 'SPEAKER',
    title: 'Diễn Giả Sân Khấu',
    badge: '🎙️ Speaker',
    email: 'speaker@eventhub.ai',
    desc: 'Cổng thống kê, Studio điều khiển sân khấu & Q&A Live',
    icon: Mic,
    color: 'from-cyan-500/20 to-teal-500/10 text-cyan-300',
    border: 'border-cyan-500/40 hover:border-cyan-400',
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

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, userRole, isAuthenticated, login, register, logout, isLoading } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const isDemoLoginEnabled = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

  const handleRedirectAfterAuth = (role: UserRole) => {
    if (role === 'SPEAKER') {
      navigate('/speaker/dashboard', { replace: true });
      return;
    }
    const isAttendee = role === 'ATTENDEE' || role === 'PARTICIPANT';
    navigate(isAttendee ? '/events' : '/dashboard', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage(t('auth.errEmailRequired'));
      return;
    }

    if (!password) {
      setErrorMessage(t('auth.errPasswordRequired'));
      return;
    }

    if (mode === 'login') {
      try {
        const success = await login(trimmedEmail, password);
        if (success) {
          handleRedirectAfterAuth(userRole);
        } else {
          setErrorMessage(t('auth.loginFailed'));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t('auth.loginFailed');
        setErrorMessage(msg);
        toast.error(msg);
      }
    } else {
      const trimmedName = fullName.trim();
      if (!trimmedName) {
        setErrorMessage(t('auth.errFullNameRequired'));
        toast.error(t('auth.errFullNameRequired'));
        return;
      }

      if (password.length < 6) {
        setErrorMessage(t('auth.errPasswordLength'));
        toast.error(t('auth.errPasswordLength'));
        return;
      }

      try {
        // Force PARTICIPANT role for all public registrations
        const success = await register(trimmedEmail, password, trimmedName, phoneNumber.trim());
        if (success) {
          handleRedirectAfterAuth('PARTICIPANT');
        } else {
          setErrorMessage(t('auth.registerFailed'));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t('auth.registerFailed');
        setErrorMessage(msg);
        toast.error(msg);
      }
    }
  };

  const handleQuickLogin = async (acc: typeof QUICK_DEMO_ACCOUNTS[0]) => {
    setMode('login');
    setEmail(acc.email);
    setPassword('123456');
    setErrorMessage('');
    try {
      const success = await login(acc.email, '123456');
      if (success) {
        handleRedirectAfterAuth(acc.role);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('auth.loginFailed');
      setErrorMessage(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Top Language Switcher */}
      <div className="absolute top-6 right-6 z-30">
        <LanguageSwitcher />
      </div>

      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/40 mb-4 text-white">
          <Zap className="w-8 h-8 fill-current text-white" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          EventHub <span className="text-indigo-400">AI</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400 font-medium">
          {t('header.brandSubtitle')}
        </p>
      </div>

      {/* Main Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4">
        {/* If already authenticated alert banner */}
        {isAuthenticated && user && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 text-xs text-slate-300 flex items-center justify-between gap-3 shadow-lg backdrop-blur-md animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">{t('auth.loggedInAs')}: </span>
                <span className="font-bold text-indigo-300">{user.full_name}</span>
                <span className="ml-1 text-[11px] text-slate-400">({user.role_name || userRole})</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleRedirectAfterAuth(userRole)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all text-xs flex items-center gap-1 cursor-pointer"
              >
                {t('auth.enterApp')} <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={logout}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition-all text-xs cursor-pointer"
              >
                {t('auth.logout')}
              </button>
            </div>
          </div>
        )}

        <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden p-6 sm:p-8 space-y-6">
          {/* Top Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage('');
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              {t('auth.login')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage('');
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              {t('auth.register')}
            </button>
          </div>

          {/* Google OAuth 2.0 Sign In Button */}
          <div>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowGoogleModal(true)}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 group border border-slate-200"
            >
              <GoogleIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>
                {mode === 'login' ? t('auth.googleLogin') : t('auth.googleRegister')}
              </span>
            </button>
            <p className="mt-1.5 text-center text-[10px] text-slate-400">
              {t('events.ticketQrSubtitle')}
            </p>
          </div>

          {/* Quick Demo Accounts 1-Click Login (Only when VITE_ENABLE_DEMO_LOGIN=true) */}
          {isDemoLoginEnabled && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  {t('auth.demoLoginTitle')}
                </span>
                <span className="text-[10px] text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/60 font-semibold">
                  {t('auth.realApiAuth')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

          {/* Divider */}
          {isDemoLoginEnabled && (
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                {mode === 'login' ? t('auth.orUseAccount') : t('auth.orRegisterAccount')}
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>
          )}

          {/* Error message alert */}
          {errorMessage && (
            <div className="p-3.5 text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/80 rounded-2xl flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('auth.fullName')}</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder={t('auth.fullNamePlaceholder')}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* RBAC Security Notice */}
                <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-xs text-indigo-200/90 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <p className="font-semibold text-white">RBAC:</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {t('auth.rbacNotice')}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">{t('auth.password')}</label>
                {mode === 'login' && (
                  <span className="text-[11px] text-indigo-400 font-semibold cursor-pointer hover:underline">
                    {t('auth.forgotPassword')}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('auth.phoneNumber')}</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder={t('auth.phoneNumberPlaceholder')}
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
              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span className="animate-pulse flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  {t('auth.authenticating')}
                </span>
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

          {/* Footer Navigation Link */}
          <div className="pt-2 text-center text-xs text-slate-400">
            <span>{t('auth.publicCatalogPrompt')} </span>
            <Link to="/events" className="text-indigo-400 font-bold hover:underline">
              {t('auth.publicCatalogLink')}
            </Link>
          </div>
        </div>
      </div>

      {/* Google OAuth Modal */}
      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSuccess={() => handleRedirectAfterAuth('PARTICIPANT')}
      />
    </div>
  );
};

export default Login;
