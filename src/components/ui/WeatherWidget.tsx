'use client';
import React from 'react';
import { isWeatherUsable, weatherFreshness, type HueWeather } from '@/lib/hue-weather';

export type WeatherWidgetProps = { weather: HueWeather | null; style?: React.CSSProperties; onRetry?: () => void; compact?: boolean };
const formatTime = (time: string | null) => time && Number.isFinite(Date.parse(time))
  ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(time)) : 'Chưa rõ';

export default function WeatherWidget({ weather, style, onRetry, compact = false }: WeatherWidgetProps) {
  const usable = isWeatherUsable(weather);
  const status = !weather ? 'Đang tải thời tiết…' : weather.freshness === 'unavailable' ? 'Chưa lấy được thời tiết' : weatherFreshness(weather.data_at) === 'stale' ? 'Dữ liệu đã quá 60 phút' : !usable ? 'Chưa xác định được độ mới hoặc điều kiện' : weather.condition_vi;
  return (
    <section className={compact ? 'trip-weather-compact' : undefined} aria-label="Thời tiết thành phố Huế" style={{ background: 'var(--card-bg)', border: '1px solid rgba(26,29,59,0.06)', borderRadius: 'var(--radius-md)', padding: compact ? '8px 12px' : '12px 16px', ...style }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ fontSize: '.8125rem', color: 'var(--navy-muted)' }}>
          <strong style={{ color: 'var(--navy)' }}>Thành phố Huế</strong>{' · '}
          <span>{usable ? `${weather.condition_emoji} ${weather.temp}°C · ` : ''}{status}</span>
        </div>
        {weather && !usable && onRetry && <button className="mood-chip" onClick={onRetry}>Thử lại</button>}
      </div>
      {weather && <details style={{ marginTop: compact ? 0 : 6, fontSize: '.75rem', lineHeight: compact ? 1.45 : 1.65, color: 'var(--navy-muted)' }}>
        <summary style={{ cursor: 'pointer', padding: compact ? (usable ? '2px 0' : '12px 0') : '4px 0' }}>Nguồn và thời điểm dữ liệu</summary>
        <p style={{ margin: '4px 0' }}>Thời điểm dữ liệu: {formatTime(weather.data_at)} (giờ Huế).<br />Lần tải gần nhất: {formatTime(weather.fetched_at)} (giờ Huế).</p>
        {usable && <p style={{ margin: '4px 0' }}>{weather.humidity !== null ? `Độ ẩm: ${weather.humidity}%` : ''}{weather.humidity !== null && weather.wind_kmh !== null ? ' · ' : ''}{weather.wind_kmh !== null ? `Gió: ${weather.wind_kmh} km/h` : ''}</p>}
        <p style={{ margin: '4px 0' }}>Nguồn: <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo</a>. Ước tính từ mô hình thời tiết cho khu vực trung tâm thành phố Huế; điều kiện tại từng điểm đến có thể khác.</p>
        <p style={{ margin: '4px 0' }}>{usable ? 'Dữ liệu trong vòng 60 phút được dùng cho gợi ý. Giờ tải không phải thời điểm dữ liệu.' : 'Chưa dùng dữ liệu này để gợi ý hoặc đổi lịch. Kiểm tra dự báo địa phương trước khi đi.'}</p>
      </details>}
    </section>
  );
}
