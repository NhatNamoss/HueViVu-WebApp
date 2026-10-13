const clock = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
export function getHueClock(now = new Date()) {
  const parts = Object.fromEntries(clock.formatToParts(now).map(part => [part.type, part.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;
  return { date, time, hour: Number(parts.hour), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}
export function tripDayIndex(startDate?: string | null, now = new Date()): number | null {
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;
  const start = Date.parse(startDate + 'T00:00:00Z');
  if (!Number.isFinite(start) || new Date(start).toISOString().slice(0, 10) !== startDate) return null;
  return Math.round((Date.parse(getHueClock(now).date + 'T00:00:00Z') - start) / 86400000);
}
export function scheduledMinutes(value?: string): number | null {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}
