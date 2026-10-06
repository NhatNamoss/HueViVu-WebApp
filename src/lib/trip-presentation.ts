const STYLE_LABELS: Array<[RegExp, string]> = [
  [/ẩm thực|food/i, 'Ẩm thực'],
  [/di sản|triều|heritage/i, 'Di sản'],
  [/thiên nhiên|nature/i, 'Thiên nhiên'],
  [/chùa|tâm linh|temple/i, 'Chùa & tâm linh'],
  [/cà phê|trà|cafe/i, 'Cà phê'],
  [/làng nghề|thủ công|craft/i, 'Làng nghề'],
];

export function presentTripTitle(title: string, duration: number, style = '') {
  if (title && !/như có hướng dẫn viên riêng/i.test(title)) return title;
  const labels = STYLE_LABELS.filter(([pattern]) => pattern.test(style)).map(([, label]) => label).slice(0, 2);
  return `Huế ${duration || 1} ngày · ${labels.length ? labels.join(' & ') : 'Khám phá Cố đô'}`;
}

export function presentTripBudget(value: string | number | null | undefined) {
  if (value == null || value === '') return '';
  if (typeof value === 'number') {
    const normalized = value > 0 && value < 10000 ? value * 1000 : value;
    return `${normalized.toLocaleString('vi-VN')} VNĐ`;
  }
  const numeric = Number(String(value).replace(/[^0-9]/g, ''));
  if (!numeric) return String(value);
  const normalized = numeric < 10000 ? numeric * 1000 : numeric;
  return `${normalized.toLocaleString('vi-VN')} VNĐ`;
}
