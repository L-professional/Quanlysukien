import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { apiService } from '../services/api';
import { StaffScheduleSession, StaffAssignedEvent } from '../types';
import { formatVietnamDateTime } from '../utils/formatters';

export const StaffSchedule: React.FC = () => {
  const [searchParams] = useSearchParams();
  const eventIdParam = searchParams.get('event_id');

  const [sessions, setSessions] = useState<StaffScheduleSession[]>([]);
  const [events, setEvents] = useState<StaffAssignedEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | undefined>(
    eventIdParam ? parseInt(eventIdParam, 10) : undefined
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [aiQuestionModal, setAiQuestionModal] = useState<boolean>(false);
  const [selectedSessionForAi, setSelectedSessionForAi] = useState<StaffScheduleSession | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const data = await apiService.getStaffAssignedEvents();
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const data = await apiService.getStaffSchedule(selectedEventId);
      setSessions(data);
    } catch (err) {
      console.error('Error fetching staff schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAskAiAboutSession = async (session: StaffScheduleSession) => {
    setSelectedSessionForAi(session);
    setAiQuestionModal(true);
    setAiLoading(true);
    setAiAnswer(null);

    try {
      const prompt = `Tôi là nhân viên vận hành sự kiện. Hãy cung cấp checklist chuẩn bị ngắn gọn cho phiên: "${session.title}" do "${session.speaker_name}" trình bày tại "${session.room}". Nhân viên cần lưu ý gì trước 15 phút?`;
      const res = await apiService.askStaffAIAssistant({
        message: prompt,
        event_id: session.event_id,
      });
      setAiAnswer(res.reply);
    } catch (err) {
      console.error('AI error:', err);
      setAiAnswer(
        'Checklist vận hành:\n1. Bật hệ thống đèn sảnh và micro không dây của diễn giả.\n2. Mở cửa đón khách trước 10 phút.\n3. Hướng dẫn đại biểu ngồi kín các dãy ghế đầu.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-800/40 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Lịch trình vận hành
            </span>
            <span className="text-xs text-slate-400">Thời gian thực</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lịch Trình & Các Phiên Diễn</h1>
          <p className="text-sm text-slate-300 mt-1">
            Theo dõi tiến độ các phiên hội thảo, phòng họp và phối hợp chuẩn bị kỹ thuật hội trường đúng giờ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSchedule}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Event Filter */}
      <div className="flex items-center gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <label className="text-xs font-medium text-slate-400 shrink-0">Lọc theo sự kiện:</label>
        <select
          value={selectedEventId || ''}
          onChange={(e) => setSelectedEventId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 max-w-md"
        >
          <option value="">Tất cả sự kiện phân công ({events.length})</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} (ID #{ev.id})
            </option>
          ))}
        </select>
      </div>

      {/* Schedule Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-16 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">Chưa có lịch trình phiên diễn nào</h3>
          <p className="text-xs text-slate-400">
            Lịch trình sự kiện đang được Ban Quản lý cập nhật hoặc chưa được công bố.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session, idx) => {
            const isOngoing = session.status === 'ONGOING';
            const isFinished = session.status === 'FINISHED';

            return (
              <div
                key={session.id}
                className={`p-5 rounded-2xl border transition-all duration-200 ${
                  isOngoing
                    ? 'bg-indigo-950/30 border-indigo-500/50 shadow-lg shadow-indigo-950/30'
                    : isFinished
                    ? 'bg-slate-900/50 border-slate-800/60 opacity-80'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Time & Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-800/40 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {session.start_time ? formatVietnamDateTime(session.start_time) : 'Đang xếp lịch'}
                      </span>

                      {isOngoing && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                          ● ĐANG DIỄN RA
                        </span>
                      )}
                      {session.status === 'UPCOMING' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Sắp diễn ra
                        </span>
                      )}
                      {isFinished && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Đã kết thúc
                        </span>
                      )}

                      <span className="text-xs text-slate-400 truncate max-w-xs">
                        ({session.event_title})
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {session.title}
                    </h3>

                    {session.description && (
                      <p className="text-xs text-slate-300 line-clamp-2 max-w-2xl">
                        {session.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                      <div className="flex items-center gap-1.5 text-indigo-300">
                        <User className="w-3.5 h-3.5" />
                        <span>Diễn giả: {session.speaker_name || 'Đang cập nhật'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-rose-300">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Phòng: {session.room || 'Hội trường chính'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Operational Actions */}
                  <div className="flex items-center gap-2 self-start md:self-center">
                    <button
                      onClick={() => handleAskAiAboutSession(session)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>SOP Hướng dẫn</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Assistant Modal for Session SOP */}
      {aiQuestionModal && selectedSessionForAi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">SOP Hướng Dẫn Vận Hành Phiên Diễn</h3>
              </div>
              <button
                onClick={() => setAiQuestionModal(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs space-y-1">
              <div className="font-semibold text-white">{selectedSessionForAi.title}</div>
              <div className="text-slate-400">Diễn giả: {selectedSessionForAi.speaker_name} | {selectedSessionForAi.room}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
              {aiLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span>Trợ lý AI đang tạo checklist vận hành thực địa...</span>
                </div>
              ) : (
                aiAnswer
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAiQuestionModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Đã nắm rõ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
