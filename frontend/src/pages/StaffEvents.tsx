import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  QrCode,
  Users,
  Clock,
  Search,
  AlertTriangle,
  CheckCircle2,
  Phone,
  BookOpen,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { apiService } from '../services/api';
import { StaffAssignedEvent } from '../types';
import { formatVietnamDateTime } from '../utils/formatters';

export const StaffEvents: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<StaffAssignedEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<StaffAssignedEvent | null>(null);
  const [incidentModalOpen, setIncidentModalOpen] = useState<boolean>(false);
  const [incidentEvent, setIncidentEvent] = useState<StaffAssignedEvent | null>(null);
  const [incidentType, setIncidentType] = useState<string>('INVALID_TICKET');
  const [incidentSeverity, setIncidentSeverity] = useState<string>('MEDIUM');
  const [incidentTitle, setIncidentTitle] = useState<string>('');
  const [incidentDesc, setIncidentDesc] = useState<string>('');
  const [incidentTicketCode, setIncidentTicketCode] = useState<string>('');
  const [submittingIncident, setSubmittingIncident] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignedEvents();
  }, []);

  const fetchAssignedEvents = async () => {
    try {
      setLoading(true);
      const data = await apiService.getStaffAssignedEvents();
      setEvents(data);
    } catch (err) {
      console.error('Error fetching staff assigned events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenIncidentModal = (e: React.MouseEvent, ev: StaffAssignedEvent) => {
    e.stopPropagation();
    setIncidentEvent(ev);
    setIncidentTitle(`Sự cố vận hành tại sự kiện: ${ev.title}`);
    setIncidentDesc('');
    setIncidentTicketCode('');
    setIncidentModalOpen(true);
  };

  const handleSubmitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentEvent || !incidentTitle || !incidentDesc) return;
    try {
      setSubmittingIncident(true);
      await apiService.reportStaffIncident({
        event_id: incidentEvent.id,
        incident_type: incidentType,
        severity: incidentSeverity,
        title: incidentTitle,
        description: incidentDesc,
        ticket_code: incidentTicketCode || undefined,
      });
      setToastMessage('Đã gửi báo cáo sự cố thành công tới Ban Quản lý sự kiện!');
      setIncidentModalOpen(false);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Error reporting incident:', err);
      alert('Không thể gửi báo cáo. Vui lòng thử lại!');
    } finally {
      setSubmittingIncident(false);
    }
  };

  const filteredEvents = events.filter((ev) =>
    ev.title.toLowerCase().includes(search.toLowerCase()) ||
    ev.location.toLowerCase().includes(search.toLowerCase()) ||
    (ev.duty_role && ev.duty_role.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-cyan-900/40 via-blue-900/30 to-indigo-950/40 border border-cyan-800/40 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Phân công ca trực
            </span>
            <span className="text-xs text-slate-400">Thời gian thực</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sự Kiện Được Phân Công</h1>
          <p className="text-sm text-slate-300 mt-1">
            Theo dõi vị trí chốt trực, tiến độ soát vé và phối hợp vận hành tại sự kiện được chỉ định.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/check-in')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Mở máy quét QR</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên sự kiện, hội trường hoặc vị trí trực..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-800/40 border border-slate-700/40 animate-pulse" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/60">
          <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-300">Không tìm thấy sự kiện phân công nào</h3>
          <p className="text-sm text-slate-400 mt-1">
            Hiện bạn chưa có phân công ca trực phù hợp với điều kiện tìm kiếm.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((ev) => {
            const checkinRate = ev.checkin_rate_percent || 0;
            return (
              <div
                key={ev.id}
                className="group flex flex-col justify-between rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-cyan-500/50 transition-all duration-200 hover:shadow-xl hover:shadow-cyan-950/20 overflow-hidden"
              >
                {/* Banner / Header */}
                <div className="relative h-36 bg-slate-800 overflow-hidden">
                  {ev.banner_url ? (
                    <img
                      src={ev.banner_url}
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-cyan-900/50 via-slate-800 to-indigo-950 flex items-center justify-center">
                      <Calendar className="w-10 h-10 text-cyan-400/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                      {ev.status || 'PUBLISHED'}
                    </span>
                  </div>

                  {/* ID Badge */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-900/80 text-slate-300 border border-slate-700/60">
                      ID #{ev.id}
                    </span>
                  </div>

                  {/* Duty role overlay */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs">
                    <span className="px-2.5 py-1 rounded-md bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-medium">
                      🎯 {ev.duty_role || 'Soát vé QR'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-base line-clamp-2 group-hover:text-cyan-300 transition-colors">
                      {ev.title}
                    </h3>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>
                          {ev.start_time ? formatVietnamDateTime(ev.start_time) : 'Đang cập nhật'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                      {ev.duty_notes && (
                        <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-300 text-xs mt-2">
                          <span className="font-semibold text-cyan-400">Ghi chú ca: </span>
                          {ev.duty_notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Checkin Progress */}
                  <div className="pt-3 border-t border-slate-800/60">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        Tiến độ Check-in
                      </span>
                      <span className="font-bold text-white">
                        {ev.checkin_count} / {ev.total_attendees}{' '}
                        <span className="text-cyan-400 font-normal">({checkinRate}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, checkinRate))}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => navigate(`/check-in?event_id=${ev.id}`)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Quét QR</span>
                    </button>
                    <button
                      onClick={() => navigate(`/staff/attendees?event_id=${ev.id}`)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Danh sách</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      onClick={() => navigate(`/staff/schedule?event_id=${ev.id}`)}
                      className="text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Lịch trình</span>
                    </button>
                    <button
                      onClick={(e) => handleOpenIncidentModal(e, ev)}
                      className="text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Báo sự cố</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Incident Modal */}
      {incidentModalOpen && incidentEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="text-lg font-bold text-white">Báo Cáo Sự Cố Vận Hành</h3>
              </div>
              <button
                onClick={() => setIncidentModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Sự kiện</label>
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-200">
                  {incidentEvent.title}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Loại sự cố</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="INVALID_TICKET">Vé giả / Sai thông tin</option>
                    <option value="TICKET_ALREADY_USED">Vé báo đã dùng</option>
                    <option value="DEVICE_NETWORK_ISSUE">Mất kết nối máy quét</option>
                    <option value="SEATING_ISSUE">Xung đột số ghế</option>
                    <option value="SECURITY_HAZARD">Vấn đề an ninh sảnh</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mức độ ưu tiên</label>
                  <select
                    value={incidentSeverity}
                    onChange={(e) => setIncidentSeverity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">Thấp (Low)</option>
                    <option value="MEDIUM">Trung bình (Medium)</option>
                    <option value="HIGH">Cao (High)</option>
                    <option value="CRITICAL">Khẩn cấp (Critical)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mã vé liên quan (nếu có)</label>
                <input
                  type="text"
                  value={incidentTicketCode}
                  onChange={(e) => setIncidentTicketCode(e.target.value)}
                  placeholder="Ví dụ: TICKET-XYZ-12345"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tiêu đề sự cố *</label>
                <input
                  type="text"
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                  required
                  placeholder="Tóm tắt ngắn gọn tình huống phát sinh..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mô tả chi tiết *</label>
                <textarea
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  required
                  rows={3}
                  placeholder="Mô tả cụ thể tại cổng nào, tình trạng khách, giải pháp đã áp dụng tạm thời..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIncidentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingIncident}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submittingIncident ? 'Đang gửi...' : 'Gửi Ban Quản Lý'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
