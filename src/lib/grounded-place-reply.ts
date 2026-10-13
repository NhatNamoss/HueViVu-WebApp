import { evaluatePlaceTrust } from './place-trust';
import { weeklyHoursSummary, parseOpeningHours } from './opening-hours';

export function groundedPlaceReply(message: string, places: Record<string, any>[]): string | null {
  const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const text = fold(message);
  if (!/(mo cua|dong cua|may gio|mo luc|dong luc|gia|bao nhieu|chi phi|so dien thoai|nguon|xac minh)/.test(text)) return null;
  const place = places.filter(p => [p.name, p.name.split('(')[0].trim()].some(name => name.length >= 4 && text.includes(fold(name)))).sort((a, b) => b.name.length - a.name.length)[0];
  if (!place) return 'Bạn muốn kiểm tra địa điểm nào? Hãy nhập tên trong kho HueViVu để xem giờ, giá và nguồn đã ghi nhận.';
  const trust = evaluatePlaceTrust(place);
  if (!trust.operationalFresh) return `${place.name}: thông tin giờ/giá/liên hệ ${trust.status === 'stale' ? 'đã đến hạn kiểm tra lại' : 'chưa được xác minh'}. HueViVu chưa thể xác nhận đang mở hoặc giá hiện tại. ${place.source_name ? 'Nguồn ghi nhận: ' + place.source_name + '. ' : ''}Hãy xác nhận trực tiếp với địa điểm trước khi đi.`;
  const info = /(gia|chi phi|bao nhieu)/.test(text) ? `Giá ghi nhận: ${place.price || 'chưa có thông tin'}` : /(dien thoai)/.test(text) ? `Liên hệ ghi nhận: ${place.phone || 'chưa có thông tin'}` : `Giờ ghi nhận: ${weeklyHoursSummary(parseOpeningHours(place.opening_hours, place.hours_time))}`;
  return `${place.name}: ${info}. Nguồn: ${place.source_name}; kiểm tra ${new Date(place.verified_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}. Đây là dữ liệu đã nhập, không phải xác nhận trực tiếp đang mở; hãy kiểm tra thay đổi trong ngày với địa điểm.`;
}
