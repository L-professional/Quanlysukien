import React, { useState, useEffect, useRef } from 'react';
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
  Ticket,
  Users,
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  Clock,
  Layers,
} from 'lucide-react';
import { useEvent } from '../context/EventContext';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { Event } from '../types';
import { toast } from 'sonner';

export type CreateEventTab = 'info' | 'tickets' | 'sessions' | 'maps';

interface TicketTier {
  id: string;
  name: string;
  price: number;
  quota: number;
}

interface ScheduleSessionItem {
  id: string;
  title: string;
  time: string;
  speakerName: string;
  speakerRole: string;
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: CreateEventTab;
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

  const [activeTab, setActiveTab] = useState<CreateEventTab>(initialTab);
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

  // Banner image upload state
  const [coverImage, setCoverImage] = useState<string>(
    mode === 'create'
      ? 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'
      : activeEvent.cover_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'
  );
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Status & Capacity
  const [status, setStatus] = useState<string>(mode === 'create' ? 'DRAFT' : activeEvent.status || 'PUBLISHED');
  const [capacity, setCapacity] = useState<number>(activeEvent.capacity || 500);

  // Split date and time for intuitive Day/Month/Year and Hour:Minute picking
  const [startDate, setStartDate] = useState('2026-10-15');
  const [startTime, setStartTime] = useState('08:30');
  const [endDate, setEndDate] = useState('2026-10-16');
  const [endTime, setEndTime] = useState('17:30');

