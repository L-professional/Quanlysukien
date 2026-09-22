import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Shield,
  KeyRound,
  QrCode,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Upload,
  Copy,
  Check,
  Globe,
  Moon,
  Sun,
  LogOut,
  Save,
  RotateCcw,
  Sparkles,
  Lock,
  Mail,
  Phone,
  Briefcase,
  X,
  RefreshCw,
  Clock,
  MapPin,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { ActiveSession } from '../types';

type SettingsTab = 'profile' | 'preferences' | 'security';

// Vietnamese / International phone regex
const PHONE_REGEX = /^(\+84|0)[3|5|7|8|9][0-9]{8}$/;
const INTL_PHONE_REGEX = /^\+?[0-9\s\-]{9,15}$/;

export const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // ─────────────────────────────────────────────────────────────
  // 1. Profile Info State
  // ─────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState<string>(user?.full_name || '');
  const [jobTitle, setJobTitle] = useState<string>(user?.job_title || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(user?.phone_number || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar_url || '');
  const [phoneError, setPhoneError] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if user changes in context
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setJobTitle(user.job_title || '');
      setPhoneNumber(user.phone_number || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  // Validate phone live
  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    if (!val.trim()) {
      setPhoneError('');
      return;
    }
    const clean = val.replace(/[\s\-\.\(\)]/g, '');
    if (!PHONE_REGEX.test(clean) && !INTL_PHONE_REGEX.test(clean)) {
      setPhoneError('Số điện thoại không đúng định dạng (VD: 0901234567 hoặc +84901234567)');
    } else {
      setPhoneError('');
    }
  };

  // Handle avatar upload via file reader
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 3MB!');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        toast.info('Đã tải ảnh đại diện xem trước. Nhấn "Lưu thay đổi" để hoàn tất.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save profile info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error('Tên hiển thị phải có tối thiểu 2 ký tự!');
      return;
    }

    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await apiService.updateProfile({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      });

      updateUser(updated);
      toast.success('Cập nhật thông tin hồ sơ cá nhân thành công!');
    } catch (err: unknown) {
      console.error('Update profile error:', err);
      let msg = 'Không thể cập nhật hồ sơ cá nhân. Vui lòng thử lại!';
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        if (axErr.response?.data?.detail) msg = axErr.response.data.detail;
      }
      toast.error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. Preferences (Language & Theme)
  // ─────────────────────────────────────────────────────────────
  const [currentLang, setCurrentLang] = useState<string>(() => {
    return localStorage.getItem('i18nextLng')?.startsWith('en') ? 'en' : 'vi';
  });

  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('eventhub_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const [isSavingPreferences, setIsSavingPreferences] = useState<boolean>(false);

  const handleLanguageChange = (lang: 'vi' | 'en') => {
    setCurrentLang(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  const handleThemeChange = (theme: 'dark' | 'light') => {
    setCurrentTheme(theme);
    localStorage.setItem('eventhub_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    try {
      const updated = await apiService.updateProfile({
        preferences: {
          language: currentLang,
          theme: currentTheme,
        },
      });
      updateUser(updated);
      toast.success('Đã lưu tùy chọn hiển thị và ngôn ngữ thành công!');
    } catch (err) {
      console.warn('Save preferences failed on backend:', err);
      toast.success('Đã lưu tùy chọn vào trình duyệt thành công!');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. Security: Password Change
  // ─────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Compute password strength
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Chưa nhập', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score, label: 'Yếu', color: 'bg-rose-500' };
    if (score <= 4) return { score, label: 'Trung bình', color: 'bg-amber-500' };
    return { score, label: 'Mạnh', color: 'bg-emerald-500' };
  };

  const pwdStrength = getPasswordStrength(newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại!');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không trùng khớp với mật khẩu mới!');
      return;
    }

    if (newPassword === currentPassword) {
      toast.error('Mật khẩu mới không được trùng với mật khẩu cũ!');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await apiService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      toast.success(res.message || 'Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      console.error('Change password error:', err);
      let msg = 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại!';
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        if (axErr.response?.data?.detail) msg = axErr.response.data.detail;
      }
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. Security: 2FA TOTP Modal & Verification
  // ─────────────────────────────────────────────────────────────
  const is2FAEnabled = Boolean(user?.is_2fa_enabled);
  const [show2FAModal, setShow2FAModal] = useState<boolean>(false);
  const [totpSecret, setTotpSecret] = useState<string>('');
  const [totpQrCode, setTotpQrCode] = useState<string>('');
  const [totpCode, setTotpCode] = useState<string>('');
  const [isGenerating2FA, setIsGenerating2FA] = useState<boolean>(false);
  const [isVerifying2FA, setIsVerifying2FA] = useState<boolean>(false);
  const [hasCopiedSecret, setHasCopiedSecret] = useState<boolean>(false);

  // Open 2FA Activation Modal & Generate QR
  const handleOpen2FAModal = async () => {
    setShow2FAModal(true);
    setTotpCode('');
    setIsGenerating2FA(true);
    try {
      const data = await apiService.generate2FA();
      setTotpSecret(data.secret);
      setTotpQrCode(data.qr_code);
    } catch (err) {
      console.error('Generate 2FA error:', err);
      toast.error('Không thể tạo mã 2FA. Vui lòng thử lại!');
      setShow2FAModal(false);
    } finally {
      setIsGenerating2FA(false);
    }
  };

  // Verify and enable 2FA
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.trim().length !== 6) {
      toast.error('Vui lòng nhập đầy đủ 6 chữ số xác thực!');
      return;
    }

    setIsVerifying2FA(true);
    try {
      const res = await apiService.verify2FA(totpCode.trim(), totpSecret);
      updateUser({ is_2fa_enabled: true });
      toast.success(res.message || 'Kích hoạt 2FA thành công!');
      setShow2FAModal(false);
      setTotpCode('');
    } catch (err: unknown) {
      console.error('Verify 2FA error:', err);
      let msg = 'Mã xác thực 6 chữ số không đúng hoặc đã hết hạn!';
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        if (axErr.response?.data?.detail) msg = axErr.response.data.detail;
      }
      toast.error(msg);
    } finally {
      setIsVerifying2FA(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn tắt xác thực 2 yếu tố (2FA)? Tài khoản sẽ kém an toàn hơn.')) {
      return;
    }

    try {
      const res = await apiService.disable2FA();
      updateUser({ is_2fa_enabled: false });
      toast.info(res.message || 'Đã tắt xác thực 2 yếu tố!');
    } catch (err) {
      console.error('Disable 2FA error:', err);
      toast.error('Không thể tắt 2FA. Vui lòng thử lại!');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopiedSecret(true);
    toast.success('Đã sao chép khóa bí mật!');
    setTimeout(() => setHasCopiedSecret(false), 2000);
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Active Sessions Management
  // ─────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);
  const [isRevokingSessions, setIsRevokingSessions] = useState<boolean>(false);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await apiService.getActiveSessions();
      setSessions(data);
    } catch (err) {
      console.warn('Load sessions error:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      loadSessions();
    }
  }, [activeTab]);

  const handleRevokeOthers = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tất cả các thiết bị khác không?')) {
      return;
    }

    setIsRevokingSessions(true);
    try {
      const res = await apiService.revokeOtherSessions();
      toast.success(res.message || 'Đã đăng xuất khỏi tất cả thiết bị khác!');
      await loadSessions();
    } catch (err) {
      console.error('Revoke sessions error:', err);
      toast.error('Không thể hủy các phiên đăng nhập khác. Vui lòng thử lại!');
    } finally {
      setIsRevokingSessions(false);
    }
  };

  // Format relative time helper
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return 'Vừa mới đây';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return 'Vừa xong';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
      return `${Math.floor(diffSec / 86400)} ngày trước`;
    } catch {
      return 'Gần đây';
    }
  };

  return (
    <div className="w-full bg-[#0B0F19] text-slate-100 p-2 sm:p-4 lg:p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('settings.badge', 'Cấu Hình Tài Khoản')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {t('settings.title', 'Cài Đặt Hệ Thống')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('settings.subtitle', 'Quản lý thông tin hồ sơ cá nhân, tùy chọn hiển thị và an toàn bảo mật tài khoản')}
          </p>
        </div>

        {/* User Summary Pill */}
        <div className="flex items-center gap-3 bg-[#161B22] border border-slate-800/80 rounded-2xl p-2.5 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-sm flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : user?.full_name ? (
              user.full_name.slice(0, 2).toUpperCase()
            ) : (
              'EH'
            )}
          </div>
          <div className="min-w-0 pr-2">
            <div className="text-xs font-extrabold text-white truncate">
              {user?.full_name || 'Tài khoản EventHub'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {user?.email}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-[#161B22] border border-slate-800 rounded-2xl overflow-x-auto no-scrollbar shadow-lg">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{t('settings.tabProfile', 'Hồ Sơ Cá Nhân')}</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>{t('settings.tabPreferences', 'Tùy Chọn & Giao Diện')}</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>{t('settings.tabSecurity', 'Bảo Mật & Phiên Đăng Nhập')}</span>
          {is2FAEnabled && (
            <span
              className={`ml-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                activeTab === 'security'
                  ? 'bg-indigo-700/80 text-white border border-indigo-400/40'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
              }`}
            >
              2FA ON
            </span>
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: HỒ SƠ CÁ NHÂN (PROFILE INFO)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Avatar Upload Column */}
          <div className="bg-[#161B22] rounded-3xl border border-slate-800/80 p-6 shadow-xl flex flex-col items-center text-center space-y-4">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              {t('settings.avatarTitle', 'Ảnh Đại Diện')}
            </h3>

            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 p-1 shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full rounded-[22px] bg-slate-900 overflow-hidden flex items-center justify-center text-white font-black text-3xl">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    fullName.slice(0, 2).toUpperCase() || 'EH'
                  )}
                </div>
              </div>

              {/* Upload Overlay Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-3xl bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-2"
                title="Tải ảnh lên"
              >
                <Upload className="w-6 h-6 mb-1" />
                <span className="text-[11px] font-bold">Thay ảnh</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/*"
              className="hidden"
            />

            <div className="space-y-1 text-center">
              <p className="text-xs font-bold text-slate-200">
                Định dạng JPG, PNG, WebP
              </p>
              <p className="text-[11px] text-slate-400">Dung lượng tối đa: 3.0 MB</p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center w-full pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải ảnh lên</span>
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa ảnh</span>
                </button>
              )}
            </div>

            {/* Quick avatar presets */}
            <div className="w-full pt-4 border-t border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Hoặc chọn Avatar mẫu
              </div>
              <div className="flex justify-center gap-2">
                {[
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(preset)}
                    className="w-9 h-9 rounded-xl overflow-hidden border-2 border-slate-700 hover:border-indigo-500 transition-all cursor-pointer shrink-0"
                  >
                    <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Profile Form Details Column */}
          <div className="lg:col-span-2 bg-[#161B22] rounded-3xl border border-slate-800/80 p-6 sm:p-8 shadow-xl">
            <h3 className="text-base font-extrabold text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              <span>{t('settings.profileDetails', 'Thông Tin Hồ Sơ Cá Nhân')}</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200">
                  {t('settings.displayName', 'Tên Hiển Thị (Display Name)')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="VD: Nguyễn Văn Quản Trị"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0B0F19] text-white placeholder:text-slate-500 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all pl-10"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Job Title / Role display */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200">
                  {t('settings.jobTitle', 'Chức Danh / Vị Trí (Job Title)')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="VD: Giám Đốc Sự Kiện / Chuyên Viên Vận Hành"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0B0F19] text-white placeholder:text-slate-500 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all pl-10"
                  />
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Phone Number with Regex Check */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>{t('settings.phone', 'Số Điện Thoại Liên Hệ')}</span>
                  <span className="text-[10px] text-slate-400 font-normal">Định dạng: 09xxxxxxxx hoặc +84xxxxxxxxx</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="VD: 0901234567"
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      phoneError
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-slate-800 focus:ring-indigo-500 focus:border-indigo-500'
                    } bg-[#0B0F19] text-white placeholder:text-slate-500 text-sm font-medium focus:outline-hidden focus:ring-2 transition-all pl-10`}
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
                {phoneError && (
                  <p className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{phoneError}</span>
                  </p>
                )}
              </div>

              {/* Contact Email (Read-only ID with badge) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>{t('settings.email', 'Email Liên Hệ & Đăng Nhập')}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3" /> Đã xác thực
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    readOnly
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0B0F19]/60 text-slate-400 text-sm font-medium cursor-not-allowed pl-10"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Email là định danh tài khoản chính trên EventHub AI. Vui lòng liên hệ Quản trị viên nếu cần đổi email.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-800/80 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile || !!phoneError}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingProfile ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSavingProfile ? 'Đang lưu...' : t('settings.saveChanges', 'Lưu thay đổi')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: TÙY CHỌN & GIAO DIỆN (PREFERENCES)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'preferences' && (
        <div className="bg-[#161B22] rounded-3xl border border-slate-800/80 p-6 sm:p-8 shadow-xl space-y-8 max-w-3xl">
          {/* Section 1: Language */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-extrabold text-white">
                {t('settings.languageTitle', 'Ngôn Ngữ Hiển Thị')}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Lựa chọn ngôn ngữ bạn mong muốn sử dụng trên toàn bộ ứng dụng và các thông báo sự kiện
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vietnamese */}
              <div
                onClick={() => handleLanguageChange('vi')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  currentLang === 'vi'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-md shadow-indigo-900/20'
                    : 'border-slate-800 bg-[#0B0F19] text-slate-300 hover:border-slate-700 hover:bg-[#0B0F19]/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇻🇳</span>
                  <div>
                    <div className="text-sm font-bold text-white">
                      Tiếng Việt (VI)
                    </div>
                    <div className="text-xs text-slate-400">
                      Ngôn ngữ mặc định
                    </div>
                  </div>
                </div>
                {currentLang === 'vi' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* English */}
              <div
                onClick={() => handleLanguageChange('en')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  currentLang === 'en'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-md shadow-indigo-900/20'
                    : 'border-slate-800 bg-[#0B0F19] text-slate-300 hover:border-slate-700 hover:bg-[#0B0F19]/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <div className="text-sm font-bold text-white">
                      English (EN)
                    </div>
                    <div className="text-xs text-slate-400">
                      International format
                    </div>
                  </div>
                </div>
                {currentLang === 'en' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Theme Mode */}
          <div className="pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-extrabold text-white">
                {t('settings.themeTitle', 'Chế Độ Giao Diện (Theme)')}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Tùy chỉnh tông màu hiển thị phù hợp với điều kiện ánh sáng và sở thích của bạn
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Light Mode */}
              <div
                onClick={() => handleThemeChange('light')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  currentTheme === 'light'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-md shadow-indigo-900/20'
                    : 'border-slate-800 bg-[#0B0F19] text-slate-300 hover:border-slate-700 hover:bg-[#0B0F19]/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      Giao Diện Sáng (Light Mode)
                    </div>
                    <div className="text-xs text-slate-400">
                      Phù hợp môi trường ban ngày
                    </div>
                  </div>
                </div>
                {currentTheme === 'light' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Dark Mode */}
              <div
                onClick={() => handleThemeChange('dark')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  currentTheme === 'dark'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-md shadow-indigo-900/20'
                    : 'border-slate-800 bg-[#0B0F19] text-slate-300 hover:border-slate-700 hover:bg-[#0B0F19]/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      Giao Diện Tối (Dark Mode)
                    </div>
                    <div className="text-xs text-slate-400">
                      Dịu mắt, bảo vệ pin OLED
                    </div>
                  </div>
                </div>
                {currentTheme === 'dark' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-slate-800/80 flex justify-end">
            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={isSavingPreferences}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingPreferences ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Lưu tùy chọn</span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: BẢO MẬT & PHIÊN ĐĂNG NHẬP (SECURITY & SESSIONS)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="space-y-8">
          {/* Top Row: Password Change & 2FA Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Box 1: Change Password Form */}
            <div className="bg-[#161B22] rounded-3xl border border-slate-800/80 p-6 sm:p-8 shadow-xl space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-extrabold text-white">
                  {t('settings.changePassword', 'Đổi Mật Khẩu')}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Nên sử dụng mật khẩu mạnh có ít nhất 8 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-200">
                    Mật khẩu hiện tại <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0B0F19] text-white placeholder:text-slate-500 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all pr-10 pl-10"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-200">
                    Mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0B0F19] text-white placeholder:text-slate-500 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all pr-10 pl-10"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {newPassword && (
                    <div className="pt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Độ mạnh mật khẩu:</span>
                        <span className="font-bold text-slate-200">{pwdStrength.label}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-full flex-1 transition-all ${
                              lvl <= pwdStrength.score ? pwdStrength.color : 'bg-transparent'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-200">
                    Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0B0F19] text-white placeholder:text-slate-500 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all pr-10 pl-10"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Mật khẩu xác nhận chưa trùng khớp</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isChangingPassword || !newPassword || newPassword !== confirmPassword}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isChangingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>Cập nhật mật khẩu</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Box 2: Two-Factor Authentication (2FA) */}
            <div className="bg-[#161B22] rounded-3xl border border-slate-800/80 p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base font-extrabold text-white">
                      Xác Thực 2 Yếu Tố (2FA)
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase ${
                      is2FAEnabled
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {is2FAEnabled ? '🟢 Đang Bật' : '⚪ Đang Tắt'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Bảo vệ tài khoản tối đa với mã xác thực 6 chữ số theo thời gian (TOTP) từ các ứng dụng như Google Authenticator, Microsoft Authenticator hoặc Authy mỗi khi đăng nhập.
                </p>

                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/60 flex items-start gap-3">
                  <QrCode className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-200 space-y-1">
                    <span className="font-bold text-white">Phương thức: Google Authenticator / TOTP</span>
                    <p className="text-slate-400">
                      Mã được làm mới mỗi 30 giây trực tiếp trên điện thoại của bạn, không cần kết nối mạng.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">
                    {is2FAEnabled ? 'Trạng thái bảo mật cao' : 'Khuyến nghị kích hoạt'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {is2FAEnabled ? 'Tài khoản được bảo vệ 2 lớp' : 'Chưa thiết lập bảo vệ 2 lớp'}
                  </span>
                </div>

                {is2FAEnabled ? (
                  <button
                    type="button"
                    onClick={handleDisable2FA}
                    className="px-4 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-900/40 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Tắt xác thực 2FA
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpen2FAModal}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Bật 2FA ngay</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Sessions Box */}
          <div className="bg-[#161B22] rounded-3xl border border-slate-800/80 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-extrabold text-white">
                    Quản Lý Thiết Bị Đang Đăng Nhập (Active Sessions)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Danh sách các thiết bị và trình duyệt hiện đang có phiên đăng nhập hợp lệ với tài khoản này.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadSessions}
                  disabled={isLoadingSessions}
                  className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 bg-[#0B0F19] text-xs font-bold transition-colors cursor-pointer"
                  title="Làm mới danh sách"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingSessions ? 'animate-spin' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={handleRevokeOthers}
                  disabled={isRevokingSessions || sessions.filter((s) => !s.is_current).length === 0}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất khỏi các thiết bị khác</span>
                </button>
              </div>
            </div>

            {/* Sessions List */}
            <div className="divide-y divide-slate-800/80">
              {sessions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Chưa có thông tin phiên đăng nhập
                </div>
              ) : (
                sessions.map((sess) => {
                  const isMobile = sess.os?.toLowerCase().includes('ios') || sess.os?.toLowerCase().includes('android');
                  return (
                    <div
                      key={sess.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                            sess.is_current
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                          }`}
                        >
                          {isMobile ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {sess.device_name}
                            </span>
                            {sess.is_current && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Thiết bị hiện tại
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {sess.location || 'Việt Nam'} • {sess.ip_address || '127.0.0.1'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Hoạt động: {formatTime(sess.last_active_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-400">
                          {sess.browser || 'Trình duyệt Web'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: 2FA ACTIVATION & TOTP QR CODE
          ───────────────────────────────────────────────────────────── */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#161B22] rounded-3xl border border-slate-800 w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-6 relative text-slate-100">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShow2FAModal(false)}
              className="absolute right-5 top-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-indigo-400 flex items-center justify-center mx-auto mb-2 border border-indigo-800/50">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">
                Kích Hoạt Xác Thực 2 Yếu Tố
              </h3>
              <p className="text-xs text-slate-400">
                Sử dụng ứng dụng Google Authenticator hoặc Authy để quét mã QR bên dưới
              </p>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-[#0B0F19] rounded-2xl border border-slate-800">
              {isGenerating2FA ? (
                <div className="py-12 flex flex-col items-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <span>Đang khởi tạo mã bảo mật...</span>
                </div>
              ) : totpQrCode ? (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="p-2 bg-white rounded-xl shadow-xs">
                    <img src={totpQrCode} alt="TOTP QR Code" className="w-44 h-44 object-contain" />
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Khóa nhập thủ công (Manual Key)
                    </span>
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-200">
                      <span>{totpSecret}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(totpSecret)}
                        className="p-1 hover:text-indigo-400 transition-colors cursor-pointer"
                        title="Sao chép"
                      >
                        {hasCopiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 6-digit verification code input */}
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200 text-center">
                  Nhập mã 6 chữ số từ ứng dụng xác thực
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] text-2xl font-black px-4 py-3 rounded-xl border border-slate-700 bg-[#0B0F19] text-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShow2FAModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isVerifying2FA || totpCode.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isVerifying2FA ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Xác nhận & Bật</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
