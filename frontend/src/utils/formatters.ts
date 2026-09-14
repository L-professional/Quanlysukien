/**
 * Date and Time Formatters for Vietnamese Locale (Asia/Ho_Chi_Minh)
 */

export function formatVietnameseDateTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  
  // Nếu đã ở dạng DD/MM/YYYY HH:mm thì trả về luôn
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return String(dateInput);
  }

  // Định dạng chuẩn Việt Nam: DD/MM/YYYY HH:mm theo múi giờ Asia/Ho_Chi_Minh
  try {
    const formatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    let day = '', month = '', year = '', hour = '', minute = '';
    for (const p of parts) {
      if (p.type === 'day') day = p.value;
      else if (p.type === 'month') month = p.value;
      else if (p.type === 'year') year = p.value;
      else if (p.type === 'hour') hour = p.value;
      else if (p.type === 'minute') minute = p.value;
    }

    if (day && month && year && hour && minute) {
      return `${day}/${month}/${year} ${hour}:${minute}`;
    }
    return d.toLocaleString('vi-VN');
  } catch {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
}

export function formatVietnameseTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
