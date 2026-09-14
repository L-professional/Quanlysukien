import { useState, useEffect } from 'react';

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  isExpired: boolean;
}

export const useRealTimeClock = (targetDateString?: string) => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = now.toLocaleDateString('vi-VN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const getCountdown = (): CountdownState => {
    let targetTime = new Date('2026-10-15T08:30:00').getTime();
    if (targetDateString) {
      const parsed = new Date(targetDateString).getTime();
      if (!isNaN(parsed)) {
        targetTime = parsed;
      }
    }

    const diff = targetTime - now.getTime();

    if (diff <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formatted: 'Sự kiện đang diễn ra!',
        isExpired: true,
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    const formatted = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

    return {
      days,
      hours,
      minutes,
      seconds,
      formatted,
      isExpired: false,
    };
  };

  return {
    now,
    timeString,
    dateString,
    countdown: getCountdown(),
  };
};

export default useRealTimeClock;
