import { normalizePlaceCategory } from './place-taxonomy';
import { getOpeningStatus, parseOpeningHours, weeklyHoursSummary } from './opening-hours';

export const PLACE_ARRAY_FIELDS = [
  'highlights', 'tips', 'tags', 'vibe', 'taste_profile',
  'accessibility', 'best_time_of_day', 'specialties',
] as const;

export function parsePlaceRow(row: Record<string, any>): Record<string, any> {
  for (const field of PLACE_ARRAY_FIELDS) {
    const value = row[field];
    if (Array.isArray(value)) continue;
    try { row[field] = JSON.parse(value || '[]'); }
    catch { row[field] = []; }
  }
  row.category = normalizePlaceCategory(row.category) || row.category;
  row.weather_dependent = row.weather_dependent === 1 || row.weather_dependent === '1' || row.weather_dependent === true;
  row.indoor = row.indoor === 1 || row.indoor === '1' || row.indoor === true;
  row.completeness_score = calculatePlaceCompleteness(row);
  row.quality_issues = detectPlaceIssues(row);
  row.opening_hours = parseOpeningHours(row.opening_hours, row.hours_time);
  row.opening_status = getOpeningStatus(row.opening_hours);
  row.publication_status = row.publication_status || 'published';
  row.reverify_after_days = Number(row.reverify_after_days) || 90;
  const verifiedTime = row.verified_at ? new Date(row.verified_at).getTime() : 0;
  row.days_since_verified = verifiedTime ? Math.max(0, Math.floor((Date.now() - verifiedTime) / 86_400_000)) : null;
  row.needs_reverification = row.verification_status === 'verified' && (row.days_since_verified === null || row.days_since_verified >= row.reverify_after_days);
  return row;
}

export function detectPlaceIssues(place: Record<string, any>) {
  const issues: string[] = [];
  const name = String(place.name || '').toLowerCase();
  const category = normalizePlaceCategory(place.category);
  if (/(cà phê|cafe|coffee)/.test(name) && category !== 'cafe') issues.push('Tên giống quán cà phê nhưng danh mục khác');
  if (/(nhà hàng|quán ăn|bún|bánh|cơm|chè)/.test(name) && !['food', 'market'].includes(category || '')) issues.push('Tên giống điểm ẩm thực nhưng danh mục khác');
  if (/chùa/.test(name) && category !== 'temple') issues.push('Tên giống chùa nhưng danh mục khác');
  if (place.verification_status === 'verified' && (!place.source_url || !place.verified_by)) issues.push('Đã xác minh nhưng thiếu nguồn/người kiểm chứng');
  if (place.verified_at && Date.now() - new Date(place.verified_at).getTime() > 1000 * 60 * 60 * 24 * 90) issues.push('Nguồn đã quá 90 ngày');
  return issues;
}

export function calculatePlaceCompleteness(place: Record<string, any>) {
  const checks = [
    Boolean(place.name?.trim()),
    Boolean(normalizePlaceCategory(place.category)),
    Boolean(place.description?.trim() && place.description.trim().length >= 60),
    Boolean(place.address?.trim()),
    Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng)),
    Boolean(place.img?.trim()),
    Boolean(place.hours?.trim() || place.hours_time?.trim() || weeklyHoursSummary(parseOpeningHours(place.opening_hours))),
    Boolean(place.source_name?.trim()),
    Boolean(place.source_url?.trim()),
    Boolean(place.verified_by?.trim()),
    Boolean((place.highlights || []).length),
    Boolean((place.tips || []).length),
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

export function preparePlacePayload(data: Record<string, any>) {
  const category = normalizePlaceCategory(data.category);
  if (!data.name?.trim()) throw new Error('Tên địa điểm là bắt buộc');
  if (!category) throw new Error('Danh mục địa điểm không hợp lệ');

  const lat = Number(data.lat);
  const lng = Number(data.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 15 || lat > 17 || lng < 106 || lng > 109) {
    throw new Error('Tọa độ phải nằm trong khu vực Huế và lân cận');
  }

  const verificationStatus = ['draft', 'reviewed', 'verified'].includes(data.verification_status)
    ? data.verification_status : 'draft';

  const arrays: Record<string, string> = Object.fromEntries(PLACE_ARRAY_FIELDS.map(field => [
    field,
    JSON.stringify(Array.isArray(data[field]) ? data[field] : []),
  ]));

  return {
    name: data.name.trim(), category,
    description: data.description?.trim() || '', address: data.address?.trim() || '',
    price: data.price?.trim() || 'Miễn phí', lat, lng,
    img: data.img?.trim() || '/assets/citadel.png', ai_insight: data.ai_insight?.trim() || '',
    rating: Math.min(5, Math.max(1, Number(data.rating) || 4.5)),
    popularity: Math.min(1, Math.max(0, Number(data.popularity) || 0.5)),
    avg_visit_min: Math.min(480, Math.max(15, Number(data.avg_visit_min) || 90)),
    meal_type: data.meal_type || null,
    crowd_level: data.crowd_level || 'medium', physical_level: data.physical_level || 'easy',
    best_time: data.best_time || 'all', authenticity: data.authenticity || '',
    walking_distance: data.walking_distance || '', ideal_pacing: data.ideal_pacing || '',
    noise_level: data.noise_level || '', dining_style: data.dining_style || '',
    weather_dependent: data.weather_dependent ? '1' : '0', indoor: data.indoor ? 1 : 0,
    hours: data.hours?.trim() || '', hours_time: data.hours_time?.trim() || '',
    hours_note: data.hours_note?.trim() || '', phone: data.phone?.trim() || '',
    opening_hours: JSON.stringify(parseOpeningHours(data.opening_hours, data.hours_time)),
    website: data.website?.trim() || '', source_name: data.source_name?.trim() || '',
    source_url: data.source_url?.trim() || '', verification_status: verificationStatus,
    verified_by: data.verified_by?.trim() || '',
    verified_at: verificationStatus === 'verified' ? (data.verified_at || new Date().toISOString()) : (data.verified_at || null),
    verification_notes: data.verification_notes?.trim() || '',
    publication_status: ['draft', 'published', 'archived'].includes(data.publication_status) ? data.publication_status : 'draft',
    reverify_after_days: [30, 60, 90].includes(Number(data.reverify_after_days)) ? Number(data.reverify_after_days) : 90,
    ...arrays,
  } as Record<string, any>;
}
