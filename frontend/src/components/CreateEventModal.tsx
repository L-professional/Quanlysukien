import React, { useState, useEffect } from 'react';
import {
  X,
  Wifi,
  Calendar,
  MapPin,
  FileText,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Map,
  Compass,
  Edit3,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useEvent } from '../context/EventContext';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { Event } from '../types';
import { toast } from 'sonner';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'info' | 'maps';
  mode?: 'edit' | 'create';
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'info',
  mode = 'edit',
}) => {
  const { t } = useTranslation();
  const { activeEvent, updateActiveEvent, addEvent } = useEvent();

  const [activeTab, setActiveTab] = useState<'info' | 'maps'>(initialTab);
  const [title, setTitle] = useState(mode === 'create' ? '' : activeEvent.title);
  const [location, setLocation] = useState(mode === 'create' ? '' : activeEvent.location);
  const [locationAddress, setLocationAddress] = useState(
    mode === 'create'
      ? ''
      : activeEvent.location_address || 'Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh'
  );
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    mode === 'create'
      ? ''
      : activeEvent.google_maps_url ||
          'https://maps.google.com/maps?q=GEM+Center+Ho+Chi+Minh&t=&z=16&ie=UTF8&iwloc=&output=embed'
  );

  // Split date and time for intuitive Day/Month/Year and Hour:Minute picking
  const [startDate, setStartDate] = useState('2026-10-15');
  const [startTime, setStartTime] = useState('08:30');
  const [endDate, setEndDate] = useState('2026-10-16');
  const [endTime, setEndTime] = useState('17:30');

  const [wifiName, setWifiName] = useState(
    mode === 'create' ? 'EventHub_Guest' : activeEvent.wifiName || 'EventHub_VIP_Guest'
  );
  const [wifiPassword, setWifiPassword] = useState(
    mode === 'create' ? 'EventHub2026!' : activeEvent.wifiPassword || 'EventHub2026!'
  );
  const [description, setDescription] = useState(mode === 'create' ? '' : activeEvent.description || '');
  const [isPreviewMap, setIsPreviewMap] = useState<boolean>(true);
  const [aiStyle, setAiStyle] = useState<'auto' | 'professional' | 'literary' | 'inspirational' | 'academic'>('auto');
  const [isAiGeneratingDesc, setIsAiGeneratingDesc] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAiGenerateDescription = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập Tên Sự Kiện trước khi AI sinh mô tả!');
      return;
    }
    setIsAiGeneratingDesc(true);
    try {
      const desc = await apiService.generateSessionDescription({
        title: title.trim(),
        track: location.trim() || 'Sự kiện quy mô lớn',
        speaker_name: 'Ban Tổ Chức & Chuyên gia khách mời',
        speaker_role: 'Chủ trì sự kiện',
        style: aiStyle,
      });
      setDescription(desc);
      toast.success('AI đã tự động sinh mô tả sự kiện thành công!');
    } catch {
      toast.error('Không thể sinh mô tả AI. Vui lòng thử lại!');
    } finally {
      setIsAiGeneratingDesc(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      if (mode === 'create') {
        setTitle('');
        setLocation('');
        setLocationAddress('');
        setGoogleMapsUrl('');
        setWifiName('EventHub_Guest');
        setWifiPassword('EventHub2026!');
        setDescription('');
        setStartDate('2026-10-15');
        setStartTime('08:30');
        setEndDate('2026-10-16');
        setEndTime('17:30');
      } else {
        setTitle(activeEvent.title);
        setLocation(activeEvent.location);
        setLocationAddress(
          activeEvent.location_address || 'Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh'
        );
        setGoogleMapsUrl(
          activeEvent.google_maps_url ||
            'https://maps.google.com/maps?q=GEM+Center+Ho+Chi+Minh&t=&z=16&ie=UTF8&iwloc=&output=embed'
        );
        setWifiName(activeEvent.wifiName || 'EventHub_VIP_Guest');
        setWifiPassword(activeEvent.wifiPassword || 'EventHub2026!');
        setDescription(activeEvent.description || '');

        // Parse existing start_date / end_date if available
        if (activeEvent.start_date && activeEvent.start_date.includes('/')) {
          const parts = activeEvent.start_date.split(' ');
          const dateParts = parts[0].split('/');
          if (dateParts.length === 3) {
            setStartDate(`${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`);
          }
          if (parts[1]) setStartTime(parts[1]);
        }
        if (activeEvent.end_date && activeEvent.end_date.includes('/')) {
          const parts = activeEvent.end_date.split(' ');
          const dateParts = parts[0].split('/');
          if (dateParts.length === 3) {
            setEndDate(`${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`);
          }
          if (parts[1]) setEndTime(parts[1]);
        }
      }
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab, activeEvent, mode]);

  if (!isOpen) return null;

  // Generate embed URL from address
  const handleAutoGenerateMapUrl = () => {
    const query = (locationAddress.trim() || location.trim());
    if (!query) {
      toast.error('Vui lòng nhập tên địa điểm hoặc địa chỉ trước!');
      return;
    }
    const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
    setGoogleMapsUrl(embedUrl);
    toast.success('Đã tự động tạo liên kết nhúng Google Maps từ địa chỉ!');
  };

  const handleOpenGoogleMapsExternal = () => {
    const query = locationAddress.trim() || location.trim() || 'GEM Center TP Hồ Chí Minh';
    const directUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(directUrl, '_blank', 'noopener,noreferrer');
  };

  // Local current date string YYYY-MM-DD for min attribute
  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim() || !location.trim()) {
      const msg = 'Vui lòng điền đầy đủ tên sự kiện và địa điểm!';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    // 1. Chặn Tạo/Sửa Sự Kiện Thời Gian Trong Quá Khứ (Form Validation)
    if (!startDate) {
      const msg = 'Vui lòng chọn ngày bắt đầu sự kiện!';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    const [startH = '00', startM = '00'] = (startTime || '00:00').split(':');
    const [sY, sM, sD] = startDate.split('-').map(Number);
    const startDateTime = new Date(sY, sM - 1, sD, Number(startH), Number(startM), 0);

    if (isNaN(startDateTime.getTime()) || startDateTime.getTime() < Date.now()) {
      const msg = 'Thời gian bắt đầu sự kiện không được nằm trong quá khứ';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (endDate) {
      const [endH = '23', endM = '59'] = (endTime || '23:59').split(':');
      const [eY, eM, eD] = endDate.split('-').map(Number);
      const endDateTime = new Date(eY, eM - 1, eD, Number(endH), Number(endM), 0);
      if (endDateTime.getTime() < startDateTime.getTime()) {
        const msg = 'Thời gian kết thúc sự kiện phải diễn ra sau thời gian bắt đầu!';
        setFormError(msg);
        toast.error(msg);
        return;
      }
    }

    // Format DD/MM/YYYY HH:mm
    const startFormatted = startDate
      ? `${startDate.split('-')[2]}/${startDate.split('-')[1]}/${startDate.split('-')[0]} ${startTime}`
      : '15/10/2026 08:30';
    const endFormatted = endDate
      ? `${endDate.split('-')[2]}/${endDate.split('-')[1]}/${endDate.split('-')[0]} ${endTime}`
      : '16/10/2026 17:30';

    const embedUrl = googleMapsUrl.trim() ||
      `https://maps.google.com/maps?q=${encodeURIComponent(locationAddress || location)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

    const payload: Partial<Event> = {
      title: title.trim(),
      location: location.trim(),
      location_address: locationAddress.trim(),
      google_maps_url: embedUrl,
      start_date: startFormatted,
      end_date: endFormatted,
      start_time: `${startFormatted}`,
      end_time: `${endFormatted}`,
      wifiName: wifiName.trim(),
      wifiPassword: wifiPassword.trim(),
      description: description.trim(),
      status: 'PUBLISHED',
      category_id: 1,
    };

    if (mode === 'create') {
      try {
        const created = await apiService.createEvent(payload);
        addEvent(created);
        toast.success(`Đã tạo sự kiện "${created.title}" thành công!`);
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tạo sự kiện';
        setFormError(msg);
        toast.error(msg, { duration: 6000 });
      }
    } else {
      try {
        const updated = await apiService.updateEvent(activeEvent.id || 1, payload);
        updateActiveEvent(updated);
        toast.success('Đã lưu cấu hình Ngày/Tháng/Năm, Google Maps & WiFi thành công!');
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể cập nhật sự kiện';
        setFormError(msg);
        toast.error(msg, { duration: 6000 });
      }
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden cursor-default text-slate-900"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {mode === 'create' ? 'Tạo Sự Kiện Mới' : t('events.configEvent')}
              </h2>
              <p className="text-[11px] text-slate-400">
                {mode === 'create'
                  ? 'Nhập thông tin chi tiết để thêm sự kiện mới vào hệ thống EventHub'
                  : t('events.configSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert Banner */}
        {formError && (
          <div className="mx-6 mt-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-xs shrink-0 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-rose-900 mb-0.5">⚠️ Không thể lưu sự kiện (Trùng lịch / Lỗi dữ liệu):</p>
              <p className="leading-relaxed font-medium text-rose-700">{formError}</p>
            </div>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="text-rose-400 hover:text-rose-700 p-1 rounded-lg transition-colors cursor-pointer"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Chỉnh Sửa Sự Kiện</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('maps')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'maps'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Cấu Hình & Bản Đồ, WiFi</span>
          </button>
        </div>

        {/* Form with Fixed Header, Scrollable Body, and Fixed Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1 min-h-0">
            {activeTab === 'info' ? (
              <>
                {/* Title */}
                <div>
                  <label className="block font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    {t('events.eventName')}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., EventHub AI Summit 2026"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all font-semibold"
                  />
                </div>

                {/* Date & Time Pickers (Day/Month/Year + Time) */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Thời Gian Tổ Chức Chuẩn (Ngày / Tháng / Năm &amp; Giờ)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Start Date & Time */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        {t('events.startDate')}
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        <input
                          type="date"
                          min={todayStr}
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            if (endDate && e.target.value > endDate) {
                              setEndDate(e.target.value);
                            }
                          }}
                          className="col-span-3 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                        />
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="col-span-2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* End Date & Time */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        {t('events.endDate')}
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        <input
                          type="date"
                          min={startDate || todayStr}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="col-span-3 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                        />
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="col-span-2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description with AI Generation & Style Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="block font-semibold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      Mô tả &amp; Ghi chú Sự kiện
                    </label>

                    <div className="flex items-center gap-1.5">
                      {/* Menu chọn phong cách văn phong */}
                      <select
                        value={aiStyle}
                        onChange={(e) => setAiStyle(e.target.value as any)}
                        disabled={isAiGeneratingDesc}
                        className="text-[11px] bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs hover:border-slate-300 transition-all disabled:opacity-50"
                        title="Chọn phong cách văn phong cho AI sinh nội dung"
                      >
                        <option value="auto">🌐 Tự động (Theo chủ đề)</option>
                        <option value="professional">💼 Chuyên nghiệp &amp; Chiến lược</option>
                        <option value="literary">🎨 Bay bổng - Văn học</option>
                        <option value="inspirational">🚀 Truyền cảm hứng</option>
                        <option value="academic">🎓 Học thuật &amp; Nghiên cứu</option>
                      </select>

                      {/* Nút AI Sinh Mô Tả với Spinner */}
                      <button
                        type="button"
                        onClick={handleAiGenerateDescription}
                        disabled={isAiGeneratingDesc}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-[11px] font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                        title="Dùng AI tự động viết mô tả sự kiện dựa theo Tên, Địa điểm và Phong cách"
                      >
                        {isAiGeneratingDesc ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                            <span>AI Đang Soạn Thảo...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>✨ AI Sinh Mô Tả</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Mô tả mục tiêu sự kiện (hoặc chọn phong cách và nhấn '✨ AI Sinh Mô Tả' để AI tự động soạn thảo)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all leading-relaxed"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Location & Google Maps Section */}
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-indigo-950">
                      <Map className="w-4 h-4 text-indigo-600" />
                      <span>Địa Điểm &amp; Tích Hợp Google Maps</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenGoogleMapsExternal}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t('events.openMaps')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Venue Name */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        {t('events.location')} (Tên Địa Điểm)
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., GEM Center, TP. Hồ Chí Minh"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Detailed Address */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-indigo-600" />
                        {t('events.locationAddress')}
                      </label>
                      <input
                        type="text"
                        value={locationAddress}
                        onChange={(e) => setLocationAddress(e.target.value)}
                        placeholder="Số 8 Nguyễn Bỉnh Khiêm, P. Đa Kao, Q.1"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Google Maps Embed Link */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        {t('events.googleMapsUrl')}
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoGenerateMapUrl}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer underline"
                      >
                        ⚡ Tự động tạo link từ địa chỉ
                      </button>
                    </div>
                    <input
                      type="text"
                      value={googleMapsUrl}
                      onChange={(e) => setGoogleMapsUrl(e.target.value)}
                      placeholder="https://maps.google.com/maps?q=... hoặc https://goo.gl/maps/..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Google Maps Live Preview Toggle & Container */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        {t('events.mapPreview')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsPreviewMap(!isPreviewMap)}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        {isPreviewMap ? 'Ẩn bản đồ' : 'Hiện bản đồ'}
                      </button>
                    </div>

                    {isPreviewMap && (
                      <div className="w-full h-44 rounded-2xl overflow-hidden border border-indigo-200 shadow-2xs relative bg-slate-100">
                        <iframe
                          title="Google Maps Location Preview"
                          src={
                            googleMapsUrl.includes('output=embed')
                              ? googleMapsUrl
                              : `https://maps.google.com/maps?q=${encodeURIComponent(
                                  locationAddress || location || 'GEM Center TP Hồ Chí Minh'
                                )}&t=&z=16&ie=UTF8&iwloc=&output=embed`
                          }
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen={false}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* WiFi Details (SSID & Password) */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Wifi className="w-4 h-4 text-indigo-600" />
                    Thông Tin WiFi Sự Kiện (AI Context)
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mạng WiFi (SSID)</label>
                      <input
                        type="text"
                        value={wifiName}
                        onChange={(e) => setWifiName(e.target.value)}
                        placeholder="e.g., EventHub_Guest"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mật khẩu WiFi</label>
                      <input
                        type="text"
                        value={wifiPassword}
                        onChange={(e) => setWifiPassword(e.target.value)}
                        placeholder="e.g., EventHub2026!"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

        {/* Action Buttons - Fixed Footer */}
        <div className="flex gap-2.5 px-6 py-3.5 bg-slate-50 border-t border-slate-200 justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition-colors cursor-pointer text-xs flex items-center justify-center"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 text-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            {mode === 'create' ? 'Tạo Sự Kiện Mới' : t('events.saveConfig')}
          </button>
        </div>
      </form>
    </div>
  </div>
);
};

export default CreateEventModal;
