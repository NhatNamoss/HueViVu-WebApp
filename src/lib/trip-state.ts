import { getHueClock } from './travel-clock';

export type TripFatigue = 'fresh' | 'okay' | 'tired';
export type TripTravelMode = 'walking' | 'bike' | 'car' | 'taxi' | 'unknown';

export type TripState = {
  tripId: string;
  dayIndex: number;
  currentActivityIndex: number | null;
  completedActivityIndexes: number[];
  visitedPlaceIds: string[];
  lastLocation: { lat: number; lng: number; accuracy?: number } | null;
  fatigue: TripFatigue;
  travelMode: TripTravelMode;
  lastWeather: { condition?: string; temp?: number | null } | null;
  startedAt: string | null;
  updatedAt: string;
  dayProgress: Record<string, { completedKeys: string[]; currentKey: string | null }>;
};

export type TripStatePatch = Partial<Omit<TripState, 'tripId' | 'updatedAt' | 'dayProgress'>>;

type ProgressActivity = { place_id?: string; name?: string; time?: string; location?: string };
export function activityKeys(activities: ProgressActivity[]): string[] {
  const occurrences = new Map<string, number>();
  return activities.map(activity => {
    const key = JSON.stringify([activity.place_id || '', activity.name || '', activity.time || '', activity.location || '']);
    const occurrence = occurrences.get(key) || 0;
    occurrences.set(key, occurrence + 1);
    return key + ':' + occurrence;
  });
}
export function getDayProgress(state: TripState, dayIndex: number, activities: ProgressActivity[]) {
  const progress = state.dayProgress[String(dayIndex)];
  if (!progress) return {
    completedActivityIndexes: state.dayIndex === dayIndex ? state.completedActivityIndexes.filter(index => index < activities.length) : [],
    currentActivityIndex: state.dayIndex === dayIndex && state.currentActivityIndex !== null && state.currentActivityIndex < activities.length ? state.currentActivityIndex : null,
  };
  const keys = activityKeys(activities);
  const current = keys.indexOf(progress.currentKey || '');
  return { completedActivityIndexes: keys.flatMap((key, i) => progress.completedKeys.includes(key) ? [i] : []), currentActivityIndex: current < 0 ? null : current };
}
export function recordDayProgress(state: TripState, activities: ProgressActivity[]) {
  const keys = activityKeys(activities);
  return { ...state.dayProgress, [String(state.dayIndex)]: {
    completedKeys: state.completedActivityIndexes.map(index => keys[index]).filter(Boolean),
    currentKey: state.currentActivityIndex === null ? null : keys[state.currentActivityIndex] || null,
  } };
}

function parseJsonArray(value: unknown): string[] | number[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeTripState(row: any, tripId: string, days: Array<{ activities: ProgressActivity[] }> = []): TripState {
  const completed = parseJsonArray(row?.completed_activity_indexes).filter(
    (value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0,
  );
  const visited = parseJsonArray(row?.visited_place_ids).filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );

  const dayProgress: TripState['dayProgress'] = {};
  try {
    const parsed = JSON.parse(row?.day_progress || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [day, value] of Object.entries(parsed)) {
        const entry = value as { completedKeys?: unknown; currentKey?: unknown };
        if (entry && Array.isArray(entry.completedKeys) && entry.completedKeys.every(key => typeof key === 'string')) {
          dayProgress[day] = { completedKeys: entry.completedKeys, currentKey: typeof entry.currentKey === 'string' ? entry.currentKey : null };
        }
      }
    }
  } catch { /* Legacy records remain readable. */ }
  const state: TripState = {
    tripId,
    dayIndex: Number.isInteger(row?.day_index) && row.day_index >= 0 ? row.day_index : 0,
    currentActivityIndex: Number.isInteger(row?.current_activity_index) && row.current_activity_index >= 0 ? row.current_activity_index : null,
    completedActivityIndexes: completed,
    visitedPlaceIds: visited,
    lastLocation:
      typeof row?.last_lat === 'number' && typeof row?.last_lng === 'number'
        ? {
            lat: row.last_lat,
            lng: row.last_lng,
            ...(typeof row.last_location_accuracy === 'number'
              ? { accuracy: row.last_location_accuracy }
              : {}),
          }
        : null,
    fatigue: row?.fatigue === 'tired' || row?.fatigue === 'okay' ? row.fatigue : 'fresh',
    travelMode: ['walking', 'bike', 'car', 'taxi'].includes(row?.travel_mode)
      ? row.travel_mode
      : 'unknown',
    lastWeather:
      typeof row?.last_weather === 'string'
        ? (() => {
            try {
              const value = JSON.parse(row.last_weather);
              return value && typeof value === 'object' ? value : null;
            } catch {
              return null;
            }
          })()
        : null,
    startedAt: typeof row?.started_at === 'string' ? row.started_at : null,
    updatedAt: typeof row?.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
    dayProgress,
  };
  if (days.length && state.dayIndex >= days.length) state.dayIndex = 0;
  if (days[state.dayIndex]) {
    const activities = days[state.dayIndex].activities || [];
    Object.assign(state, getDayProgress(state, state.dayIndex, activities));
    state.dayProgress = recordDayProgress(state, activities);
  }
  return state;
}

export function getNextActivityIndex(
  activities: Array<{ time?: string }>,
  now = new Date(),
  completedActivityIndexes: number[] = [],
): number | null {
  const currentMinutes = getHueClock(now).minutes;
  let candidate: number | null = null;
  for (let i = 0; i < activities.length; i += 1) {
    if (completedActivityIndexes.includes(i)) continue;
    const [hour, minute] = String(activities[i]?.time || '').split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;
    if (hour * 60 + minute >= currentMinutes) {
      candidate = i;
      break;
    }
  }
  return candidate;
}
