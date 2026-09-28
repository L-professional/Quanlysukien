/**
 * Event Status Utility
 * Standardized status calculation based on real time and unified filtering
 */

/** Helper: Parse DD/MM/YYYY or ISO date string into a Date object */
export function parseEventDate(val?: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (slashMatch) {
      const d = parseInt(slashMatch[1], 10);
      const m = parseInt(slashMatch[2], 10) - 1;
      const y = parseInt(slashMatch[3], 10);
      const hh = slashMatch[4] ? parseInt(slashMatch[4], 10) : 0;
      const mm = slashMatch[5] ? parseInt(slashMatch[5], 10) : 0;
      return new Date(y, m, d, hh, mm);
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/** Automatically computes event status based on real-time and dates */
export function computeEventStatus(event: {
  status?: string;
  start_time?: any;
  end_time?: any;
  start_date?: string;
  end_date?: string;
}): 'UPCOMING' | 'ONGOING' | 'ENDED' | 'DRAFT' | 'CANCELLED' {
  const raw = (event.status || '').toUpperCase().trim();
  if (raw === 'DRAFT') return 'DRAFT';
  if (raw === 'CANCELLED' || raw === 'CANCELED') return 'CANCELLED';

  const start = parseEventDate(event.start_time) || parseEventDate(event.start_date);
  const end = parseEventDate(event.end_time) || parseEventDate(event.end_date);
  const now = new Date();

  // Explicit ONGOING/LIVE override
  if (raw === 'ONGOING' || raw === 'LIVE') {
    if (end && now.getTime() - end.getTime() > 7 * 24 * 60 * 60 * 1000) {
      return 'ENDED';
    }
    return 'ONGOING';
  }

  // Explicit COMPLETED/ENDED override
  if (raw === 'COMPLETED' || raw === 'ENDED') {
    return 'ENDED';
  }

  // Automatic real-time status calculation
  if (start && end) {
    if (now < start) return 'UPCOMING';
    if (now >= start && now <= end) return 'ONGOING';
    return 'ENDED';
  } else if (start) {
    if (now < start) return 'UPCOMING';
    const defaultEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    if (now <= defaultEnd) return 'ONGOING';
    return 'ENDED';
  } else if (end) {
    if (now > end) return 'ENDED';
    return 'UPCOMING';
  }

  if (raw === 'PUBLISHED') return 'UPCOMING';
  return 'UPCOMING';
}

/** Case-insensitive unified filter condition for cards count and event list */
export function matchesStatusFilter(
  event: {
    status?: string;
    start_time?: any;
    end_time?: any;
    start_date?: string;
    end_date?: string;
  },
  filter?: string
): boolean {
  if (!filter || !filter.trim()) return true;
  const target = filter.trim().toUpperCase();
  const effective = computeEventStatus(event);

  if (target === 'UPCOMING' || target === 'PUBLISHED') {
    return effective === 'UPCOMING';
  }
  if (target === 'ONGOING' || target === 'LIVE') {
    return effective === 'ONGOING';
  }
  if (target === 'ENDED' || target === 'COMPLETED') {
    return effective === 'ENDED';
  }
  if (target === 'DRAFT') {
    return effective === 'DRAFT';
  }
  if (target === 'CANCELLED' || target === 'CANCELED') {
    return effective === 'CANCELLED';
  }
  return effective === target;
}
