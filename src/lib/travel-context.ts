import { getHueClock, tripDayIndex } from './travel-clock';

export type TravelLocation = { lat: number; lng: number; accuracy?: number };
export type TravelWeather = { condition?: 'sunny' | 'cloudy' | 'rainy' | 'unknown' | string; temp?: number | null; uvIndex?: number | null };
export type TravelTripState = { id?: string; status?: string; startDate?: string; duration?: number; startedAt?: string | null; fatigue?: string | null; currentActivity?: string; nextActivity?: string; nextActivityTime?: string; dayCompleted?: boolean };
export type TravelPreferences = { companion?: string; pacing?: 'relaxed' | 'balanced' | 'packed' | string; styles?: string[]; indoorPreferred?: boolean };
export type TravelContextInput = { now?: Date; location?: TravelLocation | null; weather?: TravelWeather | null; trip?: TravelTripState | null; preferences?: TravelPreferences | null };
export type TravelAction = { id: string; priority: number; eyebrow: string; headline: string; sub: string; mood: string; cta: string; ctaHref: string; reason: string; bg?: string };
export type TravelContext = { hour: number; isDaytime: boolean; weatherRisk: 'none' | 'rain' | 'heat' | 'cold'; tripActive: boolean; locationAvailable: boolean; nextAction: TravelAction; signals: string[] };

function getWeatherRisk(weather?: TravelWeather | null): TravelContext['weatherRisk'] {
  if (!weather) return 'none';
  if (weather.condition === 'rainy') return 'rain';
  if (typeof weather.temp === 'number' && weather.temp >= 36) return 'heat';
  if (typeof weather.temp === 'number' && weather.temp <= 20) return 'cold';
  return 'none';
}

export function isTravelTripActive(trip?: TravelTripState | null, now = new Date()): boolean {
  const dayIndex = tripDayIndex(trip?.startDate, now);
  return Boolean(trip?.id && trip.status === 'active' && trip.startedAt && Number.isFinite(Date.parse(trip.startedAt)) && Date.parse(trip.startedAt) <= now.getTime() && dayIndex !== null && dayIndex >= 0 && dayIndex < (trip.duration || 1));
}

