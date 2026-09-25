import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  Edit,
  Trash2,
  QrCode,
  Play,
  Ticket,
  Star,
  Image as ImageIcon,
  Bell,
  BellRing,
  ChevronDown,
  Download,
  ExternalLink,
  Loader2,
  Copy,
  Globe,
  MoreVertical,
} from 'lucide-react';
import { Event } from '../types';
import { apiService } from '../services/api';
import { notifyEventChange } from '../services/eventSync';
import { toast } from 'sonner';

export type EventItem = Event;

export interface EventCardProps {
  event: EventItem;
  onViewDetails?: (event: EventItem) => void;
  onEdit?: (event: EventItem) => void;
  onDelete?: (event: EventItem) => void;
  onCheckIn?: (event: EventItem) => void;
  onPublish?: (event: EventItem) => void;
  onDuplicate?: (event: EventItem) => void;
  onStatusChange?: (event: EventItem, newStatus: string) => void;
  onRegister?: (event: EventItem) => void;
  onFeedback?: (event: EventItem) => void;
  onViewTicket?: (event: EventItem) => void;
  onCancelRegistration?: (event: EventItem) => void;
  onToggleReminder?: (event: EventItem, action: 'SCHEDULE' | 'CANCEL') => Promise<void> | void;
  /** Whether current user can manage (edit/delete) events — only admin/manager should set this true */
  canManage?: boolean;
  className?: string;
}

