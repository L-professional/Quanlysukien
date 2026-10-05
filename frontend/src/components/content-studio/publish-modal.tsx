import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../services/api';
import { Event } from '../../types';

export interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: Event | null;
  eventName: string;
  eventLifecycle: 'UPCOMING' | 'CONCLUDED';
  mainTopic: string;
  speakers?: string;
  contentTitle: string;
  contentBody: string;
  onSuccess?: (status: {
    campaignId: string;
    status: 'SENT' | 'SCHEDULED';
    targetCount: number;
    scheduledAt?: string;
    timestamp: string;
  }) => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  selectedEvent,
  eventName,
  eventLifecycle,
  mainTopic,
  speakers,
  contentTitle,
  contentBody,
  onSuccess,
}) => {
  const isConcluded =
    eventLifecycle === 'CONCLUDED' ||
    selectedEvent?.status === 'ENDED' ||
    selectedEvent?.status === 'COMPLETED' ||
    (selectedEvent?.status || '').toUpperCase() === 'ĐÃ KẾT THÚC';

  const [campaignType, setCampaignType] = useState<'PROMOTION' | 'RECAP_THANKYOU'>(
    isConcluded ? 'RECAP_THANKYOU' : 'PROMOTION'
  );
  const [publishAudience, setPublishAudience] = useState<string>(
    isConcluded ? 'CHECKED_IN_ONLY' : 'MEMBERS_WITH_EMAIL'
  );
  const [publishScheduleType, setPublishScheduleType] = useState<'IMMEDIATE' | 'SCHEDULED'>('IMMEDIATE');
  const [publishScheduledAt, setPublishScheduledAt] = useState<string>('2026-10-15T09:00');
  const [publishChannels, setPublishChannels] = useState<string[]>(['email', 'facebook', 'linkedin', 'zalo_sms']);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  useEffect(() => {
    if (isConcluded) {
      setCampaignType('RECAP_THANKYOU');
      setPublishAudience('CHECKED_IN_ONLY');
    } else {
      setCampaignType('PROMOTION');
      setPublishAudience('MEMBERS_WITH_EMAIL');
    }
  }, [isConcluded]);

  if (!isOpen) return null;

  const handlePublish = async () => {
    // Task 100 Validation Guard
    const eventEnded =
      selectedEvent?.status === 'ENDED' ||
      selectedEvent?.status === 'COMPLETED' ||
      (selectedEvent?.status || '').toUpperCase() === 'ĐÃ KẾT THÚC' ||
      eventLifecycle === 'CONCLUDED';

    if ((campaignType === 'RECAP_THANKYOU' || publishAudience === 'CHECKED_IN_ONLY' || publishAudience === 'NO_SHOW_ONLY') && !eventEnded) {
      toast.error('Sự kiện chưa kết thúc. Chỉ có thể phát hành thư Tổng kết & Tri ân sau khi sự kiện hoàn tất!');
      return;
    }

    setIsPublishing(true);
    try {
      const res = await apiService.publishPRCampaign({
        event_id: selectedEvent?.id,
        event_name: eventName,
        campaign_type: campaignType,
        target_audience: publishAudience,
        schedule_type: publishScheduleType,
        scheduled_at: publishScheduleType === 'SCHEDULED' ? publishScheduledAt : undefined,
        channels: publishChannels,
        title: contentTitle || eventName,
        content_summary: mainTopic,
        content: contentBody || mainTopic,
        subject: contentTitle || `[EventHub AI] ${eventName}`,
        speakers: speakers || undefined,
      });

      setIsPublishing(false);
      onClose();
      if (onSuccess) {
        onSuccess({
          campaignId: res.campaign_id,
          status: res.status as 'SENT' | 'SCHEDULED',
          targetCount: res.target_count,
          scheduledAt: res.scheduled_at,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
        });
      }
      toast.success(res.message || '🎉 Chiến dịch truyền thông đã được phê duyệt và phát hành thành công!');
    } catch (err: any) {
      setIsPublishing(false);
      console.error('Publish campaign failed:', err);
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Phát hành chiến dịch thất bại. Vui lòng thử lại!';
      toast.error(detail);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">Phê Duyệt & Phát Hành Chiến Dịch Đa Kênh</h3>
              <p className="text-[11px] text-slate-500 font-medium">Xác nhận đối tượng nhận và chọn phương thức phát hành</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth modal-scrollbar scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent min-h-0">
          {/* 1. Campaign Type */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              1. Loại Chiến Dịch Phát Hành:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCampaignType('PROMOTION');
                  setPublishAudience('MEMBERS_WITH_EMAIL');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  campaignType === 'PROMOTION'
                    ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span>📢</span>
                  <span>Mời Đăng Ký / Quảng Bá</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                  Gửi thư mời sự kiện trước giờ G tới thành viên & cộng đồng
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCampaignType('RECAP_THANKYOU');
                  setPublishAudience('CHECKED_IN_ONLY');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  campaignType === 'RECAP_THANKYOU'
                    ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span>🙏</span>
                  <span>Tổng Kết & Tri Ân (Recap)</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                  Đính kèm bộ đánh giá 5 sao trực tiếp & link nhận E-Certificate
                </p>
              </button>
            </div>

            {/* Validation Alert */}
            {campaignType === 'RECAP_THANKYOU' && !(selectedEvent?.status === 'ENDED' || selectedEvent?.status === 'COMPLETED' || (selectedEvent?.status || '').toUpperCase() === 'ĐÃ KẾT THÚC' || eventLifecycle === 'CONCLUDED') && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Lưu ý kiểm duyệt:</strong> Sự kiện "<strong>{eventName || 'Đang chọn'}</strong>" hiện tại chưa kết thúc (Trạng thái: <span className="underline font-semibold">{selectedEvent?.status || 'UPCOMING'}</span>). Hệ thống sẽ chặn phát hành thư Tổng kết & Tri ân cho đến khi sự kiện hoàn tất.
                </div>
              </div>
            )}
          </div>

          {/* 2. Target Audience */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              2. Xác Nhận Phân Khúc Đối Tượng Nhận (Audience Segmentation):
            </label>
            <div className="space-y-1.5">
              {campaignType === 'RECAP_THANKYOU' ? (
                [
                  {
                    id: 'CHECKED_IN_ONLY',
                    label: 'Khách thực tế đã tham dự (Đã check-in thành công)',
                    count: 'Khuyến nghị',
                    desc: 'Tự động lọc registrations có is_checked_in = true, gửi email tri ân kèm bộ đánh giá 5 sao trực tiếp',
                    badgeColor: 'bg-emerald-100 text-emerald-800',
                  },
                  {
                    id: 'NO_SHOW_ONLY',
                    label: 'Khách đăng ký nhưng vắng mặt (No-Show Flow)',
                    count: 'Chăm sóc lại',
                    desc: 'Lọc registrations có is_checked_in = false hoặc null, gửi thông điệp "Rất tiếc bạn đã bỏ lỡ" kèm slide tài liệu & recap',
                    badgeColor: 'bg-amber-100 text-amber-800',
                  },
                  {
                    id: 'ALL_REGISTERED',
                    label: 'Toàn bộ danh sách đăng ký sự kiện',
                    count: 'Tất cả đăng ký',
                    desc: 'Gửi thư tổng kết chung tới toàn bộ danh sách đăng ký trong bảng registrations',
                    badgeColor: 'bg-slate-100 text-slate-700',
                  },
                ].map((aud) => (
                  <label
                    key={aud.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      publishAudience === aud.id
                        ? 'border-emerald-500 bg-emerald-50/50 text-slate-900 shadow-2xs font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="targetAudienceModal"
                        value={aud.id}
                        checked={publishAudience === aud.id}
                        onChange={(e) => setPublishAudience(e.target.value)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span>{aud.label}</span>
                        <p className="text-[10px] text-slate-500 font-normal">{aud.desc}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${aud.badgeColor}`}>
                      {aud.count}
                    </span>
                  </label>
                ))
              ) : (
                [
                  {
                    id: 'MEMBERS_WITH_EMAIL',
                    label: 'Tài khoản thành viên đã đăng ký & liên kết Email',
                    count: 'Toàn bộ thành viên',
                    desc: 'Truy vấn trực tiếp từ bảng users các tài khoản hợp lệ, gửi email hàng loạt có merge tags',
                    badgeColor: 'bg-indigo-100 text-indigo-800',
                  },
                  {
                    id: 'ALL_USERS',
                    label: 'Toàn bộ người dùng hệ thống EventHub AI',
                    count: 'Tất cả Users',
                    desc: 'Bao gồm tất cả tài khoản người dùng đã kích hoạt trong CSDL',
                    badgeColor: 'bg-slate-100 text-slate-700',
                  },
                  {
                    id: 'COMMUNITY',
                    label: 'Cộng đồng công nghệ & đối tác tiềm năng',
                    count: '3,500+ đối tác',
                    desc: 'Phân phối thư mời tới mạng lưới đối tác và người theo dõi hệ sinh thái',
                    badgeColor: 'bg-purple-100 text-purple-800',
                  },
                ].map((aud) => (
                  <label
                    key={aud.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      publishAudience === aud.id
                        ? 'border-emerald-500 bg-emerald-50/50 text-slate-900 shadow-2xs font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="targetAudienceModal"
                        value={aud.id}
                        checked={publishAudience === aud.id}
                        onChange={(e) => setPublishAudience(e.target.value)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span>{aud.label}</span>
                        <p className="text-[10px] text-slate-500 font-normal">{aud.desc}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${aud.badgeColor}`}>
                      {aud.count}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 3. Channels */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              3. Kênh Phát Hành Đồng Loạt:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'email', label: '✉️ Email Campaign' },
                { id: 'facebook', label: '📘 Facebook Fanpage' },
                { id: 'linkedin', label: '💼 LinkedIn Page' },
                { id: 'zalo_sms', label: '💬 Zalo OA & SMS' },
              ].map((ch) => {
                const isChecked = publishChannels.includes(ch.id);
                return (
                  <label
                    key={ch.id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          const safeChannels = Array.isArray(publishChannels) ? publishChannels : [];
                          if (safeChannels.length > 1) {
                            setPublishChannels(safeChannels.filter((c) => c !== ch.id));
                          } else {
                            toast.warning('Cần chọn ít nhất 1 kênh phát hành.');
                          }
                        } else {
                          const safeChannels = Array.isArray(publishChannels) ? publishChannels : [];
                          setPublishChannels([...safeChannels, ch.id]);
                        }
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{ch.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 4. Scheduling */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              4. Lịch Trình Phát Hành:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPublishScheduleType('IMMEDIATE')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  publishScheduleType === 'IMMEDIATE'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <span className="text-xs">Gửi Ngay Lập Tức</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Phát hành ngay khi bấm xác nhận</p>
              </button>

              <button
                type="button"
                onClick={() => setPublishScheduleType('SCHEDULED')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  publishScheduleType === 'SCHEDULED'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">⏰</span>
                  <span className="text-xs">Lên Lịch Phát Hành</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Hẹn giờ gửi tự động trong tương lai</p>
              </button>
            </div>

            {publishScheduleType === 'SCHEDULED' && (
              <div className="pt-1 animate-in fade-in duration-150">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Chọn thời gian phát hành:
                </label>
                <input
                  type="datetime-local"
                  value={publishScheduledAt}
                  onChange={(e) => setPublishScheduledAt(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-white border-t border-slate-100 p-4 px-6 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            disabled={isPublishing}
            onClick={handlePublish}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/25 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isPublishing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>
              {publishScheduleType === 'SCHEDULED' ? 'Lên Lịch Chiến Dịch' : 'Xác Nhận Phát Hành Ngay'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
