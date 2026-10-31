/**
 * Calendar Integration Utilities for EventHub AI
 * Supports:
 * - Direct Google Calendar Add-Event URL
 * - Apple / Outlook iCalendar (.ics) File Generation & Download
 */

export interface CalendarEventDetails {
  title: string;
  description?: string;
  location?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  qrToken?: string;
}

/**
 * Format a Date object or date string into iCal / Google UTC timestamp: YYYYMMDDTHHmmssZ
 */
export const formatCalendarTimestamp = (dateInput?: string | Date, fallbackDaysOffset = 7): string => {
  let date: Date;

  if (dateInput) {
    if (typeof dateInput === 'string' && dateInput.includes('/')) {
      // Parse DD/MM/YYYY or DD/MM/YYYY HH:mm
      const parts = dateInput.trim().split(' ');
      const dateParts = parts[0].split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        let hours = 9;
        let minutes = 0;
        if (parts.length > 1 && parts[1].includes(':')) {
          const timeParts = parts[1].split(':');
          hours = parseInt(timeParts[0], 10) || 9;
          minutes = parseInt(timeParts[1], 10) || 0;
        }
        date = new Date(Date.UTC(year, month, day, hours, minutes));
      } else {
        date = new Date(dateInput);
      }
    } else {
      date = new Date(dateInput);
    }
  } else {
    // Default fallback: now + fallbackDaysOffset days
    date = new Date(Date.now() + fallbackDaysOffset * 24 * 60 * 60 * 1000);
  }

  if (isNaN(date.getTime())) {
    date = new Date(Date.now() + fallbackDaysOffset * 24 * 60 * 60 * 1000);
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

/**
 * Build direct web link to add event to Google Calendar
 */
export const buildGoogleCalendarLink = (event: CalendarEventDetails): string => {
  const startFmt = formatCalendarTimestamp(event.startTime, 7);
  const endFmt = formatCalendarTimestamp(event.endTime, 8);

  const descText = [
    event.description || 'Tham dự sự kiện trên nền tảng EventHub AI.',
    event.qrToken ? `\nMã vé Check-in: ${event.qrToken}` : '',
    '\nThông tin chi tiết và soát vé trên ứng dụng EventHub AI.',
  ].filter(Boolean).join('');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Sự kiện EventHub AI',
    dates: `${startFmt}/${endFmt}`,
    details: descText,
    location: event.location || 'Trung tâm Hội nghị Quốc gia, Hà Nội',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Generate standard RFC 5545 iCalendar (.ics) string and trigger download in browser
 */
export const downloadIcsFile = (event: CalendarEventDetails): void => {
  const startFmt = formatCalendarTimestamp(event.startTime, 7);
  const endFmt = formatCalendarTimestamp(event.endTime, 8);
  const nowFmt = formatCalendarTimestamp(new Date(), 0);
  const uid = `eventhub-${Date.now()}@eventhub.ai`;

  const cleanText = (str?: string) =>
    (str || '').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventHub AI//Event Schedule//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowFmt}`,
    `DTSTART:${startFmt}`,
    `DTEND:${endFmt}`,
    `SUMMARY:${cleanText(event.title || 'Sự kiện EventHub AI')}`,
    `DESCRIPTION:${cleanText(
      (event.description || 'Vé tham dự sự kiện.') +
        (event.qrToken ? `\\nMã vé QR: ${event.qrToken}` : '')
    )}`,
    `LOCATION:${cleanText(event.location || 'Trung tâm Hội nghị')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = (event.title || 'EventHub_Event')
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '_')
    .substring(0, 30);
  link.download = `${fileName}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
