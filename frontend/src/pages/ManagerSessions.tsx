import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Clock, MapPin, User, AlertTriangle, CheckCircle,
  Plus, Users, Search, RefreshCw, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { Event, ManagerSessionItem, EventScheduleItem } from '../types';
import { SessionAttendeesModal } from '../components/SessionAttendeesModal';

export const ManagerSessions: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<ManagerSessionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedSessionForAttendees, setSelectedSessionForAttendees] = useState<EventScheduleItem | null>(null);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState<boolean>(false);

  // Load events owned/managed by manager
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

  // Load sessions when selected event changes
  useEffect(() => {
    if (!selectedEventId) {
      setLoading(false);
      return;
    }
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const data = await apiService.getManagerSessions(selectedEventId);
        setSessions(data);
      } catch (err) {
        console.error('Lỗi tải danh sách phiên:', err);
        toast.error('Không thể tải lịch trình phiên sự kiện');
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [selectedEventId]);

  // Distinct tracks
  const tracks = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (s.track) set.add(s.track);
    });
    return Array.from(set);
  }, [sessions]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.speaker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.room_location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTrack = selectedTrack === 'all' || s.track === selectedTrack;
      return matchSearch && matchTrack;
    });
  }, [sessions, searchQuery, selectedTrack]);

  // Conflict count
  const conflictsCount = useMemo(() => {
    return sessions.filter((s) => s.has_conflict).length;
  }, [sessions]);

  const handleOpenAttendees = (sessionItem: ManagerSessionItem) => {
    const mapped: EventScheduleItem = {
      id: sessionItem.id,
      event_id: sessionItem.event_id,
      title: sessionItem.title,
      description: sessionItem.description || '',
      speaker_name: sessionItem.speaker_name,
      speaker_role: sessionItem.speaker_role || 'Diễn giả',
      room_location: sessionItem.room_location,
      start_time: sessionItem.start_time,
      end_time: sessionItem.end_time,
      day_number: sessionItem.day_number,
      date_label: sessionItem.date_label,
      track: sessionItem.track,
      capacity: sessionItem.capacity,
      registered_count: sessionItem.registered_count,
    };
    setSelectedSessionForAttendees(mapped);
    setIsAttendeesModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full uppercase tracking-wider">
              Quản Lý Sự Kiện
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Lịch Trình & Phiên</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Lịch Trình & Điều Phối Phiên Sự Kiện
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kiểm soát khung giờ, phân bổ phòng họp, phát hiện xung đột diễn giả tự động bằng AI.
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
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conflict Alert Banner if any conflict is detected */}
      {conflictsCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-900">
              Cảnh báo: Phát hiện {conflictsCount} xung đột thời gian hoặc phòng họp!
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Hệ thống phát hiện có các phiên bị trùng lặp thời gian trong cùng một phòng họp hoặc cùng một diễn giả được xếp lịch đồng thời. Vui lòng kiểm tra các thẻ được đánh dấu viền đỏ bên dưới để điều chỉnh lại lịch trình.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên phiên, diễn giả, phòng họp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedTrack}
            onChange={(e) => setSelectedTrack(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tất cả chủ đề (Track)</option>
            {tracks.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => {
              if (selectedEventId) {
                setLoading(true);
                apiService
                  .getManagerSessions(selectedEventId)
                  .then((data) => setSessions(data))
                  .finally(() => setLoading(false));
              }
            }}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg border border-slate-200"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="p-16 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Đang đồng bộ lịch trình các phiên...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-100">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">Chưa có phiên sự kiện nào</h3>
          <p className="text-xs text-slate-400 mt-1">
            Không tìm thấy phiên diễn thuyết nào cho sự kiện này hoặc bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                session.has_conflict
                  ? 'border-red-300 bg-red-50/20 ring-1 ring-red-400'
                  : 'border-slate-100'
              }`}
            >
              <div className="space-y-3">
                {/* Track & Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">
                    {session.track || 'Tổng quát'}
                  </span>
                  {session.has_conflict ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100/80 px-2 py-0.5 rounded-md">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Xung đột
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      Hợp lệ
                    </span>
                  )}
                </div>

                {/* Session Title */}
                <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                  {session.title}
                </h3>

                {session.conflict_reason && (
                  <p className="text-xs text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">
                    {session.conflict_reason}
                  </p>
                )}

                {/* Meta details */}
                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">{session.speaker_name}</span>
                    {session.speaker_role && (
                      <span className="text-slate-400">({session.speaker_role})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {session.start_time} - {session.end_time} ({session.date_label || `Ngày ${session.day_number}`})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-700 font-medium">{session.room_location}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Footer: Registrations & Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-700">{session.registered_count}</span>
                  <span>/ {session.capacity} chỗ</span>
                </div>

                <button
                  onClick={() => handleOpenAttendees(session)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                >
                  Danh sách khách
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Attendees Modal */}
      {isAttendeesModalOpen && selectedSessionForAttendees && (
        <SessionAttendeesModal
          isOpen={isAttendeesModalOpen}
          onClose={() => {
            setIsAttendeesModalOpen(false);
            setSelectedSessionForAttendees(null);
          }}
          session={selectedSessionForAttendees}
        />
      )}
    </div>
  );
};
