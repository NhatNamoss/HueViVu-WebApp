import { buildTravelContext, type TravelContextInput } from './travel-context';
import { getHueClock } from './travel-clock';
import { evaluatePlaceTrust } from './place-trust';
import { getOpeningStatus, parseOpeningHours } from './opening-hours';

export function companionAction(input: TravelContextInput, places: Record<string, any>[], excludedIds: string[] = []) {
  const context = buildTravelContext(input);
  const now = input.now || new Date();
  if (['take-a-break', 'late-rest', 'continue-trip', 'day-complete'].includes(context.nextAction.id)) return context;
  const indoor = ['rain', 'heat', 'cold'].includes(context.weatherRisk) || input.preferences?.indoorPreferred;
  const category = context.nextAction.id === 'lunch' ? 'food' : null;
  const distance = (p: any) => input.location ? Math.hypot((p.lat - input.location.lat) * 111, (p.lng - input.location.lng) * 106) : 0;
  const candidates = places.filter(p => {
    if (p.publication_status !== 'published' || excludedIds.includes(p.id) || !evaluatePlaceTrust(p, now).operationalFresh || (indoor && p.indoor !== true && p.indoor !== 1) || (category && p.category !== category)) return false;
    const opening = getOpeningStatus(parseOpeningHours(p.opening_hours, p.hours_time), now);
    if (opening.status !== 'open' || !opening.closesAt) return false;
    const current = getHueClock(now).minutes;
    const parts = opening.closesAt.split(':').map(Number);
    let closes = parts[0] * 60 + parts[1]; if (closes <= current) closes += 1440;
    return current + Math.max(15, Number(p.avg_visit_min) || 60) + Math.ceil(distance(p) * 15) <= closes;
  });
  candidates.sort((a, b) => {
    const score = (p: any) => (input.preferences?.styles?.includes(p.category) ? 40 : 0) + (input.preferences?.pacing === 'relaxed' && p.avg_visit_min <= 60 ? 5 : 0) - distance(p) * 5;
    return score(b) - score(a) || Number(b.popularity || 0) - Number(a.popularity || 0) || String(a.id).localeCompare(String(b.id));
  });
  const selected = candidates[0];
  if (selected) context.nextAction = { ...context.nextAction, headline: selected.name, sub: [indoor ? 'Có không gian trong nhà' : null, input.preferences?.styles?.includes(selected.category) ? 'Hợp sở thích của bạn' : null, input.location ? `Cách bạn khoảng ${distance(selected).toFixed(1)} km` : null].filter(Boolean).join(' · ') || 'Một lựa chọn phù hợp lúc này.', cta: 'Xem địa điểm', ctaHref: '/places/' + selected.id, reason: `Dựa trên giờ đã nhập còn mới${indoor ? ', không gian trong nhà' : ''}${input.preferences?.styles?.includes(selected.category) ? ', sở thích đã lưu' : ''}${input.location ? ' và khoảng cách ước tính' : ''}. Xác nhận thay đổi trong ngày với địa điểm trước khi đi.` };
  else context.nextAction.reason += ' Chưa có điểm đủ dữ liệu xác minh còn mới và phù hợp lúc này; hãy xem danh sách và kiểm tra thông tin trước khi chọn.';
  return context;
}
