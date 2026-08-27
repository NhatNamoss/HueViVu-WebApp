import React from 'react';

export type WeatherWidgetProps = {
  weather: {
    temp: number;
    condition_vi: string;
    condition_emoji: string;
    humidity?: number;
    wind_kmh?: number;
  } | null;
  style?: React.CSSProperties;
};

export default function WeatherWidget({ weather, style }: WeatherWidgetProps) {
  if (!weather) return null;

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(26,29,59,0.06)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.5rem' }}>{weather.condition_emoji}</span>
        <div>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--navy)' }}>{weather.temp}°C </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)' }}>{weather.condition_vi}</span>
        </div>
      </div>
      {(weather.humidity !== undefined && weather.wind_kmh !== undefined) && (
        <div style={{ display: 'flex', gap: 14, fontSize: '0.75rem', color: 'var(--navy-muted)' }}>
          <span>💧 {weather.humidity}%</span>
          <span>🌬️ {weather.wind_kmh} km/h</span>
        </div>
      )}
    </div>
  );
}
