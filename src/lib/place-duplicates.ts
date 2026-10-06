import type Database from 'better-sqlite3';

function normalize(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(bLat - aLat); const dLng = rad(bLng - aLng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function findPlaceDuplicates(db: Database.Database, input: Record<string, any>, excludeId?: string) {
  const rows = db.prepare('SELECT id, name, address, phone, website, lat, lng, category, publication_status FROM places WHERE id != COALESCE(?, \'\')').all(excludeId || null) as any[];
  const inputName = normalize(input.name); const inputPhone = normalize(input.phone); const inputWebsite = normalize(input.website);
  return rows.map(place => {
    const reasons: string[] = [];
    if (inputName && normalize(place.name) === inputName) reasons.push('Trùng tên');
    if (inputPhone && normalize(place.phone) === inputPhone) reasons.push('Trùng số điện thoại');
    if (inputWebsite && normalize(place.website) === inputWebsite) reasons.push('Trùng website');
    const lat = Number(input.lat); const lng = Number(input.lng);
    if ([lat, lng, Number(place.lat), Number(place.lng)].every(Number.isFinite)) {
      const meters = distanceMeters(lat, lng, Number(place.lat), Number(place.lng));
      if (meters <= 80) reasons.push(`Cách tọa độ hiện tại ${Math.round(meters)} m`);
    }
    return reasons.length ? { ...place, reasons } : null;
  }).filter(Boolean);
}
