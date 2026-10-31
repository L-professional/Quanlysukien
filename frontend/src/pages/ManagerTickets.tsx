import React, { useState, useEffect, useMemo } from 'react';
import {
  Ticket, DollarSign, CheckCircle2, Clock, Search,
  Download, RefreshCw, Filter, QrCode, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { Event, ManagerTicketItem } from '../types';

export const ManagerTickets: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [tickets, setTickets] = useState<ManagerTicketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string>('all');

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

  // Load tickets when selected event or status changes
  useEffect(() => {
    if (!selectedEventId) {
      setLoading(false);
      return;
    }
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const data = await apiService.getManagerTickets(
          selectedEventId,
          statusFilter !== 'all' ? statusFilter : undefined
        );
        setTickets(data);
      } catch (err) {
        console.error('Lỗi tải danh sách vé:', err);
        toast.error('Không thể tải danh sách vé');
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [selectedEventId, statusFilter]);

  // Distinct ticket types
  const ticketTypes = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      if (t.ticket_type) set.add(t.ticket_type);
    });
    return Array.from(set);
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        t.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.buyer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.qr_code_token.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = ticketTypeFilter === 'all' || t.ticket_type === ticketTypeFilter;
      return matchSearch && matchType;
    });
  }, [tickets, searchQuery, ticketTypeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = tickets.length;
    const totalRevenue = tickets.reduce((acc, t) => acc + (t.price || 0), 0);
    const checkedInCount = tickets.filter((t) => t.is_checked_in).length;
    const checkinRate = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;
    return { totalCount, totalRevenue, checkedInCount, checkinRate };
  }, [tickets]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      toast.warning('Không có dữ liệu vé để xuất file');
      return;
    }
    const headers = ['ID,Tên sự kiện,Người mua,Email,Hạng vé,Giá tiền,Mã vé QR,Đã check-in,Thanh toán,Ngày tạo\n'];
    const rows = filteredTickets.map((t) =>
      [
        t.id,
        `"${t.event_title}"`,
        `"${t.buyer_name}"`,
        t.buyer_email,
        `"${t.ticket_type}"`,
        t.price,
        t.qr_code_token,
        t.is_checked_in ? 'Đã check-in' : 'Chưa',
        t.payment_status,
        t.created_at,
      ].join(',')
    );
    const csvBlob = new Blob(['\ufeff' + headers.concat(rows.join('\n')).join('')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_ve_event_${selectedEventId || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã xuất danh sách vé thành công ra tệp CSV');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full uppercase tracking-wider">
              Quản Lý Sự Kiện
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Quản Lý Vé & Hạng Vé</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Quản Lý Phát Hành Vé & Hạng Vé
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi hạng vé, dòng tiền doanh thu bán vé, kiểm tra tình trạng vé QR phát hành thực tế.
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
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng vé phát hành</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.totalCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng doanh thu vé</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {stats.totalRevenue.toLocaleString('vi-VN')} đ
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Vé đã check-in</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.checkedInCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tỷ lệ hoàn thành check-in</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.checkinRate}%</h3>
          </div>
        </div>
      </div>

      {/* Filter and Actions Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên người mua, email, mã vé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="checked_in">Đã check-in</option>
            <option value="not_checked_in">Chưa check-in</option>
            <option value="paid">Đã thanh toán (PAID)</option>
          </select>

          <select
            value={ticketTypeFilter}
            onChange={(e) => setTicketTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Tất cả hạng vé</option>
            {ticketTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
          >
            <Download className="w-4 h-4" />
            Xuất CSV
          </button>
          <button
            onClick={() => {
              if (selectedEventId) {
                setLoading(true);
                apiService
                  .getManagerTickets(selectedEventId, statusFilter !== 'all' ? statusFilter : undefined)
                  .then((data) => setTickets(data))
                  .finally(() => setLoading(false));
              }
            }}
            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-50 rounded-lg border border-slate-200"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Đang tải danh sách vé sự kiện...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-16 text-center">
            <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">Chưa có vé nào</h3>
            <p className="text-xs text-slate-400 mt-1">
              Không tìm thấy vé nào phù hợp với bộ lọc tìm kiếm.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Mã Vé / QR Token</th>
                  <th className="px-6 py-4">Người Mua</th>
                  <th className="px-6 py-4">Hạng Vé</th>
                  <th className="px-6 py-4">Giá Tiền</th>
                  <th className="px-6 py-4">Thanh Toán</th>
                  <th className="px-6 py-4">Trạng Thái Check-in</th>
                  <th className="px-6 py-4">Ngày Phát Hành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono text-xs text-slate-800 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{t.qr_code_token}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{t.buyer_name}</p>
                        <p className="text-xs text-slate-400">{t.buyer_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">
                        {t.ticket_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {t.price > 0 ? `${t.price.toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                          t.payment_status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {t.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chờ xử lý'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {t.is_checked_in ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md w-fit">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Đã check-in
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md w-fit">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Chưa check-in
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {t.created_at}
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
