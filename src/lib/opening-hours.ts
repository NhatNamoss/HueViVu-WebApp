export const WEEK_DAYS = [
  { key: 'mon', label: 'Thứ 2' }, { key: 'tue', label: 'Thứ 3' },
  { key: 'wed', label: 'Thứ 4' }, { key: 'thu', label: 'Thứ 5' },
  { key: 'fri', label: 'Thứ 6' }, { key: 'sat', label: 'Thứ 7' },
  { key: 'sun', label: 'Chủ nhật' },
] as const;

export type DayKey = (typeof WEEK_DAYS)[number]['key'];
export type TimeInterval = { open: string; close: string };
export type WeeklyHours = Record<DayKey, TimeInterval[]>;
export type OpeningStatus = { status: 'open' | 'closing_soon' | 'closed' | 'unknown'; label: string; closesAt?: string; opensAt?: string };

export function emptyWeeklyHours(): WeeklyHours {
  return Object.fromEntries(WEEK_DAYS.map(day => [day.key, []])) as unknown as WeeklyHours;
}

export function parseOpeningHours(value: unknown, legacyTime?: string): WeeklyHours {
  const empty = emptyWeeklyHours();
  let parsed: any = value;
  if (typeof value === 'string' && value.trim()) {
    try { parsed = JSON.parse(value); } catch { parsed = null; }
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    for (const { key } of WEEK_DAYS) {
      const intervals = Array.isArray(parsed[key]) ? parsed[key] : [];
      empty[key] = intervals.filter((item: any) => /^\d{2}:\d{2}$/.test(item?.open) && /^\d{2}:\d{2}$/.test(item?.close)).slice(0, 3);
    }
    return empty;
  }
  const match = String(legacyTime || '').match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (match) {
    const interval = { open: match[1].padStart(5, '0'), close: match[2].padStart(5, '0') };
    for (const { key } of WEEK_DAYS) empty[key] = [interval];
  }
  return empty;
}

function minutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function bangkokNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value || '';
  const weekdayMap: Record<string, DayKey> = { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' };
  return { day: weekdayMap[get('weekday')] || 'mon', time: `${get('hour')}:${get('minute')}` };
}

export function isOpenAt(hours: WeeklyHours, day: DayKey, time: string) {
  const current = minutes(time);
  return (hours[day] || []).some(interval => {
    const open = minutes(interval.open); const close = minutes(interval.close);
    return close >= open ? current >= open && current < close : current >= open || current < close;
  });
}

export function getOpeningStatus(hours: WeeklyHours, date = new Date()): OpeningStatus {
  const now = bangkokNow(date); const intervals = hours[now.day] || [];
  if (!WEEK_DAYS.some(day => (hours[day.key] || []).length)) return { status: 'unknown', label: 'Chưa xác minh giờ' };
  const current = minutes(now.time);
  for (const interval of intervals) {
    const open = minutes(interval.open); const close = minutes(interval.close);
    const inside = close >= open ? current >= open && current < close : current >= open || current < close;
    if (inside) {
      const remaining = close >= open ? close - current : current >= open ? 24 * 60 - current + close : close - current;
      if (remaining <= 60) return { status: 'closing_soon', label: `Sắp đóng ${interval.close}`, closesAt: interval.close };
      return { status: 'open', label: `Đang mở · đến ${interval.close}`, closesAt: interval.close };
    }
    if (current < open) return { status: 'closed', label: `Mở lúc ${interval.open}`, opensAt: interval.open };
  }
  return { status: 'closed', label: 'Đã đóng hôm nay' };
}

export function weeklyHoursSummary(hours: WeeklyHours) {
  const configured = WEEK_DAYS.filter(day => hours[day.key]?.length);
  if (!configured.length) return '';
  const first = hours[configured[0].key];
  const sameEveryDay = configured.length === 7 && WEEK_DAYS.every(day => JSON.stringify(hours[day.key]) === JSON.stringify(first));
  if (sameEveryDay) return first.map(item => `${item.open}–${item.close}`).join(', ') + ' hằng ngày';
  return `${configured.length}/7 ngày đã cấu hình`;
}
