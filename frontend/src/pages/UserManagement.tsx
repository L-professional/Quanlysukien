import React, { useState, useEffect, useCallback } from 'react';
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
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<AdminUser | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getAdminUsers();
      setUsers(data);
    } catch {
      toast.error(t('users.loadUsersFailed', { defaultValue: 'Không thể tải danh sách người dùng' }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadLogs = useCallback(async () => {
    try {
      const data = await apiService.getSecurityLogs();
      setLogs(data);
    } catch {
      toast.error(t('users.loadLogsFailed', { defaultValue: 'Không thể tải nhật ký bảo mật' }));
    }
  }, [t]);

  useEffect(() => {
    loadUsers();
    loadLogs();
  }, [loadUsers, loadLogs]);

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
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
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
      await new Promise((r) => setTimeout(r, 800));
      toast.success(`Đã gửi thư mời tham gia hệ thống với vai trò ${inviteForm.role} tới "${inviteForm.email}"!`);
      setIsInviteModalOpen(false);
      setInviteForm({ email: '', full_name: '', role: 'ATTENDEE', message: '' });
    } catch {
      toast.error('Gửi thư mời thất bại. Vui lòng thử lại!');
    } finally {
      setIsInviting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    online: users.filter((u) => u.is_online).length,
    admins: users.filter((u) => u.role_name.toUpperCase() === 'ADMIN').length,
    locked: users.filter((u) => !u.is_active).length,
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
          { id: 'users', label: t('nav.users'), icon: Users },
          { id: 'logs', label: t('nav.logs'), icon: Shield },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === id
                ? 'bg-red-600 text-white shadow-xs'
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
