import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface CountdownTimerProps {
  startTime?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  dayNumber?: number;
  activeEventStartDate?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

/**
 * Parse an event / session's start time and date into a timestamp.
 * Handles ISO strings, 'DD/MM/YYYY HH:mm', 'HH:mm AM/PM' + 'DD/MM/YYYY'.
 */
export function parseTargetTime(
  startTime?: string | null,
  startDate?: string | null,
  dayNumber?: number,
  targetDate?: string | null
): number {
  // Direct targetDate or full ISO string in startTime
  if (targetDate) {
    const d = new Date(targetDate);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  if (startTime) {
    if (startTime.includes('T') || (startTime.includes('-') && startTime.includes(':'))) {
      const d = new Date(startTime);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    // "DD/MM/YYYY HH:mm"
    const dmyMatch = startTime.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (dmyMatch) {
      const [, dd, mm, yyyy, hh = '00', min = '00'] = dmyMatch;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), 0).getTime();
    }
  }

  // Combine startDate + startTime
  let yyyy = 2026, mm = 10, dd = 15;
  const dateStr = startDate || (dayNumber === 2 ? '16/10/2026' : '15/10/2026');
  if (dateStr.includes('/')) {
    const parts = dateStr.split(' ')[0].split('/');
    if (parts.length === 3) {
      dd = parseInt(parts[0], 10);
      mm = parseInt(parts[1], 10);
      yyyy = parseInt(parts[2], 10);
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      yyyy = parseInt(parts[0], 10);
      mm = parseInt(parts[1], 10);
      dd = parseInt(parts[2], 10);
    }
  }

  let hh = 8, min = 30;
  if (startTime) {
    const ampmMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      min = parseInt(ampmMatch[2], 10);
      const ampm = ampmMatch[3]?.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      hh = h;
    }
  }

  const d = new Date(yyyy, mm - 1, dd, hh, min, 0);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  startTime,
  startDate,
  targetDate,
  dayNumber,
  className = '',
  size = 'md',
  showIcon = true,
}) => {
  const { t } = useTranslation();
  const [now, setNow] = useState<number>(Date.now());

  // Independent 1-second ticker for this timer instance
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const targetTimestamp = parseTargetTime(startTime, startDate, dayNumber, targetDate);
  const distance = targetTimestamp - now;

  // If time has arrived or passed: show "Sự kiện đang diễn ra" or "Đã bắt đầu"
  if (distance <= 0) {
    return (
      <div className={`py-2 px-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center gap-2 font-bold text-xs shadow-2xs ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Sự kiện đang diễn ra</span>
      </div>
    );
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  const pad = (num: number) => String(num).padStart(2, '0');

  const boxPy = size === 'sm' ? 'py-1' : size === 'lg' ? 'py-2.5' : 'py-1.5';
  const numText = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base sm:text-lg' : 'text-xs sm:text-sm';
  const labelText = size === 'sm' ? 'text-[7px]' : size === 'lg' ? 'text-[10px]' : 'text-[8px]';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showIcon && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>{t('events.startsIn')}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className={`bg-slate-50 border border-slate-100 rounded-xl ${boxPy} px-1`}>
          <div className={`${numText} font-extrabold text-slate-900 font-mono leading-none`}>
            {pad(days)}
          </div>
          <div className={`${labelText} font-bold text-slate-400 uppercase tracking-wider mt-1`}>
            {t('events.days')}
          </div>
        </div>

        <div className={`bg-slate-50 border border-slate-100 rounded-xl ${boxPy} px-1`}>
          <div className={`${numText} font-extrabold text-slate-900 font-mono leading-none`}>
            {pad(hours)}
          </div>
          <div className={`${labelText} font-bold text-slate-400 uppercase tracking-wider mt-1`}>
            {t('events.hrs')}
          </div>
        </div>

        <div className={`bg-slate-50 border border-slate-100 rounded-xl ${boxPy} px-1`}>
          <div className={`${numText} font-extrabold text-slate-900 font-mono leading-none`}>
            {pad(minutes)}
          </div>
          <div className={`${labelText} font-bold text-slate-400 uppercase tracking-wider mt-1`}>
            {t('events.min')}
          </div>
        </div>

        <div className={`bg-slate-50 border border-slate-100 rounded-xl ${boxPy} px-1`}>
          <div className={`${numText} font-extrabold text-slate-900 font-mono leading-none`}>
            {pad(seconds)}
          </div>
          <div className={`${labelText} font-bold text-slate-400 uppercase tracking-wider mt-1`}>
            {t('events.sec')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
