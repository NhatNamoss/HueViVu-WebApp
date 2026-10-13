import { parseOpeningHours, weeklyHoursSummary } from './opening-hours';

export function safeSourceUrl(value: unknown): string | null {
  try { const url = new URL(String(value || '')); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

export function verificationGaps(place: Record<string, any>): string[] {
  const gaps: string[] = [];
  if (!String(place.source_name || '').trim()) gaps.push('tên nguồn');
  if (!safeSourceUrl(place.source_url) && !String(place.verification_notes || '').trim()) gaps.push('URL nguồn hoặc ghi nhận khảo sát');
  if (!String(place.verified_by || '').trim()) gaps.push('người kiểm chứng');
  if (!String(place.address || '').trim()) gaps.push('địa chỉ');
  if (!Number.isFinite(Number(place.lat)) || !Number.isFinite(Number(place.lng)) || Number(place.lat) < 15 || Number(place.lat) > 17 || Number(place.lng) < 106 || Number(place.lng) > 109) gaps.push('tọa độ Huế');
  const hours = parseOpeningHours(place.opening_hours, place.hours_time);
  if (Object.values(hours).some(intervals => intervals.some(interval => !/^([01]\d|2[0-3]):[0-5]\d$/.test(interval.open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(interval.close)))) gaps.push('khung giờ hợp lệ');
  if (!weeklyHoursSummary(hours)) gaps.push('giờ mở cửa có cấu trúc');
  return gaps;
}

// These are operational facts: a complete description is not verification.
export function evaluatePlaceTrust(place: Record<string, any>, now = new Date()) {
  const gaps = verificationGaps(place);
  const checked = Date.parse(place.verified_at || '');
  const interval = [30, 60, 90].includes(Number(place.reverify_after_days)) ? Number(place.reverify_after_days) : 90;
  const age = Number.isFinite(checked) && checked <= now.getTime() ? Math.floor((now.getTime() - checked) / 86400000) : null;
  const verified = place.verification_status === 'verified' && gaps.length === 0 && age !== null;
  const stale = verified && age! >= interval;
  // Hours, prices and contact details expire sooner than stable descriptive content.
  const operationalDays = Math.min(interval, 30);
  const operationalFresh = verified && age! < operationalDays;
  return { status: !verified ? 'unverified' : stale || !operationalFresh ? 'stale' : 'verified',
    label: !verified ? 'Chưa xác minh' : stale || !operationalFresh ? 'Cần kiểm tra lại' : 'Đã xác minh',
    gaps, daysSinceChecked: age, operationalDays, operationalFresh,
    needsReverification: place.verification_status === 'verified' && (!verified || !operationalFresh),
    sourceUrl: safeSourceUrl(place.source_url) };
}

const criticalFields = ['name', 'category', 'address', 'lat', 'lng', 'price', 'phone', 'hours', 'hours_time', 'opening_hours', 'indoor', 'weather_dependent', 'avg_visit_min', 'accessibility', 'physical_level', 'source_name', 'source_url', 'verification_notes'];
export function applyVerificationPolicy(payload: Record<string, any>, before?: Record<string, any>, confirmed = false) {
  if (payload.source_url && !safeSourceUrl(payload.source_url)) throw new Error('URL nguồn phải dùng http hoặc https.');
  if (payload.verification_status !== 'verified') { payload.verified_at = null; return; }
  const changed = before && criticalFields.some(field => String(before[field] ?? '') !== String(payload[field] ?? ''));
  if (before?.verification_status === 'verified' && !confirmed) {
    if (changed) { payload.verification_status = 'reviewed'; payload.verified_at = null; }
    else { payload.verified_at = before.verified_at; payload.verified_by = before.verified_by; }
    return;
  }
  const gaps = verificationGaps(payload);
  if (gaps.length) throw new Error('Chưa thể xác minh: thiếu ' + gaps.join(', ') + '.');
  payload.verified_at = new Date().toISOString();
}
