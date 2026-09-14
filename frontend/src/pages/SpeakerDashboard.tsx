import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  Users,
  MessageSquare,
  FileText,
  Clock,
  MapPin,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  Radio,
  Tv,
} from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const SpeakerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'live' | 'upcoming' | 'ended'>('ALL');

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await apiService.getSpeakerMySessions();
      setSessions(data);
    } catch (err) {
      console.error('Error fetching speaker sessions:', err);
      toast.error('Không thể tải danh sách phiên của Diễn Giả');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const filteredSessions = sessions.filter((s) => {
    if (filterStatus === 'ALL') return true;
    return s.status === filterStatus;
  });

  const totalAssigned = sessions.length;
  const liveCount = sessions.filter((s) => s.status === 'live').length;
  const totalCheckedIn = sessions.reduce((acc, s) => acc + (s.checked_in_count || 0), 0);
  const totalQuestions = sessions.reduce((acc, s) => acc + (s.total_questions || 0), 0);
  const pendingQuestions = sessions.reduce((acc, s) => acc + (s.pending_questions || 0), 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wide">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>CỔNG THỐNG KÊ & ĐIỀU KHIỂN SÂN KHẤU</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Xin chào, {user?.full_name || 'Diễn Giả'}!</span>
              <span className="text-sm font-semibold px-2.5 py-0.5 rounded-lg bg-indigo-500/30 text-indigo-200 border border-indigo-500/40">
                Speaker
              </span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-medium max-w-2xl leading-relaxed">
              Quản lý các ca diễn thuyết được phân công, giám sát khán giả check-in thời gian thực, điều khiển Q&A trực tiếp trên sân khấu và trình chiếu slide bài giảng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={fetchSessions}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm Mới Dữ Liệu</span>
            </button>
            {sessions.length > 0 && (
              <button
                onClick={() => navigate(`/speaker/session/${sessions[0].id}`)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95"
              >
                <Tv className="w-4 h-4" />
                <span>Vào Studio Sân Khấu Ngay</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Phiên Được Phân Công</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Mic className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{totalAssigned}</div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {liveCount > 0 ? `🟢 Có ${liveCount} phiên đang diễn ra` : 'Theo lịch trình đã công bố'}
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Khán Giả Check-in Thực Tế</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 tracking-tight">{totalCheckedIn}</div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Đã có mặt tại các phòng diễn thuyết
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Câu Hỏi Q&A Khán Giả</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600 tracking-tight">{totalQuestions}</div>
          <p className="text-[11px] text-amber-700 mt-1 font-medium">
            {pendingQuestions > 0 ? `⚡ ${pendingQuestions} câu hỏi đang chờ trả lời` : 'Tất cả câu hỏi đã được giải đáp'}
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Slide & Tài Liệu Đính Kèm</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-600 tracking-tight">
            {sessions.reduce((acc, s) => acc + (s.resource_count || 0), 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Slide PDF & tài liệu sẵn sàng chiếu
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          {[
            { key: 'ALL', label: 'Tất Cả Phiên' },
            { key: 'live', label: '🟢 Đang LIVE' },
            { key: 'upcoming', label: '🔵 Sắp Diễn Ra' },
            { key: 'ended', label: '⚫ Đã Kết Thúc' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === tab.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Hiển thị {filteredSessions.length} / {sessions.length} ca diễn thuyết
        </div>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          <p className="text-xs font-medium">Đang tải danh sách phiên của diễn giả...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-xs">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Chưa có phiên diễn thuyết nào</p>
          <p className="text-xs text-slate-400 mt-1">Các phiên thuyết trình được phân công sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSessions.map((session) => {
            const isLive = session.status === 'live';
            const attendeePct = session.capacity > 0 ? Math.round(((session.checked_in_count || 0) / session.capacity) * 100) : 0;

            return (
              <div
                key={session.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between group hover:shadow-md ${
                  isLive ? 'border-emerald-300 ring-2 ring-emerald-500/20' : 'border-slate-200'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Top Bar Status & Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Ngày {session.day_number} • {session.track}
                    </span>

                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        ĐANG LIVE
                      </span>
                    ) : session.status === 'upcoming' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                        Sắp Diễn Ra
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                        Đã Kết Thúc
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                      {session.title}
                    </h3>
                    {session.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-normal">
                        {session.description}
                      </p>
                    )}
                  </div>

                  {/* Location & Time Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{session.start_time} - {session.end_time}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{session.room_location}</span>
                    </div>
                  </div>

                  {/* Audience & Q&A Stats Bars */}
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Khán giả check-in:</span>
                      </span>
                      <span className="font-extrabold text-slate-900">
                        {session.checked_in_count || 0} / {session.capacity} ({attendeePct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, attendeePct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-amber-500" />
                        <span>{session.total_questions || 0} câu hỏi Q&A</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-purple-500" />
                        <span>{session.resource_count || 0} slide tài liệu</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-500">
                    ID Phiên: #{session.id}
                  </span>

                  <button
                    type="button"
                    onClick={() => navigate(`/speaker/session/${session.id}`)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer active:scale-95 ml-auto"
                  >
                    <span>🚀 Vào Studio Control Center</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SpeakerDashboard;
