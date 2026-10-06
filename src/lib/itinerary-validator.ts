import { getDb } from './db';
import { bangkokNow, isOpenAt, parseOpeningHours } from './opening-hours';
import { estimateTravelMinutes } from './travel-time';

type Issue = { severity: 'error' | 'warning' | 'info'; code: string; title: string; message: string; recommendation: string; activity?: string; activityIndex?: number; fixable?: boolean };

function minutes(time = '00:00') { const [h, m] = time.split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : 0; }
function durationMinutes(value = '60 phút') { return value.includes('giờ') ? Math.round((parseFloat(value) || 1) * 60) : parseInt(value, 10) || 60; }
function distanceKm(a: any, b: any) {
  if (![a?.lat, a?.lng, b?.lat, b?.lng].every(value => Number.isFinite(Number(value)))) return null;
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(Number(b.lat) - Number(a.lat)); const dLng = rad(Number(b.lng) - Number(a.lng));
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(Number(a.lat))) * Math.cos(rad(Number(b.lat))) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
const travelMinutes = estimateTravelMinutes;

export function validateItinerary(itinerary: any, startDate?: string) {
  const db = getDb();
  const places = db.prepare('SELECT id, name, opening_hours, hours_time FROM places').all() as any[];
  const byId = new Map(places.map(place => [place.id, place]));
  const byName = new Map(places.map(place => [place.name, place]));
  const baseDate = startDate ? new Date(`${startDate}T12:00:00+07:00`) : new Date();
  const days = (itinerary?.days || []).map((day: any, dayIndex: number) => {
    const issues: Issue[] = [];
    const activities = [...(day.activities || [])].sort((a, b) => minutes(a.time) - minutes(b.time));
    const date = new Date(baseDate); date.setDate(baseDate.getDate() + dayIndex);
    const dayKey = bangkokNow(date).day;
    let walkingKm = 0; let totalKm = 0;
    for (let index = 0; index < activities.length; index++) {
      const activity = activities[index];
      const place = byId.get(activity.place_id) || byName.get(activity.name);
      if (place) {
        const schedule = parseOpeningHours(place.opening_hours, place.hours_time);
        if (!isOpenAt(schedule, dayKey, activity.time) && Object.values(schedule).some((items: any) => items.length)) {
          issues.push({ severity: 'error', code: 'closed', title: 'Địa điểm có thể đang đóng cửa', activity: activity.name, activityIndex: index, fixable: true, message: `${activity.name} không mở vào lúc ${activity.time} như lịch đang xếp.`, recommendation: 'HueViVu có thể đổi giờ ghé hoặc tìm một địa điểm tương tự đang mở.' });
        }
      } else if (activity.type !== 'rest') {
        issues.push({ severity: 'warning', code: 'unverified_place', title: 'Thông tin địa điểm chưa được kiểm chứng', activity: activity.name, activityIndex: index, message: `HueViVu chưa có đủ dữ liệu đáng tin cậy về ${activity.name}.`, recommendation: 'Nên kiểm tra lại giờ mở cửa và địa chỉ trước khi đi.' });
      }
      const next = activities[index + 1];
      if (!next) continue;
      const km = distanceKm(activity, next);
      if (km == null) {
        issues.push({ severity: 'warning', code: 'missing_geo', title: 'Chưa tính được thời gian di chuyển', activity: next.name, activityIndex: index + 1, message: `Chưa có tọa độ chính xác để ước tính đường đến ${next.name}.`, recommendation: 'Lịch có thể bị trễ nếu hai điểm ở xa nhau hơn dự kiến.' });
        continue;
      }
      totalKm += km; if (km < 2) walkingKm += km;
      const required = minutes(activity.time) + durationMinutes(activity.duration) + travelMinutes(km);
      if (minutes(next.time) < required) {
        const shortage = required - minutes(next.time);
        issues.push({ severity: 'error', code: 'time_conflict', title: 'Hai hoạt động đang xếp quá sát nhau', activity: next.name, activityIndex: index + 1, fixable: true, message: `Bạn đang thiếu khoảng ${shortage} phút để ở lại điểm trước, nghỉ ngắn và di chuyển đến ${next.name}.`, recommendation: 'Nên giãn giờ bắt đầu của các hoạt động phía sau để tránh phải chạy vội hoặc bỏ dở.' });
      }
      if (km > 12) issues.push({ severity: 'warning', code: 'long_transfer', title: 'Chặng di chuyển khá xa', activity: next.name, activityIndex: index + 1, message: `Bạn cần đi khoảng ${km.toFixed(1)} km để đến ${next.name}.`, recommendation: 'Nên gom các địa điểm cùng khu vực hoặc dành thêm thời gian di chuyển.' });
    }
    const types = new Set(activities.map((activity: any) => activity.type));
    if (!types.has('food') && !types.has('market')) issues.push({ severity: 'warning', code: 'missing_meal', title: 'Chưa có khoảng nghỉ ăn uống', message: 'Ngày này chưa dành thời gian rõ ràng cho bữa ăn.', recommendation: 'Nên thêm một điểm ăn hoặc khoảng nghỉ để chuyến đi không bị mệt.' });
    if (activities.length > 8) issues.push({ severity: 'error', code: 'overloaded_day', title: 'Một ngày có quá nhiều hoạt động', fixable: true, message: `${activities.length} hoạt động trong một ngày sẽ khiến bạn liên tục di chuyển và khó tận hưởng từng điểm.`, recommendation: 'Nên giữ tối đa 6–8 hoạt động, tùy nhịp độ mong muốn.' });
    else if (activities.length > 7) issues.push({ severity: 'warning', code: 'busy_day', title: 'Ngày này khá dày', fixable: true, message: 'Bạn sẽ phải duy trì nhịp đi nhanh trong phần lớn thời gian.', recommendation: 'Có thể bỏ bớt một điểm nếu muốn chuyến đi thư thả.' });
    const lastActivity = activities[activities.length - 1];
    const dayEnd = lastActivity ? minutes(lastActivity.time) + durationMinutes(lastActivity.duration) : 0;
    if (dayEnd > 22 * 60) issues.push({ severity: 'error', code: 'late_finish', title: 'Ngày kết thúc quá muộn', activity: lastActivity.name, activityIndex: activities.length - 1, fixable: true, message: `Hoạt động cuối dự kiến kết thúc khoảng ${timeString(dayEnd)}, dễ làm bạn kiệt sức và ảnh hưởng ngày hôm sau.`, recommendation: 'Nên kết thúc lịch chính trước 22:00 hoặc bỏ bớt một điểm buổi tối.' });
    const errors = issues.filter(issue => issue.severity === 'error').length;
    const warnings = issues.filter(issue => issue.severity === 'warning').length;
    return { day: day.day || dayIndex + 1, score: Math.max(0, 100 - errors * 18 - warnings * 6), issues, total_km: Number(totalKm.toFixed(1)), walking_km: Number(walkingKm.toFixed(1)) };
  });
  const allIssues = days.flatMap((day: any) => day.issues);
  const score = days.length ? Math.round(days.reduce((sum: number, day: any) => sum + day.score, 0) / days.length) : 0;
  return { score, status: score >= 85 ? 'good' : score >= 65 ? 'caution' : 'risk', days, issue_count: allIssues.length, error_count: allIssues.filter((issue: Issue) => issue.severity === 'error').length, assumed_start_date: startDate || baseDate.toISOString().slice(0, 10) };
}

