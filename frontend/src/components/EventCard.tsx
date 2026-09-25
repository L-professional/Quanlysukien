import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Edit, Trash2, QrCode, Play, Image as ImageIcon } from 'lucide-react';
import { Event } from '../types';

export type EventItem = Event;

export interface EventCardProps {
  event: EventItem;
  onViewDetails?: (event: EventItem) => void;
  onEdit?: (event: EventItem) => void;
  onDelete?: (event: EventItem) => void;
  onCheckIn?: (event: EventItem) => void;
  onPublish?: (event: EventItem) => void;
  onDuplicate?: (event: EventItem) => void;
  onRegister?: (event: EventItem) => void;
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

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onViewDetails,
  onEdit,
  onDelete,
  onCheckIn,
  onPublish,
  className = '',
}) => {
  const navigate = useNavigate();

  const titleClean = cleanEventTitle(event.title) || 'Sự kiện chưa đặt tên';
  const category = event.event_type || 'Hội thảo';
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

      {/* Card Footer Actions */}
      <div className="p-4 pt-0">
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Action 1: View / Edit */}
          <button
            type="button"
            onClick={() => (onEdit ? onEdit(event) : onViewDetails?.(event))}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Xem chi tiết hoặc Chỉnh sửa sự kiện"
          >
            <Edit size={14} className="text-slate-600 group-hover:text-[#DC2626]" />
            <span>Chỉnh sửa</span>
          </button>

          {/* Action 2: Fast QR Check-in */}
          <button
            type="button"
            onClick={handleQrCheckIn}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer"
            title="Chuyển nhanh sang màn hình Soát vé QR"
          >
            <QrCode size={14} />
            <span>Soát vé QR</span>
          </button>

          {/* Quick Publish for Drafts (optional) */}
          {event.status === 'DRAFT' && onPublish && (
            <button
              type="button"
              onClick={() => onPublish(event)}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
              title="Xuất bản sự kiện"
            >
              <Play size={15} />
            </button>
          )}

          {/* Action 3: Delete Event */}
          <button
            type="button"
            onClick={() => onDelete?.(event)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
            title="Xóa sự kiện"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
