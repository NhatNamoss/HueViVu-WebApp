'use client';
import { useEffect, useState } from 'react';
import { isWeatherUsable, unavailableWeather, type HueWeather } from '@/lib/hue-weather';

export function useHueWeather() {
  const [weather, setWeather] = useState<HueWeather | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch('/api/weather', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
        if (!response.ok) throw new Error('Weather unavailable');
        const data = await response.json();
        if (!cancelled) { setWeather(data); setClock(Date.now()); }
      } catch { if (!cancelled) setWeather(unavailableWeather()); }
    };
    refresh();
    const polling = window.setInterval(refresh, 5 * 60_000);
    const ticking = window.setInterval(() => setClock(Date.now()), 60_000);
    window.addEventListener('focus', refresh);
    return () => { cancelled = true; controller.abort(); clearInterval(polling); clearInterval(ticking); window.removeEventListener('focus', refresh); };
  }, [retry]);
  return { weather, clock, usableWeather: isWeatherUsable(weather, new Date(clock)) ? weather : null, refreshWeather: () => setRetry(n => n + 1) };
}
