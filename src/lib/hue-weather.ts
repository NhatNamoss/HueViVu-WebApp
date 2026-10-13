import { getHueClock } from './travel-clock';

export const HUE_WEATHER_LOCATION = { name: 'Thành phố Huế', latitude: 16.4637, longitude: 107.5909, timezone: 'Asia/Ho_Chi_Minh' };
export const WEATHER_MAX_AGE_MS = 60 * 60_000;
export const HUE_WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=16.4637&longitude=107.5909&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FHo_Chi_Minh&forecast_days=5';
export type HueWeather = {
  city: string; location: typeof HUE_WEATHER_LOCATION; source: { name: string; url: string; kind: string };
  data_at: string | null; fetched_at: string; updated_at: string | null;
  freshness: 'fresh' | 'stale' | 'unknown' | 'unavailable'; _fallback: boolean;
  temp: number | null; feels_like: number | null; humidity: number | null; wind_kmh: number | null;
  condition: string; condition_vi: string; condition_emoji: string;
  advisory: string; advisory_type: 'good' | 'caution' | 'warn';
  forecast: Array<{ date: string; day: string; temp_max: number; temp_min: number; emoji: string; condition_vi: string; condition: string }>;
};
export function weatherFreshness(dataAt: string | null | undefined, now = new Date()): 'fresh' | 'stale' | 'unknown' {
  const time = dataAt ? Date.parse(dataAt) : NaN;
  if (!Number.isFinite(time) || time > now.getTime() + 5 * 60_000) return 'unknown';
  return now.getTime() - time <= WEATHER_MAX_AGE_MS ? 'fresh' : 'stale';
}
export function isWeatherUsable(weather: HueWeather | null | undefined, now = new Date()): weather is HueWeather & { temp: number } {
  return !!weather && !weather._fallback && weather.freshness === 'fresh' && weatherFreshness(weather.data_at, now) === 'fresh' && typeof weather.temp === 'number' && Number.isFinite(weather.temp) && weather.condition !== 'unknown';
}
function condition(code: unknown, isDay = true) {
  if (code === 0) return { key: 'sunny', vi: isDay ? 'Trời quang' : 'Đêm quang', emoji: isDay ? '☀️' : '🌙' };
  if ([1, 2, 3].includes(code as number)) return { key: 'cloudy', vi: 'Có mây', emoji: '☁️' };
  if ([45, 48].includes(code as number)) return { key: 'cloudy', vi: 'Sương mù', emoji: '🌫️' };
  if ([95, 96, 99].includes(code as number)) return { key: 'rainy', vi: 'Giông bão', emoji: '⛈️' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code as number)) return { key: 'rainy', vi: 'Có mưa', emoji: '🌧️' };
  if ([71, 73, 75, 77, 85, 86].includes(code as number)) return { key: 'snowy', vi: 'Có tuyết', emoji: '🌨️' };
  return { key: 'unknown', vi: 'Chưa rõ điều kiện', emoji: '🌥️' };
}
function value(raw: unknown, min: number, max: number): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= min && raw <= max ? raw : null;
}
function dataTime(raw: unknown): string | null {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(raw)) return null;
  const date = new Date(raw + ':00+07:00');
  if (!Number.isFinite(date.getTime()) || getHueClock(date).date + 'T' + getHueClock(date).time !== raw) return null;
  return date.toISOString();
}
export function unavailableWeather(now = new Date()): HueWeather {
  return {
    city: 'Huế', location: HUE_WEATHER_LOCATION,
    source: { name: 'Open-Meteo', url: 'https://open-meteo.com/en/docs', kind: 'model' },
    data_at: null, fetched_at: now.toISOString(), updated_at: null, freshness: 'unavailable', _fallback: true,
    temp: null, feels_like: null, humidity: null, wind_kmh: null,
    condition: 'unknown', condition_vi: 'Chưa cập nhật thời tiết', condition_emoji: '🌥️',
    advisory: 'Chưa lấy được thời tiết thành phố Huế. Kiểm tra dự báo địa phương trước khi đi.', advisory_type: 'caution', forecast: [],
  };
}
export function normalizeHueWeather(data: any, now = new Date()): HueWeather {
  const result = unavailableWeather(now);
  // Reject another area or timezone instead of relabeling its forecast as Huế.
  if (data?.timezone !== HUE_WEATHER_LOCATION.timezone || data?.utc_offset_seconds !== 25200 || value(data?.latitude, 16.2, 16.7) === null || value(data?.longitude, 107.3, 107.9) === null) return result;
  const current = data?.current, temp = value(current?.temperature_2m, -50, 60);
  if (temp === null) return result;
  const c = condition(current?.weather_code, current?.is_day !== 0), dataAt = dataTime(current?.time);
  const freshness = weatherFreshness(dataAt, now), usable = freshness === 'fresh' && c.key !== 'unknown';
  const advisory = !usable
    ? (freshness === 'stale' ? 'Dữ liệu thời tiết đã quá 60 phút. Chưa dùng để gợi ý hoặc đổi lịch.' : 'Chưa xác định được độ mới hoặc điều kiện thời tiết. Chưa dùng để gợi ý hoặc đổi lịch.')
    : c.key === 'rainy' ? 'Có mưa tại thành phố Huế — mang ô và cân nhắc điểm trong nhà.'
    : temp >= 36 ? 'Nắng nóng — hạn chế đi bộ ngoài trời và nghỉ ở nơi mát.'
    : temp <= 20 ? 'Trời se lạnh — mang áo khoác khi ra ngoài.'
    : 'Kiểm tra dự báo và điều kiện tại điểm đến trước khi đi.';
  const today = getHueClock(now).date, tomorrow = getHueClock(new Date(Date.parse(today + 'T00:00:00+07:00') + 86400000)).date;
  const forecast: HueWeather['forecast'] = [];
  if (usable && Array.isArray(data.daily?.time)) {
    data.daily.time.slice(0, 5).forEach((date: unknown, i: number) => {
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !dataTime(date + 'T12:00') || date < today) return;
      const max = value(data.daily.temperature_2m_max?.[i], -50, 60), min = value(data.daily.temperature_2m_min?.[i], -50, 60), daily = condition(data.daily.weather_code?.[i]);
      if (max === null || min === null || min > max || daily.key === 'unknown') return;
      forecast.push({ date, day: date === today ? 'Hôm nay' : date === tomorrow ? 'Ngày mai' : new Intl.DateTimeFormat('vi-VN', { weekday: 'short', timeZone: HUE_WEATHER_LOCATION.timezone }).format(new Date(date + 'T12:00:00+07:00')), temp_max: max, temp_min: min, emoji: daily.emoji, condition_vi: daily.vi, condition: daily.key });
    });
  }
  return { ...result, temp, feels_like: value(current.apparent_temperature, -70, 80), humidity: value(current.relative_humidity_2m, 0, 100), wind_kmh: value(current.wind_speed_10m, 0, 500), data_at: dataAt, updated_at: dataAt, freshness, _fallback: !usable, condition: c.key, condition_vi: c.vi, condition_emoji: c.emoji, advisory, advisory_type: !usable || temp >= 36 || temp <= 20 ? 'caution' : c.key === 'rainy' ? 'warn' : 'good', forecast };
}
export async function fetchHueWeather(): Promise<HueWeather> {
  try {
    const response = await fetch(HUE_WEATHER_URL, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Weather provider unavailable');
    return normalizeHueWeather(await response.json());
  } catch { return unavailableWeather(); }
}
