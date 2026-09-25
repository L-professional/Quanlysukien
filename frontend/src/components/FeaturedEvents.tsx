import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Ticket, ArrowRight, Star } from 'lucide-react';
import { apiService as api } from '../services/api';
import { cleanEventTitle, formatEventDateTime, EventItem } from './EventCard';

interface FeaturedEventsProps {
  onRegisterClick?: (event: EventItem) => void;
  className?: string;
}

export const FeaturedEvents: React.FC<FeaturedEventsProps> = ({ onRegisterClick, className = '' }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchFeaturedEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch strictly from backend API with is_featured=true&limit=4
      const data = await api.getEvents({ is_featured: true, limit: 4 });
      if (Array.isArray(data) && data.length > 0) {
        setEvents(data.slice(0, 4));
      } else {
        // Fallback query if is_featured param was filtered differently
        const all = await api.getEvents();
        const featured = all.filter((e: any) => e.featured || e.homepage_visible).slice(0, 4);
        setEvents(featured.length > 0 ? featured : all.slice(0, 4));
      }
    } catch (err: any) {
      console.error('Failed to load featured events:', err);
      setError('Không thể tải danh sách sự kiện nổi bật.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeaturedEvents();

    const handleSync = () => {
      fetchFeaturedEvents();
    };
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'eventhub_sync_trigger') {
        fetchFeaturedEvents();
      }
    };

    window.addEventListener('eventhub:events-updated', handleSync);
    window.addEventListener('storage', handleStorageSync);

    return () => {
      window.removeEventListener('eventhub:events-updated', handleSync);
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  const handleRegister = (event: EventItem, e: React.MouseEvent) => {
    e.preventDefault();
    if (onRegisterClick) {
      onRegisterClick(event);
    } else {
      navigate('/events');
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* 4-column responsive grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          // Skeleton Loading State (4 cards)
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs animate-pulse flex flex-col h-full"
            >
              <div className="aspect-video bg-slate-200 w-full relative" />
              <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                    <div className="h-3.5 bg-slate-200 rounded w-1/4" />
                  </div>
                  <div className="h-5 bg-slate-200 rounded w-4/5" />
                  <div className="h-4 bg-slate-200 rounded w-full" />
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                </div>
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="h-2 bg-slate-200 rounded-full w-full" />
                  <div className="flex gap-2">
                    <div className="h-9 bg-slate-200 rounded-xl flex-1" />
                    <div className="h-9 bg-slate-200 rounded-xl w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : error ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 mb-3">{error}</p>
            <button
              onClick={fetchFeaturedEvents}
              className="px-4 py-2 bg-[#DC2626] text-white rounded-xl text-sm font-semibold hover:bg-[#B91C1C] transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500">Chưa có sự kiện nổi bật nào.</p>
          </div>
        ) : (
          events.map((event, idx) => {
            const cleanTitle = cleanEventTitle(event.title);
            const category = event.event_type || 'Công nghệ';
            const banner =
              event.cover_image ||
              'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';
            const dateStr =
              formatEventDateTime(event.start_time, event.end_time, event.start_date, event.end_date) ||
              event.start_date ||
              'Sắp diễn ra';
            const locationStr = event.location || 'Việt Nam';
            const capacity = event.capacity || 500;
            const registeredCount = event.registered_count || event.registeredCount || 0;
            const regPercent = Math.min(100, Math.round((registeredCount / capacity) * 100));
            const desc =
              event.description ||
              'Khám phá sự kiện công nghệ nổi bật được tổ chức và quản lý trên EventHub AI.';

            const isOngoing = event.status === 'ONGOING';
            const isCompleted = event.status === 'COMPLETED';
            const statusBadgeClass = isOngoing
              ? 'bg-[#DC2626] text-white animate-pulse'
              : isCompleted
              ? 'bg-slate-600 text-white'
              : 'bg-emerald-600 text-white';
            const statusLabel = isOngoing ? '● Trực tiếp' : isCompleted ? 'Đã kết thúc' : '● Sắp diễn ra';

            return (
              <div
                key={event.id || idx}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 card-hover flex flex-col group h-full"
                style={{ transitionDelay: `${idx * 80}ms` }}
              >
                {/* 16:9 Banner with Hover Zoom */}
                <div className="aspect-video relative overflow-hidden bg-slate-100">
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur text-slate-800 text-xs font-bold px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1.5 border border-slate-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                    {category}
                  </div>

                  {/* Status & Featured Badge */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                    {event.featured && (
                      <span className="bg-[#DC2626] text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        Nổi bật
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur ${statusBadgeClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <img
                    src={banner}
                    alt={cleanTitle}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Card Body */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div>
                    {/* Date & Location */}
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2.5 gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                        <span className="truncate">{dateStr}</span>
                      </span>
                      <span className="flex items-center gap-1.5 truncate text-right">
                        <MapPin className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                        <span className="truncate">{locationStr}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      className="text-[17px] font-bold text-slate-900 mb-2 line-clamp-2 hover:text-[#DC2626] transition-colors leading-snug"
                      title={cleanTitle}
                    >
                      <Link to="/events">{cleanTitle}</Link>
                    </h3>

                    {/* Description */}
                    <p className="text-slate-500 text-[13px] line-clamp-2 leading-relaxed mb-3">
                      {desc}
                    </p>
                  </div>

                  <div>
                    {/* Registration Capacity Progress Bar */}
                    <div className="space-y-1.5 mb-3.5 pt-2.5 border-t border-slate-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 text-[11px] font-medium">Tiến độ giữ chỗ</span>
                        <span className="font-bold text-[#DC2626] text-xs">
                          {registeredCount} / {capacity} ({regPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#DC2626] h-full rounded-full transition-all duration-500"
                          style={{ width: `${regPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleRegister(event, e)}
                        className="flex-1 py-2 px-3 text-center bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        Đăng ký ngay
                      </button>
                      <Link
                        to="/events"
                        className="py-2 px-3 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      >
                        Chi tiết
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FeaturedEvents;
