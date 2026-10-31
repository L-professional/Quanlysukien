import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, CheckCircle, Clock, Search, Download,
  RefreshCw, UserCheck, Phone, Mail, Building, QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { Event, ManagerAttendeeItem } from '../types';

export const ManagerAttendees: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [attendees, setAttendees] = useState<ManagerAttendeeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Load events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const evList = await apiService.getManagerEvents();
        setEvents(evList);
        if (evList.length > 0) {
          setSelectedEventId(evList[0].id);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách sự kiện:', err);
        toast.error('Không thể tải danh sách sự kiện');
      }
    };
    fetchEvents();
  }, []);

  // Fetch attendees
  const fetchAttendeesList = async (eventId: number | null) => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiService.getManagerAttendees({
        event_id: eventId,
        search: searchQuery.trim() || undefined,
        ticket_type: ticketTypeFilter !== 'all' ? ticketTypeFilter : undefined,
        is_checked_in:
          statusFilter === 'checked_in'
            ? true
            : statusFilter === 'not_checked_in'
            ? false
            : undefined,
      });
      setAttendees(data);
    } catch (err) {
      console.error('Lỗi tải danh sách người tham dự:', err);
      toast.error('Không thể tải danh sách người tham dự');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendeesList(selectedEventId);
  }, [selectedEventId, statusFilter, ticketTypeFilter]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAttendeesList(selectedEventId);
  };

  // Toggle check-in status
  const handleToggleCheckin = async (attendee: ManagerAttendeeItem) => {
    setTogglingId(attendee.id);
    try {
      const res = await apiService.toggleAttendeeCheckIn(attendee.id);
      if (res.success) {
        toast.success(res.message);
        setAttendees((prev) =>
          prev.map((a) =>
            a.id === attendee.id
              ? {
                  ...a,
                  is_checked_in: res.is_checked_in,
                  checked_in_at: res.checked_in_at || null,
                }
              : a
          )
        );
      }
    } catch (err) {
      console.error('Lỗi thao tác check-in:', err);
      toast.error('Không thể cập nhật trạng thái check-in');
    } finally {
      setTogglingId(null);
    }
  };

  // Distinct ticket types
  const ticketTypes = useMemo(() => {
    const set = new Set<string>();
    attendees.forEach((a) => {
      if (a.ticket_type) set.add(a.ticket_type);
    });
    return Array.from(set);
  }, [attendees]);

  // Stats
  const stats = useMemo(() => {
    const total = attendees.length;
    const checkedIn = attendees.filter((a) => a.is_checked_in).length;
    const pending = total - checkedIn;
    const rate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
    return { total, checkedIn, pending, rate };
  }, [attendees]);

  // Export CSV
  const handleExportCSV = () => {
    if (attendees.length === 0) {
      toast.warning('Không có dữ liệu người tham dự để xuất');
      return;
    }
    const headers = [
      'ID,Họ và tên,Email,Số điện thoại,Đơn vị,Chức danh,Hạng vé,Mã QR Token,Đã check-in,Thời điểm check-in,Ngày đăng ký\n',
    ];
    const rows = attendees.map((a) =>
      [
        a.id,
        `"${a.full_name}"`,
        a.email,
        `"${a.phone || ''}"`,
        `"${a.company || ''}"`,
        `"${a.job_title || ''}"`,
        `"${a.ticket_type}"`,
        a.qr_code_token,
        a.is_checked_in ? 'Đã check-in' : 'Chưa',
        `"${a.checked_in_at || ''}"`,
        `"${a.created_at || ''}"`,
      ].join(',')
    );
    const csvBlob = new Blob(['\ufeff' + headers.concat(rows.join('\n')).join('')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nguoi_tham_du_event_${selectedEventId || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã xuất danh sách người tham dự thành công');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wider">
              Quản Lý Sự Kiện
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Người Tham Dự</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Quản Lý & Giám Sát Người Tham Dự
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tra cứu thông tin khách mời, phân loại theo hạng vé, thực hiện xác nhận check-in thủ công tại chỗ.
          </p>
        </div>

        {/* Event selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Chọn sự kiện:
          </label>
          <select
            value={selectedEventId || ''}
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng người đăng ký</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Đã check-in vào hội trường</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.checkedIn}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Chưa có mặt</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.pending}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tỷ lệ có mặt</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.rate}%</h3>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, email, SĐT, mã QR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="checked_in">Đã check-in</option>
            <option value="not_checked_in">Chưa check-in</option>
          </select>

          <select
            value={ticketTypeFilter}
            onChange={(e) => setTicketTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả hạng vé</option>
            {ticketTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition"
          >
            Tìm kiếm
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            <Download className="w-4 h-4" />
            Xuất Danh Sách
          </button>
          <button
            onClick={() => fetchAttendeesList(selectedEventId)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg border border-slate-200"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Attendees Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Đang tải danh sách người tham dự...</p>
          </div>
        ) : attendees.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">Chưa có người tham dự nào</h3>
            <p className="text-xs text-slate-400 mt-1">
              Không tìm thấy hồ sơ người tham dự nào phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Khách Tham Dự</th>
                  <th className="px-6 py-4">Liên Hệ</th>
                  <th className="px-6 py-4">Đơn Vị & Chức Danh</th>
                  <th className="px-6 py-4">Hạng Vé</th>
                  <th className="px-6 py-4">Mã Vé QR</th>
                  <th className="px-6 py-4">Trạng Thái Check-in</th>
                  <th className="px-6 py-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendees.map((attendee) => (
                  <tr key={attendee.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{attendee.full_name}</div>
                      <div className="text-xs text-slate-400">ID: #{attendee.id}</div>
                    </td>

                    <td className="px-6 py-4 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{attendee.email}</span>
                      </div>
                      {attendee.phone && attendee.phone !== '—' && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{attendee.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs">
                      <div className="font-medium text-slate-800">{attendee.company || 'Cá nhân'}</div>
                      <div className="text-slate-400">{attendee.job_title || 'Khách mời'}</div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">
                        {attendee.ticket_type}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded">
                        {attendee.qr_code_token}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {attendee.is_checked_in ? (
                        <div>
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md w-fit">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Đã check-in
                          </span>
                          {attendee.checked_in_at && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {attendee.checked_in_at}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md w-fit">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Chưa check-in
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleCheckin(attendee)}
                        disabled={togglingId === attendee.id}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                          attendee.is_checked_in
                            ? 'text-red-700 bg-red-50 hover:bg-red-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {togglingId === attendee.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" />
                        ) : attendee.is_checked_in ? (
                          'Hủy check-in'
                        ) : (
                          'Xác nhận vào cổng'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