/** Clean random hash/UUID suffixes like "db3f53", "- a4a703", "_e8b12c", "(db3f53)" from event titles */
export function cleanEventTitle(title?: string): string {
  if (!title) return '';
  return title
    // Remove trailing full UUID with optional delimiters
    .replace(/\s*[-_#(]?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[)\]]?$/i, '')
    // Remove trailing 6-8 char hex with delimiters e.g. " - db3f53", "(a4a703)", "[db3f53]", "_e8b12c"
    .replace(/\s*[-_#([][0-9a-f]{6,8}[)\]]?$/i, '')
    // Remove trailing standalone hex hash e.g. " db3f53"
    .replace(/\s+\b[0-9a-f]{6,8}\b$/i, '')
    .trim();
}

/** Format event date and time to DD/MM/YYYY • HH:mm */
export function formatEventDateTime(
  startTime?: any,
  endTime?: any,
  startDate?: string,
  endDate?: string
): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  const parseParts = (val?: any): { dateStr: string; timeStr: string } | null => {
    if (!val) return null;

    if (val instanceof Date && !isNaN(val.getTime())) {
      const d = val.getDate();
      const m = val.getMonth() + 1;
      const y = val.getFullYear();
      const hh = val.getHours();
      const mm = val.getMinutes();
      return {
        dateStr: `${pad(d)}/${pad(m)}/${y}`,
        timeStr: `${pad(hh)}:${pad(mm)}`,
      };
    }

    if (typeof val === 'string') {
      const trimmed = val.trim();
      // Case 1: "15/10/2026 08:30" or "15/10/2026"
      const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
      if (slashMatch) {
        const d = pad(parseInt(slashMatch[1], 10));
        const m = pad(parseInt(slashMatch[2], 10));
        const y = slashMatch[3];
        const timeStr = slashMatch[4] ? `${pad(parseInt(slashMatch[4], 10))}:${slashMatch[5]}` : '';
        return { dateStr: `${d}/${m}/${y}`, timeStr };
      }

      // Case 2: ISO string e.g. "2026-10-15T08:30:00"
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return {
          dateStr: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
          timeStr: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        };
      }
    }
    return null;
  };

  const startParsed = parseParts(startTime) || parseParts(startDate);
  const endParsed = parseParts(endTime) || parseParts(endDate);

  if (!startParsed) {
    if (startDate && typeof startDate === 'string') return startDate;
    if (startTime && typeof startTime === 'string') return startTime;
    return 'Chưa xác định';
  }

  const { dateStr, timeStr } = startParsed;
  const startTimeDisplay = timeStr ? ` • ${timeStr}` : ' • 08:00';

  if (endParsed) {
    if (endParsed.dateStr === dateStr && endParsed.timeStr && endParsed.timeStr !== timeStr) {
      return `${dateStr} • ${timeStr || '08:00'} - ${endParsed.timeStr}`;
    }
  }

  return `${dateStr}${startTimeDisplay}`;
}

/** Build Google Calendar URL for personal device sync */
export function buildGoogleCalendarUrl(event: Event): string {
  const title = encodeURIComponent(cleanEventTitle(event.title) || 'Sự kiện EventHub AI');
  const details = encodeURIComponent(
    `${event.description || 'Tham gia sự kiện cùng EventHub AI'}\n\nXem chi tiết tại: ${window.location.origin}/events`
  );
  const location = encodeURIComponent(event.location_address || event.location || 'Hà Nội, Việt Nam');

  const parseToUtcString = (val?: any): string => {
    if (!val) {
      const d = new Date(Date.now() + 86400000);
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    }
    const future = new Date(Date.now() + 86400000);
    return future.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const startUtc = parseToUtcString(event.start_time || event.start_date);
  const endUtc = parseToUtcString(event.end_time || event.end_date);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startUtc}/${endUtc}&details=${details}&location=${location}`;
}

/** Download standard .ics file for Apple Calendar, Outlook, Mobile */
export function downloadIcsFile(event: Event): void {
  const cleanTitle = cleanEventTitle(event.title) || 'Su kien EventHub AI';
  const formatIcsDate = (val?: any): string => {
    const d = val ? new Date(val) : new Date(Date.now() + 86400000);
    const validD = isNaN(d.getTime()) ? new Date(Date.now() + 86400000) : d;
    return validD.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const startIcs = formatIcsDate(event.start_time || event.start_date);
  const endIcs = formatIcsDate(event.end_time || event.end_date);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventHub AI//Event Scheduler//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:evt-${event.id}-${Date.now()}@eventhub.ai`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${startIcs}`,
    `DTEND:${endIcs}`,
    `SUMMARY:${cleanTitle}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location_address || event.location || 'Việt Nam'}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Nhắc nhở sự kiện EventHub AI trước 24 giờ',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Nhắc nhở sự kiện EventHub AI trước 2 giờ - Chuẩn bị mã QR check-in',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `event_${event.id}_schedule.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onViewDetails,
  onEdit,
  onDelete,
  onCheckIn,
  onPublish,
  onDuplicate,
  onStatusChange,
  onRegister,
  onFeedback,
  onViewTicket,
  onCancelRegistration,
  onToggleReminder,
  canManage = false,
  className = '',
}) => {
  const navigate = useNavigate();

  const titleClean = cleanEventTitle(event.title) || 'Sự kiện chưa đặt tên';
  const category = event.event_type || 'Hội thảo';

  // Task 70 & 79: Action Menus State (Lưu lịch & Thao tác quản trị)
  const [isReminded, setIsReminded] = useState(Boolean(event.is_reminded));
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const reminderMenuRef = useRef<HTMLDivElement>(null);

  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsReminded(Boolean(event.is_reminded));
  }, [event.is_reminded]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reminderMenuRef.current && !reminderMenuRef.current.contains(e.target as Node)) {
        setShowReminderMenu(false);
      }
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setShowAdminMenu(false);
      }
    };
    if (showReminderMenu || showAdminMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReminderMenu, showAdminMenu]);

  const handleOpenGoogleCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = buildGoogleCalendarUrl(event);
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowReminderMenu(false);
    toast.success('Đang mở Google Calendar để thêm sự kiện...');
  };

  const handleDownloadIcs = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadIcsFile(event);
    setShowReminderMenu(false);
    toast.success('Đã tải xuống tệp lịch .ics cho Apple/Outlook!');
  };

  const handleToggleScheduleReminder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsScheduling(true);
    try {
      if (!isReminded) {
        if (onToggleReminder) {
          await onToggleReminder(event, 'SCHEDULE');
        } else {
          await apiService.scheduleEventReminder(event.id);
          notifyEventChange('REMINDER', event.id);
          toast.success(`Đã đặt lịch nhắc tự động cho "${titleClean}"!`);
        }
        setIsReminded(true);
      } else {
        if (onToggleReminder) {
          await onToggleReminder(event, 'CANCEL');
        } else {
          await apiService.cancelEventReminder(event.id);
          notifyEventChange('REMINDER', event.id);
          toast.info(`Đã hủy lịch nhắc sự kiện "${titleClean}".`);
        }
        setIsReminded(false);
      }
      setShowReminderMenu(false);
    } catch {
      toast.error('Có lỗi xảy ra khi cập nhật lịch nhắc. Vui lòng thử lại!');
    } finally {
      setIsScheduling(false);
    }
  };
  const defaultBanner = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';
  const bannerImage = event.cover_image || defaultBanner;

  const dateTimeFormatted = formatEventDateTime(
    event.start_time,
    event.end_time,
    event.start_date,
    event.end_date
  );

  const capacity = event.capacity || 500;
  const registeredCount = event.registered_count ?? event.registeredCount ?? 0;
  const percent = Math.min(100, Math.round((registeredCount / capacity) * 100));

  // Status Badge Helper
  const renderStatusBadge = () => {
    const status = (event.status || 'DRAFT').toUpperCase();
    switch (status) {
      case 'ONGOING':
        return (
          <span className="bg-[#DC2626] text-white font-bold text-[11px] px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            Đang diễn ra
          </span>
        );
      case 'UPCOMING':
        return (
          <span className="bg-amber-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            Sắp diễn ra
          </span>
        );
      case 'PUBLISHED':
        return (
          <span className="bg-emerald-600 text-white font-bold text-[11px] px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm">
            Đã xuất bản
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="bg-slate-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm">
            Đã kết thúc
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="bg-rose-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm">
            Đã hủy
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="bg-slate-500/90 text-white font-bold text-[11px] px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm">
            Bản nháp
          </span>
        );
    }
  };

  const handleQrCheckIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCheckIn) {
      onCheckIn(event);
    } else {
      navigate(`/check-in?event_id=${event.id}`);
    }
  };

  return (
    <div
      className={`group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full ${className}`}
    >
      <div>
        {/* 1. 16:9 Banner Image & Top Badges */}
        <div className="aspect-[16/9] w-full relative overflow-hidden bg-slate-100">
          {/* Top-Left: Category Tag */}
          <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-sm text-slate-800 text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 border border-white/60">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
            <span>{category}</span>
          </div>

          {/* Top-Right: Status Badge */}
          <div className="absolute top-3 right-3 z-10">
            {renderStatusBadge()}
          </div>

          {/* Banner Image with Hover Zoom */}
          <img
            src={bannerImage}
            alt={titleClean}
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultBanner;
            }}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-3.5">
          {/* Title */}
          <div>
            <h3
              onClick={() => (onEdit ? onEdit(event) : onViewDetails?.(event))}
              className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug line-clamp-2 hover:text-[#DC2626] transition-colors cursor-pointer"
              title={titleClean}
            >
              {titleClean}
            </h3>
          </div>

          {/* Date & Location */}
          <div className="space-y-1.5 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-[#DC2626] shrink-0" />
              <span className="truncate">{dateTimeFormatted}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-[#DC2626] shrink-0" />
              <span className="truncate" title={event.location_address || event.location}>
                {event.location || event.location_address || 'Chưa cập nhật địa điểm'}
              </span>
            </div>
          </div>

          {/* Progress Bar (Registration Capacity) */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                <Users size={14} className="text-slate-400" />
                Đăng ký: <span className="text-slate-900 font-bold">{registeredCount} / {capacity}</span>
              </span>
              <span className="font-bold text-[#DC2626]">{percent}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#DC2626] to-[#E11D48] h-full rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer Actions (Task 79: Bố Cục 2 Tầng Tinh Gọn) */}
      <div className="p-4 pt-0 space-y-2.5">
        {/* ── TẦNG 1: PRIMARY ACTION (ƯU TIÊN CAO NHẤT, RỘNG TOÀN CHIỀU NGANG) ── */}
        <div>
          {event.is_registered ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewTicket ? onViewTicket(event) : onViewDetails?.(event);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all cursor-pointer active:scale-98"
                title="Mở popup xem mã vé QR và thông tin soát vé"
              >
                <QrCode size={16} />
                <span>Xem mã vé QR</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelRegistration?.(event);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-all border border-rose-200 cursor-pointer active:scale-98"
                title="Hủy đăng ký vé tham dự sự kiện này"
              >
                <Trash2 size={14} className="text-rose-600" />
                <span>Hủy đăng ký vé</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRegister ? onRegister(event) : onViewDetails?.(event);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all cursor-pointer active:scale-98"
              title="Đăng ký giữ chỗ, chọn loại vé và nhận mã QR xác nhận"
            >
              <Ticket size={16} />
              <span>🎟️ Đăng ký tham dự</span>
            </button>
          )}
        </div>

        {/* ── TẦNG 2: SECONDARY & ADMIN ACTIONS (FLEXBOX JUSTIFY-BETWEEN) ── */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {/* Nhóm Trái (Public User Actions: Lưu lịch & Đánh giá) */}
          <div className="flex items-center gap-1.5">
            {/* Nút [ 🗓️ Lưu lịch ▾ ] Dropdown */}
            <div className="relative" ref={reminderMenuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReminderMenu(!showReminderMenu);
                  setShowAdminMenu(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                  isReminded
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-medium'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium'
                }`}
                title="Lưu vào Google Calendar, Apple / Outlook hoặc bật thông báo"
              >
                {isReminded ? (
                  <BellRing size={14} className="text-emerald-600 animate-pulse" />
                ) : (
                  <Calendar size={14} className="text-slate-600" />
                )}
                <span>{isReminded ? 'Đã lưu lịch' : 'Lưu lịch'}</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${showReminderMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Popup Dropdown Lưu lịch */}
              {showReminderMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 bottom-full mb-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Thêm vào lịch cá nhân
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenGoogleCalendar}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <Calendar size={14} className="text-red-600 shrink-0" />
                    <span className="flex-1">Google Calendar</span>
                    <ExternalLink size={12} className="text-slate-400 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadIcs}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <Download size={14} className="text-blue-600 shrink-0" />
                    <span className="flex-1">Tải file .ics (Apple / Outlook)</span>
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    type="button"
                    disabled={isScheduling}
                    onClick={handleToggleScheduleReminder}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isReminded
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                        : 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                    }`}
                  >
                    {isScheduling ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : isReminded ? (
                      <>
                        <Trash2 size={13} />
                        <span>Hủy nhắc lịch tự động</span>
                      </>
                    ) : (
                      <>
                        <BellRing size={13} />
                        <span>Kích hoạt nhắc 3 mốc (SMS/Email)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Nút [ ⭐ Đánh giá ] (Chỉ hiển thị khi sự kiện đã diễn ra hoặc tài khoản đã tham dự) */}
            {(event.status === 'COMPLETED' || event.status === 'completed' || event.is_registered) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFeedback?.(event);
                }}
                className="flex items-center gap-1.5 border border-amber-300 text-amber-600 hover:bg-amber-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer active:scale-95"
                title="Gửi nhận xét và đánh giá sao cho sự kiện"
              >
                <Star size={14} className="fill-amber-500 text-amber-500" />
                <span className="hidden sm:inline">Đánh giá</span>
              </button>
            )}
          </div>

          {/* Nhóm Phải (Admin / Manager Actions: Soát vé & Dropdown Thao Tác) */}
          <div className="flex items-center gap-1.5">
            {/* Nút [ ▦ Soát vé QR ] */}
            <button
              type="button"
              onClick={handleQrCheckIn}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors cursor-pointer active:scale-95"
              title="Chuyển nhanh sang màn hình Quét mã QR Soát vé"
            >
              <QrCode size={14} className="text-red-600" />
              <span className="hidden sm:inline">Soát vé QR</span>
            </button>

            {/* Dropdown Menu [ ⋮ Thao Tác ▾ ] */}
            <div className="relative" ref={adminMenuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAdminMenu(!showAdminMenu);
                  setShowReminderMenu(false);
                }}
                className="flex items-center gap-1 px-2.5 py-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors cursor-pointer active:scale-95"
                title="Thao tác nâng cao"
              >
                <MoreVertical size={15} />
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${showAdminMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Popup Menu Thao Tác */}
              {showAdminMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAdminMenu(false);
                      navigate(`/landing?event_id=${event.id}`);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-red-600 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Globe size={14} className="text-slate-500" />
                    <span>Xem Landing Page</span>
                  </button>

                  {canManage && event.status === 'DRAFT' && onPublish && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAdminMenu(false);
                        onPublish(event);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Play size={14} className="text-emerald-600" />
                      <span>Xuất bản ngay</span>
                    </button>
                  )}

                  {canManage && onDuplicate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAdminMenu(false);
                        onDuplicate(event);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-red-600 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Copy size={14} className="text-slate-500" />
                      <span>Nhân bản sự kiện</span>
                    </button>
                  )}

                  {canManage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAdminMenu(false);
                        onEdit ? onEdit(event) : onViewDetails?.(event);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-red-600 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Edit size={14} className="text-slate-500" />
                      <span>Chỉnh sửa sự kiện</span>
                    </button>
                  )}

                  {canManage && (
                    <>
                      <div className="border-t border-slate-100 my-1"></div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAdminMenu(false);
                          onDelete?.(event);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <Trash2 size={14} className="text-rose-600" />
                        <span>Xóa sự kiện</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
