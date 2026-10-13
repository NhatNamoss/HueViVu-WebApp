import { getDayProgress, type TripState } from './trip-state';

function stable(value: any): string {
  const normalize = (v: any): any => Array.isArray(v) ? v.map(normalize) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, normalize(v[k])])) : v;
  return JSON.stringify(normalize(value));
}

export function validateTripChange(before: any, after: any, state: TripState, publishedPlaces: Array<{ id: string; name: string }>): string | null {
  if (!after || !Array.isArray(after.days) || after.days.length !== before.days?.length) return 'Phương án phải giữ số ngày của chuyến đi.';
  for (const field of ['title', 'summary', 'total_cost_estimate', 'ai_insight']) if (after[field] !== undefined && (typeof after[field] !== 'string' || after[field].length > 8000)) return 'Nội dung phương án chưa hợp lệ.';
  if (after.highlights !== undefined && (!Array.isArray(after.highlights) || after.highlights.length > 30 || after.highlights.some((item: any) => typeof item !== 'string' || item.length > 2000))) return 'Điểm nổi bật chưa hợp lệ.';
  const existing = new Set((before.days || []).flatMap((day: any) => day.activities || []).map((a: any) => `${a.place_id || ''}|${a.name}`));
  for (let i = 0; i < before.days.length; i++) {
    const day = after.days[i];
    if (!day || day.day !== before.days[i].day || !Array.isArray(day.activities) || day.activities.length > 30) return 'Ngày hoặc hoạt động trong phương án chưa hợp lệ.';
    for (const activity of day.activities) {
      if (!activity || typeof activity.name !== 'string' || !activity.name.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(activity.time || '')) return 'Mỗi điểm cần có tên và giờ hợp lệ.';
      if (activity.type !== 'rest' && !existing.has(`${activity.place_id || ''}|${activity.name}`) && !publishedPlaces.some(p => p.name === activity.name && (!activity.place_id || p.id === activity.place_id))) return 'Phương án có địa điểm chưa được xuất bản trong kho dữ liệu.';
    }
    const old = before.days[i].activities || [];
    const progress = getDayProgress(state, i, old);
    // Exact content and relative order must survive, including duplicate visits.
    let cursor = 0;
    for (const index of progress.completedActivityIndexes.sort((a, b) => a - b)) {
      const expected = stable(old[index]);
      const found = day.activities.findIndex((a: any, n: number) => n >= cursor && stable(a) === expected);
      if (found < 0) return 'Phương án thay đổi điểm đã hoàn thành. Hãy tạo phương án khác cho các điểm chưa đi.';
      cursor = found + 1;
    }
  }
  return null;
}
