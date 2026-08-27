export async function GET() {
  const month = new Date().getMonth();
  const isRainy = month >= 9 || month <= 1;
  const temp = isRainy ? 22 : 30;
  const conditions = ['sunny', 'cloudy', 'rainy'];
  const conditionIdx = isRainy ? (Math.random() > 0.4 ? 2 : 1) : (Math.random() > 0.3 ? 0 : 1);
  const condition = conditions[conditionIdx];
  const conditionVi: Record<string, string> = { sunny: 'Nắng đẹp', cloudy: 'Nhiều mây', rainy: 'Có mưa' };
  const conditionEmoji: Record<string, string> = { sunny: '☀️', cloudy: '🌤️', rainy: '🌧️' };

  return Response.json({
    city: 'Huế',
    temp,
    feels_like: temp - 2,
    humidity: isRainy ? 88 : 65,
    condition,
    condition_vi: conditionVi[condition],
    condition_emoji: conditionEmoji[condition],
    uv_index: isRainy ? 3 : 8,
    wind_kmh: isRainy ? 18 : 10,
    forecast: Array.from({ length: 5 }, (_, i) => ({
      day: ['Hôm nay', 'Ngày mai', 'Thứ 4', 'Thứ 5', 'Thứ 6'][i],
      temp_max: temp + Math.floor(Math.random() * 4) - 2,
      temp_min: temp - 5 + Math.floor(Math.random() * 3),
      condition: Math.random() > (isRainy ? 0.35 : 0.8) ? 'rainy' : (Math.random() > 0.5 ? 'sunny' : 'cloudy'),
    })),
    updated_at: new Date().toISOString(),
  });
}