export function buildTravelContext(input: TravelContextInput = {}): TravelContext {
  const now = input.now || new Date();
  const hour = getHueClock(now).hour;
  const risk = getWeatherRisk(input.weather);
  const tripActive = isTravelTripActive(input.trip, now);
  const locationAvailable = Boolean(input.location);
  const signals: string[] = ['time:' + hour, 'weather:' + risk];
  if (tripActive) signals.push('trip:active');
  if (locationAvailable) signals.push('location:available');
  if (input.preferences?.pacing) signals.push('pacing:' + input.preferences.pacing);

  const actions: TravelAction[] = [];
  if (tripActive && input.trip?.fatigue === 'tired') {
    const endOfDay = getHueClock(now).minutes + 55 > 22 * 60;
    actions.push({ id: 'take-a-break', priority: endOfDay ? 120 : 98, eyebrow: 'Bạn vừa báo đang mệt', headline: endOfDay ? 'Về nghỉ trước đã' : 'Nghỉ trước khi đi tiếp', sub: endOfDay ? 'Đã gần cuối ngày. Xem kế hoạch ngày mai khi bạn sẵn sàng.' : 'Mở hành trình để xem các điểm còn lại và chọn một phương án nhẹ hơn nếu cần.', mood: '😮‍💨', cta: endOfDay ? 'Xem hành trình' : 'Mở hành trình', ctaHref: '/trips/' + input.trip.id, reason: endOfDay ? 'Bạn đã ghi nhận mình đang mệt và ngày sắp kết thúc; thêm điểm mới lúc này dễ kéo lịch quá 22:00.' : 'Bạn đã ghi nhận mình đang mệt; nghỉ ngơi là hành động hữu ích trước khi thêm điểm mới.' });
  }
  if (tripActive && input.trip?.dayCompleted) actions.push({ id: 'day-complete', priority: 96, eyebrow: 'Các điểm hôm nay đã hoàn thành', headline: 'Hôm nay đã đủ trải nghiệm', sub: 'Nghỉ ngơi hoặc xem kế hoạch những ngày còn lại.', mood: '✅', cta: 'Xem hành trình', ctaHref: '/trips/' + input.trip.id, reason: 'Tiến độ đã ghi nhận hoàn thành các điểm hôm nay; HueViVu không nhắc lại những điểm đã đi.' });
  if (tripActive && !input.trip?.dayCompleted) actions.push({ id: 'continue-trip', priority: 85, eyebrow: 'Hành trình đang diễn ra', headline: input.trip?.nextActivity ? 'Tiếp theo: ' + input.trip.nextActivity : 'Tiếp tục hành trình của bạn', sub: input.trip?.nextActivityTime ? 'Điểm tiếp theo dự kiến lúc ' + input.trip.nextActivityTime + '. HueViVu sẽ ưu tiên lịch trình hiện tại.' : 'HueViVu ưu tiên giúp bạn hoàn thành lịch trình đang đi.', mood: '🧭', cta: 'Mở hành trình', ctaHref: input.trip?.id ? '/trips/' + input.trip.id : '/trips', reason: 'Bạn đang có một hành trình trong những ngày đang đi, nên hành động hữu ích nhất là hỗ trợ chuyến đi hiện tại.' });
  if (risk === 'rain') actions.push({ id: 'rain-indoor', priority: 95, eyebrow: 'Trời đang mưa', headline: 'Đổi sang một trải nghiệm trong nhà?', sub: 'Ưu tiên bảo tàng, cà phê, ẩm thực và các điểm ít phụ thuộc thời tiết.', mood: '☔', cta: 'Tìm điểm trong nhà', ctaHref: '/explore?indoor=true', reason: 'Mưa làm giảm chất lượng trải nghiệm ngoài trời và tăng rủi ro di chuyển.' });
  if (risk === 'heat') actions.push({ id: 'heat-safe', priority: 94, eyebrow: 'Huế đang khá nóng', headline: 'Né nắng giữa ngày nhé', sub: 'Ưu tiên điểm trong nhà hoặc nghỉ mát; dành di tích ngoài trời cho sáng sớm và sau 16h.', mood: '🥵', cta: 'Tìm nơi tránh nóng', ctaHref: '/explore?indoor=true', reason: 'Nhiệt độ cao làm tăng mệt mỏi và giảm thời gian tham quan ngoài trời.' });
  if (risk === 'cold') actions.push({ id: 'cold-comfort', priority: 80, eyebrow: 'Trời se lạnh', headline: 'Một điểm ấm áp sẽ hợp hơn', sub: 'Ưu tiên cà phê, ẩm thực hoặc không gian trong nhà trước khi tiếp tục khám phá.', mood: '🧥', cta: 'Tìm chỗ ấm', ctaHref: '/explore?indoor=true', reason: 'Thời tiết lạnh làm các hoạt động ngoài trời kém thoải mái hơn.' });
  if (getHueClock(now).minutes + 55 > 22 * 60 || hour < 5) actions.push({ id: 'late-rest', priority: 110, eyebrow: 'Đêm đã muộn', headline: 'Nghỉ ngơi trước đã', sub: 'Đừng cố nhồi thêm điểm tham quan. Ngày mai HueViVu có thể tiếp tục từ lịch trình của bạn.', mood: '🌙', cta: 'Xem hành trình', ctaHref: tripActive && input.trip?.id ? '/trips/' + input.trip.id : '/trips', reason: 'Giờ muộn làm việc thêm một điểm mới kém an toàn và kém hiệu quả.' });
  if (hour >= 5 && hour < 10) actions.push({ id: 'morning', priority: 60, eyebrow: 'Sáng sớm yên bình', headline: 'Bắt đầu ngày thật nhẹ nhàng', sub: 'Đây là khung giờ tốt để đi di tích trước khi đông và nóng hơn.', mood: '🌅', cta: 'Khám phá buổi sáng', ctaHref: '/explore?time=morning', reason: 'Buổi sáng thường phù hợp hơn cho các điểm ngoài trời và di tích.' });
  if (hour >= 10 && hour < 14) actions.push({ id: 'lunch', priority: 55, eyebrow: 'Giữa ngày ở Huế', headline: 'Ăn ngon rồi hãy đi tiếp', sub: 'Một bữa Huế đúng lúc giúp bạn giữ sức cho phần còn lại của hành trình.', mood: '🍜', cta: 'Tìm món Huế', ctaHref: '/explore?cat=food', reason: 'Khung giữa ngày là thời điểm hợp lý để nghỉ và bổ sung năng lượng.' });
  if (hour >= 14 && hour < 18) actions.push({ id: 'afternoon', priority: 55, eyebrow: 'Chiều chậm rãi', headline: 'Chiều nay đi đâu?', sub: 'Cà phê, sông Hương hoặc một điểm văn hóa vừa đủ để không vội.', mood: '🌇', cta: 'Khám phá buổi chiều', ctaHref: '/explore?time=afternoon', reason: 'Buổi chiều phù hợp cho nhịp trải nghiệm chậm hơn và các hoạt động ven sông.' });
  if (hour >= 18 && hour < 22) actions.push({ id: 'evening', priority: 55, eyebrow: 'Đêm Huế bắt đầu', headline: 'Huế về đêm có một vẻ riêng', sub: 'Ẩm thực, sông Hương và những trải nghiệm nhẹ nhàng đang chờ bạn.', mood: '🌙', cta: 'Khám phá đêm Huế', ctaHref: '/explore?time=evening', reason: 'Buổi tối mở ra nhóm trải nghiệm khác với ban ngày.' });
  if (locationAvailable) actions.forEach(action => { if (action.id === 'morning' || action.id === 'afternoon' || action.id === 'evening') action.priority += 5; });
  actions.sort((a, b) => b.priority - a.priority);
  return { hour, isDaytime: hour >= 5 && hour < 19, weatherRisk: risk, tripActive, locationAvailable, nextAction: actions[0] || { id: 'explore', priority: 1, eyebrow: 'Huế đang chờ bạn', headline: 'Hôm nay ở Huế, bạn muốn đi đâu?', sub: 'HueViVu sẽ giúp bạn chọn bước tiếp theo.', mood: '✨', cta: 'Khám phá Huế', ctaHref: '/explore', reason: 'Chưa có tín hiệu ngữ cảnh đủ mạnh; dùng khám phá làm lựa chọn an toàn.' }, signals };
}
