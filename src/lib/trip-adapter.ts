import { getDb } from './db';
import { parsePlaceRow } from './place-data';
import { getHueClock } from './travel-clock';

type Scenario = 'late' | 'rain' | 'hungry' | 'tired' | 'closed';
type AdaptInput = {
  scenario: Scenario; dayIndex: number; activityIndex?: number; delayMinutes?: number;
  currentTime?: string; lat?: number; lng?: number;
  completedActivityIndexes?: number[];
};

const FOOD = new Set(['food', 'cafe', 'market']);
const OUTDOOR = new Set(['heritage', 'temple', 'nature', 'craft_village']);

function toMinutes(time = '08:00') {
  const [hour, minute] = time.split(':').map(Number);
  return Number.isFinite(hour) ? hour * 60 + (minute || 0) : 480;
}
function toTime(total: number) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, total));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}
function distance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1); const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function durationMinutes(value = '60 phút') {
  if (value.includes('giờ')) return Math.round((parseFloat(value) || 1) * 60);
  return parseInt(value, 10) || 60;
}
function placeToActivity(place: any, time: string, note: string) {
  return {
    time, name: place.name, type: place.category, duration: `${place.avg_visit_min || 60} phút`,
    cost: place.price || 'Chưa cập nhật', description: place.description || '',
    ai_tip: note || place.ai_insight || place.tips?.[0] || '', location: place.address || 'Huế',
    lat: Number(place.lat), lng: Number(place.lng), place_id: place.id,
  };
}

