import { getDayProgress, type TripState } from './trip-state';
import { getHueClock, tripDayIndex } from './travel-clock';

export function progressReply(message: string, trip: any, state: TripState | null, viewedDay?: number, now = new Date()): string | null {
  const text = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  if (!/(tiep theo|di dau tiep|con (diem|cho|hoat dong) nao|da di.*(diem|cho)|tien do)/.test(text)) return null;
  const days = trip.itinerary?.days || [];
  const dayIndex = viewedDay ?? state?.dayIndex ?? 0;
  const activities = days[dayIndex]?.activities || [];
  if (!activities.length) return `Ngày ${dayIndex + 1} chưa có hoạt động để gợi ý bước tiếp theo.`;
  const progress = state ? getDayProgress(state, dayIndex, activities) : { completedActivityIndexes: [], currentActivityIndex: null };
  const remaining = activities.filter((_: any, index: number) => !progress.completedActivityIndexes.includes(index));
  const prefix = state ? `Ngày ${dayIndex + 1}: đã ghi nhận ${progress.completedActivityIndexes.length}/${activities.length} hoạt động hoàn thành.` : `Ngày ${dayIndex + 1} của lịch đang xem; mình không có tiến độ riêng của chủ chuyến đi.`;
  if (!remaining.length) return `${prefix} Bạn đã hoàn thành ngày này. Hãy nghỉ ngơi hoặc xem ngày tiếp theo trong lịch.`;
  const current = progress.currentActivityIndex === null ? null : activities[progress.currentActivityIndex];
  const next = current && !progress.completedActivityIndexes.includes(progress.currentActivityIndex!) ? current : remaining[0];
  const active = state?.startedAt && Date.parse(state.startedAt) <= now.getTime() && trip.status === 'active' && tripDayIndex(trip.start_date, now) === dayIndex;
  const rest = active && state?.fatigue === 'tired' ? 'Bạn đã báo đang mệt: nên nghỉ trước khi đi tiếp. ' : '';
  return `${prefix} ${rest}${current === next ? 'Điểm đang chọn' : 'Điểm chưa hoàn thành đầu tiên'}: ${next.name}${next.time ? `, giờ dự kiến ${next.time}` : ''}${next.location ? `, ${next.location}` : ''}. Đây là thứ tự trong lịch, chưa xác nhận nơi đang mở lúc ${getHueClock(now).time}. Kiểm tra thông tin địa điểm trước khi đi.`;
}
