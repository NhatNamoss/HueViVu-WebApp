type ActivityLike = {
  time?: string;
  duration?: string;
  name?: string;
  lat?: number;
  lng?: number;
};

type PlaceLike = {
  name?: string;
  category?: string;
  duration?: string;
  avg_visit_min?: number;
  lat?: number;
  lng?: number;
};

export type InsertionSuggestion = {
  feasible: boolean;
  time: string;
  insertIndex: number;
  detourKm: number;
  travelBeforeMin: number;
  travelAfterMin: number;
  reason: string;
};

function toMinutes(value = '00:00') {
  const [hour, minute] = value.split(':').map(Number);
  return Number.isFinite(hour) ? hour * 60 + (minute || 0) : 0;
}

function formatMinutes(value: number) {
  const safe = Math.max(0, Math.round(value / 5) * 5);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function durationMinutes(value = '60 phut') {
  if (value.includes('giờ')) return Math.round((parseFloat(value) || 1) * 60);
  return parseInt(value, 10) || 60;
}

function distanceKm(a?: ActivityLike | PlaceLike, b?: ActivityLike | PlaceLike) {
  if (![a?.lat, a?.lng, b?.lat, b?.lng].every(value => Number.isFinite(Number(value)))) return 0;
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(Number(b!.lat) - Number(a!.lat));
  const dLng = rad(Number(b!.lng) - Number(a!.lng));
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(Number(a!.lat))) * Math.cos(rad(Number(b!.lat))) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function travelMinutes(km: number) {
  if (km <= 0) return 0;
  return Math.ceil((km < 2 ? km / 4.5 * 60 : km / 25 * 60) + 8);
}

function preferredTimes(category = '') {
  if (category === 'food' || category === 'market') return [7 * 60, 11 * 60 + 30, 18 * 60];
  if (category === 'cafe') return [10 * 60 + 30, 15 * 60 + 30];
  return [8 * 60 + 30, 14 * 60 + 30, 16 * 60 + 30];
}

export function suggestTripInsertion(activities: ActivityLike[], place: PlaceLike): InsertionSuggestion {
  const ordered = [...activities].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const visitMinutes = Number(place.avg_visit_min) || durationMinutes(place.duration || '1 giờ');
  const preferred = preferredTimes(place.category);
  const candidates: Array<InsertionSuggestion & { score: number }> = [];

  for (let index = 0; index <= ordered.length; index++) {
    const previous = ordered[index - 1];
    const next = ordered[index];
    const beforeKm = previous ? distanceKm(previous, place) : 0;
    const afterKm = next ? distanceKm(place, next) : 0;
    const directKm = previous && next ? distanceKm(previous, next) : 0;
    const travelBeforeMin = travelMinutes(beforeKm);
    const travelAfterMin = travelMinutes(afterKm);
    const earliest = previous
      ? toMinutes(previous.time) + durationMinutes(previous.duration) + travelBeforeMin
      : 7 * 60;
    const latest = next
      ? toMinutes(next.time) - travelAfterMin - visitMinutes
      : 21 * 60 - visitMinutes;
    if (latest < earliest) continue;

    const preferredInWindow = preferred.filter(time => time >= earliest && time <= latest);
    const start = preferredInWindow.length
      ? preferredInWindow.sort((a, b) => Math.abs(a - earliest) - Math.abs(b - earliest))[0]
      : Math.ceil(earliest / 15) * 15;
    if (start > latest) continue;

    const detourKm = Math.max(0, beforeKm + afterKm - directKm);
    const waitMinutes = Math.max(0, start - earliest);
    candidates.push({
      feasible: true,
      time: formatMinutes(start),
      insertIndex: index,
      detourKm: Number(detourKm.toFixed(1)),
      travelBeforeMin,
      travelAfterMin,
      reason: detourKm < 1
        ? `Nằm gần tuyến hiện tại, thêm khoảng ${detourKm.toFixed(1)} km.`
        : `Khoảng trống đủ thời gian, lệch tuyến khoảng ${detourKm.toFixed(1)} km.`,
      score: detourKm * 20 + waitMinutes / 10 + travelBeforeMin + travelAfterMin,
    });
  }

  const best = candidates.sort((a, b) => a.score - b.score)[0];
  if (best) {
    const suggestion = { ...best };
    delete (suggestion as Partial<typeof best>).score;
    return suggestion;
  }

  return {
    feasible: false,
    time: '',
    insertIndex: ordered.length,
    detourKm: 0,
    travelBeforeMin: 0,
    travelAfterMin: 0,
    reason: 'Ngày này không còn khoảng trống an toàn trước 21:00. Hãy chọn ngày khác hoặc bỏ bớt một hoạt động.',
  };
}
