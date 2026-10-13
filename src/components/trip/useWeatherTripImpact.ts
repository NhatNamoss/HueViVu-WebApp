'use client';
import { useEffect, useState } from 'react';
import { weatherImpactScope, type WeatherImpactTrip } from '@/lib/weather-trip-impact';
import { type HueWeather } from '@/lib/hue-weather';
import { type TripState } from '@/lib/trip-state';
import { type ReplanDecision } from '@/lib/dynamic-replanning';

export function useWeatherTripImpact(trip: WeatherImpactTrip | null, state: TripState | null, dayIndex: number, weather: HueWeather | null, token: string | null, busy: boolean, clock: number) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; decision?: ReplanDecision; error?: string } | null>(null);
  const scope = token && !busy ? weatherImpactScope(trip, state, dayIndex, weather, new Date(clock)) : null;
  const key = scope && !dismissed.includes(scope) ? JSON.stringify([scope, weather?.data_at, state?.updatedAt, trip?.itinerary, Math.floor(clock / 300000)]) : '';
  const tripId = trip?.id;
  useEffect(() => {
    if (!key || !tripId || !token) return;
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}/replan`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ dayIndex, trigger: 'weather', assessOnly: true }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
        const data = await response.json();
        if (!response.ok || !data.assessment || !data.decision) throw new Error('Assessment unavailable');
        if (!cancelled) setResult({ key, ...(data.weatherFresh && data.decision.signals.some((signal: string) => signal === 'rain' || signal === 'heat') ? { decision: data.decision } : {}) });
      } catch { if (!cancelled) setResult({ key, error: 'Chưa đối chiếu được thời tiết với lịch. Lịch hiện tại vẫn được giữ.' }); }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [key, tripId, token, dayIndex, retry]);
  return {
    decision: key && result?.key === key ? result.decision : undefined,
    error: key && result?.key === key ? result.error : undefined,
    dismiss: () => { if (scope) setDismissed(previous => [...previous, scope]); },
    retry: () => setRetry(value => value + 1),
  };
}