  // WiFi & Description
  const [wifiName, setWifiName] = useState(
    mode === 'create' ? 'EventHub_Guest' : activeEvent.wifiName || 'EventHub_VIP_Guest'
  );
  const [wifiPassword, setWifiPassword] = useState(
    mode === 'create' ? 'EventHub2026!' : activeEvent.wifiPassword || 'EventHub2026!'
  );
  const [description, setDescription] = useState(mode === 'create' ? '' : activeEvent.description || '');
  const [isPreviewMap, setIsPreviewMap] = useState<boolean>(true);
  const [aiStyle, setAiStyle] = useState<'auto' | 'professional' | 'literary' | 'inspirational' | 'academic' | 'wellness'>('auto');
  const [isAiGeneratingDesc, setIsAiGeneratingDesc] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Ticket Tiers State (Task 77 Sub-Feature)
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    { id: 'tier-1', name: 'Vé Tiêu Chuẩn (Standard Pass)', price: 0, quota: 400 },
    { id: 'tier-2', name: 'Vé VIP Hạng Nhất (VIP Lounge)', price: 500000, quota: 100 },
  ]);

  // Schedule Sessions State (Task 77 Sub-Feature)
  const [sessionsList, setSessionsList] = useState<ScheduleSessionItem[]>([
    { id: 's-1', title: 'Khai mạc & Keynote Xu Hướng AI 2026', time: '08:30 - 10:00', speakerName: 'TS. Nguyễn Văn An', speakerRole: 'Giám đốc AI Research' },
    { id: 's-2', title: 'Workshop Ứng dụng Thực Chiến RAG & Agentic', time: '10:30 - 12:00', speakerName: 'Trần Thị Thu Thảo', speakerRole: 'Senior Solutions Architect' },
  ]);

  const handleAiGenerateDescription = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập Tên Sự Kiện trước khi AI sinh mô tả!');
      return;
    }
    setIsAiGeneratingDesc(true);
    try {
      const desc = await apiService.generateEventDescription({
        title: title.trim(),
        location: location.trim() || locationAddress.trim(),
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

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh banner dung lượng tối đa 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverImage(reader.result);
        toast.success('Đã tải ảnh banner lên xem trước thành công!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddTicketTier = () => {
    const newTier: TicketTier = {
      id: `tier-${Date.now()}`,
      name: 'Hạng Vé Mới',
      price: 200000,
      quota: 50,
    };
    setTicketTiers((prev) => [...prev, newTier]);
  };

  const handleRemoveTicketTier = (id: string) => {
    if (ticketTiers.length <= 1) {
      toast.error('Sự kiện phải có ít nhất một hạng vé!');
      return;
    }
    setTicketTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddSession = () => {
    const newSession: ScheduleSessionItem = {
      id: `s-${Date.now()}`,
      title: 'Phiên Diễn Thuyết Mới',
      time: '14:00 - 15:30',
      speakerName: 'Chuyên gia Khách mời',
      speakerRole: 'Diễn giả',
    };
    setSessionsList((prev) => [...prev, newSession]);
  };

  const handleRemoveSession = (id: string) => {
    setSessionsList((prev) => prev.filter((s) => s.id !== id));
  };

  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      if (mode === 'create') {
        setTitle('');
        setLocation('');
        setLocationAddress('');
        setGoogleMapsUrl('');
        setCoverImage('https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80');
        setStatus('DRAFT');
        setCapacity(500);
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
        setCoverImage(activeEvent.cover_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80');
        setStatus(activeEvent.status || 'PUBLISHED');
        setCapacity(activeEvent.capacity || 500);
        setWifiName(activeEvent.wifiName || 'EventHub_VIP_Guest');
        setWifiPassword(activeEvent.wifiPassword || 'EventHub2026!');
        setDescription(activeEvent.description || '');

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

  const handleAutoGenerateMapUrl = () => {
    const query = locationAddress.trim() || location.trim();
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

      if (!isNaN(endDateTime.getTime()) && endDateTime.getTime() <= startDateTime.getTime()) {
        const msg = 'Thời gian kết thúc phải diễn ra sau thời gian bắt đầu!';
        setFormError(msg);
        toast.error(msg);
        return;
      }
    }

    const formatDDMMYYYY = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    };

    const formattedStartDate = `${formatDDMMYYYY(startDate)} ${startTime}`;
    const formattedEndDate = endDate ? `${formatDDMMYYYY(endDate)} ${endTime}` : formattedStartDate;

    const payload: Partial<Event> = {
      title: title.trim(),
      location: location.trim(),
      location_address: locationAddress.trim() || location.trim(),
      google_maps_url: googleMapsUrl.trim(),
      cover_image: coverImage,
      status: status,
      capacity: Number(capacity) || 500,
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      start_time: startTime,
      end_time: endTime,
      wifiName: wifiName.trim(),
      wifiPassword: wifiPassword.trim(),
      description: description.trim(),
    };

    try {
      if (mode === 'create') {
        const created = await apiService.createEvent(payload);
        if (created) {
          addEvent(created);
        }
        toast.success(`Tạo sự kiện "${title}" thành công!`);
      } else {
        updateActiveEvent(payload);
        if (activeEvent?.id) {
          await apiService.updateEvent(activeEvent.id, payload);
        }
        toast.success(`Cập nhật cấu hình sự kiện thành công!`);
      }
      onClose();
    } catch (err: any) {
      const backendDetail = err?.response?.data?.detail;
      const msg = backendDetail || (mode === 'create' ? 'Tạo sự kiện thất bại. Vui lòng kiểm tra lại!' : 'Lỗi khi lưu cấu hình sự kiện');
      setFormError(msg);
      toast.error(msg);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-[95vw] sm:max-w-3xl max-h-[85vh] flex flex-col overflow-hidden cursor-default text-slate-900"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {mode === 'create' ? 'Tạo Sự Kiện Mới' : t('events.configEvent')}
              </h2>
              <p className="text-[11px] text-red-100 font-medium">
                {mode === 'create'
                  ? 'Nhập đầy đủ thông tin, cấu hình vé, lịch trình và AI sinh mô tả'
                  : t('events.configSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert Banner */}
        {formError && (
          <div className="mx-6 mt-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-xs shrink-0 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-rose-900 mb-0.5">⚠️ Không thể lưu sự kiện:</p>
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

        {/* 4 Multi-step Navigation Tabs (Task 77 Requirement) */}
        <div className="px-6 pt-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'info'
                ? 'border-red-600 text-red-600 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>1. Thông Tin & Banner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'tickets'
                ? 'border-red-600 text-red-600 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>2. Hạng Vé & Giá</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'border-red-600 text-red-600 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>3. Lịch Trình & Diễn Giả</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('maps')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'maps'
                ? 'border-red-600 text-red-600 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>4. Bản Đồ & WiFi</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1 min-h-0">
            {/* ── TAB 1: THÔNG TIN & BANNER ── */}
            {activeTab === 'info' && (
              <>
                {/* Banner Upload with Live Preview */}
                <div className="space-y-2">
                  <label className="block font-bold text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-red-600" />
                      Ảnh Banner Sự Kiện (Cover Image)
                    </span>
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Chọn ảnh từ máy...</span>
                    </button>
                  </label>

                  <input
                    type="file"
                    ref={bannerInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerFileChange}
                  />

                  <div className="relative w-full h-36 sm:h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner group">
                    <img
                      src={coverImage}
                      alt="Banner Preview"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3.5 text-white">
                      <span className="text-[11px] font-medium opacity-90 truncate">
                        URL Banner: {coverImage.slice(0, 70)}...
                      </span>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-red-600" />
                    {t('events.eventName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Vietnam AI Summit 2026..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-red-500 transition-all"
                  />
                </div>

                {/* Status & Capacity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Trạng Thái Sự Kiện</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-red-500 cursor-pointer"
                    >
                      <option value="DRAFT">Bản nháp (Draft)</option>
                      <option value="PUBLISHED">Đã xuất bản (Published)</option>
                      <option value="LIVE">Đang diễn ra (Live)</option>
                      <option value="COMPLETED">Đã kết thúc (Completed)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sức Chứa Tối Đa (Người)</label>
                    <input
                      type="number"
                      min={10}
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    {t('events.locationName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., GEM Center, Grand Ballroom..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
                  />
                </div>

                {/* Start Date / Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-red-600" />
                      Bắt đầu:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        min={todayStr}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-red-500"
                      />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Kết thúc:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        min={startDate || todayStr}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-red-500"
                      />
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Description & AI Generator */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-red-600" />
                      {t('events.description')}
                    </label>

                    <div className="flex items-center gap-2">
                      <select
                        value={aiStyle}
                        onChange={(e: any) => setAiStyle(e.target.value)}
                        className="text-[11px] font-semibold bg-red-50 border border-red-200 text-red-800 rounded-lg px-2 py-1 outline-none cursor-pointer"
                        title="Chọn phong cách văn phong AI"
                      >
                        <option value="auto">⚡ Văn phong: Tự động</option>
                        <option value="professional">💼 Chuyên nghiệp</option>
                        <option value="inspirational">🔥 Truyền cảm hứng</option>
                        <option value="academic">🎓 Học thuật</option>
                        <option value="literary">✨ Bay bổng</option>
                        <option value="wellness">🌿 Thư giãn</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleAiGenerateDescription}
                        disabled={isAiGeneratingDesc}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isAiGeneratingDesc ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        <span>{isAiGeneratingDesc ? 'Đang viết...' : '✨ AI Sinh Mô Tả'}</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nhập mô tả sự kiện hoặc bấm [✨ AI Sinh Mô Tả] để Gemini tự động soạn thảo..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-red-500 leading-relaxed transition-all"
                  />
                </div>
              </>
            )}

            {/* ── TAB 2: CẤU HÌNH LOẠI VÉ & GIÁ (Task 77) ── */}
            {activeTab === 'tickets' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Cấu Hình Hạng Vé & Giá Vé</h3>
                    <p className="text-slate-500 text-[11px]">
                      Thiết lập các loại vé tham dự, số lượng phân bổ (Quota) và giá tiền VND.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTicketTier}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Hạng Vé</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {ticketTiers.map((tier, idx) => (
                    <div
                      key={tier.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTicketTiers((prev) =>
                              prev.map((t) => (t.id === tier.id ? { ...t, name: val } : t))
                            );
                          }}
                          placeholder="Tên hạng vé..."
                          className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold flex-1 focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">Giá Vé (VND)</label>
                          <input
                            type="number"
                            min={0}
                            step={10000}
                            value={tier.price}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setTicketTiers((prev) =>
                                prev.map((t) => (t.id === tier.id ? { ...t, price: val } : t))
                              );
                            }}
                            className="w-32 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">Số Lượng Vé</label>
                          <input
                            type="number"
                            min={1}
                            value={tier.quota}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setTicketTiers((prev) =>
                                prev.map((t) => (t.id === tier.id ? { ...t, quota: val } : t))
                              );
                            }}
                            className="w-24 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveTicketTier(tier.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer mt-3 sm:mt-0"
                          title="Xóa hạng vé"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 3: LỊCH TRÌNH & DIỄN GIẢ (Task 77) ── */}
            {activeTab === 'sessions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Lịch Trình & Gán Diễn Giả</h3>
                    <p className="text-slate-500 text-[11px]">
                      Thêm các phiên hội thảo, thời gian và chỉ định diễn giả chủ trì.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSession}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Phiên</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {sessionsList.map((session, idx) => (
                    <div
                      key={session.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-red-600 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          Phiên {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSession(session.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Gỡ phiên này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tiêu Đề Phiên</label>
                          <input
                            type="text"
                            value={session.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSessionsList((prev) =>
                                prev.map((s) => (s.id === session.id ? { ...s, title: val } : s))
                              );
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Khung Giờ</label>
                          <input
                            type="text"
                            value={session.time}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSessionsList((prev) =>
                                prev.map((s) => (s.id === session.id ? { ...s, time: val } : s))
                              );
                            }}
                            placeholder="e.g., 09:00 - 10:30"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tên Diễn Giả</label>
                          <input
                            type="text"
                            value={session.speakerName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSessionsList((prev) =>
                                prev.map((s) => (s.id === session.id ? { ...s, speakerName: val } : s))
                              );
                            }}
                            placeholder="TS. Nguyễn Văn A..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Chức Danh / Đơn Vị</label>
                          <input
                            type="text"
                            value={session.speakerRole}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSessionsList((prev) =>
                                prev.map((s) => (s.id === session.id ? { ...s, speakerRole: val } : s))
                              );
                            }}
                            placeholder="Giám đốc Công nghệ..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 4: BẢN ĐỒ & WIFI ── */}
            {activeTab === 'maps' && (
              <>
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <Compass className="w-4 h-4 text-red-600" />
                      Địa Điểm Chi Tiết & Google Maps
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenGoogleMapsExternal}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Xem trên Google Maps</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Địa chỉ cụ thể (Số nhà, Đường, Quận/Huyện, TP)
                    </label>
                    <input
                      type="text"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      placeholder="e.g., Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Link Embed Google Maps (Iframe Src)
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoGenerateMapUrl}
                        className="text-[10px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        ⚡ Tự động tạo link từ địa chỉ
                      </button>
                    </div>
                    <input
                      type="text"
                      value={googleMapsUrl}
                      onChange={(e) => setGoogleMapsUrl(e.target.value)}
                      placeholder="https://maps.google.com/maps?q=... hoặc https://goo.gl/maps/..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Google Maps Live Preview */}
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
                      <div className="w-full h-44 rounded-2xl overflow-hidden border border-red-200 shadow-2xs relative bg-slate-100">
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

                {/* WiFi Details */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Wifi className="w-4 h-4 text-red-600" />
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
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mật khẩu WiFi</label>
                      <input
                        type="text"
                        value={wifiPassword}
                        onChange={(e) => setWifiPassword(e.target.value)}
                        placeholder="e.g., EventHub2026!"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:border-red-500"
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
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 text-xs"
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
