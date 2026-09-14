import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Users, ArrowRight } from 'lucide-react';

export interface CatalogEvent {
  id: number;
  title: string;
  location: string;
  dateLabel: string;
  targetDate: string; // ISO string e.g. "2026-10-18T08:00:00"
  registeredCount: number;
  capacity: number;
  ticketType: string;
  status: 'Open' | 'Closed' | 'Live' | 'Draft';
  isLiveNow?: boolean;
}

interface EventCatalogCardProps {
  event: CatalogEvent;
  onViewDetails?: (event: CatalogEvent) => void;
}

export const EventCatalogCard: React.FC<EventCatalogCardProps> = ({ event, onViewDetails }) => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const targetTime = new Date(event.targetDate).getTime();
  const diff = Math.max(0, targetTime - now.getTime());

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const pad = (num: number) => String(num).padStart(2, '0');
  const percent = Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 space-y-4 text-slate-900">
      {/* Top Header: Gradient Icon + Open Badge */}
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <span className="px-3.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full">
          {event.status}
        </span>
      </div>

      {/* Title & Metadata */}
      <div>
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{event.title}</h3>
        <div className="mt-1 space-y-0.5 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="text-slate-500">{event.dateLabel}</div>
        </div>
      </div>

      {/* Countdown Timer Section */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>Starts in</span>
        </div>

        {/* 4 Countdown Boxes matching exact UI screenshot */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl py-2 px-1">
            <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono leading-none">
              {pad(days)}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">DAYS</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl py-2 px-1">
            <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono leading-none">
              {pad(hours)}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">HRS</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl py-2 px-1">
            <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono leading-none">
              {pad(minutes)}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">MIN</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl py-2 px-1">
            <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono leading-none">
              {pad(seconds)}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">SEC</div>
          </div>
        </div>
      </div>

      {/* Registration Capacity Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {event.registeredCount}/{event.capacity}
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

      {/* Card Footer: Ticket Type & View details link */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
          {event.ticketType}
        </span>
        <button
          onClick={() => onViewDetails?.(event)}
          className="text-indigo-600 hover:text-indigo-700 font-extrabold text-xs flex items-center gap-1 transition-colors cursor-pointer"
        >
          View details <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default EventCatalogCard;
