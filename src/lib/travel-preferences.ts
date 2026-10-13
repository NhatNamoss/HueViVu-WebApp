import { PLACE_CATEGORIES, type PlaceCategory } from './place-taxonomy';

export type TravelPreferences = {
  categories: PlaceCategory[];
  pacing: 'relaxed' | 'balanced' | 'packed';
  indoorPreferred: boolean;
};

export const DEFAULT_PREFERENCES: TravelPreferences = { categories: [], pacing: 'balanced', indoorPreferred: false };

export function plannerDefaults(preferences: TravelPreferences) {
  return { tags: [...preferences.categories], pacing: preferences.pacing, indoorPreferred: preferences.indoorPreferred };
}

export function plannerIndoorBonus(place: { indoor?: unknown }, indoorPreferred: boolean): number {
  return indoorPreferred && (place.indoor === true || place.indoor === 1) ? 120 : 0;
}

export function validatePreferences(value: unknown): TravelPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Sở thích chưa hợp lệ.');
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !['categories', 'pacing', 'indoorPreferred'].includes(key))) throw new Error('Trường sở thích chưa hợp lệ.');
  if (!Array.isArray(input.categories) || input.categories.length > PLACE_CATEGORIES.length || input.categories.some(category => !PLACE_CATEGORIES.some(item => item.value === category))) throw new Error('Danh mục sở thích chưa hợp lệ.');
  if (!['relaxed', 'balanced', 'packed'].includes(input.pacing as string) || typeof input.indoorPreferred !== 'boolean') throw new Error('Nhịp đi hoặc lựa chọn không gian chưa hợp lệ.');
  return { categories: [...new Set(input.categories)] as PlaceCategory[], pacing: input.pacing as TravelPreferences['pacing'], indoorPreferred: input.indoorPreferred };
}

export function readPreferences(raw: unknown): TravelPreferences {
  try { return validatePreferences(typeof raw === 'string' ? JSON.parse(raw) : raw); }
  catch { return { ...DEFAULT_PREFERENCES, categories: [] }; }
}

// Preferences change order only; explicit search filters remain authoritative.
export function rankPlaces<T extends { category: string; indoor?: boolean | number; avg_visit_min?: number; popularity?: number; rating?: number }>(places: T[], preferences: TravelPreferences): (T & { preference_reasons: string[] })[] {
  const scored = places.map((place, index) => {
    let score = 0;
    const reasons: string[] = [];
    if (preferences.categories.includes(place.category as PlaceCategory)) { score += 40; reasons.push('Đúng sở thích bạn chọn'); }
    if (preferences.indoorPreferred && (place.indoor === true || place.indoor === 1)) { score += 20; reasons.push('Có không gian trong nhà'); }
    if (preferences.pacing === 'relaxed' && typeof place.avg_visit_min === 'number' && place.avg_visit_min > 0 && place.avg_visit_min <= 60) { score += 5; reasons.push('Thời lượng tham quan ngắn'); }
    return { place, index, score, reasons };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map(({ place, reasons }) => ({ ...place, preference_reasons: reasons }));
}
