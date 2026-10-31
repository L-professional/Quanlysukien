import { useState, useEffect } from 'react';

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  isExpired: boolean;
}

export interface WeatherState {
  tempText: string;
  condition: 'sunny' | 'cloudy' | 'rain' | 'fog';
  temperature: number;
}

export const useRealTimeClock = (targetDateString?: string) => {
  const [now, setNow] = useState<Date>(new Date());
  const [weather, setWeather] = useState<WeatherState>({
    tempText: '30°C Hà Nội',
    condition: 'cloudy',
    temperature: 30,
  });

  // 1. Ticking clock every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch real-time weather in Hanoi (Open-Meteo API, cached for 15 minutes)
  useEffect(() => {
    let isMounted = true;

    const fetchHanoiWeather = async () => {
      try {
        const cached = localStorage.getItem('eventhub_hanoi_weather');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 15 * 60 * 1000 && parsed.data) {
            if (isMounted) setWeather(parsed.data);
            return;
          }
        }

        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,weather_code',
          { signal: AbortSignal.timeout(4000) }
        );
        if (!res.ok) throw new Error('Weather API error');
        const json = await res.json();
        const current = json.current;
        if (current && typeof current.temperature_2m === 'number') {
          const temp = Math.round(current.temperature_2m);
          const code = current.weather_code || 0;
          let condition: WeatherState['condition'] = 'cloudy';
          if (code === 0 || code === 1) condition = 'sunny';
          else if (code >= 51) condition = 'rain';
          else if (code === 45 || code === 48) condition = 'fog';

          const weatherData: WeatherState = {
            tempText: `${temp}°C Hà Nội`,
            condition,
            temperature: temp,
          };

          if (isMounted) setWeather(weatherData);
          localStorage.setItem(
            'eventhub_hanoi_weather',
            JSON.stringify({ timestamp: Date.now(), data: weatherData })
          );
        }
      } catch {
        // Fallback gracefully
        if (isMounted) {
          const currentHour = new Date().getHours();
          const fallbackTemp = currentHour >= 11 && currentHour <= 16 ? 31 : 28;
          setWeather({
            tempText: `${fallbackTemp}°C Hà Nội`,
            condition: 'cloudy',
            temperature: fallbackTemp,
          });
        }
      }
    };

    fetchHanoiWeather();
    const weatherInterval = setInterval(fetchHanoiWeather, 15 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(weatherInterval);
    };
  }, []);

  // Format 24-hour time e.g. 17:22:15
  const timeString = now.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Format 12-hour time e.g. 05:22 PM
  const timeString12 = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Format date e.g. Th 6, 02/10/2026
  const dateString = now.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Format pure date e.g. 02/10/2026
  const dateFormatted = now.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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
    timeString12,
    dateString,
    dateFormatted,
    weather,
    countdown: getCountdown(),
  };
};

export default useRealTimeClock;
