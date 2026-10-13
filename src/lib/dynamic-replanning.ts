import { getHueClock, tripDayIndex, scheduledMinutes } from './travel-clock';
export type ReplanScenario = 'late' | 'rain' | 'hungry' | 'tired' | 'closed';
export type ReplanDecision = { scenario: ReplanScenario | null; dayIndex: number; reason: string; confidence: number; signals: string[] };
type ReplanInput = {
  now?: Date; startDate?: string | null; duration?: number; status?: string; startedAt?: string | null;
  weather?: { condition?: string; temp?: number | null } | null;
  weatherOnly?: boolean;
  activities?: Array<{ time?: string; type?: string; name?: string; indoor?: boolean; weatherDependent?: boolean }>;
  dayIndex?: number; completedActivityIndexes?: number[]; fatigue?: string;
};
export function detectReplanNeed(input: ReplanInput = {}): ReplanDecision {
  const now = input.now || new Date();
  const today = tripDayIndex(input.startDate, now);
  const dayIndex = input.dayIndex ?? (today !== null && today >= 0 ? today : 0);
  const signals: string[] = [];
  const none = (reason: string): ReplanDecision => ({ scenario: null, dayIndex, reason, confidence: 0, signals });
  if (today === null) return none('Chưa có ngày khởi hành để kiểm tra lịch hôm nay. Bạn vẫn có thể chọn một tình huống và xem phương án thủ công.');
  if (today < 0) return none('Chuyến đi chưa tới ngày khởi hành. Thời tiết và giờ hiện tại chưa phải tình trạng của chuyến này.');
  if (today >= (input.duration || 1) || input.status === 'past') return none('Những ngày của chuyến đi đã kết thúc. HueViVu giữ lại lịch để bạn xem lại.');
  if (input.status !== 'active' || !input.startedAt || !Number.isFinite(Date.parse(input.startedAt)) || Date.parse(input.startedAt) > now.getTime()) return none('Bạn chưa bắt đầu chuyến đi. Chọn “Bắt đầu chuyến đi” khi thực sự khởi hành, rồi kiểm tra lại.');
  if (dayIndex !== today) return none(`Hôm nay là ngày ${today + 1} của chuyến đi. Bạn đang xem ngày ${dayIndex + 1}; hãy chuyển về ngày hôm nay để kiểm tra.`);
  const activities = input.activities || [];
  const completed = new Set(input.completedActivityIndexes || []);
  const pending = activities.map((activity, index) => ({ activity, index, time: scheduledMinutes(activity.time) })).filter(item => !completed.has(item.index));
  if (!pending.length) return none('Bạn đã đánh dấu hoàn thành các hoạt động của ngày này. Không cần đổi phần lịch đã đi.');
  const nowMin = getHueClock(now).minutes;
  if (nowMin + 55 > 22 * 60) return none('Đã gần cuối ngày. Nên nghỉ và xem lại lịch ngày mai; HueViVu không thêm điểm mới có thể kéo lịch quá 22:00.');
  const outdoorPending = pending.some(item => item.time !== null && item.time >= nowMin - 90 && !item.activity.indoor && (item.activity.weatherDependent || ['heritage', 'temple', 'nature', 'craft_village'].includes(item.activity.type || '')));
  if (!input.weatherOnly && input.fatigue === 'tired') {
    signals.push('fatigue:tired');
    return { scenario: 'tired', dayIndex, reason: 'Bạn cho biết đang mệt. HueViVu có thể giảm các điểm chưa đi và thêm thời gian nghỉ; những điểm đã hoàn thành được giữ nguyên.', confidence: 1, signals };
  }
  if (input.weather?.condition === 'rainy' && outdoorPending) {
    signals.push('rain');
    return { scenario: 'rain', dayIndex, reason: 'Có mưa và phần lịch chưa đi còn điểm ngoài trời. Xem phương án thay điểm để bớt phải di chuyển dưới mưa.', confidence: 0.94, signals };
  }
  const next = pending.find(item => item.time !== null);
  if (!input.weatherOnly && next?.time !== null && next?.time !== undefined && next.time < nowMin - 15 && next.time > nowMin - 90) {
    signals.push('late');
    return { scenario: 'late', dayIndex, reason: 'Điểm tiếp theo chưa được đánh dấu hoàn thành và đã qua giờ dự kiến hơn 15 phút. Nếu bạn đang trễ, hãy xem phương án lùi phần lịch còn lại.', confidence: 0.75, signals };
  }
  if (typeof input.weather?.temp === 'number' && input.weather.temp >= 36 && outdoorPending) {
    signals.push('heat');
    return { scenario: 'tired', dayIndex, reason: 'Trời nóng và lịch còn điểm ngoài trời. HueViVu đề xuất thêm thời gian nghỉ để bạn bớt phải đi dưới nắng.', confidence: 0.76, signals };
  }
  return none('Chưa thấy lý do rõ ràng để đổi phần lịch chưa đi. Bạn có thể chọn tình huống nếu thực tế chuyến đi đã thay đổi.');
}
