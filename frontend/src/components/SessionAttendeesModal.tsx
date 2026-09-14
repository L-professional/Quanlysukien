import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Search,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  UserCheck,
  RotateCcw,
  Users,
  FileSpreadsheet,
  Building2,
  Phone,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { EventScheduleItem, SessionAttendee } from '../types';
import { apiService } from '../services/api';

export interface SessionAttendeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: EventScheduleItem | null;
}

export const SessionAttendeesModal: React.FC<SessionAttendeesModalProps> = ({
  isOpen,
  onClose,
  session,
}) => {
  const [attendees, setAttendees] = useState<SessionAttendee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'not_checked_in'>('all');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchAttendees = useCallback(async () => {
    if (!session?.id) return;
    setLoading(true);
    try {
      const res = await apiService.getSessionAttendees(session.id);
      if (res.success && Array.isArray(res.data)) {
        setAttendees(res.data);
      } else {
        setAttendees([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch session attendees:', err);
      const msg = err?.response?.data?.detail || 'Không thể tải danh sách người tham dự. Vui lòng thử lại!';
      toast.error(msg);
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  }, [session?.id]);

  useEffect(() => {
    if (isOpen && session?.id) {
      fetchAttendees();
    } else {
      setAttendees([]);
      setSearchQuery('');
      setStatusFilter('all');
    }
  }, [isOpen, session?.id, fetchAttendees]);

  // Real-time filtered attendees
  const filteredAttendees = useMemo(() => {
    return attendees.filter((item) => {
      // Status filter
      if (statusFilter === 'checked_in' && !item.is_checked_in) return false;
      if (statusFilter === 'not_checked_in' && item.is_checked_in) return false;

      // Search keyword
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.full_name || '').toLowerCase().includes(q);
        const matchEmail = (item.email || '').toLowerCase().includes(q);
        const matchPhone = (item.phone || '').toLowerCase().includes(q);
        const matchCompany = (item.company || '').toLowerCase().includes(q);
        const matchToken = (item.qr_code_token || '').toLowerCase().includes(q);
        return matchName || matchEmail || matchPhone || matchCompany || matchToken;
      }
      return true;
    });
  }, [attendees, statusFilter, searchQuery]);

  const checkedInCount = useMemo(() => {
    return attendees.filter((a) => a.is_checked_in).length;
  }, [attendees]);

  const notCheckedInCount = attendees.length - checkedInCount;

  // Toggle check-in action
  const handleToggleCheckin = async (attendee: SessionAttendee) => {
    setTogglingId(attendee.id);
    try {
      const res = await apiService.toggleAttendeeCheckin(attendee.id);
      if (res.success) {
        toast.success(
          res.is_checked_in
            ? `Đã check-in thành công cho "${attendee.full_name}"!`
            : `Đã hủy check-in cho "${attendee.full_name}"!`
        );

        setAttendees((prev) =>
          prev.map((a) =>
            a.id === attendee.id
              ? {
                  ...a,
                  is_checked_in: res.is_checked_in,
                  checked_in_at: res.checked_in_at,
                }
              : a
          )
        );
      }
    } catch (err: any) {
      console.error('Failed to toggle checkin:', err);
      const msg = err?.response?.data?.detail || 'Không thể cập nhật trạng thái check-in';
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  };

  // Export CSV / Excel action
  const handleExportExcel = async () => {
    if (!session?.id) return;
    setIsExporting(true);
    try {
      const blob = await apiService.exportSessionAttendeesExcel(session.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (session.title || `session_${session.id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Danh_sach_tham_du_${session.id}_${safeTitle.slice(0, 25)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Đã xuất danh sách người tham dự thành công (Excel/CSV UTF-8)!');
    } catch (err: any) {
      console.error('Failed to export attendees:', err);
      toast.error('Không thể xuất file danh sách. Vui lòng thử lại!');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    toast.success('Đã chép mã vé QR Token vào bộ nhớ tạm!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-[95vw] sm:max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        {/* Fixed Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-indigo-800/40 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-md">
              <Users className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Danh Sách Người Đăng Ký Tham Dự
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-700/50 text-[11px] font-bold text-indigo-300">
                  ID: #{session.id}
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5 line-clamp-1">
                {session.title} • {session.room_location} ({session.start_time} - {session.end_time})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary Bar & Toolbar */}
        <div className="px-6 py-4 bg-slate-950/70 border-b border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-shrink-0">
          {/* Stats Chips */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-400 font-medium">Tổng đăng ký:</span>
              <span className="font-extrabold text-white">{attendees.length}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300/80 font-medium">Đã check-in:</span>
              <span className="font-extrabold text-emerald-300">{checkedInCount}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400 font-medium">Chưa check-in:</span>
              <span className="font-extrabold text-slate-200">{notCheckedInCount}</span>
            </div>
          </div>

          {/* Action Toolbar: Search, Filter, Export, Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Real-time Search Input */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên, email, sđt, mã vé..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="all">Tất cả ({attendees.length})</option>
              <option value="checked_in">🟢 Đã check-in ({checkedInCount})</option>
              <option value="not_checked_in">⚪ Chưa check-in ({notCheckedInCount})</option>
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchAttendees}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {/* Export Excel / CSV Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || attendees.length === 0}
              className="py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-700/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Tải danh sách ra file Excel / CSV UTF-8"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xuất...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Xuất Excel/CSV</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Data Table Body */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-900/60 divide-y divide-slate-800/60">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-xs font-medium">Đang tải danh sách người tham dự...</p>
            </div>
          ) : filteredAttendees.length === 0 ? (
            <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
                <Users className="w-7 h-7 text-slate-500" />
              </div>
              <h4 className="font-bold text-slate-200 text-sm">
                {attendees.length === 0
                  ? 'Chưa có người tham dự nào đăng ký phiên này'
                  : 'Không tìm thấy người tham dự phù hợp bộ lọc'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm">
                {attendees.length === 0
                  ? 'Khi người dùng hoặc khách mời đăng ký vé tham dự phiên, thông tin sẽ xuất hiện tại đây theo thời gian thực.'
                  : 'Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn lại bộ lọc trạng thái check-in.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4 min-w-[180px]">Họ & Tên</th>
                    <th className="py-3 px-4 min-w-[200px]">Liên Hệ (Email & SĐT)</th>
                    <th className="py-3 px-4 min-w-[170px]">Đơn Vị / Chức Danh</th>
                    <th className="py-3 px-4 min-w-[160px]">Mã QR Token</th>
                    <th className="py-3 px-4 min-w-[140px]">Trạng Thái</th>
                    <th className="py-3 px-4 min-w-[150px] text-right">Thao Tác Soát Vé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredAttendees.map((attendee, index) => {
                    const isRowToggling = togglingId === attendee.id;
                    const initials = attendee.full_name
                      ? attendee.full_name
                          .split(' ')
                          .filter(Boolean)
                          .map((n) => n[0])
                          .slice(-2)
                          .join('')
                          .toUpperCase()
                      : 'KH';

                    return (
                      <tr
                        key={attendee.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          attendee.is_checked_in ? 'bg-emerald-950/10' : ''
                        }`}
                      >
                        {/* STT */}
                        <td className="py-3 px-4 text-center font-mono text-slate-400 text-xs">
                          {index + 1}
                        </td>

                        {/* Họ & Tên */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-[11px] shadow-xs flex-shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-white text-xs">{attendee.full_name}</div>
                              <div className="text-[10px] text-indigo-300/80 font-medium">
                                {attendee.ticket_type || 'Vé Tham Dự'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email & Phone */}
                        <td className="py-3 px-4 space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{attendee.email || '—'}</span>
                          </div>
                          {attendee.phone && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              <span>{attendee.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Company & Job Title */}
                        <td className="py-3 px-4 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{attendee.company || 'Cá nhân'}</span>
                          </div>
                          {attendee.job_title && (
                            <div className="text-[11px] text-slate-400 pl-5 truncate max-w-[160px]">
                              {attendee.job_title}
                            </div>
                          )}
                        </td>

                        {/* QR Code Token */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <code className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-indigo-300 select-all max-w-[130px] truncate">
                              {attendee.qr_code_token}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopyToken(attendee.qr_code_token)}
                              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                              title="Sao chép mã token"
                            >
                              {copiedToken === attendee.qr_code_token ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Trạng Thái */}
                        <td className="py-3 px-4">
                          {attendee.is_checked_in ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                🟢 Đã Check-in
                              </span>
                              {attendee.checked_in_at && (
                                <div className="text-[10px] text-slate-400 pl-1">
                                  {new Date(attendee.checked_in_at).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[10px] font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              ⚪ Chưa Check-in
                            </span>
                          )}
                        </td>

                        {/* Thao Tác Soát Vé Bằng Tay */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={isRowToggling}
                            onClick={() => handleToggleCheckin(attendee)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 ${
                              attendee.is_checked_in
                                ? 'bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 border border-slate-700 hover:border-rose-800/50 text-slate-300'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-700/20'
                            }`}
                          >
                            {isRowToggling ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang xử lý...</span>
                              </>
                            ) : attendee.is_checked_in ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Bỏ Check-in</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Đánh dấu Check-in</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Fixed Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between flex-shrink-0 text-xs text-slate-400">
          <div>
            Hiển thị{' '}
            <span className="font-bold text-white">{filteredAttendees.length}</span> /{' '}
            <span className="font-bold text-white">{attendees.length}</span> người tham dự
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer flex items-center justify-center"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
