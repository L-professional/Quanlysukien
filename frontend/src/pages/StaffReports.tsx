import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Users,
  AlertTriangle,
  Clock,
  Zap,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { apiService } from '../services/api';
import { StaffOperationalReport, StaffIncidentItem, StaffAssignedEvent } from '../types';

export const StaffReports: React.FC = () => {
  const [report, setReport] = useState<StaffOperationalReport | null>(null);
  const [incidents, setIncidents] = useState<StaffIncidentItem[]>([]);
  const [events, setEvents] = useState<StaffAssignedEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const data = await apiService.getStaffAssignedEvents();
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [reportData, incidentsData] = await Promise.all([
        apiService.getStaffReports(selectedEventId),
        apiService.getStaffIncidents({ event_id: selectedEventId }),
      ]);
      setReport(reportData);
      setIncidents(incidentsData);
    } catch (err) {
      console.error('Error fetching staff report:', err);
    } finally {
      setLoading(false);
    }
  };

  const maxScanHourCount = report?.hourly_distribution
    ? Math.max(...report.hourly_distribution.map((h) => h.count), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-900 border border-blue-800/40 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Báo cáo ca trực & Vận hành
            </span>
            <span className="text-xs text-slate-400">Dữ liệu thực tế</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Báo Cáo Vận Hành Thực Địa</h1>
          <p className="text-sm text-slate-300 mt-1">
            Tổng kết số lượt soát vé, mật độ thông cổng theo giờ và các sự cố đã ghi nhận trong ca.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReportData}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Cập nhật</span>
          </button>
        </div>
      </div>

      {/* Event Scope Filter */}
      <div className="flex items-center gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <label className="text-xs font-medium text-slate-400 shrink-0">Phạm vi sự kiện:</label>
        <select
          value={selectedEventId || ''}
          onChange={(e) => setSelectedEventId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500 max-w-md"
        >
          <option value="">Tất cả sự kiện phân công ({events.length})</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} (ID #{ev.id})
            </option>
          ))}
        </select>
      </div>

      {loading || !report ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-800/40 border border-slate-700/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Lượt Check-in hoàn tất</span>
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {report.summary.total_checked_in}{' '}
                <span className="text-xs text-slate-400 font-normal">/ {report.summary.total_attendees}</span>
              </div>
              <div className="text-xs text-cyan-400 font-medium">
                Tỷ lệ thông cổng: {report.summary.checkin_rate_percent}%
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Khách chưa Check-in</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-300">
                {report.summary.remaining}
              </div>
              <div className="text-xs text-slate-400">Đại biểu dự kiến đến tiếp</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Tiến độ nhiệm vụ ca</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {report.summary.tasks_completion_percent}%
              </div>
              <div className="text-xs text-slate-400">Đã hoàn thành đúng hạn</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Tốc độ quét trung bình</span>
                <Zap className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-indigo-300">
                {report.summary.avg_scan_speed}
              </div>
              <div className="text-xs text-slate-400">Độ trễ thấp, không dồn ứ cổng</div>
            </div>
          </div>

          {/* Hourly Distribution & Ticket Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hourly Scanning Chart */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Mật Độ Soát Vé Theo Khung Giờ
              </h2>
              <div className="space-y-3 pt-2">
                {report.hourly_distribution.map((h) => {
                  const percent = Math.round((h.count / maxScanHourCount) * 100);
                  return (
                    <div key={h.hour} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-300 font-semibold">{h.hour}</span>
                        <span className="font-bold text-white">{h.count} lượt quét</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ticket Breakdown */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Phân Loại Theo Hạng Vé
              </h2>
              <div className="space-y-3">
                {report.ticket_breakdown.map((t) => (
                  <div key={t.ticket_type} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-white">{t.ticket_type}</span>
                      <span className="text-cyan-400">{t.rate}%</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Đã soát: <span className="text-white font-medium">{t.checked_in}</span> / {t.total} vé
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Incident History Table */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Nhật Ký Sự Cố Vận Hành Đã Báo Cáo ({incidents.length})
              </h2>
            </div>

            {incidents.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-800/40 text-center text-xs text-slate-400">
                Chưa ghi nhận sự cố nào phát sinh trong ca trực của các sự kiện này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-200">
                  <thead className="bg-slate-800/60 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">Mức độ</th>
                      <th className="py-2.5 px-3">Tiêu đề sự cố</th>
                      <th className="py-2.5 px-3">Mã vé liên quan</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3">Phản hồi của Quản lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {incidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{inc.reported_at}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              inc.severity === 'CRITICAL' || inc.severity === 'HIGH'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">{inc.title}</td>
                        <td className="py-2.5 px-3 font-mono text-cyan-300">{inc.ticket_code || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {inc.manager_response || 'Đang chờ Quản lý xử lý...'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
