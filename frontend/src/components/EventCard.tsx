import React from 'react';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';

export interface EventCardProps {
  event: {
    id: number;
    title: string;
    location: string;
    location_address?: string;
    start_time?: string;
    end_time?: string;
    start_date?: string;
    date_label?: string;
    targetDate?: string;
    registeredCount?: number;
    capacity?: number;
    ticketType?: string;
    status?: string;
    isLiveNow?: boolean;
    description?: string;
    [key: string]: any;
  };
  onViewDetails?: (event: any) => void;
  onRegister?: (event: any) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onViewDetails, onRegister }) => {
  const capacity = event.capacity ?? 100;
  const registered = event.registeredCount ?? event.registered_count ?? 0;
  const percent = Math.min(100, Math.round((registered / capacity) * 100));

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-300 space-y-4 text-slate-900 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Header Badge */}
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <span className="px-3.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full">
            {event.status || 'Open'}
          </span>
        </div>

        {/* Title & Location */}
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
            {event.title}
          </h3>
          <div className="mt-1 space-y-0.5 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{event.location_address || event.location}</span>
            </div>
            <div className="text-slate-500 font-medium">
              {event.start_date || event.date_label || '15/10/2026'} {event.start_time ? `• ${event.start_time}` : ''}
            </div>
          </div>
        </div>

        {/* Independent Dynamic Countdown Timer */}
        <div className="pt-1">
          <CountdownTimer
            startTime={event.start_time}
            startDate={event.start_date}
            targetDate={event.targetDate}
            dayNumber={event.day_number}
          />
        </div>

        {/* Capacity Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {registered}/{capacity}
            </span>
            <span className="font-extrabold text-slate-800">{percent}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
          {event.ticketType || 'Tiêu chuẩn'}
        </span>
        <div className="flex items-center gap-2">
          {onRegister && (
            <button
              onClick={() => onRegister(event)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Đăng ký
            </button>
          )}
          <button
            onClick={() => onViewDetails?.(event)}
            className="text-indigo-600 hover:text-indigo-700 font-extrabold text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            Chi tiết <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
