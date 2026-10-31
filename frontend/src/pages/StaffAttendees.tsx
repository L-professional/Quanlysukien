import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  QrCode,
  Eye,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { apiService } from '../services/api';
import { StaffAttendeeItem, StaffAssignedEvent } from '../types';

export const StaffAttendees: React.FC = () => {
  const [searchParams] = useSearchParams();
  const eventIdParam = searchParams.get('event_id');

  const [attendees, setAttendees] = useState<StaffAttendeeItem[]>([]);
  const [events, setEvents] = useState<StaffAssignedEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | undefined>(
    eventIdParam ? parseInt(eventIdParam, 10) : undefined
  );
  const [search, setSearch] = useState<string>('');
  const [checkinFilter, setCheckinFilter] = useState<string>('ALL'); // ALL, CHECKED_IN, NOT_CHECKED_IN
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailModalItem, setDetailModalItem] = useState<StaffAttendeeItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchAttendees();
  }, [selectedEventId, checkinFilter, ticketTypeFilter, page]);

  const fetchEvents = async () => {
    try {
      const data = await apiService.getStaffAssignedEvents();
      setEvents(data);
    } catch (err) {
      console.error('Error fetching assigned events:', err);
    }
  };

  const fetchAttendees = async () => {
    try {
      setLoading(true);
      const isCheckedIn =
        checkinFilter === 'CHECKED_IN' ? true : checkinFilter === 'NOT_CHECKED_IN' ? false : undefined;
      const tType = ticketTypeFilter !== 'ALL' ? ticketTypeFilter : undefined;

      const res = await apiService.getStaffAttendees({
        event_id: selectedEventId,
        search: search.trim() || undefined,
        is_checked_in: isCheckedIn,
        ticket_type: tType,
        page,
        limit: 25,
      });
      setAttendees(res.items);
      setTotalCount(res.total);
    } catch (err) {
      console.error('Error fetching attendees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAttendees();
  };

  const handleManualCheckIn = async (item: StaffAttendeeItem) => {
    if (item.is_checked_in) return;
    try {
      setActionLoadingId(item.id);
      const resp = await apiService.manualCheckIn({ registration_id: item.id });
      if (resp.status === 'SUCCESS') {
        setToastMessage(`Check-in thành công cho khách: ${item.full_name}`);
        // update local list
        setAttendees((prev) =>
          prev.map((a) =>
            a.id === item.id
              ? { ...a, is_checked_in: true, checked_in_at: resp.checkInTime || 'Vừa xong' }
              : a
          )
        );
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        alert(resp.message || 'Check-in không thành công!');
      }
    } catch (err) {
      console.error('Manual check-in failed:', err);
      alert('Lỗi trong quá trình check-in!');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-800/40 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Kiểm soát người tham dự
            </span>
            <span className="text-xs text-slate-400">Dữ liệu nội bộ được bảo mật</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Danh Sách Người Tham Dự</h1>
          <p className="text-sm text-slate-300 mt-1">
            Tra cứu thông tin đại biểu, loại vé và xác nhận check-in thủ công tại bàn lễ tân/cổng soát vé.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPage(1);
              fetchAttendees();
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        {/* Event filter */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Sự kiện phụ trách</label>
          <select
            value={selectedEventId || ''}
            onChange={(e) => {
              setSelectedEventId(e.target.value ? parseInt(e.target.value, 10) : undefined);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="">Tất cả sự kiện được giao ({events.length})</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} (ID #{ev.id})
              </option>
            ))}
          </select>
        </div>

        {/* Check-in status filter */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Trạng thái Check-in</label>
          <select
            value={checkinFilter}
            onChange={(e) => {
              setCheckinFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CHECKED_IN">Đã Check-in</option>
            <option value="NOT_CHECKED_IN">Chưa Check-in</option>
          </select>
        </div>

        {/* Ticket Type filter */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Hạng vé</label>
          <select
            value={ticketTypeFilter}
            onChange={(e) => {
              setTicketTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Tất cả hạng vé</option>
            <option value="VIP">Vé VIP</option>
            <option value="Standard">Vé Tiêu Chuẩn</option>
            <option value="All-Access">Vé All-Access</option>
            <option value="Tham Dự">Vé Tham Dự</option>
          </select>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit}>
          <label className="block text-xs font-medium text-slate-400 mb-1">Tìm kiếm đại biểu</label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Họ tên, email, SĐT, mã vé..."
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </form>
      </div>

      {/* Attendees Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Hiển thị <span className="font-semibold text-white">{attendees.length}</span> / {totalCount} người tham dự
          </div>
          <div className="flex items-center gap-1 font-mono text-cyan-400">
            Trang {page}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400">Đang tải danh sách người tham dự...</p>
          </div>
        ) : attendees.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-300">Không tìm thấy người tham dự nào</h3>
            <p className="text-xs text-slate-400">
              Hãy thử thay đổi điều kiện tìm kiếm hoặc chọn sự kiện phân công khác.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Người tham dự</th>
                  <th className="py-3 px-4">Liên hệ</th>
                  <th className="py-3 px-4">Sự kiện</th>
                  <th className="py-3 px-4">Hạng vé</th>
                  <th className="py-3 px-4">Mã vé / QR</th>
                  <th className="py-3 px-4">Trạng thái Check-in</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {attendees.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{item.full_name}</div>
                      <div className="text-xs text-slate-400">ID #{item.id}</div>
                    </td>
                    <td className="py-3 px-4 text-xs space-y-0.5">
                      {item.email && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]">{item.email}</span>
                        </div>
                      )}
                      {item.phone_number && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{item.phone_number}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-medium text-slate-200 truncate max-w-[180px]">
                        {item.event_title || `Sự kiện ID #${item.event_id}`}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.ticket_type.toUpperCase().includes('VIP')
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {item.ticket_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-cyan-300">
                      <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
                        {item.qr_code_token.slice(0, 14)}...
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.is_checked_in ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã Check-in
                          </span>
                          {item.checked_in_at && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.checked_in_at}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Chưa Check-in
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDetailModalItem(item)}
                          title="Xem chi tiết vé"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!item.is_checked_in ? (
                          <button
                            onClick={() => handleManualCheckIn(item)}
                            disabled={actionLoadingId === item.id}
                            className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {actionLoadingId === item.id ? 'Đang duyệt...' : 'Check-in'}
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-400 font-semibold px-2">Hoàn tất</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Trang trước
          </button>
          <span className="text-xs text-slate-400">
            Trang {page} / {Math.max(1, Math.ceil(totalCount / 25))}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 25 >= totalCount}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Trang kế
          </button>
        </div>
      </div>

      {/* Attendee Ticket Detail Modal */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Chi Tiết Vé Đại Biểu</h3>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/60 space-y-2">
                <div className="text-xs text-slate-400">Họ và tên đại biểu</div>
                <div className="text-base font-bold text-white">{detailModalItem.full_name}</div>
                <div className="text-xs text-cyan-400">{detailModalItem.ticket_type}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40">
                  <span className="text-slate-400 block mb-0.5">Email</span>
                  <span className="text-slate-200 font-medium truncate block">{detailModalItem.email || '—'}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40">
                  <span className="text-slate-400 block mb-0.5">Số điện thoại</span>
                  <span className="text-slate-200 font-medium">{detailModalItem.phone_number || '—'}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40 text-xs">
                <span className="text-slate-400 block mb-0.5">Mã token QR</span>
                <span className="font-mono text-cyan-300 break-all select-all">{detailModalItem.qr_code_token}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40 text-xs">
                <span className="text-slate-400 block mb-0.5">Tình trạng vào cổng</span>
                {detailModalItem.is_checked_in ? (
                  <span className="text-emerald-400 font-semibold">
                    Đã soát vé lúc {detailModalItem.checked_in_at || 'trước đó'}
                  </span>
                ) : (
                  <span className="text-amber-400 font-semibold">Chưa quét mã tại cổng</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDetailModalItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              {!detailModalItem.is_checked_in && (
                <button
                  onClick={() => {
                    handleManualCheckIn(detailModalItem);
                    setDetailModalItem(null);
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Xác nhận Check-in ngay
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