function timeString(total: number) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export function optimizeItinerary(itinerary: any, startDate?: string) {
  const db = getDb();
  const places = db.prepare('SELECT * FROM places ORDER BY verification_status = \'verified\' DESC, popularity DESC').all() as any[];
  const byId = new Map(places.map(place => [place.id, place]));
  const byName = new Map(places.map(place => [place.name, place]));
  const copy = JSON.parse(JSON.stringify(itinerary || {}));
  const baseDate = startDate ? new Date(`${startDate}T12:00:00+07:00`) : new Date();
  const changes: string[] = [];
  const unresolved: string[] = [];

  copy.days = (copy.days || []).map((day: any, dayIndex: number) => {
    const date = new Date(baseDate); date.setDate(baseDate.getDate() + dayIndex);
    const dayKey = bangkokNow(date).day;
    const original = [...(day.activities || [])].sort((a, b) => minutes(a.time) - minutes(b.time));
    while (original.length > 8) {
      const cafeIndexes = original.map((activity: any, index: number) => ({ activity, index })).filter(item => item.activity.type === 'cafe');
      const removeIndex = cafeIndexes.length > 2
        ? cafeIndexes[cafeIndexes.length - 1].index
        : original.map((activity: any, index: number) => ({ activity, index })).reverse().find(item => !['food', 'market'].includes(item.activity.type))?.index;
      if (removeIndex === undefined) break;
      const [removed] = original.splice(removeIndex, 1);
      changes.push(`Ngày ${dayIndex + 1}: bỏ ${removed.name} để lịch không quá tải`);
    }
    const optimized: any[] = [];
    for (let index = 0; index < original.length; index++) {
      let activity = { ...original[index] };
      if (['food', 'cafe', 'market'].includes(activity.type) && durationMinutes(activity.duration) > 60) {
        changes.push(`Ngày ${dayIndex + 1}: điều chỉnh thời gian tại ${activity.name} còn 60 phút`);
        activity.duration = '60 phút';
      }
      const duration = durationMinutes(activity.duration);
      const previous = optimized[optimized.length - 1];
      const km = previous ? distanceKm(previous, activity) : 0;
      const earliest = previous ? minutes(previous.time) + durationMinutes(previous.duration) + (km == null ? 15 : travelMinutes(km)) : minutes(activity.time);
      let proposed = Math.max(minutes(activity.time), earliest);
      let place = byId.get(activity.place_id) || byName.get(activity.name);
      if (place) {
        const schedule = parseOpeningHours(place.opening_hours, place.hours_time);
        const intervals = schedule[dayKey] || [];
        if (Object.values(schedule).some((items: any) => items.length)) {
          const slot = intervals.find(interval => Math.max(proposed, minutes(interval.open)) + duration <= minutes(interval.close));
          if (slot) proposed = Math.max(proposed, minutes(slot.open));
          else {
            const replacement = places.find(candidate => candidate.id !== place.id && candidate.category === place.category && !optimized.some(item => item.place_id === candidate.id) && (parseOpeningHours(candidate.opening_hours, candidate.hours_time)[dayKey] || []).some(interval => Math.max(proposed, minutes(interval.open)) + (Number(candidate.avg_visit_min) || 60) <= minutes(interval.close)));
            if (replacement) {
              const replacementSchedule = parseOpeningHours(replacement.opening_hours, replacement.hours_time)[dayKey];
              const replacementSlot = replacementSchedule.find(interval => Math.max(proposed, minutes(interval.open)) + (Number(replacement.avg_visit_min) || 60) <= minutes(interval.close))!;
              changes.push(`Ngày ${dayIndex + 1}: đổi ${activity.name} thành ${replacement.name} vì giờ mở cửa`);
              activity = { ...activity, name: replacement.name, type: replacement.category, duration: `${replacement.avg_visit_min || 60} phút`, cost: replacement.price || activity.cost, description: replacement.description || '', ai_tip: `Được thay tự động vì ${place.name} không mở trong khung giờ phù hợp.`, location: replacement.address || 'Huế', lat: Number(replacement.lat), lng: Number(replacement.lng), place_id: replacement.id };
              place = replacement; proposed = Math.max(proposed, minutes(replacementSlot.open));
            } else unresolved.push(`${activity.name} không có khung giờ hoặc điểm thay thế phù hợp`);
          }
        }
      }
      const nextTime = timeString(proposed);
      if (nextTime !== activity.time) changes.push(`Ngày ${dayIndex + 1}: dời ${activity.name} từ ${activity.time} sang ${nextTime}`);
      activity.time = nextTime;
      optimized.push(activity);
    }
    while (optimized.length > 4) {
      const last = optimized[optimized.length - 1];
      if (minutes(last.time) + durationMinutes(last.duration) <= 22 * 60) break;
      const candidate = optimized.map((activity: any, index: number) => ({ activity, index })).reverse().find(item => !['food', 'market'].includes(item.activity.type));
      if (!candidate) break;
      const [removed] = optimized.splice(candidate.index, 1);
      changes.push(`Ngày ${dayIndex + 1}: bỏ ${removed.name} để kết thúc trước 22:00`);
    }
    return { ...day, activities: optimized, day_tip: changes.length ? 'Lịch đã được cân lại theo thời gian di chuyển và giờ mở cửa.' : day.day_tip };
  });
  const feasibility = validateItinerary(copy, startDate);
  return { itinerary: copy, changes, unresolved, feasibility };
}
