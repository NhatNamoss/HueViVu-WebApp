import { getHueClock, tripDayIndex } from './travel-clock';
import { isWeatherUsable, type HueWeather } from './hue-weather';
import { activityKeys, getDayProgress, type TripState } from './trip-state';

export type WeatherImpactTrip = {
  id: string; start_date?: string | null; status: string;
  itinerary: { days: Array<{ activities: Array<{ place_id?: string; name?: string; time?: string; location?: string }> }> };
};

export function weatherImpactScope(trip: WeatherImpactTrip | null, state: TripState | null, dayIndex: number, weather: HueWeather | null, now = new Date()) {
  if (!trip || !state || state.tripId !== String(trip.id) || !isWeatherUsable(weather, now)) return null;
  const risk = weather.condition === 'rainy' ? 'rain' : weather.temp >= 36 ? 'heat' : null;
  const clock = getHueClock(now);
  if (!risk || trip.status !== 'active' || !state.startedAt || !Number.isFinite(Date.parse(state.startedAt)) || Date.parse(state.startedAt) > now.getTime() || tripDayIndex(trip.start_date, now) !== dayIndex || clock.minutes + 55 > 22 * 60) return null;
  const activities = trip.itinerary.days[dayIndex]?.activities;
  if (!activities?.length) return null;
  const completed = new Set(getDayProgress(state, dayIndex, activities).completedActivityIndexes);
  const pending = activityKeys(activities).filter((_, i) => !completed.has(i));
  if (!pending.length) return null;
  // Provider timestamps and minor temperature changes do not repeat a dismissed invitation.
  return JSON.stringify([trip.id, clock.date, dayIndex, risk, pending]);
}
