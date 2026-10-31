import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Shield,
  Lock,
  Trash2,
  RefreshCw,
  Activity,
  Search,
  ChevronDown,
  AlertTriangle,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Crown,
  Briefcase,
  Ticket,
  Key,
  Eye,
  EyeOff,
  X,
  UserPlus,
  Mail,
  Send,
} from 'lucide-react';
import { apiService } from '../services/api';
import { formatVietnameseDateTime } from '../utils/formatters';
import { AdminUser, SecurityLog, UserRole } from '../types';
import { toast } from 'sonner';

// ── Role Config ───────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { labelKey: string; color: string; icon: React.FC<{className?: string}> }> = {
  ADMIN: { labelKey: 'roles.ADMIN', color: 'bg-amber-100 text-amber-800 border border-amber-300', icon: Crown },
  EVENT_MANAGER: { labelKey: 'roles.EVENT_MANAGER', color: 'bg-purple-100 text-purple-800 border border-purple-300', icon: Briefcase },
  STAFF: { labelKey: 'roles.STAFF', color: 'bg-red-100 text-red-800 border border-red-300', icon: Briefcase },
  PARTICIPANT: { labelKey: 'roles.PARTICIPANT', color: 'bg-slate-100 text-slate-700 border border-slate-300', icon: Ticket },
  ATTENDEE: { labelKey: 'roles.ATTENDEE', color: 'bg-slate-100 text-slate-700 border border-slate-300', icon: Ticket },
};

