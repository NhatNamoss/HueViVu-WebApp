export const PLACE_CATEGORIES = [
  { value: 'heritage', label: 'Di tích', emoji: '🏛️' },
  { value: 'temple', label: 'Chùa chiền', emoji: '🛕' },
  { value: 'food', label: 'Ẩm thực', emoji: '🍜' },
  { value: 'cafe', label: 'Cà phê', emoji: '☕' },
  { value: 'nature', label: 'Thiên nhiên', emoji: '🌿' },
  { value: 'market', label: 'Chợ', emoji: '🛍️' },
  { value: 'craft_village', label: 'Làng nghề', emoji: '🏘️' },
  { value: 'art', label: 'Nghệ thuật', emoji: '🎨' },
  { value: 'architecture', label: 'Kiến trúc', emoji: '🏗️' },
  { value: 'experience', label: 'Trải nghiệm', emoji: '🎭' },
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number]['value'];

const CATEGORY_ALIASES: Record<string, PlaceCategory> = {
  heritage: 'heritage',
  'heritage (di sản)': 'heritage',
  'di sản': 'heritage',
  temple: 'temple',
  'temple (chùa chiền)': 'temple',
  'chùa': 'temple',
  'chùa chiền': 'temple',
  food: 'food',
  culinary: 'food',
  'culinary (ẩm thực)': 'food',
  'ẩm thực': 'food',
  cafe: 'cafe',
  café: 'cafe',
  'cafe & chill': 'cafe',
  nature: 'nature',
  'nature (thiên nhiên)': 'nature',
  'thiên nhiên': 'nature',
  market: 'market',
  'chợ': 'market',
  craft_village: 'craft_village',
  'làng nghề': 'craft_village',
  art: 'art',
  'nghệ thuật': 'art',
  architecture: 'architecture',
  'kiến trúc': 'architecture',
  experience: 'experience',
  'trải nghiệm': 'experience',
};

export function normalizePlaceCategory(value: unknown): PlaceCategory | null {
  if (typeof value !== 'string') return null;
  return CATEGORY_ALIASES[value.trim().toLowerCase()] || null;
}

export function getCategoryMeta(value: unknown) {
  const normalized = normalizePlaceCategory(value);
  return PLACE_CATEGORIES.find(category => category.value === normalized) || null;
}

export function isFoodCategory(value: unknown) {
  const category = normalizePlaceCategory(value);
  return category === 'food' || category === 'market' || category === 'cafe';
}
