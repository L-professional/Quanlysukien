import React, { useState, useEffect, useMemo } from 'react';
import {
  Mic, UserPlus, Mail, Calendar, MapPin, Clock,
  CheckCircle, AlertCircle, RefreshCw, X, Sparkles, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { Event, ManagerSpeakerItem } from '../types';

export const ManagerSpeakers: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [speakers, setSpeakers] = useState<ManagerSpeakerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);

  // Invite modal form state
  const [inviteName, setInviteName] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('Diễn giả chính');
  const [inviteTopic, setInviteTopic] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  // Fetch speakers
  const fetchSpeakersList = async (eventId: number | null) => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiService.getManagerSpeakers(eventId);
      setSpeakers(data);
    } catch (err) {
      console.error('Lỗi tải danh sách diễn giả:', err);
      toast.error('Không thể tải danh sách diễn giả');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpeakersList(selectedEventId);
  }, [selectedEventId]);

  // Handle send invitation
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      toast.error('Vui lòng chọn sự kiện trước khi gửi lời mời');
      return;
    }
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error('Vui lòng nhập họ tên và email diễn giả');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiService.inviteManagerSpeaker({
        event_id: selectedEventId,
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole.trim() || 'Diễn giả khách mời',
        topic: inviteTopic.trim() || undefined,
        session_title: inviteTopic.trim()
          ? `Chuyên đề: ${inviteTopic.trim()}`
          : undefined,
      });

      if (res.success) {
        toast.success(res.message);
        setIsInviteModalOpen(false);
        setInviteName('');
        setInviteEmail('');
        setInviteRole('Diễn giả chính');
        setInviteTopic('');
        fetchSpeakersList(selectedEventId);
      }
    } catch (err) {
      console.error('Lỗi gửi thư mời diễn giả:', err);
      toast.error('Không thể gửi thư mời diễn giả');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'ACCEPTED':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Đã xác nhận
          </span>
        );
      case 'INVITED':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            Đã gửi lời mời
          </span>
        );
      case 'PENDING':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Đang chờ phản hồi
          </span>
        );
      case 'REJECTED':
        return (
          <span className="text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
            Từ chối
          </span>
        );
      default:
        return (
          <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full uppercase tracking-wider">
              Quản Lý Sự Kiện
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Diễn Giả</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Quản Lý & Điều Phối Diễn Giả
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gửi thư mời tham gia, theo dõi tiến độ xác nhận và lịch các phiên phát biểu của diễn giả.
          </p>
        </div>

        {/* Event selector & Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Sự kiện:
            </label>
            <select
              value={selectedEventId || ''}
              onChange={(e) => setSelectedEventId(Number(e.target.value))}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Mời Diễn Giả Mới
          </button>
        </div>
      </div>

      {/* Speakers Grid */}
      {loading ? (
        <div className="p-16 text-center">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Đang tải danh sách diễn giả...</p>
        </div>
      ) : speakers.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-100">
          <Mic className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">Chưa có diễn giả nào</h3>
          <p className="text-xs text-slate-400 mt-1">
            Chưa có diễn giả nào được phân công hoặc mời tham gia sự kiện này.
          </p>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="mt-4 px-4 py-2 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg hover:bg-purple-100 transition"
          >
            Gửi thư mời đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {speakers.map((sp) => (
            <div
              key={sp.id}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={sp.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${sp.name}`}
                      alt={sp.name}
                      className="w-12 h-12 rounded-full border-2 border-purple-100 bg-purple-50 object-cover"
                    />
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{sp.name}</h3>
                      <p className="text-xs text-slate-500">{sp.role}</p>
                    </div>
                  </div>
                  <div>{getStatusBadge(sp.status)}</div>
                </div>

                {/* Assigned Sessions */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-2">
                    <span>Phiên thuyết trình đảm nhiệm:</span>
                    <span className="font-bold text-purple-700">{sp.sessions_count} phiên</span>
                  </div>

                  <div className="space-y-2">
                    {sp.sessions.slice(0, 3).map((ses) => (
                      <div
                        key={ses.id}
                        className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-100"
                      >
                        <p className="font-semibold text-slate-800 line-clamp-1">{ses.title}</p>
                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {ses.room_location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {ses.start_time}
                          </span>
                        </div>
                      </div>
                    ))}
                    {sp.sessions.length > 3 && (
                      <p className="text-[11px] text-slate-400 text-center">
                        +{sp.sessions.length - 3} phiên khác
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    toast.info(`Đã gửi lại thư mời và lịch trình chi tiết tới diễn giả ${sp.name}`);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Gửi thông tin phiên
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Speaker Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Mời Diễn Giả Tham Gia</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên diễn giả <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: TS. Trần Văn Bình"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email diễn giả <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="speaker@doanhnghiep.vn"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chức danh / Đơn vị công tác
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giám đốc AI tại FPT Smart Cloud"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chủ đề dự kiến chia sẻ
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ứng dụng AI đa thể thức trong quản trị sự kiện"
                  value={inviteTopic}
                  onChange={(e) => setInviteTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Gửi Thư Mời
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