export function adaptTrip(itinerary: any, input: AdaptInput) {
  const copy = JSON.parse(JSON.stringify(itinerary || {}));
  const days = Array.isArray(copy.days) ? copy.days : [];
  const day = days[input.dayIndex];
  if (!day) throw new Error('Ngày cần điều chỉnh không tồn tại');
  day.activities = Array.isArray(day.activities) ? day.activities : [];
  const completed = new Set(day.activities.filter((_: any, i: number) => input.completedActivityIndexes?.includes(i)));

  const db = getDb();
  const places: any[] = (db.prepare(`SELECT * FROM places WHERE publication_status = 'published' ORDER BY
    CASE verification_status WHEN 'verified' THEN 0 WHEN 'reviewed' THEN 1 ELSE 2 END,
    popularity DESC, rating DESC`).all() as any[]).map(parsePlaceRow);
  const usedIds = new Set(days.flatMap((item: any) => item.activities || []).map((activity: any) => activity.place_id).filter(Boolean));
  const usedNames = new Set(days.flatMap((item: any) => item.activities || []).map((activity: any) => activity.name));
  const now = toMinutes(input.currentTime || getHueClock().time);
  const changes: string[] = [];
  if (input.scenario === 'tired' && now + 55 > 22 * 60) {
    return { itinerary: copy, changes: ['Đã cuối ngày; hãy nghỉ tại nơi thuận tiện. HueViVu giữ lịch hiện tại và không thêm hoạt động vượt 22:00.'] };
  }
  if (input.scenario === 'hungry' && now >= 20 * 60 + 30) {
    return { itinerary: copy, changes: ['Đã quá giờ ăn tối trong lịch. Hãy tìm nơi đang mở và xác nhận với quán trước khi đi; HueViVu không chèn bữa ăn vào một giờ đã qua.'] };
  }

  const nearest = (candidates: any[], anchor?: { lat?: number; lng?: number }) => candidates.sort((a, b) => {
    const aDistance = Number.isFinite(anchor?.lat) && Number.isFinite(anchor?.lng) ? distance(anchor!.lat!, anchor!.lng!, Number(a.lat), Number(a.lng)) : 0;
    const bDistance = Number.isFinite(anchor?.lat) && Number.isFinite(anchor?.lng) ? distance(anchor!.lat!, anchor!.lng!, Number(b.lat), Number(b.lng)) : 0;
    return aDistance - bDistance || Number(b.popularity || 0) - Number(a.popularity || 0);
  })[0];

  if (input.scenario === 'late') {
    const delay = Math.min(180, Math.max(15, Number(input.delayMinutes) || 45));
    const kept: any[] = [];
    let shiftedCount = 0;
    for (const activity of day.activities) {
      if (completed.has(activity) || toMinutes(activity.time) < now - 90) { kept.push(activity); continue; }
      const shifted = Math.max(now, toMinutes(activity.time) + delay);
      if (shifted + durationMinutes(activity.duration) > 22 * 60) {
        changes.push(`Bỏ ${activity.name} vì vượt quá 22:00`); continue;
      }
      kept.push({ ...activity, time: toTime(shifted), ai_tip: `Đã lùi ${delay} phút do bạn đến trễ. ${activity.ai_tip || ''}`.trim() });
      shiftedCount++;
    }
    day.activities = kept;
    if (shiftedCount) changes.unshift(`Lùi ${shiftedCount} hoạt động còn lại ${delay} phút`);
  }

  if (input.scenario === 'rain') {
    const lookup = new Map(places.map(place => [place.id, place]));
    const indoorPool = places.filter(place => !usedIds.has(place.id) && !usedNames.has(place.name)
      && place.indoor);
    let replaced = 0;
    day.activities = day.activities.map((activity: any) => {
      if (completed.has(activity) || toMinutes(activity.time) < now - 20) return activity;
      const source = lookup.get(activity.place_id);
      const isOutdoor = source ? (!source.indoor && (source.weather_dependent || OUTDOOR.has(source.category))) : OUTDOOR.has(activity.type);
      if (!isOutdoor || replaced >= 3) return activity;
      const replacement = nearest(indoorPool.filter(place => !usedIds.has(place.id)), { lat: activity.lat || input.lat, lng: activity.lng || input.lng });
      if (!replacement) return activity;
      usedIds.add(replacement.id); replaced++;
      changes.push(`Đổi ${activity.name} → ${replacement.name}`);
      return placeToActivity(replacement, activity.time, '🌧️ Địa điểm được ghi nhận có không gian trong nhà. Hãy xác nhận giờ mở cửa và chỗ che mưa với địa điểm trước khi đi.');
    });
    if (!changes.length) changes.push('Chưa tìm được điểm trong nhà có đủ dữ liệu để thay thế. HueViVu giữ lịch cũ; hãy kiểm tra thời tiết và hỏi địa điểm trước khi đi.');
  }

  if (input.scenario === 'hungry') {
    const upcomingFoodIndex = day.activities.findIndex((activity: any) => !completed.has(activity) && FOOD.has(activity.type) && toMinutes(activity.time) >= now - 15);
    const mealTime = Math.max(7 * 60, Math.min(20 * 60 + 30, now + 15));
    if (upcomingFoodIndex >= 0 && toMinutes(day.activities[upcomingFoodIndex].time) - now <= 90) {
      const meal = day.activities.splice(upcomingFoodIndex, 1)[0];
      meal.time = toTime(mealTime); meal.ai_tip = `Đã đưa bữa ăn lên sớm vì bạn đang đói. ${meal.ai_tip || ''}`.trim();
      day.activities.push(meal); changes.push(`Đưa ${meal.name} lên ${meal.time}`);
    } else {
      const food = nearest(places.filter(place => FOOD.has(place.category) && !usedIds.has(place.id)), { lat: input.lat, lng: input.lng });
      if (!food) throw new Error('Chưa có quán ăn phù hợp trong kho dữ liệu');
      day.activities = day.activities.map((activity: any) => !completed.has(activity) && toMinutes(activity.time) >= mealTime ? { ...activity, time: toTime(toMinutes(activity.time) + 60) } : activity);
      day.activities.push(placeToActivity(food, toTime(mealTime), '🍜 Được chèn vì bạn cần nghỉ và ăn ngay lúc này.'));
      changes.push(`Thêm ${food.name} lúc ${toTime(mealTime)}`);
    }
  }

  if (input.scenario === 'tired') {
    let skipNext = false; const kept: any[] = [];
    for (const activity of day.activities) {
      if (completed.has(activity) || toMinutes(activity.time) < now - 20 || FOOD.has(activity.type) || activity.type === 'rest') { kept.push(activity); continue; }
      skipNext = !skipNext;
      if (skipNext) { changes.push(`Bỏ ${activity.name} để giảm nhịp`); continue; }
      kept.push(activity);
    }
    const restTime = toTime(now + 10);
    kept.push({ time: restTime, name: 'Nghỉ phục hồi', type: 'rest', duration: '45 phút', cost: 'Miễn phí', description: 'Nghỉ tại khách sạn hoặc quán gần nhất.', ai_tip: 'Uống nước, ngồi nơi mát và chỉ tiếp tục khi bạn thấy ổn.', location: 'Gần vị trí hiện tại', lat: input.lat, lng: input.lng });
    day.activities = kept; changes.unshift(`Thêm 45 phút nghỉ lúc ${restTime}`);
  }

  if (input.scenario === 'closed') {
    const index = Number.isInteger(input.activityIndex) ? Number(input.activityIndex) : day.activities.findIndex((activity: any) => toMinutes(activity.time) >= now - 20);
    const closed = day.activities[index];
    if (!closed) throw new Error('Hãy chọn hoạt động đang đóng cửa');
    if (completed.has(closed)) throw new Error('Điểm này đã được đánh dấu hoàn thành. Hãy chọn điểm chưa đi để thay thế.');
    const candidates = places.filter(place => place.category === closed.type && !usedIds.has(place.id) && !usedNames.has(place.name));
    const replacement = nearest(candidates, { lat: closed.lat || input.lat, lng: closed.lng || input.lng });
    if (!replacement) throw new Error(`Chưa có điểm cùng loại có đủ dữ liệu để thay thế. Hãy tìm và gọi xác nhận giờ mở cửa trước khi đi.`);
    day.activities[index] = placeToActivity(replacement, closed.time, `Thay cho ${closed.name} đang đóng cửa.`);
    changes.push(`Đổi ${closed.name} → ${replacement.name}`);
  }

  day.activities.sort((a: any, b: any) => toMinutes(a.time) - toMinutes(b.time));
  day.day_tip = `Đã thích nghi: ${changes.join('. ')}.`;
  copy.days = days;
  copy.adaptation_history = [...(copy.adaptation_history || []), { scenario: input.scenario, day: input.dayIndex + 1, changes, at: new Date().toISOString() }];
  return { itinerary: copy, changes };
}
