export const dynamic = 'force-dynamic';

function mapCondition(desc: string): { vi: string; emoji: string; key: string } {
  const d = desc.toLowerCase();
  if (d.includes('thunder') || d.includes('storm')) return { vi: 'Giông bão', emoji: '⛈️', key: 'rainy' };
  if (d.includes('heavy rain') || d.includes('torrential')) return { vi: 'Mưa to', emoji: '🌧️', key: 'rainy' };
  if (d.includes('rain') || d.includes('shower') || d.includes('drizzle') || d.includes('patchy rain')) return { vi: 'Có mưa', emoji: '🌦️', key: 'rainy' };
  if (d.includes('overcast')) return { vi: 'U ám', emoji: '☁️', key: 'cloudy' };
  if (d.includes('cloud') || d.includes('mist') || d.includes('fog') || d.includes('haze')) return { vi: 'Nhiều mây', emoji: '🌤️', key: 'cloudy' };
  if (d.includes('sunny') || d.includes('clear') || d.includes('bright')) return { vi: 'Nắng đẹp', emoji: '☀️', key: 'sunny' };
  return { vi: 'Nắng đẹp', emoji: '☀️', key: 'sunny' };
}

const DAY_SHORT = ['CN','Th2','Th3','Th4','Th5','Th6','Th7'];

export async function GET() {
  try {
    const res = await fetch('https://wttr.in/Hue,Vietnam?format=j1', {
      headers: { 'User-Agent': 'HueViVu/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`wttr ${res.status}`);
    const data = await res.json();
    const cur = data.current_condition?.[0];
    if (!cur) throw new Error('no cur');

    const temp = parseInt(cur.temp_C, 10);
    const uvIndex = parseInt(cur.uvIndex || '0', 10);
    const descEn: string = cur.weatherDesc?.[0]?.value || 'Clear';
    const cond = mapCondition(descEn);

    const today = new Date();
    const forecastDays = (data.weather || []).slice(0, 5).map((day: any, di: number) => {
      const date = new Date(today);
      date.setDate(today.getDate() + di);
      const dayDesc: string = day.hourly?.find((h: any) => h.time === '1200')?.weatherDesc?.[0]?.value
        || day.hourly?.[0]?.weatherDesc?.[0]?.value || '';
      const c = mapCondition(dayDesc);
      return {
        day: di === 0 ? 'Hôm nay' : di === 1 ? 'Ngày mai' : DAY_SHORT[date.getDay()],
        temp_max: parseInt(day.maxtempC, 10),
        temp_min: parseInt(day.mintempC, 10),
        condition: c.key, emoji: c.emoji, condition_vi: c.vi,
      };
    });

    let advisory = '';
    let advisory_type: 'good' | 'caution' | 'warn' = 'good';
    if (cond.key === 'rainy') {
      advisory_type = 'warn';
      advisory = '🌧️ Hôm nay có mưa — mang ô, ưu tiên điểm trong nhà. Tránh lăng tẩm ngoài trời 10-14h.';
    } else if (temp >= 36) {
      advisory_type = 'caution';
      advisory = '🥵 Nắng nóng >36°C — tham quan 7-10h và sau 16h, nghỉ trưa tại quán cà phê.';
    } else if (temp <= 20) {
      advisory_type = 'caution';
      advisory = '🧥 Trời se lạnh — mang áo khoác, đặc biệt buổi sáng và tối.';
    } else if (uvIndex >= 8) {
      advisory_type = 'caution';
      advisory = '🧴 UV cao — kem chống nắng SPF 50+, nón rộng vành khi đi bộ.';
    } else {
      advisory = '✅ Thời tiết lý tưởng để khám phá Huế hôm nay!';
    }

    return Response.json({
      city: 'Huế', temp,
      feels_like: parseInt(cur.FeelsLikeC, 10),
      humidity: parseInt(cur.humidity, 10),
      condition: cond.key, condition_vi: cond.vi, condition_emoji: cond.emoji,
      uv_index: uvIndex, wind_kmh: parseInt(cur.windspeedKmph, 10),
      advisory, advisory_type,
      forecast: forecastDays,
      updated_at: new Date().toISOString(),
    });
  } catch {
    return Response.json({
      city: 'Huế', temp: null, feels_like: null, humidity: null,
      condition: 'unknown', condition_vi: 'Chưa cập nhật thời tiết', condition_emoji: '🌥️',
      uv_index: null, wind_kmh: null, forecast: [],
      advisory: 'Chưa lấy được thời tiết hiện tại. Kiểm tra dự báo địa phương trước khi đi và mang theo ô.',
      advisory_type: 'caution', updated_at: null, _fallback: true,
    });
  }
}