const ROLES_TO_ASSIGN: UserRole[] = ['ADMIN', 'EVENT_MANAGER', 'STAFF', 'ATTENDEE'];

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
interface DeleteModalProps {
  user: AdminUser;
  onConfirm: () => void;
  onCancel: () => void;
}
const DeleteModal: React.FC<DeleteModalProps> = ({ user, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-[95vw] sm:max-w-sm shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{t('users.confirmDeleteTitle')}</h3>
            <p className="text-rose-600 text-xs font-semibold">{t('users.actionCannotUndo')}</p>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 min-h-0 text-xs">
          <p className="text-slate-600">
            {t('users.aboutToDelete')}
          </p>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="font-bold text-slate-900 text-sm">{user.full_name}</p>
            <p className="text-slate-500 text-xs font-mono">{user.email}</p>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center"
          >
            {t('users.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('users.deleteAccount')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Reset Password Modal ───────────────────────────────────────────────────────
interface ResetPasswordModalProps {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ user, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError(t('auth.errPasswordLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('users.passwordMismatch', { defaultValue: 'Mật khẩu xác nhận không trùng khớp' }));
      return;
    }

    setLoading(true);
    try {
      await apiService.resetUserPassword(user.id, newPassword);
      toast.success(`${t('users.resetSuccess', { defaultValue: 'Đã đặt lại mật khẩu thành công cho' })} ${user.email}!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('users.resetFailed', { defaultValue: 'Không thể đặt lại mật khẩu' });
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-[95vw] sm:max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Fixed Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{t('users.resetPasswordTitle')}</h3>
              <p className="text-xs text-slate-500 font-medium">Bcrypt Secure One-way Encryption</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* Scrollable Body */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center shrink-0">
                {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user.full_name || 'No Name'}</p>
                <p className="text-2xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('users.newPassword')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('users.confirmPassword')}</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-red-500"
              />
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              {t('users.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 min-h-[44px] py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              {loading ? t('common.loading') : t('users.updatePasswordBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Role Badge ────────────────────────────────────────────────────────────────
const RoleBadge: React.FC<{ roleName: string }> = ({ roleName }) => {
  const { t } = useTranslation();
  const cfg = ROLE_CONFIG[roleName.toUpperCase()] || ROLE_CONFIG.ATTENDEE;
  const Icon = cfg.icon;
  const label = t(cfg.labelKey, { defaultValue: roleName });
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

// ── Online Indicator ──────────────────────────────────────────────────────────
const OnlineIndicator: React.FC<{ isOnline: boolean; lastActive?: string }> = ({ isOnline, lastActive }) => {
  const { t } = useTranslation();
  const timeStr = lastActive
    ? formatVietnameseDateTime(lastActive)
    : '—';
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
        }`}
      />
      <span className={`text-xs font-semibold ${isOnline ? 'text-emerald-700' : 'text-slate-500'}`}>
        {isOnline ? t('common.online') : timeStr}
      </span>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'roles'>(
    tabParam === 'roles' ? 'roles' : tabParam === 'logs' ? 'logs' : 'users'
  );
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [rolesSummary, setRolesSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<AdminUser | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<number | null>(null);

  useEffect(() => {
    const currentTabParam = searchParams.get('tab');
    if (currentTabParam === 'roles') setActiveTab('roles');
    else if (currentTabParam === 'logs') setActiveTab('logs');
    else if (currentTabParam === 'users') setActiveTab('users');
  }, [searchParams]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t('users.loadUsersFailed', { defaultValue: 'Không thể tải danh sách người dùng' }));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadLogs = useCallback(async () => {
    try {
      const data = await apiService.getSecurityLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t('users.loadLogsFailed', { defaultValue: 'Không thể tải nhật ký bảo mật' }));
      setLogs([]);
    }
  }, [t]);

  const loadRoles = useCallback(async () => {
    try {
      const data = await apiService.getRolesSummary();
      if (data && data.roles) {
        setRolesSummary(data.roles);
      }
    } catch (e) {
      console.warn('Could not load roles summary', e);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadLogs();
    loadRoles();
  }, [loadUsers, loadLogs, loadRoles]);

  const handleTabChange = (newTab: 'users' | 'logs' | 'roles') => {
    setActiveTab(newTab);
    setSearchParams(newTab === 'users' ? {} : { tab: newTab });
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const updated = await apiService.updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      toast.success(`${t('users.roleChangedSuccess', { defaultValue: 'Đã thay đổi quyền thành' })} ${newRole}`);
    } catch {
      toast.error(t('users.roleChangeFailed', { defaultValue: 'Không thể thay đổi quyền. Vui lòng thử lại.' }));
    }
    setRoleDropdownOpen(null);
  };

  const handleStatusToggle = async (user: AdminUser) => {
    try {
      const updated = await apiService.updateUserStatus(user.id, !user.is_active);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      toast.success(updated.is_active 
        ? `${t('users.unlockedSuccess', { defaultValue: 'Đã mở khóa tài khoản' })} ${user.full_name}` 
        : `${t('users.lockedSuccess', { defaultValue: 'Đã khóa tài khoản' })} ${user.full_name}`);
    } catch {
      toast.error(t('users.statusChangeFailed', { defaultValue: 'Không thể thay đổi trạng thái tài khoản.' }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiService.deleteUser(deleteTarget.id);
      setUsers((prev) => (Array.isArray(prev) ? prev : []).filter((u) => u.id !== deleteTarget.id));
      toast.success(`${t('users.deletedSuccess', { defaultValue: 'Đã xóa tài khoản' })} ${deleteTarget.full_name}`);
    } catch {
      toast.error(t('users.deleteFailed', { defaultValue: 'Không thể xóa tài khoản. Vui lòng thử lại.' }));
    }
    setDeleteTarget(null);
  };

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<{ email: string; full_name: string; role: UserRole; message: string }>({
    email: '',
    full_name: '',
    role: 'ATTENDEE',
    message: '',
  });
  const [isInviting, setIsInviting] = useState(false);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) {
      toast.error('Vui lòng nhập địa chỉ email người dùng!');
      return;
    }
    setIsInviting(true);
    try {
      await apiService.sendInvitation({
        to: inviteForm.email.trim(),
        recipient_name: inviteForm.full_name.trim() || undefined,
        role: inviteForm.role,
        custom_message: inviteForm.message.trim() || undefined,
        subject: `🎟️ [EventAI] Thư Mời Tham Gia Hệ Thống với Vai Trò ${inviteForm.role}`,
      });
      toast.success(`Đã gửi thư mời tham gia hệ thống với vai trò ${inviteForm.role} tới "${inviteForm.email}"!`);
      setIsInviteModalOpen(false);
      setInviteForm({ email: '', full_name: '', role: 'ATTENDEE', message: '' });
    } catch (err: any) {
      console.error('Failed to send invitation email:', err);
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Gửi thư mời thất bại. Vui lòng kiểm tra cấu hình SMTP!';
      toast.error(detail);
    } finally {
      setIsInviting(false);
    }
  };

  const safeUsers = Array.isArray(users) ? users : [];
  const filteredUsers = safeUsers.filter(
    (u) =>
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: safeUsers.length,
    online: safeUsers.filter((u) => u.is_online).length,
    admins: safeUsers.filter((u) => (u.role_name || '').toUpperCase() === 'ADMIN').length,
    locked: safeUsers.filter((u) => !u.is_active).length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {resetPasswordTarget && (
        <ResetPasswordModal
          user={resetPasswordTarget}
          onClose={() => setResetPasswordTarget(null)}
          onSuccess={loadUsers}
        />
      )}

      {/* Invite User Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Gửi Email Mời Người Dùng Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên:</label>
                <input
                  type="text"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  placeholder="Nguyễn Văn A..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ Email *:</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="user@example.com..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vai trò phân quyền:</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 cursor-pointer font-semibold"
                >
                  <option value="ATTENDEE">Khách tham dự (Attendee)</option>
                  <option value="STAFF">Nhân viên soát vé (Staff)</option>
                  <option value="SPEAKER">Diễn giả (Speaker)</option>
                  <option value="EVENT_MANAGER">Quản lý sự kiện (Event Manager)</option>
                  <option value="ADMIN">Quản trị viên hệ thống (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lời nhắn mời (Tùy chọn):</label>
                <textarea
                  rows={2}
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  placeholder="Kính mời bạn tham gia đội ngũ EventHub AI..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isInviting || !inviteForm.email.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isInviting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Gửi Lời Mời</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            {t('users.title')}
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">{t('users.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Mời Người Dùng Mới</span>
          </button>
          <button
            onClick={() => { loadUsers(); loadLogs(); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('common.refresh')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('users.stats.total', { defaultValue: 'Tổng Tài Khoản' }), value: stats.total, icon: Users, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
          { label: t('users.stats.online', { defaultValue: 'Đang Online' }), value: stats.online, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: t('users.stats.admins', { defaultValue: 'Admin' }), value: stats.admins, icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
          { label: t('users.stats.locked', { defaultValue: 'Bị Khóa' }), value: stats.locked, icon: Lock, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200 w-fit">
        {([
          { id: 'users', label: t('nav.users', { defaultValue: 'Danh Sách Người Dùng' }), icon: Users },
          { id: 'roles', label: 'Vai Trò & Phân Quyền', icon: Crown },
          { id: 'logs', label: t('nav.logs', { defaultValue: 'Nhật Ký Bảo Mật' }), icon: Shield },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === id
                ? 'bg-[#DC2626] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-slate-100">
            <div className="relative max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('users.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    t('users.colUser'),
                    t('users.colRole'),
                    t('users.colStatus'),
                    t('users.table.assignRole', { defaultValue: 'Phân Quyền' }),
                    t('users.table.lockUnlock', { defaultValue: 'Khóa / Mở' }),
                    t('users.colActions')
                  ].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="py-4 px-4">
                          <div className="h-4 bg-slate-200/60 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                      {t('users.table.noUsers', { defaultValue: 'Không tìm thấy người dùng nào.' })}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{u.full_name}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <RoleBadge roleName={u.role_name} />
                      </td>

                      {/* Online Status */}
                      <td className="py-3.5 px-4">
                        <OnlineIndicator isOnline={u.is_online} lastActive={u.last_active_at} />
                      </td>

                      {/* Change Role Dropdown */}
                      <td className="py-3.5 px-4">
                        <div className="relative">
                          <button
                            onClick={() => setRoleDropdownOpen(roleDropdownOpen === u.id ? null : u.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                          >
                            {t('users.table.changeRole', { defaultValue: 'Đổi Role' })}
                            <ChevronDown className="w-3 h-3 text-slate-500" />
                          </button>
                          {roleDropdownOpen === u.id && (
                            <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-1 min-w-[140px] animate-in zoom-in-95 duration-100">
                              {ROLES_TO_ASSIGN.map((role) => (
                                <button
                                  key={role}
                                  onClick={() => handleRoleChange(u.id, role)}
                                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <RoleBadge roleName={role} />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Lock/Unlock Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleStatusToggle(u)}
                          title={u.is_active ? t('users.lockAccount') : t('users.unlockAccount')}
                          className={`relative w-10 h-5 rounded-full transition-all duration-200 cursor-pointer ${
                            u.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-all duration-200 ${
                              u.is_active ? 'left-5' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Actions: Reset Password & Delete */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setResetPasswordTarget(u)}
                            title={t('users.resetPasswordTitle')}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            title={t('users.deleteAccount')}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <Shield className="w-4 h-4 text-red-600" />
            <h3 className="font-bold text-slate-900 text-sm">{t('users.logs.title', { defaultValue: 'Nhật Ký Bảo Mật Hệ Thống' })}</h3>
            <span className="ml-auto text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {logs.length} {t('common.records', { defaultValue: 'bản ghi' })}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    t('logs.columns.id', { defaultValue: 'ID' }),
                    t('logs.columns.taskType', { defaultValue: 'Loại Thao Tác' }),
                    t('logs.columns.action', { defaultValue: 'Hành Động' }),
                    'Tokens (In/Out)',
                    t('logs.columns.latency', { defaultValue: 'Thời Gian (ms)' }),
                    t('logs.colTime')
                  ].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                      {t('users.logs.noLogs', { defaultValue: 'Chưa có nhật ký bảo mật nào.' })}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500">#{log.id}</td>
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1.5 text-xs font-bold">
                          <FileText className="w-3.5 h-3.5 text-red-600" />
                          <span className="text-slate-900">{log.task_type}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          log.staff_action === 'ACCEPT' || log.staff_action === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : log.staff_action === 'REJECT' || log.staff_action === 'LOCK'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {log.staff_action === 'ACCEPT' || log.staff_action === 'SUCCESS'
                            ? <CheckCircle className="w-3 h-3 text-emerald-600" />
                            : log.staff_action === 'REJECT'
                            ? <XCircle className="w-3 h-3 text-rose-600" />
                            : <Activity className="w-3 h-3 text-slate-600" />
                          }
                          {log.staff_action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                        {log.prompt_tokens} / {log.completion_tokens}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                        {log.latency_ms.toFixed(1)}ms
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {log.created_at
                            ? formatVietnameseDateTime(log.created_at)
                            : '—'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles & Permissions Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#12213A] to-[#1E3A8A] text-white p-6 rounded-2xl shadow-md border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-black tracking-tight">
                  Ma Trận Vai Trò & Phân Quyền Hệ Thống (RBAC Matrix)
                </h3>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">
                EventHub AI áp dụng cơ chế Role-Based Access Control (RBAC) nghiêm ngặt với 5 tác nhân chính:
                <strong className="text-white"> Admin, Manager, Staff, Speaker, Attendee</strong>. Mọi phân hệ nghiệp vụ,
                API endpoint và tác vụ quản trị đều được phân tách ranh giới rõ ràng.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-xs font-bold text-amber-300">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Chính Sách RBAC: Bắt Buộc</span>
            </div>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(rolesSummary.length > 0 ? rolesSummary : [
              {
                id: 'SUPER_ADMIN',
                name: 'Super Admin',
                role_name: 'SUPER_ADMIN',
                description: 'Toàn quyền quản trị hệ thống cao cấp nhất, phân bổ tài nguyên và bảo mật.',
                scope: 'Toàn bộ hệ thống',
                badgeColor: 'bg-red-50 text-[#DC2626] border-red-200',
                user_count: users.filter(u => u.role_name === 'SUPER_ADMIN').length,
                permissions: [
                  'Quản trị tài khoản toàn hệ thống',
                  'Quản lý phân quyền & vai trò',
                  'Cấu hình hạ tầng & tích hợp Resend',
                  'Giám sát AI Concierge & HITL',
                  'Xem toàn bộ báo cáo doanh thu & kiểm toán'
                ]
              },
              {
                id: 'ADMIN',
                name: 'Quản Trị Viên (Admin)',
                role_name: 'ADMIN',
                description: 'Quản trị nền tảng, phê duyệt nội dung, quản trị AI và giám sát an ninh.',
                scope: 'Toàn bộ nền tảng EventHub AI',
                badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
                user_count: users.filter(u => u.role_name === 'ADMIN').length,
                permissions: [
                  'Quản lý tài khoản người dùng & khóa tài khoản',
                  'Giám sát sự kiện toàn hệ thống',
                  'Quản trị trợ lý AI Concierge & Kho tri thức RAG',
                  'Cấu hình gửi mail Resend / SMTP',
                  'Xem nhật ký kiểm toán và báo cáo phân tích'
                ]
              },
              {
                id: 'EVENT_MANAGER',
                name: 'Quản Lý Sự Kiện (Manager)',
                role_name: 'EVENT_MANAGER',
                description: 'Chịu trách nhiệm lập kế hoạch, tạo sự kiện, chiến dịch Email và quản lý vận hành.',
                scope: 'Các sự kiện được phân công',
                badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
                user_count: users.filter(u => u.role_name === 'EVENT_MANAGER').length,
                permissions: [
                  'Khởi tạo & chỉnh sửa thông tin sự kiện',
                  'Quản lý vé, phiên hội thảo và lịch trình',
                  'Phân công nhiệm vụ cho nhân viên (Staff)',
                  'Tạo chiến dịch tiếp thị AI & Email Marketing',
                  'Xem báo cáo hiệu quả & phản hồi đại biểu'
                ]
              },
              {
                id: 'STAFF',
                name: 'Nhân Viên Điều Phối (Staff)',
                role_name: 'STAFF',
                description: 'Thực thi tác vụ vận hành tại cổng sự kiện: quét mã QR, soát vé, hỗ trợ khách.',
                scope: 'Cổng check-in & khu vực sự kiện phân công',
                badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                user_count: users.filter(u => u.role_name === 'STAFF').length,
                permissions: [
                  'Quét mã QR soát vé tốc độ cao',
                  'Xác thực vé & check-in đại biểu',
                  'Hỗ trợ đăng ký trực tiếp tại chỗ',
                  'Báo cáo sự cố vận hành & xem lịch trình',
                  'Hỗ trợ đại biểu & tiếp nhận thông báo'
                ]
              },
              {
                id: 'SPEAKER',
                name: 'Diễn Giả (Speaker)',
                role_name: 'SPEAKER',
                description: 'Trình bày tại hội thảo, tương tác Q&A với người nghe, quản lý tài liệu.',
                scope: 'Các phiên thuyết trình được mời',
                badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
                user_count: users.filter(u => u.role_name === 'SPEAKER').length,
                permissions: [
                  'Xem lịch trình diễn thuyết & thông tin phiên',
                  'Tiếp nhận & trả lời câu hỏi Q&A trực tiếp',
                  'Theo dõi đánh giá CSAT của người nghe',
                  'Cập nhật tài liệu thuyết trình & hồ sơ diễn giả'
                ]
              },
              {
                id: 'ATTENDEE',
                name: 'Khách Tham Dự (User)',
                role_name: 'ATTENDEE',
                description: 'Người dùng đăng ký tham gia sự kiện, nhận vé QR và sử dụng trợ lý AI.',
                scope: 'Cá nhân',
                badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
                user_count: users.filter(u => u.role_name === 'PARTICIPANT' || u.role_name === 'ATTENDEE').length,
                permissions: [
                  'Khám phá sự kiện công khai & đăng ký mua vé',
                  'Nhận vé điện tử có mã QR động',
                  'Hỏi đáp trợ lý AI Concierge về sự kiện',
                  'Gửi câu hỏi cho diễn giả & đánh giá sự kiện'
                ]
              }
            ]).map((role: any) => (
              <div
                key={role.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${role.badgeColor}`}>
                      {role.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                      {role.user_count ?? 0} tài khoản
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3">
                    {role.description}
                  </p>

                  <div className="text-[11px] text-slate-400 font-semibold mb-2 uppercase tracking-wider">
                    Phạm vi: <span className="text-slate-700 font-bold">{role.scope}</span>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Quyền hạn cốt lõi:
                    </p>
                    <ul className="space-y-1.5">
                      {role.permissions?.map((perm: string, pIdx: number) => (
                        <li key={pIdx} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{perm}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSearch(role.role_name === 'ATTENDEE' ? 'PARTICIPANT' : role.role_name);
                      handleTabChange('users');
                    }}
                    className="text-xs font-bold text-[#DC2626] hover:text-red-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    Xem người dùng nhóm này →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Permissions Comparison Matrix */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Bảng So Sánh Quyền Hạn Chi Tiết Giữa Các Nhóm Tác Nhân</h4>
                <p className="text-slate-500 text-xs">Mô hình phân quyền chuẩn hóa 5 actors theo tài liệu thiết kế hệ thống EventHub AI</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Tác vụ / Tính năng</th>
                    <th className="py-3 px-3 text-center">Admin</th>
                    <th className="py-3 px-3 text-center">Manager</th>
                    <th className="py-3 px-3 text-center">Staff</th>
                    <th className="py-3 px-3 text-center">Speaker</th>
                    <th className="py-3 px-3 text-center">Attendee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {[
                    { action: 'Quản lý tài khoản & phân quyền người dùng', admin: true, manager: false, staff: false, speaker: false, user: false },
                    { action: 'Cấu hình cổng gửi mail Resend & hạ tầng hệ thống', admin: true, manager: false, staff: false, speaker: false, user: false },
                    { action: 'Quản trị AI Concierge & duyệt HITL', admin: true, manager: true, staff: true, speaker: false, user: false },
                    { action: 'Kho tri thức RAG Knowledge Base', admin: true, manager: true, staff: false, speaker: false, user: false },
                    { action: 'Khởi tạo sự kiện & quản lý phiên hội thảo', admin: true, manager: true, staff: false, speaker: false, user: false },
                    { action: 'Chiến dịch Email Marketing & AI PR Studio', admin: true, manager: true, staff: false, speaker: false, user: false },
                    { action: 'Quét mã QR soát vé & check-in đại biểu', admin: true, manager: true, staff: true, speaker: false, user: false },
                    { action: 'Hỗ trợ đăng ký & giải quyết sự cố tại cổng', admin: true, manager: true, staff: true, speaker: false, user: false },
                    { action: 'Quản lý tài liệu thuyết trình & Q&A sân khấu', admin: true, manager: true, staff: false, speaker: true, user: false },
                    { action: 'Khám phá sự kiện, mua vé & nhận vé QR', admin: true, manager: true, staff: false, speaker: false, user: true },
                    { action: 'Báo cáo doanh thu & kiểm toán toàn diện', admin: true, manager: true, staff: false, speaker: false, user: false },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">{row.action}</td>
                      <td className="py-3 px-3 text-center">{row.admin ? <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                      <td className="py-3 px-3 text-center">{row.manager ? <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                      <td className="py-3 px-3 text-center">{row.staff ? <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                      <td className="py-3 px-3 text-center">{row.speaker ? <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                      <td className="py-3 px-3 text-center">{row.user ? <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {roleDropdownOpen !== null && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setRoleDropdownOpen(null)}
        />
      )}
    </div>
  );
};

export default UserManagement;
